// ========================================
// NotiApp - Main Application
// ========================================

class NotiApp {
    constructor() {
        this.swRegistration = null;
        this.isOnline = navigator.onLine;
        
        // DOM Elements
        this.elements = {};
        
        // Bind methods
        this.handleOnline = this.handleOnline.bind(this);
        this.handleOffline = this.handleOffline.bind(this);
        this.handleServiceWorkerMessage = this.handleServiceWorkerMessage.bind(this);
    }

    // Initialize the application
    async init() {
        console.log('[App] Initializing NotiApp...');

        // Cache DOM elements
        this.cacheElements();

        // Setup event listeners
        this.setupEventListeners();

        // Register service worker
        await this.registerServiceWorker();

        // Initialize push manager
        await this.initPushManager();

        // Load saved data
        await this.loadData();

        // Hide splash screen
        this.hideSplashScreen();

        console.log('[App] NotiApp initialized');
    }

    // Cache DOM elements
    cacheElements() {
        this.elements = {
            // Splash
            splashScreen: document.getElementById('splash-screen'),
            app: document.getElementById('app'),
            
            // Connection status
            connectionStatus: document.getElementById('connection-status'),
            
            // Subscription
            subscriptionStatus: document.getElementById('subscription-status'),
            subscriptionForm: document.getElementById('subscription-form'),
            subscriptionActive: document.getElementById('subscription-active'),
            userName: document.getElementById('user-name'),
            subscribeBtn: document.getElementById('subscribe-btn'),
            unsubscribeBtn: document.getElementById('unsubscribe-btn'),
            subscriberName: document.getElementById('subscriber-name'),
            
            // Test notification
            testTitle: document.getElementById('test-title'),
            testBody: document.getElementById('test-body'),
            testNotificationBtn: document.getElementById('test-notification-btn'),
            
            // Data
            dataList: document.getElementById('data-list'),
            newDataInput: document.getElementById('new-data-input'),
            addDataBtn: document.getElementById('add-data-btn'),
            refreshDataBtn: document.getElementById('refresh-data-btn'),
            
            // Notifications
            notificationList: document.getElementById('notification-list'),
            clearHistoryBtn: document.getElementById('clear-history-btn'),
            
            // Toast
            toastContainer: document.getElementById('toast-container')
        };
    }

    // Setup event listeners
    setupEventListeners() {
        // Online/Offline events
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);

