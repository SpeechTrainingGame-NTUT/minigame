class VolumeProcessor extends AudioWorkletProcessor {
  constructor() {
      super();
      this._volume = 0;
  }

  process(inputs, outputs, parameters) {
      const input = inputs[0];
      if (input.length > 0) {
          const samples = input[0];
          let sum = 0;
          for (let i = 0; i < samples.length; i++) {
              sum += samples[i] * samples[i];
          }
          this._volume = Math.sqrt(sum / samples.length);

          this.port.postMessage({ volume: this._volume });
      }
      return true;
  }
}

registerProcessor('volume-processor', VolumeProcessor);

/*
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
  */