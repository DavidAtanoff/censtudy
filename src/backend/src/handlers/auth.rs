use axum::{
    body::Body,
    extract::{Query, State},
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Redirect, Response},
    Json,
};
use axum_extra::extract::{
    cookie::{Cookie, SameSite},
    CookieJar,
};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use time::Duration;
use uuid::Uuid;

use crate::{db, models::User, AppState};

const SESSION_COOKIE: &str = "censtudy_session";
const OAUTH_STATE_COOKIE: &str = "censtudy_oauth_state";
const MICROSOFT_SCOPE: &str = "openid profile email User.Read";

#[derive(Debug, Serialize)]
pub struct AuthConfigResponse {
    pub enabled: bool,
    pub provider: &'static str,
    pub allowed_email_domain: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SessionClaims {
    sub: i64,
    exp: usize,
}

#[derive(Debug, Deserialize)]
pub struct AuthCallbackQuery {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MicrosoftTokenResponse {
    access_token: String,
}

#[derive(Debug, Deserialize)]
struct MicrosoftUserInfo {
    sub: String,
    email: Option<String>,
    preferred_username: Option<String>,
    name: Option<String>,
}

pub async fn get_auth_config(State(state): State<Arc<AppState>>) -> Json<AuthConfigResponse> {
    Json(AuthConfigResponse {
        enabled: state.auth.azure.is_some(),
        provider: "microsoft",
        allowed_email_domain: state
            .auth
            .azure
            .as_ref()
            .and_then(|config| config.allowed_email_domain.clone()),
    })
}

pub async fn start_login(
    State(state): State<Arc<AppState>>,
    jar: CookieJar,
) -> Response {
    let Some(config) = state.auth.azure.as_ref() else {
        return (jar, frontend_redirect(&state, "/login?error=microsoft_sign_in_not_configured")).into_response();
    };

    let oauth_state = Uuid::new_v4().to_string();
    let authorize_url = format!(
        "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize?client_id={client_id}&response_type=code&redirect_uri={redirect_uri}&response_mode=query&scope={scope}&state={state}",
        tenant = urlencoding::encode(&config.tenant_id),
        client_id = urlencoding::encode(&config.client_id),
        redirect_uri = urlencoding::encode(&config.redirect_uri),
        scope = urlencoding::encode(MICROSOFT_SCOPE),
        state = urlencoding::encode(&oauth_state),
    );

    let jar = jar.add(build_cookie(
        OAUTH_STATE_COOKIE,
        oauth_state,
        state.auth.secure_cookies,
        Some(Duration::minutes(10)),
    ));

    (jar, Redirect::to(&authorize_url)).into_response()
}

pub async fn auth_callback(
    State(state): State<Arc<AppState>>,
    jar: CookieJar,
    Query(query): Query<AuthCallbackQuery>,
) -> Response {
    let Some(config) = state.auth.azure.as_ref() else {
        return (jar, frontend_redirect(&state, "/login?error=microsoft_sign_in_not_configured")).into_response();
    };

    if let Some(error) = query.error {
        let detail = query
            .error_description
            .unwrap_or(error)
            .replace(' ', "_");
        return (
            clear_oauth_state(jar, state.auth.secure_cookies),
            frontend_redirect(&state, &format!("/login?error={}", urlencoding::encode(&detail))),
        )
            .into_response();
    }

    let Some(received_state) = query.state else {
        return (
            clear_oauth_state(jar, state.auth.secure_cookies),
            frontend_redirect(&state, "/login?error=missing_oauth_state"),
        )
            .into_response();
    };

    let Some(expected_state) = jar.get(OAUTH_STATE_COOKIE).map(|cookie| cookie.value().to_string()) else {
        return (
            clear_oauth_state(jar, state.auth.secure_cookies),
            frontend_redirect(&state, "/login?error=missing_state_cookie"),
        )
            .into_response();
    };

    if expected_state != received_state {
        return (
            clear_oauth_state(jar, state.auth.secure_cookies),
            frontend_redirect(&state, "/login?error=state_mismatch"),
        )
            .into_response();
    }

    let Some(code) = query.code else {
        return (
            clear_oauth_state(jar, state.auth.secure_cookies),
            frontend_redirect(&state, "/login?error=missing_oauth_code"),
        )
            .into_response();
    };

    let response = match state
        .http_client
        .post(format!(
            "https://login.microsoftonline.com/{}/oauth2/v2.0/token",
            config.tenant_id
        ))
        .form(&[
            ("client_id", config.client_id.as_str()),
            ("client_secret", config.client_secret.as_str()),
            ("grant_type", "authorization_code"),
            ("code", code.as_str()),
            ("redirect_uri", config.redirect_uri.as_str()),
            ("scope", MICROSOFT_SCOPE),
        ])
        .send()
        .await
    {
        Ok(res) => res,
        Err(e) => {
            tracing::error!("Microsoft token exchange network error: {}", e);
            return (
                clear_oauth_state(jar, state.auth.secure_cookies),
                frontend_redirect(&state, "/login?error=token_exchange_failed"),
            )
                .into_response();
        }
    };

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_else(|_| "Could not read body".to_string());
        tracing::error!("Microsoft token exchange failed with status {}: {}", status, body);
        return (
            clear_oauth_state(jar, state.auth.secure_cookies),
            frontend_redirect(&state, "/login?error=token_exchange_failed"),
        )
            .into_response();
    }

