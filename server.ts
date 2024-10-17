import * as dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as converter from './converter'; // Named import

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Middleware to log requests for debugging
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Route to handle audio upload and processing
app.post('/upload-audio', upload.single('audio'), async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('File uploaded:', req.file);

        if (!req.file) {
            res.status(400).json({ error: 'No audio file uploaded' });
            return;
        }

        const { path: filePath, originalname } = req.file;
        const fileExtension = path.extname(originalname);

        const allowedExtensions = ['.wav', '.mp3', '.m4a'];
        if (!allowedExtensions.includes(fileExtension)) {
            fs.unlinkSync(filePath); // Delete invalid files
            res.status(400).json({ error: 'Invalid file type' });
            return;
        }

        // Process the audio file: Transcription + Translation
        const transcription = await converter.transcribeAudio(filePath);
        const translation = await converter.translateText(transcription, 'es');

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // Cleanup

        res.json({ transcription, translation });
    } catch (error: any) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Failed to process the audio' });
    }
});

// Start the server
app.listen(5000, () => {
    console.log('HTTP server is running on http://localhost:5000');
});
