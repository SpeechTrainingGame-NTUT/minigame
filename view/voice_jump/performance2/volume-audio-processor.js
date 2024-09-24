class VolumeAudioProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.volume = 0;
    }
  
    process(inputs) {
      const input = inputs[0];
      if (input.length > 0) {
        // 音量を計算する処理
        let sum = 0;
        for (let i = 0; i < input[0].length; i++) {
          sum += input[0][i] * input[0][i];
        }
        const rms = Math.sqrt(sum / input[0].length);
        this.volume = rms;
  
        // 計算した音量をメインスレッドに送信
        this.port.postMessage({ volume: this.volume });
      }
      return true;
    }
  }
  
  registerProcessor('volume-audio-processor', VolumeAudioProcessor);  