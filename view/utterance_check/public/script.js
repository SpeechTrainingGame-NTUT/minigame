// APIエンドポイントとキー（gooラボのAPIキーが必要）
const API_URL = 'https://labs.goo.ne.jp/api/hiragana';
const API_KEY = '7dd726c3e3bd92948d538e80c0773656d7b89328b3eb400a11e893efe91f7a12';

// 音声認識設定
let timeLimit;
let targetCorrect = 0;
let correctAnswers = 0;
let mistakes = 0;
let correctWordsArray = [];
let mistakeWordsArray = [];
let unclearWordsArray = [];
let currentWord;
let gameIsOver = false;
let isRecognitionActive = false; // 音声認識がアクティブかどうかを示すフラグ

// 音声認識の初期化
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'ja-JP';
recognition.interimResults = false; // 確定結果のみ表示

document.addEventListener("DOMContentLoaded", function () {
    const timerInput = document.getElementById("timerInput");
    const targetInput = document.getElementById("targetInput");
    const warningMessage = document.getElementById("warning");
    const initialScreen = document.getElementById("initial-screen");
    const playingScreen = document.getElementById("playing-screen");
    const wordDisplay = document.getElementById("wordDisplay");
    const timerDisplay = document.getElementById("timerDisplay");
    const textLog = document.getElementById("textLog");
    const resultElement = document.getElementById("result");
    const phonemeElement = document.getElementById("phoneme");

    const startButton = document.getElementById('start-button');

    if (startButton) {
        startButton.addEventListener('click', function () {
            const enteredTarget = parseInt(targetInput.value);
            const enteredTime = parseInt(timerInput.value);
            const selectedTarget = document.querySelector('input[name="targetCorrect"]:checked');
            const selectedTime = document.querySelector('input[name="timer"]:checked');

            if (selectedTarget || selectedTime) {
                targetCorrect = selectedTarget ? parseInt(selectedTarget.value) : 0;
                timeLimit = selectedTime ? parseInt(selectedTime.value) : 0;

                initialScreen.classList.add('hidden');
                playingScreen.classList.remove('hidden');
                startGame();
            } else if (enteredTarget > 0 && enteredTime > 0) {
                timeLimit = enteredTime;
                targetCorrect = enteredTarget;
                initialScreen.classList.add('hidden');
                playingScreen.classList.remove('hidden');
                startGame();
            } else {
                warningMessage.classList.remove('hidden');
            }
        });
    } else {
        console.error('startButton not found');
    }

    function startGame() {
        currentWord = getRandomWord();
        wordDisplay.textContent = currentWord;
        correctAnswers = 0;
        mistakes = 0;
        unclearWordsArray = []; // 初期化
        timerDisplay.textContent = "Time: " + timeLimit;
        startRecognition(); // 音声認識を開始
        timer();
    }

    function startRecognition() {
        if (!isRecognitionActive) {
            recognition.start();
            isRecognitionActive = true;
        }
    }

    recognition.addEventListener('result', (event) => {
        const transcript = event.results[0][0].transcript;

        // サーバーにリクエストを送信して、ひらがなと音素に変換
        fetch('/hiragana', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: transcript })
        })
        .then(response => response.json())
        .then(data => {
            resultElement.textContent = `ひらがな変換結果: ${data.converted}`;
            phonemeElement.textContent = `音素: /${data.phonemes}/`;

            // 判定処理
            if (data.converted === wordDisplay.textContent) {
                resultElement.textContent += " 正解！";
                correctAnswers++;
                correctWordsArray.push(wordDisplay.textContent);
            } else {
                resultElement.textContent += " 残念！";
                mistakes++;
                mistakeWordsArray.push(transcript + "(" + wordDisplay.textContent + ")");
            }

            // 次の単語に進む
            currentWord = getRandomWord();
            wordDisplay.textContent = currentWord;
            
            // 音声認識結果をクリア
            textLog.textContent = '';
            phonemeElement.textContent = '';
            
            isRecognitionActive = false; // 音声認識が終了したことを示す
        })
        .catch(error => {
            resultElement.textContent = `エラー: ${error}`;
        });
    });

    recognition.addEventListener('end', () => {
        isRecognitionActive = false; // 音声認識が終了したことを示す
        if (!gameIsOver) {
            startRecognition(); // ゲームが終了していない場合は再開
        }
    });

    recognition.addEventListener('error', (event) => {
        resultElement.textContent = `エラー: ${event.error}`;
        isRecognitionActive = false; // エラーが発生した場合も音声認識を停止
    });

    function timer() {
        if (timeLimit > 0) {
            timeLimit--;
            timerDisplay.textContent = "Time: " + timeLimit;
            setTimeout(timer, 1000);
        } else {
            endGame();
        }
    }

    function getRandomWord() {
        const words = [
            "かきごおり", "きんぎょ", "はれ", "おと", "かぜ", "みみ", "なつ", "うちわ", "ちゃわん", "きせつ",
            "きもの", "みどり", "ちず", "ぼうけん", "ぶんか", "ゆうやけ", "へいわ", "しぜん", "まほう", "りそう",
            "つくえ", "でんわ", "かぞく", "ほしぞら", "さくら", "やま", "ほん", "そら", "ゆめ", "えがお",
            "おもいで", "つき", "ひこうき", "えいが", "せかい", "かんじょう", "れすとらん", "りょこう", "ちへいせん", "かなしみ",
            "いつわり", "まつり", "にちじょう", "うんめい", "かたち", "きぼう", "まさちゅーせっつしゅう", "しゅんかん", "ぎゃっきょう"
        ];
        return words[Math.floor(Math.random() * words.length)];
    }

    function endGame() {
        gameIsOver = true;
        recognition.stop(); // 音声認識を停止
        window.location.href = `A_play_end.html?correct=${correctAnswers}&mistakes=${mistakes}&correctWords=${correctWordsArray.join("，")}&mistakeWords=${mistakeWordsArray.join("，")}&targetCorrect=${targetCorrect}&unclearWords=${encodeURIComponent(unclearWordsArray.join(','))}`;
    }
});