import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON payload limit to handle base64 audio data
app.use(express.json({ limit: '15mb' }));

// Initialize GoogleGenAI SDK lazily as recommended in the guidelines
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// API Routes
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audio, mimeType } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    let ai;
    try {
      ai = getAiClient();
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Gemini API not configured' });
    }

    console.log('Sending audio to Gemini for transcription...');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            data: audio, // base64 string
            mimeType: mimeType || 'audio/webm'
          }
        },
        'Transkripsikan rekaman suara rapat mahasiswa ini ke dalam format catatan rapat terperinci (notulen) menggunakan Bahasa Indonesia. Format dengan rapi menggunakan Markdown. Berikan ringkasan poin-poin penting, keputusan rapat, dan rencana tindak lanjut jika ada.'
      ]
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error during transcription' });
  }
});

// Serve Frontend
async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Explicitly disable HMR to prevent WebSocket connection failures in sandbox
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('Vite middleware integrated.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static build.');
  }
}

setupFrontend().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});
