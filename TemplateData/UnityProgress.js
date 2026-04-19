const rootPath = 'TemplateData';
function UnityProgress(gameInstance, progress) {
    if (!gameInstance.Module) return;
    
    // --- FS HOOK ---
    if (!window.auditInitialized && gameInstance.Module.FS) {
        const originalSync = gameInstance.Module.FS.syncfs;
        gameInstance.Module.FS.syncfs = function(populate, callback) {
            console.log(`%c[FS_SYNC] ${populate ? 'READ' : 'WRITE'}`, "color: #ff0");
            return originalSync.apply(this, arguments);
        };
        window.auditInitialized = true;
    }

    // --- RENDER LOGIC (Condensed for brevity, same as yours) ---
    if (!gameInstance.progress) {
        // ... (Insert your current DOM creation logic here) ...
    }
    // ... (Insert your current progress.full.style.width logic here) ...
}
