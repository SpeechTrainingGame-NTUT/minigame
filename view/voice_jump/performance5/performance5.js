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

// 各コインの色とポイントの定義
let coinData = [
    { x: 260, y: platforms[1].y - 8, radius: 8, color: 'red', points: 30 },
    { x: 708, y: platforms[4].y - 8, radius: 8, color: 'red', points: 30 },

    { x: 150, y: 70, radius: 8, color: 'blue', points: 20 },
    { x: 360, y: 140, radius: 8, color: 'blue', points: 20 },


    { x: 92, y: 140, radius: 8, color: 'yellow', points: 10 },
    { x: 490, y: 110, radius: 8, color: 'yellow', points: 10 },
    { x: 430, y: platforms[2].y - 8, radius: 8, color: 'yellow', points: 10 },
    { x: 590, y: platforms[3].y - 8, radius: 8, color: 'yellow', points: 10 },
    { x: 650, y: 190, radius: 8, color: 'yellow', points: 10 },
    { x: 745, y: 200, radius: 8, color: 'yellow', points: 10 }
];

let startTime;
let volumeLog = [];
let audioContext = null;
let mediaStreamSource = null;
let meterNode = null; // meterNode を初期化
let volumeLoggingInterval = null;
let coinScore = 0; // グローバルに移動

function drawPlayer() {
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

// コインを描画
function drawCoins() {
    coinData.forEach(coin => {
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
        ctx.fillStyle = coin.color;
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
        endGame(true); //クリアした場合、結果画面にいく
    }

    //プレイヤーがゴールを通り過ぎたらゲームオーバー
    if (player.x > goal.x + goal.width) {
        endGame(false); //ゲームオーバーの場合、結果画面にいかない
    }

    checkCoinCollision();  // コインとの衝突を確認
}

let collectedCoins = { red: 0, blue: 0, yellow: 0 }; // 各色のコインのカウント

function checkCoinCollision() {
    coinData = coinData.filter(coin => {
        const distX = player.x + player.width / 2 - coin.x;
        const distY = player.y + player.height / 2 - coin.y;
        const distance = Math.sqrt(distX * distX + distY * distY);

        if (distance < coin.radius + player.width / 2) {
            coinScore += coin.points; // コインのポイントを加算
            // 獲得したコインの色に応じてカウントを増やす
            if (coin.color === 'red') collectedCoins.red++;
            if (coin.color === 'blue') collectedCoins.blue++;
            if (coin.color === 'yellow') collectedCoins.yellow++;
            return false; // 取得したコインを配列から削除
        }
        return true;
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

    audioContext.audioWorklet.addModule('volume-processor.js')
        .then(() => {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
                    mediaStreamSource = audioContext.createMediaStreamSource(stream);
                    gameRunning = true;
                    createAudioMeter(audioContext).then(meterNode => {  // scriptNode -> meterNode に変更
                        meterNode.port.onmessage = (event) => {
                            const volume = event.data.volume;
                            console.log('Current PEAK volume:', volume);
                            volumeBar.style.width = `${(volume * 100).toFixed(1)}%`;

                            if (typeof volume === 'number' && !isNaN(volume)) {
                                volumeLog.push(Number(volume).toFixed(3));
                            }

                            // キャラクターの動きを定義する部分
                            if (volume > 0.1 && player.onGround) {
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
                    });
                });
            } else {
                alert("マイクの取得に失敗しました。");
            }
        })
        .catch((error) => {
            console.error('AudioWorklet module could not be loaded:', error);
        });
}

function createAudioMeter(audioContext) {
    return new Promise((resolve) => {
        const meterNode = new AudioWorkletNode(audioContext, 'volume-processor');
        mediaStreamSource.connect(meterNode);
        meterNode.connect(audioContext.destination);
        resolve(meterNode);  // scriptNode -> meterNode に変更
    });
}

function endGame(isCleared) {
    gameRunning = false;
    if (isCleared) {
        //クリアした場合、結果画面に遷移
        const elapsedTime = ((window.performance.now() - startTime) / 1000).toFixed(2);

        //結果画面に取得したコインの数と総コイン数を送信
        const resultURL = `performance5_result.html?elapsedTime=${elapsedTime}&coinScore=${coinScore}&redCoins=${collectedCoins.red}&blueCoins=${collectedCoins.blue}&yellowCoins=${collectedCoins.yellow}`;
        window.location.href = resultURL;
    } else {
        //ゲームオーバーの場合、プレイ画面にリロード
        window.location.reload();
    }
}

function showMessage(msg) {
    messageElement.innerText = msg;
}

function showMessage(message) {
    messageElement.textContent = message;
    messageElement.style.display = 'block';
}

function hideMessage() {
    messageElement.style.display = 'none';
}