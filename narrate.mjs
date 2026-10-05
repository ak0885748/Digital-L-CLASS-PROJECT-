import { ElevenLabsClient, play } from '@elevenlabs/elevenlabs-js';
import * as dotenv from 'dotenv';
dotenv.config?.();

const apiKey = process.env.ELEVENLABS_API_KEY || "YOUR_API_KEY";

const elevenlabs = new ElevenLabsClient({
  apiKey: apiKey,
});

async function main() {
  console.log("🎙️ Synthesizing speech with ElevenLabs SDK...");
  
  const audio = await elevenlabs.textToSpeech.convert(
    'JBFqnCBsd6RMkjVDRZzb', // Voice ID: George
    {
      text: 'The first move is what sets everything in motion.',
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    }
  );

  console.log("🔊 Playing audio...");
  await play(audio);
}

main().catch(console.error);
