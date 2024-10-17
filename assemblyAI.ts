import axios, { AxiosError } from 'axios';
import fs from 'fs';

const apikey = process.env.API_KEY; // Ensure API key is set in the environment

// Interface for responses
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

// Upload audio to AssemblyAI using streaming
async function uploadAudio(filePath: string): Promise<string> {
  try {
    const audioStream = fs.createReadStream(filePath); // Use streaming for large files
    const response = await axios.post<UploadResponse>(
      'https://api.assemblyai.com/v2/upload',
      audioStream,
      {
        headers: {
          authorization: apikey,
          'Content-Type': 'application/octet-stream',
        },
      }
    );

    console.log('Uploaded audio URL:', response.data.upload_url);
    return response.data.upload_url;
  } catch (error) {
    handleAxiosError(error, 'uploading audio');
    throw new Error('Audio upload failed');
  }
}

// Transcribe audio from a given URL with polling and timeout
async function transcribeAudio(audioUrl: string): Promise<string> {
  try {
    const response = await axios.post<TranscriptResponse>(
      'https://api.assemblyai.com/v2/transcript',
      { audio_url: audioUrl },
      { headers: { authorization: apikey } }
    );

    const transcriptId = response.data.id;
    console.log(`Transcript ID: ${transcriptId}`);

    const result = await pollTranscription(transcriptId, 30000); // 30s timeout
    if (result.status === 'failed') {
      throw new Error(result.error || 'Transcription failed');
    }

    console.log('Transcription result:', result.text);
    return result.text!;
  } catch (error) {
    handleAxiosError(error, 'during transcription');
    throw new Error('Transcription process failed');
  }
}

// Poll transcription status with a timeout
async function pollTranscription(
  transcriptId: string,
  timeout: number
): Promise<TranscriptStatusResponse> {
  const start = Date.now();
  let result: TranscriptStatusResponse;

  do {
    await new Promise((res) => setTimeout(res, 3000)); // Wait 3 seconds

    const response = await axios.get<TranscriptStatusResponse>(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      { headers: { authorization: apikey } }
    );

    result = response.data;
    console.log(`Current status: ${result.status}`);

    if (Date.now() - start > timeout) {
      throw new Error('Transcription timed out');
    }
  } while (result.status !== 'completed' && result.status !== 'failed');

  return result;
}

// Handle Axios-specific errors
function handleAxiosError(error: unknown, context: string) {
  if (isAxiosError(error)) {
    console.error(`Error ${context}:`, error.response?.data || error.message);
  } else {
    console.error(`Error ${context}:`, (error as Error).message);
  }
}

// Type guard for Axios errors
function isAxiosError(error: unknown): error is AxiosError {
  return (error as AxiosError).isAxiosError === true;
}

// Export functions
export { uploadAudio, transcribeAudio };