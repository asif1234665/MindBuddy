import os
import json
import requests
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='.')

# Load key from environment variable or local config.json (gitignored)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    # Try reading from config.json
    try:
        config_path = os.path.join(os.path.dirname(__file__), 'config.json')
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
                GEMINI_API_KEY = config.get("GEMINI_API_KEY")
    except Exception as e:
        print("Could not load config.json:", e)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/chat', methods=['POST'])
def chat():
    if not GEMINI_API_KEY:
        return jsonify({
            "success": False,
            "error": "Gemini API Key is not configured on the server. Please add it to config.json or environment variables."
        }), 500

    try:
        data = request.json
        user_input = data.get("message")
        history = data.get("history", [])
        agent_name = data.get("agent_name", "ZenBuddy")

        # Call Gemini API
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        
        system_prompt = f"You are {agent_name}, a warm, supportive, and wise AI friend. Your core purpose is to listen to the user's worries, comfort them like a close buddy, and offer simple grounding tips. Keep your replies structured, kind, concise (no more than 3-4 sentences in chat unless necessary), and highly comforting. Validate their emotions first before offering suggestions."

        contents = []
        contents.append({
            "role": "user",
            "parts": [{"text": system_prompt + " Please respond to the user's initial greeting or message."}]
        })
        contents.append({
            "role": "model",
            "parts": [{"text": f"Hello! I am {agent_name}, your mindful friend. I am ready to support you. What is on your mind?"}]
        })

        for msg in history:
            contents.append({
                "role": "user" if msg.get("sender") == "user" else "model",
                "parts": [{"text": msg.get("text")}]
            })

        contents.append({
            "role": "user",
            "parts": [{"text": user_input}]
        })

        payload = {
            "contents": contents
        }

        headers = {
            "Content-Type": "application/json"
        }

        response = requests.post(endpoint, json=payload, headers=headers, timeout=15)
        if response.status_code == 200:
            res_data = response.json()
            try:
                reply = res_data["candidates"][0]["content"]["parts"][0]["text"]
                return jsonify({
                    "success": True,
                    "reply": reply
                })
            except (KeyError, IndexError):
                return jsonify({
                    "success": False,
                    "error": "Invalid response format from Gemini API."
                }), 500
        else:
            return jsonify({
                "success": False,
                "error": f"Gemini API returned status code {response.status_code}: {response.text}"
            }), response.status_code

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting server on port {port}...")
    app.run(debug=True, host='0.0.0.0', port=port)
