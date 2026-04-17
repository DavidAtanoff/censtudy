#[derive(Debug, Clone)]
pub struct FlashcardBlock {
    pub raw: String,
    pub front: String,
    pub back: String,
}

pub fn validate_content(content_type: &str, studyml: &str) -> Result<(), String> {
    let trimmed = studyml.trim();
    if trimmed.is_empty() {
        return Err("StudyML content cannot be empty.".to_string());
    }

    match content_type {
        "flashcard-deck" => {
            if parse_flashcards(trimmed).is_empty() {
                return Err(
                    "Flashcard decks need at least one valid ::flashcard block with **Front** and **Back**."
                        .to_string(),
                );
            }
        }
        "quiz" | "test" => {
            if extract_blocks(trimmed, "question").is_empty() {
                return Err("Quizzes need at least one ::question block.".to_string());
            }
        }
        _ => {}
    }

    Ok(())
}

pub fn parse_flashcards(studyml: &str) -> Vec<FlashcardBlock> {
    extract_blocks(studyml, "flashcard")
        .into_iter()
        .filter_map(|raw| {
            let lower = raw.to_ascii_lowercase();
            let front_marker = "**front**:";
            let back_marker = "**back**:";

            let front_start = lower.find(front_marker)?;
            let back_start = lower.find(back_marker)?;
            if back_start <= front_start {
                return None;
            }

            let front = raw[front_start + front_marker.len()..back_start].trim().to_string();
            let back = raw[back_start + back_marker.len()..].trim().to_string();

            if front.is_empty() || back.is_empty() {
                return None;
            }

            Some(FlashcardBlock { raw, front, back })
        })
        .collect()
}

fn extract_blocks(content: &str, tag: &str) -> Vec<String> {
    let source = normalize(content);
    let token = format!("::{}", tag);
    let mut blocks = Vec::new();
    let mut cursor = 0usize;

    while let Some(relative_start) = source[cursor..].find(&token) {
        let start = cursor + relative_start;
        let Some(body_start) = read_block_open(&source, start, tag) else {
            cursor = start + token.len();
            continue;
        };

        let Some(close_index) = find_matching_close(&source, body_start) else {
            break;
        };

        blocks.push(source[body_start..close_index].trim().to_string());
        cursor = close_index + 2;
    }

    blocks
}

fn read_block_open(source: &str, start: usize, tag: &str) -> Option<usize> {
    let mut cursor = start + 2 + tag.len();
    let bytes = source.as_bytes();

    if bytes.get(cursor) == Some(&b'{') {
        let attr_end = source[cursor + 1..].find('}')?;
        cursor += attr_end + 2;
    }

    while let Some(byte) = bytes.get(cursor) {
        if !byte.is_ascii_whitespace() {
            break;
        }
        cursor += 1;
    }

    Some(cursor)
}

fn find_matching_close(source: &str, start: usize) -> Option<usize> {
    let bytes = source.as_bytes();
    let mut cursor = start;
    let mut depth = 0usize;

    while cursor + 1 < bytes.len() {
        if bytes[cursor] == b':' && bytes[cursor + 1] == b':' {
            let next = bytes.get(cursor + 2).copied().unwrap_or_default();
            if (next as char).is_ascii_alphabetic() {
                depth += 1;
                cursor += 2;
                continue;
            }

            if depth == 0 {
                return Some(cursor);
            }

            depth -= 1;
            cursor += 2;
            continue;
        }

        cursor += 1;
    }

    None
}

fn normalize(content: &str) -> String {
    content.replace("\r\n", "\n").replace('\r', "\n")
}
