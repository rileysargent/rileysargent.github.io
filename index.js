// 1. Initialise the WebAssembly Module
var Module = {
    canvas: document.getElementById('canvas'),
    setStatus: function(text) {
        console.log("Status: " + text);
        if (document.getElementById('status')) {
            document.getElementById('status').innerHTML = text;
        }
    },
    // This connects your JavaScript keyboard to your C++ logic
    onRuntimeInitialized: function() {
        Module.setStatus("Game Ready! Use Arrows to steer.");
        window.addEventListener('keydown', (e) => {
            if (e.key === "ArrowLeft" || e.key === "a") Module._move_left();
            if (e.key === "ArrowRight" || e.key === "d") Module._move_right();
        });
    }
};

// 2. The Loader: This "fetches" the compiled C++ binary
async function loadWasm() {
    try {
        const response = await fetch('index.wasm');
        const buffer = await response.arrayBuffer();
        
        // This initiates the C++ code in the browser
        WebAssembly.instantiate(buffer, {
            env: {
                memory: new WebAssembly.Memory({ initial: 256 }),
                table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }),
                emscripten_set_main_loop: function(f, fps, simulate) {
                    setInterval(() => Module.instance.exports.game_loop(), 1000/60);
                },
                // Add standard C library functions the browser needs
                print: (text) => console.log(text),
                __memory_base: 1024,
                __stack_pointer: new WebAssembly.Global({value: 'i32', mutable: true}, 0)
            }
        }).then(result => {
            Module.instance = result.instance;
            Module.onRuntimeInitialized();
        });
    } catch (err) {
        Module.setStatus("Error loading .wasm: " + err);
    }
}

loadWasm();
