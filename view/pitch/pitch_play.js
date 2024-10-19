const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const statusText = document.getElementById('status');
const outputText = document.getElementById('output');

let mediaRecorder;
let socket;

startButton.onclick = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    socket = new WebSocket('ws://localhost:5500');

    socket.onopen = () => {
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                socket.send(event.data);
            }
        };

        socket.onmessage = (event) => {
            console.log("Received message from server:", event.data);  // サーバーからのメッセージをログに出力
            const data = JSON.parse(event.data);
            outputText.textContent = `音声パワー: ${data.power} [dB], 基本周波数: ${data.frequency} [Hz]`;
        };

        mediaRecorder.start(50); 
        statusText.textContent = 'ステータス: 録音中';
    };
};

stopButton.onclick = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
}
    statusText.textContent = 'ステータス: 停止中';
};