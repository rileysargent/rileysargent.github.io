import { Utils } from './utils.js';
import { UIManager } from './ui-manager.js';

export class VoiceController {
    static stream = null;

    static async joinVoice(channelName) {
        this.leaveVoice();

        Utils.$$('.channel-item').forEach(el => el.classList.remove('voice-active'));
        const activeEl = Utils.$(`.channel-item[data-channel="${channelName}"]`);
        if (activeEl) activeEl.classList.add('voice-active');

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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

    static leaveVoice() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        this.stream = null;

        const voicePanel = Utils.$('#voice-panel');
        if (voicePanel) voicePanel.style.display = 'none';

        Utils.$$('.channel-item').forEach(el => el.classList.remove('voice-active'));
    }

    static toggleMute() {
        if (!this.stream) return false;
        const audioTrack = this.stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            return !audioTrack.enabled;
        }
        return false;
    }

    static isConnected() {
        return this.stream !== null;
    }
}
