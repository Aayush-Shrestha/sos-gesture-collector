# 🎥 SOS Gesture Collector

A web-based data collection tool designed to crowdsource video and landmark data for training AI models to recognize the "SOS" hand gesture.

Built with **Flask**, **MediaPipe**, and **Hugging Face Datasets**.

## 🚀 Features

* **Real-time Hand Tracking:** Uses MediaPipe Holistic to detect hand landmarks in the browser.
* **Standardized Recording:** Automatically throttles recordings to **20 FPS** and **90 frames** (4.5 seconds) to ensure consistent data for AI training.
* **Dual Capture:** Saves both the raw video feed and the overlay (skeleton) video.
* **Cloud Storage:** Directly uploads data to a private **Hugging Face Dataset**, bypassing server storage limits.
* **Mobile Compatible:** Works on smartphones with a mirrored "Selfie Mode" for better user experience.

## 🛠️ Tech Stack

* **Frontend:** HTML5, Bootstrap 5, Vanilla JavaScript, MediaPipe
* **Backend:** Python (Flask), Gunicorn
* **Storage:** Hugging Face Hub API
* **Deployment:** Render (compatible with Free Tier)

---

## ⚙️ Local Setup Guide

Follow these steps to run the application on your computer.

### 1. Prerequisites
* Python 3.9.18
* A [Hugging Face](https://huggingface.co/) account

### 2. Clone the Repository
```bash
git clone https://github.com/Aayush-Shrestha/sos-gesture-collector.git
cd sos-gesture-collector
```

### 3. Create a Virtual Environment
It is recommended to use a virtual environment to manage dependencies.

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables
Create a file named `.env` in the root folder and add your Hugging Face credentials:
```ini
HF_TOKEN=hf_your_write_token_here
DATASET_ID=your_hf_username/sos-gesture-data
```

* `HF_TOKEN`: Get a "Write" token from Hugging Face Settings > Tokens.
* `DATASET_ID`: The name of the dataset repo you created on Hugging Face.

### 6. Run the Application
```bash
python app.py
```

Open your browser and navigate to: `http://127.0.0.1:5000`

## ☁️ Deployment (Render)

This app is configured to run on Render's Free Tier.

1. Push your code to GitHub.
2. Create a new Web Service on Render and select your repository.
3. **Settings:**
   * Runtime: Python 3
   * Build Command: `pip install -r requirements.txt`
   * Start Command: `gunicorn app:app`
4. **Environment Variables:** Go to the "Environment" tab in Render and add the same variables from your local setup:
   * `HF_TOKEN`: (Your Token)
   * `DATASET_ID`: (Your Dataset ID)

## 📂 Project Structure
```
sos-gesture-collector/
├── static/
│   ├── css/
│   │   └── style.css       # Styles (inc. mirroring logic)
│   ├── js/
│   │   └── recorder.js     # MediaPipe & Recording Logic
│   └── videos/
│       └── demo.mp4        # Instructions video
├── templates/
│   └── index.html          # Main application UI
├── app.py                  # Flask Backend
├── requirements.txt        # Python Dependencies
└── README.md               # Documentation
```

## 📝 Usage

1. **Select Action:** Choose the gesture you want to record (e.g., "SOS Sign").
2. **Position Camera:** Ensure you are in a well-lit room. The video feed is mirrored for your convenience.
3. **Record:** Click "Start Recording". The app will count down and capture exactly 4.5 seconds.
4. **Review & Submit:** Watch the playback. If the skeleton tracking looks good, click Submit to upload directly to the cloud.

## 📄 License

This project is open-source. Feel free to use it for your own data collection needs.