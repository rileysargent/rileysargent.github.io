const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();

const app = express();
// Render dynamically assigns a port, so we must use process.env.PORT
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.API_KEY_GEMINI);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/combine', async (req, res) => {
    const { item1, item2 } = req.body;

    if (!item1 || !item2) {
        return res.status(400).json({ error: "Missing items" });
    }

    const prompt = `You are the game Infinite Craft. 
    Combine "${item1}" and "${item2}" to create a new result. 
    Respond ONLY with the Emoji and Name (e.g., "💨 Steam").`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        
        res.json({ result: text });
    } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({ error: "Crafting failed" });
    }
});

// Important for Render deployment
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