    let token_response: MicrosoftTokenResponse = match response.json().await {
        Ok(payload) => payload,
        Err(e) => {
            tracing::error!("Failed to parse Microsoft token response: {}", e);
            return (
                clear_oauth_state(jar, state.auth.secure_cookies),
                frontend_redirect(&state, "/login?error=token_parse_failed"),
            )
                .into_response();
        }
    };

    let user_info = match state
        .http_client
        .get("https://graph.microsoft.com/oidc/userinfo")
        .bearer_auth(&token_response.access_token)
        .send()
        .await
    {
        Ok(response) => match response.error_for_status() {
            Ok(ok) => match ok.json::<MicrosoftUserInfo>().await {
                Ok(payload) => payload,
                Err(_) => {
                    return (
                        clear_oauth_state(jar, state.auth.secure_cookies),
                        frontend_redirect(&state, "/login?error=userinfo_parse_failed"),
                    )
                        .into_response()
                }
            },
            Err(e) => {
                let status = e.status().map(|s| s.as_u16()).unwrap_or(500);
                tracing::error!("Microsoft userinfo request failed with status: {}", status);
                return (
                    clear_oauth_state(jar, state.auth.secure_cookies),
                    frontend_redirect(&state, "/login?error=userinfo_request_failed"),
                )
                    .into_response()
            }
        },
        Err(e) => {
            tracing::error!("Microsoft userinfo network error: {}", e);
            return (
                clear_oauth_state(jar, state.auth.secure_cookies),
                frontend_redirect(&state, "/login?error=userinfo_request_failed"),
            )
                .into_response()
        }
    };

    let email = user_info
        .email
        .clone()
        .or(user_info.preferred_username.clone())
        .unwrap_or_default();

    if email.is_empty() {
        return (
            clear_oauth_state(jar, state.auth.secure_cookies),
            frontend_redirect(&state, "/login?error=missing_email_claim"),
        )
            .into_response();
    }

    if let Some(domain) = &config.allowed_email_domain {
        let normalized_domain = domain.trim().trim_start_matches('@').to_ascii_lowercase();
        let normalized_email = email.to_ascii_lowercase();
        if !normalized_email.ends_with(&format!("@{}", normalized_domain)) {
            return (
                clear_oauth_state(jar, state.auth.secure_cookies),
                frontend_redirect(&state, "/login?error=unauthorized_domain"),
            )
                .into_response();
        }
    }

