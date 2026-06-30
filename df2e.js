const mineflayer = require('mineflayer');
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is awake and running 24/7!');
});

app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

// 2. Minecraft bot configuration (Raw Protocol Injection)
const bot = mineflayer.createBot({
  host: 'sargentserver1.progamer.me', 
  port: 36837,                        
  username: 'h0xBot',                 
  auth: 'offline',                    
  // Feed the code the direct 26.1.2 protocol hex mapping
  version: '1.21.4' 
});

// Force override the protocol ID to 775 (Minecraft 26.1.2 Standard)
bot.on('inject_allowed', () => {
  bot._client.protocolVersion = 775; 
});

bot.on('spawn', () => {
  console.log(`Bot is inside the server! Current Username: ${bot.username}`);
  console.log('Broadcasting to friends list...');
});

bot.on('end', () => {
  console.log('Bot disconnected. Reconnecting in 5 seconds...');
  setTimeout(() => { process.exit(1); }, 5000);
});

// 3. The 14-minute loop
const PROJECT_URL = `https://onrender.com`; 
setInterval(async () => {
  try { await axios.get(PROJECT_URL); } catch (e) {}
}, 14 * 60 * 1000);
