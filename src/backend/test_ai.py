import os
import requests
import json

def test_api():
    api_key = os.environ.get("GEMINI_API_KEY", "AIzaSyAUA0-LTcz6cUEg5B4OM113FwjEnFdlcTk")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key={api_key}"
    
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": "Hello, can you give me a biology fact?"}]
            }
        ],
        "generationConfig": {
            "thinkingConfig": {
                "thinkingLevel": "MINIMAL"
            },
            "responseMimeType": "text/plain"
        }
    }
    
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error decoding JSON: {e}")
        print(response.text)

if __name__ == "__main__":
    test_api()
