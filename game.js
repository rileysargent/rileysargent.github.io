// Game State & Engine Configuration
const arena = document.getElementById('arena');
const pomniEl = document.getElementById('pomni');
const dialogueEl = document.getElementById('dialogue-box');
const glitchEl = document.getElementById('glitch-layer');
const sanityFill = document.getElementById('sanity-fill');
const gloinkScoreEl = document.getElementById('gloink-score');
const gloinksLayer = document.getElementById('gloinks-layer');

const WORLD_WIDTH = 1400;
const WORLD_HEIGHT = 900;
const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 600;

let sanityLevel = 100;
let gloinksCount = 0;
let dialogueTimer = null;
let keys = {};

// Player Position (Pomni)
const player = {
    x: 700,
    y: 450,
    speed: 5
};

// Character Entities
const npcs = [
    { id: 'caine', el: document.getElementById('caine'), x: 700, y: 250, name: 'Caine', quote: "Welcome to THE AMAZING DIGITAL CIRCUS!" },
    { id: 'jax', el: document.getElementById('jax'), x: 450, y: 350, name: 'Jax', quote: "Ladies first. Or whoever gets out alive first." },
    { id: 'ragatha', el: document.getElementById('ragatha'), x: 950, y: 380, name: 'Ragatha', quote: "Hang in there, Pomni!" },
    { id: 'kinger', el: document.getElementById('kinger'), x: 300, y: 650, name: 'Kinger', quote: "DID SOMEONE SAY INSECT COLLECTION?!" }
];

// Active Gloinks List
let gloinks = [];

function spawnGloink() {
    const gloinkData = {
        id: Math.random(),
        x: Math.random() * (WORLD_WIDTH - 200) + 100,
        y: Math.random() * (WORLD_HEIGHT - 200) + 100,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        el: document.createElement('div')
    };

    gloinkData.el.className = 'gloink';
    gloinkData.el.style.backgroundColor = `hsl(${Math.random() * 360}, 80%, 60%)`;
    gloinksLayer.appendChild(gloinkData.el);
    gloinks.push(gloinkData);
}

// Initial Gloinks
for (let i = 0; i < 8; i++) spawnGloink();

// Listeners
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' || e.key.toLowerCase() === 'e') checkInteractions();
});

window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

document.getElementById('btn-adventure').addEventListener('click', () => {
    triggerGlitch();
    speak(npcs[0], "CAINE'S NEW ADVENTURE: GATHER ALL THE LOOSE GLOINKS!");
    for (let i = 0; i < 4; i++) spawnGloink();
});

document.getElementById('btn-spawn-gloink').addEventListener('click', () => {
    for (let i = 0; i < 3; i++) spawnGloink();
});

function speak(npc, customText) {
    const text = customText || npc.quote;
    dialogueEl.innerText = `${npc.name}: "${text}"`;
    
    // Position dialogue above character relative to screen
    const camX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, player.x - VIEW_WIDTH / 2));
    const camY = Math.max(0, Math.min(WORLD_HEIGHT - VIEW_HEIGHT, player.y - VIEW_HEIGHT / 2));
    
    dialogueEl.style.left = `${npc.x - camX - 80}px`;
    dialogueEl.style.top = `${npc.y - camY - 70}px`;
    dialogueEl.classList.add('active');

    clearTimeout(dialogueTimer);
    dialogueTimer = setTimeout(() => dialogueEl.classList.remove('active'), 3000);
}

function checkInteractions() {
    // NPC Dialogues
    npcs.forEach(npc => {
        if (Math.hypot(player.x - npc.x, player.y - npc.y) < 60) {
            speak(npc);
        }
    });

    // Exit Door Glitch
    if (Math.hypot(player.x - 710, player.y - 95) < 70) {
        triggerGlitch();
        sanityLevel = Math.max(0, sanityLevel - 25);
        sanityFill.style.width = `${sanityLevel}%`;
    }
}

function triggerGlitch() {
    glitchEl.style.opacity = '1';
    setTimeout(() => glitchEl.style.opacity = '0', 350);
}

// Position Static NPCs
npcs.forEach(npc => {
    npc.el.style.left = `${npc.x}px`;
    npc.el.style.top = `${npc.y}px`;
});

// Game Engine Loop
function update() {
    // Movement
    if (keys['w'] || keys['arrowup']) player.y -= player.speed;
    if (keys['s'] || keys['arrowdown']) player.y += player.speed;
    if (keys['a'] || keys['arrowleft']) player.x -= player.speed;
    if (keys['d'] || keys['arrowright']) player.x += player.speed;

    // Boundaries
    player.x = Math.max(40, Math.min(WORLD_WIDTH - 40, player.x));
    player.y = Math.max(40, Math.min(WORLD_HEIGHT - 40, player.y));

    // Camera Center Tracking
    const camX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, player.x - VIEW_WIDTH / 2));
    const camY = Math.max(0, Math.min(WORLD_HEIGHT - VIEW_HEIGHT, player.y - VIEW_HEIGHT / 2));
    arena.style.transform = `translate(${-camX}px, ${-camY}px)`;

    // Render Player
    pomniEl.style.left = `${player.x}px`;
    pomniEl.style.top = `${player.y}px`;

    // Update Gloinks Movement & Pickup
    gloinks.forEach((g, index) => {
        g.x += g.vx;
        g.y += g.vy;

        if (g.x < 50 || g.x > WORLD_WIDTH - 50) g.vx *= -1;
        if (g.y < 50 || g.y > WORLD_HEIGHT - 50) g.vy *= -1;

        g.el.style.left = `${g.x}px`;
        g.el.style.top = `${g.y}px`;

        // Collision with Pomni
        if (Math.hypot(player.x - g.x, player.y - g.y) < 30) {
            g.el.remove();
            gloinks.splice(index, 1);
            gloinksCount++;
            gloinkScoreEl.innerText = gloinksCount;
            sanityLevel = Math.min(100, sanityLevel + 3);
            sanityFill.style.width = `${sanityLevel}%`;
        }
    });

    requestAnimationFrame(update);
}

requestAnimationFrame(update);
