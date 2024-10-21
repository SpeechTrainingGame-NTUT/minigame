from flask import Flask, render_template, request, jsonify
import numpy as np
import struct
import librosa

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('pitch_play.html')

@app.route('/process_audio', methods=['POST'])
def process_audio():
    indata = request.data
    audio = struct.unpack(f"{len(indata) / 2:.0f}h", indata)
    audio = np.array(audio).astype(np.float64)

    # 基本周波数をYINアルゴリズムで計算
    fo = librosa.yin(audio, fmin=50, fmax=500, sr=44100)
    fo_mean = np.mean(fo) if len(fo) > 0 else 0

    return jsonify({'fo': fo_mean})

if __name__ == '__main__':
    app.run(debug=True)