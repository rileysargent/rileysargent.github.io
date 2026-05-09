/**
 * Server Controller Module
 * Handles server CRUD operations, channel management, and member roles
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
    where, 
    doc, 
    setDoc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove, 
    getDoc, 
    getDocs 
} from './firebase.js';
import { PresenceController } from './presence.js';
import { DatabaseController } from './database.js';
import { VoiceController } from './voice.js';

export class ServerController {
    /**
     * Bootstrap the admin server if it doesn't exist
     * This creates a default server for new users to join
     */
    static async bootstrapAdminServer() {
        try {
            const adminRef = doc(db, 'servers', 'admin_server');
            const snap = await getDoc(adminRef);
            
            if (!snap.exists()) {
                await setDoc(adminRef, {
                    name: "Admin's Server",
                    ownerId: "system",
                    inviteCode: "ADMIN",
                    members: ["system"],
                    memberRoles: { "system": "admin" },
                    roles: {
                        "admin": { name: "Admin", color: "#eab308" },
                        "default": { name: "Member", color: "#b5bac1" }
                    },
                    channels: [
                        { id: 'general', name: 'general', type: 'text' },
                        { id: 'voice-lounge', name: 'Voice Lounge', type: 'voice' }
                    ]
                });
            }
        } catch (e) {
            console.log("System bootstrap skipped.");
        }
    }

    /**
     * Sync user's servers from Firestore
     * Sets up a real-time listener for server updates
     */
    static syncUserServers() {
        // Cleanup existing subscription
        if (AppState.unsubscribeServers) {
            AppState.unsubscribeServers();
        }
        
        const q = query(
            collection(db, 'servers'),
            where('members', 'array-contains', AppState.user.uid)
        );
        
        AppState.unsubscribeServers = onSnapshot(q, async (snapshot) => {
            // Update servers state
            AppState.servers = {};
            snapshot.forEach(doc => {
                AppState.servers[doc.id] = { id: doc.id, ...doc.data() };
            });
            
            // Render server bar
            this.renderServerBar();
            
            // Handle server selection
            if (Object.keys(AppState.servers).length > 0) {
                if (!AppState.currentServer || !AppState.servers[AppState.currentServer.id]) {
                    // Select first server if none selected or current is gone
                    this.selectServer(Object.keys(AppState.servers)[0]);
                } else {
                    // Refresh current server view
                    this.selectServer(AppState.currentServer.id);
                }
            } else {
                // User is in no servers
                AppState.currentServer = null;
                UIManager.updateServerHeader("No Servers");
                UIManager.clearDynamicContent();
                UIManager.openModal('modal-add-server');
            }
        }, (err) => {
            console.error("Server sync error:", err);
        });
    }

    /**
     * Render the server bar (left navigation)
     */
    static renderServerBar() {
        const list = Utils.$('#server-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        Object.values(AppState.servers).forEach(server => {
            const div = document.createElement('div');
            div.className = `server-icon ${AppState.currentServer?.id === server.id ? 'active' : ''}`;
            div.title = server.name;
            div.innerText = Utils.getInitials(server.name);
            
            Utils.on(div, 'click', () => this.selectServer(server.id));
            
            list.appendChild(div);
        });
    }

    /**
     * Select and display a server
     * @param {string} serverId - Server ID to select
     */
    static selectServer(serverId) {
        const server = AppState.servers[serverId];
        if (!server) return;
        
        AppState.currentServer = server;
        this.renderServerBar();
        UIManager.updateServerHeader(server.name);
        
        // Render channel list
        const channelList = Utils.$('#dynamic-channel-list');
        if (channelList) {
            channelList.innerHTML = `
                <div class="category-header">
                    CHANNELS 
                    <svg id="btn-add-channel" viewBox="0 0 24 24" fill="currentColor" title="Create Channel" role="button" tabindex="0">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                </div>
            `;
            
            server.channels.forEach((ch) => {
                const div = document.createElement('div');
                div.className = 'channel-item';
                div.setAttribute('data-channel', ch.id);
                
                const svg = ch.type === 'text'
                    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L7.60074 8H3C2.44772 8 2 7.55228 2 7C2 6.44772 2.44772 6 3 6H7.95644L8.84155 1.01261C8.89592 0.70635 9.17698 0.5 9.48809 0.5C9.84378 0.5 10.1501 0.784411 10.1039 1.13783L9.2015 8H15.2015L16.1039 1.13783C16.1501 0.784411 16.4564 0.5 16.8121 0.5C17.1232 0.5 17.4043 0.70635 17.4586 1.01261L16.5735 6H21C21.5523 6 22 6.44772 22 7C22 7.55228 21.5523 8 21 8H16.2178L14.0113 20.4126C13.957 20.7189 13.6759 21 13.3648 21C13.0091 21 12.7028 20.7156 12.749 20.3622L13.6514 13.5H7.65138L6.74898 20.3622C6.70278 20.7156 6.39648 21 6.04079 21H5.88657ZM9.50294 13.5L10.3916 8.5H14.3916L13.5029 13.5H9.50294Z"/></svg>`
                    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>`;
                
                div.innerHTML = `${svg} ${ch.name}`;
                
                Utils.on(div, 'click', () => {
                    if (ch.type === 'voice') {
                        VoiceController.joinVoice(ch.name);
                    } else {
                        DatabaseController.listenToChannel(ch.id);
                    }
                });
                
                channelList.appendChild(div);
            });
            
            // Add click handler for create channel button
            Utils.on(Utils.$('#btn-add-channel'), 'click', (e) => {
                e.stopPropagation();
                UIManager.openModal('modal-create-channel');
            });
        }
        
        // Select first text channel by default
        const firstText = server.channels.find(c => c.type === 'text');
        if (firstText && AppState.currentChannel !== firstText.id) {
            DatabaseController.listenToChannel(firstText.id);
        }
        
        // Render member sidebar
        PresenceController.renderMemberSidebar();
    }

    /**
     * Join a server by invite code
     * @param {string} inviteCode - Server invite code
     * @returns {Promise<boolean>} - Success status
     */
    static async joinServer(inviteCode) {
        if (!inviteCode) return false;
        
        const q = query(
            collection(db, 'servers'),
            where('inviteCode', '==', inviteCode.toUpperCase())
        );
        const snaps = await getDocs(q);
        
        if (snaps.empty) {
            UIManager.showToast("Invalid Invite Code", 'error');
            return false;
        }
        
        const serverDoc = snaps.docs[0];
        await updateDoc(serverDoc.ref, {
            members: arrayUnion(AppState.user.uid),
            [`memberRoles.${AppState.user.uid}`]: "default"
        });
        
        UIManager.closeModal('modal-add-server');
        UIManager.showToast("Joined Server successfully!", 'success');
        return true;
    }

    /**
     * Create a new server
     * @param {string} name - Server name
     */
    static async createServer(name) {
        if (!name) return;
        
        const inviteCode = Utils.randomString(6);
        
        await addDoc(collection(db, 'servers'), {
            name: name,
            ownerId: AppState.user.uid,
            inviteCode: inviteCode,
            members: [AppState.user.uid],
            memberRoles: { [AppState.user.uid]: "owner" },
            roles: {
                "owner": { name: "Owner", color: "#eab308" },
                "default": { name: "Member", color: "#b5bac1" }
            },
            channels: [
                { id: 'general', name: 'general', type: 'text' }
            ]
        });
        
        UIManager.closeModal('modal-add-server');
        UIManager.showToast("Server created!", 'success');
    }

    /**
     * Create a new channel in the current server
     * @param {string} name - Channel name
     * @param {string} type - Channel type ('text' or 'voice')
     */
    static async createChannel(name, type) {
        if (!name || !AppState.currentServer) return;
        
        // Generate safe ID from name
        const safeId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        await updateDoc(doc(db, 'servers', AppState.currentServer.id), {
            channels: arrayUnion({ id: safeId, name: name, type: type })
        });
        
        UIManager.closeModal('modal-create-channel');
        UIManager.showToast("Channel created!", 'success');
    }

    /**
     * Add a new role to the current server
     * @param {string} name - Role name
     * @param {string} color - Role color (hex)
     */
    static async addRole(name, color) {
        if (!name || !AppState.currentServer) return;
        
        const roleId = 'role_' + Date.now();
        
        await updateDoc(doc(db, 'servers', AppState.currentServer.id), {
            [`roles.${roleId}`]: { name, color }
        });
        
        UIManager.showToast("Role Created!", 'success');
    }

    /**
     * Leave the current server
     */
    static async leaveServer() {
        if (!AppState.currentServer) return;
        
        await updateDoc(doc(db, 'servers', AppState.currentServer.id), {
            members: arrayRemove(AppState.user.uid)
        });
        
        UIManager.showToast("Left server.", 'info');
        Utils.$('#server-dropdown').style.display = 'none';
    }

    /**
     * Save server settings (name update)
     */
    static async saveServerSettings() {
        if (!AppState.currentServer) return;
        
        const newName = Utils.$('#settings-server-name')?.value;
        if (newName) {
            await updateDoc(doc(db, 'servers', AppState.currentServer.id), {
                name: newName
            });
        }
        
        UIManager.closeModal('modal-server-settings');
        UIManager.showToast("Server saved!", 'success');
    }

    /**
     * Save member role assignment
     */
    static async saveMemberRole() {
        if (!AppState.currentServer) return;
        
        const uid = Utils.$('#hidden-manage-uid')?.value;
        const roleId = Utils.$('#select-member-role')?.value;
        
        if (uid && roleId) {
            await updateDoc(doc(db, 'servers', AppState.currentServer.id), {
                [`memberRoles.${uid}`]: roleId
            });
        }
        
        UIManager.closeModal('modal-manage-member');
        UIManager.showToast("Role updated!", 'success');
    }
}
