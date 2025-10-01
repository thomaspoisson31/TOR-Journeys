
import GeminiManager from './gemini-manager.js';

class SettingsManager {
    constructor() {
        this.geminiManager = new GeminiManager();
        this.isSettingsOpen = false;
        this.currentTab = 'maps';
        this.availableMaps = [];
        this.currentMapConfig = {
            playerMap: 'fr_tor_2nd_eriadors_map_page-0001.webp',
            loremasterMap: 'fr_tor_2nd_eriadors_map_page_loremaster.webp'
        };
        this.editingMapIndex = -1;
        this.partyDescription = '';
        this.questDescription = '';
        this.narrationStyle = 'brief';
        
        console.log('⚙️ SettingsManager initialized');
    }

    init() {
        this.loadSettingsData();
        this.setupEventListeners();
        this.updateNarrationStyleDisplay();
    }

    loadSettingsData() {
        // Charger les cartes
        const savedMaps = localStorage.getItem('availableMaps');
        const savedConfig = localStorage.getItem('currentMapConfig');

        if (savedMaps) {
            try {
                this.availableMaps = JSON.parse(savedMaps);
            } catch (e) {
                console.error('Error loading maps data:', e);
                this.availableMaps = [];
            }
        }

        if (savedConfig) {
            try {
                this.currentMapConfig = JSON.parse(savedConfig);
            } catch (e) {
                console.error('Error loading map config:', e);
            }
        }

        // Ajouter les cartes par défaut si la liste est vide
        if (this.availableMaps.length === 0) {
            this.availableMaps = [
                {
                    id: 1,
                    name: 'Carte Joueur - Eriador',
                    filename: 'fr_tor_2nd_eriadors_map_page-0001.webp',
                    type: 'player',
                    isDefault: true
                },
                {
                    id: 2,
                    name: 'Carte Gardien - Eriador',
                    filename: 'fr_tor_2nd_eriadors_map_page_loremaster.webp',
                    type: 'loremaster',
                    isDefault: true
                }
            ];
            this.saveMapsData();
        }

        // Charger les descriptions
        this.partyDescription = localStorage.getItem('partyDescription') || '';
        this.questDescription = localStorage.getItem('questDescription') || '';
        this.narrationStyle = localStorage.getItem('narrationStyle') || 'brief';
    }

    saveMapsData() {
        localStorage.setItem('availableMaps', JSON.stringify(this.availableMaps));
        localStorage.setItem('currentMapConfig', JSON.stringify(this.currentMapConfig));
        this.scheduleAutoSync();
    }

    saveDescriptions() {
        localStorage.setItem('partyDescription', this.partyDescription);
        localStorage.setItem('questDescription', this.questDescription);
        localStorage.setItem('narrationStyle', this.narrationStyle);
        this.scheduleAutoSync();
    }

