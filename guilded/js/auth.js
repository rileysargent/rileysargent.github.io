import { Utils } from './utils.js';
import { AppState } from './state.js';
import { UIManager } from './ui-manager.js';
import {
    auth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
    signOut, updateProfile
} from './firebase.js';
import { ServerController } from './server.js';
import { PresenceController } from './presence.js';

// FIX #1: Human-readable Firebase error messages
const ERROR_MESSAGES = {
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
};

export class AuthController {
    static async handleAuthSubmit(e) {
        e.preventDefault();

        const email = Utils.$('#auth-email').value.trim();
        const password = Utils.$('#auth-password').value;
        const errBox = Utils.$('#auth-error-msg');
        const btn = Utils.$('#auth-submit-btn');

        if (errBox) errBox.style.display = 'none';
        if (btn) btn.disabled = true;

        try {
            if (AppState.isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCred = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCred.user, {
                    displayName: email.split('@')[0]
                });
                await ServerController.joinServer('ADMIN');
            }
        } catch (err) {
            if (errBox) {
                // FIX #1: Use readable error map instead of ugly codes
                const errorMessage = ERROR_MESSAGES[err.code] || 'Something went wrong. Please try again.';
                errBox.innerText = errorMessage;
                errBox.style.display = 'block';
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    static toggleMode() {
        AppState.isLoginMode = !AppState.isLoginMode;

        const title = Utils.$('#auth-title');
        const subtitle = Utils.$('#auth-subtitle');
        const btnText = Utils.$('#auth-btn-text');
        const toggleText = Utils.$('#auth-toggle-text');
        const toggleLink = Utils.$('#auth-toggle-link');
        const errorMsg = Utils.$('#auth-error-msg');

        if (AppState.isLoginMode) {
            if (title) title.innerText = 'Welcome back!';
            // FIX #3: Update subtitle when toggling modes
            if (subtitle) subtitle.innerText = "We're so excited to see you again!";
            if (btnText) btnText.innerText = 'Log In';
            if (toggleText) toggleText.innerText = 'Need an account?';
            if (toggleLink) toggleLink.innerText = 'Register';
        } else {
            if (title) title.innerText = 'Create an account';
            // FIX #3: Update subtitle when toggling modes
            if (subtitle) subtitle.innerText = "Join us today — it's free!";
            if (btnText) btnText.innerText = 'Register';
            if (toggleText) toggleText.innerText = 'Already have an account?';
            if (toggleLink) toggleLink.innerText = 'Log In';
        }

        if (errorMsg) errorMsg.style.display = 'none';
    }

    static async updateProfile() {
        const usernameInput = Utils.$('#settings-username');
        const themeSelect = Utils.$('#settings-theme');

        const newName = usernameInput?.value.trim();
        const newTheme = themeSelect?.value;

        if (newTheme) {
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('guilded-theme', newTheme);
        }

        if (newName && newName !== AppState.user?.displayName) {
            try {
                await updateProfile(AppState.user, { displayName: newName });
                UIManager.showToast("Profile updated!", 'success');
            } catch {
                UIManager.showToast("Failed to update profile.", 'error');
            }
        } else {
            UIManager.showToast("Settings saved!", 'success');
        }

        UIManager.closeModal('modal-user-settings');
        PresenceController.setStatus('Online');
    }

    static loadSavedTheme() {
        const saved = localStorage.getItem('guilded-theme') || 'midnight';
        document.documentElement.setAttribute('data-theme', saved);
    }
}
