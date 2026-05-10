export const Utils = {
    $(selector) { return document.querySelector(selector); },
    $$(selector) { return document.querySelectorAll(selector); },
    on(el, evt, handler) { if (el) el.addEventListener(evt, handler); },
    randomString(len = 6) {
        return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
    },

    parseMarkdown(text) {
        // Escape HTML first
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Bold: **text**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic: *text* (not **)
        html = html.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
        // Strikethrough: ~~text~~
        html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
        // Code: `text`
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        // Markdown links: [text](url)
        html = html.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        // FIX #2: Auto-link bare URLs (not already wrapped in href)
        html = html.replace(/(?<!href=")(https?:\/\/[^\s<>"&]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        // FEATURE #9: Highlight @mentions
        html = html.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
        // Newlines
        html = html.replace(/\n/g, '<br/>');

        return html;
    },

    formatTime(timestamp) {
        if (!timestamp) {
            return `Today at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()}`;
        }
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();

        if (date.toDateString() === now.toDateString()) return `Today at ${time}`;
        if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
        return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${time}`;
    },

    // FEATURE #19: Full timestamp for tooltip on hover
    formatTimeFull(timestamp) {
        if (!timestamp) return new Date().toLocaleString();
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString([], {
            weekday: 'long', year: 'numeric', month: 'long',
            day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    },

    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    },

    getAvatarColor(name) {
        if (!name) return '#5865f2';
        const colors = ['#5865f2','#57f287','#fee75c','#eb459e','#ed4245','#00b0f4','#f47fff'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    },
};
