const express = require('express');
const axios = require('axios');
const app = express();
const path = require('path');

// APIキーの設定 (ひらがな化API)
const API_KEY = '7dd726c3e3bd92948d538e80c0773656d7b89328b3eb400a11e893efe91f7a12';  // ここにAPIキーを記載してください

// JSONリクエストのためのミドルウェア
app.use(express.json());

// 静的ファイルの配信 (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// ひらがな→音素変換関数
const hiraganaToPhonemes = (hiraganaText) => {
    const phonemeMap = {
        'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
        'か': 'k a', 'き': 'k i', 'く': 'k u', 'け': 'k e', 'こ': 'k o',
        'さ': 's a', 'し': 's i', 'す': 's u', 'せ': 's e', 'そ': 's o',
        'た': 't a', 'ち': 't i', 'つ': 't u', 'て': 't e', 'と': 't o',
        'な': 'n a', 'に': 'n i', 'ぬ': 'n u', 'ね': 'n e', 'の': 'n o',
        'は': 'h a', 'ひ': 'h i', 'ふ': 'h u', 'へ': 'h e', 'ほ': 'h o',
        'ま': 'm a', 'み': 'm i', 'む': 'm u', 'め': 'm e', 'も': 'm o',       
        'ら': 'r a', 'り': 'r i', 'る': 'r u', 'れ': 'r e', 'ろ': 'r o',
        'や': 'ja', 'ゆ': 'ju', 'よ': 'jo',
        'きゃ': 'k ja', 'きゅ': 'k ju', 'きょ': 'k jo',
        'ぎゃ': 'g ja', 'ぎゅ': 'g ju', 'ぎょ': 'g jo',
        'しゃ': 's ja', 'しゅ': 's ju', 'しょ': 's jo',
        'じゃ': 'z ja', 'じゅ': 'z ju', 'じょ': 'z jo',
        'ちゃ': 't ja', 'ちゅ': 't ju', 'ちょ': 't jo',
        'にゃ': 'n ja', 'にゅ': 'n ju', 'にょ': 'n jo',
        'ひゃ': 'h ja', 'ひゅ': 'h ju', 'ひょ': 'h jo',
        'ぴゃ': 'p ja', 'ぴゅ': 'p ju', 'ぴょ': 'p jo',
        'びゃ': 'b ja', 'びゅ': 'b ju', 'びょ': 'b jo',
        'みゃ': 'm ja', 'みゅ': 'm ju', 'みょ': 'm jo',
        'りゃ': 'r ja', 'りゅ': 'r ju', 'りょ': 'r jo',
        'わ': 'w a', 'を': 'w o', 'ん': 'N', 'っ': 'Q', 'ー': 'R',
        'だ': 'd a', 'で': 'd e', 'ど': 'd o',
        'ざ': 'z a', 'じ': 'z i', 'ず': 'z u', 'ぜ': 'z e', 'ぞ': 'z o',
        'が': 'g a', 'ぎ': 'g i', 'ぐ': 'g u', 'げ': 'g e', 'ご': 'g o',
        'ば': 'b a', 'び': 'b i', 'ぶ': 'b u', 'べ': 'b e', 'ぼ': 'b o',
        'ぱ': 'p a', 'ぴ': 'p i', 'ぷ': 'p u', 'ぺ': 'p e', 'ぽ': 'p o',
        'ゃ': 'ja', 'ゅ': 'ju', 'ょ': 'jo' 
    };

    let phonemes = [];
    let skipNext = false;

    for (let i = 0; i < hiraganaText.length; i++) {
        if (skipNext) {
            skipNext = false;
            continue;
        }

        let currentChar = hiraganaText[i];
        let nextChar = hiraganaText[i + 1];

        // 拗音の処理: 「ゃ」「ゅ」「ょ」が続く場合
        if (nextChar === 'ゃ' || nextChar === 'ゅ' || nextChar === 'ょ') {
            let combined = currentChar + nextChar;
            phonemes.push(phonemeMap[combined] || combined);  // 拗音を変換
            skipNext = true;
        } else {
            phonemes.push(phonemeMap[currentChar] || currentChar);  // 通常の変換
        }
    }
    // デバッグ用: 変換結果をコンソールに出力
    console.log(`変換結果: ${phonemes.join(' ')}`);
    
    return phonemes.join(' ');
};

// ひらがな変換のエンドポイント
app.post('/hiragana', async (req, res) => {
    const text = req.body.text;

    try {
        const response = await axios.post('https://labs.goo.ne.jp/api/hiragana', {
            app_id: API_KEY,
            sentence: text,
            output_type: 'hiragana'
        });

        const hiragana = response.data.converted;
        const phonemes = hiraganaToPhonemes(hiragana);

        res.json({ converted: hiragana, phonemes: phonemes });
    } catch (error) {
        console.error(error);
        res.status(500).send('エラーが発生しました');
    }
});

// ルート
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'A.html'));
});

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
