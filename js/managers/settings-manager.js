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
            case 'importExport':
                // Aucune action spécifique requise ici, juste l'affichage
                break;
            case 'random-tables':
                this.renderRandomTablesTab();
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

        // Le conteneur de distance (date) doit rester visible
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

    async generateAdventurersWizard() {
        const generateBtn = document.getElementById('generate-adventurers-wizard');

        if (!this.geminiManager.isAvailable()) {
            alert('API Gemini non disponible pour la génération automatique.');
            return;
        }

        const prompt = `Génère une description d'un groupe de 2-5 aventuriers pour l'Eriador de la fin du Troisième Âge (Terre du Milieu). 
        Pour chaque aventurier, inclus : nom, peuple (Homme de l'Eriador, Hobbit, Elfe, Nain), occupation/classe, personnalité brève.
        Ajoute un objectif commun qui les unit. Style narratif de Tolkien, format Markdown avec des listes.`;

        try {
            const description = await this.geminiManager.generateContent(prompt, generateBtn, 'adventurers');
            this.partyDescription = description;
            this.saveDescriptions();
            this.updatePartyContent();
        } catch (error) {
            console.error('Erreur génération aventuriers:', error);
            alert('Erreur lors de la génération: ' + error.message);
        }
    }

    async generateQuestDescription() {
        const generateBtn = document.getElementById('generate-quest-description-btn');
        const textarea = document.getElementById('adventurers-quest');

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

    // setupQuestListeners is duplicated. The first one is used above.
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
    renderRandomTablesTab() {
        const tabContent = document.getElementById('settings-random-tables-content');
        if (!tabContent) {
            console.error('❌ settings-random-tables-content not found');
            return;
        }

        // Utiliser les données d'AdventureManager
        if (!window.adventureManager) {
            tabContent.innerHTML = '<p class="text-gray-400 italic">AdventureManager non disponible.</p>';
            return;
        }

        const tables = window.adventureManager.adventureData.randomTables || [];
        const compositeTables = window.adventureManager.adventureData.compositeTables || [];

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
            sortedCompositeTables.forEach((table) => {
                const originalIndex = compositeTables.indexOf(table);
                html += `
                    <div class="bg-gray-800 rounded p-2 border-2 border-blue-500">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center space-x-2">
                                <span class="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-semibold">Composite</span>
                                <h4 class="text-base font-semibold text-white">${table.name || 'Table sans nom'}</h4>
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
                        <div id="settings-composite-result-${originalIndex}" class="hidden mt-2 p-2 bg-gray-700 rounded border border-green-500">
                            <div class="text-green-400 font-semibold mb-1 text-xs">Résultats des tirages :</div>
                            <div id="settings-composite-result-content-${originalIndex}" class="text-sm"></div>
                        </div>
                    </div>
                `;
            });

            // Afficher les tables simples
            sortedTables.forEach((table) => {
                const originalIndex = tables.indexOf(table);
                html += `
                    <div class="bg-gray-800 rounded p-2 border border-gray-700">
                        <div class="flex justify-between items-center">
                            <h4 class="text-base font-semibold text-white">${table.name || 'Table sans nom'}</h4>
                            <div class="flex space-x-2">
                                <button onclick="window.settingsManager.rollOnSettingsTable(${originalIndex})" class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs">
                                    <i class="fas fa-dice mr-1"></i>Tirer
                                </button>
                                <button onclick="window.settingsManager.deleteSettingsRandomTable(${originalIndex})" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div id="settings-table-result-${originalIndex}" class="hidden mt-2 p-2 bg-gray-700 rounded border border-green-500">
                            <div class="text-green-400 font-semibold mb-1 text-xs">Résultat du tirage :</div>
                            <div id="settings-table-result-content-${originalIndex}" class="text-sm"></div>
                        </div>
                    </div>
                `;
            });
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
            this.renderRandomTablesTab();

            event.target.value = '';
        } catch (error) {
            console.error('Erreur lors de l\'import de la table:', error);
            alert('Erreur lors de l\'import du fichier JSON. Vérifiez le format.');
        }
    }

    rollOnSettingsTable(tableIndex) {
        const table = window.adventureManager.adventureData.randomTables[tableIndex];
        if (!table || !table.entries || table.entries.length === 0) return;

        const randomIndex = Math.floor(Math.random() * table.entries.length);
        const entry = table.entries[randomIndex];

        const resultContainer = document.getElementById(`settings-table-result-${tableIndex}`);
        const resultContent = document.getElementById(`settings-table-result-content-${tableIndex}`);

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
            resultContent.innerHTML = html;
            resultContainer.classList.remove('hidden');
        }
    }

    deleteSettingsRandomTable(index) {
        if (confirm('Voulez-vous vraiment supprimer cette table aléatoire ?')) {
            window.adventureManager.adventureData.randomTables.splice(index, 1);
            window.adventureManager.saveToLocalStorage();
            this.renderRandomTablesTab();
        }
    }

    openSettingsCompositeTableModal() {
        const tables = window.adventureManager.adventureData.randomTables || [];
        
        let modalHTML = `
            <div id="settings-composite-table-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
                <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                    <h3 class="text-xl font-bold text-white mb-4">Créer une table composite</h3>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-300 mb-2">Nom de la table composite :</label>
                        <input type="text" id="settings-composite-table-name" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white" placeholder="Ex: Escouade d'Orques">
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-300 mb-2">Sélectionner les tables (minimum 2) :</label>
                        <div id="settings-composite-table-selection" class="space-y-2">
                            ${tables.map((table, index) => `
                                <div class="flex items-center space-x-2 bg-gray-800 p-2 rounded">
                                    <input type="checkbox" id="settings-table-${index}" value="${index}" class="settings-composite-table-checkbox">
                                    <label for="settings-table-${index}" class="flex-1 text-white">${table.name || 'Table sans nom'}</label>
                                    <input type="number" id="settings-order-${index}" min="1" placeholder="Ordre" class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm settings-composite-table-order" disabled>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="flex space-x-2">
                        <button id="settings-save-composite-table" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                            <i class="fas fa-save mr-1"></i>Sauvegarder
                        </button>
                        <button onclick="window.settingsManager.closeSettingsCompositeTableModal()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-times mr-1"></i>Annuler
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const checkboxes = document.querySelectorAll('.settings-composite-table-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const orderInput = document.getElementById(`settings-order-${e.target.value}`);
                orderInput.disabled = !e.target.checked;
                if (!e.target.checked) {
                    orderInput.value = '';
                }
                this.updateSettingsCompositeTableSaveButton();
            });
        });

        const orderInputs = document.querySelectorAll('.settings-composite-table-order');
        orderInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateSettingsCompositeTableSaveButton();
            });
        });

        document.getElementById('settings-save-composite-table').addEventListener('click', () => {
            this.saveSettingsCompositeTable();
        });
    }

    updateSettingsCompositeTableSaveButton() {
        const checkboxes = document.querySelectorAll('.settings-composite-table-checkbox:checked');
        const saveButton = document.getElementById('settings-save-composite-table');
        
        if (checkboxes.length < 2) {
            saveButton.disabled = true;
            return;
        }

        let allHaveOrder = true;
        checkboxes.forEach(checkbox => {
            const orderInput = document.getElementById(`settings-order-${checkbox.value}`);
            if (!orderInput.value || orderInput.value < 1) {
                allHaveOrder = false;
            }
        });

        saveButton.disabled = !allHaveOrder;
    }

    saveSettingsCompositeTable() {
        const name = document.getElementById('settings-composite-table-name').value.trim();
        if (!name) {
            alert('Veuillez saisir un nom pour la table composite.');
            return;
        }

        const checkboxes = document.querySelectorAll('.settings-composite-table-checkbox:checked');
        const selectedTables = [];

        checkboxes.forEach(checkbox => {
            const tableIndex = parseInt(checkbox.value);
            const order = parseInt(document.getElementById(`settings-order-${tableIndex}`).value);
            selectedTables.push({
                tableIndex: tableIndex,
                order: order
            });
        });

        selectedTables.sort((a, b) => a.order - b.order);

        const compositeTable = {
            name: name,
            tables: selectedTables
        };

        if (!window.adventureManager.adventureData.compositeTables) {
            window.adventureManager.adventureData.compositeTables = [];
        }
        window.adventureManager.adventureData.compositeTables.push(compositeTable);
        
        window.adventureManager.saveToLocalStorage();
        this.closeSettingsCompositeTableModal();
        this.renderRandomTablesTab();
    }

    closeSettingsCompositeTableModal() {
        const modal = document.getElementById('settings-composite-table-modal');
        if (modal) {
            modal.remove();
        }
    }

    rollOnSettingsCompositeTable(compositeIndex) {
        const compositeTable = window.adventureManager.adventureData.compositeTables[compositeIndex];
        if (!compositeTable || !compositeTable.tables || compositeTable.tables.length === 0) return;

        const resultContainer = document.getElementById(`settings-composite-result-${compositeIndex}`);
        const resultContent = document.getElementById(`settings-composite-result-content-${compositeIndex}`);

        if (resultContainer && resultContent) {
            let html = '<div class="space-y-3">';

            compositeTable.tables.forEach(tableRef => {
                const table = window.adventureManager.adventureData.randomTables[tableRef.tableIndex];
                if (!table || !table.entries || table.entries.length === 0) return;

                const randomIndex = Math.floor(Math.random() * table.entries.length);
                const entry = table.entries[randomIndex];

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
            resultContent.innerHTML = html;
            resultContainer.classList.remove('hidden');
        }
    }

    deleteSettingsCompositeTable(index) {
        if (confirm('Voulez-vous vraiment supprimer cette table composite ?')) {
            window.adventureManager.adventureData.compositeTables.splice(index, 1);
            window.adventureManager.saveToLocalStorage();
            this.renderRandomTablesTab();
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

            if (!window.adventureManager.adventureData.randomTables) {
                window.adventureManager.adventureData.randomTables = [];
            }
            window.adventureManager.adventureData.randomTables.push(newTable);
            window.adventureManager.saveToLocalStorage();
            this.renderRandomTablesTab();

            event.target.value = '';
        } catch (error) {
            console.error('Erreur lors de l\'import de la table:', error);
            alert('Erreur lors de l\'import du fichier JSON. Vérifiez le format.');
        }
    }

    rollOnTable(tableIndex) {
        const table = window.adventureManager.adventureData.randomTables[tableIndex];
        if (!table || !table.entries || table.entries.length === 0) return;

        const randomIndex = Math.floor(Math.random() * table.entries.length);
        const entry = table.entries[randomIndex];

        const resultContainer = document.getElementById(`settings-table-result-${tableIndex}`);
        const resultContent = document.getElementById(`settings-table-result-content-${tableIndex}`);

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
            resultContent.innerHTML = html;
            resultContainer.classList.remove('hidden');
        }
    }

    deleteRandomTable(index) {
        if (confirm('Voulez-vous vraiment supprimer cette table aléatoire ?')) {
            window.adventureManager.adventureData.randomTables.splice(index, 1);
            window.adventureManager.saveToLocalStorage();
            this.renderRandomTablesTab();
        }
    }

    openCompositeTableModal() {
        const tables = window.adventureManager.adventureData.randomTables || [];
        
        let modalHTML = `
            <div id="settings-composite-table-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
                <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                    <h3 class="text-xl font-bold text-white mb-4">Créer une table composite</h3>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-300 mb-2">Nom de la table composite :</label>
                        <input type="text" id="settings-composite-table-name" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white" placeholder="Ex: Escouade d'Orques">
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-300 mb-2">Sélectionner les tables (minimum 2) :</label>
                        <div id="settings-composite-table-selection" class="space-y-2">
                            ${tables.map((table, index) => `
                                <div class="flex items-center space-x-2 bg-gray-800 p-2 rounded">
                                    <input type="checkbox" id="settings-table-${index}" value="${index}" class="settings-composite-table-checkbox">
                                    <label for="settings-table-${index}" class="flex-1 text-white">${table.name || 'Table sans nom'}</label>
                                    <input type="number" id="settings-order-${index}" min="1" placeholder="Ordre" class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm settings-composite-table-order" disabled>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="flex space-x-2">
                        <button id="settings-save-composite-table" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                            <i class="fas fa-save mr-1"></i>Sauvegarder
                        </button>
                        <button onclick="window.settingsManager.closeCompositeTableModal()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-times mr-1"></i>Annuler
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const checkboxes = document.querySelectorAll('.settings-composite-table-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const orderInput = document.getElementById(`settings-order-${e.target.value}`);
                orderInput.disabled = !e.target.checked;
                if (!e.target.checked) {
                    orderInput.value = '';
                }
                this.updateCompositeTableSaveButton();
            });
        });

        const orderInputs = document.querySelectorAll('.settings-composite-table-order');
        orderInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateCompositeTableSaveButton();
            });
        });

        document.getElementById('settings-save-composite-table').addEventListener('click', () => {
            this.saveCompositeTable();
        });
    }

    updateCompositeTableSaveButton() {
        const checkboxes = document.querySelectorAll('.settings-composite-table-checkbox:checked');
        const saveButton = document.getElementById('settings-save-composite-table');
        
        if (checkboxes.length < 2) {
            saveButton.disabled = true;
            return;
        }

        let allHaveOrder = true;
        checkboxes.forEach(checkbox => {
            const orderInput = document.getElementById(`settings-order-${checkbox.value}`);
            if (!orderInput.value || orderInput.value < 1) {
                allHaveOrder = false;
            }
        });

        saveButton.disabled = !allHaveOrder;
    }

    saveCompositeTable() {
        const name = document.getElementById('settings-composite-table-name').value.trim();
        if (!name) {
            alert('Veuillez saisir un nom pour la table composite.');
            return;
        }

        const checkboxes = document.querySelectorAll('.settings-composite-table-checkbox:checked');
        const selectedTables = [];

        checkboxes.forEach(checkbox => {
            const tableIndex = parseInt(checkbox.value);
            const order = parseInt(document.getElementById(`settings-order-${tableIndex}`).value);
            selectedTables.push({
                tableIndex: tableIndex,
                order: order
            });
        });

        selectedTables.sort((a, b) => a.order - b.order);

        const compositeTable = {
            name: name,
            tables: selectedTables
        };

        if (!window.adventureManager.adventureData.compositeTables) {
            window.adventureManager.adventureData.compositeTables = [];
        }
        window.adventureManager.adventureData.compositeTables.push(compositeTable);
        
        window.adventureManager.saveToLocalStorage();
        this.closeCompositeTableModal();
        this.renderRandomTablesTab();
    }

    closeCompositeTableModal() {
        const modal = document.getElementById('settings-composite-table-modal');
        if (modal) {
            modal.remove();
        }
    }

    rollOnCompositeTable(compositeIndex) {
        const compositeTable = window.adventureManager.adventureData.compositeTables[compositeIndex];
        if (!compositeTable || !compositeTable.tables || compositeTable.tables.length === 0) return;

        const resultContainer = document.getElementById(`settings-composite-result-${compositeIndex}`);
        const resultContent = document.getElementById(`settings-composite-result-content-${compositeIndex}`);

        if (resultContainer && resultContent) {
            let html = '<div class="space-y-3">';

            compositeTable.tables.forEach(tableRef => {
                const table = window.adventureManager.adventureData.randomTables[tableRef.tableIndex];
                if (!table || !table.entries || table.entries.length === 0) return;

                const randomIndex = Math.floor(Math.random() * table.entries.length);
                const entry = table.entries[randomIndex];

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
            resultContent.innerHTML = html;
            resultContainer.classList.remove('hidden');
        }
    }

    deleteCompositeTable(index) {
        if (confirm('Voulez-vous vraiment supprimer cette table composite ?')) {
            window.adventureManager.adventureData.compositeTables.splice(index, 1);
            window.adventureManager.saveToLocalStorage();
            this.renderRandomTablesTab();
        }
    }

    // === GESTION IMPORT/EXPORT ===
    setupImportExportListeners() {
        console.log('⚙️ Configuration des listeners Import/Export...');

        // Import/Export Lieux et Régions
        const exportLocationsBtn = document.getElementById('export-locations-btn');
        const importLocationsBtn = document.getElementById('import-locations-btn');
        const importLocationsFileInput = document.getElementById('import-locations-file-input');

        console.log('📍 Boutons Lieux/Régions:', {
            exportBtn: !!exportLocationsBtn,
            importBtn: !!importLocationsBtn,
            fileInput: !!importLocationsFileInput
        });

        if (exportLocationsBtn) {
            exportLocationsBtn.addEventListener('click', () => {
                console.log('📤 Export lieux/régions demandé');
                if (window.importExportManager) {
                    window.importExportManager.exportUnifiedData();
                }
            });
        }

        if (importLocationsBtn) {
            importLocationsBtn.addEventListener('click', () => {
                console.log('📥 Import lieux/régions demandé');
                if (importLocationsFileInput) {
                    importLocationsFileInput.click();
                }
            });
        }

        if (importLocationsFileInput) {
            importLocationsFileInput.addEventListener('change', (event) => {
                if (window.importExportManager) {
                    window.importExportManager.handleImportFile(event);
                }
            });
        }

        // Import/Export Personnages
        const exportCharactersBtn = document.getElementById('export-characters-btn');
        const importCharactersBtn = document.getElementById('import-characters-btn');
        const importCharactersFileInput = document.getElementById('import-characters-file-input');

        console.log('👥 Boutons Personnages:', {
            exportBtn: !!exportCharactersBtn,
            importBtn: !!importCharactersBtn,
            fileInput: !!importCharactersFileInput
        });

        if (exportCharactersBtn) {
            exportCharactersBtn.addEventListener('click', () => {
                console.log('📤 Export personnages demandé');
                if (window.charactersManager) {
                    window.charactersManager.exportCharacters();
                } else {
                    console.error('❌ charactersManager non disponible');
                }
            });
        }

        if (importCharactersBtn) {
            importCharactersBtn.addEventListener('click', () => {
                console.log('📥 Import personnages demandé');
                if (importCharactersFileInput) {
                    importCharactersFileInput.click();
                } else {
                    console.error('❌ import-characters-file-input non trouvé');
                }
            });
        }

        if (importCharactersFileInput) {
            importCharactersFileInput.addEventListener('change', (event) => {
                console.log('📄 Fichier personnages sélectionné');
                if (window.charactersManager) {
                    window.charactersManager.handleImportCharacters(event);
                } else {
                    console.error('❌ charactersManager non disponible');
                }
            });
        }

        console.log('✅ Listeners Import/Export configurés');
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

            // Toujours définir le callback avant de changer src
            mapImage.onload = onImageLoaded;

            // Si l'image est déjà complètement chargée avec cette URL, déclencher manuellement
            if (mapImage.complete && mapImage.naturalWidth > 0 && mapImage.src.endsWith(this.activeMapUrl)) {
                console.log('⚡ Image déjà chargée, callback immédiat');
                onImageLoaded();
            } else {
                // Forcer le rechargement
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

    deleteAllLocationsAndRegions() {
        const activeMapName = this.activeMapName || 'cette carte';

        const confirmed = confirm(
            `⚠️ ATTENTION : Cette action va supprimer TOUS les lieux et TOUTES les régions de "${activeMapName}".\n\n` +
            'Les lieux et régions des autres cartes seront conservés.\n\n' +
            'Cette action est IRRÉVERSIBLE.\n\n' +
            'Êtes-vous absolument sûr de vouloir continuer ?'
        );

        if (!confirmed) {
            return;
        }

        // Double confirmation pour éviter les erreurs
        const doubleConfirm = confirm(
            '🚨 DERNIÈRE CONFIRMATION 🚨\n\n' +
            `Vous allez supprimer DÉFINITIVEMENT tous les lieux et régions de "${activeMapName}".\n\n` +
            'Confirmez-vous cette suppression ?'
        );

        if (!doubleConfirm) {
            return;
        }

        try {
            const activeMapId = this.activeMapUrl;
            console.log(`🗑️ Suppression de tous les lieux et régions de la carte active: ${activeMapId}`);

            // Supprimer uniquement les lieux de la carte active
            if (window.locationsData && window.locationsData.locations) {
                const initialCount = window.locationsData.locations.length;
                window.locationsData.locations = window.locationsData.locations.filter(loc => 
                    loc.mapId && loc.mapId !== activeMapId
                );
                const deletedCount = initialCount - window.locationsData.locations.length;
                console.log(`✅ ${deletedCount} lieu(x) supprimé(s) de la carte active`);
            }

            // Supprimer uniquement les régions de la carte active
            if (window.regionsData && window.regionsData.regions) {
                const initialCount = window.regionsData.regions.length;
                window.regionsData.regions = window.regionsData.regions.filter(reg => 
                    reg.mapId && reg.mapId !== activeMapId
                );
                const deletedCount = initialCount - window.regionsData.regions.length;
                console.log(`✅ ${deletedCount} région(s) supprimée(s) de la carte active`);
            }

            // Sauvegarder dans localStorage
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

            // Marquer comme non sauvegardé pour afficher l'icône cloud
            if (typeof window.markAsUnsaved === 'function') {
                window.markAsUnsaved();
            }

            // Synchroniser
            if (typeof window.scheduleAutoSync === 'function') {
                window.scheduleAutoSync();
            }

            alert(`✅ Tous les lieux et régions de "${activeMapName}" ont été supprimés avec succès.`);
            console.log(`✅ Suppression complète terminée pour la carte: ${activeMapId}`);

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