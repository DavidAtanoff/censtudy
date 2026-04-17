use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::{db, models::{AuditLog, User}, AppState};
use chrono::Utc;

pub async fn log_action(
    pool: &sqlx::SqlitePool,
    user_id: i64,
    action: &str,
    entity_type: &str,
    entity_id: i64,
    details: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at) 
         VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(user_id)
    .bind(action)
    .bind(entity_type)
    .bind(entity_id)
    .bind(details)
    .bind(Utc::now())
    .execute(pool)
    .await?;
    
    Ok(())
}

pub async fn get_audit_logs(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<Vec<AuditLog>>, StatusCode> {
    db::list_audit_logs_for_user(&state.pool, user.id)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn get_entity_audit_logs(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path((entity_type, entity_id)): Path<(String, i64)>,
) -> Result<Json<Vec<AuditLog>>, StatusCode> {
    db::list_entity_audit_logs_for_user(&state.pool, user.id, &entity_type, entity_id)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn get_user_audit_logs(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(user_id): Path<i64>,
) -> Result<Json<Vec<AuditLog>>, StatusCode> {
    if user.id != user_id {
        return Err(StatusCode::FORBIDDEN);
    }

    db::list_audit_logs_for_user(&state.pool, user_id)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
