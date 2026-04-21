use axum::{
    extract::{Extension, Multipart, Path, State},
    response::Response,
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;
use crate::{models::{File, User}, AppState};

pub async fn upload_file(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    mut multipart: Multipart,
) -> Result<Json<File>, StatusCode> {
    if user.email != "atanodav@berkeleyprep.org" {
        return Err(StatusCode::FORBIDDEN);
    }
    
    while let Some(field) = multipart.next_field().await.map_err(|_| StatusCode::BAD_REQUEST)? {
        let name = field.name().unwrap_or("").to_string();
        
        if name == "file" {
            let filename = field.file_name().unwrap_or("unknown").to_string();
            let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
            let data = field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?;
            
            // Validate file size (max 10MB)
            if data.len() > 10 * 1024 * 1024 {
                return Err(StatusCode::PAYLOAD_TOO_LARGE);
            }
            
            // Validate file type
            let allowed_types = vec![
                "image/jpeg", "image/png", "image/gif", "image/webp",
                "application/pdf",
                "audio/mpeg", "audio/wav", "audio/ogg"
            ];
            
            if !allowed_types.contains(&content_type.as_str()) {
                return Err(StatusCode::UNSUPPORTED_MEDIA_TYPE);
            }
            
            // Generate unique filename
            let extension = match content_type.as_str() {
                "image/jpeg" => "jpg",
                "image/png" => "png",
                "image/gif" => "gif",
                "image/webp" => "webp",
                "application/pdf" => "pdf",
                "audio/mpeg" => "mp3",
                "audio/wav" => "wav",
                "audio/ogg" => "ogg",
                _ => "bin",
            };
            let unique_filename = format!("{}.{}", Uuid::new_v4(), extension);
            
            // Create uploads directory if it doesn't exist
            fs::create_dir_all("uploads").await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            
            // Save file
            let file_path = format!("uploads/{}", unique_filename);
            let mut file = fs::File::create(&file_path).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            file.write_all(&data).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            
            // Save to database
            let result = sqlx::query(
                "INSERT INTO files (filename, original_filename, file_type, file_size, storage_path, uploaded_by) 
                 VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(&unique_filename)
            .bind(&filename)
            .bind(&content_type)
            .bind(data.len() as i64)
            .bind(&file_path)
            .bind(user.id)
            .execute(&state.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            
            let file_id = result.last_insert_rowid();
            
            let file = sqlx::query_as::<_, File>("SELECT * FROM files WHERE id = ?")
                .bind(file_id)
                .fetch_one(&state.pool)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            
            return Ok(Json(file));
        }
    }
    
    Err(StatusCode::BAD_REQUEST)
}

pub async fn get_file(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> Result<Json<File>, StatusCode> {
    crate::db::get_file_by_id(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

pub async fn download_file(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> Result<Response, StatusCode> {
    let file = crate::db::get_file_by_id(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let bytes = fs::read(&file.storage_path)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    let safe_filename = file
        .original_filename
        .replace('"', "")
        .replace('\r', "")
        .replace('\n', "");

    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", file.file_type)
        .header(
            "Content-Disposition",
            format!("attachment; filename=\"{}\"", safe_filename),
        )
        .body(axum::body::Body::from(bytes))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn list_files(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<User>,
) -> Result<Json<Vec<File>>, StatusCode> {
    crate::db::list_all_files(&state.pool)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn delete_file(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<i64>,
) -> Result<StatusCode, StatusCode> {
    if user.email != "atanodav@berkeleyprep.org" {
        return Err(StatusCode::FORBIDDEN);
    }
    
    let file = crate::db::get_file_by_id(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    
    // Delete physical file
    fs::remove_file(&file.storage_path).await.ok();
    
    // Delete from database
    sqlx::query("DELETE FROM files WHERE id = ?")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Log audit
    let _ = crate::handlers::audit::log_action(
        &state.pool,
        user.id,
        "delete",
        "file",
        id,
        Some(&format!("Deleted file: {}", file.original_filename)),
    ).await;
    
    Ok(StatusCode::NO_CONTENT)
}
