import axois from 'axios';

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
let unclearWordsArray = []; // 不明瞭な単語用の配列
let currentWord;
let gameIsOver = false;

const sr = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
sr.interimResults = false;
sr.continuous = true;

document.addEventListener("DOMContentLoaded", function () {
    const timerInput = document.getElementById("timerInput");
    const targetInput = document.getElementById("targetInput");
    const startButton = document.getElementById("start-button");
    const warningMessage = document.getElementById("warning");
    const initialScreen = document.getElementById("initial-screen");
    const playingScreen = document.getElementById("playing-screen");
    const wordDisplay = document.getElementById("wordDisplay");
    const timerDisplay = document.getElementById("timerDisplay");
    const textLog = document.getElementById("textLog");

    startButton.addEventListener("click", function () {
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

    function startGame() {
        currentWord = getRandomWord();
        wordDisplay.textContent = currentWord;
        correctAnswers = 0;
        mistakes = 0;
        unclearWordsArray = []; // 初期化
        timerDisplay.textContent = "Time: " + timeLimit;
        sr.start();
        timer();
    }

    function timer() {
        if (timeLimit > 0) {
            timeLimit--;
            timerDisplay.textContent = "Time: " + timeLimit;
            setTimeout(timer, 1000);
        } else {
            endGame();
        }
    }

    sr.addEventListener("result", async function (e) {
        const lastResult = e.results[e.results.length - 1][0].transcript.trim();

        try {
            // ひらがな化APIを使用して変換
            const hiraganaResult = await convertToHiragana(lastResult);
            console.log('Hiragana result:', hiraganaResult); // レスポンス全体をログに表示
            const normalizedLastResult = hiraganaResult.converted; // APIの結果を使用
            const normalizedCurrentWord = currentWord; // 現在の単語もそのまま保持

            textLog.innerHTML = "<div>" + normalizedLastResult + (normalizedLastResult === normalizedCurrentWord ? " 正解！！！" : " 残念！！！") + "</div>";

            if (normalizedLastResult === normalizedCurrentWord) {
                correctAnswers++;
                correctWordsArray.push(currentWord);
            } else {
                mistakes++;
                mistakeWordsArray.push(lastResult + "(" + currentWord + ")");
                if (lastResult === "") {
                    unclearWordsArray.push(currentWord); // 空の場合は不明瞭単語として記録
                }
            }

            currentWord = getRandomWord();
            wordDisplay.textContent = currentWord;

        } catch (error) {
            console.error('ひらがな化APIエラー:', error);
        }
    });

    sr.addEventListener("end", function () {
        if (!gameIsOver) {
            sr.start();
        }
    });
});

// ひらがな化APIを呼び出す関数
async function convertToHiragana(text) {
    const response = await axios.post(API_URL, {
        app_id: API_KEY,
        sentence: text,
        output_type: 'hiragana'
    });
    return response.data;
}

function getRandomWord() {
    const words = [
        "かき氷", "金魚", "晴れ", "音", "風", "耳", "夏", "うちわ", "茶碗", "季節",
        "着物", "緑", "地図", "冒険", "文化", "夕焼け", "平和", "自然", "魔法", "理想",
        "机", "電話", "家族", "星空", "桜", "山", "本", "空", "夢", "笑顔",
        "思い出", "月", "飛行機", "映画", "世界", "感情", "レストラン", "旅行", "地平線", "悲しみ",
        "偽り", "祭り", "日常", "運命", "形", "希望", "マサチューセッツ州", "瞬間", "逆境"
    ];
    return words[Math.floor(Math.random() * words.length)];
}

function endGame() {
    gameIsOver = true;
    sr.stop();
    window.location.href = `A_play_end.html?correct=${correctAnswers}&mistakes=${mistakes}&correctWords=${correctWordsArray.join("，")}&mistakeWords=${mistakeWordsArray.join("，")}&targetCorrect=${targetCorrect}&unclearWords=${encodeURIComponent(unclearWordsArray.join(','))}`;
}