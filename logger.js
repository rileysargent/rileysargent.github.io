window.log = (message, data) => {
    const logContainer = document.getElementById('log-container');
    if (logContainer) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';

        const timestamp = new Date().toISOString();
        const messageEl = document.createElement('div');
        messageEl.className = 'log-message';
        messageEl.textContent = `[${timestamp}] ${message}`;
        entry.appendChild(messageEl);

        if (data) {
            const dataEl = document.createElement('pre');
            dataEl.className = 'log-data';
            dataEl.textContent = JSON.stringify(data, null, 2);
            entry.appendChild(dataEl);
        }

        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    console.log(message, data);
};