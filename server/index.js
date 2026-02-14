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

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// WebSocket Media Stream Handler
wss.on('connection', (ws) => {
    console.log('New connection established');
    let streamSid = null;
    let transcript = '';

    ws.on('message', async (message) => {
        const data = JSON.parse(message);

        switch (data.event) {
            case 'start':
                streamSid = data.start.streamSid;
                console.log(`Stream started: ${streamSid}`);
                break;
            case 'media':
                // In a real implementation, you would pipe this to an STT service
                // For example, if using Deepgram:
                // deepgramSocket.send(Buffer.from(data.media.payload, 'base64'));
                break;
            case 'speech': // Custom event or handled via real-time STT callback
                const userText = data.text;
                console.log(`User says: ${userText}`);

                try {
                    const result = await model.generateContent(userText);
                    const responseText = result.response.text();
                    console.log(`AI Response: ${responseText}`);

                    // Send back to Twilio (would need TTS and then outbound media payload)
                    // For now, logging the interaction.
                } catch (error) {
                    console.error("Gemini Error:", error);
                }
                break;
            case 'stop':
                console.log('Stream stopped');
                break;
        }
    });

    ws.on('close', () => {
        console.log('Connection closed');
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
