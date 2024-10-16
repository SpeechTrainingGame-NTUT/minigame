const path = require('path'); // これは必要です

module.exports = {
  entry: './script.js', // スクリプトへの相対パス
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist') // 絶対パスを設定
  },
  mode: 'development' // または 'production' に設定
};
