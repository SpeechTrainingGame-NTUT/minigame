const canvas = document.getElementById('gameCanvas'); //キャンパスの初期化
const ctx = canvas.getContext('2d');
const messageElement = document.getElementById('message');

const player = { //プレイヤーの初期化
    x: 0, 
    y: 0, 
    width: 20,
    height: 20,
    speed: 5,
    jumpPower: 10,
    dy: 0, //垂直方向の速度
    onGround: true //地面にいるかどうか
};

const gravity = 0.5; 
const platforms = [
    { x: 0, y: 220, width: 1000, height: 1000 }
];
let goal = { x: 780, y: 200, width: 20, height: 20 };
let gameRunning = false;

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
        resetGame();
    }

    // ゴール判定
    if (player.x < goal.x + goal.width &&
        player.x + player.width > goal.x &&
        player.y + player.height > goal.y &&
        player.y < goal.y + goal.height) { 
        showMessage("ゴールしました！");
        resetGame();
    }

    // プレイヤーがゴールを超えたかどうかのチェック
    if (player.x > goal.x + goal.width) {
        showMessage("ゲームオーバー！");
        resetGame();
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
        mediaStreamSource = null;
        meter = null;
    }
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

var audioContext;
var mediaStreamSource;
var meter;

function beginDetect() { //マイク入力を取得
    if (audioContext) return;
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            meter = createAudioMeter(audioContext);
            mediaStreamSource.connect(meter);
            gameRunning = true;
            hideMessage();
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
    processor.averaging = averaging || 0.95;
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
    if (!gameRunning) return;
    
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

    output.innerHTML = 'ボリューム: ' + this.volume.toFixed(4);

    if (this.volume > 0.1) { //ボリュームが0.1を超えるとジャンプする
        if (player.onGround) {
            player.dy = -player.jumpPower;
            player.onGround = false;
        }
    } else if (this.volume > 0.01 && this.volume <= 0.1) { //ボリュームが0.01を超え、0.1以下の場合に進む
        player.x += player.speed;
    }
}

function showMessage(message) {
    messageElement.innerText = message;
    messageElement.style.display = 'block';
}

function hideMessage() {
    messageElement.style.display = 'none';
}

/* それぞれがランダムの形をしている足場をランダムに設置した場合
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const player = {
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    speed: 5,
    jumpPower: 10,
    dy: 0,
    onGround: true
};

const gravity = 0.5;

// 足場をランダムに生成
function generateRandomPlatforms() {
    const platforms = [];
    let x = 0;
    const platformBottom = 400;
    const numPlatforms = 6;

    for (let i = 0; i < numPlatforms; i++) {
        const width = Math.random() * 100 + 50;  // 50から150の幅
        const height = Math.random() * 80 + 20; // 20から100の高さ
        platforms.push({ x: x, y: platformBottom - height, width: width, height: height });
        x += width + Math.random() * 50 + 50; // 次の足場のx座標をランダムに設定
    }

    return platforms;
}

let platforms = generateRandomPlatforms();
let goal = { x: platforms[platforms.length - 1].x + 30, y: 350, width: 30, height: 30 }; //問題のコードはここ

function drawPlayer() {
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function updatePlayer() {
    player.y += player.dy;
    if (!player.onGround) {
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

    if (player.y + player.height > canvas.height) {
        alert("ゲームオーバー！");
        resetGame();
    }

    if (player.x < goal.x + goal.width &&
        player.x + player.width > goal.x &&
        player.y + player.height > goal.y &&
        player.y < goal.y + goal.height) {
        alert("ゴールしました！");
        resetGame();
    }
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
    platforms = generateRandomPlatforms();
    goal = { x: platforms[platforms.length - 1].x + 30, y: 350, width: 30, height: 30 };
    const firstPlatform = platforms[0];
    player.x = firstPlatform.x;
    player.y = firstPlatform.y - player.height;
    player.dy = 0;
    player.onGround = true;
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    drawPlatforms();
    drawGoal();
    updatePlayer();
    requestAnimationFrame(gameLoop);
}

resetGame();
gameLoop();

var audioContext;
var mediaStreamSource;
var meter;

function beginDetect() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            meter = createAudioMeter(audioContext);
            mediaStreamSource.connect(meter);
        });
    }
}

function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
    const processor = audioContext.createScriptProcessor(512);
    processor.onaudioprocess = volumeAudioProcess;
    processor.clipping = false;
    processor.lastClip = 0;
    processor.volume = 0;
    processor.clipLevel = clipLevel || 0.98;
    processor.averaging = averaging || 0.95;
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

function volumeAudioProcess(event) {
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

    output.innerHTML = 'ボリューム: ' + this.volume.toFixed(4);

    if (this.volume > 0.1) {
        if (player.onGround) {
            player.dy = -player.jumpPower;
            player.onGround = false;
        }
    } else if (this.volume > 0.01 && this.volume <= 0.1) {
        player.x += player.speed;
    }
}
*/

