const canvas = document.getElementById('gameCanvas'); //キャンパスの初期化
const ctx = canvas.getContext('2d');
const messageElement = document.getElementById('message');
const volumeBar = document.getElementById('volume-bar');

const player = { 
    x: 0, 
    y: 0, 
    width: 20,
    height: 20,
    speed: 0.75,
    jumpPower: 14, //この値は変えないように（15だと画面をはみ出してしまう） 
    dy: 0,
    onGround: true 
};

const gravity = 0.5; 
const platforms = [
    { x: 0, y: 250, width: 100, height: 250 },
    { x: 220, y: 320, width: 100, height: 100 },
    { x: 400, y: 220, width: 100, height: 190 },
    { x: 550, y: 300, width: 100, height: 110 },
    { x: 700, y: 270, width: 100, height: 140 }
];
let goal = { x: 780, y: 250, width: 20, height: 20 };
let gameRunning = false;

// コインの位置とサイズ
let coins = [
    // 空中のコイン
    { x: 92, y: 140, radius: 8 }, //o
    { x: 150, y: 70, radius: 8 },
    { x: 360, y: 140, radius: 8 }, //o
    { x: 490, y: 110, radius: 8 }, //o
    { x: 640, y: 190, radius: 8 }, //o

    // 足場のコイン
    { x: 40, y: platforms[0].y - 8, radius: 8 }, //o
    { x: 260, y: platforms[1].y - 8, radius: 8 }, //o
    { x: 430, y: platforms[2].y - 8, radius: 8 }, //o 
    { x: 590, y: platforms[3].y - 8, radius: 8 }, //o
    { x: 710, y: platforms[4].y - 8, radius: 8 }
];

let startTime;
let volumeLog = [];
let audioContext = null;
let mediaStreamSource = null;
let meterNode = null; // meterNode を初期化
let volumeLoggingInterval = null;

let stableVolumeDuration = 0;
let lastStableVolumeTime = 0;

function drawPlayer() {
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

// コインを描画
function drawCoins() {
    coins.forEach(coin => {
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
        ctx.closePath();
    });
}

function updatePlayer() {
    if (!gameRunning) return;

    player.y += player.dy;

    if (!player.onGround) {
        player.dy += gravity; // 重力の影響を追加
    }

    let onAnyPlatform = false;
    platforms.forEach(platform => {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height <= platform.y + 10 &&
            player.y + player.height >= platform.y
        ) {
            player.y = platform.y - player.height;
            player.dy = 0;
            player.onGround = true;
            onAnyPlatform = true;
        }
    });

    if (!onAnyPlatform && player.y + player.height < canvas.height) {
        player.onGround = false;
    }

    //プレイヤーが画面の下に落ちたらゲームオーバー
    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
        player.dy = 0;
        showMessage("ゲームオーバー！");
        endGame(false); //ゲームオーバーの場合、結果画面にいかない
    }

    if (player.y + player.height < 0) {
        player.y = 0;
        player.dy = 0;
    }

    //ゴールに到達したらクリア
    if (
        player.x < goal.x + goal.width &&
        player.x + player.width > goal.x &&
        player.y + player.height > goal.y &&
        player.y < goal.y + goal.height
    ) {
        showMessage("ゴールしました！");
        endGame(true); //クリアした場合、結果画面にいく
    }

    //プレイヤーがゴールを通り過ぎたらゲームオーバー
    if (player.x > goal.x + goal.width) {
        showMessage("ゲームオーバー！");
        endGame(false); //ゲームオーバーの場合、結果画面にいかない
    }

    checkCoinCollision();  // コインとの衝突を確認
}

let collectedCoins = 0; // コインの取得数を記録する変数
const totalCoins = coins.length; // 総コイン数を記録

// コインとの衝突を確認
function checkCoinCollision() {
    coins = coins.filter(coin => {
        const distX = player.x + player.width / 2 - coin.x;
        const distY = player.y + player.height / 2 - coin.y;
        const distance = Math.sqrt(distX * distX + distY * distY);

        if (distance < coin.radius + player.width / 2) {
            console.log("コインを取得しました！");
            collectedCoins++; // コイン取得数を増加
            return false; // コインを削除
        }
        return true; // コインを保持
    });
}

function drawPlatforms() {
    ctx.fillStyle = 'black';
    platforms.forEach(platform => {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
}

function drawGoal() {
    ctx.fillStyle = 'red';
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
}

function resetGame() {
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
    meterNode = null;
    volumeLog = [];
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    drawPlatforms();
    drawGoal();
    drawCoins(); // コインを描画
    updatePlayer();
    requestAnimationFrame(gameLoop);
}

resetGame();
gameLoop();

function beginDetect() {
    startTime = performance.now();

    audioContext = new (window.AudioContext)();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            gameRunning = true;
            createAudioMeter(audioContext).then(node => {
                meterNode = node;
                meterNode.port.onmessage = (event) => {
                    const volume = event.data.volume;
                    console.log('Current volume:', volume);
                    volumeBar.style.width = `${(volume * 100).toFixed(1)}%`;

                    if (typeof volume === 'number' && !isNaN(volume)) {
                        volumeLog.push(Number(volume).toFixed(3));
                    }

                    if (volume > 0.1 && player.onGround) {
                        // ジャンプの高さは音量に基づいて計算し、最大14に制限
                        const jumpPowerBasedOnVolume = Math.min(player.jumpPower * volume * 10, 14);
                        player.dy = -jumpPowerBasedOnVolume;
                        player.onGround = false;
                        player.jumpStartTime = performance.now();
                        const jumpDuration = (performance.now() - player.jumpStartTime) / 1000;
                        player.x += player.speed * jumpDuration;
                    } else if (volume < 0.1 && volume >= 0.01) {
                        player.x += player.speed;
                    }         
                };
                mediaStreamSource.connect(meterNode);
                console.log("Game started");
                const timeElapsed = window.performance.now() - startTime;
                console.log("Time elapsed since start button pressed:", timeElapsed.toFixed(2), "ms");
                hideMessage();
            });
        });
    }
}

async function createAudioMeter(audioContext) {
    await audioContext.audioWorklet.addModule('volume-audio-processor.js');
    const meterNode = new AudioWorkletNode(audioContext, 'volume-audio-processor');
    return meterNode;
}

function endGame(isCleared) {
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

    if(isCleared){
        //クリアした場合、結果画面に遷移
        const elapsedTime = ((window.performance.now() - startTime) / 1000).toFixed(2);

        //結果画面に取得したコインの数と総コイン数を送信
        const resultURL = `performance5_result.html?elapsedTime=${elapsedTime}&collectedCoins=${collectedCoins}`;
        window.location.href = resultURL;
    }else{
        //ゲームオーバーの場合、プレイ画面にリロード
        window.location.reload();
    }
}

function showMessage(message) {
    messageElement.textContent = message;
    messageElement.style.display = 'block';
}

function hideMessage() {
    messageElement.style.display = 'none';
}