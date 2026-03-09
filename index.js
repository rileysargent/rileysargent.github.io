const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors({ origin: 'https://rileysargent.github.io' })); // Important!
app.use(express.json());

// Auth for your school 440GB OneDrive
async function getOneDriveToken() {
    const res = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', 
        new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            grant_type: 'refresh_token',
            refresh_token: process.env.REFRESH_TOKEN
        }));
    return res.data.access_token;
}

app.post('/chat', async (req, res) => {
    const { message } = req.body;
    
    // 1. Get reply from Gemini
    const geminiRes = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_KEY}`, {
        contents: [{ parts: [{ text: message }] }]
    });
    
    const botReply = geminiRes.data.candidates[0].content.parts[0].text;
    
    // 2. (Optional) Log this interaction to your 440GB OneDrive
    // You'd use the token from getOneDriveToken() here

    res.json({ reply: botReply });
});

app.listen(process.env.PORT || 10000);