/*
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const player = {
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    speed: 5,
    jumpPower: 10,
    dy: 0,
    onGround: true
};

const gravity = 0.5;
const platforms = [
    { x: 0, y: 380, width: 100, height: 20 },
    { x: 150, y: 300, width: 100, height: 20 },
    { x: 300, y: 250, width: 100, height: 20 },
    { x: 450, y: 350, width: 100, height: 20 },
    { x: 600, y: 200, width: 100, height: 20 }
];
let goal = { x: 750, y: 160, width: 30, height: 40 };

function drawPlayer() {
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function updatePlayer() {
    player.y += player.dy;
    if (!player.onGround) {
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

    if (player.y + player.height > canvas.height) {
        alert("ゲームオーバー！");
        resetGame();
    }

    // ゴール判定
    if (player.x < goal.x + goal.width &&
        player.x + player.width > goal.x &&
        player.y + player.height > goal.y &&
        player.y < goal.y + goal.height) {
        alert("ゴールしました！");
        resetGame();
    }
}

function drawPlatforms() {
    ctx.fillStyle = 'green';
    platforms.forEach(platform => {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
}

function drawGoal() {
    ctx.fillStyle = 'red';
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
}

function resetGame() {
    // プレイヤーを最初の足場の上に配置
    const firstPlatform = platforms[0];
    player.x = firstPlatform.x;
    player.y = firstPlatform.y - player.height;
    player.dy = 0;
    player.onGround = true;
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    drawPlatforms();
    drawGoal();
    updatePlayer();
    requestAnimationFrame(gameLoop);
}

resetGame();
gameLoop();

var audioContext;
var mediaStreamSource;
var meter;

function beginDetect() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            meter = createAudioMeter(audioContext);
            mediaStreamSource.connect(meter);
        });
    }
}

function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
    const processor = audioContext.createScriptProcessor(512);
    processor.onaudioprocess = volumeAudioProcess;
    processor.clipping = false;
    processor.lastClip = 0;
    processor.volume = 0;
    processor.clipLevel = clipLevel || 0.98;
    processor.averaging = averaging || 0.95;
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

function volumeAudioProcess(event) {
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

    output.innerHTML = 'ボリューム: ' + this.volume.toFixed(4);

    if (this.volume > 0.1) {
        if (player.onGround) {
            player.dy = -player.jumpPower;
            player.onGround = false;
        }
    } else if (this.volume > 0.01 && this.volume <= 0.1) {
        player.x += player.speed;
    }
}
*/

/*
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const player = {
    x: 0, // 足場の上に配置されるため初期位置は0でOK
    y: 0,
    width: 20,
    height: 20,
    speed: 5,
    jumpPower: 10,
    dy: 0,
    onGround: true
};

const gravity = 0.5;
const platforms = [];
const numPlatforms = 5;
let goal = { x: 0, y: 0, width: 30, height: 40 };

function drawPlayer() {
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function updatePlayer() {
    player.y += player.dy;
    if (!player.onGround) {
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

    if (player.y + player.height > canvas.height) {
        alert("ゲームオーバー！");
        resetGame();
    }

    // ゴール判定
    if (player.x < goal.x + goal.width &&
        player.x + player.width > goal.x &&
        player.y + player.height > goal.y &&
        player.y < goal.y + goal.height) {
        alert("ゴールしました！");
        resetGame();
    }
}

function drawPlatforms() {
    ctx.fillStyle = 'green';
    platforms.forEach(platform => {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
}

function drawGoal() {
    ctx.fillStyle = 'red';
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
}

function resetGame() {
    generatePlatforms();
    // プレイヤーを最初の足場の上に配置
    const firstPlatform = platforms[0];
    player.x = firstPlatform.x;
    player.y = firstPlatform.y - player.height;
    player.dy = 0;
    player.onGround = true;
}

function generatePlatforms() {
    platforms.length = 0;
    let maxX = 0;
    for (let i = 0; i < numPlatforms; i++) {
        const width = Math.random() * 100 + 50;
        const x = Math.random() * (canvas.width - width);
        const y = Math.random() * (canvas.height - 150) + 150;
        platforms.push({ x, y, width, height: 10 });

        if (x + width > maxX) {
            maxX = x + width;
            goal.x = x + width / 2 - goal.width / 2;
            goal.y = y - goal.height;
        }
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    drawPlatforms();
    drawGoal();
    updatePlayer();
    requestAnimationFrame(gameLoop);
}

resetGame();
gameLoop();

var audioContext;
var mediaStreamSource;
var meter;

function beginDetect() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            meter = createAudioMeter(audioContext);
            mediaStreamSource.connect(meter);
        });
    }
}

function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
    const processor = audioContext.createScriptProcessor(512);
    processor.onaudioprocess = volumeAudioProcess;
    processor.clipping = false;
    processor.lastClip = 0;
    processor.volume = 0;
    processor.clipLevel = clipLevel || 0.98;
    processor.averaging = averaging || 0.95;
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

function volumeAudioProcess(event) {
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

    output.innerHTML = 'ボリューム: ' + this.volume.toFixed(4);

    if (this.volume > 0.1) {
        if (player.onGround) {
            player.dy = -player.jumpPower;
            player.onGround = false;
        }
    } else if (this.volume > 0.01 && this.volume <= 0.1) {
        player.x += player.speed;
    }
}
*/