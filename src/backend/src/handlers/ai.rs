use axum::{
    extract::{Extension, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::{ai, models::{GradeRequest, GradeResponse, User}, AppState};

#[derive(serde::Deserialize)]
pub struct UpdateKeyRequest {
    pub key: String,
}

pub async fn update_gemini_key(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Json(payload): Json<UpdateKeyRequest>,
) -> Result<StatusCode, StatusCode> {
    if user.email != "atanodav@berkeleyprep.org" {
        return Err(StatusCode::FORBIDDEN);
    }
    
    let mut key_write = state.custom_gemini_key.write().await;
    *key_write = Some(payload.key);
    
    Ok(StatusCode::OK)
}

pub async fn grade_answer(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
    Json(request): Json<GradeRequest>,
) -> Result<Json<GradeResponse>, StatusCode> {
    let api_key = {
        let custom = state.custom_gemini_key.read().await;
        custom.clone().unwrap_or_else(|| std::env::var("GEMINI_API_KEY").unwrap_or_else(|_| "demo-key".to_string()))
    };

    ai::grade_short_answer(&request, &api_key)
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

    let api_key = {
        let custom = state.custom_gemini_key.read().await;
        custom.clone().unwrap_or_else(|| std::env::var("GEMINI_API_KEY").unwrap_or_else(|_| "demo-key".to_string()))
    };

    let response_text = ai::chat_tutor(&request, &study_guide, &api_key).await;
    
    Ok(Json(crate::models::ChatResponse {
        response: response_text
    }))
}
