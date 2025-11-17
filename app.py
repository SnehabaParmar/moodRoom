from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import requests
import speech_recognition as sr
import tempfile

app = Flask(__name__)
CORS(app)

# Load Hugging Face API Key
HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")

# Hugging Face emotion model
# EMOTION_MODEL_URL = "https://api-inference.huggingface.co/models/SamLowe/roberta-base-go_emotions"

EMOTION_MODEL_URL = "https://router.huggingface.co/hf-inference/models/SamLowe/roberta-base-go_emotions"

hf_headers = {
    "Authorization": f"Bearer {HF_API_KEY}",
    "Content-Type": "application/json"
}


# ---------- HUGGING FACE EMOTION DETECTION ----------
def call_huggingface(text, retries=3):
    for _ in range(retries):
        try:
            res = requests.post(
                EMOTION_MODEL_URL,
                headers=hf_headers,
                json={"inputs": text},
                timeout=30
            )
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, dict) and "error" in data:
                    continue
                return data
            else:
                print("HF error:", res.status_code, res.text)
        except Exception as e:
            print("HF exception:", e)
    return None


def extract_top_emotion(data):
    if not data or not isinstance(data, list) or len(data) == 0:
        return {"label": "neutral", "score": 0}
    emotions = data[0]
    top = max(emotions, key=lambda x: x['score'])
    return {"label": top['label'], "score": top['score']}


# ---------- ROUTE 1: Emotion Detection ----------
@app.route("/detect-emotion", methods=["POST"])
def detect_emotion():
    body = request.get_json()
    text = body.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400

    data = call_huggingface(text)
    top = extract_top_emotion(data)
    return jsonify({"emotion": top["label"], "score": top["score"], "raw": data})

@app.route("/get-suggestion", methods=["POST"])
def get_suggestion():
    body = request.get_json()
    text = body.get("text", "").strip()
    emotion = body.get("emotion", "neutral").strip()

    if not text:
        return jsonify({"error": "No text provided"}), 400

    # 🧠 Prepare a warm, friendly prompt
    prompt = f"""
            You are a kind, supportive friend.
            The person just said: "{text}" and they are feeling {emotion}.
            Reply with 1–2 short, caring sentences that feel natural and comforting.
            """

    try:
        response = requests.post(
            "https://router.huggingface.co/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {HF_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "google/gemma-2-2b-it",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.9,
                "max_tokens": 80
            },
            timeout=40
        )

        if response.status_code != 200:
            print("HF Suggestion API error:", response.status_code, response.text)
            return jsonify({"suggestion": "Take a deep breath — everything will be okay 🌿"})

        data = response.json()
        suggestion_text = data["choices"][0]["message"]["content"].strip()

        return jsonify({"suggestion": suggestion_text})

    except Exception as e:
        print("Suggestion generation error:", e)
        return jsonify({"suggestion": "Keep going — you’ve got this 🌼"})

# ---------- ROUTE 2: Local Speech Transcription ----------
@app.route("/transcribe", methods=["POST"])
def transcribe_audio():
    from pydub import AudioSegment
    import speech_recognition as sr
    import tempfile, os

    audio_file = request.files.get("file")
    if not audio_file:
        return jsonify({"error": "No audio file provided"}), 400

    print("Received file:", audio_file.filename, "type:", audio_file.content_type)

    # Save uploaded WebM temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_webm:
        audio_file.save(temp_webm.name)
        temp_webm_path = temp_webm.name

    # Convert WebM → WAV
    try:
        wav_path = temp_webm_path.replace(".webm", ".wav")
        sound = AudioSegment.from_file(temp_webm_path, format="webm")
        sound.export(wav_path, format="wav")

        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
        text = recognizer.recognize_google(audio_data)
        print("Recognized text:", text)
        return jsonify({"text": text})
    except Exception as e:
        print("Error during transcription:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_webm_path):
            os.remove(temp_webm_path)
        if os.path.exists(wav_path):
            os.remove(wav_path)

@app.route("/chat", methods=["POST"])
def chat_with_ai():
    from openai import OpenAI
    try:
        body = request.get_json()
        msg = body.get("message", "").strip()

        if not msg:
            return jsonify({"reply": "Please type something."})

        load_dotenv()
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        # client = OpenAI(api_key=OPENAI_API_KEY)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a friendly emotional support chatbot."},
                {"role": "user", "content": msg}
            ],
            max_tokens=150
        )

        # 📌 FIX: Accessing new SDK response format
        ai_reply = response.choices[0].message.content

        return jsonify({"reply": ai_reply})

    except Exception as e:
        print("Chat API Error:", str(e))
        return jsonify({"reply": "Sorry, I’m having trouble responding right now."})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
