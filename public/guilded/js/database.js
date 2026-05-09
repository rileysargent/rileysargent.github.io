/**
 * Database Controller Module
 * Handles chat messages, real-time sync, and message rendering
 */

import { Utils } from './utils.js';
import { AppState } from './state.js';
import { UIManager } from './ui-manager.js';
import { 
    db, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp, 
    limit 
} from './firebase.js';

export class DatabaseController {
    // Track last message for grouping consecutive messages
    static lastMessageUid = null;
    static lastMessageTime = null;

    /**
     * Send a message to the current channel
     * @param {string} content - Message content or image data URL
     * @param {boolean} isImage - Whether the content is an image
     */
    static async sendMessage(content, isImage = false) {
        if (!AppState.user || !AppState.currentServer || !AppState.currentChannel) {
            return;
        }
        
        try {
            const path = `servers/${AppState.currentServer.id}/channels/${AppState.currentChannel}/messages`;
            
            await addDoc(collection(db, path), {
                content: content,
                uid: AppState.user.uid,
                username: AppState.user.displayName || AppState.user.email.split('@')[0],
                timestamp: serverTimestamp(),
                isImage: isImage
            });
        } catch (e) {
            console.error("Send message error:", e);
            UIManager.showToast("Error sending message.", 'error');
        }
    }

    /**
     * Listen to messages in a specific channel
     * @param {string} channelId - Channel ID to listen to
     */
    static listenToChannel(channelId) {
        if (!AppState.currentServer) return;
        
        // Cleanup existing subscription
        if (AppState.unsubscribeMessages) {
            AppState.unsubscribeMessages();
        }
        
        const chatHistory = Utils.$('#chat-history');
        if (chatHistory) {
            chatHistory.innerHTML = '';
        }
        
        AppState.currentChannel = channelId;
        UIManager.updateChatHeader(channelId);
        
        // Reset message grouping state
        this.lastMessageUid = null;
        this.lastMessageTime = null;
        
        // Update channel selection UI
        Utils.$$('.channel-item').forEach(el => el.classList.remove('active'));
        const activeEl = Utils.$(`.channel-item[data-channel="${channelId}"]`);
        if (activeEl) activeEl.classList.add('active');
        
        // Setup Firestore listener
        const path = `servers/${AppState.currentServer.id}/channels/${channelId}/messages`;
        const q = query(collection(db, path), orderBy('timestamp', 'asc'), limit(100));
        
        AppState.unsubscribeMessages = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    this.renderMessage(change.doc.id, change.doc.data());
                }
            });
        });
    }

    /**
     * Render a single message to the chat history
     * @param {string} id - Message document ID
     * @param {Object} msg - Message data
     */
    static renderMessage(id, msg) {
        // Prevent duplicate rendering
        if (Utils.$(`#${id}`)) return;
        
        const chatHistory = Utils.$('#chat-history');
        if (!chatHistory) return;
        
        const msgTime = msg.timestamp ? msg.timestamp.toMillis() : Date.now();
        
        // Check if this message should be grouped with the previous one
        // Group if same user and within 5 minutes
        const isConsecutive = (this.lastMessageUid === msg.uid) && 
                             (msgTime - this.lastMessageTime < 300000);
        
        // Update tracking state
        this.lastMessageUid = msg.uid;
        this.lastMessageTime = msgTime;

        const div = document.createElement('div');
        div.id = id;
        
        // Format message content (image or text)
        const payload = msg.isImage 
            ? `<img src="${msg.content}" class="msg-image" onclick="window.open(this.src)" alt="Shared image"/>`
            : Utils.parseMarkdown(msg.content);
        
        // Get role color for username
        let nameColor = 'var(--text-header)';
        const s = AppState.currentServer;
        if (s && s.memberRoles[msg.uid] && s.roles[s.memberRoles[msg.uid]]) {
            nameColor = s.roles[s.memberRoles[msg.uid]].color;
        }

        if (isConsecutive) {
            // Compact message (no avatar/header)
            div.className = 'message';
            div.innerHTML = `
                <div class="msg-content">
                    <div class="msg-text">${payload}</div>
                </div>
            `;
        } else {
            // Full message with avatar and header
            div.className = 'message first';
            div.innerHTML = `
                <div class="msg-avatar" style="background-color: ${Utils.getAvatarColor(msg.username)}">
                    ${Utils.getInitials(msg.username)}
                </div>
                <div class="msg-content">
                    <div class="msg-header">
                        <span class="msg-author" style="color:${nameColor}">${msg.username}</span>
                        <span class="msg-timestamp">${Utils.formatTime(msg.timestamp)}</span>
                    </div>
                    <div class="msg-text">${payload}</div>
                </div>
            `;
        }
        
        chatHistory.appendChild(div);
        
        // Auto-scroll if near bottom or if it's the user's own message
        const scrollThreshold = chatHistory.scrollHeight - chatHistory.scrollTop <= chatHistory.clientHeight + 400;
        const isOwnMessage = msg.uid === AppState.user?.uid;
        
        if (scrollThreshold || isOwnMessage) {
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }
    }

    /**
     * Handle image upload
     * @param {File} file - Image file to upload
     */
    static handleImageUpload(file) {
        if (!file) return;
        
        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            UIManager.showToast("File too large. Max 2MB.", 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            this.sendMessage(ev.target.result, true);
        };
        reader.readAsDataURL(file);
    }
}
