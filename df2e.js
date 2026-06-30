const mineflayer = require('mineflayer');
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Web server interface for Render health checks
app.get('/', (req, res) => {
  res.send('Bot is awake and running 24/7!');
});

app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

// 2. Minecraft bot configuration
// REPLACE 'YOUR_SERVER_IP' AND 'YOUR_BOT_EMAIL' WITH YOUR ACTUAL DETAILS
const bot = mineflayer.createBot({
  host: 'sargentserver1.progamer.me', 
  port: 36837,                  
  username: 'h0xBot', 
  auth: 'microsoft'          
  version: 'false'
});

// Log event when the bot successfully spawns into your server
bot.on('spawn', () => {
  console.log(`Bot is inside the server! Current Username: ${bot.username}`);
  console.log('Broadcasting to friends list...');
});


// Handle auto-reconnect if the bot gets kicked or server restarts
bot.on('end', () => {
  console.log('Bot disconnected. Reconnecting in 5 seconds...');
  setTimeout(() => {
    process.exit(1); // Force Render to restart the script automatically
  }, 5000);
});

// 3. The 14-minute loop to bypass Render's 15-minute sleep timer
const PROJECT_URL = `https://riley-s-projects.onrender.com`; 

setInterval(async () => {
  try {
    await axios.get(PROJECT_URL);
    console.log('Pinged self successfully! Bot staying awake...');
  } catch (error) {
    console.log('Ping failed, but script is still running:', error.message);
  }
}, 14 * 60 * 1000); // 14 minutes in milliseconds
