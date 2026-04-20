use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::{db, models::{Content, CreateContent, User}, AppState, handlers};

pub async fn list_content(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
    Path(unit_id): Path<i64>,
) -> Result<Json<Vec<Content>>, StatusCode> {
    db::list_all_content(&state.pool, unit_id)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn create_content(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(unit_id): Path<i64>,
    Json(content): Json<CreateContent>,
) -> Result<Json<Content>, StatusCode> {
    crate::studyml::validate_content(&content.content_type, &content.studyml_content)
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    // Check unit existence only
    if db::get_unit_by_id(&state.pool, unit_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_none()
    {
        return Err(StatusCode::NOT_FOUND);
    }

    let created = db::create_content(&state.pool, unit_id, &content, user.id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Log audit
    let _ = handlers::audit::log_action(
        &state.pool,
        user.id,
        "create",
        "content",
        created.id,
        Some(&format!("Created {} content: {}", created.content_type, created.title)),
    ).await;
    
    Ok(Json(created))
}

pub async fn get_content(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> Result<Json<Content>, StatusCode> {
    db::get_content_by_id(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

pub async fn update_content(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<i64>,
    Json(content): Json<CreateContent>,
) -> Result<Json<Content>, StatusCode> {
    crate::studyml::validate_content(&content.content_type, &content.studyml_content)
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    if db::get_content_by_id(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_none()
    {
        return Err(StatusCode::NOT_FOUND);
    }

    let updated = db::update_content(&state.pool, id, &content)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Log audit
    let _ = handlers::audit::log_action(
        &state.pool,
        user.id,
        "update",
        "content",
        id,
        Some(&format!("Updated content: {}", updated.title)),
    ).await;
    
    Ok(Json(updated))
}

pub async fn delete_content(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<i64>,
) -> Result<StatusCode, StatusCode> {
    if db::get_content_by_id(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_none()
    {
        return Err(StatusCode::NOT_FOUND);
    }

    db::delete_content(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Log audit
    let _ = handlers::audit::log_action(
        &state.pool,
        user.id,
        "delete",
        "content",
        id,
        Some("Deleted content"),
    ).await;
    
    Ok(StatusCode::NO_CONTENT)
}
