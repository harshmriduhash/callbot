require('dotenv').config();
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const twilio = require('twilio');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// TwiML Webhook for Incoming Calls
app.post('/twiml', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const host = req.get('host');
    const protocol = req.protocol === 'https' ? 'wss' : 'ws';

    const connect = twiml.connect();
    connect.stream({
        url: `${protocol}://${host}/media-stream`
    });

    res.type('text/xml');
    res.send(twiml.toString());
});

const { createClient } = require("@deepgram/sdk");
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// WebSocket Media Stream Handler
wss.on('connection', (ws) => {
    console.log('New connection established');
    let streamSid = null;
    let dgConnection = null;

    const setupDeepgram = () => {
        dgConnection = deepgram.listen.live({
            smart_format: true,
            model: "nova-2",
            encoding: "mulaw",
            sample_rate: 8000,
            channels: 1,
        });

        dgConnection.on("open", () => {
            console.log("Deepgram connection opened");
        });

        dgConnection.on("transcript", async (data) => {
            const transcript = data.channel.alternatives[0].transcript;
            if (transcript && data.is_final) {
                console.log(`User says: ${transcript}`);
                await handleAiResponse(transcript);
            }
        });

        dgConnection.on("error", (error) => {
            console.error("Deepgram error:", error);
        });
    };

    const handleAiResponse = async (userText) => {
        try {
            const result = await model.generateContent(userText);
            const responseText = result.response.text();
            console.log(`AI Response: ${responseText}`);

            // Convert text to speech using ElevenLabs
            const audioData = await generateTTS(responseText);
            if (audioData) {
                ws.send(JSON.stringify({
                    event: 'media',
                    streamSid: streamSid,
                    media: {
                        payload: audioData
                    }
                }));
            }
        } catch (error) {
            console.error("AI/TTS Error:", error);
        }
    };

    const generateTTS = async (text) => {
        try {
            const response = await axios({
                method: 'POST',
                url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'}/stream?output_format=ulaw_8000`,
                headers: {
                    'Accept': 'audio/wav',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                },
                data: {
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                },
                responseType: 'arraybuffer',
            });
            return Buffer.from(response.data).toString('base64');
        } catch (error) {
            console.error("ElevenLabs Error:", error);
            return null;
        }
    };

    setupDeepgram();

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.event) {
            case 'start':
                streamSid = data.start.streamSid;
                console.log(`Stream started: ${streamSid}`);
                break;
            case 'media':
                if (dgConnection && dgConnection.getReadyState() === 1) {
                    dgConnection.send(Buffer.from(data.media.payload, 'base64'));
                }
                break;
            case 'stop':
                console.log('Stream stopped');
                if (dgConnection) dgConnection.finish();
                break;
        }
    });

    ws.on('close', () => {
        console.log('Connection closed');
        if (dgConnection) dgConnection.finish();
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
