// クエリパラメータの取得とログ
function getQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {
        elapsedTime: parseFloat(urlParams.get('elapsedTime')) || 0,
        volumeData: urlParams.get('volumeData') ? urlParams.get('volumeData').split(',').map(Number) : []
    };
    console.log("Query Parameters:", params);
    return params;
}

const params = getQueryParams();

// 結果の表示
document.getElementById('elapsedTime').innerText = params.elapsedTime.toFixed(2);

const ctx = document.getElementById('volumeChart').getContext('2d');

// 経過時間に基づいて0.1秒刻みの時間ラベルを生成
const maxLabel = Math.ceil(params.elapsedTime * 10) / 10; // 0.1秒刻み
const labels = [];
for (let i = 0; i <= maxLabel; i += 0.1) {
    labels.push(i.toFixed(1) + 's');
}

// データの調整
const interval = 0.1; // 音量データの取得間隔（0.1秒）
const dataLength = Math.ceil(params.elapsedTime / interval); // データ長さ

// adjustedVolumeData 生成後に追加
console.log("音量データ:", params.volumeData);

console.log("Elapsed Time:", params.elapsedTime);
console.log("Interval:", interval);
console.log("Data Length:", dataLength);

// データを取得した時間に基づいて補正する
const adjustedVolumeData = [];
for (let i = 0; i <= dataLength; i++) {
    const time = i * interval;
    console.log("i:", i, "time:", time);
    if (i < params.volumeData.length) {
        // 取得した音量データがある場合
        adjustedVolumeData.push(params.volumeData[i] || 0);
    } //else {
        //経過時間を超えた場合はゼロで埋める
        //adjustedVolumeData.push(0);
    //}
}
console.log("Adjusted Volume Data:", adjustedVolumeData);

// データセットとオプション
const data = {
    labels: labels,
    datasets: [{
        label: '音量',
        data: adjustedVolumeData,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 1,
        fill: true,
        tension: 0.1
    }]
};

const options = {
    scales: {
        x: {
            title: {
                display: true,
                text: '時間(秒)'
            },
            ticks: {
                stepSize: 0.1 // 表示間隔を0.1秒に設定
            }
        },
        y: {
            title: {
                display: true,
                text: '音量'
            },
            beginAtZero: true
        }
    }
};

// グラフの描画
const volumeChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: labels.slice(0, dataLength),
        datasets: [{
            label: '音量',
            data: adjustedVolumeData,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 1,
            fill: true,
            tension: 0.1
        }]
    },
    options: options
});