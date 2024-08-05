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
  const timerInput = document.getElementById("timer_input");
  const targetInput = document.getElementById("targetCorrect");
  const startButton = document.getElementById("start-button");
  const warningMessage = document.getElementById("warning");
  const initialScreen = document.getElementById("initial-screen");
  const playingScreen = document.getElementById("playing-screen");
  const wordDisplay = document.getElementById("wordDisplay");
  const timerDisplay = document.getElementById("timerDisplay");
  const textLog = document.getElementById("textLog");

  startButton.addEventListener("click", function() {
    const enteredTime = parseInt(timerInput.value);
    const enteredTarget = parseInt(targetInput.value);

    if (!isNaN(enteredTime) && enteredTime > 0 && !isNaN(enteredTarget) && enteredTarget > 0) {
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

    if (correctAnswers >= targetCorrect) {
      endGame();
    }
  });

  sr.addEventListener("end", function() {
    if (!gameIsOver) {
      sr.start();
    }
  });
});

function getRandomWord() {
  // words 配列の定義をここに移動
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