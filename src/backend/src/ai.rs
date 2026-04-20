use serde::{Deserialize, Serialize};
use crate::models::{GradeRequest, GradeResponse};

#[derive(Debug, Serialize)]
struct GemmaRequest {
    contents: Vec<Content>,
    #[serde(rename = "generationConfig")]
    generation_config: GenerationConfig,
}

#[derive(Debug, Serialize)]
struct Content {
    role: String,
    parts: Vec<Part>,
}

#[derive(Debug, Serialize)]
struct Part {
    text: String,
}

#[derive(Debug, Serialize)]
struct GenerationConfig {
    #[serde(rename = "thinkingConfig")]
    thinking_config: ThinkingConfig,
    #[serde(rename = "responseMimeType")]
    response_mime_type: String,
}

#[derive(Debug, Serialize)]
struct ThinkingConfig {
    #[serde(rename = "thinkingLevel")]
    thinking_level: String,
}

#[derive(Debug, Deserialize)]
struct GemmaResponse {
    candidates: Vec<Candidate>,
}

#[derive(Debug, Deserialize)]
struct Candidate {
    content: ResponseContent,
}

#[derive(Debug, Deserialize)]
struct ResponseContent {
    parts: Vec<ResponsePart>,
}

#[derive(Debug, Deserialize)]
struct ResponsePart {
    text: String,
}

pub async fn grade_short_answer(request: &GradeRequest) -> Result<GradeResponse, Box<dyn std::error::Error>> {
    let api_key = std::env::var("GEMINI_API_KEY")
        .unwrap_or_else(|_| "demo-key".to_string());
    
    let prompt = format!(
        r#"Grade this student answer on a scale of 0-100.

Question/Expected Answer: {}
Student Answer: {}
Key Concepts to Check: {:?}

Provide your response in this exact JSON format. DO NOT use markdown formatting or codeblocks:
{{
  "score": <number 0-100>,
  "feedback": "<2-3 sentence feedback>",
  "missing_concepts": ["<concept1>", "<concept2>"]
}}

Grading criteria:
- Conceptual accuracy (60%)
- Keyword presence (20%)
- Explanation clarity (20%)
- Give partial credit for partially correct answers"#,
        request.correct_answer,
        request.user_answer,
        request.keywords
    );

    let gemma_request = GemmaRequest {
        contents: vec![Content {
            role: "user".to_string(),
            parts: vec![Part { text: prompt }],
        }],
        generation_config: GenerationConfig {
            thinking_config: ThinkingConfig {
                thinking_level: "MINIMAL".to_string(),
            },
            response_mime_type: "application/json".to_string(),
        },
    };

    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key={}",
        api_key
    );

    let response = client
        .post(&url)
        .json(&gemma_request)
        .send()
        .await?;

    if !response.status().is_success() {
        return Ok(GradeResponse {
            score: 75.0,
            feedback: "Demo mode: Answer shows understanding of key concepts.".to_string(),
            missing_concepts: vec![],
        });
    }

    let gemma_response: GemmaResponse = response.json().await?;
    
    if let Some(candidate) = gemma_response.candidates.first() {
        if let Some(part) = candidate.content.parts.first() {
            let raw_text = &part.text;
            
            let clean_json = if let Some(start) = raw_text.find('{') {
                if let Some(end) = raw_text.rfind('}') {
                    &raw_text[start..=end]
                } else {
                    raw_text
                }
            } else {
                raw_text
            };

            let grade: GradeResponse = match serde_json::from_str(clean_json) {
                Ok(g) => g,
                Err(_) => {
                    let lower_raw = raw_text.to_lowercase();
                    
                    let score = lower_raw.lines()
                        .find(|l| l.contains("score"))
                        .and_then(|l| {
                           let after_score = l.split("score").nth(1)?;
                           let score_str: String = after_score.chars()
                                .skip_while(|c| !c.is_digit(10))
                                .take_while(|c| c.is_digit(10) || *c == '.')
                                .collect();
                           score_str.parse::<f64>().ok()
                        })
                        .unwrap_or(70.0);

                    let feedback = raw_text.lines()
                        .find(|l| l.to_lowercase().contains("feedback"))
                        .and_then(|l| {
                            let parts: Vec<&str> = l.splitn(2, ':').collect();
                            parts.get(1).map(|s| s.trim().trim_matches('"'))
                        })
                        .unwrap_or("Review the core principles of this topic.")
                        .to_string();

                    let missing_concepts: Vec<String> = lower_raw.lines()
                        .skip_while(|l| !l.contains("missing_concepts") && !l.contains("missing concepts"))
                        .skip(1)
                        .take_while(|l| l.trim().starts_with('"') || l.trim().starts_with('-'))
                        .filter_map(|l| {
                            let clean = l.replace(|c: char| !c.is_alphanumeric() && c != ' ', "").trim().to_string();
                            if clean.is_empty() { None } else { Some(clean) }
                        })
                        .collect();

                    GradeResponse {
                        score,
                        feedback,
                        missing_concepts,
                    }
                }
            };
            return Ok(grade);
        }
    }

    Ok(GradeResponse {
        score: 70.0,
        feedback: "AI grading unavailable. Please review manually.".to_string(),
        missing_concepts: vec![],
    })
}

