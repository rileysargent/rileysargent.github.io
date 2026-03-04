const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini with your Env Var
const genAI = new GoogleGenerativeAI(process.env.API_KEY_GEMINI);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/combine', async (req, res) => {
    const { item1, item2 } = req.body;

    if (!item1 || !item2) {
        return res.status(400).json({ error: "Two items are required." });
    }

    const prompt = `You are the game Infinite Craft. 
    Combine "${item1}" and "${item2}" to create a new result. 
    Rules:
    1. Output ONLY the Emoji and Name (e.g., "💨 Steam").
    2. Be logical but creative.
    3. If the combination makes no sense, result in "💥 Explosion".`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        
        console.log(`Crafted: ${item1} + ${item2} = ${text}`);
        res.json({ result: text });
    } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({ error: "Crafting failed." });
    }
});

app.listen(port, () => {
    console.log(`Infinite Server running at http://localhost:${port}`);
});
