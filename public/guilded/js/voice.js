/**
 * Voice Controller Module
 * Handles voice channel connections (WebRTC mock implementation)
 */

import { Utils } from './utils.js';
import { UIManager } from './ui-manager.js';

export class VoiceController {
    static stream = null;

    /**
     * Join a voice channel
     * @param {string} channelName - Name of the voice channel
     */
    static async joinVoice(channelName) {
        // Leave any existing voice connection first
        this.leaveVoice();
        
        // Update UI to show which voice channel is active
        Utils.$$('.channel-item').forEach(el => el.classList.remove('voice-active'));
        const activeEl = Utils.$(`.channel-item[data-channel="${channelName}"]`);
        if (activeEl) activeEl.classList.add('voice-active');

        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Show voice panel
            const voicePanel = Utils.$('#voice-panel');
            const voiceChannelName = Utils.$('#voice-channel-name');
            
            if (voicePanel) voicePanel.style.display = 'flex';
            if (voiceChannelName) voiceChannelName.innerText = `${channelName} / WebRTC`;
            
            UIManager.showToast(`Connected to ${channelName}`, 'success');
        } catch (e) {
            UIManager.showToast("Voice Error: Microphone access denied.", 'error');
            Utils.$$('.channel-item').forEach(el => el.classList.remove('voice-active'));
        }
    }

    /**
     * Leave the current voice channel
     */
    static leaveVoice() {
        // Stop all audio tracks
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        this.stream = null;
        
        // Hide voice panel
        const voicePanel = Utils.$('#voice-panel');
        if (voicePanel) voicePanel.style.display = 'none';
        
        // Clear voice-active state from all channels
        Utils.$$('.channel-item').forEach(el => el.classList.remove('voice-active'));
    }

    /**
     * Toggle mute state
     * @returns {boolean} - New mute state
     */
    static toggleMute() {
        if (!this.stream) return false;
        
        const audioTrack = this.stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            return !audioTrack.enabled;
        }
        return false;
    }

    /**
     * Check if currently connected to voice
     * @returns {boolean}
     */
    static isConnected() {
        return this.stream !== null;
    }
}
