/**
 * Presence Controller Module
 * Handles user presence/status and member sidebar rendering
 */

import { Utils } from './utils.js';
import { AppState } from './state.js';
import { UIManager } from './ui-manager.js';
import { rtdb, ref, onValue, set, onDisconnect } from './firebase.js';

export class PresenceController {
    static myStatusRef = null;
    static baseState = null;

    /**
     * Initialize presence system for current user
     */
    static initialize() {
        if (!AppState.user) return;
        
        this.myStatusRef = ref(rtdb, `/status/${AppState.user.uid}`);
        this.baseState = {
            name: AppState.user.displayName || AppState.user.email.split('@')[0],
            uid: AppState.user.uid
        };

        // Monitor connection state
        onValue(ref(rtdb, ".info/connected"), (snap) => {
            if (snap.val() === true) {
                // Setup disconnect handler
                onDisconnect(this.myStatusRef)
                    .set({
                        ...this.baseState,
                        state: 'Offline',
                        lastChanged: Date.now()
                    })
                    .then(() => this.setStatus('Online'));
            }
        });

        // Listen to all presence data
        onValue(ref(rtdb, '/status'), (snapshot) => {
            AppState.rtdbPresence = snapshot.val() || {};
            this.renderMemberSidebar();
        });
    }

    /**
     * Set user's online status
     * @param {string} statusStr - Status string ('Online', 'Away', 'DND', 'Offline')
     */
    static setStatus(statusStr) {
        if (!this.myStatusRef || !this.baseState) return;
        
        set(this.myStatusRef, {
            ...this.baseState,
            state: statusStr,
            lastChanged: Date.now()
        }).catch(() => null);
        
        // Update local UI
        const colorMap = {
            'Online': 'var(--status-online)',
            'Away': 'var(--status-idle)',
            'DND': 'var(--status-dnd)',
            'Offline': 'var(--status-offline)'
        };
        
        const myStatus = Utils.$('#my-status');
        const myUsername = Utils.$('#my-username');
        const mySubtext = Utils.$('#my-subtext');
        const myAvatar = Utils.$('#my-avatar');
        
        if (myStatus) myStatus.style.backgroundColor = colorMap[statusStr];
        if (myUsername) myUsername.innerText = this.baseState.name;
        if (mySubtext) mySubtext.innerText = statusStr;
        if (myAvatar) {
            myAvatar.innerText = Utils.getInitials(this.baseState.name);
            myAvatar.style.backgroundColor = Utils.getAvatarColor(this.baseState.name);
        }
    }

    /**
     * Render the member sidebar with grouped roles
     */
    static renderMemberSidebar() {
        const s = AppState.currentServer;
        if (!s || !AppState.rtdbPresence) return;
        
        const list = Utils.$('#dynamic-member-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        // Group members by role
        const grouped = {};
        Object.keys(s.roles).forEach(rId => {
            grouped[rId] = [];
        });
        
        s.members.forEach(uid => {
            const rtdbUser = AppState.rtdbPresence[uid] || { 
                name: 'Unknown', 
                state: 'Offline' 
            };
            const roleId = s.memberRoles[uid] || 'default';
            
            if (!grouped[roleId]) {
                grouped[roleId] = [];
            }
            
            grouped[roleId].push({ ...rtdbUser, uid });
        });

        // Render each role group
        Object.entries(grouped).forEach(([roleId, members]) => {
            if (members.length === 0) return;
            
            const roleData = s.roles[roleId];
            if (!roleData) return;
            
            const groupDiv = document.createElement('div');
            groupDiv.className = 'role-group';
            groupDiv.innerHTML = `
                <div class="role-header">${roleData.name} — ${members.length}</div>
            `;
            
            members.forEach(user => {
                const colorMap = {
                    'Online': 'var(--status-online)',
                    'Away': 'var(--status-idle)',
                    'DND': 'var(--status-dnd)',
                    'Offline': 'transparent'
                };
                
                const item = document.createElement('div');
                item.className = `member-item ${user.state === 'Offline' ? 'offline' : ''}`;
                item.setAttribute('role', 'listitem');
                item.innerHTML = `
                    <div class="member-avatar-box" style="background-color: ${Utils.getAvatarColor(user.name)}">
                        ${Utils.getInitials(user.name)}
                        <div class="member-status-dot" style="background-color: ${colorMap[user.state]}; border-color: ${user.state === 'Offline' ? 'transparent' : 'var(--bg-sidebar)'}"></div>
                    </div>
                    <div class="member-name" style="color: ${roleData.color}">${user.name}</div>
                `;
                
                // Right-click to manage member (owner only)
                Utils.on(item, 'contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Only server owner can manage members
                    if (s.ownerId !== AppState.user.uid) return;
                    
                    const manageName = Utils.$('#manage-member-name');
                    const hiddenUid = Utils.$('#hidden-manage-uid');
                    const selectRole = Utils.$('#select-member-role');
                    
                    if (manageName) manageName.innerText = `Manage: ${user.name}`;
                    if (hiddenUid) hiddenUid.value = user.uid;
                    
                    if (selectRole) {
                        selectRole.innerHTML = '';
                        Object.entries(s.roles).forEach(([id, r]) => {
                            const selected = roleId === id ? 'selected' : '';
                            selectRole.innerHTML += `<option value="${id}" ${selected}>${r.name}</option>`;
                        });
                    }
                    
                    UIManager.openModal('modal-manage-member');
                });
                
                groupDiv.appendChild(item);
            });
            
            list.appendChild(groupDiv);
        });
    }
}
