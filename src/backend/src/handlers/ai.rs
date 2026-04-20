use axum::{
    extract::{Extension, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::{ai, models::{GradeRequest, GradeResponse, User}, AppState};

pub async fn grade_answer(
    State(_state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
    Json(request): Json<GradeRequest>,
) -> Result<Json<GradeResponse>, StatusCode> {
    ai::grade_short_answer(&request)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn chat_with_tutor(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
    axum::extract::Path(unit_id): axum::extract::Path<i64>,
    Json(request): Json<crate::models::ChatRequest>,
) -> Result<Json<crate::models::ChatResponse>, StatusCode> {
    // Check unit existence only
    if crate::db::get_unit_by_id(&state.pool, unit_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_none()
    {
        return Err(StatusCode::NOT_FOUND);
    }

    // Fetch study guide
    let study_guide = match crate::db::list_all_content(&state.pool, unit_id).await {
        Ok(contents) => {
            contents.into_iter()
                .find(|c| c.content_type == "study-guide")
                .map(|c| c.studyml_content)
                .unwrap_or_else(|| "No study guide available.".to_string())
        },
        Err(_) => "Failed to load study guide.".to_string()
    };

    let response_text = ai::chat_tutor(&request, &study_guide).await;
    
    Ok(Json(crate::models::ChatResponse {
        response: response_text
    }))
}
