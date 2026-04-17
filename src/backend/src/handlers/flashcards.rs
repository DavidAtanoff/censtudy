use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use std::sync::Arc;

use crate::{
    ai, db,
    models::{FlashcardProgress, FlashcardReview, FlashcardStats, User},
    studyml, AppState,
};

pub async fn get_next_card(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(deck_id): Path<i64>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let practice_mode = params.get("practice").map(|v| v == "true").unwrap_or(false);

    let content = db::get_content_for_user(&state.pool, deck_id, user.id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    if content.content_type != "flashcard-deck" {
        return Err(StatusCode::NOT_FOUND);
    }
    let cards = studyml::parse_flashcards(&content.studyml_content);
    let card_count = cards.len() as i64;

    if card_count == 0 {
        return Ok(Json(serde_json::json!({
            "message": "This deck does not contain any valid flashcards yet."
        })));
    }

    if practice_mode {
        let mut all_progress = Vec::new();
        for index in 0..card_count {
            let progress = db::get_flashcard_progress(&state.pool, user.id, deck_id, index)
                .await
                .ok()
                .flatten();
            all_progress.push((index, progress));
        }

        all_progress.sort_by(|a, b| {
            let time_a = a.1.as_ref().and_then(|progress| progress.last_seen);
            let time_b = b.1.as_ref().and_then(|progress| progress.last_seen);

            if time_a != time_b {
                return time_a.cmp(&time_b);
            }

            a.0.cmp(&b.0)
        });

        if let Some((index, _)) = all_progress.first() {
            return Ok(Json(card_response(&cards, *index as usize)));
        }
    }

    for index in 0..card_count {
        let progress = db::get_flashcard_progress(&state.pool, user.id, deck_id, index)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        if let Some(progress) = progress {
            if let Some(next_review) = progress.next_review {
                if next_review <= Utc::now() {
                    return Ok(Json(card_response(&cards, index as usize)));
                }
            }
        } else {
            return Ok(Json(card_response(&cards, index as usize)));
        }
    }

    Ok(Json(serde_json::json!({
        "message": "All cards reviewed for today!"
    })))
}

pub async fn submit_review(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(deck_id): Path<i64>,
    Json(review): Json<FlashcardReview>,
) -> Result<StatusCode, StatusCode> {
    let content = db::get_content_for_user(&state.pool, deck_id, user.id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    if content.content_type != "flashcard-deck" {
        return Err(StatusCode::NOT_FOUND);
    }

    let existing = db::get_flashcard_progress(&state.pool, user.id, deck_id, review.flashcard_index)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let (current_interval, correct_count, incorrect_count) = if let Some(progress) = existing {
        (progress.interval_days, progress.correct_count, progress.incorrect_count)
    } else {
        (1.0, 0, 0)
    };

    let (new_interval, next_review) = ai::calculate_next_review(review.quality, current_interval);

    let mut new_correct = correct_count;
    let mut new_incorrect = incorrect_count;

    if review.quality >= 3 {
        new_correct = 3;
    } else if review.quality == 2 {
        new_correct += 1;
    } else {
        new_correct = 0;
        new_incorrect += 1;
    }

    let progress = FlashcardProgress {
        id: 0,
        user_id: user.id,
        content_id: deck_id,
        flashcard_index: review.flashcard_index,
        correct_count: new_correct,
        incorrect_count: new_incorrect,
        last_seen: Some(Utc::now()),
        next_review: Some(next_review),
        interval_days: new_interval,
    };

    db::upsert_flashcard_progress(&state.pool, &progress)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}

pub async fn get_stats(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(deck_id): Path<i64>,
) -> Result<Json<FlashcardStats>, StatusCode> {
    let content = db::get_content_for_user(&state.pool, deck_id, user.id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    if content.content_type != "flashcard-deck" {
        return Err(StatusCode::NOT_FOUND);
    }
    let card_count = studyml::parse_flashcards(&content.studyml_content).len() as i64;

    db::get_flashcard_stats(&state.pool, user.id, deck_id, card_count)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

fn card_response(cards: &[studyml::FlashcardBlock], index: usize) -> serde_json::Value {
    cards.get(index).map_or_else(
        || serde_json::json!({}),
        |card| {
            serde_json::json!({
                "flashcard_index": index,
                "content": {
                    "raw": card.raw,
                    "front": card.front,
                    "back": card.back
                }
            })
        },
    )
}