    let user = match db::upsert_oauth_user(
        &state.pool,
        &user_info.sub,
        &email,
        user_info.name.as_deref(),
    )
    .await
    {
        Ok(user) => user,
        Err(_) => {
            return (
                clear_oauth_state(jar, state.auth.secure_cookies),
                frontend_redirect(&state, "/login?error=user_persist_failed"),
            )
                .into_response()
        }
    };

    let exp = (chrono::Utc::now() + chrono::Duration::days(14)).timestamp() as usize;
    let token = match encode(
        &Header::default(),
        &SessionClaims { sub: user.id, exp },
        &EncodingKey::from_secret(state.auth.session_secret.as_bytes()),
    ) {
        Ok(token) => token,
        Err(_) => {
            return (
                clear_oauth_state(jar, state.auth.secure_cookies),
                frontend_redirect(&state, "/login?error=session_encode_failed"),
            )
                .into_response()
        }
    };

    let jar = clear_oauth_state(jar, state.auth.secure_cookies).add(build_cookie(
        SESSION_COOKIE,
        token,
        state.auth.secure_cookies,
        Some(Duration::days(14)),
    ));

    (jar, frontend_redirect(&state, "/")).into_response()
}

pub async fn get_current_user(
    State(state): State<Arc<AppState>>,
    jar: CookieJar,
) -> Json<Option<User>> {
    Json(get_user_from_jar(&state, &jar).await)
}

pub async fn logout(
    State(state): State<Arc<AppState>>,
    jar: CookieJar,
) -> impl IntoResponse {
    (
        jar.remove(expired_cookie(SESSION_COOKIE, state.auth.secure_cookies)),
        StatusCode::NO_CONTENT,
    )
}

pub async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    mut request: Request<Body>,
    next: Next,
) -> Response {
    let jar = CookieJar::from_headers(request.headers());

    match require_user_from_jar(&state, &jar).await {
        Ok(user) => {
            request.extensions_mut().insert(user);
            next.run(request).await
        }
        Err(status) => status.into_response(),
    }
}

pub async fn get_user_from_jar(state: &AppState, jar: &CookieJar) -> Option<User> {
    let cookie = jar.get(SESSION_COOKIE)?;

    let token = decode::<SessionClaims>(
        cookie.value(),
        &DecodingKey::from_secret(state.auth.session_secret.as_bytes()),
        &Validation::new(Algorithm::HS256),
    )
    .ok()?;

    db::get_user(&state.pool, token.claims.sub).await.ok()
}

pub async fn require_user_from_jar(state: &AppState, jar: &CookieJar) -> Result<User, StatusCode> {
    get_user_from_jar(state, jar).await.ok_or(StatusCode::UNAUTHORIZED)
}

fn build_cookie(name: &str, value: String, secure: bool, max_age: Option<Duration>) -> Cookie<'static> {
    let mut builder = Cookie::build((name.to_string(), value))
        .http_only(true)
        .path("/")
        .same_site(SameSite::Lax)
        .secure(secure);

    if let Some(max_age) = max_age {
        builder = builder.max_age(max_age);
    }

    builder.build()
}

fn expired_cookie(name: &str, secure: bool) -> Cookie<'static> {
    Cookie::build((name.to_string(), String::new()))
        .http_only(true)
        .path("/")
        .same_site(SameSite::Lax)
        .secure(secure)
        .max_age(Duration::seconds(0))
        .build()
}

fn clear_oauth_state(jar: CookieJar, secure: bool) -> CookieJar {
    jar.remove(expired_cookie(OAUTH_STATE_COOKIE, secure))
}

fn frontend_redirect(state: &AppState, path: &str) -> Redirect {
    Redirect::to(&format!(
        "{}{}",
        state.frontend_origin.trim_end_matches('/'),
        path
    ))
}
