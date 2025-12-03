// ========================================
// NotiApp - IndexedDB Manager
// Handles all offline data storage
// ========================================

const DB_NAME = 'NotiAppDB';
const DB_VERSION = 1;

// Store names
const STORES = {
    NOTES: 'notes',
    NOTIFICATIONS: 'notifications',
    SUBSCRIPTIONS: 'subscriptions',
    SETTINGS: 'settings'
};

class IndexedDBManager {
    constructor() {
        this.db = null;
        this.isReady = false;
    }

    // Initialize the database
    async init() {
        return new Promise((resolve, reject) => {
            if (this.isReady) {
                resolve(this.db);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('[IndexedDB] Error opening database:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isReady = true;
                console.log('[IndexedDB] Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                console.log('[IndexedDB] Upgrading database...');
                const db = event.target.result;

                // Notes store
                if (!db.objectStoreNames.contains(STORES.NOTES)) {
                    const notesStore = db.createObjectStore(STORES.NOTES, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    notesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    notesStore.createIndex('synced', 'synced', { unique: false });
                }

                // Notifications store
                if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
                    const notifStore = db.createObjectStore(STORES.NOTIFICATIONS, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    notifStore.createIndex('timestamp', 'timestamp', { unique: false });
                    notifStore.createIndex('read', 'read', { unique: false });
                }

                // Subscriptions store
                if (!db.objectStoreNames.contains(STORES.SUBSCRIPTIONS)) {
                    const subStore = db.createObjectStore(STORES.SUBSCRIPTIONS, { 
                        keyPath: 'id' 
                    });
                    subStore.createIndex('endpoint', 'endpoint', { unique: true });
                }

                // Settings store
                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                }

                console.log('[IndexedDB] Database upgrade complete');
            };
        });
    }

    // Generic CRUD operations
    async add(storeName, data) {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const dataWithMeta = {
                ...data,
                timestamp: data.timestamp || Date.now(),
                synced: data.synced || false
            };

            const request = store.add(dataWithMeta);

            request.onsuccess = () => {
                console.log(`[IndexedDB] Added to ${storeName}:`, request.result);
                resolve({ ...dataWithMeta, id: request.result });
            };

            request.onerror = () => {
                console.error(`[IndexedDB] Error adding to ${storeName}:`, request.error);
                reject(request.error);
            };
        });
    }

    async get(storeName, id) {
        await this.ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getAll(storeName, indexName = null, query = null) {
        await this.ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            if (indexName && query !== null) {
                const index = store.index(indexName);
                request = index.getAll(query);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async update(storeName, data) {
        await this.ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => {
                console.log(`[IndexedDB] Updated in ${storeName}:`, data.id);
                resolve(data);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async delete(storeName, id) {
        await this.ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log(`[IndexedDB] Deleted from ${storeName}:`, id);
                resolve(true);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async clear(storeName) {
        await this.ensureReady();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                console.log(`[IndexedDB] Cleared ${storeName}`);
                resolve(true);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async ensureReady() {
        if (!this.isReady) {
            await this.init();
        }
    }

    // ========================================
    // NOTES specific methods
    // ========================================
    async addNote(text) {
        return this.add(STORES.NOTES, {
            text,
            timestamp: Date.now(),
            synced: false
        });
    }

    async getAllNotes() {
        const notes = await this.getAll(STORES.NOTES);
        return notes.sort((a, b) => b.timestamp - a.timestamp);
    }

    async deleteNote(id) {
        return this.delete(STORES.NOTES, id);
    }

    async getUnsyncedNotes() {
        return this.getAll(STORES.NOTES, 'synced', false);
    }

    async markNoteSynced(id) {
        const note = await this.get(STORES.NOTES, id);
        if (note) {
            note.synced = true;
            return this.update(STORES.NOTES, note);
        }
    }

    // ========================================
    // NOTIFICATIONS specific methods
    // ========================================
    async addNotification(notification) {
        return this.add(STORES.NOTIFICATIONS, {
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            timestamp: notification.timestamp || Date.now(),
            read: false
        });
    }

    async getAllNotifications() {
        const notifications = await this.getAll(STORES.NOTIFICATIONS);
        return notifications.sort((a, b) => b.timestamp - a.timestamp);
    }

    async markNotificationRead(id) {
        const notification = await this.get(STORES.NOTIFICATIONS, id);
        if (notification) {
            notification.read = true;
            return this.update(STORES.NOTIFICATIONS, notification);
        }
    }

    async clearNotifications() {
        return this.clear(STORES.NOTIFICATIONS);
    }

    // ========================================
    // SUBSCRIPTION specific methods
    // ========================================
    async saveSubscription(subscription) {
        const data = {
            id: 'current',
            endpoint: subscription.endpoint,
            keys: subscription.keys || {},
            userName: subscription.userName,
            preferences: subscription.preferences || [],
            createdAt: Date.now()
        };

        try {
            await this.update(STORES.SUBSCRIPTIONS, data);
        } catch {
            await this.add(STORES.SUBSCRIPTIONS, data);
        }

        return data;
    }

    async getSubscription() {
        return this.get(STORES.SUBSCRIPTIONS, 'current');
    }

    async deleteSubscription() {
        return this.delete(STORES.SUBSCRIPTIONS, 'current');
    }

    // ========================================
    // SETTINGS specific methods
    // ========================================
    async setSetting(key, value) {
        return new Promise(async (resolve, reject) => {
            await this.ensureReady();
            
            const transaction = this.db.transaction(STORES.SETTINGS, 'readwrite');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.put({ key, value });

            request.onsuccess = () => resolve(value);
            request.onerror = () => reject(request.error);
        });
    }

    async getSetting(key, defaultValue = null) {
        const result = await this.get(STORES.SETTINGS, key);
        return result ? result.value : defaultValue;
    }
}

// Create and export singleton instance
const DB = new IndexedDBManager();

// Initialize on load
DB.init().then(() => {
    console.log('[IndexedDB] Database ready');
}).catch((error) => {
    console.error('[IndexedDB] Failed to initialize:', error);
});

