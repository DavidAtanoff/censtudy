use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use crate::AppState;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateStatsRequest {
    pub time_spent_seconds: i64,
    pub mastery_level: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserStatsResponse {
    pub total_time_spent: i64,
    pub courses_started: i64,
    pub flashcards_mastered: i64,
    pub quizzes_completed: i64,
    pub average_quiz_score: f64,
    pub current_streak: i64,
    pub content_stats: Vec<ContentStat>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContentStat {
    pub content_id: i64,
    pub content_title: String,
    pub time_spent_seconds: i64,
    pub mastery_level: f64,
    pub last_accessed: Option<String>,
}

pub async fn update_user_stats(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<crate::models::User>,
    Path((user_id, content_id)): Path<(i64, i64)>,
    Json(req): Json<UpdateStatsRequest>,
) -> Result<StatusCode, StatusCode> {
    if user.id != user_id {
        return Err(StatusCode::FORBIDDEN);
    }

    let now = Utc::now();
    
    sqlx::query(
        "INSERT INTO user_stats (user_id, content_id, time_spent_seconds, last_accessed, mastery_level)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, content_id) DO UPDATE SET
         time_spent_seconds = time_spent_seconds + excluded.time_spent_seconds,
         last_accessed = excluded.last_accessed,
         mastery_level = COALESCE(excluded.mastery_level, mastery_level)"
    )
    .bind(user_id)
    .bind(content_id)
    .bind(req.time_spent_seconds)
    .bind(now)
    .bind(req.mastery_level)
    .execute(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(StatusCode::OK)
}

pub async fn get_user_stats(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<crate::models::User>,
    Path(user_id): Path<i64>,
) -> Result<Json<UserStatsResponse>, StatusCode> {
    if user.id != user_id {
        return Err(StatusCode::FORBIDDEN);
    }

    // Total time spent
    let total_time: Option<i64> = sqlx::query_scalar(
        "SELECT COALESCE(SUM(time_spent_seconds), 0) FROM user_stats WHERE user_id = ?"
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Courses started (unique courses from content accessed)
    let courses_started: i64 = sqlx::query_scalar(
        "SELECT COUNT(DISTINCT u.course_id) FROM user_stats us
         JOIN content co ON us.content_id = co.id
         JOIN units u ON co.unit_id = u.id
         WHERE us.user_id = ?"
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Flashcards mastered
    let flashcards_mastered: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM flashcard_progress WHERE user_id = ? AND correct_count >= 3"
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Quizzes completed
    let quizzes_completed: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM quiz_attempts WHERE user_id = ?"
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Average quiz score
    let average_quiz_score: Option<f64> = sqlx::query_scalar(
        "SELECT AVG(score) FROM quiz_attempts WHERE user_id = ?"
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Current streak (days with activity)
    let current_streak = calculate_streak(&state.pool, user_id).await?;
    
    // Content stats
    let content_stats: Vec<ContentStat> = sqlx::query_as::<_, (i64, String, i64, f64, Option<String>)>(
        "SELECT us.content_id, co.title, us.time_spent_seconds, COALESCE(us.mastery_level, 0.0), CAST(us.last_accessed AS TEXT)
         FROM user_stats us
         JOIN content co ON us.content_id = co.id
         WHERE us.user_id = ?
         ORDER BY us.last_accessed DESC"
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .into_iter()
    .map(|(content_id, content_title, time_spent_seconds, mastery_level, last_accessed)| {
        ContentStat {
            content_id,
            content_title,
            time_spent_seconds,
            mastery_level,
            last_accessed,
        }
    })
    .collect();
    
    Ok(Json(UserStatsResponse {
        total_time_spent: total_time.unwrap_or(0),
        courses_started,
        flashcards_mastered,
        quizzes_completed,
        average_quiz_score: average_quiz_score.unwrap_or(0.0),
        current_streak,
        content_stats,
    }))
}

async fn calculate_streak(pool: &sqlx::SqlitePool, user_id: i64) -> Result<i64, StatusCode> {
    // Get dates with activity
    let dates: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT DATE(last_accessed) as date 
         FROM user_stats 
         WHERE user_id = ? AND last_accessed IS NOT NULL
         ORDER BY date DESC"
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    if dates.is_empty() {
        return Ok(0);
    }
    
    let mut streak = 1;
    let today = chrono::Utc::now().date_naive();
    
    // Check if most recent activity was today or yesterday
    if let Some(last_date_str) = dates.first() {
        if let Ok(last_date) = chrono::NaiveDate::parse_from_str(last_date_str, "%Y-%m-%d") {
            let days_diff = (today - last_date).num_days();
            if days_diff > 1 {
                return Ok(0); // Streak broken
            }
            
            // Count consecutive days
            for i in 1..dates.len() {
                if let (Ok(current), Ok(previous)) = (
                    chrono::NaiveDate::parse_from_str(&dates[i-1], "%Y-%m-%d"),
                    chrono::NaiveDate::parse_from_str(&dates[i], "%Y-%m-%d")
                ) {
                    if (current - previous).num_days() == 1 {
                        streak += 1;
                    } else {
                        break;
                    }
                }
            }
        }
    }
    
    Ok(streak)
}

pub async fn get_leaderboard(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<crate::models::User>,
) -> Result<Json<Vec<LeaderboardEntry>>, StatusCode> {
    let entries: Vec<LeaderboardEntry> = sqlx::query_as::<_, (i64, Option<String>, i64, i64, f64)>(
        "SELECT u.id, u.display_name,
         COALESCE(us.total_time, 0) as total_time,
         COALESCE(fp.mastered_cards, 0) as mastered_cards,
         COALESCE(qa.avg_score, 0) as avg_score
         FROM users u
         LEFT JOIN (
             SELECT user_id, SUM(time_spent_seconds) as total_time
             FROM user_stats
             GROUP BY user_id
         ) us ON u.id = us.user_id
         LEFT JOIN (
             SELECT user_id, COUNT(*) as mastered_cards
             FROM flashcard_progress
             WHERE correct_count >= 3
             GROUP BY user_id
         ) fp ON u.id = fp.user_id
         LEFT JOIN (
             SELECT user_id, AVG(score) as avg_score
             FROM quiz_attempts
             GROUP BY user_id
         ) qa ON u.id = qa.user_id
         ORDER BY total_time DESC, avg_score DESC
         LIMIT 10"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .into_iter()
    .map(|(user_id, display_name, total_time, mastered_cards, avg_score)| {
        LeaderboardEntry {
            user_id,
            display_name: display_name.unwrap_or_else(|| "Unknown".to_string()),
            total_time_spent: total_time,
            flashcards_mastered: mastered_cards,
            average_quiz_score: avg_score,
        }
    })
    .collect();
    
    Ok(Json(entries))
}

#[derive(Debug, Serialize)]
pub struct LeaderboardEntry {
    pub user_id: i64,
    pub display_name: String,
    pub total_time_spent: i64,
    pub flashcards_mastered: i64,
    pub average_quiz_score: f64,
}

pub async fn get_knowledge_gaps(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<crate::models::User>,
    Path(user_id): Path<i64>,
) -> Result<Json<Vec<crate::models::GapStat>>, StatusCode> {
    if user.id != user_id {
        return Err(StatusCode::FORBIDDEN);
    }

    // Fetch last 10 quiz attempts for this user
    let attempts: Vec<String> = sqlx::query_scalar(
        "SELECT wrong_questions FROM quiz_attempts WHERE user_id = ? ORDER BY completed_at DESC LIMIT 10"
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut gap_counts: std::collections::HashMap<String, i64> = std::collections::HashMap::new();

    for wrong_q in attempts {
        // wrong_questions is a JSON array of QuizAnswer. 
        // We actually didn't store missing_concepts inside the DB QuizAttempt by default previously
        // Let's see... we can parse it from the JSON.
        // If we didn't store missing_concepts in the answers initially, we might need to rely on future ones.
        // Alternatively, since wrong_questions can be parsed, let's just parse it as arbitrary json and extract "missing_concepts" if it exists.
        
        let json_val: Option<serde_json::Value> = serde_json::from_str(&wrong_q).ok();
        if let Some(serde_json::Value::Array(answers)) = json_val {
            for ans in answers {
                if let Some(missing) = ans
                    .get("missing")
                    .or_else(|| ans.get("missing_concepts"))
                    .and_then(|m| m.as_array())
                {
                    for m in missing {
                        if let Some(concept) = m.as_str() {
                            let concept = concept.to_lowercase();
                            *gap_counts.entry(concept).or_insert(0) += 1;
                        }
                    }
                }
            }
        }
    }

    let mut gaps: Vec<crate::models::GapStat> = gap_counts.into_iter().map(|(concept, count)| {
        crate::models::GapStat { concept, count }
    }).collect();

    gaps.sort_by(|a, b| b.count.cmp(&a.count));
    gaps.truncate(5);

    Ok(Json(gaps))
}