        // Service worker messages
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);

        // Subscribe button
        this.elements.subscribeBtn.addEventListener('click', () => this.handleSubscribe());

        // Unsubscribe button
        this.elements.unsubscribeBtn.addEventListener('click', () => this.handleUnsubscribe());

        // Test notification button
        this.elements.testNotificationBtn.addEventListener('click', () => this.handleTestNotification());

        // Add data button
        this.elements.addDataBtn.addEventListener('click', () => this.handleAddData());

        // Add data on Enter key
        this.elements.newDataInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAddData();
        });

        // Refresh data button
        this.elements.refreshDataBtn.addEventListener('click', () => this.loadNotes());

        // Clear history button
        this.elements.clearHistoryBtn.addEventListener('click', () => this.handleClearHistory());

        // Update connection status
        this.updateConnectionStatus();
    }

    // Register service worker
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('[App] Service Worker not supported');
            this.showToast('Tu navegador no soporta Service Workers', 'warning');
            return;
        }

        try {
            // Registrar el SW
            console.log('[App] Registering Service Worker...');
            this.swRegistration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
            
            console.log('[App] Service Worker registered, scope:', this.swRegistration.scope);
            
            // Esperar a que el SW esté completamente activo
            await this.waitForServiceWorkerActive();
            
            console.log('[App] Service Worker is now active!');

            // Handle updates
            this.swRegistration.addEventListener('updatefound', () => {
                const newWorker = this.swRegistration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showToast('Nueva versión disponible. Recarga para actualizar.', 'info');
                        }
                    });
                }
            });

        } catch (error) {
            console.error('[App] Service Worker registration failed:', error);
            this.showToast('Error al registrar Service Worker', 'error');
        }
    }
    
    // Helper para esperar a que el SW esté activo
    async waitForServiceWorkerActive() {
        // Si ya está activo, retornar
        if (this.swRegistration.active) {
            console.log('[App] SW already active');
            return;
        }
        
        // Obtener el SW que está instalando o esperando
        const sw = this.swRegistration.installing || this.swRegistration.waiting;
        
        if (!sw) {
            // Esperar a que esté listo usando navigator.serviceWorker.ready
            console.log('[App] Waiting for SW ready...');
            await navigator.serviceWorker.ready;
            return;
        }
        
        console.log('[App] SW state:', sw.state);
        
        // Si está activado, retornar
        if (sw.state === 'activated') {
            return;
        }
        
        // Esperar el cambio de estado a activated
        return new Promise((resolve) => {
            sw.addEventListener('statechange', (e) => {
                console.log('[App] SW state changed to:', e.target.state);
                if (e.target.state === 'activated') {
                    resolve();
                }
            });
        });
    }

    // Initialize push manager
    async initPushManager() {
        if (!this.swRegistration) return;

        try {
            const hasSubscription = await Push.init(this.swRegistration);
            await this.updateSubscriptionUI();

            if (hasSubscription) {
                console.log('[App] User is already subscribed');
            }
        } catch (error) {
            console.error('[App] Push initialization failed:', error);
        }
    }

    // Load all data
    async loadData() {
        await Promise.all([
            this.loadNotes(),
            this.loadNotifications()
        ]);
    }

    // Load notes from IndexedDB
    async loadNotes() {
        try {
            const notes = await DB.getAllNotes();
            this.renderNotes(notes);
        } catch (error) {
            console.error('[App] Failed to load notes:', error);
        }
    }

    // Load notifications from IndexedDB
    async loadNotifications() {
        try {
            const notifications = await DB.getAllNotifications();
            this.renderNotifications(notifications);
        } catch (error) {
            console.error('[App] Failed to load notifications:', error);
        }
    }

    // Render notes
    renderNotes(notes) {
        if (notes.length === 0) {
            this.elements.dataList.innerHTML = `
                <div class="data-empty">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M21 16V8C21 6.89543 20.1046 6 19 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18H19C20.1046 18 21 17.1046 21 16Z" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 10V14M12 14L10 12M12 14L14 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <p>No hay datos guardados aún</p>
                </div>
            `;
            return;
        }

        this.elements.dataList.innerHTML = notes.map(note => `
            <div class="data-item ${note.synced ? 'synced' : 'pending'}" data-id="${note.id}">
                <div class="data-item-content">
                    <span class="data-item-text">${this.escapeHtml(note.text)}</span>
                    <span class="data-item-time">
                        ${this.formatDate(note.timestamp)}
                        <span class="sync-status ${note.synced ? 'synced' : 'pending'}" title="${note.synced ? 'Sincronizado con servidor' : 'Pendiente de sincronizar'}">
                            ${note.synced ? '☁️' : '💾'}
                        </span>
                    </span>
                </div>
                <div class="data-item-actions">
                    <button class="delete-btn" onclick="app.handleDeleteNote(${note.id})" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Render notifications
    renderNotifications(notifications) {
        if (notifications.length === 0) {
            this.elements.notificationList.innerHTML = `
                <div class="data-empty">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C10.343 2 9 3.343 9 5V6.17C6.718 7.135 5 9.333 5 12V17L3 19V20H21V19L19 17V12C19 9.333 17.282 7.135 15 6.17V5C15 3.343 13.657 2 12 2Z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <p>No hay notificaciones en el historial</p>
                </div>
            `;
            return;
        }

        this.elements.notificationList.innerHTML = notifications.map(notif => `
            <div class="notification-item">
                <div class="notification-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C10.343 2 9 3.343 9 5V6.17C6.718 7.135 5 9.333 5 12V17L3 19V20H21V19L19 17V12C19 9.333 17.282 7.135 15 6.17V5C15 3.343 13.657 2 12 2Z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${this.escapeHtml(notif.title)}</div>
                    <div class="notification-body">${this.escapeHtml(notif.body)}</div>
                    <div class="notification-time">${this.formatDate(notif.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    // Update subscription UI
    async updateSubscriptionUI() {
        const status = await Push.getSubscriptionStatus();

        if (!status.supported) {
            this.elements.subscriptionStatus.innerHTML = `
                <div class="status-icon error">
                    <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <p>Tu navegador no soporta notificaciones push</p>
            `;
            this.elements.subscriptionForm.classList.add('hidden');
            return;
        }

        this.elements.subscriptionStatus.classList.add('hidden');

        if (status.subscribed) {
            this.elements.subscriptionForm.classList.add('hidden');
            this.elements.subscriptionActive.classList.remove('hidden');
            this.elements.subscriberName.textContent = `Hola, ${status.userName || 'Usuario'}`;
        } else {
            this.elements.subscriptionForm.classList.remove('hidden');
            this.elements.subscriptionActive.classList.add('hidden');
        }
    }

    // Handle subscribe
    async handleSubscribe() {
        const userName = this.elements.userName.value.trim() || 'Usuario';
        const preferences = Array.from(document.querySelectorAll('input[name="pref"]:checked'))
            .map(cb => cb.value);

        this.elements.subscribeBtn.disabled = true;
        this.elements.subscribeBtn.innerHTML = '<span>Suscribiendo...</span>';

        try {
            await Push.subscribe({ userName, preferences });
            await this.updateSubscriptionUI();
            this.showToast('¡Notificaciones activadas!', 'success');
        } catch (error) {
            console.error('[App] Subscribe failed:', error);
            this.showToast('Error al activar notificaciones: ' + error.message, 'error');
        } finally {
            this.elements.subscribeBtn.disabled = false;
            this.elements.subscribeBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C10.343 2 9 3.343 9 5V6.17C6.718 7.135 5 9.333 5 12V17L3 19V20H21V19L19 17V12C19 9.333 17.282 7.135 15 6.17V5C15 3.343 13.657 2 12 2Z" fill="currentColor"/>
                </svg>
                Activar Notificaciones
            `;
        }
    }

    // Handle unsubscribe
    async handleUnsubscribe() {
        this.elements.unsubscribeBtn.disabled = true;

        try {
            await Push.unsubscribe();
            await this.updateSubscriptionUI();
            this.showToast('Notificaciones desactivadas', 'info');
        } catch (error) {
            console.error('[App] Unsubscribe failed:', error);
            this.showToast('Error al desactivar notificaciones', 'error');
        } finally {
            this.elements.unsubscribeBtn.disabled = false;
        }
    }

    // Handle test notification
    async handleTestNotification() {
        const title = this.elements.testTitle.value.trim() || '¡Hola desde NotiApp!';
        const body = this.elements.testBody.value.trim() || 'Esta es una notificación de prueba.';

        this.elements.testNotificationBtn.disabled = true;

        try {
            await Push.sendTestNotification(title, body, {
                type: 'test',
                sentAt: new Date().toISOString()
            });
            this.showToast('Notificación enviada', 'success');
            
            // Refresh notification list after a delay
            setTimeout(() => this.loadNotifications(), 1000);
        } catch (error) {
            console.error('[App] Test notification failed:', error);
            
            // Try showing local notification as fallback
            if (Push.swRegistration) {
                Push.showLocalNotification(title, body);
                this.showToast('Notificación mostrada localmente', 'info');
                setTimeout(() => this.loadNotifications(), 1000);
            } else {
                this.showToast('Error al enviar notificación', 'error');
            }
        } finally {
            this.elements.testNotificationBtn.disabled = false;
        }
    }

    // Handle add data (guarda en IndexedDB y sincroniza con MongoDB si hay internet)
    async handleAddData() {
        const text = this.elements.newDataInput.value.trim();
        
        if (!text) {
            this.showToast('Escribe algo para guardar', 'warning');
            return;
        }

        try {
            const note = await DB.saveNoteWithSync(text);
            this.elements.newDataInput.value = '';
            await this.loadNotes();
            
            if (note.synced) {
                this.showToast('✅ Nota guardada y sincronizada', 'success');
            } else {
                this.showToast('💾 Guardado offline - Se sincronizará cuando haya internet', 'info');
            }
        } catch (error) {
            console.error('[App] Failed to add note:', error);
            this.showToast('Error al guardar nota', 'error');
        }
    }

    // Handle delete note
    async handleDeleteNote(id) {
        try {
            await DB.deleteNote(id);
            await this.loadNotes();
            this.showToast('Nota eliminada', 'success');
        } catch (error) {
            console.error('[App] Failed to delete note:', error);
            this.showToast('Error al eliminar nota', 'error');
        }
    }

    // Handle clear history
    async handleClearHistory() {
        try {
            await DB.clearNotifications();
            await this.loadNotifications();
            this.showToast('Historial limpiado', 'success');
        } catch (error) {
            console.error('[App] Failed to clear history:', error);
            this.showToast('Error al limpiar historial', 'error');
        }
    }

    // Handle service worker messages
    handleServiceWorkerMessage(event) {
        const { type, payload } = event.data;

        switch (type) {
            case 'NOTIFICATION_RECEIVED':
                console.log('[App] Notification received:', payload);
                DB.addNotification(payload).then(() => this.loadNotifications());
                break;

            case 'NOTIFICATION_CLICKED':
                console.log('[App] Notification clicked:', payload);
                break;

            case 'SYNC_COMPLETE':
                console.log('[App] Sync complete:', payload);
                this.loadData();
                break;
        }
    }

    // Handle online event
    handleOnline() {
        this.isOnline = true;
        this.updateConnectionStatus();
        this.showToast('Conexión restaurada', 'success');
        
        // Sync pending data
        this.syncData();
    }

    // Handle offline event
    handleOffline() {
        this.isOnline = false;
        this.updateConnectionStatus();
        this.showToast('Sin conexión - Modo offline activado', 'warning');
    }

    // Update connection status UI
    updateConnectionStatus() {
        const statusEl = this.elements.connectionStatus;
        const textEl = statusEl.querySelector('.status-text');

        if (this.isOnline) {
            statusEl.classList.remove('offline');
            textEl.textContent = 'Online';
        } else {
            statusEl.classList.add('offline');
            textEl.textContent = 'Offline';
        }
    }

    // Sync data when back online
    async syncData() {
        if (!this.isOnline) return;

        try {
            const unsyncedNotes = await DB.getUnsyncedNotes();
            
            if (unsyncedNotes.length === 0) {
                console.log('[App] No hay datos pendientes de sincronizar');
                return;
            }
            
            console.log('[App] Sincronizando', unsyncedNotes.length, 'notas con MongoDB...');
            this.showToast(`🔄 Sincronizando ${unsyncedNotes.length} nota(s)...`, 'info');
            
            const result = await DB.syncWithServer();
            
            if (result.synced > 0) {
                this.showToast(`✅ ${result.synced} nota(s) sincronizada(s) con el servidor`, 'success');
                await this.loadNotes();
            }
        } catch (error) {
            console.error('[App] Sync failed:', error);
            this.showToast('Error al sincronizar con el servidor', 'error');
        }
    }

    // Hide splash screen
    hideSplashScreen() {
        setTimeout(() => {
            this.elements.splashScreen.classList.add('fade-out');
            this.elements.app.classList.remove('hidden');
            
            setTimeout(() => {
                this.elements.splashScreen.style.display = 'none';
            }, 500);
        }, 2000); // Show splash for 2 seconds
    }

    // Show toast notification
    showToast(message, type = 'info') {
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 9V13M12 17H12.01M5.07 19H18.93C20.47 19 21.45 17.35 20.68 16L13.75 4C12.98 2.65 11.02 2.65 10.25 4L3.32 16C2.55 17.35 3.53 19 5.07 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;

        this.elements.toastContainer.appendChild(toast);

        // Remove toast after 4 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Utility: Format date
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // Less than 1 minute
        if (diff < 60000) {
            return 'Hace un momento';
        }

        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        }

        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        }

        // Otherwise show date
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Utility: Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create app instance
const app = new NotiApp();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

