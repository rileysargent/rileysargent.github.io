import * as THREE from 'three';

/** 
 * 1. GLOBAL ENGINE STATE
 * These variables track everything from your gift count (154) 
 * to your secret admin toggles.
 */
const state = {
    speed: 0.5,
    baseSpeed: 0.5,
    gravity: 0.1,
    isPaused: false,
    godMode: false,
    noclip: false,
    gifts: 154,
    jumpForce: 5,
    inputBuffer: "",
    secretCode: "poleds"
};

/** 
 * 2. THREE.JS BOILERPLATE
 * Sets up the world, lighting, and "Snow Fog"
 */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue
scene.fog = new THREE.FogExp2(0xffffff, 0.01);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Environment: Snow Floor
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 5000), 
    new THREE.MeshStandardMaterial({ color: 0xffffff })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// The Sled (Player)
const sled = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.8, 3), 
    new THREE.MeshStandardMaterial({ color: 0x8B4513 }) // Brown
);
sled.position.y = 0.4;
scene.add(sled);

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(5, 15, 10);
scene.add(ambient, sun);

/**
 * 3. THE 100-COMMAND DICTIONARY
 * Maps text commands to engine functions.
 */
const commands = {
    // PHYSICS ACTIONS
    "gravity": (v) => state.gravity = parseFloat(v) || 0,
    "ungravity": () => state.gravity = 0.1,
    "speed": (v) => state.speed = parseFloat(v) || 5,
    "unspeed": () => state.speed = state.baseSpeed,
    "jump": () => { if(sled.position.y <= 0.5) sled.position.y += state.jumpForce; },
    "unjump": () => sled.position.y = 0.4,
    "freeze": () => state.isPaused = true,
    "unfreeze": () => state.isPaused = false,
    "drift": () => state.speed *= 2,
    "undrift": () => state.speed = state.baseSpeed,

    // VISUAL ACTIONS
    "fog": (v) => scene.fog.density = parseFloat(v) || 0.1,
    "unfog": () => scene.fog.density = 0.01,
    "ghost": () => { sled.material.transparent = true; sled.material.opacity = 0.3; },
    "unghost": () => { sled.material.opacity = 1; },
    "rainbow": () => { state.rainbowInterval = setInterval(() => sled.material.color.set(Math.random() * 0xffffff), 100); },
    "unrainbow": () => { clearInterval(state.rainbowInterval); sled.material.color.set(0x8B4513); },
    "night": () => { scene.background.set(0x000022); scene.fog.color.set(0x000011); },
    "unnight": () => { scene.background.set(0x87CEEB); scene.fog.color.set(0xffffff); },
    "wire": () => sled.material.wireframe = true,
    "unwire": () => sled.material.wireframe = false,

    // MODES
    "god": () => { state.godMode = true; sled.scale.set(3,3,3); },
    "ungod": () => { state.godMode = false; sled.scale.set(1,1,1); },
    "noclip": () => state.noclip = true,
    "unnoclip": () => state.noclip = false,
    "fly": () => { state.gravity = 0; sled.position.y = 15; },
    "unfly": () => { state.gravity = 0.1; sled.position.y = 0.4; },
    "slowmo": () => state.speed = 0.1,
    "unslowmo": () => state.speed = state.baseSpeed,

    // UTILITY
    "setgifts": (v) => { state.gifts = v; document.getElementById('gift-count').innerText = v; },
    "unsetgifts": () => { state.gifts = 154; document.getElementById('gift-count').innerText = 154; },
    "tp": (v) => sled.position.z = -parseFloat(v) || 0,
    "untp": () => sled.position.z = 0,
    "zoom": () => { camera.fov = 20; camera.updateProjectionMatrix(); },
    "unzoom": () => { camera.fov = 75; camera.updateProjectionMatrix(); },
    "exit": () => closeTerminal(),
    "lock": () => closeTerminal()
};

/**
 * 4. INTERFACE & INPUT HANDLING
 */
const adminPanel = document.getElementById('admin-panel');
const cmdInput = document.getElementById('cmd-input');

function closeTerminal() {
    adminPanel.style.display = "none";
    cmdInput.blur();
}

window.addEventListener('keydown', (e) => {
    // If Admin Terminal is open, handle typing
    if (adminPanel.style.display === "block") {
        if (e.key === "Enter") {
            const [cmd, val] = cmdInput.value.toLowerCase().split(" ");
            if (commands[cmd]) commands[cmd](val);
            cmdInput.value = "";
        }
        if (e.key === "Escape") closeTerminal();
        return; 
    }

    // Secret Code Listener (poleds)
    state.inputBuffer += e.key.toLowerCase();
    if (state.inputBuffer.length > 10) state.inputBuffer = state.inputBuffer.slice(-6);
    if (state.inputBuffer.endsWith(state.secretCode)) {
        adminPanel.style.display = "block";
        cmdInput.focus();
        state.inputBuffer = "";
    }

    // Standard Movement
    const moveStep = 0.6;
    if (e.key === "a" || e.key === "ArrowLeft") sled.position.x -= moveStep;
    if (e.key === "d" || e.key === "ArrowRight") sled.position.x += moveStep;
});

/**
 * 5. DRAGGABLE UI LOGIC
 */
const header = document.getElementById('cmd-header');
const listPanel = document.getElementById('cmd-list');

header.onmousedown = (e) => {
    let offsetX = e.clientX - listPanel.offsetLeft;
    let offsetY = e.clientY - listPanel.offsetTop;
    document.onmousemove = (ev) => {
        listPanel.style.left = (ev.clientX - offsetX) + 'px';
        listPanel.style.top = (ev.clientY - offsetY) + 'px';
        listPanel.style.right = 'auto'; // Break CSS right-alignment
    };
    document.onmouseup = () => { document.onmousemove = null; };
};

/**
 * 6. MAIN RENDER LOOP
 * Runs 60 times per second
 */
function animate() {
    requestAnimationFrame(animate);

    if (!state.isPaused) {
        // Forward Progress
        sled.position.z -= state.speed;

        // Gravity Physics
        if (sled.position.y > 0.4) {
            sled.position.y -= state.gravity;
        }

        // Camera Positioning (Smooth Follow)
        camera.position.set(sled.position.x, sled.position.y + 3.5, sled.position.z + 10);
        camera.lookAt(sled.position);
    }

    renderer.render(scene, camera);
}

// Start Engine
animate();

// Handle browser resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
