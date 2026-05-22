class KnowledgeGraphManager {
    constructor() {
        this.db = null;
        this.workspaceId = null;
    }

    async openWorkspace(workspaceId) {
        this.workspaceId = workspaceId;
        const dbName = `LocalKG_${workspaceId}`;

        if (this.db) {
            this.db.close();
            this.db = null;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 2);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const stores = [
                    'nodes',
                    'edges',
                    'embeddings',
                    'chat_sessions',
                    'chat_messages',
                    'metadata',
                    'charts',
                    'reminders',
                    'bpmn'
                ];

                stores.forEach(store => {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store, { keyPath: 'id' });
                    }
                });
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => reject(event.target.error);
        });
    }

    // ==========================================
    // Generic IDB Helpers
    // ==========================================
    async dbPut(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(data);
            request.onerror = () => reject(request.error);
        });
    }

    async dbGet(storeName, id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async dbGetAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async dbDelete(storeName, id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ==========================================
    // NODE CRUD
    // ==========================================
    async createNode(type, label, properties = {}) {
        const id = 'node_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const node = { id, type, label, properties, created_at: Date.now() };
        return this.dbPut('nodes', node);
    }

    async getNode(id) {
        return this.dbGet('nodes', id);
    }

    async updateNode(id, updates) {
        const node = await this.getNode(id);
        if (!node) throw new Error("Node not found");
        const updatedNode = { ...node, ...updates, updated_at: Date.now() };
        return this.dbPut('nodes', updatedNode);
    }

    async deleteNode(id) {
        // First delete all edges connected to this node
        const edges = await this.dbGetAll('edges');
        const connectedEdges = edges.filter(e => e.from === id || e.to === id);
        for (let e of connectedEdges) {
            await this.dbDelete('edges', e.id);
        }
        // Delete node
        return this.dbDelete('nodes', id);
    }

    async searchNodes(predicateFn) {
        const nodes = await this.dbGetAll('nodes');
        return nodes.filter(predicateFn);
    }

    // ==========================================
    // EDGE CRUD
    // ==========================================
    async createEdge(from, to, type, properties = {}) {
        const id = 'edge_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const edge = { id, from, to, type, properties, created_at: Date.now() };
        return this.dbPut('edges', edge);
    }

    async getEdgesForNode(id) {
        const edges = await this.dbGetAll('edges');
        return edges.filter(e => e.from === id || e.to === id);
    }

    async deleteEdge(id) {
        return this.dbDelete('edges', id);
    }

    async getConnectedNodes(id, relationType = null) {
        const edges = await this.getEdgesForNode(id);
        const filteredEdges = relationType ? edges.filter(e => e.type === relationType) : edges;

        const nodeIds = new Set();
        filteredEdges.forEach(e => {
            if (e.from !== id) nodeIds.add(e.from);
            if (e.to !== id) nodeIds.add(e.to);
        });

        const nodes = [];
        for (let nId of nodeIds) {
            const n = await this.getNode(nId);
            if (n) nodes.push(n);
        }
        return nodes;
    }

    // ==========================================
    // GRAPH QUERY ENGINE
    // ==========================================
    async getNeighbors(id, type = null) {
        return this.getConnectedNodes(id, type);
    }

    async getSubgraph(rootId, depth = 1) {
        const visited = new Set();
        const nodes = [];
        const edges = [];

        const queue = [{ id: rootId, currentDepth: 0 }];

        while (queue.length > 0) {
            const { id, currentDepth } = queue.shift();

            if (visited.has(id)) continue;
            visited.add(id);

            const node = await this.getNode(id);
            if (node) nodes.push(node);

            if (currentDepth < depth) {
                const nodeEdges = await this.getEdgesForNode(id);
                for (let e of nodeEdges) {
                    // Only add edge if we haven't seen it yet
                    if (!edges.some(existing => existing.id === e.id)) {
                        edges.push(e);
                    }
                    if (e.from === id && !visited.has(e.to)) queue.push({ id: e.to, currentDepth: currentDepth + 1 });
                    if (e.to === id && !visited.has(e.from)) queue.push({ id: e.from, currentDepth: currentDepth + 1 });
                }
            }
        }
        return { nodes, edges };
    }

    // ==========================================
    // CHAT HISTORY API
    // ==========================================
    async createChatSession(title) {
        const id = 'session_' + Date.now();
        const session = { id, title, created_at: Date.now(), messages: [] };
        return this.dbPut('chat_sessions', session);
    }

    async listSessions() {
        return this.dbGetAll('chat_sessions');
    }

    async addMessage(sessionId, role, content, extractedKnowledge = []) {
        const id = 'msg_' + Date.now();
        const msg = {
            id,
            session_id: sessionId,
            role,
            content,
            timestamp: Date.now(),
            extracted_knowledge: extractedKnowledge // array of node IDs
        };
        await this.dbPut('chat_messages', msg);

        // Update session
        const session = await this.dbGet('chat_sessions', sessionId);
        if (session) {
            session.messages.push(id);
            await this.dbPut('chat_sessions', session);
        }
        return msg;
    }

    async getSessionMessages(sessionId) {
        const allMessages = await this.dbGetAll('chat_messages');
        return allMessages.filter(m => m.session_id === sessionId).sort((a, b) => a.timestamp - b.timestamp);
    }

    // ==========================================
    // AI INTEGRATION HELPERS
    // ==========================================
    async getContextForAI() {
        // Grabs a simplified representation of the graph for the context window
        // In a large graph, you would use search or RAG, but here we return a subset.
        const nodes = await this.dbGetAll('nodes');
        const edges = await this.dbGetAll('edges');
        return { nodes, edges };
    }
    async applyAIUpdate(updateJSON) {

        // Takes { new_nodes: [], new_edges: [], updates: [] }



        const createdNodes = [];

        const createdEdges = [];



        // Step 1: Create nodes and build ID map

        const idMap = new Map(); // AI ID → real node.id



        if (updateJSON.new_nodes && Array.isArray(updateJSON.new_nodes)) {

            for (let n of updateJSON.new_nodes) {

                const node = await this.createNode(

                    n.type,

                    n.label,

                    n.properties || {}

                );



                createdNodes.push(node);



                // Use a stable identifier

                const aiId = n._realId || n.properties?.id || n.label;

                idMap.set(aiId, node.id);

            }

        }



        // Step 2: Create edges after resolving IDs

        if (updateJSON.new_edges && Array.isArray(updateJSON.new_edges)) {

            for (let e of updateJSON.new_edges) {



                let fromId = e.from;

                let toId = e.to;



                // Resolve "from"

                if (idMap.has(fromId)) {

                    fromId = idMap.get(fromId);

                } else if (typeof fromId === 'string' && fromId.startsWith('node_')) {

                    // assume already valid

                } else {

                    console.warn('Unknown from node ID in edge:', e.from);

                    continue;

                }



                // Resolve "to"

                if (idMap.has(toId)) {

                    toId = idMap.get(toId);

                } else if (typeof toId === 'string' && toId.startsWith('node_')) {

                    // assume already valid

                } else {

                    console.warn('Unknown to node ID in edge:', e.to);

                    continue;

                }



                try {

                    const edge = await this.createEdge(

                        fromId,

                        toId,

                        e.type,

                        e.properties || {}

                    );



                    createdEdges.push(edge);

                } catch (err) {

                    console.error('Failed to create edge:', e, 'Error:', err.message);

                }

            }

        }



        return { createdNodes, createdEdges };

    }
    // ==========================================
    // BPMN HELPERS
    // ==========================================
    async saveBpmnXml(xml) {
        return this.dbPut('bpmn', { id: 'default', xml: xml, updated_at: Date.now() });
    }

    async getBpmnXml() {
        return this.dbGet('bpmn', 'default');
    }
}

// Global instance
const kgManager = new KnowledgeGraphManager();
