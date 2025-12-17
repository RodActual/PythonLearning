import os
import json
from flask import Flask, jsonify
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)

# --- Firebase Initialization ---

def initialize_firebase():
    """
    Initializes Firebase using credentials from environment variables (Vercel) 
    or a local file (dev).
    """
    # Check if firebase is already initialized to avoid errors on hot-reload
    if firebase_admin._apps:
        return firestore.client()

    try:
        # 1. PRODUCTION / VERCEL SETUP (uses secure environment variable)
        if os.environ.get('FIREBASE_CREDENTIALS_JSON'):
            cred_json = json.loads(os.environ['FIREBASE_CREDENTIALS_JSON'])
            cred = credentials.Certificate(cred_json)
            print("Firebase initialized from environment variable.")
        
        # 2. LOCAL DEVELOPMENT SETUP (uses local file)
        elif os.path.exists("firebase_admin_key.json"):
            cred = credentials.Certificate("firebase_admin_key.json")
            print("Firebase initialized from local file.")
        
        else:
            raise EnvironmentError("Firebase credentials not found. Check environment variables or local JSON file.")

        firebase_admin.initialize_app(cred)
        return firestore.client()

    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        return None

# Initialize the database client
db = initialize_firebase()

# --- API Endpoints ---

@app.route('/api/', methods=['GET'])
def home():
    """Health check endpoint."""
    if not db:
        return jsonify({
            "status": "error",
            "message": "API running, but Firebase connection failed."
        }), 500
        
    return jsonify({
        "status": "success",
        "message": "Welcome to the Python Learning UI API!",
        "database": "Connected to Firestore"
    })

@app.route('/api/lessons', methods=['GET'])
def get_lesson_list():
    """Fetches a list of available lessons sorted by ID."""
    if not db:
        return jsonify({"status": "error", "message": "Database not initialized"}), 500

    try:
        # Fetch all documents from the 'lessons' collection
        lessons_ref = db.collection('lessons')
        docs = lessons_ref.stream()
        
        lessons_list = []
        for doc in docs:
            data = doc.to_dict()
            
            # Safe step counting
            steps = data.get("steps", [])
            step_count = len(steps) if isinstance(steps, list) else 0

            lessons_list.append({
                "id": doc.id,
                "title": data.get("title", "Untitled Lesson"),
                "step_count": step_count 
            })
        
        # Sort the list by ID (e.g., lesson-01, lesson-02) to ensure correct order
        lessons_list.sort(key=lambda x: x['id'])

        return jsonify(lessons_list)

    except Exception as e:
        print(f"❌ API CRASH in get_lesson_list: {e}")
        return jsonify({
            "status": "error", 
            "message": f"Could not fetch lesson list: {str(e)}"
        }), 500

@app.route('/api/lesson/<lesson_id>', methods=['GET'])
def get_lesson_content(lesson_id):
    """Fetches the full steps and content for a specific lesson by ID."""
    if not db:
        return jsonify({"status": "error", "message": "Database not initialized"}), 500

    try:
        lesson_ref = db.collection('lessons').document(lesson_id)
        doc = lesson_ref.get()
        
        if not doc.exists:
            return jsonify({"status": "error", "message": f"Lesson '{lesson_id}' not found"}), 404
        
        lesson_data = doc.to_dict()
        
        # Validation to ensure steps exist
        if 'steps' not in lesson_data:
             return jsonify({"status": "error", "message": "Lesson content is incomplete (missing 'steps')"}), 500

        return jsonify(lesson_data)

    except Exception as e:
        print(f"❌ API CRASH in get_lesson_content: {e}")
        return jsonify({
            "status": "error", 
            "message": f"Could not fetch lesson content: {str(e)}"
        }), 500

# --- Local Development Entry Point ---
if __name__ == '__main__':
    # Run locally on port 5000 for Vite proxy to work
    app.run(debug=True, port=5000)