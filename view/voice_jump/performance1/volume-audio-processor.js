class VolumeAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.volume = 0;
        this.clipping = false;
        this.lastClip = 0;
        this.clipLevel = 0.98;
        this.averaging = 0.95;
        this.clipLag = 750;
    }

    process(inputs, outputs) {
        const input = inputs[0];
        const buf = input[0]; // 1つ目のチャンネルを取得
        if (buf) {
            const bufLength = buf.length;
            let sum = 0;
            let x;

            for (let i = 0; i < bufLength; i++) {
                x = buf[i];
                if (Math.abs(x) >= this.clipLevel) {
                    this.clipping = true;
                    this.lastClip = currentTime;
                }
                sum += x * x;
            }

            const rms = Math.sqrt(sum / bufLength);
            this.volume = Math.max(rms, this.volume * this.averaging);
            this.port.postMessage(this.volume); // ボリュームをメインスレッドに送信
        }
        return true; // プロセスを続行
    }
}

registerProcessor('volume-audio-processor', VolumeAudioProcessor);