pub fn calculate_next_review(quality: u8, current_interval: f64) -> (f64, chrono::DateTime<chrono::Utc>) {
    use chrono::{Duration, Utc};
    
    let new_interval = match quality {
        0 | 1 => 1.0,
        2 => current_interval * 1.2,
        3 => current_interval * 2.5,
        _ => current_interval,
    };
    
    let next_review = Utc::now() + Duration::days(new_interval as i64);
    (new_interval, next_review)
}

pub async fn chat_tutor(request: &crate::models::ChatRequest, study_guide_content: &str) -> String {
    let api_key = std::env::var("GEMINI_API_KEY")
        .unwrap_or_else(|_| "demo-key".to_string());
        
    let system_prompt = format!("You are a world-class AI tutor. Here is the study guide for this unit:\n\n{}\n\nAnswer the user questions strictly based on the content of the study guide. Be encouraging and helpful. You may return markdown and KaTeX equations.", study_guide_content);

    let mut contents: Vec<Content> = vec![
        Content {
            role: "user".to_string(),
            parts: vec![Part { text: system_prompt }],
        },
        Content {
            role: "model".to_string(),
            parts: vec![Part { text: "I understand. I am ready to be a helpful AI tutor based on this study guide.".to_string() }],
        }
    ];

    for msg in &request.messages {
        contents.push(Content {
            role: if msg.role == "user" { "user".to_string() } else { "model".to_string() },
            parts: vec![Part { text: msg.content.clone() }],
        });
    }

    let gemma_request = GemmaRequest {
        contents,
        generation_config: GenerationConfig {
            thinking_config: ThinkingConfig {
                thinking_level: "MINIMAL".to_string(),
            },
            response_mime_type: "text/plain".to_string(),
        },
    };

    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key={}",
        api_key
    );

    let response = match client.post(&url).json(&gemma_request).send().await {
        Ok(res) => res,
        Err(_) => return "Sorry, I am having trouble connecting to my neural network at the moment.".to_string(),
    };

    if !response.status().is_success() {
        return "Demo mode: I am an AI Tutor. You asked me a question about the study guide. Since this is demo mode, I can merely confirm that you should consult the textbook!".to_string();
    }

    if let Ok(gemma_response) = response.json::<GemmaResponse>().await {
        if let Some(candidate) = gemma_response.candidates.first() {
            if let Some(part) = candidate.content.parts.first() {
                return clean_ai_response(&part.text);
            }
        }
    }

    "I could not formulate a proper response at this time.".to_string()
}

fn clean_ai_response(text: &str) -> String {
    let mut cleaned = text.to_string();
    
    // List of common thinking/reasoning tags to strip
    let patterns = [
        (r"(?s)<think>.*?</think>", ""),
        (r"(?s)<thought>.*?</thought>", ""),
        (r"(?s)\[THOUGHT\].*?\[/THOUGHT\]", ""),
        (r"(?s)\[REASONING\].*?\[/REASONING\]", ""),
    ];

    for (pattern, replacement) in &patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            cleaned = re.replace_all(&cleaned, *replacement).to_string();
        }
    }

    cleaned.trim().to_string()
}