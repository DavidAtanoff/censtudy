use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::{db, models::{Unit, CreateUnit, User}, AppState, handlers};

pub async fn list_units(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
    Path(course_id): Path<i64>,
) -> Result<Json<Vec<Unit>>, StatusCode> {
    db::list_all_units(&state.pool, course_id)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn create_unit(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(course_id): Path<i64>,
    Json(unit): Json<CreateUnit>,
) -> Result<Json<Unit>, StatusCode> {
    // Check course existence only
    if db::get_course_by_id(&state.pool, course_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_none()
    {
        return Err(StatusCode::NOT_FOUND);
    }
    
    let created = db::create_unit(&state.pool, course_id, &unit)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Log audit
    let _ = handlers::audit::log_action(
        &state.pool,
        user.id,
        "create",
        "unit",
        created.id,
        Some(&format!("Created unit: {} in course {}", created.title, course_id)),
    ).await;
    
    Ok(Json(created))
}

pub async fn get_unit(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> Result<Json<Unit>, StatusCode> {
    db::get_unit_by_id(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

pub async fn update_unit(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<i64>,
    Json(unit): Json<CreateUnit>,
) -> Result<Json<Unit>, StatusCode> {
    if db::get_unit_by_id(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_none()
    {
        return Err(StatusCode::NOT_FOUND);
    }

    let updated = db::update_unit(&state.pool, id, &unit)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Log audit
    let _ = handlers::audit::log_action(
        &state.pool,
        user.id,
        "update",
        "unit",
        id,
        Some(&format!("Updated unit: {}", updated.title)),
    ).await;
    
    Ok(Json(updated))
}

pub async fn delete_unit(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<i64>,
) -> Result<StatusCode, StatusCode> {
    if db::get_unit_by_id(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_none()
    {
        return Err(StatusCode::NOT_FOUND);
    }

    db::delete_unit(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Log audit
    let _ = handlers::audit::log_action(
        &state.pool,
        user.id,
        "delete",
        "unit",
        id,
        Some("Deleted unit"),
    ).await;
    
    Ok(StatusCode::NO_CONTENT)
}
