class WorkspaceManager {
    constructor() {
        this.dbName = 'WorkspaceManager';
        this.dbVersion = 1;
        this.db = null;
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('workspaces')) {
                    db.createObjectStore('workspaces', { keyPath: 'id' });
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async listWorkspaces() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workspaces'], 'readonly');
            const store = transaction.objectStore('workspaces');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async createWorkspace(name) {
        const id = 'ws_' + Date.now();
        const workspace = {
            id,
            name,
            created_at: Date.now(),
            last_opened: Date.now()
        };
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workspaces'], 'readwrite');
            const store = transaction.objectStore('workspaces');
            const request = store.add(workspace);
            request.onsuccess = () => resolve(workspace);
            request.onerror = () => reject(request.error);
        });
    }
}

// Global instance
const workspaceManager = new WorkspaceManager();
