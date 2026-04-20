use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: i64,
    pub microsoft_id: String,
    pub email: String,
    pub display_name: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Course {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub created_by: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCourse {
    pub title: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Unit {
    pub id: i64,
    pub course_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub order_index: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUnit {
    pub title: String,
    pub description: Option<String>,
    pub order_index: i64,
    pub image_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Content {
    pub id: i64,
    pub unit_id: i64,
    pub content_type: String,
    pub title: String,
    pub studyml_content: String,
    pub created_by: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateContent {
    pub content_type: String,
    pub title: String,
    pub studyml_content: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct FlashcardProgress {
    pub id: i64,
    pub user_id: i64,
    pub content_id: i64,
    pub flashcard_index: i64,
    pub correct_count: i64,
    pub incorrect_count: i64,
    pub last_seen: Option<DateTime<Utc>>,
    pub next_review: Option<DateTime<Utc>>,
    pub interval_days: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FlashcardReview {
    pub flashcard_index: i64,
    pub quality: u8, // 0-3: Again, Hard, Good, Easy
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FlashcardStats {
    pub total: i64,
    pub mastered: i64,
    pub learning: i64,
    pub new: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct QuizAttempt {
    pub id: i64,
    pub user_id: i64,
    pub content_id: i64,
    pub score: f64,
    pub wrong_questions: String, // JSON array
    pub completed_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuizSubmission {
    pub answers: Vec<QuizAnswer>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuizAnswer {
    pub question_index: usize,
    pub answer: String,
    pub score: f64,
    #[serde(default)]
    pub missing: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GradeRequest {
    pub user_answer: String,
    pub correct_answer: String,
    pub keywords: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GradeResponse {
    pub score: f64,
    pub feedback: String,
    pub missing_concepts: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct File {
    pub id: i64,
    pub filename: String,
    pub original_filename: String,
    pub file_type: String,
    pub file_size: i64,
    pub storage_path: String,
    pub uploaded_by: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditLog {
    pub id: i64,
    pub user_id: i64,
    pub user_display_name: Option<String>,
    pub user_email: Option<String>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: i64,
    pub details: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Resource {
    pub id: i64,
    pub unit_id: i64,
    pub resource_type: String,
    pub title: String,
    pub url: String,
    pub file_id: Option<i64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateResource {
    pub resource_type: String,
    pub title: String,
    pub url: String,
    pub file_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    pub messages: Vec<ChatMessage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub response: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GapStat {
    pub concept: String,
    pub count: i64,
}
