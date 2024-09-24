// クエリパラメータの取得とログ
function getQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {
        elapsedTime: parseFloat(urlParams.get('elapsedTime')) || 0,
        volumeData: urlParams.get('volumeData') ? urlParams.get('volumeData').split(',').map(Number) : [],
        collectedCoins: parseInt(urlParams.get('collectedCoins')) || 0, // 取得したコインの数
        totalCoins: parseInt(urlParams.get('totalCoins')) || 0 // 総コイン数
    };
    console.log("Query Parameters:", params);
    return params;
}

const params = getQueryParams();

// 結果の表示
document.getElementById('elapsedTime').innerText = params.elapsedTime.toFixed(2);

const coinRate = params.collectedCoins;
const coinRateElement = document.getElementById('coinRate');