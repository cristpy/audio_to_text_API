// src/App.tsx
import React, { useState } from 'react';
import axios from 'axios';

// Define an interface for the output structure
interface OutputData {
  transcription?: string;
  translation?: string;
  audioFile?: string;
}

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [output, setOutput] = useState<OutputData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setAudioFile(file);
  };

  const handleUpload = async () => {
    if (!audioFile) {
      alert('Please select an audio file first.');
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioFile);

    setLoading(true);
    setError(null);
    setOutput(null);

    try {
      const response = await axios.post<OutputData>(
        'http://localhost:5000/upload-audio',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (response.data) {
        setOutput(response.data);
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to upload audio.';
      setError(message);
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Audio Upload and Transcription</h1>

      <input
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        disabled={loading}
      />
      <button onClick={handleUpload} disabled={loading || !audioFile}>
        {loading ? 'Uploading...' : 'Upload Audio'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {output && (
        <div>
          <h2>Output:</h2>
          <p>
            <strong>Transcription:</strong> {output.transcription || 'N/A'}
          </p>
          <p>
            <strong>Translation:</strong> {output.translation || 'N/A'}
          </p>
          {output.audioFile && (
            <audio controls>
              <source
                src={`http://localhost:5000/${output.audioFile}`}
                type="audio/mpeg"
              />
              Your browser does not support the audio element.
            </audio>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
