
(function() {
    // --- UTILITY --- //
    const getIDB = () => new Promise((resolve, reject) => {
        const req = indexedDB.open("/idbfs");
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(`Failed to open IndexedDB: ${e.target.errorCode}`);
    });

    const getStorageData = async () => {
        let indexedDBData = "Not available";
        try {
            const db = await getIDB();
            const transaction = db.transaction(["FILE_DATA"], 'readonly');
            const store = transaction.objectStore("FILE_DATA");
            const req = store.get("/data/bd/ സ്റ്റോറേജ്");
            indexedDBData = await new Promise((resolve, reject) => {
                req.onsuccess = e => resolve(e.target.result ? atob(atob(e.target.result.contents)) : "No data found");
                req.onerror = e => reject(`Failed to read from IndexedDB: ${e.target.errorCode}`);
            });
        } catch (error) {
            indexedDBData = `Error: ${error}`;
        }

        return {
            localStorage: JSON.stringify(localStorage, null, 2),
            indexedDB: indexedDBData,
        };
    };

    // --- LOGGING --- //
    const logContainer = document.createElement('div');
    logContainer.id = 'log-overlay';
    logContainer.style.cssText = 'position:fixed;bottom:10px;right:10px;width:350px;height:400px;background:rgba(0,0,0,0.85);border:1px solid #0f0;color:#0f0;font-family:monospace;font-size:12px;overflow-y:scroll;padding:10px;z-index:99999;display:none;flex-direction:column-reverse;';
    document.body.appendChild(logContainer);

    const originalConsoleLog = console.log;
    console.log = function(...args) {
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContainer.insertBefore(logEntry, logContainer.firstChild);
        originalConsoleLog.apply(console, args);
    };

    // --- UI --- //
    const adminPanel = document.createElement('div');
    adminPanel.id = 'admin-panel';
    adminPanel.style.cssText = 'display:none;position:fixed;top:10px;right:10px;background:rgba(0,0,0,0.95);border:1px solid #0f0;padding:15px;z-index:5000;width:260px;';
    adminPanel.innerHTML = `
        <b>IDB_AUDIT_READY</b>
        <input type="number" id="cheatScore" value="99999" style="background:#000;color:#0f0;border:1px solid #0f0;padding:8px;width:calc(100% - 20px);margin-bottom:10px;">
        <button id="inject-btn" style="background:#0f0;color:#000;border:none;padding:12px;cursor:pointer;font-weight:bold;width:100%;margin:5px 0;">OVERRIDE_SCORE</button>
        <button id="storage-btn" style="background:#0f0;color:#000;border:none;padding:12px;cursor:pointer;font-weight:bold;width:100%;margin:5px 0;">DUMP_STORAGE</button>
        <div style="font-size:9px;color:#0a0;margin-top:10px;">HOTKEY: (&) PANEL, (\`\`) LOG</div>`;
    document.body.appendChild(adminPanel);

    // --- CHEAT FUNCTIONS --- //
    const setScore = (score) => {
        if (window.gameInstance) {
            window.gameInstance.SendMessage('GameManager', 'SetScore', score);
            console.log(`Set score to: ${score}`);
        } else {
            console.log("Game instance not found.");
        }
    };

    const setHighScore = async (score) => {
        try {
            const db = await getIDB();
            const transaction = db.transaction(["FILE_DATA"], 'readwrite');
            const objectStore = transaction.objectStore("FILE_DATA");
            const req = objectStore.get("/data/bd/ സ്റ്റോറേജ്");

            req.onsuccess = (event) => {
                const fileData = event.target.result;
                if (fileData && fileData.contents) {
                    const decodedData = atob(atob(fileData.contents));
                    const modifiedData = decodedData.replace(/"highScore":\d+/, `"highScore":${score}`);
                    fileData.contents = btoa(btoa(modifiedData));
                    const putReq = objectStore.put(fileData);
                    putReq.onsuccess = () => console.log(`Successfully updated high score to ${score}`);
                    putReq.onerror = () => console.log("Error writing back to IndexedDB");
                } else {
                    console.log("FILE_DATA not found in IndexedDB.");
                }
            };
            req.onerror = (event) => console.log(`Error getting FILE_DATA: ${event.target.errorCode}`);
        } catch (error) {
            console.log(`Error setting high score: ${error}`);
        }
    };

    const getHighScore = async () => {
        try {
            const db = await getIDB();
            const transaction = db.transaction(["FILE_DATA"], 'readonly');
            const objectStore = transaction.objectStore("FILE_DATA");
            const request = objectStore.get("/data/bd/ സ്റ്റോറേജ്");

            return new Promise((resolve, reject) => {
                request.onerror = (event) => reject(`Error getting high score from IDB: ${event.target.errorCode}`);
                request.onsuccess = (event) => {
                    const fileData = event.target.result;
                    if (fileData && fileData.contents) {
                        const decodedData = atob(atob(fileData.contents));
                        const highScoreMatch = decodedData.match(/"highScore":(\d+)/);
                        if (highScoreMatch && highScoreMatch[1]) {
                            resolve(parseInt(highScoreMatch[1], 10));
                        } else {
                            resolve(0); // Default if not found
                        }
                    } else {
                        resolve(0); // Default if file not found
                    }
                };
            });
        } catch (error) {
            console.log(`Error getting high score: ${error}`);
            return 0;
        }
    };

    // --- EVENT LISTENERS --- //
    document.getElementById('inject-btn').onclick = async () => {
        const score = parseInt(document.getElementById('cheatScore').value);
        console.log(`Injecting score: ${score}`);

        if (score >= 300 && score <= 400) {
            const currentHighScore = await getHighScore();
            const bonus = Math.floor((score * currentHighScore) / 2);
            console.log(`Bonus calculated: ${bonus} (from high score: ${currentHighScore})`);
            if (confirm(`Accept ${bonus} bonus and end run?`)) {
                const newHighScore = currentHighScore + bonus;
                await setHighScore(newHighScore);
                setScore(newHighScore);
                console.log(`Bonus accepted. New high score: ${newHighScore}`);
            } else {
                setScore(score);
                console.log("Bonus declined. Setting score normally.");
            }
        } else {
            setScore(score);
            await setHighScore(score);
            console.log("Setting score and high score directly.");
        }
    };

    document.getElementById('storage-btn').onclick = async () => {
        console.log("Dumping storage...");
        const data = await getStorageData();
        console.log("--- localStorage ---");
        console.log(data.localStorage);
        console.log("--- IndexedDB ---");
        console.log(data.indexedDB);
    };

    window.addEventListener('keydown', (e) => {
        if (e.key === '&') adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none';
        if (e.key === '`') logContainer.style.display = logContainer.style.display === 'none' ? 'flex' : 'none';
    });

})();
