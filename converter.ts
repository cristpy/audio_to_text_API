import * as dotenv from 'dotenv';
import * as fs from 'fs';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';

dotenv.config();
console.log('API_KEY:', process.env.API_KEY);

// Define interfaces for API responses
interface UploadResponse {
  upload_url: string;
}

interface TranscriptResponse {
  id: string;
}

interface TranscriptStatusResponse {
  status: 'completed' | 'failed' | 'processing';
  text?: string;
  error?: string;
}

// Convert audio to LINEAR16 WAV
async function convertAudio(inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(['-ar 16000', '-ac 1', '-f wav'])
      .save(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err: Error) => {
        console.error('Error converting audio:', err);
        reject(err);
      });
  });
}

// Transcribe audio using AssemblyAI
async function transcribeAudio(filePath: string): Promise<string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error('API key not found in environment variables.');

  const convertedFilePath = `${filePath}.wav`;

  try {
    await convertAudio(filePath, convertedFilePath);

    // Upload audio to AssemblyAI
    const uploadResponse = await axios.post<UploadResponse>(
      'https://api.assemblyai.com/v2/upload',
      fs.createReadStream(convertedFilePath),
      { headers: { authorization: apiKey } }
    );

    const audioUrl = uploadResponse.data.upload_url;
    console.log('Uploaded audio URL:', audioUrl);

    // Request transcription
    const transcriptResponse = await axios.post<TranscriptResponse>(
      'https://api.assemblyai.com/v2/transcript',
      { audio_url: audioUrl },
      { headers: { authorization: apiKey } }
    );

    const transcriptId = transcriptResponse.data.id;
    console.log(`Transcript ID: ${transcriptId}`);

    // Poll for the transcription result with a timeout
    const text = await pollTranscriptionResult(transcriptId, apiKey);
    return text;
  } catch (error: any) {
    console.error('Transcription Error:', error.response?.data || error.message);
    throw new Error('Failed to process the audio');
  } finally {
    cleanUpFiles([convertedFilePath, filePath]);
  }
}

// Poll the transcription status with a timeout
async function pollTranscriptionResult(
  transcriptId: string,
  apiKey: string,
  timeout: number = 30000
): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const response = await axios.get<TranscriptStatusResponse>(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      { headers: { authorization: apiKey } }
    );

    const statusResponse = response.data;

    if (statusResponse.status === 'completed') {
      return statusResponse.text!;
    } else if (statusResponse.status === 'failed') {
      throw new Error('Transcription failed: ' + statusResponse.error);
    }

    await new Promise((res) => setTimeout(res, 5000)); // Wait 5 seconds
  }

  throw new Error('Transcription timed out.');
}

// Clean up files after processing
function cleanUpFiles(files: string[]) {
  for (const file of files) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`Deleted file: ${file}`);
    }
  }
}

async function translateText(text: string, targetLanguage: string): Promise<string> {
    try {
      const response = await axios.post('https://libretranslate.de/translate', {
        q: text,
        source: 'en',           // Source language (adjust if needed)
        target: targetLanguage, // Target language passed to the function
        format: 'text',
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
  
      console.log(`Translation result: ${response.data.translatedText}`);
      return response.data.translatedText;
    } catch (error: any) {
      console.error('Translation Error:', error.message);
      throw new Error('Failed to translate the text.');
    }
}

export { transcribeAudio, translateText };
