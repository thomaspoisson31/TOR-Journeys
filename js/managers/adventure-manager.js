
class AdventureManager {
    constructor() {
        this.isEditMode = false;
        this.adventureData = {
            quest: '',
            rumors: [],
            threats: [],
            randomTables: []
        };
        
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
                editBtn.style.color = '#60a5fa'; // bleu clair
            } else {
                editBtn.style.color = '#ffffff'; // blanc
            }
        }
    }

    renderContent() {
        console.log("🔧 renderContent() appelé, isEditMode:", this.isEditMode);
        if (this.isEditMode) {
            console.log("🔧 Rendu en mode ÉDITION");
            this.renderEditMode();
        } else {
            console.log("🔧 Rendu en mode LECTURE");
            this.renderReadMode();
        }
    }

    renderReadMode() {
        // Onglet Quête - nettoyer et recréer (comme InfoBoxManager)
        const questTab = document.getElementById('quest-tab');
        if (questTab) {
            questTab.innerHTML = '';
            if (this.adventureData.quest) {
                questTab.innerHTML = `<div class="prose prose-invert p-4">${this.renderMarkdown(this.adventureData.quest)}</div>`;
            } else {
                questTab.innerHTML = '<p class="text-gray-400 italic p-4">Aucune description de quête disponible.</p>';
            }
        }

        // Onglet Rumeurs - nettoyer complètement et recréer (comme InfoBoxManager)
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

        // Onglet Menaces - nettoyer complètement et recréer (comme InfoBoxManager)
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

        // Onglet Tables aléatoires
        this.renderRandomTablesTab();
    }

    renderEditMode() {
        // Onglet Quête - nettoyer complètement puis créer (comme InfoBoxManager)
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

        // Onglet Rumeurs - nettoyer complètement puis créer (comme InfoBoxManager)
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

        // Onglet Menaces - nettoyer complètement puis créer (comme InfoBoxManager)
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
        // Sauvegarder tous les onglets (comme saveEdit dans InfoBoxManager)
        const questInput = document.getElementById('edit-quest');
        if (questInput) {
            this.adventureData.quest = questInput.value.trim();
        }

        // Rumeurs
        const rumorInputs = document.querySelectorAll('.edit-rumor-input');
        rumorInputs.forEach((input, index) => {
            if (this.adventureData.rumors[index]) {
                this.adventureData.rumors[index].text = input.value.trim();
            }
        });
        this.adventureData.rumors = this.adventureData.rumors.filter(r => r.text !== '');

        // Menaces
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
        
        // Marquer comme non sauvegardé
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('adventureData');
        if (saved) {
            try {
                this.adventureData = JSON.parse(saved);
                console.log("✅ Adventure data loaded from localStorage");
            } catch (e) {
                console.error("❌ Failed to load adventure data:", e);
            }
        }
    }

    renderRandomTablesTab() {
        const tabContent = document.getElementById('random-tables-content');
        if (!tabContent) return;

        const tables = this.adventureData.randomTables || [];

        let html = `
            <div class="mb-4">
                <input type="file" id="upload-random-table" accept=".json" class="hidden">
                <button onclick="document.getElementById('upload-random-table').click()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                    <i class="fas fa-upload mr-2"></i>Importer une table JSON
                </button>
            </div>
        `;

        if (tables.length === 0) {
            html += '<p class="text-gray-400 italic">Aucune table aléatoire importée.</p>';
        } else {
            html += '<div class="space-y-4">';
            tables.forEach((table, index) => {
                html += `
                    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div class="flex justify-between items-center mb-3">
                            <h4 class="text-lg font-semibold text-white">${table.name}</h4>
                            <div class="flex space-x-2">
                                <button onclick="window.adventureManager.rollOnTable(${index})" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                                    <i class="fas fa-dice mr-1"></i>Tirer
                                </button>
                                <button onclick="window.adventureManager.deleteRandomTable(${index})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div class="text-sm text-gray-400 mb-2">${table.entries.length} entrées</div>
                        <div id="table-result-${index}" class="hidden mt-3 p-3 bg-gray-700 rounded border border-green-500">
                            <div class="text-green-400 font-semibold mb-2">Résultat du tirage :</div>
                            <div id="table-result-content-${index}"></div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        tabContent.innerHTML = html;

        // Ajouter l'écouteur d'événement pour l'upload
        const uploadInput = document.getElementById('upload-random-table');
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => this.handleRandomTableUpload(e));
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

            // Extraire le nom du fichier sans l'extension
            const fileName = file.name.replace(/\.json$/i, '');

            const newTable = {
                name: fileName,
                entries: entries
            };

            this.adventureData.randomTables.push(newTable);
            this.saveToLocalStorage();
            this.renderRandomTablesTab();

            // Reset l'input
            event.target.value = '';
        } catch (error) {
            console.error('Erreur lors de l\'import de la table:', error);
            alert('Erreur lors de l\'import du fichier JSON. Vérifiez le format.');
        }
    }

    rollOnTable(tableIndex) {
        const table = this.adventureData.randomTables[tableIndex];
        if (!table || !table.entries || table.entries.length === 0) return;

        // Tirage aléatoire
        const randomIndex = Math.floor(Math.random() * table.entries.length);
        const entry = table.entries[randomIndex];

        // Afficher le résultat
        const resultContainer = document.getElementById(`table-result-${tableIndex}`);
        const resultContent = document.getElementById(`table-result-content-${tableIndex}`);

        if (resultContainer && resultContent) {
            let html = '<div class="space-y-2">';
            
            // Afficher toutes les propriétés de l'entrée
            for (const [key, value] of Object.entries(entry)) {
                html += `
                    <div>
                        <span class="text-gray-400 font-semibold">${key}:</span>
                        <span class="text-white ml-2">${value}</span>
                    </div>
                `;
            }
            
            html += '</div>';
            resultContent.innerHTML = html;
            resultContainer.classList.remove('hidden');

            // Masquer après 10 secondes
            setTimeout(() => {
                resultContainer.classList.add('hidden');
            }, 10000);
        }
    }

    deleteRandomTable(index) {
        if (confirm('Voulez-vous vraiment supprimer cette table aléatoire ?')) {
            this.adventureData.randomTables.splice(index, 1);
            this.saveToLocalStorage();
            this.renderRandomTablesTab();
        }
    }

    // Méthode pour récupérer toutes les données (pour synchronisation)
    getAllData() {
        return this.adventureData;
    }
}

export default AdventureManager;
