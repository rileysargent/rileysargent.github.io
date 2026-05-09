/**
 * Utils Module
 * Utility functions for DOM manipulation, text formatting, and helper methods
 */

export const Utils = {
    /**
     * Query selector shorthand
     * @param {string} selector - CSS selector
     * @returns {Element|null}
     */
    $(selector) {
        return document.querySelector(selector);
    },

    /**
     * Query selector all shorthand
     * @param {string} selector - CSS selector
     * @returns {NodeList}
     */
    $$(selector) {
        return document.querySelectorAll(selector);
    },

    /**
     * Add event listener with null check
     * @param {Element|null} el - DOM element
     * @param {string} evt - Event name
     * @param {Function} handler - Event handler
     */
    on(el, evt, handler) {
        if (el) el.addEventListener(evt, handler);
    },

    /**
     * Generate random string for invite codes
     * @param {number} len - Length of string
     * @returns {string}
     */
    randomString(len = 6) {
        return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
    },

    /**
     * Parse markdown-like syntax to HTML
     * @param {string} text - Input text
     * @returns {string} - HTML string
     */
    parseMarkdown(text) {
        // Escape HTML entities first
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Bold: **text**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic: *text*
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Strikethrough: ~~text~~
        html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
        
        // Code: `text`
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Links: [text](url)
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Newlines
        html = html.replace(/\n/g, '<br/>');
        
        return html;
    },

    /**
     * Format timestamp to human-readable string
     * @param {Object|null} timestamp - Firestore timestamp
     * @returns {string}
     */
    formatTime(timestamp) {
        if (!timestamp) {
            return `Today at ${new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            }).toLowerCase()}`;
        }
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const isToday = new Date().toDateString() === date.toDateString();
        const timeStr = date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        }).toLowerCase();
        
        return isToday ? `Today at ${timeStr}` : `${date.toLocaleDateString()} ${timeStr}`;
    },

    /**
     * Get consistent avatar color based on string hash
     * @param {string} str - Input string (usually username)
     * @returns {string} - CSS color value
     */
    getAvatarColor(str) {
        const colors = [
            '#f59e0b', // Amber
            '#10b981', // Emerald
            '#3b82f6', // Blue
            '#ef4444', // Red
            '#8b5cf6', // Violet
            '#ec4899', // Pink
            '#f97316', // Orange
            '#14b8a6'  // Teal
        ];
        
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    },

    /**
     * Get initials from name
     * @param {string} name - User name
     * @returns {string} - First character uppercase
     */
    getInitials(name) {
        return name ? name.charAt(0).toUpperCase() : '?';
    },

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Escape HTML entities for safe display
     * @param {string} str - Input string
     * @returns {string}
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
