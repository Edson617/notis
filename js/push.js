// ========================================
// NotiApp - Push Notifications Manager
// Handles personalized push notifications
// ========================================

// VAPID Public Key - You need to generate your own keys for production
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'BAyWM8-sjVt1WVJDjswBJLwD3nS19nkWcup1i0V_k0huwfI6FSl1Lou164djqq-hg6YHXGC_H8bhLtCU22-fWww';

// Server endpoint for push subscriptions
const PUSH_SERVER_URL = '/api/push';

class PushManager {
    constructor() {
        this.swRegistration = null;
        this.subscription = null;
        this.isSupported = this.checkSupport();
    }

    // Check if push notifications are supported
    checkSupport() {
        const supported = (
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window
        );
        
        console.log('[Push] Support check:', supported);
        return supported;
    }

    // Initialize push manager
    async init(swRegistration) {
        if (!this.isSupported) {
            console.warn('[Push] Push notifications not supported');
            return false;
        }

        this.swRegistration = swRegistration;
        
        // Check existing subscription
        try {
            this.subscription = await this.swRegistration.pushManager.getSubscription();
            
            if (this.subscription) {
                console.log('[Push] Existing subscription found');
                return true;
            }
        } catch (error) {
            console.error('[Push] Error checking subscription:', error);
        }

        return false;
    }

    // Request notification permission
    async requestPermission() {
        if (!this.isSupported) {
            return 'unsupported';
        }

        try {
            const permission = await Notification.requestPermission();
            console.log('[Push] Permission status:', permission);
            return permission;
        } catch (error) {
            console.error('[Push] Permission request failed:', error);
            return 'denied';
        }
    }

    // Subscribe to push notifications
    async subscribe(userData = {}) {
        if (!this.isSupported) {
            throw new Error('Push notifications not supported in this browser');
        }
        
        // Esperar a que el service worker esté listo
        if (!this.swRegistration) {
            console.log('[Push] Waiting for service worker...');
            try {
                this.swRegistration = await navigator.serviceWorker.ready;
                console.log('[Push] Service worker ready');
            } catch (err) {
                throw new Error('Service Worker not ready: ' + err.message);
            }
        }

        // Check permission
        const permission = await this.requestPermission();
        if (permission !== 'granted') {
            throw new Error('Debes permitir las notificaciones para continuar');
        }

        try {
            // Convert VAPID key
            const applicationServerKey = this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

            // Subscribe
            this.subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });

            console.log('[Push] Subscribed successfully');

            // Prepare subscription data with user info
            const subscriptionData = {
                subscription: this.subscription.toJSON(),
                userData: {
                    userName: userData.userName || 'Usuario',
                    preferences: userData.preferences || [],
                    subscribedAt: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    language: navigator.language
                }
            };

            // Save to server
            await this.saveSubscriptionToServer(subscriptionData);

            // Save to IndexedDB
            await DB.saveSubscription({
                endpoint: this.subscription.endpoint,
                keys: this.subscription.toJSON().keys,
                userName: userData.userName,
                preferences: userData.preferences
            });

            return this.subscription;
        } catch (error) {
            console.error('[Push] Subscription failed:', error);
            throw error;
        }
    }

    // Unsubscribe from push notifications
    async unsubscribe() {
        if (!this.subscription) {
            console.log('[Push] No subscription to unsubscribe');
            return true;
        }

        try {
            // Unsubscribe from push manager
            await this.subscription.unsubscribe();

            // Remove from server
            await this.removeSubscriptionFromServer(this.subscription.endpoint);

            // Remove from IndexedDB
            await DB.deleteSubscription();

            this.subscription = null;
            console.log('[Push] Unsubscribed successfully');
            return true;
        } catch (error) {
            console.error('[Push] Unsubscribe failed:', error);
            throw error;
        }
    }

    // Send test notification
    async sendTestNotification(title, body, data = {}) {
        if (!this.subscription) {
            throw new Error('Not subscribed to push notifications');
        }

        try {
            const response = await fetch(`${PUSH_SERVER_URL}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    endpoint: this.subscription.endpoint,
                    notification: {
                        title,
                        body,
                        icon: '/icons/icon-192.png',
                        badge: '/icons/icon-72.png',
                        tag: 'test-notification-' + Date.now(),
                        data: {
                            ...data,
                            url: '/',
                            timestamp: Date.now()
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send notification');
            }

            console.log('[Push] Test notification sent');
            return true;
        } catch (error) {
            console.error('[Push] Send notification failed:', error);
            
            // Fallback: show local notification for testing
            if (Notification.permission === 'granted') {
                this.showLocalNotification(title, body, data);
                return true;
            }
            
            throw error;
        }
    }

    // Show local notification (fallback for testing)
    showLocalNotification(title, body, data = {}) {
        if (!this.swRegistration) return;

        this.swRegistration.showNotification(title, {
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            tag: 'local-notification-' + Date.now(),
            vibrate: [100, 50, 100],
            data: {
                ...data,
                url: '/',
                timestamp: Date.now()
            },
            actions: [
                { action: 'open', title: 'Abrir' },
                { action: 'close', title: 'Cerrar' }
            ]
        });

        // Also add to notification history
        DB.addNotification({ title, body, data });
    }

    // Save subscription to server
    async saveSubscriptionToServer(subscriptionData) {
        try {
            const response = await fetch(`${PUSH_SERVER_URL}/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(subscriptionData)
            });

            if (!response.ok) {
                throw new Error('Failed to save subscription to server');
            }

            console.log('[Push] Subscription saved to server');
            return true;
        } catch (error) {
            console.warn('[Push] Could not save to server (offline mode):', error);
            // Don't throw - allow offline subscription
            return false;
        }
    }

    // Remove subscription from server
    async removeSubscriptionFromServer(endpoint) {
        try {
            const response = await fetch(`${PUSH_SERVER_URL}/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ endpoint })
            });

            if (!response.ok) {
                throw new Error('Failed to remove subscription from server');
            }

            console.log('[Push] Subscription removed from server');
            return true;
        } catch (error) {
            console.warn('[Push] Could not remove from server:', error);
            return false;
        }
    }

    // Get current subscription status
    async getSubscriptionStatus() {
        if (!this.isSupported) {
            return { supported: false, subscribed: false, permission: 'unsupported' };
        }

        const permission = Notification.permission;
        const subscribed = !!this.subscription;
        
        // Get stored user data
        const storedSub = await DB.getSubscription();

        return {
            supported: true,
            subscribed,
            permission,
            userName: storedSub?.userName,
            preferences: storedSub?.preferences || []
        };
    }

    // Utility: Convert VAPID key
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    }

    // Check if user is subscribed
    isSubscribed() {
        return !!this.subscription;
    }
}

// Create and export singleton instance
const Push = new PushManager();

