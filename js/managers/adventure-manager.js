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

            if (this.adventureData.rumors.length > 0) {
                rumorsContent = this.adventureData.rumors.map((rumor, index) => `
                    <div class="rumor-item ${rumor.completed ? 'completed' : ''}" data-index="${index}">
                        <input type="checkbox" ${rumor.completed ? 'checked' : ''} onchange="window.adventureManager.toggleRumorComplete(${index})">
                        <div class="rumor-text">${rumor.text}</div>
                    </div>
                `).join('');
            } else {
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

        this.renderRandomTablesTab();
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

    renderRandomTablesTab() {
        const tabContent = document.getElementById('random-tables-content');
        if (!tabContent) {
            console.error('❌ random-tables-content not found');
            return;
        }

        // Use this.adventureData.randomTables to access the tables
        const tables = this.adventureData.randomTables || [];
        const compositeTables = this.adventureData.compositeTables || [];

        // Trier les tables par ordre alphabétique
        const sortedTables = [...tables].sort((a, b) => {
            const nameA = (a.name || 'Table sans nom').toLowerCase();
            const nameB = (b.name || 'Table sans nom').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        const sortedCompositeTables = [...compositeTables].sort((a, b) => {
            const nameA = (a.name || 'Table sans nom').toLowerCase();
            const nameB = (b.name || 'Table sans nom').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        let html = `
            <div class="mb-3 flex space-x-2">
                <input type="file" id="upload-random-table" accept=".json" class="hidden">
                <button onclick="document.getElementById('upload-random-table').click()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                    <i class="fas fa-upload mr-2"></i>Importer une table JSON
                </button>
                ${tables.length >= 2 ? `
                    <button onclick="window.adventureManager.openCompositeTableModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">
                        <i class="fas fa-layer-group mr-2"></i>Créer une table composite
                    </button>
                ` : ''}
            </div>
        `;

        if (sortedTables.length === 0 && sortedCompositeTables.length === 0) {
            html += '<p class="text-gray-400 italic">Aucune table aléatoire importée.</p>';
        } else {
            html += '<div class="space-y-2">';
            
            // Afficher les tables composites en premier
            sortedCompositeTables.forEach((table) => {
                const originalIndex = compositeTables.indexOf(table);
                const tableName = (table.name || 'Table sans nom').replace(/'/g, "\\'");
                html += `
                    <div class="bg-gray-800 rounded p-2 border-2 border-blue-500">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center space-x-2">
                                <span class="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-semibold">Composite</span>
                                <h4 class="text-base font-semibold text-white">${table.name || 'Table sans nom'}</h4>
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="window.adventureManager.rollOnCompositeTable(${originalIndex})" class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs">
                                    <i class="fas fa-dice mr-1"></i>Tirer
                                </button>
                                <button onclick="window.adventureManager.deleteCompositeTable(${originalIndex})" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div id="composite-result-${originalIndex}" class="hidden mt-2 p-2 bg-gray-700 rounded border border-green-500">
                            <div class="text-green-400 font-semibold mb-1 text-xs">Résultats des tirages :</div>
                            <div id="composite-result-content-${originalIndex}" class="text-sm"></div>
                        </div>
                    </div>
                `;
            });

            // Afficher les tables simples
            sortedTables.forEach((table) => {
                // Retrouver l'index original de la table
                const originalIndex = tables.indexOf(table);
                const tableName = (table.name || 'Table sans nom').replace(/'/g, "\\'");
                html += `
                    <div class="bg-gray-800 rounded p-2 border border-gray-700">
                        <div class="flex justify-between items-center">
                            <h4 class="text-base font-semibold text-white">${table.name || 'Table sans nom'}</h4>
                            <div class="flex space-x-2">
                                <button onclick="window.adventureManager.rollOnTable(${originalIndex})" class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs">
                                    <i class="fas fa-dice mr-1"></i>Tirer
                                </button>
                                <button onclick="window.adventureManager.deleteRandomTable(${originalIndex})" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div id="table-result-${originalIndex}" class="hidden mt-2 p-2 bg-gray-700 rounded border border-green-500">
                            <div class="text-green-400 font-semibold mb-1 text-xs">Résultat du tirage :</div>
                            <div id="table-result-content-${originalIndex}" class="text-sm"></div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        tabContent.innerHTML = html;

        const uploadInput = document.getElementById('upload-random-table');
        if (uploadInput) {
            uploadInput.onchange = (e) => this.handleRandomTableUpload(e);
        }
    }

    async handleRandomTableUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const entries = JSON.parse(text);

            if (!Array.isArray(entries) || entries.length === 0) {
                alert('Le fichier JSON doit contenir un tableau d\'entrées.');
                return;
            }

            const fileName = file.name.replace(/\.json$/i, '');

            const newTable = {
                name: fileName,
                entries: entries
            };

            // Ensure randomTables is initialized before pushing
            if (!this.adventureData.randomTables) {
                this.adventureData.randomTables = [];
            }
            this.adventureData.randomTables.push(newTable);
            this.saveToLocalStorage();
            this.renderRandomTablesTab();

            event.target.value = '';
        } catch (error) {
            console.error('Erreur lors de l\'import de la table:', error);
            alert('Erreur lors de l\'import du fichier JSON. Vérifiez le format.');
        }
    }


    rollOnTable(tableIndex) {
        // Use this.adventureData.randomTables
        const table = this.adventureData.randomTables[tableIndex];
        if (!table || !table.entries || table.entries.length === 0) return;

        const randomIndex = Math.floor(Math.random() * table.entries.length);
        const entry = table.entries[randomIndex];

        const resultContainer = document.getElementById(`table-result-${tableIndex}`);
        const resultContent = document.getElementById(`table-result-content-${tableIndex}`);

        if (resultContainer && resultContent) {
            let html = '<div class="space-y-2">';

            for (const [key, value] of Object.entries(entry)) {
                html += `
                    <div>
                        <span class="text-gray-400 font-semibold">${key}:</span>
                        <span class="text-white ml-2">${value}</span>
                    </div>
                `;
            }

            html += '</div>';
            
            // Ajouter les boutons d'action
            html += `
                <div class="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-600">
                    <button onclick="window.adventureManager.addResultToJournal(${tableIndex}, ${JSON.stringify(entry).replace(/"/g, '&quot;')}, '${table.name.replace(/'/g, "\\'")}'); event.stopPropagation();" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs flex items-center space-x-1" title="Ajouter au journal">
                        <i class="fas fa-book"></i>
                        <span>Journal</span>
                    </button>
                    <button onclick="window.adventureManager.clearTableResult(${tableIndex}); event.stopPropagation();" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs flex items-center space-x-1" title="Annuler">
                        <i class="fas fa-times"></i>
                        <span>Annuler</span>
                    </button>
                </div>
            `;
            
            resultContent.innerHTML = html;
            resultContainer.classList.remove('hidden');
        }
    }

    deleteRandomTable(index) {
        if (confirm('Voulez-vous vraiment supprimer cette table aléatoire ?')) {
            // Use this.adventureData.randomTables
            this.adventureData.randomTables.splice(index, 1);
            this.saveToLocalStorage();
            this.renderRandomTablesTab();
        }
    }

    openCompositeTableModal() {
        const tables = this.adventureData.randomTables || [];
        
        let modalHTML = `
            <div id="composite-table-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                    <h3 class="text-xl font-bold text-white mb-4">Créer une table composite</h3>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-300 mb-2">Nom de la table composite :</label>
                        <input type="text" id="composite-table-name" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white" placeholder="Ex: Escouade d'Orques">
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-300 mb-2">Sélectionner les tables (minimum 2) :</label>
                        <div id="composite-table-selection" class="space-y-2">
                            ${tables.map((table, index) => `
                                <div class="flex items-center space-x-2 bg-gray-800 p-2 rounded">
                                    <input type="checkbox" id="table-${index}" value="${index}" class="composite-table-checkbox">
                                    <label for="table-${index}" class="flex-1 text-white">${table.name || 'Table sans nom'}</label>
                                    <input type="number" id="order-${index}" min="1" placeholder="Ordre" class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm composite-table-order" disabled>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="flex space-x-2">
                        <button id="save-composite-table" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                            <i class="fas fa-save mr-1"></i>Sauvegarder
                        </button>
                        <button onclick="window.adventureManager.closeCompositeTableModal()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-times mr-1"></i>Annuler
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Ajouter les écouteurs d'événements
        const checkboxes = document.querySelectorAll('.composite-table-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const orderInput = document.getElementById(`order-${e.target.value}`);
                orderInput.disabled = !e.target.checked;
                if (!e.target.checked) {
                    orderInput.value = '';
                }
                this.updateCompositeTableSaveButton();
            });
        });

        const orderInputs = document.querySelectorAll('.composite-table-order');
        orderInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateCompositeTableSaveButton();
            });
        });

        document.getElementById('save-composite-table').addEventListener('click', () => {
            this.saveCompositeTable();
        });
    }

    updateCompositeTableSaveButton() {
        const checkboxes = document.querySelectorAll('.composite-table-checkbox:checked');
        const saveButton = document.getElementById('save-composite-table');
        
        if (checkboxes.length < 2) {
            saveButton.disabled = true;
            return;
        }

        // Vérifier que toutes les tables sélectionnées ont un ordre
        let allHaveOrder = true;
        checkboxes.forEach(checkbox => {
            const orderInput = document.getElementById(`order-${checkbox.value}`);
            if (!orderInput.value || orderInput.value < 1) {
                allHaveOrder = false;
            }
        });

        saveButton.disabled = !allHaveOrder;
    }

    saveCompositeTable() {
        const name = document.getElementById('composite-table-name').value.trim();
        if (!name) {
            alert('Veuillez saisir un nom pour la table composite.');
            return;
        }

        const checkboxes = document.querySelectorAll('.composite-table-checkbox:checked');
        const selectedTables = [];

        checkboxes.forEach(checkbox => {
            const tableIndex = parseInt(checkbox.value);
            const order = parseInt(document.getElementById(`order-${tableIndex}`).value);
            selectedTables.push({
                tableIndex: tableIndex,
                order: order
            });
        });

        // Trier par ordre
        selectedTables.sort((a, b) => a.order - b.order);

        const compositeTable = {
            name: name,
            tables: selectedTables
        };

        if (!this.adventureData.compositeTables) {
            this.adventureData.compositeTables = [];
        }
        this.adventureData.compositeTables.push(compositeTable);
        
        this.saveToLocalStorage();
        this.closeCompositeTableModal();
        this.renderRandomTablesTab();
    }

    closeCompositeTableModal() {
        const modal = document.getElementById('composite-table-modal');
        if (modal) {
            modal.remove();
        }
    }

    rollOnCompositeTable(compositeIndex) {
        const compositeTable = this.adventureData.compositeTables[compositeIndex];
        if (!compositeTable || !compositeTable.tables || compositeTable.tables.length === 0) return;

        const resultContainer = document.getElementById(`composite-result-${compositeIndex}`);
        const resultContent = document.getElementById(`composite-result-content-${compositeIndex}`);

        if (resultContainer && resultContent) {
            let html = '<div class="space-y-3">';
            let allResults = [];

            compositeTable.tables.forEach(tableRef => {
                const table = this.adventureData.randomTables[tableRef.tableIndex];
                if (!table || !table.entries || table.entries.length === 0) return;

                const randomIndex = Math.floor(Math.random() * table.entries.length);
                const entry = table.entries[randomIndex];

                allResults.push({
                    tableName: table.name,
                    entry: entry
                });

                html += `
                    <div class="bg-gray-800 p-2 rounded">
                        <div class="text-blue-400 font-semibold text-xs mb-1">${table.name}:</div>
                        <div class="space-y-1">
                `;

                for (const [key, value] of Object.entries(entry)) {
                    html += `
                        <div>
                            <span class="text-gray-400 font-semibold text-xs">${key}:</span>
                            <span class="text-white ml-2 text-sm">${value}</span>
                        </div>
                    `;
                }

                html += `
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            
            // Ajouter les boutons d'action
            html += `
                <div class="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-600">
                    <button onclick="window.adventureManager.addCompositeResultToJournal(${compositeIndex}, ${JSON.stringify(allResults).replace(/"/g, '&quot;')}, '${compositeTable.name.replace(/'/g, "\\'")}'); event.stopPropagation();" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs flex items-center space-x-1" title="Ajouter au journal">
                        <i class="fas fa-book"></i>
                        <span>Journal</span>
                    </button>
                    <button onclick="window.adventureManager.clearCompositeResult(${compositeIndex}); event.stopPropagation();" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs flex items-center space-x-1" title="Annuler">
                        <i class="fas fa-times"></i>
                        <span>Annuler</span>
                    </button>
                </div>
            `;
            
            resultContent.innerHTML = html;
            resultContainer.classList.remove('hidden');
        }
    }

    deleteCompositeTable(index) {
        if (confirm('Voulez-vous vraiment supprimer cette table composite ?')) {
            this.adventureData.compositeTables.splice(index, 1);
            this.saveToLocalStorage();
            this.renderRandomTablesTab();
        }
    }

    clearTableResult(tableIndex) {
        const resultContainer = document.getElementById(`table-result-${tableIndex}`);
        if (resultContainer) {
            resultContainer.classList.add('hidden');
        }
    }

    clearCompositeResult(compositeIndex) {
        const resultContainer = document.getElementById(`composite-result-${compositeIndex}`);
        if (resultContainer) {
            resultContainer.classList.add('hidden');
        }
    }

    addResultToJournal(tableIndex, entry, tableName) {
        // Récupérer la date du calendrier
        let dateStr = '';
        if (window.calendarManager && window.calendarManager.isCalendarMode && window.calendarManager.currentCalendarDate) {
            dateStr = `${window.calendarManager.currentCalendarDate.day} ${window.calendarManager.currentCalendarDate.month}`;
        } else {
            dateStr = new Date().toLocaleDateString('fr-FR');
        }

        // Formater le contenu du tirage
        let content = `**Table : ${tableName}**\n\n`;
        for (const [key, value] of Object.entries(entry)) {
            content += `**${key}:** ${value}\n`;
        }

        // Ajouter au journal
        if (window.journalManager) {
            // Charger le journal existant
            window.journalManager.loadJournal();
            
            // Créer une nouvelle entrée
            const newEntry = {
                title: `Tirage - ${tableName}`,
                totalDays: 1,
                generatedAt: new Date().toISOString(),
                days: [{
                    dayNumber: 1,
                    calendarDate: dateStr,
                    weatherSymbol: null,
                    discoveries: [],
                    description: content,
                    eventResult: null,
                    startCoordinates: null
                }]
            };
            
            window.journalManager.journal.unshift(newEntry);
            localStorage.setItem('travelJournal', JSON.stringify(window.journalManager.journal));
            
            // Marquer comme non sauvegardé
            if (typeof window.markAsUnsaved === 'function') {
                window.markAsUnsaved();
            }
            
            console.log('✅ Résultat ajouté au journal');
            
            // Notification visuelle
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            notification.innerHTML = '<i class="fas fa-check mr-2"></i>Ajouté au journal';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }
        
        // Effacer le résultat
        this.clearTableResult(tableIndex);
    }

    addCompositeResultToJournal(compositeIndex, allResults, tableName) {
        // Récupérer la date du calendrier
        let dateStr = '';
        if (window.calendarManager && window.calendarManager.isCalendarMode && window.calendarManager.currentCalendarDate) {
            dateStr = `${window.calendarManager.currentCalendarDate.day} ${window.calendarManager.currentCalendarDate.month}`;
        } else {
            dateStr = new Date().toLocaleDateString('fr-FR');
        }

        // Formater le contenu du tirage composite
        let content = `**Table composite : ${tableName}**\n\n`;
        
        allResults.forEach(result => {
            content += `**${result.tableName}:**\n`;
            for (const [key, value] of Object.entries(result.entry)) {
                content += `- **${key}:** ${value}\n`;
            }
            content += '\n';
        });

        // Ajouter au journal
        if (window.journalManager) {
            // Charger le journal existant
            window.journalManager.loadJournal();
            
            // Créer une nouvelle entrée
            const newEntry = {
                title: `Tirage composite - ${tableName}`,
                totalDays: 1,
                generatedAt: new Date().toISOString(),
                days: [{
                    dayNumber: 1,
                    calendarDate: dateStr,
                    weatherSymbol: null,
                    discoveries: [],
                    description: content,
                    eventResult: null,
                    startCoordinates: null
                }]
            };
            
            window.journalManager.journal.unshift(newEntry);
            localStorage.setItem('travelJournal', JSON.stringify(window.journalManager.journal));
            
            // Marquer comme non sauvegardé
            if (typeof window.markAsUnsaved === 'function') {
                window.markAsUnsaved();
            }
            
            console.log('✅ Résultat composite ajouté au journal');
            
            // Notification visuelle
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            notification.innerHTML = '<i class="fas fa-check mr-2"></i>Ajouté au journal';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }
        
        // Effacer le résultat
        this.clearCompositeResult(compositeIndex);
    }

    getAllData() {
        return this.adventureData;
    }
}

export default AdventureManager;