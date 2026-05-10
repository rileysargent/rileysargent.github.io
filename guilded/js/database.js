import { Utils } from './utils.js';
import { AppState } from './state.js';
import { UIManager } from './ui-manager.js';
import {
    db, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp,
    limit, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove
} from './firebase.js';

export class DatabaseController {
    static lastMessageUid = null;
    static lastMessageTime = null;

    // FEATURE #12: Subtle notification sound via Web Audio API
    static playNotificationSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
        } catch (e) { /* audio not supported */ }
    }

    // FEATURE #4 fix: returns false on error so caller can decide whether to clear input
    static async sendMessage(content, isImage = false) {
        if (!AppState.user || !AppState.currentServer || !AppState.currentChannel) return false;

        const msgData = {
            content,
            uid: AppState.user.uid,
            username: AppState.user.displayName || AppState.user.email.split('@')[0],
            timestamp: serverTimestamp(),
            isImage,
        };

        // FEATURE #8: Include reply-to data if replying
        if (AppState.replyTo) {
            msgData.replyTo = {
                id: AppState.replyTo.id,
                username: AppState.replyTo.username,
                content: AppState.replyTo.content.slice(0, 120),
            };
        }

        try {
            const path = `servers/${AppState.currentServer.id}/channels/${AppState.currentChannel}/messages`;
            await addDoc(collection(db, path), msgData);
            return true;
        } catch (e) {
            console.error("Send message error:", e);
            UIManager.showToast("Error sending message.", 'error');
            return false;
        }
    }

    // FEATURE #6: Delete a message
    static async deleteMessage(msgId) {
        if (!AppState.currentServer || !AppState.currentChannel) return;
        try {
            const path = `servers/${AppState.currentServer.id}/channels/${AppState.currentChannel}/messages/${msgId}`;
            await deleteDoc(doc(db, path));
            const el = document.getElementById(msgId);
            if (el) el.remove();
            UIManager.showToast("Message deleted.", 'info');
        } catch (e) {
            UIManager.showToast("Failed to delete message.", 'error');
        }
    }

    // FEATURE #7: Edit a message — replaces text with inline textarea
    static startEdit(msgId, currentContent) {
        const el = document.getElementById(msgId);
        if (!el) return;
        const textEl = el.querySelector('.msg-text');
        if (!textEl) return;

        const original = currentContent;
        textEl.innerHTML = '';
        const input = document.createElement('textarea');
        input.className = 'edit-input';
        input.value = original;
        input.rows = 1;
        textEl.appendChild(input);
        input.focus();
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';

        const saveEdit = async () => {
            const newContent = input.value.trim();
            if (!newContent || newContent === original) {
                textEl.innerHTML = Utils.parseMarkdown(original);
                return;
            }
            try {
                const path = `servers/${AppState.currentServer.id}/channels/${AppState.currentChannel}/messages/${msgId}`;
                await updateDoc(doc(db, path), { content: newContent, edited: true });
                textEl.innerHTML = Utils.parseMarkdown(newContent) + ' <span class="msg-edited">(edited)</span>';
            } catch {
                UIManager.showToast("Failed to edit message.", 'error');
                textEl.innerHTML = Utils.parseMarkdown(original);
            }
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
            if (e.key === 'Escape') { textEl.innerHTML = Utils.parseMarkdown(original); }
        });
        input.addEventListener('blur', saveEdit);
    }

    // FEATURE #17: Toggle emoji reaction on a message
    static async toggleReaction(msgId, emoji) {
        if (!AppState.user || !AppState.currentServer || !AppState.currentChannel) return;
        const path = `servers/${AppState.currentServer.id}/channels/${AppState.currentChannel}/messages/${msgId}`;
        const el = document.getElementById(msgId);
        const hasReacted = el?.querySelector(`.reaction-btn[data-emoji="${emoji}"]`)?.classList.contains('reacted');
        try {
            await updateDoc(doc(db, path), {
                [`reactions.${emoji}`]: hasReacted
                    ? arrayRemove(AppState.user.uid)
                    : arrayUnion(AppState.user.uid)
            });
        } catch (e) { console.error(e); }
    }

    // FEATURE #10: Toggle pin on a message
    static async togglePinMessage(msgId) {
        if (!AppState.currentServer || !AppState.currentChannel) return;
        const el = document.getElementById(msgId);
        const isPinned = el?.getAttribute('data-pinned') === 'true';
        try {
            const path = `servers/${AppState.currentServer.id}/channels/${AppState.currentChannel}/messages/${msgId}`;
            await updateDoc(doc(db, path), { pinned: !isPinned });
            UIManager.showToast(isPinned ? "Message unpinned." : "📌 Message pinned!", 'success');
        } catch {
            UIManager.showToast("Failed to pin message.", 'error');
        }
    }

    static buildReactionsHTML(msgId, reactions) {
        if (!reactions) return '';
        return Object.entries(reactions)
            .filter(([, uids]) => uids && uids.length > 0)
            .map(([emoji, uids]) => {
                const hasReacted = AppState.user && uids.includes(AppState.user.uid);
                return `<button class="reaction-btn ${hasReacted ? 'reacted' : ''}" data-emoji="${emoji}"
                    onclick="DatabaseController.toggleReaction('${msgId}', '${emoji}')">${emoji} <span>${uids.length}</span></button>`;
            }).join('');
    }

    static listenToChannel(channelId) {
        if (!AppState.currentServer) return;

        if (AppState.unsubscribeMessages) AppState.unsubscribeMessages();

        const chatHistory = Utils.$('#chat-history');
        if (chatHistory) chatHistory.innerHTML = '';

        AppState.currentChannel = channelId;

        // Update channel header with the channel name
        const channelObj = AppState.currentServer.channels?.find(c => c.id === channelId);
        UIManager.updateChatHeader(channelObj?.name || channelId);

        this.lastMessageUid = null;
        this.lastMessageTime = null;

        // Update active channel UI + clear unread dot
        Utils.$$('.channel-item').forEach(el => el.classList.remove('active'));
        const activeEl = Utils.$(`.channel-item[data-channel="${channelId}"]`);
        if (activeEl) {
            activeEl.classList.add('active');
            // FEATURE #11: Clear unread dot when channel selected
            activeEl.querySelector('.unread-dot')?.remove();
            localStorage.setItem(`lastRead_${channelId}`, Date.now().toString());
        }

        // FEATURE #5: Start typing listener for this channel
        import('./presence.js').then(({ PresenceController }) => {
            PresenceController.listenToTyping(AppState.currentServer.id, channelId);
        });

        const path = `servers/${AppState.currentServer.id}/channels/${channelId}/messages`;
        const q = query(collection(db, path), orderBy('timestamp', 'asc'), limit(100));

        let isInitialLoad = true;

        AppState.unsubscribeMessages = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    this.renderMessage(change.doc.id, change.doc.data(), !isInitialLoad);
                } else if (change.type === 'modified') {
                    this.updateMessageInDOM(change.doc.id, change.doc.data());
                } else if (change.type === 'removed') {
                    const el = document.getElementById(change.doc.id);
                    if (el) el.remove();
                }
            });
            isInitialLoad = false;
        });

        // FEATURE #11: Watch other channels for unread indicators
        this.watchOtherChannels();
    }

    // FEATURE #11: Show unread dots on channels with new messages
    static watchOtherChannels() {
        const server = AppState.currentServer;
        if (!server) return;

        Object.values(AppState.channelListeners || {}).forEach(fn => fn && fn());
        AppState.channelListeners = {};

        server.channels?.forEach(channel => {
            if (channel.type !== 'text' || channel.id === AppState.currentChannel) return;

            const lastRead = parseInt(localStorage.getItem(`lastRead_${channel.id}`) || '0');
            const path = `servers/${server.id}/channels/${channel.id}/messages`;
            const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(1));

            const unsub = onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const msgTime = change.doc.data().timestamp?.toMillis() || 0;
                        const msgUid = change.doc.data().uid;
                        if (msgTime > lastRead && msgUid !== AppState.user?.uid) {
                            const el = Utils.$(`.channel-item[data-channel="${channel.id}"]`);
                            if (el && !el.querySelector('.unread-dot')) {
                                const dot = document.createElement('div');
                                dot.className = 'unread-dot';
                                el.appendChild(dot);
                            }
                        }
                    }
                });
            });

            AppState.channelListeners[channel.id] = unsub;
        });
    }

    static updateMessageInDOM(id, msg) {
        const el = document.getElementById(id);
        if (!el) return;

        // Update reactions
        const reactionsEl = el.querySelector('.reactions');
        if (reactionsEl) reactionsEl.innerHTML = this.buildReactionsHTML(id, msg.reactions);

        // Update pin state
        el.setAttribute('data-pinned', msg.pinned ? 'true' : 'false');
        el.classList.toggle('pinned-msg', !!msg.pinned);

        // Update edited content (only if not actively being edited)
        const textEl = el.querySelector('.msg-text');
        if (textEl && msg.edited && !textEl.querySelector('.edit-input')) {
            textEl.innerHTML = Utils.parseMarkdown(msg.content) + ' <span class="msg-edited">(edited)</span>';
        }
    }

    static renderMessage(id, msg, isNew = false) {
        if (document.getElementById(id)) return;

        const chatHistory = Utils.$('#chat-history');
        if (!chatHistory) return;

        const msgTime = msg.timestamp ? msg.timestamp.toMillis() : Date.now();
        const isConsecutive = (this.lastMessageUid === msg.uid) && (msgTime - this.lastMessageTime < 300000);

        this.lastMessageUid = msg.uid;
        this.lastMessageTime = msgTime;

        // FEATURE #12: Notification sound for new messages from others
        if (isNew && msg.uid !== AppState.user?.uid) {
            this.playNotificationSound();
        }

        const div = document.createElement('div');
        div.id = id;
        div.setAttribute('data-uid', msg.uid);
        div.setAttribute('data-content', msg.content || '');
        div.setAttribute('data-pinned', msg.pinned ? 'true' : 'false');
        if (msg.pinned) div.classList.add('pinned-msg');

        const payload = msg.isImage
            ? `<img src="${msg.content}" class="msg-image" onclick="window.open(this.src)" alt="Shared image"/>`
            : Utils.parseMarkdown(msg.content);

        let nameColor = 'var(--text-header)';
        const s = AppState.currentServer;
        if (s?.memberRoles?.[msg.uid] && s.roles?.[s.memberRoles[msg.uid]]) {
            nameColor = s.roles[s.memberRoles[msg.uid]].color;
        }

        const isOwn = msg.uid === AppState.user?.uid;

        // FEATURE #19: Full timestamp tooltip on hover
        const fullTimestamp = msg.timestamp ? Utils.formatTimeFull(msg.timestamp) : '';

        // FEATURE #8: Reply quote preview
        const replyHTML = msg.replyTo ? `
            <div class="reply-quote">
                <div class="reply-quote-bar"></div>
                <span class="reply-quote-user">${msg.replyTo.username}</span>
                <span class="reply-quote-text">${(msg.replyTo.content || '').slice(0, 80)}</span>
            </div>` : '';

        // FEATURE #17: Reaction bar
        const reactionsHTML = `<div class="reactions">${this.buildReactionsHTML(id, msg.reactions)}</div>`;

        // Hover action buttons (FEATURES #6, #7, #8, #10, #15)
        const safeContent = JSON.stringify(msg.content || '');
        const safeUser = (msg.username || '').replace(/'/g, "\\'");
        const safePreview = (msg.content || '').replace(/'/g, "\\'").replace(/\n/g, ' ').slice(0, 80);

        const hoverActions = `
            <div class="msg-actions">
                <button class="msg-action-btn" title="React" onclick="UIManager.showQuickReact('${id}', event)">😊</button>
                <button class="msg-action-btn" title="Reply" onclick="window.setReply('${id}','${safeUser}','${safePreview}')">↩</button>
                ${isOwn ? `<button class="msg-action-btn" title="Edit" onclick="DatabaseController.startEdit('${id}',${safeContent})">✏️</button>` : ''}
                ${isOwn ? `<button class="msg-action-btn danger" title="Delete" onclick="DatabaseController.deleteMessage('${id}')">🗑</button>` : ''}
                <button class="msg-action-btn" title="Pin" onclick="DatabaseController.togglePinMessage('${id}')">📌</button>
                <button class="msg-action-btn" title="Copy" onclick="navigator.clipboard.writeText(${safeContent}).then(()=>UIManager.showToast('Copied!','success'))">📋</button>
            </div>`;

        const editedMark = msg.edited ? ' <span class="msg-edited">(edited)</span>' : '';

        if (isConsecutive) {
            div.className = 'message';
            div.innerHTML = `
                ${replyHTML}
                ${hoverActions}
                <div class="msg-content">
                    <div class="msg-text">${payload}${editedMark}</div>
                    ${reactionsHTML}
                </div>`;
        } else {
            div.className = 'message first';
            div.innerHTML = `
                ${replyHTML}
                ${hoverActions}
                <div class="msg-avatar" style="background-color:${Utils.getAvatarColor(msg.username)}">${Utils.getInitials(msg.username)}</div>
                <div class="msg-content">
                    <div class="msg-header">
                        <span class="msg-author" style="color:${nameColor}">${msg.username}</span>
                        <span class="msg-timestamp" title="${fullTimestamp}">${Utils.formatTime(msg.timestamp)}</span>
                    </div>
                    <div class="msg-text">${payload}${editedMark}</div>
                    ${reactionsHTML}
                </div>`;
        }

        chatHistory.appendChild(div);

        const scrollThreshold = chatHistory.scrollHeight - chatHistory.scrollTop <= chatHistory.clientHeight + 400;
        if (scrollThreshold || isOwn) chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    static handleImageUpload(file) {
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            UIManager.showToast("File too large. Max 2MB.", 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => this.sendMessage(ev.target.result, true);
        reader.readAsDataURL(file);
    }
}

window.DatabaseController = DatabaseController;
