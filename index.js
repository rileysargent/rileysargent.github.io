const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});
const path = require('path');

app.use(express.json());
app.use(express.static('public'));

let playerStates = {}; 

// 1. RECEIVE FROM MINECRAFT (The Add-on hits this)
app.post('/api/update', (req, res) => {
    const { username, x, y, z, dimension } = req.body;
    
    playerStates[username] = {
        x, y, z, 
        dimension,
        lastSeen: Date.now()
    };

    // 2. SEND TO WEB BROWSER (Real-time update)
    io.emit('positions-update', playerStates);
    res.sendStatus(200);
});

// Clean up players who leave the game (no update for 5 seconds)
setInterval(() => {
    const now = Date.now();
    for (const user in playerStates) {
        if (now - playerStates[user].lastSeen > 5000) {
            delete playerStates[user];
        }
    }
}, 5000);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`VC Server running on port ${PORT}`);
});
