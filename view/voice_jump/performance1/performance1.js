// 変数の宣言を上部に移動
const canvas = document.getElementById('gameCanvas'); // キャンバスの初期化
const ctx = canvas.getContext('2d');
const messageElement = document.getElementById('message');
const volumeBar = document.getElementById('volume-bar');

const player = { // プレイヤーの初期化
    x: 0, 
    y: 0, 
    width: 20,
    height: 20,
    speed: 3,
    jumpPower: 10,
    dy: 0, // 垂直方向の速度
    onGround: true // 地面にいるかどうか
};

const gravity = 0.5; 
const platforms = [
    { x: 0, y: 220, width: 1000, height: 1000 }
];
let goal = { x: 780, y: 200, width: 20, height: 20 };
let gameRunning = false;

let startTime;
let volumeLog = [];

let audioContext = null; // オーディオコンテキスト
let mediaStreamSource = null; // メディアストリームソース
let meter = null; // オーディオメーター
let volumeLoggingInterval = null; // ボリュームログのインターバル

function drawPlayer() { // プレイヤーをキャンバスに描画
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function updatePlayer() { // プレイヤーの位置を更新し、重力を適用
    //if (!gameRunning) return;

    player.y += player.dy;
    if (!player.onGround) { // プレイヤーがプラットフォームに接触したかどうかをチェックし、接触していればプレイヤーの位置を調整
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

    if (player.y + player.height > canvas.height) { // プレイヤーが足場から落ちたらゲームオーバー
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

function drawPlatforms() { // プラットフォームの描画
    ctx.fillStyle = 'black';
    platforms.forEach(platform => {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
}

function drawGoal() { // ゴールの描画
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
    if (volumeLoggingInterval) {
        clearInterval(volumeLoggingInterval);
        volumeLoggingInterval = null;
    }
    mediaStreamSource = null;
    meter = null;
    volumeLog = [];
}

function gameLoop() { // キャンバスを消して、プレイヤーの描画と更新を繰り返す
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    drawPlatforms();
    drawGoal();
    updatePlayer();
    requestAnimationFrame(gameLoop); // ループが続く
}

resetGame();
gameLoop();

function beginDetect() {
    //if (audioContext) return;

    startTime = performance.now(); // 開始時間を記録

    audioContext = new (window.AudioContext);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            createAudioMeter(audioContext).then(meter => {
                meter.connect(audioContext.destination);
                mediaStreamSource.connect(meter);
                gameRunning = true;
                console.log("Game started"); // ゲーム開始をコンソールに表示
                const timeElapsed = window.performance.now() - startTime;
                console.log("Time elapsed since start button pressed:", timeElapsed.toFixed(2), "ms"); // 経過時間を表示

                hideMessage();                
            });      
        });
    }
}

function createAudioMeter(audioContext, clipLevel, averaging, clipLag) { // ボリュームを測るためのものを作成
    const processor = audioContext.createScriptProcessor(512);
    processor.onaudioprocess = VolumeAudioProcessor;
    processor.clipping = false;
    processor.lastClip = 0;
    processor.volume = 0;
    processor.clipLevel = clipLevel || 0.98;
    processor.averaging = averaging || 0.95;
    processor.clipLag = clipLag || 750;
    processor.connect(audioContext.destination);

    /*
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
    */

    return processor;
}

// AudioWorkLetNodeを作成する関数
async function createAudioMeter(audioContext) {
    await audioContext.audioWorklet.addModule('volume-audio-processor.js');
    const meterNode = new AudioWorkletNode(audioContext, 'volume-audio-processor');
    return meterNode;
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
    console.log("Game ended");

    // 結果画面に遷移
    const elapsedTime = ((window.performance.now() - startTime) / 1000).toFixed(2);
    const volumeDataString = volumeLog.join(',');
    const resultURL = `performance1_result.html?elapsedTime=${elapsedTime}&volumeData=${volumeDataString}`;
    window.location.href = resultURL;
}

function showMessage(message) {
    messageElement.textContent = message;
    messageElement.style.display = 'block';
}

function hideMessage() {
    messageElement.style.display = 'none';
}