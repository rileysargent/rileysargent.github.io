/**
 * App State Module
 * Centralized state management for the application
 */

export const AppState = {
    // Current authenticated user
    user: null,
    
    // User's joined servers (keyed by server ID)
    servers: {},
    
    // Currently selected server object
    currentServer: null,
    
    // Currently selected channel ID
    currentChannel: null,
    
    // Firestore unsubscribe function for messages listener
    unsubscribeMessages: null,
    
    // Firestore unsubscribe function for servers listener
    unsubscribeServers: null,
    
    // Auth mode flag (true = login, false = register)
    isLoginMode: true,
    
    // Realtime database presence data (keyed by user ID)
    rtdbPresence: {}
};

/**
 * Reset app state to initial values
 * Used when user logs out
 */
export function resetAppState() {
    AppState.user = null;
    AppState.servers = {};
    AppState.currentServer = null;
    AppState.currentChannel = null;
    AppState.rtdbPresence = {};
    
    // Cleanup subscriptions
    if (AppState.unsubscribeMessages) {
        AppState.unsubscribeMessages();
        AppState.unsubscribeMessages = null;
    }
    
    if (AppState.unsubscribeServers) {
        AppState.unsubscribeServers();
        AppState.unsubscribeServers = null;
    }
}
