use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::{db, models::{Course, CreateCourse, User}, AppState, handlers};

pub async fn list_courses(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
) -> Result<Json<Vec<Course>>, StatusCode> {
    db::list_all_courses(&state.pool)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn create_course(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Json(course): Json<CreateCourse>,
) -> Result<Json<Course>, StatusCode> {
    if user.email != "atanodav@berkeleyprep.org" {
        return Err(StatusCode::FORBIDDEN);
    }
    
    let created = db::create_course(&state.pool, &course, user.id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Log audit
    let _ = handlers::audit::log_action(
        &state.pool,
        user.id,
        "create",
        "course",
        created.id,
        Some(&format!("Created course: {}", created.title)),
    ).await;
    
    Ok(Json(created))
}

pub async fn get_course(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> Result<Json<Course>, StatusCode> {
    db::get_course_by_id(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

pub async fn update_course(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<i64>,
    Json(course): Json<CreateCourse>,
) -> Result<Json<Course>, StatusCode> {
    if user.email != "atanodav@berkeleyprep.org" {
        return Err(StatusCode::FORBIDDEN);
    }
    
    // Check existence only
    if db::get_course_by_id(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_none()
    {
        return Err(StatusCode::NOT_FOUND);
    }

    let updated = db::update_course(&state.pool, id, &course)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Log audit
    let _ = handlers::audit::log_action(
        &state.pool,
        user.id,
        "update",
        "course",
        id,
        Some(&format!("Updated course: {}", updated.title)),
    ).await;
    
    Ok(Json(updated))
}

pub async fn delete_course(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<i64>,
) -> Result<StatusCode, StatusCode> {
    if user.email != "atanodav@berkeleyprep.org" {
        return Err(StatusCode::FORBIDDEN);
    }
    
    // Check existence only
    if db::get_course_by_id(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_none()
    {
        return Err(StatusCode::NOT_FOUND);
    }

    db::delete_course(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Log audit
    let _ = handlers::audit::log_action(
        &state.pool,
        user.id,
        "delete",
        "course",
        id,
        Some("Deleted course"),
    ).await;
    
    Ok(StatusCode::NO_CONTENT)
}
