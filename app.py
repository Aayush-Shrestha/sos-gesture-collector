import os
import json
import time
import shutil
import numpy as np
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from huggingface_hub import HfApi

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'temp_uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- REPLACEMENT FOR MEGA ---
# We use Hugging Face API instead. It doesn't block Render IPs.
HF_TOKEN = os.environ.get("HF_TOKEN")
# Format: "your_username/your_dataset_name"
DATASET_ID = os.environ.get("DATASET_ID") 

if HF_TOKEN:
    print("Hugging Face Token found. Storage configured.")
else:
    print("WARNING: HF_TOKEN is missing. Uploads will fail.")

api = HfApi(token=HF_TOKEN)

def extract_keypoints_from_json(landmarks_data):
    lh = np.zeros(21*3)
    rh = np.zeros(21*3)
    def flatten_hand(hand_data):
        if not hand_data: return np.zeros(21*3)
        flat = []
        for lm in hand_data:
            flat.extend([lm.get('x', 0), lm.get('y', 0), lm.get('z', 0)])
        return np.array(flat)
    if 'left' in landmarks_data and landmarks_data['left']: lh = flatten_hand(landmarks_data['left'])
    if 'right' in landmarks_data and landmarks_data['right']: rh = flatten_hand(landmarks_data['right'])
    return np.concatenate([lh, rh])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_data():
    if not HF_TOKEN or not DATASET_ID:
        return jsonify({'error': 'Storage not configured (Missing HF_TOKEN or DATASET_ID)'}), 500

    temp_dir = None
    try:
        # 1. Parse Data
        session_id = request.form.get('session_id')
        action = request.form.get('action')
        timestamp = int(time.time())
        
        # 2. Save Files Locally First
        folder_name = f"{timestamp}_{session_id[:8]}"
        temp_dir = os.path.join(UPLOAD_FOLDER, action, folder_name)
        os.makedirs(temp_dir, exist_ok=True)
        
        video_raw = request.files.get('video_raw')
        video_overlay = request.files.get('video_overlay')
        landmarks_json = request.files.get('landmarks')
        metadata_json = request.files.get('metadata')

        if not all([video_raw, video_overlay, landmarks_json]):
            return jsonify({'error': 'Missing files'}), 400

        video_raw.save(os.path.join(temp_dir, 'video_raw.webm'))
        video_overlay.save(os.path.join(temp_dir, 'video_overlay.webm'))
        if metadata_json: metadata_json.save(os.path.join(temp_dir, 'metadata.json'))

        # Process Landmarks
        landmarks_path = os.path.join(temp_dir, 'landmarks')
        os.makedirs(landmarks_path, exist_ok=True)
        lm_data = json.load(landmarks_json)
        for i, frame in enumerate(lm_data):
            if i >= 90: break
            np.save(os.path.join(landmarks_path, f"{i}.npy"), extract_keypoints_from_json(frame))

        # 3. Upload to Hugging Face
        # This uploads the folder recursively to your private dataset
        print(f"Uploading to {DATASET_ID}...")
        api.upload_folder(
            folder_path=temp_dir,
            repo_id=DATASET_ID,
            repo_type="dataset",
            path_in_repo=f"data/{action}/{folder_name}"
        )

        return jsonify({'status': 'success'})

    except Exception as e:
        print(f"Upload Error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        # Cleanup
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)