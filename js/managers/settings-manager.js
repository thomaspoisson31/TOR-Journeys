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
        this.currentRollData = null; // Pour stocker les données du tirage en cours

        console.log('⚙️ SettingsManager initialized');
    }

    init() {
        this.loadSettingsData();
        this.setupEventListeners();
        this.updateNarrationStyleDisplay();
    }

    // Méthode publique pour charger les paramètres (appelée par AuthManager)
    loadSettings() {
        this.loadSettingsData();
        
        // Mettre à jour l'image de la carte active après chargement
        const mapImage = document.getElementById('map-image');
        if (mapImage && this.activeMapUrl) {
            mapImage.src = this.activeMapUrl;
        }
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

        // Onglet Import/Export
        this.setupImportExportListeners();
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
            case 'import-export':
                // Aucune action spécifique requise ici, juste l'affichage
                break;
            case 'random-tables':
                this.renderSettingsRandomTablesTab();
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
            this.openLibraryForMapSelection(modal);
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

        console.log(`✅ Carte ajoutée: ${mapName} (${newMap.width}x${newMap.height}px)`);
    }

    async openLibraryForMapSelection(mapModal) {
        // Vérifier que l'utilisateur est authentifié
        if (!window.authManager || !window.authManager.isAuthenticated) {
            alert('Vous devez être connecté avec Google pour accéder à la bibliothèque d\'images.');
            return;
        }

        // Créer la modale de sélection de bibliothèque
        const libraryModal = document.createElement('div');
        libraryModal.id = 'library-map-selection-modal';
        libraryModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]';

        libraryModal.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6 w-[90vw] max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-white">
                        <i class="fas fa-images mr-2"></i>Bibliothèque d'images
                    </h2>
                    <button id="close-library-map-selection" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times fa-lg"></i>
                    </button>
                </div>

                <div id="library-map-selection-content" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <!-- Les images seront générées ici -->
                </div>

                <div id="library-map-selection-loading" class="text-center py-12">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p class="text-gray-400">Chargement des images...</p>
                </div>

                <div id="library-map-selection-empty" class="hidden text-center py-12 text-gray-500">
                    <i class="fas fa-images fa-3x mb-4"></i>
                    <p class="text-lg">Aucune image disponible</p>
                </div>
            </div>
        `;

        document.body.appendChild(libraryModal);

        // Charger les images
        try {
            const response = await fetch('/api/images/library', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();

            const loadingDiv = document.getElementById('library-map-selection-loading');
            const contentDiv = document.getElementById('library-map-selection-content');
            const emptyDiv = document.getElementById('library-map-selection-empty');

            loadingDiv.classList.add('hidden');

            // L'API retourne maintenant {folders: {category: [images]}}
            if (data.success && data.folders && Object.keys(data.folders).length > 0) {
                // Récupérer uniquement les images du dossier "maps"
                const mapsImages = data.folders['maps'] || [];

                if (mapsImages.length > 0) {
                    contentDiv.innerHTML = mapsImages.map(image => `
                        <div class="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-700 hover:ring-2 hover:ring-blue-500 transition-all"
                             onclick="window.settingsManager.selectLibraryImageForMap('${image.url}', '${encodeURIComponent(image.filename)}')">
                            <img src="${image.url}" alt="${image.filename}" class="w-full h-24 object-cover">
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity flex items-center justify-center">
                                <div class="opacity-0 group-hover:opacity-100 transition-opacity text-white text-center p-2">
                                    <p class="text-xs truncate">${image.filename}</p>
                                </div>
                            </div>
                        </div>
                    `).join('');
                } else {
                    emptyDiv.classList.remove('hidden');
                }
            } else {
                emptyDiv.classList.remove('hidden');
            }

        } catch (error) {
            console.error('❌ Erreur lors du chargement de la bibliothèque:', error);
            alert('Erreur lors du chargement de la bibliothèque: ' + error.message);
            libraryModal.remove();
            return;
        }

        // Gestionnaire de fermeture
        document.getElementById('close-library-map-selection').addEventListener('click', () => {
            libraryModal.remove();
        });

        // Stocker la référence à la modale de carte pour la fermer après sélection
        this.currentMapModal = mapModal;
        this.currentLibraryModal = libraryModal;
    }

    selectLibraryImageForMap(imageUrl, encodedFilename) {
        const filename = decodeURIComponent(encodedFilename);

        // Récupérer le nom de la carte ou utiliser le nom de fichier
        const nameInput = document.getElementById('temp-map-name-input');
        const mapName = nameInput.value.trim() || filename.replace(/\.[^/.]+$/, ''); // Enlever l'extension

        // Créer la nouvelle carte
        const newMap = {
            id: Date.now(),
            name: mapName,
            url: imageUrl,
            isDefault: false
        };

        this.availableMaps.push(newMap);
        this.saveMapsData();
        this.renderMapsGrid();

        // Fermer les deux modales
        if (this.currentLibraryModal) {
            this.currentLibraryModal.remove();
        }
        if (this.currentMapModal) {
            this.currentMapModal.remove();
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

        mapsGrid.innerHTML = this.availableMaps.map((map, index) => {
            const isActive = this.activeMapUrl === map.url;
            const mapWidth = map.width || 5103;
            const mapScale = map.scale || 600;

            // Compter les lieux et régions pour cette carte
            let locationsCount = 0;
            let regionsCount = 0;

            if (window.locationsData && window.locationsData.locations) {
                locationsCount = window.locationsData.locations.filter(loc =>
                    !loc.mapId || loc.mapId === map.url
                ).length;
            }

            if (window.regionsData && window.regionsData.regions) {
                regionsCount = window.regionsData.regions.filter(reg =>
                    !reg.mapId || reg.mapId === map.url
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

            console.log(`🏷️ Carte renommée: "${oldName}" → "${trimmedName}"`);
        }
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

        const confirmMessage = map.isDefault
            ? 'Êtes-vous sûr de vouloir supprimer cette carte par défaut ?'
            : 'Êtes-vous sûr de vouloir supprimer cette carte ?';

        if (confirm(confirmMessage)) {
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

    // === GESTION IMPORT/EXPORT ===
    setupImportExportListeners() {
        // Les fonctionnalités d'import/export sont gérées par ImportExportManager
        // Cette méthode est un placeholder pour éviter les erreurs
        console.log('📦 Import/Export listeners setup (handled by ImportExportManager)');
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
            console.log(`📋 [DEBUG] Table simple ${index}:`, {
                name: table.name,
                entriesCount: table.entries?.length || 0,
                entries: table.entries
            });
        });

        // Afficher le contenu de chaque table composite
        compositeTables.forEach((composite, index) => {
            console.log(`🔗 [DEBUG] Table composite ${index}:`, {
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
            console.log(`📦 [DEBUG] Conteneur table ${index}:`, {
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

    rollOnSettingsTable(tableIndex) {
        if (!window.adventureManager) return;
        window.adventureManager.rollOnTable(tableIndex);
        // Re-render pour afficher le résultat
        setTimeout(() => {
            const resultContainer = document.getElementById(`settings-table-result-${tableIndex}`);
            const sourceContainer = document.getElementById(`table-result-${tableIndex}`);
            if (resultContainer && sourceContainer) {
                resultContainer.innerHTML = sourceContainer.innerHTML;
                resultContainer.classList.remove('hidden');
            }
        }, 100);
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
        console.log(`🔗 [Settings] rollOnSettingsCompositeTable appelé avec index: ${compositeIndex}`);

        if (!window.adventureManager) {
            console.error('❌ AdventureManager non disponible');
            return;
        }

        const composite = window.adventureManager.adventureData.compositeTables[compositeIndex];
        console.log(`📋 [Settings] Table composite récupérée:`, composite);

        if (!composite || !composite.tableIndices || composite.tableIndices.length === 0) {
            console.error('❌ Table composite invalide');
            return;
        }

        // Effectuer un tirage sur chaque table simple
        const results = [];
        console.log(`🎲 [Settings] Tirage sur ${composite.tableIndices.length} table(s) simple(s)`);

        composite.tableIndices.forEach((tableIndex, idx) => {
            const table = window.adventureManager.adventureData.randomTables[tableIndex];

            if (table && table.entries && table.entries.length > 0) {
                const randomIndex = Math.floor(Math.random() * table.entries.length);
                const result = table.entries[randomIndex];

                results.push({
                    tableName: table.name,
                    result: result
                });
            }
        });

        // Formater les résultats
        const formattedResult = results.map(r => {
            let value = r.result;
            if (typeof value === 'object' && value !== null) {
                value = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ');
            }
            return `<div class="mb-1">
                <span class="font-semibold text-blue-300">${r.tableName}:</span>
                <span class="text-white ml-2">${value}</span>
            </div>`;
        }).join('');

        // Afficher dans la modale dédiée
        this.showRandomRollResultModal(composite.name, formattedResult, true);
    }

    deleteSettingsCompositeTable(index) {
        if (!window.adventureManager) return;
        if (confirm('Voulez-vous vraiment supprimer cette table composite ?')) {
            window.adventureManager.adventureData.compositeTables.splice(index, 1);
            window.adventureManager.saveToLocalStorage();
            this.renderSettingsRandomTablesTab();
        }
    }

    showRandomRollResultModal(tableName, formattedResult, isComposite) {
        // Assurez-vous que la modale existe dans le HTML (elle doit être ajoutée manuellement dans index.html)
        // Si elle n'existe pas, on pourrait la créer dynamiquement, mais c'est moins propre.
        const modal = document.getElementById('random-roll-result-modal');
        const modalTitle = document.getElementById('random-roll-result-title');
        const resultContent = document.getElementById('random-roll-result-content');
        const closeBtn = document.getElementById('close-random-roll-result');
        const insertBtn = document.getElementById('insert-roll-to-journal');

        if (!modal || !modalTitle || !resultContent || !closeBtn || !insertBtn) {
            console.error('❌ Modale de résultat de tirage ou ses éléments non trouvés. Assurez-vous que la modale existe dans le HTML.');
            // Optionnellement, créer la modale si elle n'existe pas.
            return;
        }

        // Afficher le titre du résultat
        modalTitle.innerHTML = `${isComposite ? 'Table composite' : 'Table'}: <strong>${tableName}</strong>`;

        // Afficher le résultat
        resultContent.innerHTML = formattedResult;

        // Stocker les données pour l'insertion dans le journal
        this.currentRollData = {
            tableName: tableName,
            formattedResult: formattedResult,
            isComposite: isComposite,
            timestamp: new Date().toISOString()
        };

        // Afficher la modale
        modal.classList.remove('hidden');
        modal.style.display = 'flex'; // Utiliser flex pour le centrage

        // Gérer la fermeture
        closeBtn.onclick = () => {
            modal.classList.add('hidden');
            this.currentRollData = null;
        };

        // Gérer l'insertion dans le journal
        insertBtn.onclick = () => {
            this.insertRollToJournal();
            modal.classList.add('hidden');
        };
    }

    insertRollToJournal() {
        if (!this.currentRollData || !window.journalManager) {
            console.error('❌ Données de tirage ou JournalManager non disponibles');
            return;
        }

        // Obtenir la date actuelle du calendrier
        let currentDate = 'Date inconnue'; // Valeur par défaut
        if (window.calendarManager) {
            currentDate = window.calendarManager.getCurrentDateString();
        } else {
            console.warn('⚠️ CalendarManager non disponible pour obtenir la date actuelle.');
        }

        // Créer une entrée de journal pour le tirage
        const rollEntry = {
            title: `Tirage aléatoire : ${this.currentRollData.tableName}`,
            generatedAt: this.currentRollData.timestamp,
            totalDays: 0, // Les tirages n'ont pas de durée en jours
            journeyType: 'random_roll', // Type spécifique pour les tirages aléatoires
            days: [{
                dayNumber: 1, // Un seul "jour" pour l'événement de tirage
                calendarDate: currentDate,
                eventResult: null, // Pas de résultat d'événement spécifique
                description: this.currentRollData.formattedResult, // Le résultat formaté du tirage
                discoveries: [] // Pas de découvertes
            }]
        };

        // Récupérer le journal existant
        let journal = [];
        const savedJournal = localStorage.getItem('travelJournal');
        if (savedJournal) {
            try {
                const parsed = JSON.parse(savedJournal);
                journal = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.error("Erreur lors du parsing du journal:", e);
                journal = []; // Réinitialiser si le parsing échoue
            }
        }

        // Ajouter l'entrée au journal
        journal.push(rollEntry);

        // Sauvegarder le journal mis à jour
        localStorage.setItem('travelJournal', JSON.stringify(journal));
        console.log("📖 Tirage aléatoire inséré dans le journal");

        // Marquer comme non sauvegardé pour que l'icône cloud apparaisse
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }

        // Planifier la synchronisation avec le cloud
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }

        // Afficher une notification de succès
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        notification.innerHTML = '<i class="fas fa-check mr-2"></i>Tirage inséré dans le journal';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);

        // Réinitialiser les données de tirage en cours
        this.currentRollData = null;
    }
}

export default SettingsManager;