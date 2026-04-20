use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::{db, models::{QuizAttempt, QuizSubmission, User}, AppState};

pub async fn submit_quiz(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(quiz_id): Path<i64>,
    Json(submission): Json<QuizSubmission>,
) -> Result<Json<QuizAttempt>, StatusCode> {
    let content = db::get_content_by_id(&state.pool, quiz_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    if content.content_type != "quiz" {
        return Err(StatusCode::NOT_FOUND);
    }

    // Use the scores provided by the frontend (which are graded by AI)
    let total_questions = submission.answers.len();
    let total_score: f64 = if total_questions == 0 { 
        0.0 
    } else {
        submission.answers.iter().map(|a| a.score).sum::<f64>() / total_questions as f64
    };
    
    // Store question-level feedback/wrong answers for review
    let wrong_questions = serde_json::to_string(&submission.answers)
        .unwrap_or_else(|_| "[]".to_string());
    
    db::create_quiz_attempt(&state.pool, user.id, quiz_id, total_score, &wrong_questions)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn get_attempts(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(quiz_id): Path<i64>,
) -> Result<Json<Vec<QuizAttempt>>, StatusCode> {
    let content = db::get_content_by_id(&state.pool, quiz_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    if content.content_type != "quiz" {
        return Err(StatusCode::NOT_FOUND);
    }

    db::get_quiz_attempts(&state.pool, user.id, quiz_id)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
