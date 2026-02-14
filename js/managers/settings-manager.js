import GeminiManager from './gemini-manager.js';

class SettingsManager {
    constructor() {
        this.geminiManager = new GeminiManager();
        this.uploadManager = null; // Sera initialisé après
        this.isSettingsOpen = false;
        this.currentTab = 'maps';
        this.availableMaps = [];
        this.activeMapUrl = 'fr_tor_2nd_eriadors_map_page-0001.webp';
        this.activeMapName = 'Carte Eriador par défaut';
        this.editingMapIndex = -1;
        this.partyDescription = '';
        this.questDescription = '';
        this.narrationStyle = 'brief';
        this.currentRandomResult = null; // Pour stocker le résultat du tirage aléatoire

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
        const savedActiveMap = localStorage.getItem('activeMapUrl');
        const savedActiveMapName = localStorage.getItem('activeMapName');

        if (savedMaps) {
            try {
                this.availableMaps = JSON.parse(savedMaps);
            } catch (e) {
                console.error('Error loading maps data:', e);
                this.availableMaps = [];
            }
        }

        if (savedActiveMap) {
            this.activeMapUrl = savedActiveMap;
        }

        if (savedActiveMapName) {
            this.activeMapName = savedActiveMapName;
        }

        // Ajouter carte par défaut si la liste est vide (UNE SEULE carte)
        if (this.availableMaps.length === 0) {
            this.availableMaps = [
                {
                    id: Date.now(),
                    name: 'Carte Eriador par défaut',
                    url: 'fr_tor_2nd_eriadors_map_page-0001.webp',
                    isDefault: true,
                    isActive: true,
                    milesPerDay: 20
                }
            ];
            this.activeMapUrl = this.availableMaps[0].url;
            this.activeMapName = this.availableMaps[0].name;
            this.saveMapsData();
        }

        // Migrer les cartes existantes pour ajouter milesPerDay si manquant
        this.availableMaps.forEach(map => {
            if (!map.milesPerDay) {
                map.milesPerDay = 20; // Valeur par défaut
            }
        });

        // Charger les descriptions
        this.partyDescription = localStorage.getItem('partyDescription') || '';
        this.questDescription = localStorage.getItem('questDescription') || '';
        this.narrationStyle = localStorage.getItem('narrationStyle') || 'brief';

        // Charger les associations tables aléatoires par carte
        const savedMapRandomTables = localStorage.getItem('mapRandomTables');
        this.mapRandomTables = savedMapRandomTables ? JSON.parse(savedMapRandomTables) : {};
    }

    saveMapsData() {
        localStorage.setItem('availableMaps', JSON.stringify(this.availableMaps));
        localStorage.setItem('activeMapUrl', this.activeMapUrl);
        localStorage.setItem('activeMapName', this.activeMapName);

        // Marquer comme non sauvegardé
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }

