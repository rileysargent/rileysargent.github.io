
function getIDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("/idbfs");
        request.onerror = (event) => {
            reject("Error opening IndexedDB: " + event.target.errorCode);
        };
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
    });
}

function getFILE_DATA(db, mode = 'readonly') {
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(["FILE_DATA"], mode);
            const objectStore = transaction.objectStore("FILE_DATA");
            const request = objectStore.get("/data/bd/ സ്റ്റോറേജ്");
            request.onerror = (event) => {
                reject("Error getting FILE_DATA: " + event.target.errorCode);
            };
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        } catch (error) {
            reject(error);
        }
    });
}

window.getHighScore = async () => {
    try {
        const db = await getIDB();
        const fileData = await getFILE_DATA(db);
        if (fileData && fileData.contents) {
            const decodedData = atob(atob(fileData.contents));
            const highScoreMatch = decodedData.match(/"highScore":(\d+)/);
            if (highScoreMatch && highScoreMatch[1]) {
                return parseInt(highScoreMatch[1], 10);
            }
        }
    } catch (error) {
        console.error("Error getting high score:", error);
    }
    return 0; // Default to 0 if not found or on error
};

window.setHighScore = async (score) => {
    try {
        const db = await getIDB();
        const fileData = await getFILE_DATA(db, 'readwrite');
        if (fileData && fileData.contents) {
            const transaction = db.transaction(["FILE_DATA"], "readwrite");
            const objectStore = transaction.objectStore("FILE_DATA");
            
            const decodedData = atob(atob(fileData.contents));
            const modifiedData = decodedData.replace(/"highScore":\d+/, `"highScore":${score}`);

            fileData.contents = btoa(btoa(modifiedData));

            const request = objectStore.put(fileData);
            request.onerror = (event) => {
                console.error("Error updating FILE_DATA: " + event.target.errorCode);
            };
            request.onsuccess = (event) => {
                console.log(`Successfully updated high score to ${score} in IndexedDB!`);
            };
        } else {
            console.error("FILE_DATA not found in IndexedDB.");
        }
    } catch (error) {
        console.error("Error setting high score:", error);
    }
};
