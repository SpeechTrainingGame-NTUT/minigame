import asyncio
import websockets
import numpy as np
import pyworld
import math
import json

async def process_audio(websocket, _):
    buffer = bytearray()  # バッファを初期化
    async for message in websocket:
        buffer.extend(message)  # 受信したデータをバッファに追加

        # バッファのサイズが2の倍数であることを確認
        if len(buffer) % 2 == 0:
            indata = np.frombuffer(buffer, dtype=np.int16)
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

            # 結果をJSON形式でクライアントに送信
            result = json.dumps({"power": power, "frequency": fo})
            await websocket.send(result)

            buffer.clear()  # バッファをクリア

start_server = websockets.serve(process_audio, "localhost", 5500)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()