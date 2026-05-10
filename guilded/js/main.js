import { Utils } from './utils.js';
import { AppState, resetAppState } from './state.js';
import { UIManager } from './ui-manager.js';
import { auth, onAuthStateChanged, signOut, rtdb, ref, set } from './firebase.js';
import { AuthController } from './auth.js';
import { ServerController } from './server.js';
import { PresenceController } from './presence.js';
import { DatabaseController } from './database.js';
import { VoiceController } from './voice.js';

// FEATURE #8: Reply helper functions (exposed globally for inline onclick)
function setReply(msgId, username, content) {
    AppState.replyTo = { id: msgId, username, content };
    const preview = Utils.$('#reply-preview');
    const replyUser = Utils.$('#reply-username');
    const replyContent = Utils.$('#reply-content');
    if (preview) preview.style.display = 'flex';
    if (replyUser) replyUser.innerText = `Replying to @${username}`;
    if (replyContent) replyContent.innerText = content.slice(0, 80);
    Utils.$('#chat-input')?.focus();
}

function cancelReply() {
    AppState.replyTo = null;
    const preview = Utils.$('#reply-preview');
    if (preview) preview.style.display = 'none';
}

window.setReply = setReply;
window.cancelReply = cancelReply;

function initializeEventListeners() {
    // =========================================================================
    // Authentication Events
    // =========================================================================
    Utils.on(Utils.$('#auth-form'), 'submit', AuthController.handleAuthSubmit);
    Utils.on(Utils.$('#auth-toggle-link'), 'click', AuthController.toggleMode);
    Utils.on(Utils.$('#btn-logout'), 'click', () => signOut(auth));
    Utils.on(Utils.$('#btn-save-user-settings'), 'click', () => AuthController.updateProfile());

    // =========================================================================
    // Image Upload
    // =========================================================================
    const imgInput = Utils.$('#img-upload-input');
    Utils.on(Utils.$('#btn-upload-img'), 'click', () => imgInput?.click());
    Utils.on(imgInput, 'change', (e) => {
        const file = e.target.files[0];
        if (file) {
            DatabaseController.handleImageUpload(file);
            e.target.value = '';
        }
    });

    // =========================================================================
    // Chat Input
    // =========================================================================
    const chatInput = Utils.$('#chat-input');

    Utils.on(chatInput, 'keydown', async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (text === '') return;

            // Theme command
            if (text.startsWith('/theme ')) {
                const theme = text.split(' ')[1];
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('guilded-theme', theme);
                UIManager.showToast(`Theme changed to ${theme}`, 'info');
                chatInput.value = '';
                chatInput.style.height = 'auto';
                return;
            }

            // FIX #4: Only clear input AFTER successful send
            const sent = await DatabaseController.sendMessage(text);
            if (sent !== false) {
                chatInput.value = '';
                chatInput.style.height = 'auto';
                cancelReply();
                // Clear typing indicator
                if (AppState.user && AppState.currentServer && AppState.currentChannel) {
                    const typingRef = ref(rtdb, `/typing/${AppState.currentServer.id}/${AppState.currentChannel}/${AppState.user.uid}`);
                    set(typingRef, null).catch(() => {});
                }
            }
        }
    });

    // Auto-resize textarea
    Utils.on(chatInput, 'input', () => {
        if (chatInput) {
            chatInput.style.height = 'auto';
            chatInput.style.height = chatInput.scrollHeight + 'px';
        }

        // FEATURE #5: Dispatch typing indicator to RTDB
        if (AppState.user && AppState.currentServer && AppState.currentChannel) {
            const typingRef = ref(rtdb, `/typing/${AppState.currentServer.id}/${AppState.currentChannel}/${AppState.user.uid}`);
            set(typingRef, {
                name: AppState.user.displayName || AppState.user.email.split('@')[0],
                t: Date.now()
            }).catch(() => {});

            clearTimeout(AppState.typingTimeout);
            AppState.typingTimeout = setTimeout(() => {
                set(typingRef, null).catch(() => {});
            }, 3000);
        }
    });

    // =========================================================================
    // Global Click Handler (close dropdowns/modals)
    // =========================================================================
    document.addEventListener('click', () => UIManager.closeAllModals());

    // =========================================================================
    // Server Dropdown
    // =========================================================================
    Utils.on(Utils.$('#server-header-btn'), 'click', (e) => {
        e.stopPropagation();
        UIManager.toggleDropdown('server-dropdown');
    });

    Utils.on(Utils.$('#btn-server-invite'), 'click', () => {
        if (!AppState.currentServer) return;
        navigator.clipboard.writeText(AppState.currentServer.inviteCode);
        UIManager.showToast("Invite code copied!", 'success');
    });

    Utils.on(Utils.$('#btn-server-settings'), 'click', () => {
        if (!AppState.currentServer) return;
        if (AppState.currentServer.ownerId !== AppState.user.uid) {
            UIManager.showToast("Only the Owner can access settings.", 'error');
            return;
        }
        const nameInput = Utils.$('#settings-server-name');
        const codeInput = Utils.$('#settings-invite-code');
        if (nameInput) nameInput.value = AppState.currentServer.name;
        if (codeInput) codeInput.value = AppState.currentServer.inviteCode;
        UIManager.openModal('modal-server-settings');
    });

    Utils.on(Utils.$('#btn-server-leave'), 'click', () => {
        if (!AppState.currentServer) return;
        ServerController.leaveServer();
    });

    // =========================================================================
    // Status Picker
    // =========================================================================
    Utils.on(Utils.$('#btn-open-status'), 'click', (e) => {
        e.stopPropagation();
        UIManager.toggleDropdown('status-picker');
    });

    Utils.$$('.status-option').forEach(opt => {
        Utils.on(opt, 'click', (e) => {
            const status = e.currentTarget.getAttribute('data-status');
            PresenceController.setStatus(status);
            const picker = Utils.$('#status-picker');
            if (picker) picker.style.display = 'none';
        });
    });

    // =========================================================================
    // User Settings
    // =========================================================================
    Utils.on(Utils.$('#btn-open-user-settings'), 'click', (e) => {
        e.stopPropagation();
        const usernameInput = Utils.$('#settings-username');
        const themeSelect = Utils.$('#settings-theme');
        if (usernameInput) usernameInput.value = AppState.user?.displayName || '';
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'midnight';
        if (themeSelect) themeSelect.value = currentTheme;
        // Update active swatch
        Utils.$$('.theme-swatch').forEach(s => {
            s.classList.toggle('active', s.getAttribute('data-theme') === currentTheme);
        });
        UIManager.openModal('modal-user-settings');
    });

    // FEATURE #13: Visual theme swatch clicks
    Utils.$$('.theme-swatch').forEach(swatch => {
        Utils.on(swatch, 'click', (e) => {
            e.stopPropagation();
            const theme = swatch.getAttribute('data-theme');
            if (!theme) return;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('guilded-theme', theme);
            const themeSelect = Utils.$('#settings-theme');
            if (themeSelect) themeSelect.value = theme;
            Utils.$$('.theme-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            UIManager.showToast(`Theme: ${theme}`, 'info');
        });
    });

    // =========================================================================
    // Modal Close Buttons
    // =========================================================================
    Utils.on(Utils.$('#btn-close-add-server'), 'click', () => UIManager.closeModal('modal-add-server'));
    Utils.on(Utils.$('#btn-close-create-channel'), 'click', () => UIManager.closeModal('modal-create-channel'));
    Utils.on(Utils.$('#btn-close-server-settings'), 'click', () => UIManager.closeModal('modal-server-settings'));
    Utils.on(Utils.$('#btn-close-manage-member'), 'click', () => UIManager.closeModal('modal-manage-member'));
    Utils.on(Utils.$('#btn-close-user-settings'), 'click', () => UIManager.closeModal('modal-user-settings'));
    Utils.on(Utils.$('#btn-close-shortcuts'), 'click', () => UIManager.closeModal('modal-shortcuts'));

    Utils.$$('.modal-overlay').forEach(m => Utils.on(m, 'click', (e) => e.stopPropagation()));
    Utils.$$('.modal-content').forEach(m => Utils.on(m, 'click', (e) => e.stopPropagation()));

    // =========================================================================
    // Server / Channel Actions
    // =========================================================================
    Utils.on(Utils.$('#btn-add-server'), 'click', (e) => {
        e.stopPropagation();
        UIManager.openModal('modal-add-server');
    });

    Utils.on(Utils.$('#btn-submit-join'), 'click', () => {
        const code = Utils.$('#input-invite-code')?.value;
        if (code) ServerController.joinServer(code);
    });

    Utils.on(Utils.$('#btn-submit-create'), 'click', () => {
        const name = Utils.$('#input-create-server')?.value;
        if (name) ServerController.createServer(name);
    });

    Utils.on(Utils.$('#btn-submit-channel'), 'click', () => {
        const name = Utils.$('#input-channel-name')?.value;
        const type = Utils.$('#input-channel-type')?.value;
        if (name && type) ServerController.createChannel(name, type);
    });

    // =========================================================================
    // Server Settings Actions
    // =========================================================================
    Utils.on(Utils.$('#btn-save-server-settings'), 'click', () => ServerController.saveServerSettings());

    Utils.on(Utils.$('#btn-create-role'), 'click', () => {
        if (!AppState.currentServer) return;
        const name = Utils.$('#input-role-name')?.value;
        const color = Utils.$('#input-role-color')?.value;
        if (name && color) {
            ServerController.addRole(name, color);
            const input = Utils.$('#input-role-name');
            if (input) input.value = '';
        }
    });

    Utils.on(Utils.$('#btn-save-member-role'), 'click', () => ServerController.saveMemberRole());

    // =========================================================================
    // Voice Controls
    // =========================================================================
    Utils.on(Utils.$('#btn-disconnect-voice'), 'click', () => VoiceController.leaveVoice());

    // =========================================================================
    // FEATURE #8: Reply cancel
    // =========================================================================
    Utils.on(Utils.$('#btn-cancel-reply'), 'click', cancelReply);

    // =========================================================================
    // FEATURE #14: Message Search
    // =========================================================================
    Utils.on(Utils.$('#btn-search'), 'click', (e) => {
        e.stopPropagation();
        const bar = Utils.$('#search-bar');
        if (!bar) return;
        const isOpen = bar.style.display === 'flex';
        bar.style.display = isOpen ? 'none' : 'flex';
        if (!isOpen) Utils.$('#search-input')?.focus();
    });

    Utils.on(Utils.$('#search-input'), 'input', (e) => {
        UIManager.searchMessages(e.target.value);
    });

    Utils.on(Utils.$('#btn-clear-search'), 'click', () => {
        const si = Utils.$('#search-input');
        if (si) si.value = '';
        UIManager.searchMessages('');
        const bar = Utils.$('#search-bar');
        if (bar) bar.style.display = 'none';
    });

    // =========================================================================
    // FEATURE #16: Emoji Picker
    // =========================================================================
    Utils.on(Utils.$('#btn-emoji'), 'click', (e) => {
        e.stopPropagation();
        UIManager.toggleDropdown('emoji-picker');
    });

    Utils.$$('.emoji-btn').forEach(btn => {
        Utils.on(btn, 'click', (e) => {
            e.stopPropagation();
            const emoji = btn.textContent;
            const input = Utils.$('#chat-input');
            if (input) {
                const pos = input.selectionStart || input.value.length;
                const val = input.value;
                input.value = val.slice(0, pos) + emoji + val.slice(pos);
                input.selectionStart = input.selectionEnd = pos + emoji.length;
                input.focus();
            }
            const picker = Utils.$('#emoji-picker');
            if (picker) picker.style.display = 'none';
        });
    });

    // =========================================================================
    // Keyboard Shortcuts
    // =========================================================================
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            UIManager.closeAllModals();
            cancelReply();
        }
        // FEATURE #18: Show shortcuts modal with ?
        if (e.key === '?' && !e.target.matches('input, textarea, select')) {
            e.preventDefault();
            UIManager.openModal('modal-shortcuts');
        }
    });
}

function handleAuthStateChange(user) {
    UIManager.closeAllModals();

    if (user) {
        AppState.user = user;
        UIManager.switchScreen('app');

        (async () => {
            await ServerController.bootstrapAdminServer();
            PresenceController.initialize();
            ServerController.syncUserServers();
        })();
    } else {
        resetAppState();
        VoiceController.leaveVoice();
        UIManager.switchScreen('auth');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    AuthController.loadSavedTheme();
    initializeEventListeners();
    onAuthStateChanged(auth, handleAuthStateChange);
});

if (typeof window !== 'undefined') {
    window.AppState = AppState;
    window.ServerController = ServerController;
    window.DatabaseController = DatabaseController;
}
