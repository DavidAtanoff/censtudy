mod db;
mod handlers;
mod models;
mod ai;
mod studyml;

use axum::{
    http::header::{ACCEPT, CONTENT_TYPE},
    http::Method,
    http::HeaderValue,
    middleware,
    routing::{get, post, put, delete},
    Router,
};
use tower_http::{
    cors::CorsLayer,
    limit::RequestBodyLimitLayer,
};
use std::sync::Arc;
use sqlx::SqlitePool;
use uuid::Uuid;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    dotenv::dotenv().ok();

    // Initialize database
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:cenlearn.db?mode=rwc".to_string());
    
    let pool = SqlitePool::connect(&database_url)
        .await
        .expect("Failed to connect to database");
    
    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    let frontend_origin = std::env::var("FRONTEND_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:5173".to_string());
    let secure_cookies = std::env::var("SECURE_COOKIES")
        .map(|value| matches!(value.as_str(), "1" | "true" | "TRUE" | "yes" | "YES"))
        .unwrap_or(false);
    let session_secret = match std::env::var("JWT_SECRET") {
        Ok(value) if value.trim().len() >= 32 => value,
        Ok(_) => panic!("JWT_SECRET must be at least 32 characters long."),
        Err(_) => {
            let secret = format!("{}{}", Uuid::new_v4(), Uuid::new_v4());
            tracing::warn!("JWT_SECRET not set. Using an ephemeral development secret.");
            secret
        }
    };

    let azure = match (
        std::env::var("AZURE_CLIENT_ID").ok(),
        std::env::var("AZURE_CLIENT_SECRET").ok(),
        std::env::var("AZURE_TENANT_ID").ok(),
        std::env::var("AZURE_REDIRECT_URI").ok(),
    ) {
        (Some(client_id), Some(client_secret), Some(tenant_id), Some(redirect_uri)) => Some(AzureOAuthConfig {
            client_id,
            client_secret,
            tenant_id,
            redirect_uri,
            allowed_email_domain: std::env::var("AZURE_ALLOWED_EMAIL_DOMAIN").ok(),
        }),
        _ => None,
    };

    let app_state = Arc::new(AppState {
        pool,
        http_client: reqwest::Client::new(),
        frontend_origin: frontend_origin.clone(),
        auth: AuthState {
            session_secret,
            secure_cookies,
            azure,
        },
    });

    let protected_routes = Router::new()
        .route("/auth/logout", post(handlers::auth::logout))
        .route("/api/courses", get(handlers::courses::list_courses))
        .route("/api/courses", post(handlers::courses::create_course))
        .route("/api/courses/:id", get(handlers::courses::get_course))
        .route("/api/courses/:id", put(handlers::courses::update_course))
        .route("/api/courses/:id", delete(handlers::courses::delete_course))
        .route("/api/courses/:course_id/units", get(handlers::units::list_units))
        .route("/api/courses/:course_id/units", post(handlers::units::create_unit))
        .route("/api/units/:id", get(handlers::units::get_unit))
        .route("/api/units/:id", put(handlers::units::update_unit))
        .route("/api/units/:id", delete(handlers::units::delete_unit))
        .route("/api/units/:unit_id/content", get(handlers::content::list_content))
        .route("/api/units/:unit_id/content", post(handlers::content::create_content))
        .route("/api/content/:id", get(handlers::content::get_content))
        .route("/api/content/:id", put(handlers::content::update_content))
        .route("/api/content/:id", delete(handlers::content::delete_content))
        .route("/api/flashcards/:deck_id/next", get(handlers::flashcards::get_next_card))
        .route("/api/flashcards/:deck_id/review", post(handlers::flashcards::submit_review))
        .route("/api/flashcards/:deck_id/stats", get(handlers::flashcards::get_stats))
        .route("/api/quiz/:quiz_id/submit", post(handlers::quiz::submit_quiz))
        .route("/api/quiz/:quiz_id/attempts", get(handlers::quiz::get_attempts))
        .route("/api/ai/grade", post(handlers::ai::grade_answer))
        .route("/api/units/:unit_id/chat", post(handlers::ai::chat_with_tutor))
        .route("/api/files", post(handlers::files::upload_file))
        .route("/api/files", get(handlers::files::list_files))
        .route("/api/files/:id", get(handlers::files::get_file))
        .route("/api/files/:id/download", get(handlers::files::download_file))
        .route("/api/files/:id", delete(handlers::files::delete_file))
        .route("/api/audit", get(handlers::audit::get_audit_logs))
        .route("/api/audit/:entity_type/:entity_id", get(handlers::audit::get_entity_audit_logs))
        .route("/api/audit/user/:user_id", get(handlers::audit::get_user_audit_logs))
        .route("/api/stats/:user_id", get(handlers::stats::get_user_stats))
        .route("/api/stats/:user_id/:content_id", post(handlers::stats::update_user_stats))
        .route("/api/stats/:user_id/gaps", get(handlers::stats::get_knowledge_gaps))
        .route("/api/leaderboard", get(handlers::stats::get_leaderboard))
        .route("/api/units/:unit_id/resources", get(handlers::resources::list_resources))
        .route("/api/units/:unit_id/resources", post(handlers::resources::create_resource))
        .route("/api/resources/:id", delete(handlers::resources::delete_resource))
        .route_layer(middleware::from_fn_with_state(
            app_state.clone(),
            handlers::auth::auth_middleware,
        ));

    let app = Router::new()
        .route("/auth/config", get(handlers::auth::get_auth_config))
        .route("/auth/me", get(handlers::auth::get_current_user))
        .route("/auth/login", get(handlers::auth::start_login))
        .route("/auth/callback", get(handlers::auth::auth_callback))
        .merge(protected_routes)
        .layer(RequestBodyLimitLayer::new(10 * 1024 * 1024))
        .layer(
            CorsLayer::new()
                .allow_origin(
                    frontend_origin
                        .parse::<HeaderValue>()
                        .expect("FRONTEND_ORIGIN must be a valid origin"),
                )
                .allow_credentials(true)
                .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
                .allow_headers([ACCEPT, CONTENT_TYPE]),
        )
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    
    tracing::info!("Server running on http://127.0.0.1:3000");
    
    axum::serve(listener, app).await.unwrap();
}

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub http_client: reqwest::Client,
    pub frontend_origin: String,
    pub auth: AuthState,
}

#[derive(Clone)]
pub struct AuthState {
    pub session_secret: String,
    pub secure_cookies: bool,
    pub azure: Option<AzureOAuthConfig>,
}

#[derive(Clone)]
pub struct AzureOAuthConfig {
    pub client_id: String,
    pub client_secret: String,
    pub tenant_id: String,
    pub redirect_uri: String,
    pub allowed_email_domain: Option<String>,
}
