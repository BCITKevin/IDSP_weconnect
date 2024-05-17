import { SpeechClient } from "@google-cloud/speech"

export class SpeechToTextService {
    private recognizeStream: any;
    private transcriptionCallback: any;
  
  
    constructor() {
      this.recognizeStream = null;
      this.transcriptionCallback = null;
    }
  
    public startRecognizeStream(callback: (transcription: string) => void) {
      const client = new SpeechClient();
      this.transcriptionCallback = callback;
  
      this.recognizeStream = client
        .streamingRecognize({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            enableSpeakerDiarization: true,
            model: 'latest_long',
          },
          interimResults: true,
        })
        .on('error', console.error)
        .on('data', (data) => {
          const transcription = data.results[0]?.alternatives[0]?.transcript;
          const isFinal = data.results[0]?.isFinal;
          console.log(`Real time transcript: ${transcription} [isFinal: ${isFinal}]`);
          if (isFinal) {
            this.transcriptionCallback(transcription);
          }
        });
    }
  
    public getRecognizeStream() {
      return this.recognizeStream;
    }
  
    public endStream() {
      if (this.recognizeStream) {
        this.recognizeStream.end();
      } else {
        console.error('Recognize stream is not initialized.');
      }
    }
  }