    scheduleAutoSync() {
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }
    }

    setupEventListeners() {
        // Bouton principal des paramètres
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }

        // Bouton fermer
        const closeBtn = document.getElementById('close-settings-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSettings());
        }

        // Onglets
        this.setupTabListeners();

        // Onglet Cartes
        this.setupMapsListeners();

        // Onglet Aventuriers
        this.setupPartyListeners();

        // Onglet Quête
        this.setupQuestListeners();

        // Styles de narration
        this.setupNarrationListeners();

        // Onglet Saison - réutiliser CalendarManager
        this.setupSeasonListeners();
    }

    setupTabListeners() {
        const tabButtons = document.querySelectorAll('.settings-tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                this.switchTab(targetTab);
            });
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        // Désactiver tous les onglets
        document.querySelectorAll('.settings-tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Activer l'onglet cible
        const targetButton = document.querySelector(`.settings-tab-button[data-tab="${tabName}"]`);
        const targetContent = document.getElementById(`${tabName}-tab`);

        if (targetButton) targetButton.classList.add('active');
        if (targetContent) targetContent.classList.add('active');

        // Actions spécifiques par onglet
        switch (tabName) {
            case 'maps':
                this.renderMapsGrid();
                this.updateActiveMapPreviews();
                break;
            case 'party':
                this.updatePartyContent();
                break;
            case 'quest':
                this.updateQuestContent();
                break;
            case 'season':
                this.updateSeasonContent();
                break;
        }
    }

    // === GESTION DES CARTES ===
    setupMapsListeners() {
        // Bouton ajouter une carte
        const addMapBtn = document.getElementById('add-map-btn');
        if (addMapBtn) {
            addMapBtn.addEventListener('click', () => this.openMapModal());
        }

        // Modal de carte
        const closeMapModalBtn = document.getElementById('close-map-modal');
        const cancelMapBtn = document.getElementById('cancel-map-btn');
        const saveMapBtn = document.getElementById('save-map-btn');

        if (closeMapModalBtn) closeMapModalBtn.addEventListener('click', () => this.closeMapModal());
        if (cancelMapBtn) cancelMapBtn.addEventListener('click', () => this.closeMapModal());
        if (saveMapBtn) saveMapBtn.addEventListener('click', () => this.saveMap());

        // Preview de l'image
        const fileInput = document.getElementById('map-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleMapFileSelect(e));
        }
    }

    renderMapsGrid() {
        const mapsGrid = document.getElementById('maps-grid');
        if (!mapsGrid) return;

        mapsGrid.innerHTML = this.availableMaps.map((map, index) => {
            const isActive = (map.type === 'player' && this.currentMapConfig.playerMap === map.filename) ||
                            (map.type === 'loremaster' && this.currentMapConfig.loremasterMap === map.filename);

            return `
                <div class="bg-gray-800 rounded-lg p-3 border ${isActive ? 'border-blue-500' : 'border-gray-600'} relative">
                    ${isActive ? '<div class="absolute top-2 right-2 text-blue-400"><i class="fas fa-check-circle"></i></div>' : ''}
                    <div class="aspect-video bg-gray-700 rounded-lg mb-2 overflow-hidden">
                        <img src="${map.filename}" alt="${map.name}" class="w-full h-full object-cover" 
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjNjc3NDhDIi8+Cjwvc3ZnPg=='">
                    </div>
                    <div class="text-sm font-medium text-white mb-1">${map.name}</div>
                    <div class="text-xs text-gray-400 mb-2">${map.type === 'player' ? 'Carte Joueur' : 'Carte Gardien'}</div>
                    <div class="flex space-x-2">
                        <button class="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs ${isActive ? 'opacity-50 cursor-not-allowed' : ''}"
                                onclick="window.settingsManager.setActiveMap('${map.filename}', '${map.type}')"
                                ${isActive ? 'disabled' : ''}>
                            ${isActive ? 'Active' : 'Activer'}
                        </button>
                        <button class="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs" 
                                onclick="window.settingsManager.editMap(${index})">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${!map.isDefault ? `<button class="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs" onclick="window.settingsManager.deleteMap(${index})"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    updateActiveMapPreviews() {
        const playerPreview = document.getElementById('active-player-map-preview');
        const loremasterPreview = document.getElementById('active-loremaster-map-preview');

        if (playerPreview) {
            playerPreview.src = this.currentMapConfig.playerMap;
        }
        if (loremasterPreview) {
            loremasterPreview.src = this.currentMapConfig.loremasterMap;
        }
    }

    setActiveMap(filename, type) {
        if (type === 'player') {
            this.currentMapConfig.playerMap = filename;
            const mapImage = document.getElementById('map-image');
            if (mapImage) mapImage.src = filename;
        } else if (type === 'loremaster') {
            this.currentMapConfig.loremasterMap = filename;
            const loremasterMapImage = document.getElementById('loremaster-map-image');
            if (loremasterMapImage) loremasterMapImage.src = filename;
        }

        this.saveMapsData();
        this.renderMapsGrid();
        this.updateActiveMapPreviews();
    }

    openMapModal(editIndex = -1) {
        this.editingMapIndex = editIndex;
        const modal = document.getElementById('map-modal');
        const title = document.getElementById('map-modal-title');
        const nameInput = document.getElementById('map-name-input');
        const fileInput = document.getElementById('map-file-input');
        const previewContainer = document.getElementById('map-preview-container');
        const previewImage = document.getElementById('map-preview-image');
        const saveText = document.getElementById('save-map-text');

        if (editIndex >= 0) {
            const map = this.availableMaps[editIndex];
            title.innerHTML = '<i class="fas fa-map-marked-alt mr-2"></i>Modifier la carte';
            nameInput.value = map.name;
            previewContainer.classList.remove('hidden');
            previewImage.src = map.filename;
            document.querySelector(`input[name="map-type"][value="${map.type}"]`).checked = true;
            saveText.textContent = 'Modifier';
        } else {
            title.innerHTML = '<i class="fas fa-map-marked-alt mr-2"></i>Ajouter une carte';
            nameInput.value = '';
            fileInput.value = '';
            previewContainer.classList.add('hidden');
            document.querySelector('input[name="map-type"][value="player"]').checked = true;
            saveText.textContent = 'Ajouter';
        }

        modal.classList.remove('hidden');
    }

    closeMapModal() {
        document.getElementById('map-modal').classList.add('hidden');
        this.editingMapIndex = -1;
    }

    editMap(index) {
        this.openMapModal(index);
    }

    deleteMap(index) {
        if (this.availableMaps[index].isDefault) {
            alert('Impossible de supprimer une carte par défaut.');
            return;
        }

        if (confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) {
            this.availableMaps.splice(index, 1);
            this.saveMapsData();
            this.renderMapsGrid();
        }
    }

    handleMapFileSelect(event) {
        const file = event.target.files[0];
        const previewContainer = document.getElementById('map-preview-container');
        const previewImage = document.getElementById('map-preview-image');

        if (file && file.type.match('image.*')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    }

    saveMap() {
        const nameInput = document.getElementById('map-name-input');
        const fileInput = document.getElementById('map-file-input');
        const mapType = document.querySelector('input[name="map-type"]:checked').value;

        if (!nameInput.value.trim()) {
            alert('Veuillez entrer un nom pour la carte.');
            return;
        }

        if (this.editingMapIndex >= 0) {
            // Modification d'une carte existante
            this.availableMaps[this.editingMapIndex].name = nameInput.value.trim();
            this.availableMaps[this.editingMapIndex].type = mapType;

            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const filename = `map_${Date.now()}_${file.name}`;
                this.availableMaps[this.editingMapIndex].filename = filename;

                const reader = new FileReader();
                reader.onload = (e) => {
                    this.availableMaps[this.editingMapIndex].dataUrl = e.target.result;
                    this.saveMapsData();
                    this.renderMapsGrid();
                    this.closeMapModal();
                };
                reader.readAsDataURL(file);
                return;
            }
        } else {
            // Nouvelle carte
            if (fileInput.files.length === 0) {
                alert('Veuillez sélectionner un fichier image.');
                return;
            }

            const file = fileInput.files[0];
            const filename = `map_${Date.now()}_${file.name}`;

            const reader = new FileReader();
            reader.onload = (e) => {
                const newMap = {
                    id: Date.now(),
                    name: nameInput.value.trim(),
                    filename: filename,
                    type: mapType,
                    isDefault: false,
                    dataUrl: e.target.result
                };

                this.availableMaps.push(newMap);
                this.saveMapsData();
                this.renderMapsGrid();
                this.closeMapModal();
            };
            reader.readAsDataURL(file);
            return;
        }

        this.saveMapsData();
        this.renderMapsGrid();
        this.closeMapModal();
    }

    // === GESTION DES AVENTURIERS ===
    setupPartyListeners() {
        const savePartyBtn = document.getElementById('save-party-description-btn');
        const generatePartyBtn = document.getElementById('generate-party-description-btn');

        if (savePartyBtn) {
            savePartyBtn.addEventListener('click', () => this.savePartyDescription());
        }

        if (generatePartyBtn) {
            generatePartyBtn.addEventListener('click', () => this.generatePartyDescription());
        }
    }

    updatePartyContent() {
        const textarea = document.getElementById('party-description-textarea');
        if (textarea) {
            textarea.value = this.partyDescription;
        }
    }

    savePartyDescription() {
        const textarea = document.getElementById('party-description-textarea');
        if (textarea) {
            this.partyDescription = textarea.value;
            this.saveDescriptions();
            
            // Feedback visuel
            const saveBtn = document.getElementById('save-party-description-btn');
            if (saveBtn) {
                const originalText = saveBtn.textContent;
                saveBtn.textContent = 'Sauvegardé !';
                saveBtn.classList.add('bg-green-600');
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.classList.remove('bg-green-600');
                }, 2000);
            }
        }
    }

    async generatePartyDescription() {
        const generateBtn = document.getElementById('generate-party-description-btn');
        const textarea = document.getElementById('party-description-textarea');

        if (!this.geminiManager.isAvailable()) {
            alert('API Gemini non disponible pour la génération automatique.');
            return;
        }

        const prompt = `Génère une description d'un groupe d'aventuriers pour un jeu de rôle dans l'univers de la Terre du Milieu. 
        Inclus 3-4 personnages avec leurs noms, races, classes et quelques traits de personnalité. 
        Style narratif, environ 200 mots.`;

        try {
            const description = await this.geminiManager.generateContent(prompt, generateBtn, 'party');
            if (textarea) {
                textarea.value = description;
                this.partyDescription = description;
                this.saveDescriptions();
            }
        } catch (error) {
            console.error('Erreur génération description groupe:', error);
            alert('Erreur lors de la génération: ' + error.message);
        }
    }

    // === GESTION DE LA QUÊTE ===
    setupQuestListeners() {
        const saveQuestBtn = document.getElementById('save-quest-description-btn');
        const generateQuestBtn = document.getElementById('generate-quest-description-btn');

        if (saveQuestBtn) {
            saveQuestBtn.addEventListener('click', () => this.saveQuestDescription());
        }

        if (generateQuestBtn) {
            generateQuestBtn.addEventListener('click', () => this.generateQuestDescription());
        }
    }

    updateQuestContent() {
        const textarea = document.getElementById('quest-description-textarea');
        if (textarea) {
            textarea.value = this.questDescription;
        }
    }

    saveQuestDescription() {
        const textarea = document.getElementById('quest-description-textarea');
        if (textarea) {
            this.questDescription = textarea.value;
            this.saveDescriptions();
            
            // Feedback visuel
            const saveBtn = document.getElementById('save-quest-description-btn');
            if (saveBtn) {
                const originalText = saveBtn.textContent;
                saveBtn.textContent = 'Sauvegardé !';
                saveBtn.classList.add('bg-green-600');
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.classList.remove('bg-green-600');
                }, 2000);
            }
        }
    }

    async generateQuestDescription() {
        const generateBtn = document.getElementById('generate-quest-description-btn');
        const textarea = document.getElementById('quest-description-textarea');

        if (!this.geminiManager.isAvailable()) {
            alert('API Gemini non disponible pour la génération automatique.');
            return;
        }

        const prompt = `Génère une description de quête épique pour un jeu de rôle dans l'univers de la Terre du Milieu.
        Inclus un objectif principal, des enjeux, et quelques obstacles potentiels.
        Style narratif immersif, environ 250 mots.`;

        try {
            const description = await this.geminiManager.generateContent(prompt, generateBtn, 'quest');
            if (textarea) {
                textarea.value = description;
                this.questDescription = description;
                this.saveDescriptions();
            }
        } catch (error) {
            console.error('Erreur génération description quête:', error);
            alert('Erreur lors de la génération: ' + error.message);
        }
    }

    // === STYLES DE NARRATION ===
    setupNarrationListeners() {
        const narrationRadios = document.querySelectorAll('input[name="narration-style"]');
        narrationRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.narrationStyle = e.target.value;
                    this.saveDescriptions();
                    this.updateNarrationStyleDisplay();
                }
            });
        });
    }

    updateNarrationStyleDisplay() {
        // Mettre à jour le radio sélectionné
        const radio = document.querySelector(`input[name="narration-style"][value="${this.narrationStyle}"]`);
        if (radio) {
            radio.checked = true;
        }

        // Mettre à jour l'affichage dans le bouton de génération de voyage
        const describeBtn = document.getElementById('describe-journey-btn');
        if (describeBtn) {
            let styleText = '';
            switch (this.narrationStyle) {
                case 'detailed': styleText = ' (Détaillée)'; break;
                case 'brief': styleText = ' (Brève)'; break;
                case 'keywords': styleText = ' (Points clés)'; break;
                default: styleText = ' (Brève)';
            }
            
            const span = describeBtn.querySelector('span:last-child');
            if (span) {
                span.textContent = `Décrire le voyage${styleText}`;
            }
        }
    }

    // === GESTION DES SAISONS ===
    setupSeasonListeners() {
        // Réutiliser le CalendarManager existant
        if (window.calendarManager) {
            window.calendarManager.reinitializeListeners();
        }
    }

    updateSeasonContent() {
        // Le contenu de saison est géré par CalendarManager
        if (window.calendarManager) {
            window.calendarManager.updateCalendarUI();
        }
    }

    // === GESTION PRINCIPALE ===
    openSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.isSettingsOpen = true;
            
            // Ouvrir l'onglet cartes par défaut
            this.switchTab('maps');
        }
    }

    closeSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('hidden');
            this.isSettingsOpen = false;
        }
    }

    // Getters pour accès externe
    getNarrationStyle() {
        return this.narrationStyle;
    }

    getPartyDescription() {
        return this.partyDescription;
    }

    getQuestDescription() {
        return this.questDescription;
    }

    getCurrentMapConfig() {
        return this.currentMapConfig;
    }

    getAvailableMaps() {
        return this.availableMaps;
    }
}

export default SettingsManager;