        this.scheduleAutoSync();
    }

    saveDescriptions() {
        localStorage.setItem('partyDescription', this.partyDescription);
        localStorage.setItem('questDescription', this.questDescription);
        localStorage.setItem('narrationStyle', this.narrationStyle);

        // Marquer comme non sauvegardé
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }

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

        // Bouton de fermeture de la modale de résultat de tirage
        const closeRandomResultBtn = document.getElementById('close-random-roll-result');
        if (closeRandomResultBtn) {
            closeRandomResultBtn.addEventListener('click', () => this.closeRandomRollResult());
        }

        // Bouton d'insertion dans le journal
        const insertToJournalBtn = document.getElementById('insert-random-result-to-journal');
        if (insertToJournalBtn) {
            insertToJournalBtn.addEventListener('click', () => this.insertRandomResultToJournal());
        }
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
            btn.classList.remove('active', 'text-white', 'border-blue-500');
            btn.classList.add('text-gray-400', 'border-transparent');
        });
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });

        // Activer l'onglet cible
        const targetButton = document.querySelector(`.settings-tab-button[data-tab="${tabName}"]`);
        const targetContent = document.getElementById(`${tabName}-tab`);

        if (targetButton) {
            targetButton.classList.add('active', 'text-white', 'border-blue-500');
            targetButton.classList.remove('text-gray-400', 'border-transparent');
        }
        if (targetContent) {
            targetContent.classList.add('active');
            targetContent.style.display = 'block';
        }

        // Actions spécifiques par onglet
        switch (tabName) {
            case 'maps':
                this.renderMapsGrid();
                break;
            case 'adventurers':
                this.updatePartyContent();
                break;
            case 'quest':
                this.updateQuestContent();
                break;
            case 'season':
                this.updateSeasonContent();
                break;
            case 'random-tables':
                this.renderSettingsRandomTablesTab();
                break;
            case 'counters':
                if (window.countersManager) {
                    window.countersManager.render();
                }
                break;
        }
    }

    // === GESTION DES CARTES ===
    async setupMapsListeners() {
        // Importer UploadManager dynamiquement
        const UploadManagerModule = await import('./upload-manager.js');
        const UploadManager = UploadManagerModule.default;
        this.uploadManager = new UploadManager();

        // Setup du bouton d'ajout de carte
        const addNewMapBtn = document.getElementById('add-new-map-btn');
        if (addNewMapBtn) {
            addNewMapBtn.addEventListener('click', () => this.showAddMapModal());
        }

        // Setup du bouton de suppression de tous les lieux et régions
        const deleteAllBtn = document.getElementById('delete-all-locations-regions-btn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => this.deleteAllLocationsAndRegions());
        }
    }

    showAddMapModal() {
        // Créer une modale pour ajouter une carte
        const modal = document.createElement('div');
        modal.id = 'add-map-modal-temp';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]';

        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6 w-[90vw] max-w-md mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-white">Ajouter une carte</h3>
                    <button id="close-add-map-modal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Nom de la carte</label>
                        <input type="text" id="temp-map-name-input" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="Ex: Eriador - Ma carte personnalisée">
                    </div>

                    <div id="temp-map-upload-container" class="hidden">
                        <!-- Le composant d'upload sera inséré ici (masqué) -->
                    </div>

                    <button type="button" id="choose-map-from-library-btn" class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors flex items-center justify-center space-x-2">
                        <i class="fas fa-images"></i>
                        <span>Choisir dans la bibliothèque</span>
                    </button>
                </div>

                <div class="flex justify-end space-x-3 mt-6">
                    <button id="cancel-add-map" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg">Annuler</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup du composant d'upload dans la modale (toujours créé mais masqué)
        const uploadContainer = document.getElementById('temp-map-upload-container');
        if (uploadContainer && this.uploadManager) {
            this.uploadManager.createUploadComponent(uploadContainer, 'maps', (result) => {
                const nameInput = document.getElementById('temp-map-name-input');
                const mapName = nameInput.value.trim() || `Carte ${Date.now()}`;

                this.handleMapUploaded({ ...result, name: mapName });

                // Fermer la modale
                modal.remove();
            });
        }

        // Gestionnaires d'événements
        document.getElementById('close-add-map-modal').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('cancel-add-map').addEventListener('click', () => {
            modal.remove();
        });

        // Bouton pour choisir depuis la bibliothèque
        document.getElementById('choose-map-from-library-btn').addEventListener('click', () => {
            if (window.libraryManager) {
                window.libraryManager.open({
                    title: "Choisir une carte",
                    startPath: 'maps',
                    onSelect: (file) => {
                        this.selectLibraryImageForMap(file.url, file.filename);
                    }
                });
            } else {
                console.error("LibraryManager not available");
                alert("Erreur: Gestionnaire de bibliothèque non disponible");
            }
        });
    }

    handleMapUploaded(uploadResult) {
        const mapName = uploadResult.name || `Carte ${Date.now()}`;

        // Utiliser les dimensions retournées par l'API (image déjà redimensionnée à 5000px)
        const newMap = {
            id: Date.now(),
            name: mapName,
            url: uploadResult.url,
            isDefault: false,
            width: uploadResult.width || 5000,
            height: uploadResult.height || 3230,
            scale: 600, // Distance en miles par défaut (comme MAP_DISTANCE_MILES)
            milesPerDay: 20 // Vitesse par défaut
        };

        this.availableMaps.push(newMap);
        this.saveMapsData();
        this.renderMapsGrid();

        // Rafraîchir le MapSwitcherManager
        if (window.mapSwitcherManager && typeof window.mapSwitcherManager.refresh === 'function') {
            window.mapSwitcherManager.refresh();
        }

        console.log(`✅ Carte ajoutée: ${mapName} (${newMap.width}x${newMap.height}px)`);
    }

    selectLibraryImageForMap(imageUrl, encodedFilename) {
        const filename = decodeURIComponent(encodedFilename);

        // Récupérer le nom de la carte ou utiliser le nom de fichier
        const nameInput = document.getElementById('temp-map-name-input');
        let mapName = filename.replace(/\.[^/.]+$/, '');
        if (nameInput && nameInput.value.trim()) {
            mapName = nameInput.value.trim();
        }

        // Créer la nouvelle carte
        const newMap = {
            id: Date.now(),
            name: mapName,
            url: imageUrl,
            isDefault: false,
            width: 5000, // Défaut, sera mis à jour par loadRealMapDimensions
            height: 3230
        };

        this.availableMaps.push(newMap);
        this.saveMapsData();
        this.renderMapsGrid();

        // Rafraîchir le MapSwitcherManager
        if (window.mapSwitcherManager && typeof window.mapSwitcherManager.refresh === 'function') {
            window.mapSwitcherManager.refresh();
        }

        // Fermer la modale de carte si elle est ouverte (la bibliothèque se ferme toute seule)
        const addMapModal = document.getElementById('add-map-modal-temp');
        if (addMapModal) {
            addMapModal.remove();
        }

        // Afficher une notification de succès
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-[90]';
        notification.innerHTML = `
            <i class="fas fa-check mr-2"></i>
            Carte ajoutée avec succès
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    renderMapsGrid() {
        const mapsGrid = document.getElementById('maps-grid');
        if (!mapsGrid) return;

        // Appliquer la classe grid pour 2 colonnes
        mapsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

        // Analyser les orphelins et invalides
        const validMapIds = this.availableMaps.map(m => m.url);
        let orphanLocations = 0;
        let orphanRegions = 0;
        let invalidMapIdLocations = 0;
        let invalidMapIdRegions = 0;

        if (window.locationsData && window.locationsData.locations) {
            orphanLocations = window.locationsData.locations.filter(loc => !loc.mapId).length;
            invalidMapIdLocations = window.locationsData.locations.filter(loc =>
                loc.mapId && !validMapIds.includes(loc.mapId)
            ).length;
        }

        if (window.regionsData && window.regionsData.regions) {
            orphanRegions = window.regionsData.regions.filter(reg => !reg.mapId).length;
            invalidMapIdRegions = window.regionsData.regions.filter(reg =>
                reg.mapId && !validMapIds.includes(reg.mapId)
            ).length;
        }

        mapsGrid.innerHTML = this.availableMaps.map((map, index) => {
            const isActive = this.activeMapUrl === map.url;
            const mapWidth = map.width || 5103;
            const mapScale = map.scale || 600;

            // Compter les lieux et régions pour cette carte
            let locationsCount = 0;
            let regionsCount = 0;

            if (window.locationsData && window.locationsData.locations) {
                locationsCount = window.locationsData.locations.filter(loc =>
                    loc.mapId === map.url
                ).length;
            }

            if (window.regionsData && window.regionsData.regions) {
                regionsCount = window.regionsData.regions.filter(reg =>
                    reg.mapId === map.url
                ).length;
            }

            return `
                <div class="bg-gray-800 rounded-lg p-3 border ${isActive ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 hover:border-gray-600'} transition-all cursor-pointer"
                     onclick="window.settingsManager.setActiveMap(${index})">
                    <div class="flex items-start space-x-4">
                        <div class="w-[150px] h-[150px] bg-gray-700 rounded overflow-hidden flex-shrink-0">
                            <img src="${map.url}" alt="${map.name}" class="w-full h-full object-cover map-preview-img" data-map-index="${index}"
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiHEhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjNjc3NDhDIi8+Cjwvc3ZnPg=='">
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="text-base font-medium text-white truncate mb-2">${map.name}</div>
                            <div class="text-xs text-gray-400 mb-1" id="map-dims-${index}">${mapWidth}px • ${mapScale} miles • ${map.milesPerDay || 20} mi/j</div>
                            <div class="text-xs text-gray-400 mb-2">
                                <i class="fas fa-map-marker-alt mr-1"></i>${locationsCount} lieu${locationsCount > 1 ? 'x' : ''} •
                                <i class="fas fa-draw-polygon mr-1"></i>${regionsCount} région${regionsCount > 1 ? 's' : ''}
                            </div>
                            ${isActive ? '<div class="text-xs text-blue-400 mb-2"><i class="fas fa-check-circle mr-1"></i>Carte active</div>' : '<div class="text-xs text-gray-500 mb-2">Cliquer pour activer</div>'}

                            ${isActive ? `
                            <div class="flex gap-2 mt-2">
                                <button class="flex-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs flex items-center justify-center space-x-1"
                                        onclick="event.stopPropagation(); window.settingsManager.exportMapData(${index})"
                                        title="Exporter lieux et régions">
                                    <i class="fas fa-download"></i>
                                    <span>Export</span>
                                </button>
                                <button class="flex-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs flex items-center justify-center space-x-1"
                                        onclick="event.stopPropagation(); window.settingsManager.importMapData(${index})"
                                        title="Importer lieux et régions">
                                    <i class="fas fa-upload"></i>
                                    <span>Import</span>
                                </button>
                            </div>
                            <button class="w-full mt-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center space-x-2 text-xs"
                                    onclick="event.stopPropagation(); window.settingsManager.deleteAllLocationsAndRegions()">
                                <i class="fas fa-trash-alt"></i>
                                <span>Supprimer tous les Lieux et Régions</span>
                            </button>
                            ` : ''}
                        </div>
                        <div class="flex flex-col gap-2">
                            <button class="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors"
                                    onclick="event.stopPropagation(); window.settingsManager.renameMap(${index})"
                                    title="Renommer">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                            <button class="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded transition-colors"
                                    onclick="event.stopPropagation(); window.settingsManager.editMapScale(${index})"
                                    title="Modifier l'échelle">
                                <i class="fas fa-ruler"></i>
                            </button>
                            <button class="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 rounded transition-colors"
                                    onclick="event.stopPropagation(); window.settingsManager.editMapRandomTables(${index})"
                                    title="Définir Événements de voyage">
                                <i class="fas fa-dice"></i>
                            </button>
                            <button class="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                                    onclick="event.stopPropagation(); window.settingsManager.deleteMap(${index})"
                                    title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Section d'analyse des doublons - toujours affichée
        const hasProblems = orphanLocations > 0 || orphanRegions > 0 || invalidMapIdLocations > 0 || invalidMapIdRegions > 0;
        const bgClass = hasProblems ? 'bg-yellow-900/20 border-yellow-600' : 'bg-gray-900/20 border-gray-600';
        const textClass = hasProblems ? 'text-yellow-400' : 'text-gray-400';
        const iconClass = hasProblems ? 'fa-exclamation-triangle' : 'fa-check-circle';

        mapsGrid.innerHTML += `
            <div class="col-span-full mt-4 p-4 ${bgClass} border rounded-lg">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <div class="${textClass} font-semibold mb-2">
                            <i class="fas ${iconClass} mr-2"></i>${hasProblems ? 'Problèmes détectés' : 'Analyse des Doublons'}
                        </div>
                        ${hasProblems ? `
                        <div class="text-sm text-gray-300 mb-2">
                            ${orphanLocations + orphanRegions} élément(s) sans mapID •
                            ${invalidMapIdLocations + invalidMapIdRegions} élément(s) avec mapID invalide
                        </div>
                        ` : ''}
                        <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2 text-sm"
                                onclick="window.settingsManager.showDuplicatesAnalysis()">
                            <i class="fas fa-search"></i>
                            <span>Afficher l'analyse détaillée</span>
                        </button>
                    </div>
                </div>

                    ${orphanLocations > 0 || orphanRegions > 0 ? `
                    <div class="mb-3 p-3 bg-red-900/20 border border-red-600 rounded">
                        <div class="text-red-400 font-medium mb-2">
                            <i class="fas fa-unlink mr-2"></i>Éléments sans mapID
                        </div>
                        <div class="text-sm text-gray-300 mb-2">
                            ${orphanLocations} lieu${orphanLocations > 1 ? 'x' : ''} et ${orphanRegions} région${orphanRegions > 1 ? 's' : ''} sans mapID associé
                        </div>
                        <button class="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center justify-center space-x-2 text-xs"
                                onclick="window.settingsManager.deleteOrphanElements()">
                            <i class="fas fa-trash-alt"></i>
                            <span>Supprimer les éléments sans mapID</span>
                        </button>
                    </div>
                    ` : ''}

                    ${invalidMapIdLocations > 0 || invalidMapIdRegions > 0 ? `
                    <div class="p-3 bg-orange-900/20 border border-orange-600 rounded">
                        <div class="text-orange-400 font-medium mb-2">
                            <i class="fas fa-map-marked-alt mr-2"></i>Éléments avec mapID invalide
                        </div>
                        <div class="text-sm text-gray-300 mb-2">
                            ${invalidMapIdLocations} lieu${invalidMapIdLocations > 1 ? 'x' : ''} et ${invalidMapIdRegions} région${invalidMapIdRegions > 1 ? 's' : ''} avec un mapID qui ne correspond à aucune carte
                        </div>
                        <div class="flex gap-2">
                            <button class="flex-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 rounded transition-colors flex items-center justify-center space-x-2 text-xs"
                                    onclick="window.settingsManager.deleteInvalidMapIdElements()">
                                <i class="fas fa-trash-alt"></i>
                                <span>Supprimer</span>
                            </button>
                            <button class="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded transition-colors flex items-center justify-center space-x-2 text-xs"
                                    onclick="window.settingsManager.reassociateInvalidMapIdElements()">
                                <i class="fas fa-sync-alt"></i>
                                <span>Réassocier sur la carte active</span>
                            </button>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Charger les dimensions réelles pour chaque carte
        this.loadRealMapDimensions();
    }

    loadRealMapDimensions() {
        // Pour chaque carte, charger l'image pour obtenir ses dimensions réelles
        this.availableMaps.forEach((map, index) => {
            const img = new Image();
            img.onload = () => {
                const realWidth = img.naturalWidth;
                const realHeight = img.naturalHeight;

                // Mettre à jour les dimensions stockées si elles sont différentes
                if (map.width !== realWidth || map.height !== realHeight) {
                    console.log(`📐 Carte "${map.name}": dimensions réelles ${realWidth}x${realHeight}px (stockées: ${map.width || 'N/A'}x${map.height || 'N/A'}px)`);
                    map.width = realWidth;
                    map.height = realHeight;
                    this.saveMapsData();
                }

                // Mettre à jour l'affichage
                const dimsElement = document.getElementById(`map-dims-${index}`);
                if (dimsElement) {
                    const mapScale = map.scale || 600;
                    const milesPerDay = map.milesPerDay || 20;
                    dimsElement.textContent = `${realWidth} × ${realHeight}px • ${mapScale} miles • ${milesPerDay} mi/j`;
                }
            };
            img.onerror = () => {
                console.error(`❌ Erreur chargement image: ${map.url}`);
            };
            img.src = map.url;
        });
    }

    updateActiveMapDisplay() {
        const activePreview = document.getElementById('active-map-preview');
        const activeName = document.getElementById('active-map-name');

        if (activePreview) {
            activePreview.src = this.activeMapUrl;
        }
        if (activeName) {
            activeName.textContent = this.activeMapName;
        }
    }

    setActiveMap(index) {
        const map = this.availableMaps[index];
        if (!map) return;

        // Désactiver toutes les cartes
        this.availableMaps.forEach(m => m.isActive = false);

        // Activer la carte sélectionnée
        map.isActive = true;
        this.activeMapUrl = map.url;
        this.activeMapName = map.name;

        // Mettre à jour l'échelle et la vitesse pour le PathManager
        if (window.pathManager) {
            window.pathManager.mapConstants.MAP_DISTANCE_MILES = map.scale || 600;
            window.pathManager.mapConstants.MILES_PER_DAY = map.milesPerDay || 20;
            console.log(`🗺️ PathManager: échelle de carte mise à jour : ${map.scale || 600} miles`);
            console.log(`🗺️ PathManager: vitesse mise à jour : ${map.milesPerDay || 20} miles/jour`);
        }

        // Mettre à jour l'échelle et la vitesse pour le VoyageManager
        if (window.voyageManager) {
            window.voyageManager.MAP_DISTANCE_MILES = map.scale || 600;
            window.voyageManager.MILES_PER_DAY = map.milesPerDay || 20;
            console.log(`🗺️ VoyageManager: échelle de carte mise à jour : ${map.scale || 600} miles`);
            console.log(`🗺️ VoyageManager: vitesse mise à jour : ${map.milesPerDay || 20} miles/jour`);
        }

        // Mettre à jour l'image de la carte principale
        const mapImage = document.getElementById('map-image');
        if (mapImage) {
            mapImage.src = this.activeMapUrl;
        }

        // Charger les filtres sauvegardés pour cette carte
        if (window.filterManager) {
            const loaded = window.filterManager.loadFiltersForMap(this.activeMapUrl);
            if (!loaded) {
                console.log("ℹ️ Aucun filtre sauvegardé pour cette carte, utilisation des filtres par défaut");
            }
        }

        // Marquer comme non sauvegardé pour afficher l'icône cloud
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }

        this.saveMapsData();
        this.renderMapsGrid();

        // IMPORTANT: Reset complet des dimensions globales pour forcer recalcul
        console.log('🗺️ [switchMap] Reset MAP_WIDTH et MAP_HEIGHT à 0');
        window.MAP_WIDTH = 0;
        window.MAP_HEIGHT = 0;

        // IMPORTANT: Réinitialiser scale à 1 avant recalcul
        if (typeof window.scale !== 'undefined') {
            window.scale = 1;
            console.log('🗺️ [switchMap] Reset window.scale à 1');
        }

        // IMPORTANT: Nettoyer complètement les couches avant réinitialisation
        const locationsLayer = document.getElementById('locations-layer');
        const regionsLayer = document.getElementById('regions-layer');
        if (locationsLayer) {
            locationsLayer.innerHTML = '';
            console.log('🧹 [switchMap] Couche de lieux vidée');
        }
        if (regionsLayer) {
            regionsLayer.innerHTML = '';
            console.log('🧹 [switchMap] Couche de régions vidée');
        }

        // IMPORTANT: Forcer la réinitialisation complète de la carte
        if (typeof window.initializeMap === 'function') {
            console.log('🗺️ [switchMap] Réinitialisation complète de la carte');
            window.initializeMap();
        }

        // IMPORTANT: Charger les filtres pour la nouvelle carte active
        if (window.filterManager) {
            console.log(`🔍 [switchMap] Chargement des filtres pour la nouvelle carte: ${this.activeMapUrl}`);
            const filtersLoaded = window.filterManager.loadFiltersForMap(this.activeMapUrl);
            if (filtersLoaded) {
                console.log(`✅ [switchMap] Filtres chargés pour ${this.activeMapUrl}`);
            } else {
                console.log(`📝 [switchMap] Aucun filtre sauvegardé pour ${this.activeMapUrl}, utilisation des filtres par défaut`);
            }
        }

        // IMPORTANT: Re-render explicite des lieux et régions pour la nouvelle carte
        console.log('🎨 [switchMap] Re-render des lieux et régions pour la nouvelle carte');
        if (typeof window.renderLocations === 'function') {
            window.renderLocations();
        }
        if (typeof window.renderRegions === 'function') {
            window.renderRegions();
        }

        // IMPORTANT: Réinitialiser le voyage en cours lors du changement de carte
        console.log('🧹 [switchMap] Réinitialisation du voyage en cours');
        if (window.pathManager) {
            window.pathManager.clearPath();
            console.log('✅ [switchMap] Tracé du voyage effacé');
        }

        // Masquer le bouton de voyage s'il est visible
        const voyageBtn = document.getElementById('voyage-segments-btn');
        if (voyageBtn) {
            voyageBtn.classList.add('hidden');
            console.log('✅ [switchMap] Bouton de voyage masqué');
        }

        // Réinitialiser l'affichage du nombre de jours dans le pavé de distance
        const distanceDisplay = document.getElementById('distance-display');
        if (distanceDisplay) {
            distanceDisplay.innerHTML = '';
            console.log('✅ [switchMap] Affichage du nombre de jours réinitialisé');
        }

        // IMPORTANT: Le pavé de distance (date) doit rester visible
        console.log('📅 [switchMap] Le pavé date reste affiché');

        // IMPORTANT: Le ZoomManager sera mis à jour automatiquement par initializeMap()
        // qui est appelé après le chargement de la nouvelle carte
        console.log('🔍 [switchMap] Le ZoomManager sera mis à jour par initializeMap()');

        // Rafraîchir le MapSwitcherManager pour mettre à jour les miniatures
        if (window.mapSwitcherManager && typeof window.mapSwitcherManager.refresh === 'function') {
            window.mapSwitcherManager.refresh();
        }

        // Fermer la modale des paramètres après le changement de carte
        this.closeSettings();
    }

    renameMap(index) {
        const map = this.availableMaps[index];

        const newName = prompt(
            `Renommer la carte\n\n` +
            `Nom actuel : "${map.name}"\n\n` +
            `Nouveau nom :`,
            map.name
        );

        if (newName !== null) {
            const trimmedName = newName.trim();

            // Validation : nom non vide
            if (!trimmedName) {
                alert('Le nom de la carte ne peut pas être vide.');
                return;
            }

            // Validation : unicité (optionnel)
            const nameExists = this.availableMaps.some((m, i) =>
                i !== index && m.name.toLowerCase() === trimmedName.toLowerCase()
            );

            if (nameExists) {
                alert('Une carte avec ce nom existe déjà.');
                return;
            }

            // Renommage
            const oldName = map.name;
            map.name = trimmedName;

            // Si c'est la carte active, mettre à jour activeMapName
            if (map.url === this.activeMapUrl) {
                this.activeMapName = trimmedName;
            }

            this.saveMapsData();
            this.renderMapsGrid();

            // Rafraîchir le MapSwitcherManager
            if (window.mapSwitcherManager && typeof window.mapSwitcherManager.refresh === 'function') {
                window.mapSwitcherManager.refresh();
            }

            console.log(`🏷️ Carte renommée: "${oldName}" → "${trimmedName}"`);
        }
    }

    editMapRandomTables(index) {
        const map = this.availableMaps[index];

        // Récupérer toutes les tables disponibles depuis adventureManager
        const allTables = [];
        if (window.adventureManager && window.adventureManager.adventureData && window.adventureManager.adventureData.randomTables) {
            allTables.push(...window.adventureManager.adventureData.randomTables);
        }

        if (allTables.length === 0) {
            alert('Aucune table aléatoire n\'est définie dans les Paramètres.\nVeuillez d\'abord créer des tables dans l\'onglet "Tables aléatoires".');
            return;
        }

        // Récupérer les tables déjà associées à cette carte
        const currentTables = this.mapRandomTables[map.url] || [];

        // Créer la modale de sélection
        const modal = document.createElement('div');
        modal.id = 'map-random-tables-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]';

        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6 w-[90vw] max-w-2xl mx-4 max-h-[80vh] flex flex-col">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-white">Événements de voyage - ${map.name}</h3>
                    <button id="close-map-random-tables-modal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="text-sm text-gray-400 mb-4">
                    <i class="fas fa-info-circle mr-2"></i>
                    Sélectionnez les tables aléatoires qui seront disponibles pendant les voyages sur cette carte.
                </div>

                <div class="flex-1 overflow-y-auto mb-4 space-y-2">
                    ${allTables.map((table, idx) => {
                        const isChecked = currentTables.some(t => t.name === table.name);
                        const tableType = table.isComposite ? 'Composite' : 'Simple';
                        const tableIcon = table.isComposite ? 'fa-layer-group' : 'fa-list';
                        
                        return `
                            <label class="flex items-center p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                                <input type="checkbox" 
                                       class="map-table-checkbox mr-3 w-5 h-5" 
                                       data-table-index="${idx}"
                                       ${isChecked ? 'checked' : ''}>
                                <div class="flex-1">
                                    <div class="flex items-center">
                                        <i class="fas ${tableIcon} mr-2 text-purple-400"></i>
                                        <span class="font-medium text-white">${table.name}</span>
                                        <span class="ml-2 text-xs px-2 py-1 rounded bg-blue-900 text-blue-200">${tableType}</span>
                                    </div>
                                    <div class="text-xs text-gray-400 mt-1">
                                        ${table.isComposite ? `${table.subtables?.length || 0} sous-table(s)` : `${table.entries?.length || 0} entrée(s)`}
                                    </div>
                                </div>
                            </label>
                        `;
                    }).join('')}
                </div>

                <div class="flex justify-end space-x-3">
                    <button id="cancel-map-random-tables" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg">
                        Annuler
                    </button>
                    <button id="save-map-random-tables" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
                        <i class="fas fa-save mr-2"></i>Enregistrer
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Gestionnaires d'événements
        document.getElementById('close-map-random-tables-modal').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('cancel-map-random-tables').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('save-map-random-tables').addEventListener('click', () => {
            // Récupérer les tables sélectionnées
            const checkboxes = modal.querySelectorAll('.map-table-checkbox:checked');
            const selectedTables = [];
            
            checkboxes.forEach(checkbox => {
                const tableIndex = parseInt(checkbox.dataset.tableIndex);
                selectedTables.push(allTables[tableIndex]);
            });

            // Sauvegarder l'association
            this.mapRandomTables[map.url] = selectedTables;
            localStorage.setItem('mapRandomTables', JSON.stringify(this.mapRandomTables));

            console.log(`✅ ${selectedTables.length} table(s) associée(s) à la carte ${map.name}`);

            // Marquer comme non sauvegardé pour sync cloud
            if (typeof window.markAsUnsaved === 'function') {
                window.markAsUnsaved();
            }
            this.scheduleAutoSync();

            modal.remove();

            // Afficher un message de confirmation
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg z-[90]';
            notification.innerHTML = `
                <i class="fas fa-check mr-2"></i>
                ${selectedTables.length} table(s) associée(s)
            `;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 2000);
        });
    }

    editMapScale(index) {
        const map = this.availableMaps[index];

        const newScale = prompt(
            `Échelle de la carte "${map.name}"\n\n` +
            `Distance représentée par la largeur de la carte (en miles) :\n` +
            `(actuellement : ${map.scale || 600} miles)`,
            map.scale || 600
        );

        if (newScale !== null) {
            const scaleNum = parseFloat(newScale);
            if (!isNaN(scaleNum) && scaleNum > 0) {
                map.scale = scaleNum;

                // Demander aussi la vitesse de déplacement
                const newSpeed = prompt(
                    `Vitesse de déplacement pour "${map.name}"\n\n` +
                    `Distance parcourue par jour (en miles) :\n` +
                    `(actuellement : ${map.milesPerDay || 20} miles/jour)`,
                    map.milesPerDay || 20
                );

                if (newSpeed !== null) {
                    const speedNum = parseFloat(newSpeed);
                    if (!isNaN(speedNum) && speedNum > 0) {
                        map.milesPerDay = speedNum;
                    } else {
                        alert('Veuillez entrer une valeur numérique positive pour la vitesse.');
                        return;
                    }
                }

                this.saveMapsData();
                this.renderMapsGrid();

                // Mettre à jour les constantes si c'est la carte active
                if (map.url === this.activeMapUrl) {
                    if (window.pathManager) {
                        window.pathManager.mapConstants.MAP_DISTANCE_MILES = scaleNum;
                        window.pathManager.mapConstants.MILES_PER_DAY = map.milesPerDay || 20;
                        console.log(`✅ Échelle mise à jour : ${scaleNum} miles`);
                        console.log(`✅ Vitesse mise à jour : ${map.milesPerDay || 20} miles/jour`);
                    }
                    if (window.voyageManager) {
                        window.voyageManager.MAP_DISTANCE_MILES = scaleNum;
                        window.voyageManager.MILES_PER_DAY = map.milesPerDay || 20;
                    }
                }
            } else {
                alert('Veuillez entrer une valeur numérique positive.');
            }
        }
    }

    deleteMap(index) {
        const map = this.availableMaps[index];

        // Vérifier qu'il reste au moins une carte après suppression
        if (this.availableMaps.length <= 1) {
            alert('Impossible de supprimer la dernière carte. Au moins une carte doit être disponible.');
            return;
        }

        // Compter les lieux et régions associés à cette carte
        let locationsCount = 0;
        let regionsCount = 0;

        if (window.locationsData && window.locationsData.locations) {
            locationsCount = window.locationsData.locations.filter(loc =>
                loc.mapId === map.url
            ).length;
        }

        if (window.regionsData && window.regionsData.regions) {
            regionsCount = window.regionsData.regions.filter(reg =>
                reg.mapId === map.url
            ).length;
        }

        let confirmMessage = map.isDefault
            ? 'Êtes-vous sûr de vouloir supprimer cette carte par défaut ?'
            : 'Êtes-vous sûr de vouloir supprimer cette carte ?';

        if (locationsCount > 0 || regionsCount > 0) {
            confirmMessage += `\n\n⚠️ ATTENTION : Cette carte contient :\n- ${locationsCount} lieu${locationsCount > 1 ? 'x' : ''}\n- ${regionsCount} région${regionsCount > 1 ? 's' : ''}\n\nTous ces éléments seront DÉFINITIVEMENT supprimés !`;
        }

        if (confirm(confirmMessage)) {
            console.log(`🗑️ Suppression carte "${map.name}" (${map.url})`);
            console.log(`🗑️ ${locationsCount} lieux et ${regionsCount} régions seront supprimés`);

            // Supprimer tous les lieux associés à cette carte
            if (window.locationsData && window.locationsData.locations) {
                const beforeCount = window.locationsData.locations.length;
                window.locationsData.locations = window.locationsData.locations.filter(loc =>
                    loc.mapId !== map.url
                );
                const afterCount = window.locationsData.locations.length;
                console.log(`🗑️ Lieux supprimés : ${beforeCount - afterCount}`);
            }

            // Supprimer toutes les régions associées à cette carte
            if (window.regionsData && window.regionsData.regions) {
                const beforeCount = window.regionsData.regions.length;
                window.regionsData.regions = window.regionsData.regions.filter(reg =>
                    reg.mapId !== map.url
                );
                const afterCount = window.regionsData.regions.length;
                console.log(`🗑️ Régions supprimées : ${beforeCount - afterCount}`);
            }

            // Sauvegarder les modifications des lieux et régions
            if (window.dataManager) {
                window.dataManager.saveLocationsToLocal();
                window.dataManager.saveRegionsToLocal();
            }

            // Si on supprime la carte active, basculer sur la première carte restante
            if (map.url === this.activeMapUrl) {
                const newActiveIndex = index === 0 ? 1 : 0;
                this.activeMapUrl = this.availableMaps[newActiveIndex].url;
                this.activeMapName = this.availableMaps[newActiveIndex].name;

                // Mettre à jour l'image de la carte principale
                const mapImage = document.getElementById('map-image');
                if (mapImage) {
                    mapImage.src = this.activeMapUrl;
                }
            }

            // Supprimer la carte de la liste
            this.availableMaps.splice(index, 1);
            this.saveMapsData();
            this.renderMapsGrid();

            // Re-render les lieux et régions avec la nouvelle carte active
            if (typeof window.renderLocations === 'function') {
                window.renderLocations();
            }
            if (typeof window.renderRegions === 'function') {
                window.renderRegions();
            }

            // Rafraîchir le MapSwitcherManager
            if (window.mapSwitcherManager && typeof window.mapSwitcherManager.refresh === 'function') {
                window.mapSwitcherManager.refresh();
            }

            console.log(`✅ Carte "${map.name}" et ses éléments supprimés`);
        }
    }

    // === GESTION DES AVENTURIERS ===
    setupPartyListeners() {
        const editBtn = document.getElementById('edit-adventurers-btn');
        const generateWizardBtn = document.getElementById('generate-adventurers-wizard');
        const cancelEditBtn = document.getElementById('cancel-adventurers-edit');
        const saveEditBtn = document.getElementById('save-adventurers-edit');

        if (editBtn) {
            editBtn.addEventListener('click', () => this.enterAdventurersEditMode());
        }

        if (generateWizardBtn) {
            generateWizardBtn.addEventListener('click', () => this.generateAdventurersWizard());
        }

        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.exitAdventurersEditMode());
        }

        if (saveEditBtn) {
            saveEditBtn.addEventListener('click', () => this.saveAdventurersDescription());
        }
    }

    updatePartyContent() {
        const readContent = document.getElementById('adventurers-content');
        if (readContent) {
            if (this.partyDescription) {
                readContent.innerHTML = this.markdownToHtml(this.partyDescription);
            } else {
                readContent.innerHTML = '<p class="text-gray-400 italic">Aucune description d\'aventuriers définie.</p>';
            }
        }
    }

    enterAdventurersEditMode() {
        const readMode = document.getElementById('adventurers-read-mode');
        const editMode = document.getElementById('adventurers-edit-mode');
        const textarea = document.getElementById('adventurers-group');

        if (readMode) readMode.classList.add('hidden');
        if (editMode) editMode.classList.remove('hidden');
        if (textarea) {
            textarea.value = this.partyDescription;
            textarea.focus();
        }
    }

    exitAdventurersEditMode() {
        const readMode = document.getElementById('adventurers-read-mode');
        const editMode = document.getElementById('adventurers-edit-mode');

        if (readMode) readMode.classList.remove('hidden');
        if (editMode) editMode.classList.add('hidden');
    }

    saveAdventurersDescription() {
        const textarea = document.getElementById('adventurers-group');
        if (textarea) {
            this.partyDescription = textarea.value;
            this.saveDescriptions();
            this.updatePartyContent();
            this.exitAdventurersEditMode();
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


    showDuplicatesAnalysis() {
        const validMapIds = this.availableMaps.map(m => m.url);
        
        // Analyser les doublons de lieux par ID et par nom
        const duplicatesByIdLocs = new Map();
        const duplicatesByNameLocs = new Map();
        
        if (window.locationsData && window.locationsData.locations) {
            window.locationsData.locations.forEach((loc, index) => {
                // Doublons par ID
                if (!duplicatesByIdLocs.has(loc.id)) {
                    duplicatesByIdLocs.set(loc.id, []);
                }
                duplicatesByIdLocs.get(loc.id).push({...loc, arrayIndex: index});
                
                // Doublons par nom
                if (!duplicatesByNameLocs.has(loc.name)) {
                    duplicatesByNameLocs.set(loc.name, []);
                }
                duplicatesByNameLocs.get(loc.name).push({...loc, arrayIndex: index});
            });
        }
        
        // Analyser les doublons de régions par ID et par nom
        const duplicatesByIdRegs = new Map();
        const duplicatesByNameRegs = new Map();
        
        if (window.regionsData && window.regionsData.regions) {
            window.regionsData.regions.forEach((reg, index) => {
                // Doublons par ID
                if (!duplicatesByIdRegs.has(reg.id)) {
                    duplicatesByIdRegs.set(reg.id, []);
                }
                duplicatesByIdRegs.get(reg.id).push({...reg, arrayIndex: index});
                
                // Doublons par nom
                if (!duplicatesByNameRegs.has(reg.name)) {
                    duplicatesByNameRegs.set(reg.name, []);
                }
                duplicatesByNameRegs.get(reg.name).push({...reg, arrayIndex: index});
            });
        }
        
        // Filtrer pour ne garder que les doublons réels
        const locIdDuplicates = Array.from(duplicatesByIdLocs.entries()).filter(([id, items]) => items.length > 1);
        const locNameDuplicates = Array.from(duplicatesByNameLocs.entries()).filter(([name, items]) => items.length > 1);
        const regIdDuplicates = Array.from(duplicatesByIdRegs.entries()).filter(([id, items]) => items.length > 1);
        const regNameDuplicates = Array.from(duplicatesByNameRegs.entries()).filter(([name, items]) => items.length > 1);
        
        // Créer la modale d'analyse
        const modal = document.createElement('div');
        modal.id = 'duplicates-analysis-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]';

        let duplicatesHTML = '';
        
        // Doublons de lieux par ID
        if (locIdDuplicates.length > 0) {
            duplicatesHTML += `
                <div class="mb-6 p-4 bg-purple-900/20 border border-purple-600 rounded-lg">
                    <h4 class="text-purple-400 font-semibold mb-3">
                        <i class="fas fa-clone mr-2"></i>Lieux avec ID dupliqué (${locIdDuplicates.length} groupes)
                    </h4>
                    <div class="space-y-4">
                        ${locIdDuplicates.map(([id, items]) => {
                            return `
                                <div class="bg-gray-900/50 p-3 rounded border border-purple-500/30">
                                    <div class="text-sm font-semibold text-purple-300 mb-2">ID: ${id} (${items.length} occurrences)</div>
                                    <div class="space-y-2">
                                        ${items.map(loc => {
                                            const associatedChars = window.charactersData?.characters?.filter(c => 
                                                c.associatedLocations?.includes(String(loc.id))
                                            ) || [];
                                            
                                            return `
                                                <div class="bg-gray-800 p-2 rounded flex justify-between items-start">
                                                    <div class="flex-1">
                                                        <div class="text-white font-medium">${loc.name}</div>
                                                        <div class="text-xs text-gray-400 mt-1">
                                                            MapID: ${loc.mapId || 'N/A'}<br>
                                                            Coords: (${loc.coordinates?.x || 'N/A'}, ${loc.coordinates?.y || 'N/A'})<br>
                                                            ${associatedChars.length > 0 ? `Personnages: ${associatedChars.map(c => c.name).join(', ')}<br>` : ''}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        class="ml-2 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white"
                                                        onclick="window.settingsManager.deleteSingleLocation(${loc.arrayIndex})">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        // Doublons de lieux par nom
        if (locNameDuplicates.length > 0) {
            duplicatesHTML += `
                <div class="mb-6 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
                    <h4 class="text-blue-400 font-semibold mb-3">
                        <i class="fas fa-tag mr-2"></i>Lieux avec nom dupliqué (${locNameDuplicates.length} groupes)
                    </h4>
                    <div class="space-y-4">
                        ${locNameDuplicates.map(([name, items]) => {
                            return `
                                <div class="bg-gray-900/50 p-3 rounded border border-blue-500/30">
                                    <div class="text-sm font-semibold text-blue-300 mb-2">${name} (${items.length} occurrences)</div>
                                    <div class="space-y-2">
                                        ${items.map(loc => {
                                            const associatedChars = window.charactersData?.characters?.filter(c => 
                                                c.associatedLocations?.includes(String(loc.id))
                                            ) || [];
                                            
                                            return `
                                                <div class="bg-gray-800 p-2 rounded flex justify-between items-start">
                                                    <div class="flex-1">
                                                        <div class="text-white font-medium">ID: ${loc.id}</div>
                                                        <div class="text-xs text-gray-400 mt-1">
                                                            MapID: ${loc.mapId || 'N/A'}<br>
                                                            Coords: (${loc.coordinates?.x || 'N/A'}, ${loc.coordinates?.y || 'N/A'})<br>
                                                            ${associatedChars.length > 0 ? `Personnages: ${associatedChars.map(c => c.name).join(', ')}<br>` : ''}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        class="ml-2 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white"
                                                        onclick="window.settingsManager.deleteSingleLocation(${loc.arrayIndex})">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        // Doublons de régions par ID
        if (regIdDuplicates.length > 0) {
            duplicatesHTML += `
                <div class="mb-6 p-4 bg-purple-900/20 border border-purple-600 rounded-lg">
                    <h4 class="text-purple-400 font-semibold mb-3">
                        <i class="fas fa-clone mr-2"></i>Régions avec ID dupliqué (${regIdDuplicates.length} groupes)
                    </h4>
                    <div class="space-y-4">
                        ${regIdDuplicates.map(([id, items]) => {
                            return `
                                <div class="bg-gray-900/50 p-3 rounded border border-purple-500/30">
                                    <div class="text-sm font-semibold text-purple-300 mb-2">ID: ${id} (${items.length} occurrences)</div>
                                    <div class="space-y-2">
                                        ${items.map(reg => {
                                            return `
                                                <div class="bg-gray-800 p-2 rounded flex justify-between items-start">
                                                    <div class="flex-1">
                                                        <div class="text-white font-medium">${reg.name}</div>
                                                        <div class="text-xs text-gray-400 mt-1">
                                                            MapID: ${reg.mapId || 'N/A'}<br>
                                                            Points: ${reg.points?.length || 0}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        class="ml-2 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white"
                                                        onclick="window.settingsManager.deleteSingleRegion(${reg.arrayIndex})">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        // Doublons de régions par nom
        if (regNameDuplicates.length > 0) {
            duplicatesHTML += `
                <div class="mb-6 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
                    <h4 class="text-blue-400 font-semibold mb-3">
                        <i class="fas fa-tag mr-2"></i>Régions avec nom dupliqué (${regNameDuplicates.length} groupes)
                    </h4>
                    <div class="space-y-4">
                        ${regNameDuplicates.map(([name, items]) => {
                            return `
                                <div class="bg-gray-900/50 p-3 rounded border border-blue-500/30">
                                    <div class="text-sm font-semibold text-blue-300 mb-2">${name} (${items.length} occurrences)</div>
                                    <div class="space-y-2">
                                        ${items.map(reg => {
                                            return `
                                                <div class="bg-gray-800 p-2 rounded flex justify-between items-start">
                                                    <div class="flex-1">
                                                        <div class="text-white font-medium">ID: ${reg.id}</div>
                                                        <div class="text-xs text-gray-400 mt-1">
                                                            MapID: ${reg.mapId || 'N/A'}<br>
                                                            Points: ${reg.points?.length || 0}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        class="ml-2 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white"
                                                        onclick="window.settingsManager.deleteSingleRegion(${reg.arrayIndex})">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        if (!duplicatesHTML) {
            duplicatesHTML = `
                <div class="p-8 text-center text-gray-400">
                    <i class="fas fa-check-circle text-4xl text-green-500 mb-4"></i>
                    <p class="text-lg">Aucun doublon détecté</p>
                    <p class="text-sm mt-2">Tous les lieux et régions ont des IDs et noms uniques</p>
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6 w-[90vw] max-w-5xl mx-4 max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-white">
                        <i class="fas fa-search mr-2"></i>Analyse des Doublons
                    </h3>
                    <button onclick="this.closest('#duplicates-analysis-modal').remove()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times fa-lg"></i>
                    </button>
                </div>
                ${duplicatesHTML}
            </div>
        `;

        document.body.appendChild(modal);
    }
    
    deleteSingleLocation(arrayIndex) {
        if (!window.locationsData || !window.locationsData.locations[arrayIndex]) {
            console.error('❌ Lieu introuvable à l\'index:', arrayIndex);
            return;
        }
        
        const location = window.locationsData.locations[arrayIndex];
        const confirmMessage = `Voulez-vous vraiment supprimer le lieu suivant ?\n\nNom: ${location.name}\nID: ${location.id}\nMapID: ${location.mapId || 'N/A'}`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        console.log(`🗑️ Suppression du lieu: ${location.name} (index: ${arrayIndex})`);
        
        // Supprimer le lieu
        window.locationsData.locations.splice(arrayIndex, 1);
        
        // Sauvegarder
        if (window.dataManager) {
            window.dataManager.saveLocationsToLocal();
        }
        
        // Re-render la carte
        if (typeof window.renderLocations === 'function') {
            window.renderLocations();
        }
        
        // Marquer comme non sauvegardé
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }
        
        // Fermer et ré-ouvrir la modale d'analyse
        document.getElementById('duplicates-analysis-modal')?.remove();
        
        // Petit délai pour laisser le temps au DOM de se mettre à jour
        setTimeout(() => {
            this.showDuplicatesAnalysis();
        }, 100);
        
        console.log(`✅ Lieu supprimé avec succès`);
    }
    
    deleteSingleRegion(arrayIndex) {
        if (!window.regionsData || !window.regionsData.regions[arrayIndex]) {
            console.error('❌ Région introuvable à l\'index:', arrayIndex);
            return;
        }
        
        const region = window.regionsData.regions[arrayIndex];
        const confirmMessage = `Voulez-vous vraiment supprimer la région suivante ?\n\nNom: ${region.name}\nID: ${region.id}\nMapID: ${region.mapId || 'N/A'}`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        console.log(`🗑️ Suppression de la région: ${region.name} (index: ${arrayIndex})`);
        
        // Supprimer la région
        window.regionsData.regions.splice(arrayIndex, 1);
        
        // Sauvegarder
        if (window.dataManager) {
            window.dataManager.saveRegionsToLocal();
        }
        
        // Re-render la carte
        if (typeof window.renderRegions === 'function') {
            window.renderRegions();
        }
        
        // Marquer comme non sauvegardé
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }
        
        // Fermer et ré-ouvrir la modale d'analyse
        document.getElementById('duplicates-analysis-modal')?.remove();
        
        // Petit délai pour laisser le temps au DOM de se mettre à jour
        setTimeout(() => {
            this.showDuplicatesAnalysis();
        }, 100);
        
        console.log(`✅ Région supprimée avec succès`);
    }

    deleteOrphanElements() {
        if (!confirm('Voulez-vous vraiment supprimer tous les lieux et régions SANS mapID ?\n\nCette action est irréversible.')) {
            return;
        }

        let deletedLocations = 0;
        let deletedRegions = 0;

        // Supprimer les lieux sans mapID
        if (window.locationsData && window.locationsData.locations) {
            const beforeCount = window.locationsData.locations.length;
            window.locationsData.locations = window.locationsData.locations.filter(loc => {
                if (!loc.mapId) {
                    return false; // Supprimer
                }
                return true; // Garder
            });
            deletedLocations = beforeCount - window.locationsData.locations.length;
        }

        // Supprimer les régions sans mapID
        if (window.regionsData && window.regionsData.regions) {
            const beforeCount = window.regionsData.regions.length;
            window.regionsData.regions = window.regionsData.regions.filter(reg => {
                if (!reg.mapId) {
                    return false; // Supprimer
                }
                return true; // Garder
            });
            deletedRegions = beforeCount - window.regionsData.regions.length;
        }

        // Sauvegarder les modifications
        if (window.dataManager) {
            window.dataManager.saveLocationsToLocal();
            window.dataManager.saveRegionsToLocal();
        }

        // Re-render la grille pour mettre à jour l'affichage
        this.renderMapsGrid();

        // Re-render les lieux et régions sur la carte
        if (typeof window.renderLocations === 'function') {
            window.renderLocations();
        }
        if (typeof window.renderRegions === 'function') {
            window.renderRegions();
        }

        console.log(`✅ Éléments sans mapID supprimés: ${deletedLocations} lieux, ${deletedRegions} régions`);
        alert(`${deletedLocations} lieu${deletedLocations > 1 ? 'x' : ''} et ${deletedRegions} région${deletedRegions > 1 ? 's' : ''} sans mapID supprimé${deletedLocations + deletedRegions > 1 ? 's' : ''}.`);
    }

    deleteInvalidMapIdElements() {
        if (!confirm('Voulez-vous vraiment supprimer tous les lieux et régions avec un mapID invalide ?\n\nCes éléments ont un mapID qui ne correspond à aucune carte du profil.\n\nCette action est irréversible.')) {
            return;
        }

        const validMapIds = this.availableMaps.map(m => m.url);
        let deletedLocations = 0;
        let deletedRegions = 0;

        // Supprimer les lieux avec mapID invalide
        if (window.locationsData && window.locationsData.locations) {
            const beforeCount = window.locationsData.locations.length;
            window.locationsData.locations = window.locationsData.locations.filter(loc => {
                if (loc.mapId && !validMapIds.includes(loc.mapId)) {
                    return false; // Supprimer
                }
                return true; // Garder
            });
            deletedLocations = beforeCount - window.locationsData.locations.length;
        }

        // Supprimer les régions avec mapID invalide
        if (window.regionsData && window.regionsData.regions) {
            const beforeCount = window.regionsData.regions.length;
            window.regionsData.regions = window.regionsData.regions.filter(reg => {
                if (reg.mapId && !validMapIds.includes(reg.mapId)) {
                    return false; // Supprimer
                }
                return true; // Garder
            });
            deletedRegions = beforeCount - window.regionsData.regions.length;
        }

        // Sauvegarder les modifications
        if (window.dataManager) {
            window.dataManager.saveLocationsToLocal();
            window.dataManager.saveRegionsToLocal();
        }

        // Re-render la grille pour mettre à jour l'affichage
        this.renderMapsGrid();

        // Re-render les lieux et régions sur la carte
        if (typeof window.renderLocations === 'function') {
            window.renderLocations();
        }
        if (typeof window.renderRegions === 'function') {
            window.renderRegions();
        }

        console.log(`✅ Éléments avec mapID invalide supprimés: ${deletedLocations} lieux, ${deletedRegions} régions`);
        alert(`${deletedLocations} lieu${deletedLocations > 1 ? 'x' : ''} et ${deletedRegions} région${deletedRegions > 1 ? 's' : ''} avec mapID invalide supprimé${deletedLocations + deletedRegions > 1 ? 's' : ''}.`);
    }

    reassociateInvalidMapIdElements() {
        const validMapIds = this.availableMaps.map(m => m.url);

        // Count elements to be reassociated first
        const invalidLocs = window.locationsData?.locations?.filter(loc =>
            loc.mapId && !validMapIds.includes(loc.mapId)
        ) || [];

        const invalidRegs = window.regionsData?.regions?.filter(reg =>
            reg.mapId && !validMapIds.includes(reg.mapId)
        ) || [];

        if (invalidLocs.length === 0 && invalidRegs.length === 0) {
            alert("Aucun élément avec mapID invalide à réassocier.");
            return;
        }

        if (!confirm(`Voulez-vous réassocier ${invalidLocs.length} lieu(x) et ${invalidRegs.length} région(s) à la carte active "${this.activeMapName}" ?`)) {
            return;
        }

        let reassociatedLocations = 0;
        let reassociatedRegions = 0;

        // Reassociate locations
        if (window.locationsData && window.locationsData.locations) {
            window.locationsData.locations.forEach(loc => {
                if (loc.mapId && !validMapIds.includes(loc.mapId)) {
                    loc.mapId = this.activeMapUrl;
                    reassociatedLocations++;
                }
            });
        }

        // Reassociate regions
        if (window.regionsData && window.regionsData.regions) {
            window.regionsData.regions.forEach(reg => {
                if (reg.mapId && !validMapIds.includes(reg.mapId)) {
                    reg.mapId = this.activeMapUrl;
                    reassociatedRegions++;
                }
            });
        }

        // Sauvegarder les modifications
        if (window.dataManager) {
            window.dataManager.saveLocationsToLocal();
            window.dataManager.saveRegionsToLocal();
        }

        // Re-render la grille pour mettre à jour l'affichage
        this.renderMapsGrid();

        // Re-render les lieux et régions sur la carte
        if (typeof window.renderLocations === 'function') {
            window.renderLocations();
        }
        if (typeof window.renderRegions === 'function') {
            window.renderRegions();
        }

        console.log(`✅ Éléments réassociés: ${reassociatedLocations} lieux, ${reassociatedRegions} régions`);
        alert(`${reassociatedLocations} lieu(x) et ${reassociatedRegions} région(s) ont été réassociés à la carte active.`);
    }

    deleteDuplicateElements() {
        if (!confirm('Voulez-vous vraiment supprimer tous les doublons (éléments avec le même ID) ?\n\nSeule la première occurrence de chaque ID sera conservée.\n\nCette action est irréversible.')) {
            return;
        }

        let deletedLocations = 0;
        let deletedRegions = 0;

        // Supprimer les doublons de lieux
        if (window.locationsData && window.locationsData.locations) {
            const beforeCount = window.locationsData.locations.length;
            const seenIds = new Set();

            window.locationsData.locations = window.locationsData.locations.filter(loc => {
                if (seenIds.has(loc.id)) {
                    return false; // Doublon, supprimer
                }
                seenIds.add(loc.id);
                return true; // Première occurrence, garder
            });

            deletedLocations = beforeCount - window.locationsData.locations.length;
        }

        // Supprimer les doublons de régions
        if (window.regionsData && window.regionsData.regions) {
            const beforeCount = window.regionsData.regions.length;
            const seenIds = new Set();

            window.regionsData.regions = window.regionsData.regions.filter(reg => {
                if (seenIds.has(reg.id)) {
                    return false; // Doublon, supprimer
                }
                seenIds.add(reg.id);
                return true; // Première occurrence, garder
            });

            deletedRegions = beforeCount - window.regionsData.regions.length;
        }

        // Sauvegarder les modifications
        if (window.dataManager) {
            window.dataManager.saveLocationsToLocal();
            window.dataManager.saveRegionsToLocal();
        }

        // Re-render la grille pour mettre à jour l'affichage
        this.renderMapsGrid();

        // Re-render les lieux et régions sur la carte
        if (typeof window.renderLocations === 'function') {
            window.renderLocations();
        }
        if (typeof window.renderRegions === 'function') {
            window.renderRegions();
        }

        console.log(`✅ Doublons supprimés: ${deletedLocations} lieux, ${deletedRegions} régions`);
        alert(`${deletedLocations} lieu${deletedLocations > 1 ? 'x' : ''} et ${deletedRegions} région${deletedRegions > 1 ? 's' : ''} en doublon supprimé${deletedLocations + deletedRegions > 1 ? 's' : ''}.`);
    }


    generatePartyDescription() {
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
            const description = this.geminiManager.generateContent(prompt, generateBtn, 'party');
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
        const editBtn = document.getElementById('edit-quest-btn');
        const cancelEditBtn = document.getElementById('cancel-quest-edit');
        const saveEditBtn = document.getElementById('save-quest-edit');

        if (editBtn) {
            editBtn.addEventListener('click', () => this.enterQuestEditMode());
        }

        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.exitQuestEditMode());
        }

        if (saveEditBtn) {
            saveEditBtn.addEventListener('click', () => this.saveQuestDescription());
        }
    }

    // This setupQuestListeners is duplicated. The first one is used above.
    // This second one is removed to avoid conflicts.

    updateQuestContent() {
        const readContent = document.getElementById('quest-content');
        if (readContent) {
            if (this.questDescription) {
                readContent.innerHTML = this.markdownToHtml(this.questDescription);
            } else {
                readContent.innerHTML = '<p class="text-gray-400 italic">Aucune description de quête définie.</p>';
            }
        }
    }

    enterQuestEditMode() {
        const readMode = document.getElementById('quest-read-mode');
        const editMode = document.getElementById('quest-edit-mode');
        const textarea = document.getElementById('adventurers-quest');

        if (readMode) readMode.classList.add('hidden');
        if (editMode) editMode.classList.remove('hidden');
        if (textarea) {
            textarea.value = this.questDescription;
            textarea.focus();
        }
    }

    exitQuestEditMode() {
        const readMode = document.getElementById('quest-read-mode');
        const editMode = document.getElementById('quest-edit-mode');

        if (readMode) readMode.classList.remove('hidden');
        if (editMode) editMode.classList.add('hidden');
    }

    saveQuestDescription() {
        const textarea = document.getElementById('adventurers-quest');
        if (textarea) {
            this.questDescription = textarea.value;
            this.saveDescriptions();
            this.updateQuestContent();
            this.exitQuestEditMode();
        }
    }

    markdownToHtml(markdown) {
        if (window.marked) {
            return window.marked.parse(markdown);
        }
        // Fallback simple si marked.js n'est pas disponible
        return markdown.replace(/\n/g, '<br>');
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

    // === GESTION DES TABLES ALÉATOIRES ===
    renderSettingsRandomTablesTab() {
        console.log('🎲 Rendering Settings Random Tables Tab...');
        const tabContent = document.getElementById('settings-random-tables-content');
        if (!tabContent) {
            console.error('❌ settings-random-tables-content not found');
            console.log('📋 Available elements:', {
                randomTablesTab: !!document.getElementById('randomTables-tab'),
                randomTablesContent: !!document.getElementById('settings-random-tables-content')
            });
            return;
        }

        // Assurer que le conteneur a un overflow et une hauteur maximale
        tabContent.style.maxHeight = '70vh';
        tabContent.style.overflowY = 'auto';

        // Utiliser les données d'AdventureManager
        if (!window.adventureManager) {
            tabContent.innerHTML = '<p class="text-gray-400 italic">AdventureManager non disponible.</p>';
            return;
        }

        const tables = window.adventureManager.adventureData.randomTables || [];
        const compositeTables = window.adventureManager.adventureData.compositeTables || [];

        // LOGS DE DEBUG DÉTAILLÉS
        console.log('📊 [DEBUG] Nombre de tables simples:', tables.length);
        console.log('📊 [DEBUG] Nombre de tables composites:', compositeTables.length);

        // Afficher le contenu de chaque table simple
        tables.forEach((table, index) => {
            console.log('📋 [DEBUG] Table simple', index, ':', {
                name: table.name,
                entriesCount: table.entries?.length || 0,
                entries: table.entries
            });
        });

        // Afficher le contenu de chaque table composite
        compositeTables.forEach((composite, index) => {
            console.log('🔗 [DEBUG] Table composite', index, ':', {
                name: composite.name,
                tableIndices: composite.tableIndices,
                tableIndicesCount: composite.tableIndices?.length || 0
            });
        });

        // Vérifier les conteneurs de résultats dans le DOM
        console.log('🔍 [DEBUG] Vérification des conteneurs de résultats...');
        tables.forEach((table, index) => {
            const resultContainer = document.getElementById(`settings-table-result-${index}`);
            const resultContent = document.getElementById(`settings-table-result-content-${index}`);
            console.log('📦 [DEBUG] Conteneur table', index, ':', {
                resultContainer: !!resultContainer,
                resultContent: !!resultContent
            });
        });

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
                <input type="file" id="settings-upload-random-table" accept=".json" class="hidden">
                <button onclick="document.getElementById('settings-upload-random-table').click()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                    <i class="fas fa-upload mr-2"></i>Importer une table JSON
                </button>
                ${tables.length >= 2 ? `
                    <button onclick="window.settingsManager.openSettingsCompositeTableModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">
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
            let compositeTablesHTML = '';
            if (sortedCompositeTables && sortedCompositeTables.length > 0) {
                compositeTablesHTML = sortedCompositeTables.map((composite, index) => {
                    const originalIndex = compositeTables.indexOf(composite); // Utiliser l'index original
                    const tableIndices = composite.tableIndices || [];
                    const tableNames = tableIndices.map(idx => {
                        const table = tables[idx] || compositeTables[idx]; // Chercher dans les tables simples d'abord, puis composites
                        return table ? table.name : `Table Inconnue (${idx})`;
                    }).join(', ');
                    return `
                        <div class="bg-gray-800 rounded p-2 border-2 border-blue-500">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center space-x-2">
                                    <span class="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-semibold">Composite</span>
                                    <h4 class="text-base font-semibold text-white">${composite.name || 'Table sans nom'}</h4>
                                </div>
                                <div class="flex space-x-2">
                                    <button onclick="window.settingsManager.rollOnSettingsCompositeTable(${originalIndex})" class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs">
                                        <i class="fas fa-dice mr-1"></i>Tirer
                                    </button>
                                    <button onclick="window.settingsManager.deleteSettingsCompositeTable(${originalIndex})" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <!-- Conteneur pour le résultat du tirage composite -->
                            <div id="settings-composite-result-${originalIndex}" class="hidden mt-3 p-3 bg-gray-800 rounded border border-purple-500" style="max-height: 16rem; overflow-y: auto;">
                                <div class="text-sm font-semibold text-purple-300 mb-2">Résultat du tirage composite :</div>
                                <div id="settings-composite-result-content-${originalIndex}"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // Afficher les tables simples
            let simpleTablesHTML = '';
            if (sortedTables && sortedTables.length > 0) {
                simpleTablesHTML = sortedTables.map((table, index) => {
                    const originalIndex = tables.indexOf(table); // Utiliser l'index original
                    return `
                        <div class="bg-gray-800 rounded p-2 border border-gray-700">
                            <div class="flex justify-between items-center mb-2">
                                <h5 class="font-semibold text-white">${table.name || 'Table sans nom'}</h5>
                                <div class="flex space-x-2">
                                    <button onclick="window.settingsManager.rollOnSettingsTable(${originalIndex})" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                                        <i class="fas fa-dice mr-1"></i>Tirer
                                    </button>
                                    <button onclick="window.settingsManager.exportTable(${originalIndex})" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm" title="Exporter cette table">
                                        <i class="fas fa-download"></i>
                                    </button>
                                    <button onclick="window.settingsManager.deleteTable(${originalIndex})" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm" title="Supprimer cette table">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <p class="text-sm text-gray-400">${table.entries?.length || 0} entrée(s)</p>

                            <!-- Conteneur pour le résultat du tirage -->
                            <div id="table-result-${originalIndex}" class="hidden mt-3 p-3 bg-gray-900 rounded border border-blue-500" style="max-height: 16rem; overflow-y: auto;">
                                <div class="text-sm font-semibold text-blue-300 mb-2">Résultat du tirage :</div>
                                <div id="table-result-content-${originalIndex}"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            html += compositeTablesHTML + simpleTablesHTML;
            html += '</div>';
        }

        tabContent.innerHTML = html;

        // Setup du gestionnaire d'upload
        const uploadInput = document.getElementById('settings-upload-random-table');
        if (uploadInput) {
            uploadInput.onchange = (e) => this.handleSettingsRandomTableUpload(e);
        }
    }

    async handleSettingsRandomTableUpload(event) {
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

            if (!window.adventureManager.adventureData.randomTables) {
                window.adventureManager.adventureData.randomTables = [];
            }
            window.adventureManager.adventureData.randomTables.push(newTable);
            window.adventureManager.saveToLocalStorage();
            this.renderSettingsRandomTablesTab();

            event.target.value = '';
        } catch (error) {
            console.error('Erreur lors de l\'import de la table:', error);
            alert('Erreur lors de l\'import du fichier JSON. Vérifiez le format.');
        }
    }

    deleteTable(tableIndex) {
        console.log(`🗑️ [deleteTable] Suppression de la table index: ${tableIndex}`);

        if (!window.adventureManager || !window.adventureManager.adventureData.randomTables) {
            console.error('❌ [deleteTable] AdventureManager ou randomTables non disponible');
            return;
        }

        const tables = window.adventureManager.adventureData.randomTables;

        if (tableIndex < 0 || tableIndex >= tables.length) {
            console.error('❌ [deleteTable] Index invalide:', tableIndex);
            return;
        }

        const tableName = tables[tableIndex].name || 'Table sans nom';

        if (!confirm(`Voulez-vous vraiment supprimer la table "${tableName}" ?\n\nCette action est irréversible.`)) {
            console.log('🚫 [deleteTable] Suppression annulée par l\'utilisateur');
            return;
        }

        // Supprimer la table
        tables.splice(tableIndex, 1);
        console.log(`✅ [deleteTable] Table "${tableName}" supprimée`);

        // Sauvegarder dans localStorage
        window.adventureManager.saveToLocalStorage();

        // Marquer comme non sauvegardé pour sync cloud
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }

        // Re-render l'onglet
        this.renderSettingsRandomTablesTab();

        console.log(`🔄 [deleteTable] Interface mise à jour`);
    }

    rollOnSettingsTable(tableIndex) {
        console.log(`🎲 [DEBUG] rollOnSettingsTable appelé avec index: ${tableIndex}`);

        if (!window.adventureManager || !window.adventureManager.adventureData.randomTables) {
            console.error('❌ [rollOnSettingsTable] AdventureManager ou randomTables non disponible');
            return;
        }

        const tables = window.adventureManager.adventureData.randomTables;

        if (tableIndex < 0 || tableIndex >= tables.length) {
            console.error('❌ [rollOnSettingsTable] Index invalide:', tableIndex);
            return;
        }

        const table = tables[tableIndex];

        if (!table.entries || table.entries.length === 0) {
            console.error('❌ [rollOnSettingsTable] Table invalide ou vide');
            return;
        }

        // Tirer un résultat aléatoire
        const randomIndex = Math.floor(Math.random() * table.entries.length);
        const result = table.entries[randomIndex];

        // Formater le résultat pour l'affichage
        let formattedResult = '';
        if (typeof result === 'object' && result !== null) {
            // Si c'est un objet avec des propriétés
            const entries = Object.entries(result);

            // Trouver le "Dé du destin" s'il existe
            const fateEntry = entries.find(([key]) => key.toLowerCase().includes('destin') || key.toLowerCase().includes('fate'));
            const otherEntries = entries.filter(([key]) => !key.toLowerCase().includes('destin') && !key.toLowerCase().includes('fate'));

            if (otherEntries.length > 0) {
                const [mainKey, mainValue] = otherEntries[0];

                // Afficher la valeur principale avec le dé du destin entre parenthèses si présent
                if (fateEntry) {
                    formattedResult = `<span style="color: #1f2937; font-weight: 600;">(${fateEntry[1]}) ${mainValue}</span>`;
                } else {
                    formattedResult = `<span style="color: #1f2937; font-weight: 600;">${mainValue}</span>`;
                }

                // Ajouter les autres propriétés s'il y en a sur la même ligne
                for (let i = 1; i < otherEntries.length; i++) {
                    const [key, value] = otherEntries[i];
                    formattedResult += ` <span style="color: #1f2937;"><span style="font-weight: 500;">${key}:</span> ${value}</span>`;
                }
            } else if (fateEntry) {
                formattedResult = `<span style="color: #1f2937; font-weight: 600;">${fateEntry[1]}</span>`;
            }
        } else {
            // Si c'est une chaîne simple
            formattedResult = `<span style="color: #1f2937; font-weight: 600;">${result}</span>`;
        }

        // Afficher le résultat dans la modale
        const modal = document.getElementById('random-roll-result-modal');
        const content = document.getElementById('random-roll-result-content');

        if (modal && content) {
            content.innerHTML = `
                <div>
                    <div style="color: #940000; font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem;">${table.name || 'Table aléatoire'}</div>
                    <div>${formattedResult}</div>
                </div>
            `;

            modal.classList.remove('hidden');

            // Stocker le résultat pour insertion dans le journal
            this.currentRandomResult = {
                tableName: table.name || 'Table aléatoire',
                result: formattedResult
            };
        }

        console.log(`🎲 Tirage sur "${table.name}":`, result);
    }

    deleteSettingsRandomTable(index) {
        if (!window.adventureManager) return;
        if (confirm('Voulez-vous vraiment supprimer cette table aléatoire ?')) {
            window.adventureManager.adventureData.randomTables.splice(index, 1);
            window.adventureManager.saveToLocalStorage();
            this.renderSettingsRandomTablesTab();
        }
    }

    rollOnSettingsCompositeTable(compositeIndex) {
        console.log(`🔗 [DEBUG] rollOnSettingsCompositeTable appelé avec index: ${compositeIndex}`);

        const composite = window.adventureManager.adventureData.compositeTables[compositeIndex];
        console.log(`📋 [DEBUG] Table composite récupérée:`, composite);

        if (!composite || !composite.tableIndices || composite.tableIndices.length === 0) {
            console.error('❌ Table composite invalide');
            return;
        }

        let compositeResults = [];

        // Tirer sur chaque table de la composition
        composite.tableIndices.forEach((tableIndex, idx) => {
            console.log(`🎲 [DEBUG] Tirage ${idx + 1}/${composite.tableIndices.length} sur table index ${tableIndex}`);

            const table = window.adventureManager.adventureData.randomTables[tableIndex];

            if (!table || !table.entries || table.entries.length === 0) {
                console.warn(`⚠️ Table ${tableIndex} invalide ou vide, ignorée`);
                return;
            }

            const randomIndex = Math.floor(Math.random() * table.entries.length);
            const result = table.entries[randomIndex];

            console.log(`🎲 [DEBUG] Résultat du tirage ${idx + 1}:`, result);

            compositeResults.push({
                tableName: table.name,
                result: result
            });
        });

        console.log(`✅ [DEBUG] Résultats composites:`, compositeResults);

        // Formater les résultats pour l'affichage (sans espace entre les blocs)
        let formattedResults = '';
        compositeResults.forEach((item, idx) => {
            // Formater chaque résultat de la même manière que les tables simples
            let itemFormattedResult = '';
            if (typeof item.result === 'object' && item.result !== null) {
                const entries = Object.entries(item.result);

                // Trouver le "Dé du destin" s'il existe
                const fateEntry = entries.find(([key]) => key.toLowerCase().includes('destin') || key.toLowerCase().includes('fate'));
                const otherEntries = entries.filter(([key]) => !key.toLowerCase().includes('destin') && !key.toLowerCase().includes('fate'));

                if (otherEntries.length > 0) {
                    const [mainKey, mainValue] = otherEntries[0];

                    // Afficher la valeur principale avec le dé du destin entre parenthèses si présent
                    if (fateEntry) {
                        itemFormattedResult = `<span style="font-weight: 600;">(${fateEntry[1]}) ${mainValue}</span>`;
                    } else {
                        itemFormattedResult = `<span style="font-weight: 600;">${mainValue}</span>`;
                    }

                    // Ajouter les autres propriétés s'il y en a sur la même ligne
                    for (let i = 1; i < otherEntries.length; i++) {
                        const [key, value] = otherEntries[i];
                        itemFormattedResult += ` <span style="font-weight: 500;">${key}:</span> ${value}`;
                    }
                } else if (fateEntry) {
                    itemFormattedResult = `<span style="font-weight: 600;">${fateEntry[1]}</span>`;
                }
            } else {
                // Si c'est une chaîne simple
                itemFormattedResult = `<span style="font-weight: 600;">${item.result}</span>`;
            }

            const isLast = idx === compositeResults.length - 1;
            formattedResults += `<div class="p-3 bg-gray-100 rounded border border-gray-300" style="margin-bottom: ${isLast ? '0' : '0.5rem'};"><div class="text-sm font-semibold mb-2" style="color: #940000;">${item.tableName}</div><div style="color: #1f2937;">${itemFormattedResult}</div></div>`;
        });

        // Afficher dans la nouvelle modale
        this.showRandomRollResultModal(composite.name, formattedResults);

        console.log(`🔗 Tirage composite sur "${composite.name}":`, compositeResults);
    }

    deleteSettingsCompositeTable(index) {
        if (!window.adventureManager) return;
        if (confirm('Voulez-vous vraiment supprimer cette table composite ?')) {
            window.adventureManager.adventureData.compositeTables.splice(index, 1);
            window.adventureManager.saveToLocalStorage();
            this.renderSettingsRandomTablesTab();
        }
    }

    openSettingsCompositeTableModal() {
        if (!window.adventureManager || !window.adventureManager.adventureData.randomTables) {
            alert('Aucune table simple disponible pour créer une table composite.');
            return;
        }

        const tables = window.adventureManager.adventureData.randomTables;

        // Créer la modale
        const modal = document.createElement('div');
        modal.id = 'composite-table-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]';

        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6 w-[90vw] max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-white">Créer une table composite</h3>
                    <button id="close-composite-modal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Nom de la table composite</label>
                        <input type="text" id="composite-name-input" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="Ex: Rencontres complètes">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Sélectionnez les tables à combiner</label>
                        <div id="tables-checklist" class="space-y-2 max-h-64 overflow-y-auto">
                            ${tables.map((table, index) => `
                                <label class="flex items-center p-2 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer">
                                    <input type="checkbox" class="composite-table-checkbox mr-3" data-index="${index}">
                                    <span class="text-white">${table.name || 'Table sans nom'}</span>
                                    <span class="text-gray-400 text-sm ml-auto">(${table.entries?.length || 0} entrées)</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="flex justify-end space-x-3 mt-6">
                    <button id="cancel-composite" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg">Annuler</button>
                    <button id="create-composite" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white">Créer</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Gestionnaires d'événements
        document.getElementById('close-composite-modal').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('cancel-composite').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('create-composite').addEventListener('click', () => {
            const nameInput = document.getElementById('composite-name-input');
            const checkboxes = document.querySelectorAll('.composite-table-checkbox:checked');

            if (!nameInput.value.trim()) {
                alert('Veuillez donner un nom à la table composite.');
                return;
            }

            if (checkboxes.length === 0) {
                alert('Veuillez sélectionner au moins une table.');
                return;
            }

            const tableIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));

            const newComposite = {
                name: nameInput.value.trim(),
                tableIndices: tableIndices
            };

            if (!window.adventureManager.adventureData.compositeTables) {
                window.adventureManager.adventureData.compositeTables = [];
            }

            window.adventureManager.adventureData.compositeTables.push(newComposite);
            window.adventureManager.saveToLocalStorage();

            modal.remove();
            this.renderSettingsRandomTablesTab();
        });
    }

    // === GESTION PRINCIPALE ===
    openSettings() {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.classList.remove('hidden');
            this.isSettingsOpen = true;
            // Afficher l'onglet actuel
            this.switchTab(this.currentTab);
        }
    }

    closeSettings() {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.classList.add('hidden');
            this.isSettingsOpen = false;
        }
    }

    showRandomRollResult(tableName, result) {
        const modal = document.getElementById('random-roll-result-modal');
        const content = document.getElementById('random-roll-result-content');
        const insertButtonContainer = document.getElementById('insert-random-result-button-container'); // Nouveau conteneur

        if (!modal || !content || !insertButtonContainer) {
            console.error('Modal, contenu, ou conteneur de bouton introuvable.');
            return;
        }

        // Stocker le résultat pour l'insertion dans le journal
        this.currentRandomResult = {
            tableName: tableName,
            result: result
        };

        // Afficher le nom de la table et le résultat
        content.innerHTML = `
            <h4 class="text-lg font-semibold mb-3" style="color: #940000;">
                <i class="fas fa-dice mr-2"></i>${tableName}
            </h4>
            <div class="text-gray-200">${this.markdownToHtml(result)}</div>
        `;

        // Afficher le bouton "Insérer dans le Journal"
        insertButtonContainer.innerHTML = `
            <button id="insert-random-result-to-journal" class="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors">
                <i class="fas fa-journal-whills mr-2"></i>Insérer dans le Journal
            </button>
        `;

        // Réattacher l'écouteur d'événement au nouveau bouton
        document.getElementById('insert-random-result-to-journal').addEventListener('click', () => this.insertRandomResultToJournal());

        modal.classList.remove('hidden');
    }

    showRandomRollResultModal(eventName, eventText) {
        console.log(`🎲 [DEBUG] showRandomRollResultModal appelé:`, {
            eventName,
            eventText: eventText ? eventText.substring(0, 50) + '...' : null
        });

        const modal = document.getElementById('random-roll-result-modal');
        const content = document.getElementById('random-roll-result-content');
        const insertButton = document.getElementById('insert-random-result-to-journal');

        console.log(`📦 [DEBUG] Éléments DOM trouvés:`, {
            modal: !!modal,
            content: !!content,
            insertButton: !!insertButton
        });

        if (!modal || !content) {
            console.error('Modal ou contenu introuvable.');
            return;
        }

        // Stocker le résultat actuel
        this.currentRandomResult = {
            title: eventName,
            text: eventText
        };

        // Remplir le contenu
        content.innerHTML = `
            <h3 class="text-xl font-bold mb-4" style="color: #940000;">${eventName}</h3>
            <div class="prose prose-sm max-w-none">
                ${this.markdownToHtml(eventText)}
            </div>
        `;

        // Afficher la modale
        modal.classList.remove('hidden');
        console.log(`✅ [DEBUG] Modale affichée`);
    }

    closeRandomRollResult() {
        const modal = document.getElementById('random-roll-result-modal');
        const insertButtonContainer = document.getElementById('insert-random-result-button-container'); // Conteneur du bouton
        if (modal) {
            modal.classList.add('hidden');
        }
        if (insertButtonContainer) {
            insertButtonContainer.innerHTML = ''; // Vider le conteneur du bouton
        }
        this.currentRandomResult = null; // Réinitialiser le résultat stocké
    }

    insertRandomResultToJournal() {
        if (!this.currentRandomResult) {
            console.log('⚠️ Aucun résultat de tirage à insérer');
            return;
        }

        // Obtenir la date calendrier actuelle depuis CalendarManager
        let currentDate = '1 Hithui'; // Valeur par défaut
        if (window.calendarManager && window.calendarManager.currentCalendarDate) {
            // currentCalendarDate est un objet {month: "Hithui", day: 5}
            const calDate = window.calendarManager.currentCalendarDate;
            currentDate = `${calDate.day} ${calDate.month}`;
            console.log('📅 Date calendrier récupérée pour tirage aléatoire:', currentDate);
        } else {
            console.warn('⚠️ CalendarManager non disponible, utilisation de la date par défaut');
        }

        // Créer une nouvelle entrée de journal pour le tirage aléatoire
        const newEntry = {
            title: this.currentRandomResult.tableName,
            totalDays: 1,
            generatedAt: new Date().toISOString(),
            journeyType: 'random', // Identifier comme tirage aléatoire
            days: [{
                dayNumber: 1,
                calendarDate: currentDate,
                weatherSymbol: null,
                discoveries: [],
                description: this.currentRandomResult.result, // Utiliser le résultat formaté comme description
                eventResult: null,
                startCoordinates: null
            }]
        };

        // Ajouter au journal
        if (window.journalManager) {
            window.journalManager.loadJournal();
            window.journalManager.journal.push(newEntry); // Ajouter à la fin
            localStorage.setItem('travelJournal', JSON.stringify(window.journalManager.journal));

            // Marquer comme non sauvegardé
            if (typeof window.markAsUnsaved === 'function') {
                window.markAsUnsaved();
            }

            // Synchroniser avec le cloud si authentifié
            if (typeof window.scheduleAutoSync === 'function') {
                window.scheduleAutoSync();
            }

            console.log('✅ Résultat de tirage inséré dans le journal');

            // Afficher une notification
            alert('Le résultat a été inséré dans le journal');
        }

        // Fermer la modale de résultat
        this.closeRandomRollResult();
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
        return {
            activeMap: this.activeMapUrl,
            activeMapName: this.activeMapName
        };
    }

    getAvailableMaps() {
        return this.availableMaps;
    }

    // Méthode pour récupérer tous les paramètres (pour la synchronisation)
    getAllSettings() {
        return {
            availableMaps: this.availableMaps,
            activeMapUrl: this.activeMapUrl,
            activeMapName: this.activeMapName,
            partyDescription: this.partyDescription,
            questDescription: this.questDescription,
            narrationStyle: this.narrationStyle
        };
    }

    // Méthode pour charger les paramètres depuis les données de contexte
    loadSettings(settings) {
        if (!settings) {
            console.log('⚠️ Aucun paramètre à charger');
            return;
        }

        console.log('⚙️ Chargement des paramètres depuis le contexte:', settings);

        // Charger les cartes
        if (settings.availableMaps && Array.isArray(settings.availableMaps)) {
            // Migrer les anciennes cartes sans dimensions/échelle/vitesse
            this.availableMaps = settings.availableMaps.map(map => ({
                ...map,
                width: map.width || 5103,
                height: map.height || 3296,
                scale: map.scale || 600,
                milesPerDay: map.milesPerDay || 20
            }));
            console.log('✅ Cartes chargées:', this.availableMaps.length);
        }
        if (settings.activeMapUrl) {
            this.activeMapUrl = settings.activeMapUrl;
            console.log('✅ Carte active URL:', this.activeMapUrl);
        }
        if (settings.activeMapName) {
            this.activeMapName = settings.activeMapName;
            console.log('✅ Carte active nom:', this.activeMapName);
        }

        // Charger les descriptions
        if (settings.partyDescription !== undefined) {
            this.partyDescription = settings.partyDescription;
            console.log('✅ Description aventuriers chargée');
        }
        if (settings.questDescription !== undefined) {
            this.questDescription = settings.questDescription;
            console.log('✅ Description quête chargée');
        }
        if (settings.narrationStyle) {
            this.narrationStyle = settings.narrationStyle;
            console.log('✅ Style de narration chargé:', this.narrationStyle);
        }

        // Sauvegarder dans localStorage
        this.saveMapsData();
        this.saveDescriptions();

        // Mettre à jour l'image de la carte principale
        const mapImage = document.getElementById('map-image');
        if (mapImage && this.activeMapUrl) {
            console.log('🗺️ Mise à jour de l\'image de la carte:', this.activeMapUrl);

            // Trouver la carte active pour récupérer son échelle
            const activeMap = this.availableMaps.find(m => m.url === this.activeMapUrl);
            const mapScale = activeMap?.scale || 600;
            console.log(`🗺️ Échelle de la carte active: ${mapScale} miles`);

            // Callback pour re-render après chargement
            const onImageLoaded = () => {
                console.log('✅ Image de carte chargée, re-initialisation de la carte');

                // IMPORTANT: Appliquer l'échelle AVANT l'initialisation de la carte
                if (window.pathManager) {
                    window.pathManager.mapConstants.MAP_DISTANCE_MILES = mapScale;
                    console.log(`🗺️ Échelle appliquée au PathManager: ${mapScale} miles`);
                }

                // IMPORTANT: Reset complet des dimensions globales
                window.MAP_WIDTH = 0;
                window.MAP_HEIGHT = 0;
                console.log('🗺️ Reset MAP_WIDTH et MAP_HEIGHT à 0 avant réinitialisation');

                // Toujours réinitialiser la carte lors du changement d'image
                if (typeof window.initializeMap === 'function') {
                    console.log('🗺️ Réinitialisation de la carte depuis loadSettings');
                    window.initializeMap();
                } else {
                    // Si initializeMap n'existe pas encore, juste re-render
                    if (typeof window.renderLocations === 'function') {
                        window.renderLocations();
                        console.log('✅ Lieux rendus après loadSettings');
                    }
                    if (typeof window.renderRegions === 'function') {
                        window.renderRegions();
                        console.log('✅ Régions rendues après loadSettings');
                    }
                }
            };

            // Si l'image est déjà complètement chargée avec cette URL, déclencher manuellement
            if (mapImage.complete && mapImage.naturalWidth > 0 && mapImage.src.endsWith(this.activeMapUrl)) {
                console.log('⚡ Image déjà chargée, callback immédiat');
                onImageLoaded();
            } else {
                // Forcer le rechargement
                mapImage.onload = onImageLoaded; // Assigner le callback avant de changer src
                mapImage.src = this.activeMapUrl;
            }
        }

        // Mettre à jour l'affichage si la modale des paramètres est ouverte
        if (this.isSettingsOpen) {
            this.renderMapsGrid();
            this.updatePartyContent();
            this.updateQuestContent();
            this.updateNarrationStyleDisplay();
        }

        console.log('✅ Paramètres chargés avec succès');
    }

    exportMapData(mapIndex) {
        const map = this.availableMaps[mapIndex];
        if (!map) return;

        console.log(`📤 Export des données pour la carte: ${map.name}`);

        // Utiliser la méthode d'export de importExportManager
        if (window.importExportManager) {
            window.importExportManager.exportUnifiedData();
        } else {
            alert('Gestionnaire d\'import/export non disponible');
        }
    }

    importMapData(mapIndex) {
        const map = this.availableMaps[mapIndex];
        if (!map) return;

        console.log(`📥 Import des données pour la carte: ${map.name}`);

        // Déclencher l'import via importExportManager
        if (window.importExportManager && window.importExportManager.importFileInput) {
            window.importExportManager.importFileInput.click();
        } else {
            alert('Gestionnaire d\'import/export non disponible');
        }
    }

    calculateOrphanStats() {
        // Récupérer toutes les URLs de cartes existantes
        const validMapIds = this.availableMaps.map(m => m.url);

        let orphanLocations = 0;
        let orphanRegions = 0;

        // Compter les lieux orphelins
        if (window.locationsData && window.locationsData.locations) {
            orphanLocations = window.locationsData.locations.filter(loc => {
                // Un lieu est orphelin si :
                // - Il n'a pas de mapId
                // - Son mapId ne correspond à aucune carte existante
                return !loc.mapId || !validMapIds.includes(loc.mapId);
            }).length;
        }

        // Compter les régions orphelines
        if (window.regionsData && window.regionsData.regions) {
            orphanRegions = window.regionsData.regions.filter(reg => {
                return !reg.mapId || !validMapIds.includes(reg.mapId);
            }).length;
        }

        return {
            orphanLocations,
            orphanRegions,
            totalOrphans: orphanLocations + orphanRegions
        };
    }

    deleteOrphanElements() {
        const orphanStats = this.calculateOrphanStats();

        if (orphanStats.totalOrphans === 0) {
            alert('Aucun élément orphelin à supprimer.');
            return;
        }

        const confirmMessage = `Voulez-vous vraiment supprimer les éléments orphelins ?\n\n` +
            `⚠️ ATTENTION : Cette action supprimera définitivement :\n` +
            `- ${orphanStats.orphanLocations} lieu${orphanStats.orphanLocations > 1 ? 'x' : ''}\n` +
            `- ${orphanStats.orphanRegions} région${orphanStats.orphanRegions > 1 ? 's' : ''}\n\n` +
            `Ces éléments ne sont associés à aucune carte existante.`;

        if (!confirm(confirmMessage)) {
            console.log('🚫 Suppression des orphelins annulée par l\'utilisateur');
            return;
        }

        console.log(`🗑️ Suppression des éléments orphelins...`);

        // Récupérer toutes les URLs de cartes valides
        const validMapIds = this.availableMaps.map(m => m.url);

        // Supprimer les lieux orphelins
        if (window.locationsData && window.locationsData.locations) {
            const beforeCount = window.locationsData.locations.length;
            window.locationsData.locations = window.locationsData.locations.filter(loc => {
                return loc.mapId && validMapIds.includes(loc.mapId);
            });
            const deletedLocations = beforeCount - window.locationsData.locations.length;
            console.log(`🗑️ Lieux orphelins supprimés : ${deletedLocations}`);
        }

        // Supprimer les régions orphelines
        if (window.regionsData && window.regionsData.regions) {
            const beforeCount = window.regionsData.regions.length;
            window.regionsData.regions = window.regionsData.regions.filter(reg => {
                return reg.mapId && validMapIds.includes(reg.mapId);
            });
            const deletedRegions = beforeCount - window.regionsData.regions.length;
            console.log(`🗑️ Régions orphelines supprimées : ${deletedRegions}`);
        }

        // Sauvegarder les modifications
        if (window.dataManager) {
            window.dataManager.saveLocationsToLocal();
            window.dataManager.saveRegionsToLocal();
        }

        // Re-render les lieux et régions
        if (typeof window.renderLocations === 'function') {
            window.renderLocations();
        }
        if (typeof window.renderRegions === 'function') {
            window.renderRegions();
        }

        // Rafraîchir l'affichage de la grille
        this.renderMapsGrid();

        console.log(`✅ Éléments orphelins supprimés avec succès`);
        alert(`Éléments orphelins supprimés :\n- ${orphanStats.orphanLocations} lieu${orphanStats.orphanLocations > 1 ? 'x' : ''}\n- ${orphanStats.orphanRegions} région${orphanStats.orphanRegions > 1 ? 's' : ''}`);
    }

    deleteAllLocationsAndRegions() {
        const activeMapUrl = this.activeMapUrl;
        const activeMapName = this.activeMapName || 'cette carte';

        // Calculer les statistiques des orphelins AVANT la suppression
        const orphanStats = this.calculateOrphanStats();
        let orphanMessage = '';
        if (orphanStats.totalOrphans > 0) {
            orphanMessage = `\n\nDe plus, il y a ${orphanStats.totalOrphans} élément(s) orphelin(s) (non associé(s) à une carte valide).`;
        }

        const confirmed = confirm(
            `⚠️ ATTENTION : Cette action va supprimer TOUS les lieux et TOUTES les régions de "${activeMapName}".\n\n` +
            `Les lieux et régions des autres cartes seront conservés.` + orphanMessage + `\n\n` +
            'Cette action est IRRÉVERSIBLE.\n\n' +
            'Êtes-vous absolument sûr de vouloir continuer ?'
        );

        if (!confirmed) {
            return;
        }

        // Double confirmation pour éviter les erreurs
        const doubleConfirm = confirm(
            `🚨 DERNIÈRE CONFIRMATION 🚨\n\n` +
            `Vous allez supprimer DÉFINITIVEMENT tous les lieux et régions de "${activeMapName}"` +
            `${orphanStats.totalOrphans > 0 ? ' et tous les éléments orphelins' : ''}.\n\n` +
            'Confirmez-vous cette suppression ?'
        );

        if (!doubleConfirm) {
            return;
        }

        try {
            console.log(`🗑️ Suppression de tous les lieux et régions de la carte: ${activeMapUrl}`);

            // Supprimer uniquement les lieux de la carte active
            if (window.locationsData && window.locationsData.locations) {
                const initialCount = window.locationsData.locations.length;
                window.locationsData.locations = window.locationsData.locations.filter(loc =>
                    loc.mapId && loc.mapId !== activeMapUrl
                );
                const deletedCount = initialCount - window.locationsData.locations.length;
                console.log(`✅ ${deletedCount} lieu(x) supprimé(s) de la carte active`);
            }

            // Supprimer uniquement les régions de la carte active
            if (window.regionsData && window.regionsData.regions) {
                const initialCount = window.regionsData.regions.length;
                window.regionsData.regions = window.regionsData.regions.filter(reg =>
                    reg.mapId && reg.mapId !== activeMapUrl
                );
                const deletedCount = initialCount - window.regionsData.regions.length;
                console.log(`✅ ${deletedCount} région(s) supprimée(s) de la carte active`);
            }

            // Si des orphelins existent, les supprimer aussi
            if (orphanStats.totalOrphans > 0) {
                this.deleteOrphanElements(); // Ceci sauvegarde et re-render
            } else {
                // Sauvegarder uniquement les modifications de la carte active si pas d'orphelins
                if (window.dataManager) {
                    window.dataManager.saveLocationsToLocal();
                    window.dataManager.saveRegionsToLocal();
                } else {
                    localStorage.setItem('middleEarthLocations', JSON.stringify(window.locationsData));
                    localStorage.setItem('middleEarthRegions', JSON.stringify(window.regionsData));
                }

                // Re-render la carte
                if (typeof window.renderLocations === 'function') {
                    window.renderLocations();
                }
                if (typeof window.renderRegions === 'function') {
                    window.renderRegions();
                }

                // Marquer comme non sauvegardé
                if (typeof window.markAsUnsaved === 'function') {
                    window.markAsUnsaved();
                }

                // Synchroniser
                if (typeof window.scheduleAutoSync === 'function') {
                    window.scheduleAutoSync();
                }
            }

            alert(`✅ Tous les lieux et régions de "${activeMapName}" ont été supprimés avec succès.${orphanStats.totalOrphans > 0 ? ' Les éléments orphelins ont également été supprimés.' : ''}`);
            console.log(`✅ Suppression complète terminée pour la carte: ${activeMapUrl}`);

        } catch (error) {
            console.error('❌ Erreur lors de la suppression:', error);
            alert('❌ Erreur lors de la suppression : ' + error.message);
        }
    }

    // Function to switch map, added based on the user's request
    switchMap(mapUrl) {
        console.log(`🗺️ Changement de carte vers: ${mapUrl}`);

        this.activeMapUrl = mapUrl;
        localStorage.setItem('activeMapUrl', mapUrl);

        // Nettoyer les descriptions de voyage lors du changement de carte
        if (window.voyageManager) {
            window.voyageManager.clearDescriptions();
            console.log("🧹 Descriptions de voyage nettoyées lors du changement de carte");
        }

        // Charger la nouvelle carte
        const mapImage = document.getElementById('map-image');
        if (mapImage) {
            mapImage.src = mapUrl;
        }

        // Marquer comme non sauvegardé
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }

        // Fermer la modal de paramètres
        this.closeSettings();

        console.log(`✅ Carte changée: ${mapUrl}`);
    }
}

export default SettingsManager;