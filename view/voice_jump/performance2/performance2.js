const canvas = document.getElementById('gameCanvas'); //キャンパスの初期化
const ctx = canvas.getContext('2d');
const messageElement = document.getElementById('message');
const volumeBar = document.getElementById('volume-bar');

const player = { //プレイヤーの初期化
    x: 0, 
    y: 0, 
    width: 20,
    height: 20,
    speed: 3,
    jumpPower: 10,
    dy: 0, //垂直方向の速度
    onGround: true //地面にいるかどうか
};

const gravity = 0.5; 
const platforms = [
    { x: 0, y: 220, width: 400, height: 200 },
    { x: 400, y: 160, width: 400, height: 500 }
];
let goal = { x: 780, y: 140, width: 20, height: 20 };
let gameRunning = false;

let jumpCount = 0;
let moveCount = 0;
let startTime;
let volumeLog = [];

let audioContext; // オーディオコンテキスト
let mediaStreamSource; // メディアストリームソース
let meter; // オーディオメーター
let volumeLoggingInterval = null; // ボリュームログのインターバル

function drawPlayer() { //プレイヤーをキャンバスに描画
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function updatePlayer() { //プレイヤーの位置を更新し、重力を適用
    if (!gameRunning) return;

    player.y += player.dy;
    if (!player.onGround) { //プレイヤーがプラットフォームに接触したかどうかをチェックし、接触していればプレイヤーの位置を調整
        player.dy += gravity;
    }

    let onAnyPlatform = false;

    platforms.forEach(platform => {
        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height <= platform.y + 10 &&
            player.y + player.height >= platform.y) {
            player.y = platform.y - player.height;
            player.dy = 0;
            player.onGround = true;
            onAnyPlatform = true;
        }
    });

    if (!onAnyPlatform && player.y + player.height < canvas.height) {
        player.onGround = false;
    }

    if (player.y + player.height > canvas.height) { //プレイヤーが足場から落ちたらゲームオーバー
        showMessage("ゲームオーバー！");
        endGame();
    }

    // ゴール判定
    if (player.x < goal.x + goal.width &&
        player.x + player.width > goal.x &&
        player.y + player.height > goal.y &&
        player.y < goal.y + goal.height) { 
        showMessage("ゴールしました！");
        endGame();
    }

    // プレイヤーがゴールを超えたかどうかのチェック
    if (player.x > goal.x + goal.width) {
        showMessage("ゲームオーバー！");
        endGame();
    }
}

function drawPlatforms() { //プラットフォームの描画
    ctx.fillStyle = 'black';
    platforms.forEach(platform => {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
}

function drawGoal() { //ゴールの描画
    ctx.fillStyle = 'red';
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
}

function resetGame() { // プレイヤーを最初の足場の上に配置し、初期状態に戻す
    const firstPlatform = platforms[0];
    player.x = firstPlatform.x;
    player.y = firstPlatform.y - player.height;
    player.dy = 0;
    player.onGround = true;
    gameRunning = false;
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if(volumeLoggingInterval){
        clearInterval(volumeLoggingInterval);
        volumeLoggingInterval = null;
    }
    mediaStreamSource = null;
    meter = null;
    jumpCount = 0;
    moveCount = 0;
    volumeLog = [];
}

function gameLoop() { //キャンパスを消して、プレイヤーの描画と更新を繰り返す
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    drawPlatforms();
    drawGoal();
    updatePlayer();
    requestAnimationFrame(gameLoop); //ループが続く
}

resetGame();
gameLoop();

function beginDetect() { //マイク入力を取得
    if (audioContext) return;

    startTime = performance.now(); // 開始時間を記録

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            meter = createAudioMeter(audioContext);
            mediaStreamSource.connect(meter);
            gameRunning = true;
            hideMessage();

            volumeLoggingInterval = setInterval(() => {
                const volume = meter.volume.toFixed(5);
                console.log("Current volume:", volume);
                volumeLog.push(parseFloat(volume)); // ボリューム値を記録
                volumeDisplayCount++;
                console.log("Volume display count:", volumeDisplayCount);
            }, 50);
        });
    }
}

