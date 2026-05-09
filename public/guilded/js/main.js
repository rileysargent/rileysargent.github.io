/**
 * Main Bootstrap Module
 * Application entry point - sets up event listeners and initializes the app
 */

import { Utils } from './utils.js';
import { AppState, resetAppState } from './state.js';
import { UIManager } from './ui-manager.js';
import { auth, onAuthStateChanged, signOut, updateDoc, doc, db } from './firebase.js';
import { AuthController } from './auth.js';
import { ServerController } from './server.js';
import { PresenceController } from './presence.js';
import { DatabaseController } from './database.js';
import { VoiceController } from './voice.js';

/**
 * Initialize all event listeners
 */
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
            e.target.value = ''; // Reset input
        }
    });

    // =========================================================================
    // Chat Input
    // =========================================================================
    const chatInput = Utils.$('#chat-input');
    Utils.on(chatInput, 'keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const text = chatInput.value.trim();
            chatInput.value = '';
            chatInput.style.height = 'auto';
            
            if (text === '') return;
            
            // Theme command support
            if (text.startsWith('/theme ')) {
                const theme = text.split(' ')[1];
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('guilded-theme', theme);
                UIManager.showToast(`Theme changed to ${theme}`, 'info');
                return;
            }
            
            DatabaseController.sendMessage(text);
        }
    });
    
    // Auto-resize textarea
    Utils.on(chatInput, 'input', () => {
        if (chatInput) {
            chatInput.style.height = 'auto';
            chatInput.style.height = chatInput.scrollHeight + 'px';
        }
    });

    // =========================================================================
    // Global Click Handler (Close modals/dropdowns)
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
        UIManager.showToast("Invite code copied to clipboard!", 'success');
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
            Utils.$('#status-picker').style.display = 'none';
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
        if (themeSelect) themeSelect.value = document.documentElement.getAttribute('data-theme') || 'midnight';
        
        UIManager.openModal('modal-user-settings');
    });

    // =========================================================================
    // Modal Close Buttons
    // =========================================================================
    Utils.on(Utils.$('#btn-close-add-server'), 'click', () => UIManager.closeModal('modal-add-server'));
    Utils.on(Utils.$('#btn-close-create-channel'), 'click', () => UIManager.closeModal('modal-create-channel'));
    Utils.on(Utils.$('#btn-close-server-settings'), 'click', () => UIManager.closeModal('modal-server-settings'));
    Utils.on(Utils.$('#btn-close-manage-member'), 'click', () => UIManager.closeModal('modal-manage-member'));
    Utils.on(Utils.$('#btn-close-user-settings'), 'click', () => UIManager.closeModal('modal-user-settings'));

    // =========================================================================
    // Prevent modal close when clicking inside modal content
    // =========================================================================
    Utils.$$('.modal-overlay').forEach(m => {
        Utils.on(m, 'click', (e) => e.stopPropagation());
    });
    Utils.$$('.modal-content').forEach(m => {
        Utils.on(m, 'click', (e) => e.stopPropagation());
    });

    // =========================================================================
    // Server/Channel Actions
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
    Utils.on(Utils.$('#btn-save-server-settings'), 'click', () => {
        ServerController.saveServerSettings();
    });
    
    Utils.on(Utils.$('#btn-create-role'), 'click', () => {
        if (!AppState.currentServer) return;
        const name = Utils.$('#input-role-name')?.value;
        const color = Utils.$('#input-role-color')?.value;
        if (name && color) {
            ServerController.addRole(name, color);
            Utils.$('#input-role-name').value = '';
        }
    });
    
    Utils.on(Utils.$('#btn-save-member-role'), 'click', () => {
        ServerController.saveMemberRole();
    });

    // =========================================================================
    // Voice Controls
    // =========================================================================
    Utils.on(Utils.$('#btn-disconnect-voice'), 'click', () => {
        VoiceController.leaveVoice();
    });

    // =========================================================================
    // Keyboard Shortcuts
    // =========================================================================
    document.addEventListener('keydown', (e) => {
        // ESC to close modals
        if (e.key === 'Escape') {
            UIManager.closeAllModals();
        }
    });
}

/**
 * Handle authentication state changes
 */
function handleAuthStateChange(user) {
    UIManager.closeAllModals();
    
    if (user) {
        // User is logged in
        AppState.user = user;
        UIManager.switchScreen('app');
        
        // Initialize the app
        (async () => {
            await ServerController.bootstrapAdminServer();
            PresenceController.initialize();
            ServerController.syncUserServers();
        })();
    } else {
        // User is logged out
        resetAppState();
        VoiceController.leaveVoice();
        UIManager.switchScreen('auth');
    }
}

/**
 * Application bootstrap
 */
window.addEventListener('DOMContentLoaded', () => {
    // Load saved theme preference
    AuthController.loadSavedTheme();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Setup auth state observer
    onAuthStateChanged(auth, handleAuthStateChange);
});

// Expose classes to window for debugging (optional)
if (typeof window !== 'undefined') {
    window.AppState = AppState;
    window.ServerController = ServerController;
    window.DatabaseController = DatabaseController;
}
