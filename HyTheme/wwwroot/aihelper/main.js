// AI Configuration
const AI_API_URL = '/api/chat/stream';
const AI_MODEL = 'orgstrata'; // Using the model from instructions


const SYSTEM_PROMPT = `
You are an intelligent agent operating inside a specific workspace.
You act as both a helpful assistant and a Knowledge Graph Extractor.
For every user message, provide a helpful natural language response.
IF you identify new entities, relationships, or facts, append a JSON block at the very end of your response inside \`\`\`json ... \`\`\`.

Follow this exact JSON schema:
{
    "new_nodes": [
        { "type": "Concept|Person|Project", "label": "Name", "properties": {} }
    ],
    "new_edges": [
        { "from": "node_label_or_id", "to": "node_label_or_id", "type": "relates_to", "properties": {} }
    ],
    "new_reminders": [
        { "title": "Reminder Title", "due_date": "YYYY-MM-DDTHH:MM:SSZ", "metadata": {} }
    ],
    "updates": [],
    "missing": [],
    "linked_nodes": []
}
Never invent facts, do not add comments in the json. Ask the user questions when needed.
`;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Global Workspace DB
    await workspaceManager.init();
    
    let activeWorkspace = null;
    let activeSessionId = null;

    // 2. Render Workspaces Sidebar
    async function renderWorkspaces() {
        const list = document.getElementById('workspace-list');
        list.innerHTML = '';
        
        const workspaces = await workspaceManager.listWorkspaces();
        workspaces.forEach(ws => {
            const li = document.createElement('li');
            li.className = 'workspace-item';
            li.innerHTML = `<span>${ws.name}</span>`;
            li.onclick = () => switchWorkspace(ws);
            list.appendChild(li);
        });
    }
    
    await renderWorkspaces();

    // 3. Workspace Switching Logic
    async function switchWorkspace(ws) {
        activeWorkspace = ws;
        document.getElementById('active-workspace-title').textContent = ws.name;
        
        // Highlight active sidebar item
        document.querySelectorAll('.workspace-item').forEach(el => el.classList.remove('active'));
        Array.from(document.querySelectorAll('.workspace-item')).forEach(el => {
            if(el.textContent === ws.name) el.classList.add('active');
        });

        // Initialize specific workspace DB
        await kgManager.openWorkspace(ws.id);
        highchartManager.setWorkspace(ws.id);
        reminderJobManager.setWorkspace(ws.id);
        
        // Start background tasks
        reminderJobManager.start();
        console.log(`Switched to workspace: ${ws.name} (${ws.id})`);
        
        // Setup Chat Session
        const sessions = await kgManager.listSessions();
        if (sessions.length === 0) {
            const newSession = await kgManager.createChatSession("Main Session");
            activeSessionId = newSession.id;
        } else {
            activeSessionId = sessions[0].id; // Just use the first one for simplicity
        }

        await loadChatHistory();
        await initDemoData();
        renderGraph(); // Try to render if cytoscape is ready
    }

    async function initDemoData() {
        const context = await kgManager.getContextForAI();
        if (context.nodes.length === 0 && activeWorkspace) {
            console.log(`Initializing demo data for workspace: ${activeWorkspace.name}...`);
            if (activeWorkspace.name === 'Family') {
                const father = await kgManager.createNode('Person', 'Father', { age: 42, birthday: '1984-05-10', passportInfo: 'P1234567' });
                const mother = await kgManager.createNode('Person', 'Mother', { age: 40, birthday: '1986-08-22', passportInfo: 'P7654321' });
                const child1 = await kgManager.createNode('Person', 'Child 1', { age: 19, birthday: '2005-03-15', uni: 'State University', passportInfo: 'P1122334' });
                const child2 = await kgManager.createNode('Person', 'Child 2', { age: 14, birthday: '2010-11-05', passportInfo: 'P4433221' });
                
                const costSamples = await kgManager.createNode('Concept', 'Monthly Living Costs', {
                    housing: 2500,
                    groceries: 900,
                    utilities: 350,
                    education: 600
                });

                await kgManager.createEdge(father.id, mother.id, 'spouse');
                await kgManager.createEdge(mother.id, father.id, 'spouse');
                await kgManager.createEdge(father.id, child1.id, 'parent');
                await kgManager.createEdge(father.id, child2.id, 'parent');
                await kgManager.createEdge(mother.id, child1.id, 'parent');
                await kgManager.createEdge(mother.id, child2.id, 'parent');
                await kgManager.createEdge(father.id, costSamples.id, 'pays');
                await kgManager.createEdge(mother.id, costSamples.id, 'pays');
            } else if (activeWorkspace.name === 'Company') {
                const company = await kgManager.createNode('Organization', 'Book Retailer Co.', { 
                    size: 'Mid-size',
                    products: 'Physical copies and eBooks',
                    employees: 150
                });
                const board = await kgManager.createNode('Group', 'C-Level Board', { members: 5 });
                const ceo = await kgManager.createNode('Person', 'CEO', { name: 'Alice Smith' });
                const salesDept = await kgManager.createNode('Department', 'Sales', { headCount: 50 });
                const hrDept = await kgManager.createNode('Department', 'HR', { headCount: 5 });
                const process = await kgManager.createNode('Process', 'Book Sourcing', { description: 'Sourcing physical books from publishers' });
                
                await kgManager.createEdge(company.id, board.id, 'governed_by');
                await kgManager.createEdge(board.id, ceo.id, 'appoints');
                await kgManager.createEdge(ceo.id, company.id, 'manages');
                await kgManager.createEdge(company.id, salesDept.id, 'has_department');
                await kgManager.createEdge(company.id, hrDept.id, 'has_department');
                await kgManager.createEdge(salesDept.id, process.id, 'executes');
            }
        }
    }

    // 4. Chat UI & AI Logic
    const chatHistoryDiv = document.getElementById('chat-history');
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send-msg');

    function appendMessageToUI(role, content) {
        // Hide welcome message
        const welcomeMsg = document.querySelector('.welcome-msg');
        if (welcomeMsg) welcomeMsg.style.display = 'none';

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${role}`;
        msgDiv.style.padding = '10px';
        msgDiv.style.margin = '10px 0';
        msgDiv.style.borderRadius = '8px';
        msgDiv.style.backgroundColor = role === 'user' ? 'var(--accent)' : 'var(--bg-panel)';
        
        // Remove JSON blocks from UI display
        const cleanContent = content.replace(/```json[\s\S]*?```/gi, '').trim();
        msgDiv.textContent = cleanContent || "Processing...";
        
        chatHistoryDiv.appendChild(msgDiv);
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
        return msgDiv;
    }

    async function loadChatHistory() {
        chatHistoryDiv.innerHTML = '<div class="welcome-msg">Welcome!</div>';
        const messages = await kgManager.getSessionMessages(activeSessionId);
        messages.forEach(m => appendMessageToUI(m.role, m.content));
    }

    async function handleSendMessage() {
        const text = chatInput.value.trim();
        if (!text || !activeWorkspace) return;
        
        chatInput.value = '';
        
        // 1. Save and display user message
        await kgManager.addMessage(activeSessionId, 'user', text);
        appendMessageToUI('user', text);

        // 2. Fetch Context
        const context = await kgManager.getContextForAI();
        const apiKey = localStorage.getItem('llm_api_key');

        if (!apiKey) {
            appendMessageToUI('ai', 'Error: Please set your LLM API Key in Settings.');
            return;
        }

        // 3. Build AI Payload
        const messages = await kgManager.getSessionMessages(activeSessionId);
        const apiMessages = [
            { role: 'system', content: SYSTEM_PROMPT + "\\n\\nCurrent Graph State:\\n" + JSON.stringify(context) }
        ];
        
        // Add last 10 messages for context
        messages.slice(-10).forEach(m => {
            apiMessages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content });
        });

        // Add dummy UI for AI
        const aiMsgDiv = appendMessageToUI('ai', 'Thinking...');

        try {
            const res = await fetch(AI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer sk-96f268d1b15a439eb5793e1daabf6277`
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    messages: apiMessages,
                    temperature: 0.7
                })
            });

            if (!res.ok) throw new Error("API Response Error: " + res.status);

