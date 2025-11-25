class AdventureManager {
    constructor() {
        this.isEditMode = false;
        this.adventureData = {
            quest: '',
            rumors: [],
            threats: [],
            randomTables: [],
            compositeTables: []
        };

        // Initialize randomTables to an empty array if it's not already loaded
        if (!this.adventureData.randomTables) {
            this.adventureData.randomTables = [];
        }
        if (!this.adventureData.compositeTables) {
            this.adventureData.compositeTables = [];
        }

        this.loadFromLocalStorage();
    }

    init() {
        console.log("🎲 Initializing AdventureManager...");
        this.setupEventListeners();
        console.log("✅ AdventureManager initialized");
    }

    setupEventListeners() {
        // Bouton d'ouverture
        const adventureBtn = document.getElementById('adventure-btn');
        if (adventureBtn) {
            adventureBtn.addEventListener('click', () => this.openAdventureModal());
        }

        // Bouton de fermeture
        const closeBtn = document.getElementById('adventure-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeAdventureModal());
        }

        // Bouton d'édition
        const editBtn = document.getElementById('adventure-edit');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.toggleEditMode());
        }

        // Gestion des onglets
        const tabButtons = document.querySelectorAll('.adventure-tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Touche Échap pour fermer
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('adventure-modal');
                if (modal && !modal.classList.contains('hidden')) {
                    this.closeAdventureModal();
                }
            }
        });
    }

    openAdventureModal() {
        const modal = document.getElementById('adventure-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.isEditMode = false;
            this.updateEditButtonStyle();
            this.renderContent();
        }
    }

    closeAdventureModal() {
        const modal = document.getElementById('adventure-modal');
        if (modal) {
            modal.classList.add('hidden');
            this.isEditMode = false;
            this.updateEditButtonStyle();
        }
    }

    switchTab(tabName) {
        // Désactiver tous les onglets
        document.querySelectorAll('.adventure-tab-button').forEach(btn => {
            btn.classList.remove('active', 'text-white', 'border-blue-500');
            btn.classList.add('text-gray-400', 'border-transparent');
        });
        document.querySelectorAll('.adventure-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Activer l'onglet sélectionné
        const targetButton = document.querySelector(`.adventure-tab-button[data-tab="${tabName}"]`);
        const targetContent = document.getElementById(`${tabName}-tab`);

        if (targetButton) {
            targetButton.classList.add('active', 'text-white', 'border-blue-500');
            targetButton.classList.remove('text-gray-400', 'border-transparent');
        }
        if (targetContent) {
            targetContent.classList.add('active');
        }

        this.renderContent();
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        this.updateEditButtonStyle();
        this.renderContent();
    }

    updateEditButtonStyle() {
        const editBtn = document.getElementById('adventure-edit');
        if (editBtn) {
            if (this.isEditMode) {
                editBtn.style.color = '#60a5fa';
            } else {
                editBtn.style.color = '#ffffff';
            }
        }
    }

    renderContent() {
        if (this.isEditMode) {
            this.renderEditMode();
        } else {
            this.renderReadMode();
        }
    }

    renderReadMode() {
        const questTab = document.getElementById('quest-tab');
        if (questTab) {
            questTab.innerHTML = '';
            if (this.adventureData.quest) {
                questTab.innerHTML = `<div class="prose prose-invert p-4">${this.renderMarkdown(this.adventureData.quest)}</div>`;
            } else {
                questTab.innerHTML = '<p class="text-gray-400 italic p-4">Aucune description de quête disponible.</p>';
            }
        }

        const rumorsTab = document.getElementById('rumors-tab');
        if (rumorsTab) {
            rumorsTab.innerHTML = '';
            let rumorsContent = '';

            // Récupérer les résultats cochés depuis randomTablesManager
            const checkedResults = window.randomTablesManager ? window.randomTablesManager.checkedResults : {};
            const checkedEntries = [];

            // Parcourir tous les résultats cochés pour reconstituer les informations
            for (const [hash, isChecked] of Object.entries(checkedResults)) {
                if (isChecked) {
                    // Le hash est au format "result_XXXXX" généré depuis tableName::resultContent
                    // On stocke le hash pour l'affichage
                    checkedEntries.push({
                        hash: hash,
                        // On ne peut pas facilement retrouver le texte exact depuis le hash
                        // Il faudra le stocker différemment ou parcourir toutes les tables
                    });
                }
            }

            // Si on a des résultats cochés, les afficher
            if (checkedEntries.length > 0) {
                rumorsContent += '<div class="mb-4"><h4 class="text-sm font-medium text-white mb-2">Résultats de tables aléatoires :</h4>';
                
                // Parcourir toutes les tables pour retrouver les résultats cochés
                const checkedResultsHtml = this.getCheckedRandomResults();
                if (checkedResultsHtml) {
                    rumorsContent += checkedResultsHtml;
                }
                
                rumorsContent += '</div>';
            }

            // Afficher les rumeurs manuelles
            if (this.adventureData.rumors.length > 0) {
                rumorsContent += '<div class="mb-4"><h4 class="text-sm font-medium text-white mb-2">Rumeurs manuelles :</h4>';
                rumorsContent += this.adventureData.rumors.map((rumor, index) => `
                    <div class="rumor-item ${rumor.completed ? 'completed' : ''}" data-index="${index}">
                        <input type="checkbox" ${rumor.completed ? 'checked' : ''} onchange="window.adventureManager.toggleRumorComplete(${index})">
                        <div class="rumor-text">${rumor.text}</div>
                    </div>
                `).join('');
                rumorsContent += '</div>';
            }

            if (!rumorsContent) {
                rumorsContent = '<p class="text-gray-400 italic">Aucune rumeur enregistrée.</p>';
            }

            rumorsTab.innerHTML = `
                <div class="rumors-view p-4">
                    <div class="space-y-2">${rumorsContent}</div>
                </div>
            `;
        }

        const threatsTab = document.getElementById('threats-tab');
        if (threatsTab) {
            threatsTab.innerHTML = '';
            let threatsContent = '';

            if (this.adventureData.threats.length > 0) {
                threatsContent = this.adventureData.threats.map((threat, index) => `
                    <div class="threat-item ${threat.completed ? 'completed' : ''}" data-index="${index}">
                        <input type="checkbox" ${threat.completed ? 'checked' : ''} onchange="window.adventureManager.toggleThreatComplete(${index})">
                        <div class="threat-text">${threat.text}</div>
                    </div>
                `).join('');
            } else {
                threatsContent = '<p class="text-gray-400 italic">Aucune menace enregistrée.</p>';
            }

            threatsTab.innerHTML = `
                <div class="threats-view p-4">
                    <div class="space-y-2">${threatsContent}</div>
                </div>
            `;
        }
    }

    renderEditMode() {
        const questTab = document.getElementById('quest-tab');
        if (questTab) {
            questTab.innerHTML = `
                <div class="edit-form p-4">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-white mb-2">Description de la quête (Markdown supporté) :</label>
                        <textarea id="edit-quest" class="w-full p-3 border rounded h-64 bg-gray-800 text-white font-mono text-sm border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="Décrivez la quête principale de l'aventure...">${this.adventureData.quest || ''}</textarea>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="window.adventureManager.saveEdit()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-save mr-1"></i>Sauvegarder
                        </button>
                        <button onclick="window.adventureManager.exitEditMode()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-times mr-1"></i>Annuler
                        </button>
                    </div>
                </div>
            `;
        }

        const rumorsTab = document.getElementById('rumors-tab');
        if (rumorsTab) {
            rumorsTab.innerHTML = `
                <div class="edit-form p-4">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-white mb-2">Rumeurs :</label>
                        <div id="edit-rumors-list" class="space-y-2 mb-3">
                            ${this.adventureData.rumors.map((rumor, index) => `
                                <div class="flex items-center space-x-2">
                                    <input type="text" value="${rumor.text}" data-index="${index}" class="flex-1 p-2 border rounded bg-gray-800 text-white text-sm border-gray-600 edit-rumor-input">
                                    <button onclick="window.adventureManager.deleteRumor(${index})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <button onclick="window.adventureManager.addRumor()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm">
                            <i class="fas fa-plus mr-1"></i>Ajouter une rumeur
                        </button>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="window.adventureManager.saveEdit()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-save mr-1"></i>Sauvegarder
                        </button>
                        <button onclick="window.adventureManager.exitEditMode()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-times mr-1"></i>Annuler
                        </button>
                    </div>
                </div>
            `;
        }

        const threatsTab = document.getElementById('threats-tab');
        if (threatsTab) {
            threatsTab.innerHTML = `
                <div class="edit-form p-4">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-white mb-2">Menaces :</label>
                        <div id="edit-threats-list" class="space-y-2 mb-3">
                            ${this.adventureData.threats.map((threat, index) => `
                                <div class="flex items-center space-x-2">
                                    <input type="text" value="${threat.text}" data-index="${index}" class="flex-1 p-2 border rounded bg-gray-800 text-white text-sm border-gray-600 edit-threat-input">
                                    <button onclick="window.adventureManager.deleteThreat(${index})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <button onclick="window.adventureManager.addThreat()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm">
                            <i class="fas fa-plus mr-1"></i>Ajouter une menace
                        </button>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="window.adventureManager.saveEdit()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-save mr-1"></i>Sauvegarder
                        </button>
                        <button onclick="window.adventureManager.exitEditMode()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-times mr-1"></i>Annuler
                        </button>
                    </div>
                </div>
            `;
        }
    }

    exitEditMode() {
        this.isEditMode = false;
        this.updateEditButtonStyle();
        this.renderContent();
    }

    saveEdit() {
        const questInput = document.getElementById('edit-quest');
        if (questInput) {
            this.adventureData.quest = questInput.value.trim();
        }

        const rumorInputs = document.querySelectorAll('.edit-rumor-input');
        rumorInputs.forEach((input, index) => {
            if (this.adventureData.rumors[index]) {
                this.adventureData.rumors[index].text = input.value.trim();
            }
        });
        this.adventureData.rumors = this.adventureData.rumors.filter(r => r.text !== '');

        const threatInputs = document.querySelectorAll('.edit-threat-input');
        threatInputs.forEach((input, index) => {
            if (this.adventureData.threats[index]) {
                this.adventureData.threats[index].text = input.value.trim();
            }
        });
        this.adventureData.threats = this.adventureData.threats.filter(t => t.text !== '');

        this.saveToLocalStorage();
        this.exitEditMode();
    }

    addRumor() {
        const list = document.getElementById('edit-rumors-list');
        if (list) {
            const index = this.adventureData.rumors.length;
            const newRumorHtml = `
                <div class="flex items-center space-x-2">
                    <input type="text" value="" data-index="${index}" class="flex-1 p-2 border rounded bg-gray-800 text-white text-sm border-gray-600 edit-rumor-input" placeholder="Nouvelle rumeur...">
                    <button onclick="window.adventureManager.deleteRumor(${index})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', newRumorHtml);
            this.adventureData.rumors.push({ text: '', completed: false });
        }
    }

    deleteRumor(index) {
        this.adventureData.rumors.splice(index, 1);
        this.renderEditMode();
    }

    toggleRumorComplete(index) {
        if (this.adventureData.rumors[index]) {
            this.adventureData.rumors[index].completed = !this.adventureData.rumors[index].completed;
            this.saveToLocalStorage();
            this.renderContent();
        }
    }

    addThreat() {
        const list = document.getElementById('edit-threats-list');
        if (list) {
            const index = this.adventureData.threats.length;
            const newThreatHtml = `
                <div class="flex items-center space-x-2">
                    <input type="text" value="" data-index="${index}" class="flex-1 p-2 border rounded bg-gray-800 text-white text-sm border-gray-600 edit-threat-input" placeholder="Nouvelle menace...">
                    <button onclick="window.adventureManager.deleteThreat(${index})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', newThreatHtml);
            this.adventureData.threats.push({ text: '', completed: false });
        }
    }

    deleteThreat(index) {
        this.adventureData.threats.splice(index, 1);
        this.renderEditMode();
    }

    toggleThreatComplete(index) {
        if (this.adventureData.threats[index]) {
            this.adventureData.threats[index].completed = !this.adventureData.threats[index].completed;
            this.saveToLocalStorage();
            this.renderContent();
        }
    }

    renderMarkdown(text) {
        if (!text) return '';

        return text
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.*)$/gim, function(match) {
                if (match.startsWith('<h') || match.startsWith('<ul') || match.startsWith('<li') || match.startsWith('</')) {
                    return match;
                }
                return match.trim() ? `<p>${match}</p>` : '';
            })
            .replace(/<p><\/p>/g, '')
            .replace(/<p>(<h[1-6]>)/g, '$1')
            .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
            .replace(/<p>(<ul>)/g, '$1')
            .replace(/(<\/ul>)<\/p>/g, '$1');
    }

    saveToLocalStorage() {
        localStorage.setItem('adventureData', JSON.stringify(this.adventureData));
        console.log("💾 Adventure data saved to localStorage");

        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('adventureData');
        if (saved) {
            try {
                this.adventureData = JSON.parse(saved);
                // Ensure randomTables is initialized if it was missing from saved data
                if (!this.adventureData.randomTables) {
                    this.adventureData.randomTables = [];
                }
                console.log("✅ Adventure data loaded from localStorage");
            } catch (e) {
                console.error("❌ Failed to load adventure data:", e);
            }
        }
    }

    

    getAllData() {
        return this.adventureData;
    }

    // Récupérer tous les résultats cochés depuis les tables aléatoires
    getCheckedRandomResults() {
        if (!window.randomTablesManager) {
            return '';
        }

        const checkedResults = window.randomTablesManager.checkedResults;
        const resultsHtml = [];

        // Parcourir toutes les tables pour retrouver les résultats cochés
        const allTables = this.collectAllRandomTables();
        
        allTables.forEach(tableInfo => {
            const table = tableInfo.table;
            const isComposite = table.isComposite || false;

            if (isComposite && table.subtables) {
                // Table composite
                table.subtables.forEach((subtable, subIdx) => {
                    if (subtable.entries && subtable.entries.length > 0) {
                        subtable.entries.forEach((result, resultIdx) => {
                            const rawContent = this.extractRawContent(result);
                            const resultHash = window.randomTablesManager.generateResultHash(`${table.name}::${subtable.name}`, rawContent);
                            
                            if (checkedResults[resultHash]) {
                                const formattedResult = this.formatResult(result);
                                resultsHtml.push(`
                                    <div class="rumor-item mb-2 p-2 bg-gray-800 rounded" data-hash="${resultHash}">
                                        <div class="flex items-start gap-2">
                                            <input type="checkbox" 
                                                   checked 
                                                   onchange="window.adventureManager.toggleRandomResultChecked('${resultHash}', this.checked)"
                                                   class="mt-1">
                                            <div class="flex-1">
                                                <div class="text-xs text-blue-400 mb-1">${table.name} → ${subtable.name}</div>
                                                <div class="text-sm text-white">${formattedResult}</div>
                                            </div>
                                        </div>
                                    </div>
                                `);
                            }
                        });
                    }
                });
            } else if (table.entries) {
                // Table simple
                table.entries.forEach((result, resultIdx) => {
                    const rawContent = this.extractRawContent(result);
                    const resultHash = window.randomTablesManager.generateResultHash(table.name, rawContent);
                    
                    if (checkedResults[resultHash]) {
                        const formattedResult = this.formatResult(result);
                        resultsHtml.push(`
                            <div class="rumor-item mb-2 p-2 bg-gray-800 rounded" data-hash="${resultHash}">
                                <div class="flex items-start gap-2">
                                    <input type="checkbox" 
                                           checked 
                                           onchange="window.adventureManager.toggleRandomResultChecked('${resultHash}', this.checked)"
                                           class="mt-1">
                                    <div class="flex-1">
                                        <div class="text-xs text-blue-400 mb-1">${table.name}</div>
                                        <div class="text-sm text-white">${formattedResult}</div>
                                    </div>
                                </div>
                            </div>
                        `);
                    }
                });
            }
        });

        return resultsHtml.join('');
    }

    // Collecter toutes les tables aléatoires disponibles
    collectAllRandomTables() {
        const allTables = [];

        // 1. Tables des paramètres (adventureData.randomTables)
        if (this.adventureData.randomTables) {
            this.adventureData.randomTables.forEach(table => {
                allTables.push({
                    source: 'Paramètres',
                    table: table
                });
            });
        }

        // 2. Tables des lieux
        if (window.locationsData && window.locationsData.locations) {
            window.locationsData.locations.forEach(location => {
                if (location.RandomTables && Array.isArray(location.RandomTables)) {
                    location.RandomTables.forEach(table => {
                        allTables.push({
                            source: location.name,
                            table: table
                        });
                    });
                }
            });
        }

        // 3. Tables des régions
        if (window.regionsData && window.regionsData.regions) {
            window.regionsData.regions.forEach(region => {
                if (region.RandomTables && Array.isArray(region.RandomTables)) {
                    region.RandomTables.forEach(table => {
                        allTables.push({
                            source: region.name,
                            table: table
                        });
                    });
                }
            });
        }

        return allTables;
    }

    // Extraire le contenu brut d'un résultat
    extractRawContent(result) {
        if (typeof result === 'object' && result !== null) {
            const entries = Object.entries(result);
            const otherEntries = entries.filter(([key]) => !key.toLowerCase().includes('destin') && !key.toLowerCase().includes('fate'));
            if (otherEntries.length > 0) {
                return otherEntries[0][1];
            }
            return JSON.stringify(result);
        }
        return result;
    }

    // Formater un résultat pour l'affichage
    formatResult(result) {
        if (typeof result === 'object' && result !== null) {
            const entries = Object.entries(result);
            const fateEntry = entries.find(([key]) => key.toLowerCase().includes('destin') || key.toLowerCase().includes('fate'));
            const otherEntries = entries.filter(([key]) => !key.toLowerCase().includes('destin') && !key.toLowerCase().includes('fate'));

            let formatted = '';
            if (otherEntries.length > 0) {
                const [mainKey, mainValue] = otherEntries[0];
                if (fateEntry) {
                    formatted = `(${fateEntry[1]}) ${mainValue}`;
                } else {
                    formatted = mainValue;
                }
                for (let i = 1; i < otherEntries.length; i++) {
                    const [key, value] = otherEntries[i];
                    formatted += ` <span class="text-gray-400">${key}:</span> ${value}`;
                }
            } else if (fateEntry) {
                formatted = fateEntry[1];
            }
            return formatted;
        }
        return result;
    }

    // Basculer l'état d'un résultat de table aléatoire
    toggleRandomResultChecked(resultHash, isChecked) {
        if (window.randomTablesManager) {
            window.randomTablesManager.toggleResultChecked(resultHash, isChecked);
            // Rafraîchir l'affichage
            this.renderContent();
        }
    }

    // === MÉTHODES POUR LES TABLES ALÉATOIRES ===
    rollOnTable(tableIndex) {
        console.log(`🎲 [DEBUG] rollOnTable appelé avec index: ${tableIndex}`);
        
        const table = this.adventureData.randomTables[tableIndex];
        console.log(`📋 [DEBUG] Table récupérée:`, table);
        
        if (!table || !table.entries || table.entries.length === 0) {
            console.error('❌ Table invalide ou vide');
            console.log('🔍 [DEBUG] État de la table:', {
                tableExists: !!table,
                entriesExists: !!(table?.entries),
                entriesLength: table?.entries?.length || 0
            });
            return;
        }

        // Tirer un résultat aléatoire
        const randomIndex = Math.floor(Math.random() * table.entries.length);
        const result = table.entries[randomIndex];
        
        console.log(`🎲 [DEBUG] Résultat du tirage:`, {
            randomIndex,
            result,
            resultType: typeof result
        });

        // Formater le résultat pour l'affichage
        let formattedResult = '';
        if (typeof result === 'object' && result !== null) {
            // Si c'est un objet, formater les propriétés
            formattedResult = '<div class="space-y-2">';
            for (const [key, value] of Object.entries(result)) {
                formattedResult += `
                    <div>
                        <span class="font-semibold text-blue-300">${key}:</span>
                        <span class="text-white ml-2">${value}</span>
                    </div>`;
            }
            formattedResult += '</div>';
        } else {
            // Si c'est une chaîne simple
            formattedResult = `<div class="text-white">${result}</div>`;
        }

        // Afficher le résultat dans un conteneur dédié
        const resultContainer = document.getElementById(`table-result-${tableIndex}`);
        const resultContent = document.getElementById(`table-result-content-${tableIndex}`);

        console.log(`📦 [DEBUG] Conteneurs DOM:`, {
            resultContainer: !!resultContainer,
            resultContent: !!resultContent
        });

        if (resultContainer && resultContent) {
            resultContent.innerHTML = formattedResult;
            resultContainer.classList.remove('hidden');
            console.log(`✅ [DEBUG] Résultat affiché dans le DOM`);
        } else {
            console.error(`❌ [DEBUG] Conteneurs introuvables pour table-result-${tableIndex}`);
        }

        console.log(`🎲 Tirage sur "${table.name}":`, result);
    }

    rollOnCompositeTable(compositeIndex) {
        console.log(`🔗 [DEBUG] rollOnCompositeTable appelé avec index: ${compositeIndex}`);
        
        const composite = this.adventureData.compositeTables[compositeIndex];
        console.log(`📋 [DEBUG] Table composite récupérée:`, composite);
        
        if (!composite || !composite.tableIndices || composite.tableIndices.length === 0) {
            console.error('❌ Table composite invalide');
            console.log('🔍 [DEBUG] État de la table composite:', {
                compositeExists: !!composite,
                tableIndicesExists: !!(composite?.tableIndices),
                tableIndicesLength: composite?.tableIndices?.length || 0,
                fullComposite: composite
            });
            return;
        }

        // Effectuer un tirage sur chaque table simple
        const results = [];
        console.log(`🎲 [DEBUG] Tirage sur ${composite.tableIndices.length} table(s) simple(s)`);
        
        composite.tableIndices.forEach((tableIndex, idx) => {
            console.log(`🔍 [DEBUG] Tirage ${idx + 1}/${composite.tableIndices.length} - index: ${tableIndex}`);
            
            const table = this.adventureData.randomTables[tableIndex];
            console.log(`📋 [DEBUG] Table trouvée:`, table);
            
            if (table && table.entries && table.entries.length > 0) {
                const randomIndex = Math.floor(Math.random() * table.entries.length);
                const result = table.entries[randomIndex];
                console.log(`✅ [DEBUG] Résultat du tirage:`, { tableName: table.name, result });
                
                results.push({
                    tableName: table.name,
                    result: result
                });
            } else {
                console.error(`❌ [DEBUG] Table ${tableIndex} invalide ou vide`);
            }
        });

        console.log(`📊 [DEBUG] Résultats totaux:`, results);

        // Afficher les résultats
        const resultContainer = document.getElementById(`composite-result-${compositeIndex}`);
        const resultContent = document.getElementById(`composite-result-content-${compositeIndex}`);

        console.log(`📦 [DEBUG] Conteneurs DOM composite:`, {
            resultContainer: !!resultContainer,
            resultContent: !!resultContent
        });

        if (resultContainer && resultContent) {
            const html = results.map(r => 
                `<div class="mb-1">
                    <span class="font-semibold text-blue-300">${r.tableName}:</span>
                    <span class="text-white ml-2">${r.result}</span>
                </div>`
            ).join('');
            resultContent.innerHTML = html;
            resultContainer.classList.remove('hidden');
            console.log(`✅ [DEBUG] Résultats affichés dans le DOM`);
        } else {
            console.error(`❌ [DEBUG] Conteneurs introuvables pour composite-result-${compositeIndex}`);
        }

        console.log(`🎲 Tirage sur table composite "${composite.name}":`, results);
    }

    openCompositeTableModal() {
        // Cette méthode sera appelée pour créer une table composite
        // Pour l'instant, on affiche juste une alerte
        alert('Création de table composite : fonctionnalité à implémenter');
    }
}

export default AdventureManager;