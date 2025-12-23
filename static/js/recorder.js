// Global State
let selectedAction = '';
let isRecording = false;
let recordedFrames = 0;
let landmarkData = []; // To store {left: [], right: []} per frame
// --- CONFIGURATION ---
const TARGET_FPS = 20;
const FRAME_INTERVAL = 1000 / TARGET_FPS; // 50ms
const MAX_FRAMES = 90; // 90 frames @ 20 FPS = 4.5 Seconds

let lastFrameTime = 0; // To track timing
// MediaRecorder vars
let mediaRecorderRaw;
let mediaRecorderOverlay;
let chunksRaw = [];
let chunksOverlay = [];
let blobRaw, blobOverlay;

// DOM Elements
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const btnStart = document.getElementById('btn-start');

// 1. Setup MediaPipe Holistic
const holistic = new Holistic({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
}});

holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

holistic.onResults(onResults);

// Camera Setup
const camera = new Camera(videoElement, {
    onFrame: async () => {
        const now = Date.now();
        const elapsed = now - lastFrameTime;

        // IF: Not enough time has passed (less than 50ms), SKIP this frame
        if (elapsed < FRAME_INTERVAL) {
            return;
        }

        // ELSE: Process the frame
        // Adjust lastFrameTime to keep the rhythm steady
        lastFrameTime = now - (elapsed % FRAME_INTERVAL);

        await holistic.send({image: videoElement});
    },
    width: 750,
    height: 600
});
// Start Camera immediately but hidden
camera.start();

function selectAction(action) {
    selectedAction = action;
    document.getElementById('screen-welcome').classList.add('d-none');
    document.getElementById('screen-record').classList.remove('d-none');
    document.getElementById('action-title').innerText = `Recording: ${action.replace('_', ' ')}`;
    
    // Enable button when MP is ready (simple heuristic: wait 2s or check first frame)
    setTimeout(() => {
        btnStart.disabled = false;
        btnStart.innerText = "Start Recording";
        btnStart.onclick = startCountdown;
    }, 2000);
}

// 2. Main Draw Loop & Data Capture
function onResults(results) {
    // Draw
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw Video Feed
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    // Draw Landmarks (Matching Python Styles)
    // Left Hand: (121, 22, 76)
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, 
                   {color: 'rgb(121, 44, 250)', lineWidth: 2});
    drawLandmarks(canvasCtx, results.leftHandLandmarks, 
                  {color: 'rgb(121, 22, 76)', lineWidth: 2, radius: 4});

    // Right Hand: (245, 117, 66)
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, 
                   {color: 'rgb(245, 66, 230)', lineWidth: 2});
    drawLandmarks(canvasCtx, results.rightHandLandmarks, 
                  {color: 'rgb(245, 117, 66)', lineWidth: 2, radius: 4});
    
    canvasCtx.restore();

    // Record Data if Active
    if (isRecording) {
        if (recordedFrames < MAX_FRAMES) {
            // Save Landmark Data
            landmarkData.push({
                left: results.leftHandLandmarks || null,
                right: results.rightHandLandmarks || null
            });
            
            recordedFrames++;
            updateProgress();
        } else {
            stopRecording();
        }
    }
}

function startCountdown() {
    btnStart.disabled = true;
    const overlay = document.getElementById('countdown-overlay');
    const text = document.getElementById('countdown-text');
    overlay.classList.remove('d-none');
    
    let count = 3;
    const timer = setInterval(() => {
        text.innerText = count;
        if (count === 0) {
            clearInterval(timer);
            overlay.classList.add('d-none');
            beginCapture();
        }
        count--;
    }, 1000);
}

function beginCapture() {
    isRecording = true;
    recordedFrames = 0;
    landmarkData = [];
    chunksRaw = [];
    chunksOverlay = [];

    // Capture streams at 20 FPS
    const streamRaw = videoElement.captureStream(TARGET_FPS);
    const streamOverlay = canvasElement.captureStream(TARGET_FPS);

    // Initialize Recorders
    mediaRecorderRaw = new MediaRecorder(streamRaw, {
        mimeType: 'video/webm; codecs=vp9',
        videoBitsPerSecond: 2500000 // Optional: Better quality
    });
    
    mediaRecorderOverlay = new MediaRecorder(streamOverlay, {
        mimeType: 'video/webm; codecs=vp9',
        videoBitsPerSecond: 2500000
    });

    mediaRecorderRaw.ondataavailable = (e) => { if(e.data.size > 0) chunksRaw.push(e.data); };
    mediaRecorderOverlay.ondataavailable = (e) => { if(e.data.size > 0) chunksOverlay.push(e.data); };// ... (Rest of your existing code for ondataavailable) ...

    mediaRecorderRaw.start();
    mediaRecorderOverlay.start();
}

function stopRecording() {
    isRecording = false;
    mediaRecorderRaw.stop();
    mediaRecorderOverlay.stop();

    // Wait for stop event to process blobs
    mediaRecorderOverlay.onstop = () => {
        blobRaw = new Blob(chunksRaw, {type: 'video/webm'});
        blobOverlay = new Blob(chunksOverlay, {type: 'video/webm'});
        
        // Setup Review Screen
        const vidURL = URL.createObjectURL(blobOverlay);
        document.getElementById('review-overlay').src = vidURL;
        
        document.getElementById('screen-record').classList.add('d-none');
        document.getElementById('screen-review').classList.remove('d-none');
    };
}

function updateProgress() {
    const pct = (recordedFrames / MAX_FRAMES) * 100;
    document.getElementById('record-progress').style.width = `${pct}%`;
}

async function submitData() {
    const btn = document.getElementById('btn-submit');
    const status = document.getElementById('upload-status');
    btn.disabled = true;
    status.classList.remove('d-none');
    status.innerText = "Processing & Uploading... This may take a moment.";

    const formData = new FormData();
    formData.append('session_id', crypto.randomUUID());
    formData.append('action', selectedAction);
    formData.append('video_raw', blobRaw, 'raw.webm');
    formData.append('video_overlay', blobOverlay, 'overlay.webm');
    
    // Convert Landmarks to JSON Blob
    const jsonBlob = new Blob([JSON.stringify(landmarkData)], {type: 'application/json'});
    formData.append('landmarks', jsonBlob, 'landmarks.json');

    // Metadata
    const metadata = {
        userAgent: navigator.userAgent,
        screenRes: `${window.screen.width}x${window.screen.height}`,
        videoRes: `${videoElement.videoWidth}x${videoElement.videoHeight}`,
        uploadTime: new Date().toISOString()
    };
    formData.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}), 'metadata.json');

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert("Upload Successful!");
            location.reload();
        } else {
            throw new Error(result.error || "Upload failed");
        }
    } catch (error) {
        status.className = 'alert alert-danger';
        status.innerText = `Error: ${error.message}. Please try again.`;
        btn.disabled = false;
    }
}

function resetRecording() {
    document.getElementById('screen-review').classList.add('d-none');
    document.getElementById('screen-record').classList.remove('d-none');
    document.getElementById('record-progress').style.width = '0%';
    btnStart.disabled = false;
}