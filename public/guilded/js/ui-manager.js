/**
 * UI Manager Module
 * Handles all UI-related operations: toasts, modals, screen switching
 */

import { Utils } from './utils.js';

export class UIManager {
    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type ('info', 'success', 'error')
     */
    static showToast(message, type = 'info') {
        const container = Utils.$('#toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = message;
        
        // Set border color based on type
        const colors = {
            info: 'var(--accent-primary)',
            success: 'var(--status-online)',
            error: 'var(--status-dnd)'
        };
        toast.style.borderLeftColor = colors[type] || colors.info;
        
        container.appendChild(toast);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Switch between auth and app screens
     * @param {string} screen - 'auth' or 'app'
     */
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
            // Small delay to trigger CSS transition
            setTimeout(() => {
                appScreen.style.opacity = '1';
            }, 50);
        }
    }

    /**
     * Open a modal by ID
     * @param {string} id - Modal element ID
     */
    static openModal(id) {
        const modal = Utils.$('#' + id);
        if (!modal) return;
        
        modal.style.display = 'flex';
        
        // Trigger animation
        setTimeout(() => {
            modal.style.opacity = '1';
            const content = modal.querySelector('.modal-content');
            if (content) {
                content.style.transform = 'scale(1)';
            }
        }, 10);
        
        // Focus first input if available
        const firstInput = modal.querySelector('input:not([type="hidden"]):not([readonly])');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    /**
     * Close a modal by ID
     * @param {string} id - Modal element ID
     */
    static closeModal(id) {
        const modal = Utils.$('#' + id);
        if (!modal) return;
        
        modal.style.opacity = '0';
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(0.95)';
        }
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }

    /**
     * Close all open modals and dropdowns
     */
    static closeAllModals() {
        Utils.$$('.modal-overlay').forEach(m => this.closeModal(m.id));
        
        const serverDropdown = Utils.$('#server-dropdown');
        const statusPicker = Utils.$('#status-picker');
        
        if (serverDropdown) serverDropdown.style.display = 'none';
        if (statusPicker) statusPicker.style.display = 'none';
    }

    /**
     * Toggle dropdown visibility
     * @param {string} id - Dropdown element ID
     */
    static toggleDropdown(id) {
        const dropdown = Utils.$('#' + id);
        if (!dropdown) return;
        
        dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
    }

    /**
     * Update chat header with channel name
     * @param {string} channelName - Channel name to display
     */
    static updateChatHeader(channelName) {
        const header = Utils.$('#current-channel-header');
        if (header) {
            header.innerText = channelName;
        }
    }

    /**
     * Update server header with server name
     * @param {string} serverName - Server name to display
     */
    static updateServerHeader(serverName) {
        const header = Utils.$('#server-header-name');
        if (header) {
            header.innerText = serverName;
        }
    }

    /**
     * Clear dynamic content areas
     */
    static clearDynamicContent() {
        const channelList = Utils.$('#dynamic-channel-list');
        const chatHistory = Utils.$('#chat-history');
        const memberList = Utils.$('#dynamic-member-list');
        
        if (channelList) channelList.innerHTML = '';
        if (chatHistory) chatHistory.innerHTML = '';
        if (memberList) memberList.innerHTML = '';
    }
}

// Expose UIManager to window for inline onclick handlers (legacy support)
window.UIManager = UIManager;
