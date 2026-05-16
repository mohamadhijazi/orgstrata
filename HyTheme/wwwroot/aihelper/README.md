# AIJS Helper: Complete Architectural Reference

This document serves as the comprehensive, detailed blueprint for the **Local Multi-Workspace Knowledge Graph & AI System**. It is designed as a primary reference for rebuilding the application from scratch or for context during "video coding" sessions.

## 🚀 Concept Overview
This application transforms the browser into a private, local agentic AI operating system. 
Instead of relying on a backend database, it treats **IndexedDB** as a persistent Knowledge Graph and Document Store. The AI communicates directly with the browser via a standard LLM completion endpoint, extracting structured JSON (nodes, edges, reminders, charts) from conversational input and continuously updating its local "memory".

---

## 📂 Project Structure & Responsibilities

The application consists of the following core vanilla JavaScript and web files. It is strictly frontend-only, with no Node.js/Backend required.

| File | Purpose & Responsibilities |
| :--- | :--- |
| `index.html` | The DOM shell. Contains the Sidebar (workspaces), Main Panel with 3 tabs (Chat, Knowledge Graph, Charts), and Modals for Settings/Workspace creation. Includes external CDNs for Highcharts and Cytoscape.js. |
| `Style.css` | Handles the premium, dark-mode aesthetic using CSS variables, Flexbox, CSS Grid, and Glassmorphism effects. |
| `main.js` | The Controller. Handles UI routing (tabs, modals), LLM API fetch cycles, CSV parsing/export, and DOM manipulation (rendering chat messages, injecting AI responses). |
| `workspace-Manager.js` | The Global DB Manager. Manages a single top-level IndexedDB database (`WorkspaceManager`) containing a `workspaces` store with metadata for all created workspaces. |
| `KnowledgeGraph-Manager.js` | The Context DB Manager. When a workspace is selected, it opens a dedicated, isolated database (e.g., `LocalKG_ws_123`). It contains stores for `nodes`, `edges`, `chat_sessions`, `chat_messages`, `reminders`, `charts`, and `metadata`. |
| `highchart-Manager.js` | The BI ETL Engine. Prompts the AI to perform ETL on the current knowledge graph, returns Highcharts JSON configurations, saves them locally, and renders them. |
| `reminderjob-manager.js` | The Background Scheduler. Uses `setInterval` to check the `reminders` store every 60 seconds. Triggers browser notifications and injects alert divs into the chat UI when a deadline is met. |

---

## 🧠 Database Schema & Isolation Logic

### Multi-Tenant Isolation
The application acts as a multi-tenant system for a single user.
- **Database 1**: `WorkspaceManager` -> Stores `{ id: 'ws_1', name: 'Company' }`
- **Database 2**: `LocalKG_ws_1` -> Stores Company Nodes, Company Chats, Company Charts.
- **Database 3**: `LocalKG_ws_2` -> Stores Family Nodes, Family Chats, Family Charts.
Data from `ws_1` cannot physically interact with `ws_2`.

### Knowledge Graph Schema (Inside `LocalKG_<id>`)
- **`nodes`**: `{ id: string, type: string, label: string, properties: object, created_at: number }`
- **`edges`**: `{ id: string, from: string, to: string, type: string, properties: object, created_at: number }`
- **`chat_messages`**: `{ id: string, session_id: string, role: string, content: string, extracted_knowledge: array<string> }`
- **`reminders`**: `{ id: string, title: string, due_date: string, status: string, metadata: object }`
- **`charts`**: `{ id: string, title: string, config: object, created_at: number }`

---

## 🤖 AI Integration & Prompts

The core magic relies on appending a hidden `json` block to the AI's natural language responses. 

### 1. The Main Chat & Extraction Prompt (in `main.js`)
When a user sends a message, `main.js` grabs the last 10 chat messages and the entire Node/Edge context from `KnowledgeGraph-Manager.js`. It passes the following System Prompt to the LLM:

```text
You are an intelligent agent operating inside a specific workspace.
You act as both a helpful assistant and a Knowledge Graph Extractor.
For every user message, provide a helpful natural language response.
IF you identify new entities, relationships, or facts, append a JSON block at the very end of your response inside \`\`\`json ... \`\`\`.

Follow this exact JSON schema:
{
    "new_nodes": [ { "type": "Concept|Person", "label": "Name", "properties": {} } ],
    "new_edges": [ { "from": "id", "to": "id", "type": "relates", "properties": {} } ],
    "new_reminders": [ { "title": "...", "due_date": "YYYY-MM-DDTHH:MM", "metadata": {} } ]
}
Never invent facts. Ask the user questions when needed.
```
*Logic: The UI strips out the ```json block using Regex before displaying the message to the user, parsing it silently in the background via `applyAIUpdate()`.*

### 2. The Chart ETL Prompt (in `highchart-Manager.js`)
When a user clicks "Request New Chart", a specialized prompt forces the AI into a strict data-transformation role:

```text
You are a Chart Builder AI.
Your job is to take the provided Knowledge Graph data (nodes and edges) and the user's request, and perform ETL to output a valid Highcharts configuration object.
Do NOT output any markdown other than the JSON block. Do NOT invent data.
Output strictly JSON matching this structure:
{
    "chart_title": "Descriptive Title",
    "highcharts_config": { ... }
}
```

---

## 🛠️ Key Execution Flows (For Video Coding reference)

### A. How a Chat Updates the Graph
1. **User** types: *"Add John as the lead of Project Alpha"*.
2. **`main.js`** captures this, fetches `getContextForAI()`, and POSTs to `/api/chat/stream`.
3. **AI** returns: *"I have added John to Project Alpha. \`\`\`json { "new_nodes": [...], "new_edges": [...] } \`\`\`"*.
4. **`main.js`** extracts the JSON via regex.
5. **`main.js`** calls `kgManager.applyAIUpdate(parsedJSON)`.
6. **`KnowledgeGraph-Manager.js`** generates random `id`s and saves them to IndexedDB via `dbPut()`.
7. **`main.js`** calls `renderGraph()`, which translates the nodes to Cytoscape.js format and visually updates the canvas.

### B. How Reminders Fire
1. **AI** generates a reminder JSON block.
2. Saved to IndexedDB `reminders` store with `status: 'pending'`.
3. **`reminderjob-manager.js`** has a `setInterval(..., 60000)` running.
4. Interval triggers `checkReminders()`, checks if `due_date <= Date.now()`.
5. Triggers `new Notification()` via browser API.
6. Injects a red `div` directly into the DOM of the active chat window.

### C. CSV Bulk Import
1. **User** clicks "Upload CSV".
2. **`main.js`** intercepts the `input type="file"`.
3. Uses `FileReader` to read text.
4. Splits by `\n` and `,`, looping over rows.
5. Calls `kgManager.createNode(type, label)` rapidly.
6. Invokes `renderGraph()` to show immediate results.

---

## 🧪 Testing & Setup
To run the app locally:
1. Open `index.html` directly in Chrome/Edge/Firefox. No local server is strictly required, though VS Code Live Server is recommended to prevent strict origin CORS issues on some browsers.
2. Click **⚙️ Settings** in the bottom left sidebar.
3. Enter your active `LLM API Key`.
4. Create a workspace to trigger the IndexedDB initialization.
5. Start chatting!
