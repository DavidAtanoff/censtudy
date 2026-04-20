use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::{db, models::{CreateResource, Resource, User}, AppState};

pub async fn list_resources(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
    Path(unit_id): Path<i64>,
) -> Result<Json<Vec<Resource>>, StatusCode> {
    db::list_all_resources(&state.pool, unit_id)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn create_resource(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
    Path(unit_id): Path<i64>,
    Json(payload): Json<CreateResource>,
) -> Result<Json<Resource>, StatusCode> {
    // Check unit existence only
    if db::get_unit_by_id(&state.pool, unit_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_none()
    {
        return Err(StatusCode::NOT_FOUND);
    }

    match payload.resource_type.as_str() {
        "link" => {
            let normalized = payload.url.trim().to_ascii_lowercase();
            if !(normalized.starts_with("http://") || normalized.starts_with("https://")) {
                return Err(StatusCode::BAD_REQUEST);
            }
        }
        "file" => {
            let Some(file_id) = payload.file_id else {
                return Err(StatusCode::BAD_REQUEST);
            };

            // Check file existence only
            if db::get_file_by_id(&state.pool, file_id)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
                .is_none()
            {
                return Err(StatusCode::NOT_FOUND);
            }
        }
        _ => return Err(StatusCode::BAD_REQUEST),
    }

    db::create_resource(&state.pool, unit_id, &payload)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn delete_resource(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<i64>,
) -> Result<StatusCode, StatusCode> {
    // Check existence only
    if db::get_resource_by_id(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_none()
    {
        return Err(StatusCode::NOT_FOUND);
    }

    db::delete_resource(&state.pool, id)
        .await
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Log audit
    let _ = crate::handlers::audit::log_action(
        &state.pool,
        user.id,
        "delete",
        "resource",
        id,
        Some("Deleted resource"),
    ).await;
    
    Ok(StatusCode::NO_CONTENT)
}
