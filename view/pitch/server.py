import asyncio
import websockets
import numpy as np
import pyworld
import struct
import math

async def process_audio(websocket, path):
    async for message in websocket:
        # 音声データを処理
        indata = np.frombuffer(message, dtype=np.int16)
        audio = indata.astype(np.float64)

        # 音声のパワーを計算
        rms = math.sqrt(np.square(audio).mean())
        power = 20 * math.log10(rms) if rms > 0.0 else -math.inf

        # 基本周波数を計算
        fo, _ = pyworld.dio(audio, 16000)  # サンプルレートは16kHzと仮定
        nonzero_ind = np.nonzero(fo.astype(int))[0]
        fo = fo[nonzero_ind]
        if len(fo) > 0:
            fo = fo.mean()
        else:
            fo = 0.0

        # 結果をクライアントに送信
        await websocket.send(f"音声パワー: {power:.1f} [dB], 基本周波数: {fo:.1f} [Hz]")

start_server = websockets.serve(process_audio, "localhost", 8000)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()