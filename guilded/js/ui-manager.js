import { Utils } from './utils.js';

const QUICK_REACT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '✅', '👀'];

export class UIManager {
    static showToast(message, type = 'info') {
        const container = Utils.$('#toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = message;

        const colors = {
            info: 'var(--accent-primary)',
            success: 'var(--status-online)',
            error: 'var(--status-dnd)'
        };
        toast.style.borderLeftColor = colors[type] || colors.info;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // FEATURE #14: Filter visible messages by search query
    static searchMessages(query) {
        const q = query.toLowerCase().trim();
        Utils.$$('.message').forEach(msg => {
            const text = msg.querySelector('.msg-text')?.textContent?.toLowerCase() || '';
            const author = msg.querySelector('.msg-author')?.textContent?.toLowerCase() || '';
            msg.style.display = (!q || text.includes(q) || author.includes(q)) ? '' : 'none';
        });
    }

    // FEATURE #17: Show quick emoji reaction picker near the message
    static showQuickReact(msgId, event) {
        event?.stopPropagation();

        let panel = Utils.$('#quick-react-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'quick-react-panel';
            panel.className = 'quick-react-panel';
            document.body.appendChild(panel);
        }

        panel.innerHTML = QUICK_REACT_EMOJIS.map(emoji =>
            `<button class="quick-react-btn" onclick="DatabaseController.toggleReaction('${msgId}','${emoji}');document.getElementById('quick-react-panel').style.display='none'">${emoji}</button>`
        ).join('');

        if (event) {
            const x = Math.min(event.clientX, window.innerWidth - 250);
            const y = Math.max(event.clientY - 55, 8);
            panel.style.left = x + 'px';
            panel.style.top = y + 'px';
        }

        panel.style.display = 'flex';

        setTimeout(() => {
            document.addEventListener('click', () => { panel.style.display = 'none'; }, { once: true });
        }, 50);
    }

    static switchScreen(screen) {
        const authScreen = Utils.$('#auth-screen');
        const appScreen = Utils.$('#app-screen');
        if (!authScreen || !appScreen) return;

        if (screen === 'auth') {
            appScreen.style.opacity = '0';
            setTimeout(() => {
                appScreen.style.display = 'none';
                authScreen.style.display = 'flex';
            }, 400);
        } else {
            authScreen.style.display = 'none';
            appScreen.style.display = 'flex';
            setTimeout(() => { appScreen.style.opacity = '1'; }, 50);
        }
    }

    static openModal(id) {
        const modal = Utils.$('#' + id);
        if (!modal) return;
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.style.opacity = '1';
            const content = modal.querySelector('.modal-content');
            if (content) content.style.transform = 'scale(1)';
        }, 10);
        const firstInput = modal.querySelector('input:not([type="hidden"]):not([readonly])');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
    }

    static closeModal(id) {
        const modal = Utils.$('#' + id);
        if (!modal) return;
        modal.style.opacity = '0';
        const content = modal.querySelector('.modal-content');
        if (content) content.style.transform = 'scale(0.95)';
        setTimeout(() => { modal.style.display = 'none'; }, 200);
    }

    static closeAllModals() {
        Utils.$$('.modal-overlay').forEach(m => this.closeModal(m.id));
        ['server-dropdown', 'status-picker', 'emoji-picker'].forEach(id => {
            const el = Utils.$('#' + id);
            if (el) el.style.display = 'none';
        });
        const qr = Utils.$('#quick-react-panel');
        if (qr) qr.style.display = 'none';
    }

    static toggleDropdown(id) {
        const dropdown = Utils.$('#' + id);
        if (!dropdown) return;
        dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
    }

    static updateChatHeader(channelName) {
        const header = Utils.$('#current-channel-header');
        if (header) header.innerText = channelName;
    }

    static updateServerHeader(serverName) {
        const header = Utils.$('#server-header-name');
        if (header) header.innerText = serverName;
    }

    static clearDynamicContent() {
        const channelList = Utils.$('#dynamic-channel-list');
        const chatHistory = Utils.$('#chat-history');
        const memberList = Utils.$('#dynamic-member-list');
        if (channelList) channelList.innerHTML = '';
        if (chatHistory) chatHistory.innerHTML = '';
        if (memberList) memberList.innerHTML = '';
    }
}

window.UIManager = UIManager;
