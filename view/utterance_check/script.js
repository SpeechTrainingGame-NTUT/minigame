let timeLimit;
let targetCorrect = 0;
let correctAnswers = 0;
let mistakes = 0;
let correctWordsArray = [];
let mistakeWordsArray = [];
let currentWord;
let gameIsOver = false;

const sr = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
sr.interimResults = false;
sr.continuous = true;

document.addEventListener("DOMContentLoaded", function() {
    const timerInput = document.getElementById("timerInput");
    const targetInput = document.getElementById("targetInput");
    const startButton = document.getElementById("start-button");
    const warningMessage = document.getElementById("warning");
    const initialScreen = document.getElementById("initial-screen");
    const playingScreen = document.getElementById("playing-screen");
    const wordDisplay = document.getElementById("wordDisplay");
    const timerDisplay = document.getElementById("timerDisplay");
    const textLog = document.getElementById("textLog");

    startButton.addEventListener("click", function() {
        const enteredTarget = parseInt(targetInput.value);
        const enteredTime = parseInt(timerInput.value);
        const selectedTarget = document.querySelector('input[name="targetCorrect"]:checked');
        const selectedTime = document.querySelector('input[name="timer"]:checked');

        // チェックボックスが選択されている場合、入力フォームの値を確認
        if (selectedTarget || selectedTime) {
            // チェックボックスが選択されている場合、両方とも負の数であればエラー
            if (enteredTarget < 0 && enteredTime < 0) {
                warningMessage.classList.remove('hidden'); // 設定値が不正ですを表示
                return;
            }

            // チェックボックスが選択されている場合、正の数が入力されているとエラー
            if (enteredTarget > 0 || enteredTime > 0) {
                warningMessage.classList.remove('hidden'); // 設定値が不正ですを表示
                return;
            }

            // 選択されたチェックボックスの値を取得
            targetCorrect = selectedTarget ? parseInt(selectedTarget.value) : 0; // 選択された目標数を設定
            timeLimit = selectedTime ? parseInt(selectedTime.value) : 0; // 選択された時間を設定

            // ゲームを開始
            initialScreen.classList.add('hidden');
            playingScreen.classList.remove('hidden');
            startGame();
            return;
        }

        // チェックボックスが選択されていない場合、入力値が正しい場合にゲームを開始
        if (enteredTarget > 0 && enteredTime > 0) {
            timeLimit = enteredTime;
            targetCorrect = enteredTarget;
            initialScreen.classList.add('hidden');
            playingScreen.classList.remove('hidden');
            startGame();
        } else {
            warningMessage.classList.remove('hidden'); // 入力値が不正ですを表示
        }
    });

    function startGame() {
        currentWord = getRandomWord();
        wordDisplay.textContent = currentWord;
        correctAnswers = 0;
        mistakes = 0;
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

    sr.addEventListener("result", function(e) {
        const lastResult = e.results[e.results.length - 1][0].transcript.trim();
        const normalizedLastResult = hiraganaToKanji(lastResult);
        const normalizedCurrentWord = hiraganaToKanji(currentWord);

        textLog.innerHTML = "<div>" + normalizedLastResult + (normalizedLastResult === normalizedCurrentWord ? " 正解！！！" : " 残念！！！") + "</div>";

        if (normalizedLastResult === normalizedCurrentWord) {
            correctAnswers++;
            correctWordsArray.push(currentWord);
        } else {
            mistakes++;
            mistakeWordsArray.push(lastResult + "(" + currentWord + ")");
        }

        currentWord = getRandomWord();
        wordDisplay.textContent = currentWord;

        // 目標の正解数を満たした場合でも、制限時間が残っている場合はプレイを続ける
        if (correctAnswers >= targetCorrect) {
            // ここでは何もせず、プレイを続ける
        }
    });

    sr.addEventListener("end", function() {
        if (!gameIsOver) {
            sr.start();
        }
    });

    // チェックボックスの選択を制御
    const targetCheckboxes = document.querySelectorAll('input[name="targetCorrect"]');
    const timerCheckboxes = document.querySelectorAll('input[name="timer"]');

    targetCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            targetCheckboxes.forEach(cb => {
                if (cb !== this) cb.checked = false; // 他のチェックボックスをオフにする
            });
            targetInput.value = ""; // チェックボックスが選択されたときに入力フォームをクリア
            targetInput.readOnly = false; // チェックボックスが選択されているときは入力可能
        });
    });

    timerCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            timerCheckboxes.forEach(cb => {
                if (cb !== this) cb.checked = false; // 他のチェックボックスをオフにする
            });
            timerInput.value = ""; // チェックボックスが選択されたときに入力フォームをクリア
            timerInput.readOnly = false; // チェックボックスが選択されているときは入力可能
        });
    });
});

function getRandomWord() {
    const words = [
        "かき氷", "金魚", "曇り", "音", "風", "耳", "夏", "うちわ", "茶碗", "季節",
        // ... 他の単語も同様に追加
    ];
    return words[Math.floor(Math.random() * words.length)];
}

function hiraganaToKanji(text) {
    const hiraganaToKanjiMap = {
        'かきごおり': 'かき氷',
        'くもり': '曇り',
        '重いで': '思い出'
        // 他のマッピングも追加
    };
    return hiraganaToKanjiMap[text] || text;
}

function endGame() {
    gameIsOver = true;
    sr.stop();
    const url = `A_play_end.html?correct=${correctAnswers}&mistakes=${mistakes}&correctWords=${correctWordsArray.join("，")}&mistakeWords=${mistakeWordsArray.join("，")}&targetCorrect=${targetCorrect}`;
    window.location.href = url;
}