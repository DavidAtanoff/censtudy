use sqlx::SqlitePool;
use crate::models::*;
use chrono::Utc;

// User operations
pub async fn get_user(pool: &SqlitePool, id: i64) -> Result<User, sqlx::Error> {
    sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await
}

pub async fn get_user_by_microsoft_id(pool: &SqlitePool, microsoft_id: &str) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as::<_, User>("SELECT * FROM users WHERE microsoft_id = ?")
        .bind(microsoft_id)
        .fetch_optional(pool)
        .await
}

pub async fn upsert_oauth_user(
    pool: &SqlitePool,
    microsoft_id: &str,
    email: &str,
    display_name: Option<&str>,
) -> Result<User, sqlx::Error> {
    if let Some(existing) = get_user_by_microsoft_id(pool, microsoft_id).await? {
        sqlx::query("UPDATE users SET email = ?, display_name = ? WHERE id = ?")
            .bind(email)
            .bind(display_name)
            .bind(existing.id)
            .execute(pool)
            .await?;

        return get_user(pool, existing.id).await;
    }

    let real_user_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM users WHERE microsoft_id != ?"
    )
    .bind("demo-user-123")
    .fetch_one(pool)
    .await?;

    if real_user_count == 0 {
        if email == "atanodav@berkeleyprep.org" {
            let demo_user = sqlx::query_as::<_, User>(
                "SELECT * FROM users WHERE microsoft_id = ?"
            )
            .bind("demo-user-123")
            .fetch_optional(pool)
            .await?;

            if let Some(demo_user) = demo_user {
                sqlx::query("UPDATE users SET microsoft_id = ?, email = ?, display_name = ? WHERE id = ?")
                    .bind(microsoft_id)
                    .bind(email)
                    .bind(display_name)
                    .bind(demo_user.id)
                    .execute(pool)
                    .await?;

                return get_user(pool, demo_user.id).await;
            }
        }
    }

    let result = sqlx::query(
        "INSERT INTO users (microsoft_id, email, display_name) VALUES (?, ?, ?)"
    )
    .bind(microsoft_id)
    .bind(email)
    .bind(display_name)
    .execute(pool)
    .await?;

    get_user(pool, result.last_insert_rowid()).await
}

