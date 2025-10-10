
class AdventureManager {
    constructor() {
        this.isEditMode = false;
        this.adventureData = {
            quest: '',
            rumors: [],
            threats: []
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
        // Onglet Quête
        const questDesc = document.getElementById('quest-description');
        if (questDesc) {
            if (this.adventureData.quest) {
                questDesc.innerHTML = `<div class="prose prose-invert">${this.renderMarkdown(this.adventureData.quest)}</div>`;
            } else {
                questDesc.innerHTML = '<p class="text-gray-400 italic">Aucune description de quête disponible.</p>';
            }
        }

        // Onglet Rumeurs - recréer la structure si nécessaire
        const rumorsTab = document.getElementById('rumors-tab');
        if (rumorsTab && !rumorsTab.querySelector('.rumors-view')) {
            rumorsTab.innerHTML = `
                <div class="rumors-view">
                    <div id="rumors-list" class="space-y-2"></div>
                </div>
            `;
        }
        
        const rumorsList = document.getElementById('rumors-list');
        if (rumorsList) {
            if (this.adventureData.rumors.length > 0) {
                rumorsList.innerHTML = this.adventureData.rumors.map((rumor, index) => `
                    <div class="rumor-item ${rumor.completed ? 'completed' : ''}" data-index="${index}">
                        <input type="checkbox" ${rumor.completed ? 'checked' : ''} onchange="window.adventureManager.toggleRumorComplete(${index})">
                        <div class="rumor-text">${rumor.text}</div>
                    </div>
                `).join('');
            } else {
                rumorsList.innerHTML = '<p class="text-gray-400 italic">Aucune rumeur enregistrée.</p>';
            }
        }

        // Onglet Menaces - recréer la structure si nécessaire
        const threatsTab = document.getElementById('threats-tab');
        if (threatsTab && !threatsTab.querySelector('.threats-view')) {
            threatsTab.innerHTML = `
                <div class="threats-view">
                    <div id="threats-list" class="space-y-2"></div>
                </div>
            `;
        }
        
        const threatsList = document.getElementById('threats-list');
        if (threatsList) {
            if (this.adventureData.threats.length > 0) {
                threatsList.innerHTML = this.adventureData.threats.map((threat, index) => `
                    <div class="threat-item ${threat.completed ? 'completed' : ''}" data-index="${index}">
                        <input type="checkbox" ${threat.completed ? 'checked' : ''} onchange="window.adventureManager.toggleThreatComplete(${index})">
                        <div class="threat-text">${threat.text}</div>
                    </div>
                `).join('');
            } else {
                threatsList.innerHTML = '<p class="text-gray-400 italic">Aucune menace enregistrée.</p>';
            }
        }
    }

    renderEditMode() {
        // Onglet Quête
        const questTab = document.getElementById('quest-tab');
        if (questTab) {
            questTab.innerHTML = `
                <div class="edit-form">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-white mb-2">Description de la quête (Markdown supporté) :</label>
                        <textarea id="edit-quest" class="w-full p-3 border rounded h-64 bg-gray-800 text-white font-mono text-sm border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="Décrivez la quête principale de l'aventure...">${this.adventureData.quest || ''}</textarea>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="window.adventureManager.saveQuest()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-save mr-1"></i>Sauvegarder
                        </button>
                        <button onclick="window.adventureManager.toggleEditMode()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-times mr-1"></i>Annuler
                        </button>
                    </div>
                </div>
            `;
        }

        // Onglet Rumeurs
        const rumorsTab = document.getElementById('rumors-tab');
        if (rumorsTab) {
            rumorsTab.innerHTML = `
                <div class="edit-form">
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
                        <button onclick="window.adventureManager.saveRumors()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-save mr-1"></i>Sauvegarder
                        </button>
                        <button onclick="window.adventureManager.toggleEditMode()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-times mr-1"></i>Annuler
                        </button>
                    </div>
                </div>
            `;
        }

        // Onglet Menaces
        const threatsTab = document.getElementById('threats-tab');
        if (threatsTab) {
            threatsTab.innerHTML = `
                <div class="edit-form">
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
                        <button onclick="window.adventureManager.saveThreats()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-save mr-1"></i>Sauvegarder
                        </button>
                        <button onclick="window.adventureManager.toggleEditMode()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-times mr-1"></i>Annuler
                        </button>
                    </div>
                </div>
            `;
        }
    }

    saveQuest() {
        const questInput = document.getElementById('edit-quest');
        if (questInput) {
            this.adventureData.quest = questInput.value.trim();
            this.saveToLocalStorage();
            this.isEditMode = false;
            this.updateEditButtonStyle();
            this.renderContent();
        }
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

    saveRumors() {
        const inputs = document.querySelectorAll('.edit-rumor-input');
        
        inputs.forEach((input, index) => {
            if (this.adventureData.rumors[index]) {
                this.adventureData.rumors[index].text = input.value.trim();
            }
        });
        
        // Filtrer les rumeurs vides
        this.adventureData.rumors = this.adventureData.rumors.filter(r => r.text !== '');
        
        this.saveToLocalStorage();
        
        // Désactiver le mode édition et re-rendre (comme dans InfoBoxManager)
        this.isEditMode = false;
        this.updateEditButtonStyle();
        this.renderContent();
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

    saveThreats() {
        const inputs = document.querySelectorAll('.edit-threat-input');
        
        inputs.forEach((input, index) => {
            if (this.adventureData.threats[index]) {
                this.adventureData.threats[index].text = input.value.trim();
            }
        });
        
        // Filtrer les menaces vides
        this.adventureData.threats = this.adventureData.threats.filter(t => t.text !== '');
        
        this.saveToLocalStorage();
        
        // Désactiver le mode édition et re-rendre (comme dans InfoBoxManager)
        this.isEditMode = false;
        this.updateEditButtonStyle();
        this.renderContent();
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
}

export default AdventureManager;
