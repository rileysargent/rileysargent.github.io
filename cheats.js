
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

function getFILE_DATA(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["FILE_DATA"], "readwrite");
        const objectStore = transaction.objectStore("FILE_DATA");
        const request = objectStore.get("/data/bd/ സ്റ്റോറേജ്");
        request.onerror = (event) => {
            reject("Error getting FILE_DATA: " + event.target.errorCode);
        };
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
    });
}

function updateFILE_DATA(db, fileData, score) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["FILE_DATA"], "readwrite");
        const objectStore = transaction.objectStore("FILE_DATA");

        const decodedData = atob(atob(fileData.contents));
        const originalScore = decodedData.match(/"highScore":(\d+)/)[1];
        const modifiedData = decodedData.replace(/"highScore":(\d+)/, `"highScore":${score}`);

        fileData.contents = btoa(btoa(modifiedData));

        const request = objectStore.put(fileData);
        request.onerror = (event) => {
            reject("Error updating FILE_DATA: " + event.target.errorCode);
        };
        request.onsuccess = (event) => {
            console.log("Successfully updated high score in IndexedDB!");
            resolve();
        };
    });
}

window.setHighScore = async (score) => {
    try {
        const db = await getIDB();
        const fileData = await getFILE_DATA(db);
        if (fileData) {
            await updateFILE_DATA(db, fileData, score);
        } else {
            console.error("FILE_DATA not found in IndexedDB.");
        }
    } catch (error) {
        console.error("Error setting high score:", error);
    }
};