// Course operations
pub async fn create_course(pool: &SqlitePool, course: &CreateCourse, user_id: i64) -> Result<Course, sqlx::Error> {
    let now = Utc::now();
    let result = sqlx::query(
        "INSERT INTO courses (title, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&course.title)
    .bind(&course.description)
    .bind(user_id)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    let id = result.last_insert_rowid();
    get_course(pool, id).await
}

pub async fn get_course(pool: &SqlitePool, id: i64) -> Result<Course, sqlx::Error> {
    sqlx::query_as::<_, Course>("SELECT * FROM courses WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await
}

pub async fn update_course(pool: &SqlitePool, id: i64, course: &CreateCourse) -> Result<Course, sqlx::Error> {
    let now = Utc::now();
    sqlx::query("UPDATE courses SET title = ?, description = ?, updated_at = ? WHERE id = ?")
        .bind(&course.title)
        .bind(&course.description)
        .bind(now)
        .bind(id)
        .execute(pool)
        .await?;
    
    get_course(pool, id).await
}

pub async fn delete_course(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM courses WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

// Unit operations
pub async fn create_unit(pool: &SqlitePool, course_id: i64, unit: &CreateUnit) -> Result<Unit, sqlx::Error> {
    let now = Utc::now();
    let result = sqlx::query(
        "INSERT INTO units (course_id, title, description, order_index, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(course_id)
    .bind(&unit.title)
    .bind(&unit.description)
    .bind(unit.order_index)
    .bind(now)
    .execute(pool)
    .await?;

    let id = result.last_insert_rowid();
    get_unit(pool, id).await
}

pub async fn get_unit(pool: &SqlitePool, id: i64) -> Result<Unit, sqlx::Error> {
    sqlx::query_as::<_, Unit>("SELECT * FROM units WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await
}

pub async fn update_unit(pool: &SqlitePool, id: i64, unit: &CreateUnit) -> Result<Unit, sqlx::Error> {
    sqlx::query("UPDATE units SET title = ?, description = ?, order_index = ? WHERE id = ?")
        .bind(&unit.title)
        .bind(&unit.description)
        .bind(unit.order_index)
        .bind(id)
        .execute(pool)
        .await?;
    
    get_unit(pool, id).await
}

pub async fn delete_unit(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM units WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

// Content operations
pub async fn create_content(pool: &SqlitePool, unit_id: i64, content: &CreateContent, user_id: i64) -> Result<Content, sqlx::Error> {
    let now = Utc::now();
    let result = sqlx::query(
        "INSERT INTO content (unit_id, content_type, title, studyml_content, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(unit_id)
    .bind(&content.content_type)
    .bind(&content.title)
    .bind(&content.studyml_content)
    .bind(user_id)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    let id = result.last_insert_rowid();
    get_content(pool, id).await
}

pub async fn get_content(pool: &SqlitePool, id: i64) -> Result<Content, sqlx::Error> {
    sqlx::query_as::<_, Content>("SELECT * FROM content WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await
}

pub async fn update_content(pool: &SqlitePool, id: i64, content: &CreateContent) -> Result<Content, sqlx::Error> {
    let now = Utc::now();
    sqlx::query("UPDATE content SET content_type = ?, title = ?, studyml_content = ?, updated_at = ? WHERE id = ?")
        .bind(&content.content_type)
        .bind(&content.title)
        .bind(&content.studyml_content)
        .bind(now)
        .bind(id)
        .execute(pool)
        .await?;
    
    get_content(pool, id).await
}

pub async fn delete_content(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM content WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

// Flashcard operations
pub async fn get_flashcard_progress(
    pool: &SqlitePool,
    user_id: i64,
    content_id: i64,
    flashcard_index: i64,
) -> Result<Option<FlashcardProgress>, sqlx::Error> {
    sqlx::query_as::<_, FlashcardProgress>(
        "SELECT * FROM flashcard_progress WHERE user_id = ? AND content_id = ? AND flashcard_index = ?"
    )
    .bind(user_id)
    .bind(content_id)
    .bind(flashcard_index)
    .fetch_optional(pool)
    .await
}

pub async fn upsert_flashcard_progress(
    pool: &SqlitePool,
    progress: &FlashcardProgress,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO flashcard_progress (user_id, content_id, flashcard_index, correct_count, incorrect_count, last_seen, next_review, interval_days)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, content_id, flashcard_index) DO UPDATE SET
         correct_count = excluded.correct_count,
         incorrect_count = excluded.incorrect_count,
         last_seen = excluded.last_seen,
         next_review = excluded.next_review,
         interval_days = excluded.interval_days"
    )
    .bind(progress.user_id)
    .bind(progress.content_id)
    .bind(progress.flashcard_index)
    .bind(progress.correct_count)
    .bind(progress.incorrect_count)
    .bind(progress.last_seen)
    .bind(progress.next_review)
    .bind(progress.interval_days)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_flashcard_stats(
    pool: &SqlitePool,
    user_id: i64,
    content_id: i64,
    total_cards: i64,
) -> Result<FlashcardStats, sqlx::Error> {
    let progress_records = sqlx::query_as::<_, FlashcardProgress>(
        "SELECT * FROM flashcard_progress WHERE user_id = ? AND content_id = ?"
    )
    .bind(user_id)
    .bind(content_id)
    .fetch_all(pool)
    .await?;

    let mastered = progress_records.iter().filter(|p| p.correct_count >= 3).count() as i64;
    let attempted = progress_records.len() as i64;
    let learning = attempted - mastered;
    let new = total_cards - attempted;

    Ok(FlashcardStats {
        total: total_cards,
        mastered,
        learning,
        new,
    })
}

// Quiz operations
pub async fn create_quiz_attempt(
    pool: &SqlitePool,
    user_id: i64,
    content_id: i64,
    score: f64,
    wrong_questions: &str,
) -> Result<QuizAttempt, sqlx::Error> {
    let now = Utc::now();
    let result = sqlx::query(
        "INSERT INTO quiz_attempts (user_id, content_id, score, wrong_questions, completed_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(user_id)
    .bind(content_id)
    .bind(score)
    .bind(wrong_questions)
    .bind(now)
    .execute(pool)
    .await?;

    let id = result.last_insert_rowid();
    sqlx::query_as::<_, QuizAttempt>("SELECT * FROM quiz_attempts WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await
}

pub async fn get_quiz_attempts(
    pool: &SqlitePool,
    user_id: i64,
    content_id: i64,
) -> Result<Vec<QuizAttempt>, sqlx::Error> {
    sqlx::query_as::<_, QuizAttempt>(
        "SELECT * FROM quiz_attempts WHERE user_id = ? AND content_id = ? ORDER BY completed_at DESC"
    )
    .bind(user_id)
    .bind(content_id)
    .fetch_all(pool)
    .await
}

// Resource operations
pub async fn create_resource(pool: &SqlitePool, unit_id: i64, resource: &CreateResource) -> Result<Resource, sqlx::Error> {
    let result = sqlx::query(
        "INSERT INTO unit_resources (unit_id, resource_type, title, url, file_id) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(unit_id)
    .bind(&resource.resource_type)
    .bind(&resource.title)
    .bind(&resource.url)
    .bind(resource.file_id)
    .execute(pool)
    .await?;

    let id = result.last_insert_rowid();
    sqlx::query_as::<_, Resource>("SELECT * FROM unit_resources WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await
}

pub async fn delete_resource(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM unit_resources WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn list_all_courses(pool: &SqlitePool) -> Result<Vec<Course>, sqlx::Error> {
    sqlx::query_as::<_, Course>(
        "SELECT * FROM courses ORDER BY created_at DESC"
    )
    .fetch_all(pool)
    .await
}

pub async fn get_course_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Course>, sqlx::Error> {
    sqlx::query_as::<_, Course>(
        "SELECT * FROM courses WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn list_all_units(
    pool: &SqlitePool,
    course_id: i64,
) -> Result<Vec<Unit>, sqlx::Error> {
    sqlx::query_as::<_, Unit>(
        "SELECT * FROM units WHERE course_id = ? ORDER BY order_index"
    )
    .bind(course_id)
    .fetch_all(pool)
    .await
}

pub async fn get_unit_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Unit>, sqlx::Error> {
    sqlx::query_as::<_, Unit>(
        "SELECT * FROM units WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn list_all_content(
    pool: &SqlitePool,
    unit_id: i64,
) -> Result<Vec<Content>, sqlx::Error> {
    sqlx::query_as::<_, Content>(
        "SELECT * FROM content WHERE unit_id = ? ORDER BY created_at"
    )
    .bind(unit_id)
    .fetch_all(pool)
    .await
}

pub async fn get_content_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Content>, sqlx::Error> {
    sqlx::query_as::<_, Content>(
        "SELECT * FROM content WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn list_all_resources(
    pool: &SqlitePool,
    unit_id: i64,
) -> Result<Vec<Resource>, sqlx::Error> {
    sqlx::query_as::<_, Resource>(
        "SELECT * FROM unit_resources WHERE unit_id = ? ORDER BY created_at"
    )
    .bind(unit_id)
    .fetch_all(pool)
    .await
}

pub async fn get_resource_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Resource>, sqlx::Error> {
    sqlx::query_as::<_, Resource>(
        "SELECT * FROM unit_resources WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn list_all_files(pool: &SqlitePool) -> Result<Vec<File>, sqlx::Error> {
    sqlx::query_as::<_, File>(
        "SELECT * FROM files ORDER BY created_at DESC"
    )
    .fetch_all(pool)
    .await
}

pub async fn get_file_by_id(pool: &SqlitePool, id: i64) -> Result<Option<File>, sqlx::Error> {
    sqlx::query_as::<_, File>(
        "SELECT * FROM files WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

pub async fn list_all_audit_logs(pool: &SqlitePool) -> Result<Vec<AuditLog>, sqlx::Error> {
    sqlx::query_as::<_, AuditLog>(
        "SELECT a.*, u.display_name as user_display_name, u.email as user_email 
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         ORDER BY a.created_at DESC LIMIT 100"
    )
    .fetch_all(pool)
    .await
}

pub async fn list_entity_audit_logs(
    pool: &SqlitePool,
    entity_type: &str,
    entity_id: i64,
) -> Result<Vec<AuditLog>, sqlx::Error> {
    sqlx::query_as::<_, AuditLog>(
        "SELECT a.*, u.display_name as user_display_name, u.email as user_email 
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.entity_type = ? AND a.entity_id = ?
         ORDER BY a.created_at DESC"
    )
    .bind(entity_type)
    .bind(entity_id)
    .fetch_all(pool)
    .await
}