////

const reader = res.body.getReader();
                const decoder = new TextDecoder('utf-8');    
                var aiText="";             
 while (true) {

                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });                      

                    const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

                    for (const line of lines) {
                        const jsonStr = line.replace(/^data:\s*/, '');

                        if (jsonStr === '[DONE]') continue;
                        try {

                            const data = JSON.parse(jsonStr);

                            const content = data.choices?.[0]?.delta?.content || '';   
                            aiText += content;            

			//this.aiResponse =fullResponse;

                        } catch (err) {

                            console.error('Error parsing chunk:', err);

                        }

                    }

                }

                 // 4. Parse Graph JSON
            let extractedNodes = [];
            const jsonMatch = aiText.match(/```json([\s\S]*?)```/i);
            if (jsonMatch) {
                try {
                    let cleanText = jsonMatch[1];
                    cleanText = cleanText.replace(/\/\/.*$/gm, "");
    cleanText = cleanText.replace(/#.*$/gm, "");
                    const parsed = JSON.parse(cleanText);
                    const updateResult = await kgManager.applyAIUpdate(parsed);
                    extractedNodes = updateResult.createdNodes.map(n => n.id);
                    
                    // Handle new reminders specifically
                    if (parsed.new_reminders && Array.isArray(parsed.new_reminders)) {
                        for (let r of parsed.new_reminders) {
                            const remId = 'rem_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
                            await kgManager.dbPut('reminders', {
                                id: remId,
                                title: r.title,
                                due_date: r.due_date,
                                metadata: r.metadata || {},
                                status: "pending",
                                workspace_id: activeWorkspace.id,
                                created_at: Date.now()
                            });
                        }
                        appendMessageToUI('ai', `*(Created ${parsed.new_reminders.length} reminder(s))*`);
                    }

                    renderGraph(); // update visual
                } catch(e) {
                    console.error("Failed to parse JSON from AI", e);
                }
            }

            // 5. Save and display AI message
            await kgManager.addMessage(activeSessionId, 'ai', aiText, extractedNodes);
            
            // Clean JSON from output
            const cleanContent = aiText.replace(/```json[\s\S]*?```/gi, '').trim();
            aiMsgDiv.textContent = cleanContent;
  
                           console.log(cleanContent);  
///



           // const data = await res.json();
            // const aiText = data.choices[0].message.content;

            // // 4. Parse Graph JSON
            // let extractedNodes = [];
            // const jsonMatch = aiText.match(/```json([\s\S]*?)```/i);
            // if (jsonMatch) {
            //     try {
            //         const parsed = JSON.parse(jsonMatch[1]);
            //         const updateResult = await kgManager.applyAIUpdate(parsed);
            //         extractedNodes = updateResult.createdNodes.map(n => n.id);
                    
            //         // Handle new reminders specifically
            //         if (parsed.new_reminders && Array.isArray(parsed.new_reminders)) {
            //             for (let r of parsed.new_reminders) {
            //                 const remId = 'rem_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            //                 await kgManager.dbPut('reminders', {
            //                     id: remId,
            //                     title: r.title,
            //                     due_date: r.due_date,
            //                     metadata: r.metadata || {},
            //                     status: "pending",
            //                     workspace_id: activeWorkspace.id,
            //                     created_at: Date.now()
            //                 });
            //             }
            //             appendMessageToUI('ai', `*(Created ${parsed.new_reminders.length} reminder(s))*`);
            //         }

            //         renderGraph(); // update visual
            //     } catch(e) {
            //         console.error("Failed to parse JSON from AI", e);
            //     }
            // }

            // // 5. Save and display AI message
            // await kgManager.addMessage(activeSessionId, 'ai', aiText, extractedNodes);
            
            // // Clean JSON from output
            // const cleanContent = aiText.replace(/```json[\s\S]*?```/gi, '').trim();
            // aiMsgDiv.textContent = cleanContent;

        } catch (error) {
            console.error(error);
            aiMsgDiv.textContent = "Sorry, an error occurred communicating with the AI.";
        }
    }

    btnSend.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // 5. Cytoscape Graph Rendering
    async function renderGraph() {
        if (typeof cytoscape === 'undefined' || !activeWorkspace) return;
        
        const context = await kgManager.getContextForAI();
        const cyElements = [];

        context.nodes.forEach(n => {
            cyElements.push({ data: { id: n.id, label: n.label, type: n.type } });
        });

        context.edges.forEach(e => {
            // Cytoscape needs source/target
            cyElements.push({ data: { id: e.id, source: e.from, target: e.to, label: e.type } });
        });

        const cy = cytoscape({
            container: document.getElementById('cy'),
            elements: cyElements,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#3b82f6',
                        'label': 'data(label)',
                        'color': '#fff',
                        'text-valign': 'center',
                        'text-outline-width': 2,
                        'text-outline-color': '#3b82f6'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#94a3b8',
                        'target-arrow-color': '#94a3b8',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'label': 'data(label)',
                        'font-size': '10px',
                        'color': '#cbd5e1',
                        'text-rotation': 'autorotate'
                    }
                }
            ],
            layout: { name: 'cose' }
        });
    }

    document.getElementById('btn-refresh-graph').addEventListener('click', renderGraph);

    // 6. Tab Navigation & Modals logic (Copied over)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            const tabId = e.target.dataset.tab;
            document.getElementById(tabId).classList.add('active');
            if(tabId === 'knowledge-tab') renderGraph();
        });
    });

    // Modals
    const modalNewWs = document.getElementById('modal-new-workspace');
    document.getElementById('btn-new-workspace').addEventListener('click', () => { modalNewWs.classList.add('active'); });
    document.getElementById('btn-cancel-workspace').addEventListener('click', () => { modalNewWs.classList.remove('active'); });
    document.getElementById('btn-save-workspace').addEventListener('click', async () => {
        const nameInput = document.getElementById('input-workspace-name');
        if (nameInput.value.trim()) {
            const newWs = await workspaceManager.createWorkspace(nameInput.value.trim());
            await renderWorkspaces();
            modalNewWs.classList.remove('active');
            nameInput.value = '';
            switchWorkspace(newWs);
        }
    });

    // Settings Modal
    const modalSettings = document.getElementById('modal-settings');
    document.getElementById('btn-settings').addEventListener('click', () => {
        modalSettings.classList.add('active');
        document.getElementById('input-api-key').value = localStorage.getItem('llm_api_key') || '';
    });
    document.getElementById('btn-cancel-settings').addEventListener('click', () => { modalSettings.classList.remove('active'); });
    document.getElementById('btn-save-settings').addEventListener('click', () => {
        localStorage.setItem('llm_api_key', document.getElementById('input-api-key').value);
        modalSettings.classList.remove('active');
    });

    // CSV Bulk Import/Export
    const btnExportCsv = document.getElementById('btn-export-csv');
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => {
            const csvContent = "Type,Label,Description,RelatedToLabel,RelationshipType\nPerson,John Doe,Lead Engineer,Project Alpha,works_on";
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "knowledge_graph_template.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    const inputCsvUpload = document.getElementById('input-csv-upload');
    if (inputCsvUpload) {
        inputCsvUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                const text = event.target.result;
                const lines = text.split('\\n').map(l => l.trim()).filter(l => l);
                
                // Extremely simple CSV parser for demo
                // Type,Label,Description,RelatedToLabel,RelationshipType
                const headers = lines[0].split(',');
                let importedNodes = 0;

                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(',');
                    if (cols.length >= 2) {
                        const type = cols[0];
                        const label = cols[1];
                        const desc = cols[2] || "";
                        await kgManager.createNode(type, label, { description: desc });
                        importedNodes++;
                        // Note: Edge creation logic could be added here if needed
                    }
                }
                
                alert(`Successfully imported ${importedNodes} nodes!`);
                renderGraph();
                inputCsvUpload.value = ''; // reset
            };
            reader.readAsText(file);
        });
    }
    
    // Auto-select or create default workspaces
    let workspaces = await workspaceManager.listWorkspaces();
    if (workspaces.length === 0) {
        await workspaceManager.createWorkspace("Family");
        await workspaceManager.createWorkspace("Company");
        workspaces = await workspaceManager.listWorkspaces();
        await renderWorkspaces();
    }
    if (workspaces.length > 0) switchWorkspace(workspaces[0]);
});
