const mineflayer = require('mineflayer');
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Web server interface for Render health checks and 24/7 keeping awake
app.get('/', (req, res) => {
  res.send('Bot is awake and running 24/7!');
});

app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

// 2. Minecraft bot configuration (Forced Version Override & Offline Mode)
// MAKE SURE TO CHANGE THE HOST TO YOUR ACTUAL FREE SERVER IP!
const bot = mineflayer.createBot({
  host: 'YOUR_SERVER_IP_HERE', 
  port: 25565,                  
  username: 'ServerBot',       // The exact name your bot will use inside Minecraft
  auth: 'offline',             // Skips Microsoft paywalls/logins entirely
  version: '1.21.1',           // Bypasses the autoVersion error by using a stable fallback lookup
  checkTimeoutInterval: 60000 
});

// Force the internal packet listener state to bypass strict 26.1.2 validation kicks
bot._client.protocolVersion = null;

// Log event when the bot successfully spawns into your server
bot.on('spawn', () => {
  console.log(`Bot is inside the server! Current Username: ${bot.username}`);
  console.log('Broadcasting to friends list...');
});

// Handle auto-reconnect if the bot gets kicked or server restarts
bot.on('end', () => {
  console.log('Bot disconnected. Reconnecting in 5 seconds...');
  setTimeout(() => {
    process.exit(1); // Force Render to automatically reboot and launch the bot again
  }, 5000);
});

// 3. The 14-minute loop to bypass Render's 15-minute sleep timer
const PROJECT_URL = `https://onrender.com`; 

setInterval(async () => {
  try {
    await axios.get(PROJECT_URL);
    console.log('Pinged self successfully! Bot staying awake...');
  } catch (error) {
    console.log('Ping failed, but script is still running:', error.message);
  }
}, 14 * 60 * 1000); // 14 minutes in milliseconds
