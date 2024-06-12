const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageElement = document.getElementById('message');

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
    { x: 0, y: 300, width: 500, height: 150 },
    { x: 400, y: 220, width: 1000, height: 190 }
    /*
    { x: 300, y: 220, width: 100, height: 190 },
    { x: 450, y: 300, width: 100, height: 110 },
    { x: 600, y: 270, width: 30, height: 140 },
    { x: 750, y: 370, width: 100, height: 30 }
    */
];
let goal = { x: 780, y: 200, width: 20, height: 20 };
let gameRunning = false;

function drawPlayer() {
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function updatePlayer() {
    if (!gameRunning) return;

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
        showMessage("ゲームオーバー！");
        resetGame();
    }

    if (player.x < goal.x + goal.width &&
        player.x + player.width > goal.x &&
        player.y + player.height > goal.y &&
        player.y < goal.y + goal.height) {
        showMessage("ゴールしました！");
        resetGame();
    }

    if (player.x > goal.x + goal.width) {
        showMessage("ゲームオーバー！");
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

    if (this.volume > 0.1) {
        if (player.onGround) {
            player.dy = -player.jumpPower;
            player.onGround = false;
        }
    } else if (this.volume > 0.01 && this.volume <= 0.1) {
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