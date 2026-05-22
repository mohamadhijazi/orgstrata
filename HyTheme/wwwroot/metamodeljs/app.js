// MetaModel Explorer Application Controller
document.addEventListener('DOMContentLoaded', () => {
    // Application State
    const state = {
        allClasses: new Map(), // name -> { name, caption, outgoing: [], incoming: [] }
        sortedClassNames: [],  // Sorted array of class names for the sidebar list
        selectedClass: null,   // Active class name
        canvasClasses: new Set(), // Classes currently rendered in the graph
        depth: 1,              // Neighborhood network depth (1 or 2)
        physicsEnabled: true,  // Toggle physics force simulation
        layoutMode: 'force',   // 'force', 'hierarchical-ud', 'hierarchical-lr'
        
        // Vis.js Network instances
        network: null,
        nodesDataSet: new vis.DataSet(),
        edgesDataSet: new vis.DataSet(),
        
        // Chart.js instance
        cardinalityChart: null
    };

    // DOM Elements
    const elements = {
        totalClasses: document.getElementById('stat-total-classes'),
        totalRelations: document.getElementById('stat-total-relations'),
        loadingIndicator: document.getElementById('loading-indicator'),
        loadingText: document.getElementById('loading-text'),
        btnUploadCsv: document.getElementById('btn-upload-csv'),
        csvFileInput: document.getElementById('csv-file-input'),
        classSearch: document.getElementById('class-search'),
        clearSearchBtn: document.getElementById('clear-search-btn'),
        filterCardinality: document.getElementById('filter-cardinality'),
        sortClasses: document.getElementById('sort-classes'),
        classList: document.getElementById('class-list'),
        
        // Canvas Controls
        btnZoomIn: document.getElementById('btn-zoom-in'),
        btnZoomOut: document.getElementById('btn-zoom-out'),
        btnFit: document.getElementById('btn-fit'),
        neighborhoodDepth: document.getElementById('neighborhood-depth'),
        layoutModeSelect: document.getElementById('layout-mode'),
        physicsToggle: document.getElementById('physics-toggle'),
        addClassInput: document.getElementById('add-class-input'),
        btnClassDatalist: document.getElementById('class-datalist'),
        btnAddClass: document.getElementById('btn-add-class'),
        btnClearGraph: document.getElementById('btn-clear-graph'),
        btnExportPng: document.getElementById('btn-export-png'),
        
        // Views
        graphEmptyState: document.getElementById('graph-empty-state'),
        tabUml: document.getElementById('tab-uml'),
        tabRaw: document.getElementById('tab-raw'),
        panelUmlView: document.getElementById('panel-uml-view'),
        panelRawView: document.getElementById('panel-raw-view'),
        
        // UML Box Details
        umlBoxCard: document.getElementById('uml-box-card'),
        umlClassTitle: document.getElementById('uml-class-title'),
        umlClassSubtitle: document.getElementById('uml-class-subtitle'),
        umlPropertiesList: document.getElementById('uml-properties-list'),
        umlReferencesList: document.getElementById('uml-references-list'),
        rawJsonOutput: document.getElementById('raw-json-output'),
        btnAddRelation: document.getElementById('btn-add-relation')
    };

    // Initialize Lucide Icons
    lucide.createIcons();

    // Setup UI components early so upload controls work even if autoload fails
    initGraphNetwork();
    setupEventListeners();

    // Load MetaModel Data automatically
    loadMetaModelData();

    // -------------------------------------------------------------
    // 1. Data Loading & Indexing
    // -------------------------------------------------------------
    function saveToLocalStorage() {
        // 1. Save classes
        const classesArray = [];
        for (const [name, classObj] of state.allClasses.entries()) {
            classesArray.push({
                name: name,
                caption: classObj.caption
            });
        }
        localStorage.setItem('metamodel_classes', JSON.stringify(classesArray));

        // 2. Save relations
        const relationsArray = [];
        for (const classObj of state.allClasses.values()) {
            relationsArray.push(...classObj.outgoing);
        }
        localStorage.setItem('metamodel_relations', JSON.stringify(relationsArray));

        // Update stats on header
        elements.totalClasses.textContent = state.allClasses.size;
        elements.totalRelations.textContent = relationsArray.length;
    }

    function buildFromDataArrays(classesArray, relationsArray) {
        state.allClasses.clear();
        
        // 1. Load classes
        classesArray.forEach(cls => {
            if (!cls.name) return;
            state.allClasses.set(cls.name, {
                name: cls.name,
                caption: cls.caption || cls.name,
                outgoing: [],
                incoming: []
            });
        });

        // 2. Load relations
        relationsArray.forEach(rel => {
            const source = rel.sourceClass;
            const target = rel.targetClass;
            const relation = rel.relation;

            if (!source || !target || !relation) return;

            // Ensure source class exists
            if (!state.allClasses.has(source)) {
                state.allClasses.set(source, {
                    name: source,
                    caption: source,
                    outgoing: [],
                    incoming: []
                });
            }

            // Ensure target class exists
            if (!state.allClasses.has(target)) {
                state.allClasses.set(target, {
                    name: target,
                    caption: target,
                    outgoing: [],
                    incoming: []
                });
            }

            // Add outgoing relation to source
            state.allClasses.get(source).outgoing.push(rel);
            // Add incoming relation to target
            state.allClasses.get(target).incoming.push(rel);
        });

        // Sort Class names
        state.sortedClassNames = Array.from(state.allClasses.keys()).sort();
        
        elements.totalClasses.textContent = state.allClasses.size;
        elements.totalRelations.textContent = relationsArray.length;
    }

    function parseCSVAndIndex(csvData) {
        const classesMap = new Map(); // name -> caption
        const relations = [];

        csvData.forEach(row => {
            const source = row.SOURCE_CLASS ? row.SOURCE_CLASS.trim() : '';
            const target = row.TARGET_CLASS ? row.TARGET_CLASS.trim() : '';
            const sourceCaption = row.SOURCE_CLASS_CAPTION ? row.SOURCE_CLASS_CAPTION.trim() : source;
            const relation = row.RELATION ? row.RELATION.trim() : '';
            
            if (!source || !target || !relation) return;

            // Collect classes
            if (!classesMap.has(source) || classesMap.get(source) === source) {
                classesMap.set(source, sourceCaption || source);
            }
            if (!classesMap.has(target)) {
                classesMap.set(target, target);
            }

            relations.push({
                relation: relation,
                caption: row.CAPTION ? row.CAPTION.trim() : relation,
                cardinality: row.CARDINALITY ? row.CARDINALITY.trim() : 'N/N',
                creationDate: row.CREATION_DATE ? row.CREATION_DATE.trim() : '',
                lastUpdate: row.LAST_UPDATE ? row.LAST_UPDATE.trim() : '',
                hint: row.HINT ? row.HINT.trim() : '',
                comments: row.A_COMMENTS ? row.A_COMMENTS.trim() : '',
                sourceClass: source,
                targetClass: target
            });
        });

        const classesArray = Array.from(classesMap.entries()).map(([name, caption]) => ({ name, caption }));
        
        // Rebuild state
        buildFromDataArrays(classesArray, relations);
        
        // Save to localStorage
        localStorage.setItem('metamodel_classes', JSON.stringify(classesArray));
        localStorage.setItem('metamodel_relations', JSON.stringify(relations));
    }

    async function loadMetaModelData() {
        try {
            const storedClasses = localStorage.getItem('metamodel_classes');
            const storedRelations = localStorage.getItem('metamodel_relations');

            if (storedClasses && storedRelations) {
                updateLoadingStatus('Loading from storage...', true);
                const classesArray = JSON.parse(storedClasses);
                const relationsArray = JSON.parse(storedRelations);
                
                buildFromDataArrays(classesArray, relationsArray);
                updateLoadingStatus('Loaded', false);
                
                initStats();
                renderClassList();
                setupDatalist();
                restoreWorkspaceView(); // Restore view state
                return;
            }

            updateLoadingStatus('Fetching CSV...', true);
            const response = await fetch('MetaModel.csv');
            if (!response.ok) {
                throw new Error(`Failed to load CSV: ${response.statusText}`);
            }
            
            const csvText = await response.text();
            updateLoadingStatus('Parsing CSV...', true);

            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors && results.errors.length > 0 && results.data.length === 0) {
                        console.error('PapaParse errors:', results.errors);
                        updateLoadingStatus('Parse Error!', false);
                        return;
                    }
                    
                    updateLoadingStatus('Indexing Metamodel...', true);
                    parseCSVAndIndex(results.data);
                    updateLoadingStatus('Loaded', false);
                    
                    // Initialize Dashboard and UI components
                    initStats();
                    renderClassList();
                    setupDatalist();
                    autoSelectDefaultClass();
                },
                error: (err) => {
                    console.error('Parsing error:', err);
                    updateLoadingStatus('Parse Error!', false);
                }
            });

        } catch (error) {
            console.error('Error loading data:', error);
            updateLoadingStatus('Load Failed! Click Upload CSV.', false);
            // Highlight the upload button to guide the user
            const uploadBtn = elements.btnUploadCsv;
            if (uploadBtn) {
                uploadBtn.style.boxShadow = '0 0 15px rgba(0, 242, 254, 0.8)';
                uploadBtn.style.borderColor = 'var(--accent-cyan)';
            }
        }
    }

    function updateLoadingStatus(text, showLoader) {
        elements.loadingText.textContent = text;
        if (showLoader) {
            elements.loadingIndicator.classList.add('loading');
            elements.loadingIndicator.style.display = 'flex';
        } else {
            elements.loadingIndicator.style.display = 'none';
        }
    }

    function saveWorkspaceView() {
        const viewState = {
            selectedClass: state.selectedClass,
            depth: state.depth,
            physicsEnabled: state.physicsEnabled,
            layoutMode: state.layoutMode,
            canvasClasses: Array.from(state.canvasClasses)
        };
        localStorage.setItem('metamodel_workspace_view', JSON.stringify(viewState));
    }

    function restoreWorkspaceView() {
        const viewStr = localStorage.getItem('metamodel_workspace_view');
        if (!viewStr) {
            autoSelectDefaultClass();
            return;
        }
        
        try {
            const viewState = JSON.parse(viewStr);
            
            // Restore settings
            state.depth = viewState.depth !== undefined ? viewState.depth : 1;
            state.physicsEnabled = viewState.physicsEnabled !== undefined ? viewState.physicsEnabled : true;
            state.layoutMode = viewState.layoutMode !== undefined ? viewState.layoutMode : 'force';
            
            elements.neighborhoodDepth.value = state.depth;
            elements.physicsToggle.checked = state.physicsEnabled;
            elements.layoutModeSelect.value = state.layoutMode;
            
            state.selectedClass = viewState.selectedClass || null;
            
            state.canvasClasses.clear();
            if (viewState.canvasClasses && viewState.canvasClasses.length > 0) {
                viewState.canvasClasses.forEach(c => {
                    if (state.allClasses.has(c)) {
                        state.canvasClasses.add(c);
                    }
                });
            }
            
            if (state.selectedClass && state.allClasses.has(state.selectedClass)) {
                selectClass(state.selectedClass, false); // display in UML box, don't reset canvas
                
                if (state.canvasClasses.size > 0) {
                    elements.graphEmptyState.style.display = 'none';
                    renderCanvasElements();
                } else {
                    rebuildGraphFromSelected();
                }
            } else {
                // Clear graph
                state.canvasClasses.clear();
                state.nodesDataSet.clear();
                state.edgesDataSet.clear();
                state.selectedClass = null;
                elements.umlClassTitle.textContent = 'No Class Selected';
                elements.umlClassSubtitle.textContent = 'Select a class from the list to begin';
                elements.umlPropertiesList.innerHTML = '<div class="empty-list-msg">No outgoing relationships.</div>';
                elements.umlReferencesList.innerHTML = '<div class="empty-list-msg">No incoming relationships.</div>';
                elements.umlBoxCard.classList.remove('active');
                if (elements.btnAddRelation) elements.btnAddRelation.style.display = 'none';
                elements.rawJsonOutput.textContent = '// Select a class to view its indexed data structure';
                elements.graphEmptyState.style.display = 'flex';
            }
            
        } catch (err) {
            console.error('Error restoring workspace view:', err);
            autoSelectDefaultClass();
        }
    }

    // -------------------------------------------------------------
    // 2. Sidebar Class Directory
    // -------------------------------------------------------------
    function renderClassList() {
        const query = elements.classSearch.value.toLowerCase().trim();
        const cardFilter = elements.filterCardinality.value;
        const sortBy = elements.sortClasses.value;
        
        let filtered = state.sortedClassNames.filter(name => {
            const classObj = state.allClasses.get(name);
            
            // Search filter
            const matchesSearch = name.toLowerCase().includes(query) || 
                                  classObj.caption.toLowerCase().includes(query) ||
                                  classObj.outgoing.some(r => r.relation.toLowerCase().includes(query) || r.caption.toLowerCase().includes(query)) ||
                                  classObj.incoming.some(r => r.relation.toLowerCase().includes(query) || r.caption.toLowerCase().includes(query));
            
            if (!matchesSearch) return false;
            
            // Cardinality filter
            if (cardFilter !== 'all') {
                const hasMatchingCard = classObj.outgoing.some(r => r.cardinality === cardFilter) || 
                                       classObj.incoming.some(r => r.cardinality === cardFilter);
                if (!hasMatchingCard) return false;
            }
            
            return true;
        });

        // Sorting
        if (sortBy === 'relations') {
            filtered.sort((a, b) => {
                const connA = state.allClasses.get(a).outgoing.length + state.allClasses.get(a).incoming.length;
                const connB = state.allClasses.get(b).outgoing.length + state.allClasses.get(b).incoming.length;
                return connB - connA; // Descending connections count
            });
        } else {
            filtered.sort(); // A-Z alpha
        }

        // Render to DOM
        elements.classList.innerHTML = '';
        if (filtered.length === 0) {
            elements.classList.innerHTML = '<li class="empty-list-msg">No matching classes found</li>';
            return;
        }

        filtered.forEach(name => {
            const classObj = state.allClasses.get(name);
            const totalConns = classObj.outgoing.length + classObj.incoming.length;
            
            const li = document.createElement('li');
            li.className = `class-item ${state.selectedClass === name ? 'active' : ''}`;
            li.dataset.classname = name;
            
            li.innerHTML = `
                <div class="class-item-details">
                    <span class="class-item-name" title="${name}">${name}</span>
                    <span class="class-item-caption" title="${classObj.caption}">${classObj.caption}</span>
                </div>
                <span class="class-item-badge" title="Total relationships">${totalConns}</span>
            `;
            
            li.addEventListener('click', () => {
                selectClass(name);
            });
            
            elements.classList.appendChild(li);
        });
    }

    function setupDatalist() {
        elements.btnClassDatalist.innerHTML = '';
        state.sortedClassNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            elements.btnClassDatalist.appendChild(option);
        });
    }

    // -------------------------------------------------------------
    // 3. Selection & UML Card Rendering
    // -------------------------------------------------------------
    function selectClass(className, rebuildGraph = true) {
        if (!state.allClasses.has(className)) return;

        state.selectedClass = className;
        
        // Highlight active item in directory list
        const activeItems = elements.classList.querySelectorAll('.class-item');
        activeItems.forEach(item => {
            if (item.dataset.classname === className) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });

        const classObj = state.allClasses.get(className);
        
        // Render UML Box Inspector
        elements.umlClassTitle.textContent = classObj.name;
        elements.umlClassSubtitle.textContent = classObj.caption;
        elements.umlBoxCard.classList.add('active');
        if (elements.btnAddRelation) {
            elements.btnAddRelation.style.display = 'flex';
        }
        
        // Render properties (outgoing)
        elements.umlPropertiesList.innerHTML = '';
        if (classObj.outgoing.length === 0) {
            elements.umlPropertiesList.innerHTML = '<div class="empty-list-msg">No outgoing relationships.</div>';
        } else {
            // Sort by relation name
            const sortedOutgoing = [...classObj.outgoing].sort((a, b) => a.relation.localeCompare(b.relation));
            sortedOutgoing.forEach(rel => {
                const targetObj = state.allClasses.get(rel.targetClass);
                const targetCaption = targetObj ? targetObj.caption : rel.targetClass;
                
                const item = document.createElement('div');
                item.className = 'uml-item';
                item.innerHTML = `
                    <div class="uml-item-header">
                        <div class="uml-item-actions-wrapper">
                            <span class="uml-relation-name">+ ${rel.relation}</span>
                            <div class="uml-item-actions">
                                <button class="btn-action-icon edit" title="Edit relationship"><i data-lucide="edit-3"></i></button>
                                <button class="btn-action-icon delete" title="Delete relationship"><i data-lucide="trash-2"></i></button>
                            </div>
                        </div>
                        <span class="uml-cardinality">${rel.cardinality}</span>
                    </div>
                    <div class="uml-target-row">
                        <span>→ </span><a class="uml-class-link" data-target="${rel.targetClass}">${rel.targetClass}</a> 
                        <span class="text-secondary" style="font-size:0.7rem;">(${targetCaption})</span>
                    </div>
                    <div class="uml-relation-caption">${rel.caption}</div>
                    ${rel.hint || rel.comments ? `<div class="uml-description">${rel.hint || rel.comments}</div>` : ''}
                `;
                
                // Navigate on target click
                item.querySelector('.uml-class-link').addEventListener('click', (e) => {
                    e.preventDefault();
                    selectClass(rel.targetClass);
                });

                // Edit click
                item.querySelector('.btn-action-icon.edit').addEventListener('click', (e) => {
                    e.stopPropagation();
                    openRelationModal('edit', rel);
                });

                // Delete click
                item.querySelector('.btn-action-icon.delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    confirmDeleteRelation(rel);
                });
                
                elements.umlPropertiesList.appendChild(item);
            });
        }

        // Render referenced by (incoming)
        elements.umlReferencesList.innerHTML = '';
        if (classObj.incoming.length === 0) {
            elements.umlReferencesList.innerHTML = '<div class="empty-list-msg">No incoming relationships.</div>';
        } else {
            const sortedIncoming = [...classObj.incoming].sort((a, b) => a.relation.localeCompare(b.relation));
            sortedIncoming.forEach(rel => {
                const sourceObj = state.allClasses.get(rel.sourceClass);
                const sourceCaption = sourceObj ? sourceObj.caption : rel.sourceClass;
                
                const item = document.createElement('div');
                item.className = 'uml-item';
                item.innerHTML = `
                    <div class="uml-item-header">
                        <div class="uml-item-actions-wrapper">
                            <span class="uml-relation-name">← ${rel.relation}</span>
                            <div class="uml-item-actions">
                                <button class="btn-action-icon edit" title="Edit relationship"><i data-lucide="edit-3"></i></button>
                                <button class="btn-action-icon delete" title="Delete relationship"><i data-lucide="trash-2"></i></button>
                            </div>
                        </div>
                        <span class="uml-cardinality">${rel.cardinality}</span>
                    </div>
                    <div class="uml-target-row">
                        <span>← </span><a class="uml-class-link" data-target="${rel.sourceClass}">${rel.sourceClass}</a> 
                        <span class="text-secondary" style="font-size:0.7rem;">(${sourceCaption})</span>
                    </div>
                    <div class="uml-relation-caption">${rel.caption}</div>
                    ${rel.hint || rel.comments ? `<div class="uml-description">${rel.hint || rel.comments}</div>` : ''}
                `;
                
                // Navigate on source click
                item.querySelector('.uml-class-link').addEventListener('click', (e) => {
                    e.preventDefault();
                    selectClass(rel.sourceClass);
                });

                // Edit click
                item.querySelector('.btn-action-icon.edit').addEventListener('click', (e) => {
                    e.stopPropagation();
                    openRelationModal('edit', rel);
                });

                // Delete click
                item.querySelector('.btn-action-icon.delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    confirmDeleteRelation(rel);
                });
                
                elements.umlReferencesList.appendChild(item);
            });
        }

        // Render Raw JSON
        elements.rawJsonOutput.textContent = JSON.stringify({
            class: classObj.name,
            caption: classObj.caption,
            totalConnections: classObj.outgoing.length + classObj.incoming.length,
            outgoingRelations: classObj.outgoing,
            incomingRelations: classObj.incoming
        }, null, 4);

        // Re-generate newly added Lucide icons
        lucide.createIcons();

        // Update Graph Network
        if (rebuildGraph) {
            rebuildGraphFromSelected();
        }
        
        // Save the updated workspace view
        saveWorkspaceView();
    }

    // -------------------------------------------------------------
    // 4. Graph Network Visualization (Vis.js)
    // -------------------------------------------------------------
    function initGraphNetwork() {
        const container = document.getElementById('graph-network-container');
        
        const data = {
            nodes: state.nodesDataSet,
            edges: state.edgesDataSet
        };
        
        const options = {
            interaction: {
                hover: true,
                tooltipDelay: 300,
                navigationButtons: false,
                multiselect: false
            },
            physics: {
                enabled: state.physicsEnabled,
                barnesHut: {
                    gravitationalConstant: -3000,
                    centralGravity: 0.3,
                    springLength: 220,
                    springConstant: 0.04,
                    damping: 0.09,
                    avoidOverlap: 1
                },
                stabilization: {
                    enabled: true,
                    iterations: 150,
                    updateInterval: 25
                }
            },
            nodes: {
                shape: 'box',
                margin: { top: 12, bottom: 12, left: 16, right: 16 },
                borderWidth: 1.5,
                borderWidthSelected: 3,
                font: {
                    color: '#f8fafc',
                    size: 13,
                    face: 'Outfit',
                    multi: 'html'
                },
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.4)',
                    size: 10,
                    x: 0,
                    y: 4
                }
            },
            edges: {
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 0.8
                    }
                },
                color: {
                    color: 'rgba(148, 163, 184, 0.25)',
                    highlight: '#00f2fe',
                    hover: 'rgba(0, 242, 254, 0.6)'
                },
                font: {
                    color: '#94a3b8',
                    size: 9,
                    face: 'Outfit',
                    strokeWidth: 3,
                    strokeColor: '#0a0e17'
                },
                smooth: {
                    enabled: true,
                    type: 'cubicBezier',
                    forceDirection: 'none',
                    roundness: 0.4
                },
                width: 1.5,
                selectionWidth: 3
            }
        };

        state.network = new vis.Network(container, data, options);

        // Bind Network Events
        state.network.on('selectNode', (params) => {
            if (params.nodes.length > 0) {
                const clickedNode = params.nodes[0];
                selectClass(clickedNode, false); // Select without resetting graph
                highlightSelectedNode(clickedNode);
            }
        });

        state.network.on('doubleClick', (params) => {
            if (params.nodes.length > 0) {
                const clickedNode = params.nodes[0];
                selectClass(clickedNode, true); // Double click: expand around this node
            }
        });

        // Disable loading state text on graph when stable
        state.network.on('stabilized', () => {
            console.log('Graph network stabilized');
        });
    }

    function highlightSelectedNode(selectedId) {
        const nodesUpdate = [];
        state.nodesDataSet.forEach(node => {
            if (node.id === selectedId) {
                nodesUpdate.push({
                    id: node.id,
                    color: {
                        background: '#8a2be2',
                        border: '#00f2fe',
                        highlight: {
                            background: '#8a2be2',
                            border: '#00f2fe'
                        }
                    },
                    borderWidth: 3
                });
            } else {
                nodesUpdate.push({
                    id: node.id,
                    color: {
                        background: '#111726',
                        border: '#8a2be2',
                        highlight: {
                            background: '#1b2438',
                            border: '#00f2fe'
                        }
                    },
                    borderWidth: 1.5
                });
            }
        });
        state.nodesDataSet.update(nodesUpdate);
    }

    function rebuildGraphFromSelected() {
        if (!state.selectedClass) return;

        elements.graphEmptyState.style.display = 'none';

        const rootClass = state.selectedClass;
        state.canvasClasses.clear();
        state.canvasClasses.add(rootClass);

        // Fetch neighbors
        const directNeighbors = getNeighbors(rootClass);
        directNeighbors.forEach(name => state.canvasClasses.add(name));

        // Depth 2 neighbors
        if (state.depth === 2) {
            directNeighbors.forEach(neighbor => {
                const level2 = getNeighbors(neighbor);
                level2.forEach(name => state.canvasClasses.add(name));
            });
        }

        renderCanvasElements();
    }

    function getNeighbors(className) {
        const neighbors = new Set();
        const classObj = state.allClasses.get(className);
        if (!classObj) return [];

        classObj.outgoing.forEach(r => neighbors.add(r.targetClass));
        classObj.incoming.forEach(r => neighbors.add(r.sourceClass));

        return Array.from(neighbors);
    }

    function renderCanvasElements() {
        const newNodes = [];
        const newEdges = [];
        const processedEdges = new Set();

        // 1. Build Nodes
        state.canvasClasses.forEach(className => {
            const classObj = state.allClasses.get(className);
            if (!classObj) return;

            const isSelected = className === state.selectedClass;
            
            // Format labels with HTML
            const nameLabel = `<b>${classObj.name}</b>`;
            const captionLabel = classObj.caption !== classObj.name ? `\n<font color="#94a3b8" size="10"><i>${classObj.caption}</i></font>` : '';
            
            const nodeConfig = {
                id: className,
                label: nameLabel + captionLabel,
                title: `Class: ${className}\nCaption: ${classObj.caption}\nRelations: ${classObj.outgoing.length + classObj.incoming.length}`,
                color: isSelected ? {
                    background: '#8a2be2',
                    border: '#00f2fe',
                    highlight: { background: '#8a2be2', border: '#00f2fe' }
                } : {
                    background: '#111726',
                    border: '#8a2be2',
                    highlight: { background: '#1b2438', border: '#00f2fe' }
                },
                borderWidth: isSelected ? 3 : 1.5
            };

            newNodes.push(nodeConfig);
        });

        // 2. Build Edges (relations between nodes present on canvas)
        state.canvasClasses.forEach(className => {
            const classObj = state.allClasses.get(className);
            if (!classObj) return;

            classObj.outgoing.forEach(rel => {
                // Draw edge only if target is also on the canvas
                if (state.canvasClasses.has(rel.targetClass)) {
                    // Avoid duplicate edge renderings if multiple exist
                    const edgeKey = `${rel.sourceClass}-${rel.targetClass}-${rel.relation}`;
                    if (!processedEdges.has(edgeKey)) {
                        processedEdges.add(edgeKey);
                        newEdges.push({
                            id: edgeKey,
                            from: rel.sourceClass,
                            to: rel.targetClass,
                            label: `${rel.caption}\n(${rel.cardinality})`,
                            title: `Relation: ${rel.relation}\nCaption: ${rel.caption}\nCardinality: ${rel.cardinality}\nHint: ${rel.hint || 'None'}`
                        });
                    }
                }
            });
        });

        // Update Dataset (Clear and set new nodes/edges)
        state.nodesDataSet.clear();
        state.edgesDataSet.clear();
        state.nodesDataSet.add(newNodes);
        state.edgesDataSet.add(newEdges);

        // Apply layouts
        applyLayoutSettings();
    }

    function applyLayoutSettings() {
        if (!state.network) return;

        let options = {
            physics: { enabled: state.physicsEnabled }
        };

        if (state.layoutMode === 'force') {
            options.layout = { hierarchical: { enabled: false } };
        } else {
            // Hierarchical options
            options.layout = {
                hierarchical: {
                    enabled: true,
                    direction: state.layoutMode === 'hierarchical-ud' ? 'UD' : 'LR',
                    sortMethod: 'directed',
                    nodeSpacing: 180,
                    treeSpacing: 250,
                    parentCentralization: true
                }
            };
        }

        state.network.setOptions(options);
        
        // Stabilize and fit
        setTimeout(() => {
            state.network.fit();
        }, 100);
    }

    // -------------------------------------------------------------
    // 5. Dashboard / Sidebar Charts (Chart.js)
    // -------------------------------------------------------------
    function initStats() {
        // Count Cardinalities
        let counts = { '1/1': 0, '1/N': 0, 'N/1': 0, 'N/N': 0 };
        let total = 0;

        for (const classObj of state.allClasses.values()) {
            classObj.outgoing.forEach(rel => {
                const cardObj = rel.cardinality ? rel.cardinality.toUpperCase().replace(/\s+/g, '') : 'N/N';
                if (counts.hasOwnProperty(cardObj)) {
                    counts[cardObj]++;
                } else {
                    counts['N/N']++; // default
                }
                total++;
            });
        }

        // Render Doughtnut Chart
        const ctx = document.getElementById('cardinality-chart').getContext('2d');
        if (state.cardinalityChart) {
            state.cardinalityChart.destroy();
        }

        state.cardinalityChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: [
                        '#10b981', // 1/1 - Green
                        '#00f2fe', // 1/N - Cyan
                        '#a5f3fc', // N/1 - Light Cyan
                        '#8a2be2'  // N/N - Purple
                    ],
                    borderColor: '#111726',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Outfit', size: 10 },
                            boxWidth: 10,
                            padding: 8
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    // -------------------------------------------------------------
    // 6. UI Interactions & Event Binding
    // -------------------------------------------------------------
    function setupEventListeners() {
        // Class Search Live Typing
        elements.classSearch.addEventListener('input', () => {
            const query = elements.classSearch.value.trim();
            elements.clearSearchBtn.style.display = query ? 'block' : 'none';
            renderClassList();
        });

        // Clear search
        elements.clearSearchBtn.addEventListener('click', () => {
            elements.classSearch.value = '';
            elements.clearSearchBtn.style.display = 'none';
            renderClassList();
        });

        // Dropdown Filters
        elements.filterCardinality.addEventListener('change', renderClassList);
        elements.sortClasses.addEventListener('change', renderClassList);

        // Tab Switching
        elements.tabUml.addEventListener('click', () => {
            elements.tabUml.classList.add('active');
            elements.tabRaw.classList.remove('active');
            elements.panelUmlView.classList.add('active');
            elements.panelRawView.classList.remove('active');
        });

        elements.tabRaw.addEventListener('click', () => {
            elements.tabRaw.classList.add('active');
            elements.tabUml.classList.remove('active');
            elements.panelRawView.classList.add('active');
            elements.panelUmlView.classList.remove('active');
        });

        // Zoom & Fit controls
        elements.btnZoomIn.addEventListener('click', () => {
            if (!state.network) return;
            const scale = state.network.getScale();
            state.network.moveTo({ scale: scale * 1.2 });
        });

        elements.btnZoomOut.addEventListener('click', () => {
            if (!state.network) return;
            const scale = state.network.getScale();
            state.network.moveTo({ scale: scale / 1.2 });
        });

        elements.btnFit.addEventListener('click', () => {
            if (state.network) state.network.fit();
        });

        // Neighborhood Depth Selector
        elements.neighborhoodDepth.addEventListener('change', (e) => {
            state.depth = parseInt(e.target.value, 10);
            if (state.selectedClass) {
                rebuildGraphFromSelected();
            }
            saveWorkspaceView();
        });

        // Layout Mode Selector
        elements.layoutModeSelect.addEventListener('change', (e) => {
            state.layoutMode = e.target.value;
            applyLayoutSettings();
            saveWorkspaceView();
        });

        // Physics Switcher
        elements.physicsToggle.addEventListener('change', (e) => {
            state.physicsEnabled = e.target.checked;
            if (state.network) {
                state.network.setOptions({ physics: { enabled: state.physicsEnabled } });
            }
            saveWorkspaceView();
        });

        // Add class to workspace canvas (Workspace Mode)
        elements.btnAddClass.addEventListener('click', () => {
            const addName = elements.addClassInput.value.trim();
            if (!addName || !state.allClasses.has(addName)) {
                alert('Please select a valid Class from the suggestions list.');
                return;
            }

            elements.graphEmptyState.style.display = 'none';

            // Add the class and its neighbors to the existing workspace
            state.canvasClasses.add(addName);
            getNeighbors(addName).forEach(n => state.canvasClasses.add(n));

            // Select this class and update without clearing canvas
            state.selectedClass = addName;
            highlightSelectedNode(addName);
            selectClass(addName, false); // Show in UML box, don't clear canvas
            
            // Re-render canvas preserving node positions as much as possible
            renderCanvasElements();
            elements.addClassInput.value = '';
            saveWorkspaceView();
        });

        // Add class input enter key
        elements.addClassInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                elements.btnAddClass.click();
            }
        });

        // Reset workspace canvas
        elements.btnClearGraph.addEventListener('click', () => {
            state.canvasClasses.clear();
            state.nodesDataSet.clear();
            state.edgesDataSet.clear();
            state.selectedClass = null;
            
            // Clear UML Box details
            elements.umlClassTitle.textContent = 'No Class Selected';
            elements.umlClassSubtitle.textContent = 'Select a class from the list to begin';
            elements.umlPropertiesList.innerHTML = '<div class="empty-list-msg">No outgoing relationships.</div>';
            elements.umlReferencesList.innerHTML = '<div class="empty-list-msg">No incoming relationships.</div>';
            elements.umlBoxCard.classList.remove('active');
            if (elements.btnAddRelation) elements.btnAddRelation.style.display = 'none';
            elements.rawJsonOutput.textContent = '// Select a class to view its indexed data structure';
            
            elements.graphEmptyState.style.display = 'flex';
            saveWorkspaceView();
        });

        // Export Canvas PNG Image
        elements.btnExportPng.addEventListener('click', () => {
            const canvas = document.querySelector('#graph-network-container canvas');
            if (!canvas) {
                alert('No graph canvas is available to export.');
                return;
            }

            // Standard export
            try {
                const dataURL = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `${state.selectedClass || 'metamodel'}-diagram.png`;
                link.href = dataURL;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (err) {
                console.error('PNG export failed', err);
                alert('Could not export PNG. Some network styles might be loaded from an external domain.');
            }
        });

        // File Upload Handlers
        if (elements.btnUploadCsv && elements.csvFileInput) {
            elements.btnUploadCsv.addEventListener('click', () => {
                elements.csvFileInput.click();
            });

            elements.csvFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                updateLoadingStatus('Parsing Uploaded CSV...', true);
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    const csvText = event.target.result;
                    Papa.parse(csvText, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            if (results.errors && results.errors.length > 0 && results.data.length === 0) {
                                console.error('PapaParse errors:', results.errors);
                                updateLoadingStatus('Parse Error!', false);
                                return;
                            }
                            
                            updateLoadingStatus('Indexing Metamodel...', true);
                            parseCSVAndIndex(results.data);
                            updateLoadingStatus('Loaded', false);
                            
                            if (elements.btnUploadCsv) {
                                elements.btnUploadCsv.style.boxShadow = '';
                                elements.btnUploadCsv.style.borderColor = '';
                            }

                            initStats();
                            renderClassList();
                            setupDatalist();
                            autoSelectDefaultClass();
                        },
                        error: (err) => {
                            console.error('Parsing error:', err);
                            updateLoadingStatus('Parse Error!', false);
                        }
                    });
                };
                reader.readAsText(file);
            });
        }

        // Reset Database Button
        const btnResetDb = document.getElementById('btn-reset-db');
        if (btnResetDb) {
            btnResetDb.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset the database? This will clear all your custom classes, relationships, and workspace views, and reload the original MetaModel CSV.')) {
                    localStorage.removeItem('metamodel_classes');
                    localStorage.removeItem('metamodel_relations');
                    localStorage.removeItem('metamodel_workspace_view');
                    window.location.reload();
                }
            });
        }

        // Create Class Dialog Trigger
        const btnCreateClass = document.getElementById('btn-create-class');
        if (btnCreateClass) {
            btnCreateClass.addEventListener('click', () => {
                document.getElementById('form-class').reset();
                openModal('modal-class');
            });
        }

        // Add Relationship Dialog Trigger
        if (elements.btnAddRelation) {
            elements.btnAddRelation.addEventListener('click', () => {
                if (!state.selectedClass) return;
                openRelationModal('add');
            });
        }

        // Modal Close Actions
        document.querySelectorAll('.modal-close, .btn-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.getAttribute('data-modal');
                if (modalId) {
                    closeModal(modalId);
                }
            });
        });

        // Close modal on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });

        // Create Class Form Submit
        const formClass = document.getElementById('form-class');
        if (formClass) {
            formClass.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const name = document.getElementById('new-class-name').value.trim();
                const caption = document.getElementById('new-class-caption').value.trim() || name;
                
                if (!name) return;

                if (state.allClasses.has(name)) {
                    alert(`A class named "${name}" already exists!`);
                    return;
                }

                // Create new class
                state.allClasses.set(name, {
                    name: name,
                    caption: caption,
                    outgoing: [],
                    incoming: []
                });

                // Update names
                state.sortedClassNames = Array.from(state.allClasses.keys()).sort();

                // Save database
                saveToLocalStorage();

                // Refresh sidebar
                renderClassList();
                setupDatalist();
                
                // Navigate & select
                selectClass(name);
                closeModal('modal-class');
            });
        }

        // Relation Editor Form Submit
        const formRelation = document.getElementById('form-relation');
        if (formRelation) {
            formRelation.addEventListener('submit', (e) => {
                e.preventDefault();

                const mode = document.getElementById('rel-mode').value;
                const origId = document.getElementById('rel-original-id').value;
                const source = document.getElementById('rel-source-class').value.trim();
                const relation = document.getElementById('rel-key').value.trim();
                const caption = document.getElementById('rel-caption').value.trim();
                const target = document.getElementById('rel-target-class').value.trim();
                const cardinality = document.getElementById('rel-cardinality').value;
                const hint = document.getElementById('rel-description').value.trim();

                if (!source || !relation || !target) {
                    alert('Source, Target, and Relation Key are required.');
                    return;
                }

                // Auto-create target class if missing
                if (!state.allClasses.has(target)) {
                    if (confirm(`Target class "${target}" does not exist. Do you want to create it?`)) {
                        state.allClasses.set(target, {
                            name: target,
                            caption: target,
                            outgoing: [],
                            incoming: []
                        });
                        state.sortedClassNames = Array.from(state.allClasses.keys()).sort();
                        renderClassList();
                        setupDatalist();
                    } else {
                        return;
                    }
                }

                const newRel = {
                    relation: relation,
                    caption: caption,
                    cardinality: cardinality,
                    creationDate: new Date().toISOString().split('T')[0],
                    lastUpdate: new Date().toISOString().split('T')[0],
                    hint: hint,
                    comments: '',
                    sourceClass: source,
                    targetClass: target
                };

                if (mode === 'add') {
                    const sourceObj = state.allClasses.get(source);
                    const exists = sourceObj.outgoing.some(r => r.relation === relation && r.targetClass === target);
                    if (exists) {
                        alert(`Relationship "${relation}" from "${source}" to "${target}" already exists!`);
                        return;
                    }

                    // Add relation
                    sourceObj.outgoing.push(newRel);
                    state.allClasses.get(target).incoming.push(newRel);

                } else if (mode === 'edit') {
                    const [origSource, origTarget, origRelation] = origId.split('|');
                    
                    // Remove old
                    const oldSourceObj = state.allClasses.get(origSource);
                    if (oldSourceObj) {
                        oldSourceObj.outgoing = oldSourceObj.outgoing.filter(
                            r => !(r.relation === origRelation && r.targetClass === origTarget)
                        );
                    }
                    const oldTargetObj = state.allClasses.get(origTarget);
                    if (oldTargetObj) {
                        oldTargetObj.incoming = oldTargetObj.incoming.filter(
                            r => !(r.relation === origRelation && r.sourceClass === origSource)
                        );
                    }

                    // Add new
                    const finalSourceObj = state.allClasses.get(origSource);
                    if (finalSourceObj) {
                        finalSourceObj.outgoing.push(newRel);
                    }
                    const finalTargetObj = state.allClasses.get(target);
                    if (finalTargetObj) {
                        finalTargetObj.incoming.push(newRel);
                    }
                }

                // Save
                saveToLocalStorage();

                // Refresh UI stats & list
                initStats();
                renderClassList();
                
                // Re-render current class
                if (state.selectedClass) {
                    if (mode === 'add' && state.canvasClasses.has(source)) {
                        state.canvasClasses.add(target);
                    }
                    selectClass(state.selectedClass, false); // Reload inspector
                    renderCanvasElements(); // Re-render canvas
                    saveWorkspaceView();
                }

                closeModal('modal-relation');
            });
        }
    }

    // Modal Helpers
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    function openRelationModal(mode, rel = null) {
        const form = document.getElementById('form-relation');
        form.reset();

        const titleEl = document.getElementById('relation-modal-title');
        const modeEl = document.getElementById('rel-mode');
        const origIdEl = document.getElementById('rel-original-id');
        const sourceEl = document.getElementById('rel-source-class');
        const keyEl = document.getElementById('rel-key');
        const captionEl = document.getElementById('rel-caption');
        const targetEl = document.getElementById('rel-target-class');
        const cardEl = document.getElementById('rel-cardinality');
        const descEl = document.getElementById('rel-description');
        const submitBtn = document.getElementById('rel-btn-submit');

        sourceEl.value = rel ? rel.sourceClass : state.selectedClass;

        if (mode === 'add') {
            titleEl.textContent = 'Add Relationship';
            modeEl.value = 'add';
            origIdEl.value = '';
            
            sourceEl.removeAttribute('readonly');
            sourceEl.classList.remove('input-readonly');
            keyEl.removeAttribute('readonly');
            keyEl.classList.remove('input-readonly');
            targetEl.removeAttribute('readonly');
            targetEl.classList.remove('input-readonly');
            
            submitBtn.textContent = 'Add Relationship';
        } else if (mode === 'edit' && rel) {
            titleEl.textContent = 'Edit Relationship';
            modeEl.value = 'edit';
            
            origIdEl.value = `${rel.sourceClass}|${rel.targetClass}|${rel.relation}`;
            
            sourceEl.setAttribute('readonly', 'readonly');
            sourceEl.classList.add('input-readonly');
            
            keyEl.value = rel.relation;
            keyEl.setAttribute('readonly', 'readonly');
            keyEl.classList.add('input-readonly');
            
            captionEl.value = rel.caption;
            
            targetEl.value = rel.targetClass;
            targetEl.setAttribute('readonly', 'readonly');
            targetEl.classList.add('input-readonly');
            
            cardEl.value = rel.cardinality;
            descEl.value = rel.hint || rel.comments || '';
            
            submitBtn.textContent = 'Save Changes';
        }

        openModal('modal-relation');
    }

    function confirmDeleteRelation(rel) {
        const msg = `Are you sure you want to delete the relationship "${rel.relation}" from "${rel.sourceClass}" to "${rel.targetClass}"?`;
        if (confirm(msg)) {
            deleteRelation(rel.sourceClass, rel.targetClass, rel.relation);
        }
    }

    function deleteRelation(source, target, relation) {
        // Find and remove from the source's outgoing list
        const sourceClassObj = state.allClasses.get(source);
        if (sourceClassObj) {
            sourceClassObj.outgoing = sourceClassObj.outgoing.filter(
                r => !(r.relation === relation && r.targetClass === target)
            );
        }

        // Find and remove from the target's incoming list
        const targetClassObj = state.allClasses.get(target);
        if (targetClassObj) {
            targetClassObj.incoming = targetClassObj.incoming.filter(
                r => !(r.relation === relation && r.sourceClass === source)
            );
        }

        // Save state
        saveToLocalStorage();

        // Refresh UI
        initStats();
        renderClassList();
        
        if (state.selectedClass) {
            selectClass(state.selectedClass, false); // reload inspector
            renderCanvasElements(); // reload canvas
            saveWorkspaceView();
        }
    }

    function autoSelectDefaultClass() {
        if (state.sortedClassNames.length === 0) return;
        
        let defaultClass = 'Application';
        if (!state.allClasses.has(defaultClass)) {
            defaultClass = 'Person';
        }
        if (!state.allClasses.has(defaultClass)) {
            defaultClass = 'OrgaUnit';
        }
        if (!state.allClasses.has(defaultClass)) {
            defaultClass = state.sortedClassNames[0];
        }
        
        if (defaultClass) {
            selectClass(defaultClass);
        }
    }

});