function createAudioMeter(audioContext, clipLevel, averaging, clipLag) { //ボリュームを測るためのものを作成
    const processor = audioContext.createScriptProcessor(512);
    processor.onaudioprocess = volumeAudioProcess;
    processor.clipping = false;
    processor.lastClip = 0;
    processor.volume = 0;
    processor.clipLevel = clipLevel || 0.98;
    processor.averaging = averaging || 0.50;
    processor.clipLag = clipLag || 750;
    processor.connect(audioContext.destination);

    processor.checkClipping = function () {
        if (!this.clipping) return false;
        if ((this.lastClip + this.clipLag) < window.performance.now()) {
            this.clipping = false;
        }
        return this.clipping;
    };

    processor.shutdown = function () {
        this.disconnect();
        this.onaudioprocess = null;
    };

    return processor;
}

function volumeAudioProcess(event) { //マイク入力のボリュームを処理し、音量がしきい値（声の認識が始まる声の大きさ）を超えた場合にプレイヤーがジャンプしたり、前進したりできる
    if(!gameRunning) return;
    
    const buf = event.inputBuffer.getChannelData(0);
    const bufLength = buf.length;
    let sum = 0;
    let x;

    for (var i = 0; i < bufLength; i++) {
        x = buf[i];
        if (Math.abs(x) >= this.clipLevel) {
            this.clipping = true;
            this.lastClip = window.performance.now();
        }
        sum += x * x;
    }
    const rms = Math.sqrt(sum / bufLength);
    this.volume = Math.max(rms, this.volume * this.averaging);

    // 更新されたボリュームバーの幅を計算して設定
    volumeBar.style.width = (this.volume * 100) + '%';

    if (this.volume >= 0.1 && player.onGround) { //ボリュームが0.1を超えるとジャンプする
        player.dy = -player.jumpPower;
        player.onGround = false;
        console.log("Jump triggered at volume:", this.volume.toFixed(5));
    } else if (this.volume > 0.01 && this.volume <= 0.1) { //ボリュームが0.01を超え、0.1以下の場合に進む
        player.x += player.speed;
        console.log("Move forward at volume:", this.volume.toFixed(5));
    }
}

function endGame() {
    gameRunning = false;

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if (volumeLoggingInterval) {
        clearInterval(volumeLoggingInterval);
        volumeLoggingInterval = null;
    }

    const elapsedTime = (performance.now() - startTime) / 1000; // ゲームプレイ時間を記録
    const avgVolume = volumeLog.reduce((sum, volume) => sum + volume, 0) / volumeLog.length; // 平均音量を計算
    console.log("Game ended. Jump count:", jumpCount, "Move count:", moveCount, "Elapsed time:", elapsedTime, "Average volume:", avgVolume.toFixed(5));

    // 結果をクエリパラメータとしてエンコードして遷移
    const queryParams = new URLSearchParams({
        jumpCount: jumpCount,
        moveCount: moveCount,
        elapsedTime: elapsedTime.toFixed(2),
        avgVolume: avgVolume.toFixed(5),
        volumeData: volumeLog.join(',')
    });

    window.location.href = 'performance2_result.html?' + queryParams.toString();
}

function showMessage(message) {
    messageElement.innerText = message;
    messageElement.style.display = 'block';
}

function hideMessage() {
    messageElement.style.display = 'none';
}

document.getElementById('startButton').addEventListener('click', () => {
    resetGame();
    beginDetect();
});

// JavaScriptでトップ画面へ遷移する処理を追加
document.getElementById('topButton').addEventListener('click', function() {
    window.location.href = '../../../index.html'; // 適切なパスに変更してください
});