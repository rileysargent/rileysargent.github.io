/**
 * Auth Controller Module
 * Handles user authentication, registration, and profile updates
 */

import { Utils } from './utils.js';
import { AppState } from './state.js';
import { UIManager } from './ui-manager.js';
import { 
    auth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    updateProfile 
} from './firebase.js';
import { ServerController } from './server.js';
import { PresenceController } from './presence.js';

export class AuthController {
    /**
     * Handle authentication form submission
     * @param {Event} e - Form submit event
     */
    static async handleAuthSubmit(e) {
        e.preventDefault();
        
        const email = Utils.$('#auth-email').value.trim();
        const password = Utils.$('#auth-password').value;
        const errBox = Utils.$('#auth-error-msg');
        
        if (errBox) {
            errBox.style.display = 'none';
        }
        
        try {
            if (AppState.isLoginMode) {
                // Login existing user
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                // Register new user
                const userCred = await createUserWithEmailAndPassword(auth, email, password);
                
                // Set default display name from email
                await updateProfile(userCred.user, { 
                    displayName: email.split('@')[0] 
                });
                
                // Auto-join the ADMIN server for new users
                await ServerController.joinServer('ADMIN');
            }
        } catch (err) {
            if (errBox) {
                // Format error message for display
                const errorMessage = err.code
                    .replace('auth/', '')
                    .replace(/-/g, ' ')
                    .toUpperCase();
                errBox.innerText = errorMessage;
                errBox.style.display = 'block';
            }
        }
    }

    /**
     * Toggle between login and register modes
     */
    static toggleMode() {
        AppState.isLoginMode = !AppState.isLoginMode;
        
        const title = Utils.$('#auth-title');
        const btnText = Utils.$('#auth-btn-text');
        const toggleText = Utils.$('#auth-toggle-text');
        const toggleLink = Utils.$('#auth-toggle-link');
        const errorMsg = Utils.$('#auth-error-msg');
        
        if (AppState.isLoginMode) {
            if (title) title.innerText = 'Welcome back!';
            if (btnText) btnText.innerText = 'Log In';
            if (toggleText) toggleText.innerText = 'Need an account?';
            if (toggleLink) toggleLink.innerText = 'Register';
        } else {
            if (title) title.innerText = 'Create an account';
            if (btnText) btnText.innerText = 'Register';
            if (toggleText) toggleText.innerText = 'Already have an account?';
            if (toggleLink) toggleLink.innerText = 'Log In';
        }
        
        // Clear any existing error message
        if (errorMsg) {
            errorMsg.style.display = 'none';
        }
    }

    /**
     * Update user profile (display name and theme)
     */
    static async updateProfile() {
        const newName = Utils.$('#settings-username')?.value.trim();
        const newTheme = Utils.$('#settings-theme')?.value;
        
        if (newName && newName !== AppState.user?.displayName) {
            await updateProfile(AppState.user, { displayName: newName });
            
            // Re-initialize presence with new name
            PresenceController.initialize();
            
            UIManager.showToast('Profile updated!', 'success');
        }
        
        if (newTheme) {
            document.documentElement.setAttribute('data-theme', newTheme);
            // Optionally save theme preference to localStorage
            localStorage.setItem('guilded-theme', newTheme);
        }
        
        UIManager.closeModal('modal-user-settings');
    }

    /**
     * Handle user logout
     */
    static async logout() {
        try {
            await signOut(auth);
            UIManager.showToast('Logged out successfully', 'info');
        } catch (err) {
            UIManager.showToast('Error logging out', 'error');
        }
    }

    /**
     * Load saved theme preference
     */
    static loadSavedTheme() {
        const savedTheme = localStorage.getItem('guilded-theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    }
}
