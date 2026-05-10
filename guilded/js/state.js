export const AppState = {
    user: null,
    servers: {},
    currentServer: null,
    currentChannel: null,
    unsubscribeMessages: null,
    unsubscribeServers: null,
    unsubscribeTyping: null,
    isLoginMode: true,
    rtdbPresence: {},
    replyTo: null,
    typingTimeout: null,
    channelListeners: {},
};

export function resetAppState() {
    AppState.user = null;
    AppState.servers = {};
    AppState.currentServer = null;
    AppState.currentChannel = null;
    AppState.rtdbPresence = {};
    AppState.replyTo = null;

    if (AppState.typingTimeout) {
        clearTimeout(AppState.typingTimeout);
        AppState.typingTimeout = null;
    }
    if (AppState.unsubscribeTyping) {
        AppState.unsubscribeTyping();
        AppState.unsubscribeTyping = null;
    }
    if (AppState.unsubscribeMessages) {
        AppState.unsubscribeMessages();
        AppState.unsubscribeMessages = null;
    }
    if (AppState.unsubscribeServers) {
        AppState.unsubscribeServers();
        AppState.unsubscribeServers = null;
    }
    Object.values(AppState.channelListeners || {}).forEach(fn => fn && fn());
    AppState.channelListeners = {};
}
