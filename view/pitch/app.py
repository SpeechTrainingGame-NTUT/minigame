from flask import Flask, request, jsonify, send_from_directory
import numpy as np
import librosa
import os

app = Flask(__name__)

@app.route('/')
def index():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'pitch_play.html')

@app.route('/process_audio', methods=['POST'])
def process_audio():
    audio_data = request.files['audio'].read()
    audio = np.frombuffer(audio_data, dtype=np.int16).astype(np.float64)
    fo = librosa.yin(audio, fmin=50, fmax=500, sr=44100)
    fo_mean = np.mean(fo) if len(fo) > 0 else 0
    return jsonify({'frequency': fo_mean})

if __name__ == '__main__':
    app.run(debug=True)