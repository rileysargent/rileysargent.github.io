const express = require('express');
const app = express();
app.use(express.json());

let playerPositions = {};

// The endpoint Minecraft hits
app.post('/api/update', (req, res) => {
    const { username, x, y, z } = req.body;
    playerPositions[username] = { x, y, z, lastUpdate: Date.now() };
    res.status(200).send("OK");
});

// The endpoint your Web Client hits to see where everyone is
app.get('/api/positions', (req, res) => {
    res.json(playerPositions);
});

app.listen(process.env.PORT || 3000);
