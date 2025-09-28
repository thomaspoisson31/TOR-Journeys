// --- Import des constantes ---
        import {
            colorMap,
            regionColorMap,
            getDefaultLocations,
            getDefaultRegions,
            MAP_DISTANCE_MILES,
            PLAYER_MAP_URL,
            LOREMASTER_MAP_URL,
            LOCATIONS_URL,
            PROXIMITY_DISTANCE,
            SYNC_DELAY,
            seasonSymbols,
            seasonNames
        } from './utils/constants.js';

        let locationsData;
        let regionsData = getDefaultRegions();

        // --- DOM Elements ---
        const viewport = document.getElementById('viewport');
        const mapContainer = document.getElementById('map-container');
        const mapImage = document.getElementById('map-image');
        const loremasterMapImage = document.getElementById('loremaster-map-image');
        const drawingCanvas = document.getElementById('drawing-canvas');
        const locationsLayer = document.getElementById('locations-layer');
        const regionsLayer = document.getElementById('regions-layer');
        const infoBox = document.getElementById('info-box');
        const infoBoxClose = document.getElementById('info-box-close');
        const ctx = drawingCanvas.getContext('2d');
        const distanceContainer = document.getElementById('distance-container');
        const addLocationModal = document.getElementById('add-location-modal');
        const addRegionModal = document.getElementById('add-region-modal');
        const loaderOverlay = document.getElementById('loader-overlay');
        const journeyLogModal = document.getElementById('journey-log-modal');
        const filterPanel = document.getElementById('filter-panel');
        const mapSwitchBtn = document.getElementById('map-switch');
        const distanceDisplay = document.getElementById('distance-display');
        const authModal = document.getElementById('auth-modal');
        const authBtn = document.getElementById('auth-btn');
        const closeAuthModalBtn = document.getElementById('close-auth-modal');
        const authStatusPanel = document.getElementById('auth-status-panel');
        const authContentPanel = document.getElementById('auth-content-panel');
        const loggedInPanel = document.getElementById('logged-in-panel');
        const loggedOutPanel = document.getElementById('logged-out-panel');
        const authUserName = document.getElementById('auth-user-name');
        const contextNameInput = document.getElementById('context-name-input');
        const saveContextBtn = document.getElementById('save-context-btn');
        const savedContextsDiv = document.getElementById('saved-contexts');
        const googleSigninBtn = document.getElementById('google-signin-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const closeSettingsModalBtn = document.getElementById('close-settings-modal');

        // --- Map state ---
        let MAP_WIDTH = 0, MAP_HEIGHT = 0;
        let isPlayerView = true;

        // --- Transformation state ---
        let scale = 1, panX = 0, panY = 0;

        // --- Interaction states ---
        let isPanning = false, startPanX = 0, startPanY = 0;
        let isDrawingMode = false, isDrawing = false;
        let isAddingLocationMode = false;
        let isAddingRegionMode = false;
        let totalPathPixels = 0, lastPoint = null, startPoint = null;
        let draggedMarker = null, dragStartX = 0, dragStartY = 0;
        let newLocationCoords = null;
        let activeLocationId = null;
        let activeFilters = { known: false, visited: false, colors: [] };

        // --- Journey tracking ---
        let journeyPath = [];
        let traversedRegions = new Set();
        let nearbyLocations = new Set();
        let journeyDiscoveries = []; // Chronological list of discoveries (regions and locations)

        // --- Voyage Segments ---
        let currentVoyage = null;
        let voyageSegments = [];
        let currentSegmentIndex = -1;
        let isVoyageActive = false;
        let activatedSegments = new Set(); // Track which segments have been activated

        // --- Region creation states ---
        let currentRegionPoints = [];
        let tempRegionPath = null;

        // --- Authentication state ---
        let currentUser = null; // Renamed from googleUser for broader compatibility
        let savedContexts = [];

        // --- Season state ---
        let currentSeason = 'printemps-debut';

        // --- Calendar state ---
        let calendarData = null;
        let currentCalendarDate = null; // { month: "Gwaeron", day: 1 }
        let isCalendarMode = false;

        // --- Auto-sync state ---
        let autoSyncEnabled = false;
        let lastSyncTime = 0;

        // --- Maps management ---
        let availableMaps = [];
        let currentMapConfig = {
            playerMap: 'fr_tor_2nd_eriadors_map_page-0001.webp',
            loremasterMap: 'fr_tor_2nd_eriadors_map_page_loremaster.webp'
        };
        let editingMapIndex = -1;

        // --- DOM Helper ---
        const dom = {
            getElementById: (id) => document.getElementById(id),
            querySelector: (selector) => document.querySelector(selector),
            showModal: (modal) => modal.classList.remove('hidden'),
            hideModal: (modal) => modal.classList.add('hidden'),
            voyageSegmentsModal: document.getElementById('voyage-segments-modal')
        };

        // --- Managers ---
        let voyageManager;
        // Les managers sont maintenant chargés dynamiquement via import() ou construits directement
        // let eventManager;
        // let renderManager;
        // let infoBoxManager;
        // let dataManager;
        // let authManager;
        // CalendarManager (ajouté)
        let calendarManager;

        // --- Maps Management Functions ---
        function loadMapsData() {
            const savedMaps = localStorage.getItem('availableMaps');
            const savedConfig = localStorage.getItem('currentMapConfig');

            if (savedMaps) {
                try {
                    availableMaps = JSON.parse(savedMaps);
                } catch (e) {
                    console.error('Error loading maps data:', e);
                    availableMaps = [];
                }
            }

            if (savedConfig) {
                try {
                    currentMapConfig = JSON.parse(savedConfig);
                } catch (e) {
                    console.error('Error loading map config:', e);
                }
            }

            // Ajouter les cartes par défaut si la liste est vide
            if (availableMaps.length === 0) {
                availableMaps = [
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
                saveMapsData();
            }
        }

        function saveMapsData() {
            localStorage.setItem('availableMaps', JSON.stringify(availableMaps));
            localStorage.setItem('currentMapConfig', JSON.stringify(currentMapConfig));
            scheduleAutoSync();
        }

        function renderMapsGrid() {
            const mapsGrid = document.getElementById('maps-grid');
            if (!mapsGrid) return;

            mapsGrid.innerHTML = availableMaps.map(map => {
                const isActive = (map.type === 'player' && currentMapConfig.playerMap === map.filename) ||
                                (map.type === 'loremaster' && currentMapConfig.loremasterMap === map.filename);

                return `
                    <div class="bg-gray-800 rounded-lg p-3 border ${isActive ? 'border-blue-500' : 'border-gray-600'} relative">
                        ${isActive ? '<div class="absolute top-2 right-2 text-blue-400"><i class="fas fa-check-circle"></i></div>' : ''}
                        <div class="aspect-video bg-gray-700 rounded-lg mb-2 overflow-hidden">
                            <img src="${map.filename}" alt="${map.name}" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiHElaaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjNjc3NDhDIi8+Cjwvc3ZnPg=='">
                        </div>
                        <div class="text-sm font-medium text-white mb-1">${map.name}</div>
                        <div class="text-xs text-gray-400 mb-2">${map.type === 'player' ? 'Carte Joueur' : 'Carte Gardien'}</div>
                        <div class="flex space-x-2">
                            <button class="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs ${isActive ? 'opacity-50 cursor-not-allowed' : ''}"
                                    onclick="setActiveMap('${map.filename}', '${map.type}')"
                                    ${isActive ? 'disabled' : ''}>
                                ${isActive ? 'Active' : 'Activer'}
                            </button>
                            <button class="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs" onclick="editMap(${availableMaps.indexOf(map)})">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${!map.isDefault ? `<button class="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs" onclick="deleteMap(${availableMaps.indexOf(map)})"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function setActiveMap(filename, type) {
            if (type === 'player') {
                currentMapConfig.playerMap = filename;
                // Mettre à jour l'image active
                mapImage.src = filename;
                document.getElementById('active-player-map-preview').src = filename;
            } else if (type === 'loremaster') {
                currentMapConfig.loremasterMap = filename;
                // Mettre à jour l'image du gardien
                loremasterMapImage.src = filename;
                document.getElementById('active-loremaster-map-preview').src = filename;
            }

            saveMapsData();
            renderMapsGrid();
        }

        function openMapModal(editIndex = -1) {
            editingMapIndex = editIndex;
            const modal = document.getElementById('map-modal');
            const title = document.getElementById('map-modal-title');
            const nameInput = document.getElementById('map-name-input');
            const fileInput = document.getElementById('map-file-input');
            const previewContainer = document.getElementById('map-preview-container');
            const previewImage = document.getElementById('map-preview-image');
            const saveText = document.getElementById('save-map-text');

            if (editIndex >= 0) {
                const map = availableMaps[editIndex];
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

        function closeMapModal() {
            document.getElementById('map-modal').classList.add('hidden');
            editingMapIndex = -1;
        }

        function editMap(index) {
            openMapModal(index);
        }

        function deleteMap(index) {
            if (availableMaps[index].isDefault) {
                alert('Impossible de supprimer une carte par défaut.');
                return;
            }

            if (confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) {
                availableMaps.splice(index, 1);
                saveMapsData();
                renderMapsGrid();
            }
        }

        function setupMapsEventListeners() {
            // Bouton ajouter une carte
            document.getElementById('add-map-btn')?.addEventListener('click', () => openMapModal());

            // Boutons de la modal
            document.getElementById('close-map-modal')?.addEventListener('click', closeMapModal);
            document.getElementById('cancel-map-btn')?.addEventListener('click', closeMapModal);
            document.getElementById('save-map-btn')?.addEventListener('click', saveMap);

            // Preview de l'image lors de la sélection
            document.getElementById('map-file-input')?.addEventListener('change', handleMapFileSelect);
        }

        function handleMapFileSelect(event) {
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

        function saveMap() {
            const nameInput = document.getElementById('map-name-input');
            const fileInput = document.getElementById('map-file-input');
            const mapType = document.querySelector('input[name="map-type"]:checked').value;

            if (!nameInput.value.trim()) {
                alert('Veuillez entrer un nom pour la carte.');
                return;
            }

            if (editingMapIndex >= 0) {
                // Modification d'une carte existante
                availableMaps[editingMapIndex].name = nameInput.value.trim();
                availableMaps[editingMapIndex].type = mapType;

                if (fileInput.files.length > 0) {
                    // Nouvelle image sélectionnée
                    const file = fileInput.files[0];
                    const filename = `map_${Date.now()}_${file.name}`;
                    availableMaps[editingMapIndex].filename = filename;

                    // Note: Dans un vrai système, ici on uploadrait le fichier
                    // Pour cette démo, on utilise un data URL
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        availableMaps[editingMapIndex].dataUrl = e.target.result;
                        saveMapsData();
                        renderMapsGrid();
                        closeMapModal();
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

                    availableMaps.push(newMap);
                    saveMapsData();
                    renderMapsGrid();
                    closeMapModal();
                };
                reader.readAsDataURL(file);
                return;
            }

            saveMapsData();
            renderMapsGrid();
            closeMapModal();
        }

        // --- Authentication Debug Logs ---
        function logAuth(message, data = null) {
            console.log(`🔐 [AUTH] ${message}`, data || '');
        }

        // --- HTML Escape Function ---
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // --- Check Google Authentication Status ---
        function checkGoogleAuth() {
            logAuth("Vérification du statut d'authentification...");
            checkAuthStatus();
        }

        // --- Check for authentication errors in URL ---
        function checkAuthError() {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('auth_error') === '1') {
                logAuth("ERREUR: Échec de l'authentification Google détecté dans l'URL");
                alert("Erreur lors de l'authentification Google. Veuillez réessayer.");
                // Nettoyer l'URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (urlParams.get('auth_success') === '1') {
                logAuth("SUCCÈS: Authentification Google réussie détectée dans l'URL");
                // Nettoyer l'URL
                window.history.replaceState({}, document.title, window.location.pathname);
                // Forcer une nouvelle vérification de l'authentification
                setTimeout(() => {
                    checkGoogleAuth();
                }, 1000);
            }
        }

        // --- Toggle Authentication Modal ---
        function toggleAuthModal() {
            logAuth("Basculement de la modal d'authentification");
            const authModal = document.getElementById('auth-modal');
            if (authModal) {
                if (authModal.classList.contains('hidden')) {
                    authModal.classList.remove('hidden');
                    logAuth("Modal d'authentification ouverte");
                } else {
                    authModal.classList.add('hidden');
                    logAuth("Modal d'authentification fermée");
                }
            } else {
                logAuth("Erreur: Modal d'authentification non trouvée!");
            }
        }

        // --- Initialization ---
        async function loadInitialLocations() {
            console.log("Attempting to load locations...");
            const savedData = localStorage.getItem('middleEarthLocations');
            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData);
                    if (parsedData && Array.isArray(parsedData.locations)) {
                       locationsData = parsedData;
                       console.log("✅ Success: Loaded saved locations from localStorage.");
                       return;
                    }
                } catch (e) {
                    console.error("Failed to parse saved locations, will fetch from URL.", e);
                }
            }

            console.log("No valid saved data found. Fetching from URL:", LOCATIONS_URL);
            try {
                // Ajouter un timeout pour éviter les attentes infinies
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout

                const response = await fetch(LOCATIONS_URL, {
                    signal: controller.signal,
                    cache: 'no-cache' // Éviter les problèmes de cache
                });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                if (data && Array.isArray(data.locations)) {
                    locationsData = data;
                    console.log("✅ Success: Loaded default locations from URL.");
                    saveLocationsToLocal();
                } else {
                    throw new Error("Invalid JSON structure from URL");
                }
            } catch (error) {
                console.error("❌ Error fetching locations from URL, using empty list as fallback.", error);
                if (error.name === 'AbortError') {
                    console.error("Request timed out after 10 seconds");
                }
                locationsData = getDefaultLocations();
                // Sauvegarder même la liste vide pour éviter les futures tentatives de chargement
                saveLocationsToLocal();
            }
        }

        function initializeMap() {
            console.log("🗺️ Initializing map...");
            if (mapImage.naturalWidth === 0) {
                console.warn("⚠️ Map image not loaded yet, retrying...");
                return;
            }

            console.log("📐 Map dimensions:", mapImage.naturalWidth, "x", mapImage.naturalHeight);
            MAP_WIDTH = mapImage.naturalWidth;
            MAP_HEIGHT = mapImage.naturalHeight;
            mapContainer.style.width = `${MAP_WIDTH}px`;
            mapContainer.style.height = `${MAP_HEIGHT}px`;
            drawingCanvas.width = MAP_WIDTH;
            drawingCanvas.height = MAP_HEIGHT;
            regionsLayer.setAttribute('width', MAP_WIDTH);
            regionsLayer.setAttribute('height', MAP_HEIGHT);
            regionsLayer.setAttribute('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            renderLocations();
            renderRegions();
            requestAnimationFrame(() => {
                resetView();
                mapImage.classList.remove('opacity-0');
                loaderOverlay.style.opacity = '0';
                setTimeout(() => { loaderOverlay.style.display = 'none'; }, 500);
            });
            preloadLoremasterMap();

            // Initialize VoyageManager
            if (typeof VoyageManager !== 'undefined') {
                voyageManager = new VoyageManager(dom);
                voyageManager.init();
            } else {
                console.warn("VoyageManager is not defined. Voyage features might be unavailable.");
            }

            // Initialize CalendarManager
            if (typeof CalendarManager !== 'undefined') {
                calendarManager = new CalendarManager();
                calendarManager.init();
                console.log("📅 CalendarManager initialized.");
            } else {
                console.warn("CalendarManager is not defined. Calendar features might be unavailable.");
            }

            console.log("✅ Map initialized successfully");
        }

        function preloadLoremasterMap() {
            console.log("Preloading Loremaster map...");
            const lmImage = new Image();
            lmImage.onload = () => {
                console.log("✅ Loremaster map preloaded.");
                loremasterMapImage.src = LOREMASTER_MAP_URL;
                mapSwitchBtn.classList.remove('hidden');
            };
            lmImage.onerror = () => {
                console.error("Failed to preload Loremaster map.");
            };
            lmImage.src = LOREMASTER_MAP_URL;
        }

        // --- Location Markers & Info Box ---
        function renderLocations() {
            locationsLayer.innerHTML = '';
            const filteredLocations = locationsData.locations.filter(location => {
                // Skip locations without coordinates
                if (!location.coordinates || typeof location.coordinates.x === 'undefined' || typeof location.coordinates.y === 'undefined') {
                    return false;
                }
                const knownMatch = !activeFilters.known || location.known;
                const visitedMatch = !activeFilters.visited || location.visited;
                const colorMatch = activeFilters.colors.length === 0 || activeFilters.colors.includes(location.color);
                return knownMatch && visitedMatch && colorMatch;
            });

            filteredLocations.forEach(location => {
                const marker = document.createElement('div');
                marker.className = 'location-marker';
                marker.style.left = `${location.coordinates.x}px`;
                marker.style.top = `${location.coordinates.y}px`;
                marker.style.backgroundColor = location.known ? (colorMap[location.color] || colorMap.red) : 'rgba(107, 114, 128, 0.7)';
                marker.style.borderColor = location.visited ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
                marker.dataset.id = location.id;

                // Configure pointer events based on current mode
                if (isDrawingMode) {
                    marker.style.pointerEvents = 'none';
                } else {
                    marker.style.pointerEvents = 'auto';

                    // Only allow dragging when not in any special mode
                    if (!isAddingLocationMode && !isAddingRegionMode) {
                        marker.addEventListener('mousedown', startDragMarker);
                    }

                    marker.addEventListener('click', (e) => {
                        if (e.detail > 0) {
                            if (!isAddingLocationMode && !isAddingRegionMode) {
                                // Show info box normally
                                showInfoBox(e);
                            }
                        }
                    });

                    // Ajouter le tooltip au survol
                    marker.title = location.name;
                }

                locationsLayer.appendChild(marker);
            });
        }

        function showInfoBox(event) {
            const marker = event.currentTarget;
            activeLocationId = parseInt(marker.dataset.id, 10);
            const location = locationsData.locations.find(loc => loc.id === activeLocationId);
            if (!location) return;

            // Update image tab content
            const imageTab = document.getElementById('image-tab');
            const images = getLocationImages(location);

            if (images.length > 0) {
                if (infoBox.classList.contains('expanded') && images.length > 1) {
                    // Multi-tab view for expanded mode with multiple images
                    const imageTabs = images.map((img, index) =>
                        `<button class="image-tab-button ${index === 0 ? 'active' : ''}" data-image-index="${index}">Image ${index + 1}</button>`
                    ).join('');

                    const imageContents = images.map((img, index) =>
                        `<div class="image-content ${index === 0 ? 'active' : ''}" data-image-index="${index}">
                            <div class="image-view">
                                <img src="${img}" alt="${location.name}" title="${img.split('/').pop()}" onerror="handleImageError(this)">
                            </div>
                        </div>`
                    ).join('');

                    imageTab.innerHTML = `
                        <div class="image-tabs-container">
                            <div class="image-tabs">${imageTabs}</div>
                            <div class="image-contents">${imageContents}</div>
                        </div>
                    `;

                    setupImageTabSwitching();
                    setupImageClickHandlers();
                } else {
                    // Single image view (compact mode or single image)
                    const defaultImage = getDefaultLocationImage(location);
                    const titleHtml = !infoBox.classList.contains('expanded') ? `<div class="compact-title">
                                    <span style="font-family: 'Merriweather', serif;">${location.name}</span>
                                </div>` : '';
                    imageTab.innerHTML = `
                        <div class="image-view">
                            ${titleHtml}
                            <img src="${defaultImage}" alt="${location.name}" title="${defaultImage.split('/').pop()}" onerror="handleImageError(this)" class="modal-image">
                        </div>
                    `;
                    setupImageClickHandlers();
                }
            } else {
                // No image - show title instead of placeholder in compact mode
                if (!infoBox.classList.contains('expanded')) {
                    imageTab.innerHTML = `
                        <div class="image-view">
                            <div class="compact-title">
                                <span style="font-family: 'Merriweather', serif;">${location.name}</span>
                            </div>
                        </div>
                    `;
                } else {
                    imageTab.innerHTML = `
                        <div class="image-view">
                            <div class="image-placeholder">Aucune image disponible</div>
                        </div>
                    `;
                }
            }

            // Update text tab content
            const textTab = document.getElementById('text-tab');
            textTab.innerHTML = `
                <div class="text-view">
                    <h3>${location.name}</h3>
                    <p>${location.description || 'Aucune description.'}</p>
                </div>
            `;

            // Update rumeurs tab content
            const rumeursTab = document.getElementById('rumeurs-tab');
            rumeursTab.innerHTML = `
                <div class="text-view">
                    <h3>Rumeurs</h3>
                    <p>${location.Rumeur || 'Aucune rumeur connue.'}</p>
                </div>
            `;

            // Update tradition tab content
            const traditionTab = document.getElementById('tradition-tab');
            traditionTab.innerHTML = `
                <div class="text-view">
                    <h3>Tradition Ancienne</h3>
                    <p>${location.Tradition_Ancienne || 'Aucune tradition ancienne connue.'}</p>
                </div>
            `;

            // Update header title
            updateInfoBoxHeaderTitle(location.name);

            // Show the info box
            document.getElementById('info-box-edit-content').classList.add('hidden');
            document.getElementById('info-box-content').classList.remove('hidden');

            infoBox.style.display = 'block';
            // Ouvrir en mode étendu par défaut
            if (!infoBox.classList.contains('expanded')) {
                infoBox.classList.add('expanded');
                const expandBtn = document.getElementById('info-box-expand');
                if (expandBtn) {
                    expandBtn.className = 'fas fa-compress';
                    expandBtn.title = 'Vue compacte';
                }
                const titleElement = document.getElementById('info-box-title');
                const deleteBtn = document.getElementById('info-box-delete');
                titleElement.classList.remove('hidden');
                deleteBtn.classList.remove('hidden');
            }
            positionInfoBoxExpanded();

            // Set up tab switching
            setupTabSwitching();
            // Set up event listeners for locations
            setupInfoBoxEventListeners('location', location.id);
        }

        function hideInfoBox() {
            infoBox.style.display = 'none';
            activeLocationId = null;
        }

        // Function to properly manage event listeners to avoid accumulation
        function setupInfoBoxEventListeners(type, itemId) {
            // Get references to the buttons
            const editBtn = document.getElementById('info-box-edit');
            const deleteBtn = document.getElementById('info-box-delete');
            const expandBtn = document.getElementById('info-box-expand');

            // Clone and replace buttons to remove all existing event listeners
            if (editBtn) {
                const newEditBtn = editBtn.cloneNode(true);
                editBtn.parentNode.replaceChild(newEditBtn, editBtn);
            }
            if (deleteBtn) {
                const newDeleteBtn = deleteBtn.cloneNode(true);
                deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
            }
            if (expandBtn) {
                const newExpandBtn = expandBtn.cloneNode(true);
                expandBtn.parentNode.replaceChild(newExpandBtn, expandBtn);
            }

            // Add fresh event listeners
            const freshEditBtn = document.getElementById('info-box-edit');
            const freshDeleteBtn = document.getElementById('info-box-delete');
            const freshExpandBtn = document.getElementById('info-box-expand');

            if (type === 'location') {
                if (freshEditBtn) freshEditBtn.addEventListener('click', enterEditMode);
                if (freshDeleteBtn) freshDeleteBtn.addEventListener('click', () => deleteLocation(itemId));
            } else if (type === 'region') {
                if (freshEditBtn) freshEditBtn.addEventListener('click', enterRegionEditMode);
                if (freshDeleteBtn) freshDeleteBtn.addEventListener('click', () => deleteRegion(itemId));
            }

            if (freshExpandBtn) freshExpandBtn.addEventListener('click', toggleInfoBoxExpand);
        }

        function setupTabSwitching() {
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');

            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const targetTab = button.dataset.tab;
                    activateTab(targetTab);
                });
            });
        }

        function activateTab(tabName) {
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');

            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

            // Update active tab content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabName}-tab`).classList.add('active');
        }

        function handleImageError(imgElement) {
            imgElement.parentElement.innerHTML = '<div class="image-placeholder">Erreur de chargement de l\'image</div>';
        }

        function getLocationImages(location) {
            // Support both old format (imageUrl) and new format (images array)
            if (location.images && Array.isArray(location.images)) {
                return location.images.map(img => img.url).filter(url => url);
            } else if (location.imageUrl) {
                return [location.imageUrl];
            }
            return [];
        }

        function getDefaultLocationImage(location) {
            if (location.images && Array.isArray(location.images)) {
                const defaultImg = location.images.find(img => img.isDefault);
                return defaultImg ? defaultImg.url : (location.images[0] ? location.images[0].url : '');
            } else if (location.imageUrl) {
                return location.imageUrl;
            }
            return '';
        }

        function setupImageTabSwitching() {
            const imageTabButtons = document.querySelectorAll('.image-tab-button');
            const imageContents = document.querySelectorAll('.image-content');

            imageTabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const targetIndex = button.dataset.imageIndex;

                    // Update active tab button
                    imageTabButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');

                    // Update active image content
                    imageContents.forEach(content => content.classList.remove('active'));
                    document.querySelector(`[data-image-index="${targetIndex}"].image-content`).classList.add('active');
                });
            });
        }

        function setupImageClickHandlers() {
            // Add click listener to make images toggle fullscreen
            document.querySelectorAll('.modal-image').forEach(img => {
                img.addEventListener('click', (e) => {
                    // Prevent event from propagating to parent elements if needed
                    e.stopPropagation();

                    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

                    if (!isFullscreen) {
                        // Request fullscreen
                        const element = img.parentElement.parentElement; // Go up to the .image-view or .image-content container
                        if (element.requestFullscreen) {
                            element.requestFullscreen();
                        } else if (element.webkitRequestFullscreen) { /* Safari */
                            element.webkitRequestFullscreen();
                        } else if (element.mozRequestFullScreen) { /* Firefox */
                            element.mozRequestFullScreen();
                        } else if (element.msRequestFullscreen) { /* IE11 */
                            element.msRequestFullscreen();
                        }
                    } else {
                        // Exit fullscreen
                        if (document.exitFullscreen) {
                            document.exitFullscreen();
                        } else if (document.webkitExitFullscreen) { /* Safari */
                            document.webkitExitFullscreen();
                        } else if (document.mozCancelFullScreen) { /* Firefox */
                            document.mozCancelFullScreen();
                        } else if (document.msExitFullscreen) { /* IE11 */
                            document.msExitFullscreen();
                        }
                    }
                });
            });
        }


        function getRegionImages(region) {
            if (region.images && Array.isArray(region.images)) {
                return region.images.map(img => img.url).filter(url => url);
            }
            return [];
        }

        function getDefaultRegionImage(region) {
            if (region.images && Array.isArray(region.images)) {
                const defaultImg = region.images.find(img => img.isDefault);
                return defaultImg ? defaultImg.url : (region.images[0] ? region.images[0].url : '');
            }
            return '';
        }

        function startDrawingFromLocation(event, location) {
            console.log("🎯 Starting drawing from location:", location.name);

            // Convert location coordinates to canvas coordinates
            const canvasCoords = {
                x: location.coordinates.x,
                y: location.coordinates.y
            };

            console.log("📍 Canvas coordinates:", canvasCoords);

            // Clear any existing drawing
            ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

            // Reset journey tracking
            journeyPath = [];
            traversedRegions.clear();
            nearbyLocations.clear();
            journeyDiscoveries = [];

            // Start drawing from this location
            isDrawing = true;
            totalPathPixels = 0;
            startPoint = canvasCoords;
            lastPoint = canvasCoords;

            // Add start point to journey path
            journeyPath.push({x: canvasCoords.x, y: canvasCoords.y});

            // Draw a small circle to show the starting point
            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.beginPath();
            ctx.arc(lastPoint.x, lastPoint.y, 4, 0, 2 * Math.PI);
            ctx.fill();

            // Begin the path again for the line
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);

            // Update distance display
            updateDistanceDisplay();

            // Show distance container
            distanceContainer.classList.remove('hidden');

            console.log("✅ Drawing started successfully");
        }

        function enterEditMode() {
            const location = locationsData.locations.find(loc => loc.id === activeLocationId);
            if (!location) return;

            // Mark the info box as being in edit mode
            infoBox.dataset.editMode = 'true';

            // Update image tab to show image editing interface
            updateImageTabForEdit(location);

            // Update text tab to show text editing interface
            updateTextTabForEdit(location);

            // Update rumeurs tab to show rumeurs editing interface
            updateRumeursTabForEdit(location);

            // Update tradition tab to show tradition editing interface
            updateTraditionTabForEdit(location);

            // Add edit controls at the bottom
            addEditControls();
        }

        function updateImageTabForEdit(location) {
            const imageTab = document.getElementById('image-tab');
            const images = location.images || [];
            const imagesHtml = generateImageEditHTML(images);

            const colorPickerHtml = Object.keys(colorMap).map(color =>
                `<div class="color-swatch ${location.color === color ? 'selected' : ''}" data-color="${color}" style="background-color: ${colorMap[color]}"></div>`
            ).join('');

            imageTab.innerHTML = `
                <div class="space-y-4">
                    <div class="bg-gray-700 p-3 rounded-md">
                        <label class="block text-sm font-medium text-gray-300 mb-2">Images (max 5)</label>
                        <div id="edit-images-container">${imagesHtml}</div>
                        <button id="add-image-btn" class="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm">Ajouter une image</button>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Couleur</label>
                        <div class="flex space-x-2" id="edit-color-picker">${colorPickerHtml}</div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="flex items-center">
                            <input id="edit-known" type="checkbox" ${location.known ? 'checked' : ''} class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                            <label for="edit-known" class="ml-2 block text-sm text-gray-300">Connu</label>
                        </div>
                        <div class="flex items-center">
                            <input id="edit-visited" type="checkbox" ${location.visited ? 'checked' : ''} class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                            <label for="edit-visited" class="ml-2 block text-sm text-gray-300">Visité</label>
                        </div>
                    </div>
                </div>
            `;

            setupImageEditListeners();
            setupColorPickerListeners();
            setupStatusCheckboxListeners();
        }

        function updateTextTabForEdit(location) {
            const textTab = document.getElementById('text-tab');
            textTab.innerHTML = `
                <div class="text-view space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Nom</label>
                        <input type="text" id="edit-name" value="${location.name}" placeholder="Nom" class="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <div class="flex items-start space-x-2">
                            <textarea id="edit-desc" rows="4" placeholder="Description" class="flex-1 bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white">${location.description || ''}</textarea>
                            <button id="generate-edit-desc" class="p-2 bg-purple-600 hover:bg-purple-700 rounded-md" title="Générer une description"><span class="gemini-icon">✨</span></button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('generate-edit-desc').addEventListener('click', handleGenerateDescription);
        }

        function updateRumeursTabForEdit(location) {
            const rumeursTab = document.getElementById('rumeurs-tab');
            rumeursTab.innerHTML = `
                <div class="text-view space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Rumeurs</label>
                        <textarea id="edit-rumeur" rows="6" placeholder="Rumeur" class="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white">${location.Rumeur || ''}</textarea>
                    </div>
                </div>
            `;
        }

        function updateTraditionTabForEdit(location) {
            const traditionTab = document.getElementById('tradition-tab');
            traditionTab.innerHTML = `
                <div class="text-view space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Tradition Ancienne</label>
                        <textarea id="edit-tradition" rows="6" placeholder="Tradition Ancienne" class="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white">${location.Tradition_Ancienne || ''}</textarea>
                    </div>
                </div>
            `;
        }

        function addEditControls() {
            // Add save/cancel buttons at the bottom of the scroll wrapper
            const scrollWrapper = document.getElementById('info-box-scroll-wrapper');
            let editControls = document.getElementById('edit-controls');

            if (!editControls) {
                editControls = document.createElement('div');
                editControls.id = 'edit-controls';
                editControls.className = 'mt-4 pt-4 border-t border-gray-600 flex justify-end space-x-2 bg-gray-900 sticky bottom-0';
                scrollWrapper.appendChild(editControls);
            }

            editControls.innerHTML = `
                <button id="cancel-edit" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-sm">Annuler</button>
                <button id="save-edit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm">Sauver</button>
            `;

            document.getElementById('save-edit').addEventListener('click', saveEdit);
            document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
        }

        function setupColorPickerListeners() {
            document.getElementById('edit-color-picker').querySelectorAll('.color-swatch').forEach(swatch => {
                swatch.addEventListener('click', () => {
                    document.querySelector('#edit-color-picker .color-swatch.selected').classList.remove('selected');
                    swatch.classList.add('selected');
                });
            });
        }

        function setupStatusCheckboxListeners() {
            document.getElementById('edit-visited').addEventListener('change', (e) => {
                if (e.target.checked) {
                    document.getElementById('edit-known').checked = true;
                }
            });
        }

        function collectImagesFromEdit() {
            const container = document.getElementById('edit-images-container');
            const images = [];

            container.querySelectorAll('.image-edit-item').forEach(item => {
                const url = item.querySelector('.image-url-input').value.trim();
                const isDefault = item.querySelector('.default-image-checkbox').checked;

                if (url) {
                    images.push({ url, isDefault });
                }
            });

            // Ensure at least one default if images exist
            if (images.length > 0 && !images.some(img => img.isDefault)) {
                images[0].isDefault = true;
            }

            return images;
        }

        function saveEdit() {
            const location = locationsData.locations.find(loc => loc.id === activeLocationId);
            if (!location) return;

            location.name = document.getElementById('edit-name').value;
            location.description = document.getElementById('edit-desc').value;
            location.Rumeur = document.getElementById('edit-rumeur').value || 'A définir';
            location.Tradition_Ancienne = document.getElementById('edit-tradition').value || 'A définir';
            location.color = document.querySelector('#edit-color-picker .color-swatch.selected').dataset.color;
            location.known = document.getElementById('edit-known').checked;
            location.visited = document.getElementById('edit-visited').checked;

            // Handle images
            const images = collectImagesFromEdit();
            if (images.length > 0) {
                location.images = images;
                // Remove old imageUrl if exists
                delete location.imageUrl;
            } else {
                // No images, remove both old and new format
                delete location.images;
                delete location.imageUrl;
            }

            saveLocationsToLocal();
            renderLocations();
            hideInfoBox();
        }

        function cancelEdit() {
            // Remove edit mode flag
            delete infoBox.dataset.editMode;

            // Remove edit controls
            const editControls = document.getElementById('edit-controls');
            if (editControls) {
                editControls.remove();
            }

            // Re-show the location info without edit mode
            const location = locationsData.locations.find(loc => loc.id === activeLocationId);
            if (location) {
                showLocationContent(location);
            }
        }

        function showLocationContent(location) {
            // Update image tab content
            const imageTab = document.getElementById('image-tab');
            const images = getLocationImages(location);

            if (images.length > 0) {
                if (infoBox.classList.contains('expanded') && images.length > 1) {
                    // Multi-tab view for expanded mode with multiple images
                    const imageTabs = images.map((img, index) =>
                        `<button class="image-tab-button ${index === 0 ? 'active' : ''}" data-image-index="${index}">Image ${index + 1}</button>`
                    ).join('');

                    const imageContents = images.map((img, index) =>
                        `<div class="image-content ${index === 0 ? 'active' : ''}" data-image-index="${index}">
                            <div class="image-view">
                                <img src="${img}" alt="${location.name}" title="${img.split('/').pop()}" onerror="handleImageError(this)">
                            </div>
                        </div>`
                    ).join('');

                    imageTab.innerHTML = `
                        <div class="image-tabs-container">
                            <div class="image-tabs">${imageTabs}</div>
                            <div class="image-contents">${imageContents}</div>
                        </div>
                    `;

                    setupImageTabSwitching();
                    setupImageClickHandlers();
                } else {
                    // Single image view (compact mode or single image)
                    const defaultImage = getDefaultLocationImage(location);
                    const titleHtml = !infoBox.classList.contains('expanded') ? `<div class="compact-title">
                                    <span style="font-family: 'Merriweather', serif;">${location.name}</span>
                                </div>` : '';
                    imageTab.innerHTML = `
                        <div class="image-view">
                            ${titleHtml}
                            <img src="${defaultImage}" alt="${location.name}" title="${defaultImage.split('/').pop()}" onerror="handleImageError(this)" class="modal-image">
                        </div>
                    `;
                    setupImageClickHandlers();
                }
            } else {
                // No image - show title instead of placeholder in compact mode
                if (!infoBox.classList.contains('expanded')) {
                    imageTab.innerHTML = `
                        <div class="image-view">
                            <div class="compact-title">
                                <span style="font-family: 'Merriweather', serif;">${location.name}</span>
                            </div>
                        </div>
                    `;
                } else {
                    imageTab.innerHTML = `
                        <div class="image-view">
                            <div class="image-placeholder">Aucune image disponible</div>
                        </div>
                    `;
                }
            }

            // Update text tab content
            const textTab = document.getElementById('text-tab');
            textTab.innerHTML = `
                <div class="text-view">
                    <h3>${location.name}</h3>
                    <p>${location.description || 'Aucune description.'}</p>
                </div>
            `;

            // Update rumeurs tab content
            const rumeursTab = document.getElementById('rumeurs-tab');
            rumeursTab.innerHTML = `
                <div class="text-view">
                    <h3>Rumeurs</h3>
                    <p>${location.Rumeur || 'Aucune rumeur connue.'}</p>
                </div>
            `;

            // Update tradition tab content
            const traditionTab = document.getElementById('tradition-tab');
            traditionTab.innerHTML = `
                <div class="text-view">
                    <h3>Tradition Ancienne</h3>
                    <p>${location.Tradition_Ancienne || 'Aucune tradition ancienne connue.'}</p>
                </div>
            `;
        }

        // --- Info box sizing/positioning ---
        function getToolbarRect() {
            const toolbar = document.getElementById('toolbar');
            return toolbar ? toolbar.getBoundingClientRect() : { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
        }

        function positionInfoBoxCompact(event) {
            const vpRect = viewport.getBoundingClientRect();
            const tbRect = getToolbarRect();
            const margin = 16;

            // Dimensions estimées de la boîte d'information
            const boxWidth = 280;
            const boxHeight = 250;

            // Centrer horizontalement, mais éviter la toolbar
            const centeredLeft = Math.floor((vpRect.width - boxWidth) / 2);
            const minLeft = tbRect.right - vpRect.left + margin;
            const left = Math.max(centeredLeft, minLeft);

            // Centrer verticalement
            const top = Math.floor((vpRect.height - boxHeight) / 2);

            infoBox.style.left = `${left}px`;
            infoBox.style.top = `${top}px`;
            infoBox.style.width = '';
            infoBox.style.height = '';
            infoBox.style.maxWidth = '280px';
            const scrollWrapper = document.getElementById('info-box-scroll-wrapper');
            if (scrollWrapper) {
                scrollWrapper.style.maxHeight = '250px';
                scrollWrapper.style.height = '';
            }
        }

        function positionInfoBoxExpanded() {
            const vpRect = viewport.getBoundingClientRect();
            const tbRect = getToolbarRect();
            const margin = 16;

            // Use 90% of viewport dimensions
            const desiredWidth = Math.floor(vpRect.width * 0.9);
            const desiredHeight = Math.floor(vpRect.height * 0.9);

            // Ensure it doesn't cover the toolbar
            const availableRightOfToolbar = Math.floor(vpRect.width - (tbRect.right - vpRect.left) - margin);
            const finalWidth = Math.min(desiredWidth, availableRightOfToolbar);

            // Center horizontally, but ensure it's to the right of the toolbar
            const centeredLeft = Math.floor((vpRect.width - finalWidth) / 2);
            const minLeft = Math.max(margin, tbRect.right - vpRect.left + margin);
            const left = Math.max(centeredLeft, minLeft);

            // Center vertically
            const top = Math.floor((vpRect.height - desiredHeight) / 2);

            infoBox.style.left = `${left}px`;
            infoBox.style.top = `${top}px`;
            infoBox.style.width = `${finalWidth}px`;
            infoBox.style.height = `${desiredHeight}px`;
            infoBox.style.maxWidth = 'none';

            const scrollWrapper = document.getElementById('info-box-scroll-wrapper');
            if (scrollWrapper) {
                scrollWrapper.style.maxHeight = 'none';
                scrollWrapper.style.height = 'calc(100% - 3rem)';
            }
        }

        function updateInfoBoxHeaderTitle(title) {
            const titleElement = document.getElementById('info-box-title');
            titleElement.textContent = title;

            // Show title only in expanded mode
            if (infoBox.classList.contains('expanded')) {
                titleElement.classList.remove('hidden');
            } else {
                titleElement.classList.add('hidden');
            }
        }

        function toggleInfoBoxExpand() {
            const isExpanded = infoBox.toggle('expanded');
            const expandBtn = document.getElementById('info-box-expand');
            const titleElement = document.getElementById('info-box-title');

            if (expandBtn) {
                expandBtn.className = `fas ${isExpanded ? 'fa-compress' : 'fa-expand'}`;
                expandBtn.title = isExpanded ? 'Vue compacte' : 'Vue étendue';
            }

            // Show/hide title and delete button based on expanded state
            const deleteBtn = document.getElementById('info-box-delete');
            if (isExpanded) {
                titleElement.classList.remove('hidden');
                deleteBtn.classList.remove('hidden');
                positionInfoBoxExpanded();
                // Activate image tab by default when expanding
                activateTab('image');
            } else {
                titleElement.classList.add('hidden');
                deleteBtn.classList.add('hidden');
                // Return to compact mode positioning (centered)
                positionInfoBoxCompact();
            }
        }

        window.addEventListener('resize', () => {
            if (infoBox.style.display === 'block' && infoBox.classList.contains('expanded')) {
                positionInfoBoxExpanded();
            }
        });

        // Handle escape key to close info box
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && infoBox.style.display === 'block') {
                hideInfoBox();
            }
        });

        // --- Auto-sync Functions ---
        function enableAutoSync() {
            if (currentUser) {
                autoSyncEnabled = true;
                loadUserData();
                console.log("✅ Auto-sync activé");
                updateSyncStatus("Synchronisation automatique activée.");
            }
        }

        function disableAutoSync() {
            autoSyncEnabled = false;
            console.log("❌ Auto-sync désactivé");
            updateSyncStatus("Synchronisation automatique désactivée.");
        }

        function scheduleAutoSync() {
            if (!autoSyncEnabled || !currentUser) return;

            // Debounce: attendre 2 secondes après la dernière modification
            clearTimeout(window.autoSyncTimeout);
            window.autoSyncTimeout = setTimeout(() => {
                autoSyncUserData();
            }, SYNC_DELAY);
        }

        // --- Calendar Functions ---
        // Les fonctions relatives au calendrier sont maintenant gérées par CalendarManager

        // --- Season Functions ---
        function updateSeasonDisplay() {
            if (calendarManager) {
                calendarManager.updateSeasonDisplay();
            }
        }

        function loadSavedSeason() {
            if (calendarManager) {
                calendarManager.loadSavedSeason();
            }
        }

        // --- Auto-sync Functions ---
        async function autoSyncUserData() {
            if (!currentUser || !autoSyncEnabled) return;

            const userData = {
                locations: locationsData,
                regions: regionsData,
                scale: scale,
                panX: panX,
                panY: panY,
                activeFilters: activeFilters,
                filters: activeFilters, // Ajout explicite des filtres pour compatibilité
                journeyPath: journeyPath,
                totalPathPixels: totalPathPixels,
                startPoint: startPoint,
                lastPoint: lastPoint,
                journeyDiscoveries: journeyDiscoveries, // Included journey discoveries
                currentSeason: currentSeason, // Include season data
                // Calendar data is now managed by CalendarManager
                // calendarData: calendarData,
                // currentCalendarDate: currentCalendarDate,
                // isCalendarMode: isCalendarMode
            };

            // Include calendar data from CalendarManager if it exists
            if (typeof calendarManager !== 'undefined') {
                userData.calendarData = calendarManager.getCalendarData();
                userData.currentCalendarDate = calendarManager.getCurrentCalendarDate();
                userData.isCalendarMode = calendarManager.getIsCalendarMode();
            }

            console.log("🔄 Synchronisation des données:", {
                journeyPathLength: journeyPath.length,
                totalPathPixels: totalPathPixels,
                hasStartPoint: !!startPoint,
                hasLastPoint: !!lastPoint,
                currentSeason: currentSeason,
                isCalendarMode: typeof calendarManager !== 'undefined' ? calendarManager.getIsCalendarMode() : 'N/A'
            });

            try {
                const response = await fetch('/api/user/data', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });

                if (response.ok) {
                    lastSyncTime = Date.now();
                    console.log("✅ Données utilisateur synchronisées automatiquement (tracé et saison inclus)");
                } else {
                    console.error("❌ Erreur lors de la synchronisation automatique");
                }
            } catch (error) {
                console.error("❌ Erreur réseau lors de la synchronisation:", error);
            }
        }

        async function loadUserData() {
            if (!currentUser) return;

            try {
                const response = await fetch('/api/user/data');
                if (response.ok) {
                    const userData = await response.json();

                    // Charger les données utilisateur
                    if (userData.locations) {
                        locationsData = userData.locations;
                        console.log("📍 Lieux utilisateur chargés");
                    }
                    if (userData.regions) {
                        regionsData = userData.regions;
                        console.log("🗺️ Régions utilisateur chargées");
                    }
                    if (userData.scale) {
                        scale = userData.scale;
                        panX = userData.panX || 0;
                        panY = userData.panY || 0;
                        console.log("🔍 Vue utilisateur restaurée");
                    }
                    if (userData.activeFilters) {
                        activeFilters = userData.activeFilters;
                        console.log("🔍 Filtres utilisateur restaurés");
                    }

                    // Charger les tracés de voyage
                    if (userData.journeyPath && Array.isArray(userData.journeyPath)) {
                        journeyPath = userData.journeyPath;
                        totalPathPixels = userData.totalPathPixels || 0;
                        startPoint = userData.startPoint || null;
                        lastPoint = userData.lastPoint || null;

                        // Charger les découvertes de voyage
                        if (userData.journeyDiscoveries && Array.isArray(userData.journeyDiscoveries)) {
                            journeyDiscoveries = userData.journeyDiscoveries;
                            console.log("🌟 Découvertes de voyage chargées");
                        }

                        // Redessiner le tracé sur le canvas
                        if (journeyPath.length > 0) {
                            ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                            ctx.beginPath();
                            ctx.moveTo(journeyPath[0].x, journeyPath[0].y);

                            for (let i = 1; i < journeyPath.length; i++) {
                                ctx.lineTo(journeyPath[i].x, journeyPath[i].y);
                            }
                            ctx.stroke();

                            // Mettre à jour l'affichage des distances
                            updateDistanceDisplay();
                            // Réinitialiser les régions traversées et lieux proches
                            updateJourneyInfo();
                        }

                        console.log("🎨 Tracé de voyage restauré");
                    }

                    // Charger les filtres depuis le cloud
                    if (userData.filters) {
                        activeFilters = userData.filters;
                        console.log("🔍 Filtres utilisateur chargés depuis le cloud");
                        // Sauvegarder localement pour synchronisation
                        saveFiltersToLocal();
                    }

                    // Charger la saison depuis le cloud
                    if (userData.currentSeason && seasonNames[userData.currentSeason]) {
                        currentSeason = userData.currentSeason;
                        localStorage.setItem('currentSeason', currentSeason);
                        console.log("🌱 Saison utilisateur chargée depuis le cloud:", currentSeason);
                    }

                    // Charger le calendrier depuis le cloud (via CalendarManager)
                    if (typeof calendarManager !== 'undefined') {
                        if (userData.calendarData) {
                            calendarManager.setCalendarData(userData.calendarData);
                            console.log("📅 Calendrier utilisateur chargé depuis le cloud");
                        }
                        if (userData.currentCalendarDate) {
                            calendarManager.setCurrentCalendarDate(userData.currentCalendarDate);
                            console.log("📅 Date calendrier utilisateur chargée depuis le cloud");
                        }
                        if (userData.isCalendarMode !== undefined) {
                            calendarManager.setIsCalendarMode(userData.isCalendarMode);
                            console.log("📅 Mode calendrier utilisateur chargé depuis le cloud:", userData.isCalendarMode);
                        }
                    }

                    // Re-render everything
                    renderLocations();
                    renderRegions();
                    applyTransform();
                    updateFiltersUI();
                    updateSeasonDisplay();

                    console.log("✅ Données utilisateur complètement chargées");
                } else if (response.status === 404) {
                    console.log("ℹ️ Aucune donnée utilisateur trouvée, utilisation des données par défaut");
                }
            } catch (error) {
                console.error("Erreur lors du chargement des données utilisateur:", error);
            }
        }

        function updateFiltersUI() {
            // Mettre à jour l'interface des filtres
            document.getElementById('filter-known').checked = activeFilters.known;
            document.getElementById('filter-visited').checked = activeFilters.visited;
            document.getElementById('filter-show-regions').checked = true;
            document.querySelectorAll('.filter-color-checkbox').forEach(cb => {
                cb.checked = activeFilters.colors.includes(cb.dataset.color);
            });

            // Sauvegarder les filtres après mise à jour
            saveFiltersToLocal();
        }

        // --- Start the app ---
        // Ensure the app starts only once when the DOM is ready
        function initializeApp() {
            // Global error handlers
            window.addEventListener('unhandledrejection', function(event) {
                console.error('⚠️ Promesse rejetée non gérée:', event.reason);
                event.preventDefault();
            });

            window.addEventListener('error', function(event) {
                console.error('⚠️ Erreur JavaScript:', event.error);
            });

            console.log('🚀 Starting application...');

            // Global timeout for the application startup
            const startTimeout = setTimeout(() => {
                if (loaderOverlay && loaderOverlay.style.display !== 'none') {
                    console.error("❌ Application startup timed out");
                    loaderOverlay.innerHTML = `<div class="text-2xl text-red-500 text-center p-4">
                        <i class="fas fa-exclamation-triangle mb-4 text-4xl"></i><br>
                        Temps de chargement dépassé.<br>
                        <span class="text-sm text-gray-400 mt-2">Vérifiez votre connexion et les fichiers requis.</span><br>
                        <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">Recharger</button>
                    </div>`;
                }
            }, 30000); // 30 seconds timeout

            // Check for authentication errors in the URL
            checkAuthError();

            loadInitialLocations().then(() => {
                loadRegionsFromLocal();
                loadSavedContexts();
                setupFilters();
                // Load season at startup
                // loadSavedSeason(); // This is now handled by CalendarManager init
                loadMapsData(); // Load maps data at startup
                logAuth("Initialisation de l'authentification...");

                // Initialize authentication after a short delay to ensure DOM is ready
                setTimeout(() => {
                    checkGoogleAuth();
                }, 100);

                if (mapImage) {
                    mapImage.onload = () => {
                        clearTimeout(startTimeout);
                        initializeMap();
                    };
                    mapImage.addEventListener('error', () => {
                        clearTimeout(startTimeout);
                        handleMapImageError();
                    });

                    console.log("🗺️ Loading map image:", PLAYER_MAP_URL);
                    mapImage.src = PLAYER_MAP_URL;
                }

                if (infoBoxClose) {
                    infoBoxClose.addEventListener('click', hideInfoBox);
                }

                logAuth("Configuration des event listeners d'authentification...");
                setupAuthEventListeners();

                // Setup settings event listeners
                setupSettingsEventListeners();

                // Test DOM elements after a delay
                setTimeout(() => {
                    logAuth("=== TEST DES ÉLÉMENTS DOM ===");
                    logAuth("authModal element:", !!document.getElementById('auth-modal'));
                    logAuth("auth-btn element:", !!document.getElementById('auth-btn'));
                    logAuth("close-auth-modal element:", !!document.getElementById('close-auth-modal'));
                    logAuth("google-signin-btn element:", !!document.getElementById('google-signin-btn'));
                    logAuth("save-context-btn element:", !!document.getElementById('save-context-btn'));
                    logAuth("settings-btn element:", !!document.getElementById('settings-btn'));
                    logAuth("settings-modal element:", !!document.getElementById('settings-modal'));
                    logAuth("close-settings-modal element:", !!document.getElementById('close-settings-modal'));

                    const testAuthBtn = document.getElementById('auth-btn');
                    if (testAuthBtn) {
                        logAuth("Bouton auth visible:", testAuthBtn.offsetParent !== null);
                        logAuth("Bouton auth cliquable:", !testAuthBtn.disabled);
                        logAuth("Classes du bouton auth:", testAuthBtn.className);
                    }
                    logAuth("=== FIN TEST DES ÉLÉMENTS DOM ===");
                }, 2000);

            }).catch(error => {
                clearTimeout(startTimeout);
                console.error("❌ Error during app startup:", error);
                if (loaderOverlay) {
                    loaderOverlay.innerHTML = `<div class="text-2xl text-red-500 text-center p-4"><i class="fas fa-exclamation-triangle mb-4 text-4xl"></i><br>Erreur lors du démarrage.<br><button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">Recharger</button></div>`;
                }
            });

            // Region modal handlers with null checks
            const confirmAddRegionBtn = document.getElementById('confirm-add-region');
            const cancelAddRegionBtn = document.getElementById('cancel-add-region');

            if (confirmAddRegionBtn) {
                confirmAddRegionBtn.addEventListener('click', saveRegion);
            }

            if (cancelAddRegionBtn) {
                cancelAddRegionBtn.addEventListener('click', () => {
                    if (addRegionModal) {
                        addRegionModal.classList.add('hidden');
                    }
                    cancelRegionCreation();
                });
            }

            // Double-click to complete region
            if (viewport) {
                viewport.addEventListener('dblclick', (event) => {
                    if (isAddingRegionMode && currentRegionPoints.length >= 3) {
                        event.preventDefault();
                        completeRegion();
                    }
                });
            }
        }

        // --- Region Functions ---
        function renderRegions() {
            regionsLayer.innerHTML = '';

            regionsData.regions.forEach(region => {
                if (region.points && region.points.length >= 3) {
                    const pathData = `M ${region.points.map(p => `${p.x},${p.y}`).join(' L ')} Z`;
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', pathData);
                    path.classList.add('region');
                    path.style.fill = regionColorMap[region.color] || regionColorMap.green;
                    path.style.stroke = colorMap[region.color] || colorMap.green;
                    path.dataset.regionId = region.id;

                    path.addEventListener('click', (e) => {
                        if (!isAddingRegionMode && !isDrawingMode && !isAddingLocationMode) {
                            e.stopPropagation();
                            showRegionInfo(e, region);
                        }
                    });

                    regionsLayer.appendChild(path);
                }
            });
        }

        function showRegionInfo(event, region) {
            // Set active region (similar to activeLocationId)
            activeLocationId = region.id;

            // Update image tab content
            const imageTab = document.getElementById('image-tab');
            const images = getRegionImages(region);

            if (images.length > 0) {
                if (infoBox.classList.contains('expanded') && images.length > 1) {
                    // Multi-tab view for expanded mode with multiple images
                    const imageTabs = images.map((img, index) =>
                        `<button class="image-tab-button ${index === 0 ? 'active' : ''}" data-image-index="${index}">Image ${index + 1}</button>`
                    ).join('');

                    const imageContents = images.map((img, index) =>
                        `<div class="image-content ${index === 0 ? 'active' : ''}" data-image-index="${index}">
                            <div class="image-view">
                                <img src="${img}" alt="${region.name}" title="${img.split('/').pop()}" onerror="handleImageError(this)">
                            </div>
                        </div>`
                    ).join('');

                    imageTab.innerHTML = `
                        <div class="image-tabs-container">
                            <div class="image-tabs">${imageTabs}</div>
                            <div class="image-contents">${imageContents}</div>
                        </div>
                    `;

                    setupImageTabSwitching();
                    setupImageClickHandlers();
                } else {
                    // Single image view (compact mode or single image)
                    const defaultImage = getDefaultRegionImage(region);
                    const titleHtml = !infoBox.classList.contains('expanded') ? `<div class="compact-title">
                                    <span style="font-family: 'Merriweather', serif;">${region.name}</span>
                                </div>` : '';
                    imageTab.innerHTML = `
                        <div class="image-view">
                            ${titleHtml}
                            <img src="${defaultImage}" alt="${region.name}" title="${defaultImage.split('/').pop()}" onerror="handleImageError(this)" class="modal-image">
                        </div>
                    `;
                    setupImageClickHandlers();
                }
            } else {
                // No image - show title instead of placeholder in compact mode
                if (!infoBox.classList.contains('expanded')) {
                    imageTab.innerHTML = `
                        <div class="image-view">
                            <div class="compact-title">
                                <span style="font-family: 'Merriweather', serif;">${region.name}</span>
                            </div>
                        </div>
                    `;
                } else {
                    imageTab.innerHTML = `
                        <div class="image-view">
                            <div class="image-placeholder">Aucune image disponible</div>
                        </div>
                    `;
                }
            }

            // Update text tab content
            const textTab = document.getElementById('text-tab');
            textTab.innerHTML = `
                <div class="text-view">
                    <h3>${region.name}</h3>
                    <p>${region.description || 'Aucune description.'}</p>
                </div>
            `;

            // Update rumeurs tab content
            const rumeursTab = document.getElementById('rumeurs-tab');
            rumeursTab.innerHTML = `
                <div class="text-view">
                    <h3>Rumeurs</h3>
                    <p>${region.Rumeur || 'Aucune rumeur connue.'}</p>
                </div>
            `;

            // Update tradition tab content
            const traditionTab = document.getElementById('tradition-tab');
            traditionTab.innerHTML = `
                <div class="text-view">
                    <h3>Tradition Ancienne</h3>
                    <p>${region.Tradition_Ancienne || 'Aucune tradition ancienne connue.'}</p>
                </div>
            `;

            // Update header title
            updateInfoBoxHeaderTitle(region.name);

            // Show the info box
            document.getElementById('info-box-edit-content').classList.add('hidden');
            document.getElementById('info-box-content').classList.remove('hidden');

            infoBox.style.display = 'block';
            // Ouvrir en mode étendu par défaut
            if (!infoBox.classList.contains('expanded')) {
                infoBox.classList.add('expanded');
                const expandBtn = document.getElementById('info-box-expand');
                if (expandBtn) {
                    expandBtn.className = 'fas fa-compress';
                    expandBtn.title = 'Vue compacte';
                }
                const titleElement = document.getElementById('info-box-title');
                const deleteBtn = document.getElementById('info-box-delete');
                titleElement.classList.remove('hidden');
                deleteBtn.classList.remove('hidden');
            }
            positionInfoBoxExpanded();

            // Set up event listeners for regions
            const editBtn = document.getElementById('info-box-edit');
            editBtn.style.display = 'flex'; // Show edit button for regions

            // Remove any existing event listeners first
            setupInfoBoxEventListeners('region', region.id);

            // Set up tab switching
            setupTabSwitching();
        }

        function enterRegionEditMode() {
            const region = regionsData.regions.find(reg => reg.id === activeLocationId);
            if (!region) return;

            // Mark the info box as being in edit mode
            infoBox.dataset.editMode = 'true';
            infoBox.dataset.editType = 'region';

            // Update image tab to show image editing interface
            updateImageTabForRegionEdit(region);

            // Update text tab to show text editing interface
            updateTextTabForRegionEdit(region);

            // Update rumeurs tab to show rumeurs editing interface
            updateRumeursTabForRegionEdit(region);

            // Update tradition tab to show tradition editing interface
            updateTraditionTabForRegionEdit(region);

            // Add edit controls at the bottom
            addRegionEditControls();
        }

        function updateImageTabForRegionEdit(region) {
            const imageTab = document.getElementById('image-tab');
            const images = getRegionImages(region);
            const imagesHtml = generateImageEditHTML(images);

            const colorPickerHtml = Object.keys(regionColorMap).map(color =>
                `<div class="color-swatch ${region.color === color ? 'selected' : ''}" data-color="${color}" style="background-color: ${regionColorMap[color]}; border: 2px solid ${colorMap[color]};"></div>`
            ).join('');

            imageTab.innerHTML = `
                <div class="space-y-4">
                    <div class="bg-gray-700 p-3 rounded-md">
                        <label class="block text-sm font-medium text-gray-300 mb-2">Images (max 5)</label>
                        <div id="edit-images-container">${imagesHtml}</div>
                        <button id="add-image-btn" class="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm">Ajouter une image</button>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Couleur</label>
                        <div class="flex space-x-2" id="edit-region-color-picker">${colorPickerHtml}</div>
                    </div>
                </div>
            `;

            setupImageEditListeners();
            setupRegionColorPickerListeners();
        }

        function updateTextTabForRegionEdit(region) {
            const textTab = document.getElementById('text-tab');
            textTab.innerHTML = `
                <div class="text-view space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Nom de la région</label>
                        <input type="text" id="edit-region-name" value="${region.name}" placeholder="Nom de la région" class="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <div class="flex items-start space-x-2">
                            <textarea id="edit-region-desc" rows="4" placeholder="Description" class="flex-1 bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white">${region.description || ''}</textarea>
                            <button id="generate-edit-region-desc" class="p-2 bg-purple-600 hover:bg-purple-700 rounded-md" title="Générer une description"><span class="gemini-icon">✨</span></button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('generate-edit-region-desc').addEventListener('click', handleGenerateRegionDescription);
        }

        function updateRumeursTabForRegionEdit(region) {
            const rumeursTab = document.getElementById('rumeurs-tab');
            rumeursTab.innerHTML = `
                <div class="text-view space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Rumeurs</label>
                        <textarea id="edit-region-rumeur" rows="6" placeholder="Rumeur" class="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white">${region.Rumeur || ''}</textarea>
                    </div>
                </div>
            `;
        }

        function updateTraditionTabForRegionEdit(region) {
            const traditionTab = document.getElementById('tradition-tab');
            traditionTab.innerHTML = `
                <div class="text-view space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Tradition Ancienne</label>
                        <textarea id="edit-region-tradition" rows="6" placeholder="Tradition Ancienne" class="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white">${region.Tradition_Ancienne || ''}</textarea>
                    </div>
                </div>
            `;
        }

        function addRegionEditControls() {
            // Add save/cancel buttons at the bottom of the scroll wrapper
            const scrollWrapper = document.getElementById('info-box-scroll-wrapper');
            let editControls = document.getElementById('edit-controls');

            if (!editControls) {
                editControls = document.createElement('div');
                editControls.id = 'edit-controls';
                editControls.className = 'mt-4 pt-4 border-t border-gray-600 flex justify-end space-x-2 bg-gray-900 sticky bottom-0';
                scrollWrapper.appendChild(editControls);
            }

            editControls.innerHTML = `
                <button id="cancel-region-edit" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-sm">Annuler</button>
                <button id="save-region-edit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm">Sauver</button>
            `;

            document.getElementById('save-region-edit').addEventListener('click', saveRegionEdit);
            document.getElementById('cancel-region-edit').addEventListener('click', cancelRegionEdit);
        }

        function setupRegionColorPickerListeners() {
            document.getElementById('edit-region-color-picker').querySelectorAll('.color-swatch').forEach(swatch => {
                swatch.addEventListener('click', () => {
                    document.querySelector('#edit-region-color-picker .color-swatch.selected').classList.remove('selected');
                    swatch.classList.add('selected');
                });
            });
        }

        function saveRegionEdit() {
            const region = regionsData.regions.find(reg => reg.id === activeLocationId);
            if (!region) return;

            region.name = document.getElementById('edit-region-name').value;
            region.description = document.getElementById('edit-region-desc').value;
            region.Rumeur = document.getElementById('edit-region-rumeur').value || 'A définir';
            region.Tradition_Ancienne = document.getElementById('edit-region-tradition').value || 'A définir';
            region.color = document.querySelector('#edit-region-color-picker .color-swatch.selected').dataset.color;

            // Handle images
            const images = collectImagesFromEdit();
            if (images.length > 0) {
                region.images = images;
            } else {
                delete region.images;
            }

            saveRegionsToLocal();
            renderRegions();
            hideInfoBox();
        }

        function cancelRegionEdit() {
            // Remove edit mode flag
            delete infoBox.dataset.editMode;
            delete infoBox.dataset.editType;

            // Remove edit controls
            const editControls = document.getElementById('edit-controls');
            if (editControls) {
                editControls.remove();
            }

            // Re-show the region info without edit mode
            const region = regionsData.regions.find(reg => reg.id === activeLocationId);
            if (region) {
                showRegionContent(region);
            }
        }

        function showRegionContent(region) {
            // Update image tab content
            const imageTab = document.getElementById('image-tab');
            const images = getRegionImages(region);

            if (images.length > 0) {
                if (infoBox.classList.contains('expanded') && images.length > 1) {
                    // Multi-tab view for expanded mode with multiple images
                    const imageTabs = images.map((img, index) =>
                        `<button class="image-tab-button ${index === 0 ? 'active' : ''}" data-image-index="${index}">Image ${index + 1}</button>`
                    ).join('');

                    const imageContents = images.map((img, index) =>
                        `<div class="image-content ${index === 0 ? 'active' : ''}" data-image-index="${index}">
                            <div class="image-view">
                                <img src="${img}" alt="${region.name}" title="${img.split('/').pop()}" onerror="handleImageError(this)">
                            </div>
                        </div>`
                    ).join('');

                    imageTab.innerHTML = `
                        <div class="image-tabs-container">
                            <div class="image-tabs">${imageTabs}</div>
                            <div class="image-contents">${imageContents}</div>
                        </div>
                    `;

                    setupImageTabSwitching();
                    setupImageClickHandlers();
                } else {
                    // Single image view (compact mode or single image)
                    const defaultImage = getDefaultRegionImage(region);
                    const titleHtml = !infoBox.classList.contains('expanded') ? `<div class="compact-title">
                                    <span style="font-family: 'Merriweather', serif;">${region.name}</span>
                                </div>` : '';
                    imageTab.innerHTML = `
                        <div class="image-view">
                            ${titleHtml}
                            <img src="${defaultImage}" alt="${region.name}" title="${defaultImage.split('/').pop()}" onerror="handleImageError(this)" class="modal-image">
                        </div>
                    `;
                    setupImageClickHandlers();
                }
            } else {
                // No image - show title instead of placeholder in compact mode
                if (!infoBox.classList.contains('expanded')) {
                    imageTab.innerHTML = `
                        <div class="image-view">
                            <div class="compact-title">
                                <span style="font-family: 'Merriweather', serif;">${region.name}</span>
                            </div>
                        </div>
                    `;
                } else {
                    imageTab.innerHTML = `
                        <div class="image-view">
                            <div class="image-placeholder">Aucune image disponible</div>
                        </div>
                    `;
                }
            }

            // Update text tab content
            const textTab = document.getElementById('text-tab');
            textTab.innerHTML = `
                <div class="text-view">
                    <h3>${region.name}</h3>
                    <p>${region.description || 'Aucune description.'}</p>
                </div>
            `;

            // Update rumeurs tab content
            const rumeursTab = document.getElementById('rumeurs-tab');
            rumeursTab.innerHTML = `
                <div class="text-view">
                    <h3>Rumeurs</h3>
                    <p>${region.Rumeur || 'Aucune rumeur connue.'}</p>
                </div>
            `;

            // Update tradition tab content
            const traditionTab = document.getElementById('tradition-tab');
            traditionTab.innerHTML = `
                <div class="text-view">
                    <h3>Tradition Ancienne</h3>
                    <p>${region.Tradition_Ancienne || 'Aucune tradition ancienne connue.'}</p>
                </div>
            `;
        }

        function deleteLocation(locationId) {
            if (confirm('Êtes-vous sûr de vouloir supprimer ce lieu ?')) {
                const locationIndex = locationsData.locations.findIndex(loc => loc.id === locationId);
                if (locationIndex !== -1) {
                    locationsData.locations.splice(locationIndex, 1);
                    saveLocationsToLocal();
                    renderLocations();
                    hideInfoBox();
                }
            }
        }

        function deleteRegion(regionId) {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette région ?')) {
                const regionIndex = regionsData.regions.findIndex(reg => reg.id === regionId);
                if (regionIndex !== -1) {
                    regionsData.regions.splice(regionIndex, 1);
                    saveRegionsToLocal();
                    renderRegions();
                    hideInfoBox();
                }
            }
        }

        async function handleGenerateRegionDescription(event) {
            const button = event.currentTarget;
            const regionName = document.getElementById('edit-region-name').value;
            const descTextarea = document.getElementById('edit-region-desc');

            if (!regionName) {
                alert("Veuillez d'abord entrer un nom pour la région.");
                return;
            }

            const prompt = `Rédige une courte description évocatrice pour une région de la Terre du Milieu nommée '${regionName}'. Décris son apparence, son climat, sa géographie et son histoire possible, dans le style de J.R.R. Tolkien. Sois concis et évocateur.`;

            const result = await callGemini(prompt, button);
            descTextarea.value = result;
        }

        function addRegionPoint(coords) {
            console.log("🌍 Adding region point:", coords);
            currentRegionPoints.push(coords);
            console.log("🌍 Current region points count:", currentRegionPoints.length);

            // Create or update temporary visual feedback
            updateTempRegion();

            // Add visual point indicator
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', coords.x);
            circle.setAttribute('cy', coords.y);
            circle.setAttribute('r', 4);
            circle.classList.add('region-point');
            circle.dataset.tempPoint = 'true';
            regionsLayer.appendChild(circle);
            console.log("🌍 Visual point added to SVG");

            if (currentRegionPoints.length >= 3) {
                console.log("🌍 Region has enough points for completion (double-click to finish)");
            }
        }

        function updateTempRegion() {
            // Remove existing temp path
            const existingTemp = regionsLayer.querySelector('.region-temp');
            if (existingTemp) existingTemp.remove();

            if (currentRegionPoints.length >= 2) {
                const pathData = `M ${currentRegionPoints.map(p => `${p.x},${p.y}`).join(' L ')}`;
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', pathData);
                path.classList.add('region-temp');
                regionsLayer.appendChild(path);
                tempRegionPath = path;
            }
        }

        function completeRegion() {
            if (currentRegionPoints.length >= 3) {
                // Show modal to get region details
                showAddRegionModal();
            } else {
                alert('Une région doit avoir au moins 3 points.');
            }
        }

        function showAddRegionModal() {
            addRegionModal.classList.remove('hidden');
            document.getElementById('region-name-input').focus();

            // Setup color picker
            const regionColorPicker = document.getElementById('region-color-picker');
            regionColorPicker.innerHTML = Object.keys(regionColorMap).map((color, index) =>
                `<div class="color-swatch ${index === 0 ? 'selected' : ''}" data-color="${color}" style="background-color: ${regionColorMap[color]}; border: 2px solid ${colorMap[color]};"></div>`
            ).join('');

            regionColorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
                swatch.addEventListener('click', () => {
                    regionColorPicker.querySelector('.color-swatch.selected').classList.remove('selected');
                    swatch.classList.add('selected');
                });
            });
        }

        function cancelRegionCreation() {
            currentRegionPoints = [];
            // Remove temporary visuals
            regionsLayer.querySelectorAll('[data-temp-point]').forEach(el => el.remove());
            if (tempRegionPath) {
                tempRegionPath.remove();
                tempRegionPath = null;
            }

            isAddingRegionMode = false;
            viewport.classList.remove('adding-region');
            document.getElementById('add-region-mode').classList.remove('btn-active');
        }

        function saveRegion() {
            const nameInput = document.getElementById('region-name-input');
            const descInput = document.getElementById('region-desc-input');
            const selectedColor = document.querySelector('#region-color-picker .selected').dataset.color;

            if (nameInput.value && currentRegionPoints.length >= 3) {
                const newRegion = {
                    id: Date.now(),
                    name: nameInput.value,
                    description: descInput.value,
                    color: selectedColor,
                    points: [...currentRegionPoints],
                    Rumeur: "A définir",
                    Tradition_Ancienne: "A définir"
                };

                regionsData.regions.push(newRegion);
                saveRegionsToLocal();
                renderRegions();

                // Clean up
                currentRegionPoints = [];
                regionsLayer.querySelectorAll('[data-temp-point]').forEach(el => el.remove());
                if (tempRegionPath) {
                    tempRegionPath.remove();
                    tempRegionPath = null;
                }

                addRegionModal.classList.add('hidden');
                nameInput.value = '';
                descInput.value = '';

                isAddingRegionMode = false;
                viewport.classList.remove('adding-region');
                document.getElementById('add-region-mode').classList.remove('btn-active');
            }
        }

        function saveRegionsToLocal() {
            localStorage.setItem('middleEarthRegions', JSON.stringify(regionsData));
            scheduleAutoSync(); // Synchroniser après modification
        }

        function loadRegionsFromLocal() {
            const saved = localStorage.getItem('middleEarthRegions');
            if (saved) {
                try {
                    regionsData = JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to load regions from localStorage:', e);
                    regionsData = getDefaultRegions();
                }
            }
        }

        function handleMapImageError() {
            console.error("❌ Erreur de chargement de l'image de carte");
            loaderOverlay.innerHTML = `<div class="text-2xl text-red-500 text-center p-4"><i class="fas fa-exclamation-triangle mb-4 text-4xl"></i><br>Erreur de chargement de la carte.<br><span class="text-sm text-gray-400 mt-2">Vérifiez que les fichiers de carte sont disponibles.</span></div>`;
        }
        function startDragMarker(e) { e.stopPropagation(); draggedMarker = e.target; dragStartX = e.clientX; dragStartY = e.clientY; document.addEventListener('mousemove', dragMarker); document.addEventListener('mouseup', stopDragMarker); }
        function dragMarker(e) { if (!draggedMarker) return; const deltaX = e.clientX - dragStartX; const deltaY = e.clientY - dragStartY; const newX = parseFloat(draggedMarker.style.left) + (deltaX / scale); const newY = parseFloat(draggedMarker.style.top) + (deltaY / scale); draggedMarker.style.left = `${newX}px`; draggedMarker.style.top = `${newY}px`; dragStartX = e.clientX; dragStartY = e.clientY; }
        function stopDragMarker() { if (!draggedMarker) return; const locationId = parseInt(draggedMarker.dataset.id, 10); const location = locationsData.locations.find(loc => loc.id === locationId); if (location) { location.coordinates.x = parseFloat(draggedMarker.style.left); location.coordinates.y = parseFloat(draggedMarker.style.top); } draggedMarker = null; document.removeEventListener('mousemove', dragMarker); document.removeEventListener('mouseup', stopDragMarker); saveLocationsToLocal(); }
        function applyTransform() { mapContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`; }
        function resetView() { const viewportWidth = viewport.clientWidth; if (viewportWidth === 0 || MAP_WIDTH === 0) return; scale = viewportWidth / MAP_WIDTH; panX = 0; panY = 0; applyTransform(); }
        function setupFilters() {
            const filterColorPicker = document.getElementById('filter-color-picker');
            filterColorPicker.innerHTML = Object.keys(colorMap).map(color => `
                <label title="${color.charAt(0).toUpperCase() + color.slice(1)}" class="relative cursor-pointer">
                    <input type="checkbox" data-color="${color}" class="filter-color-checkbox sr-only peer">
                    <div class="w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-white" style="background-color: ${colorMap[color]}"></div>
                </label>
            `).join('');

            document.getElementById('filter-toggle').addEventListener('click', (e) => {
                e.stopPropagation();
                filterPanel.classList.toggle('hidden');
            });

            // Fermer le panneau de filtre en cliquant en dehors
            document.addEventListener('click', (e) => {
                if (!filterPanel.contains(e.target) && !document.getElementById('filter-toggle').contains(e.target)) {
                    filterPanel.classList.add('hidden');
                }
            });

            // Empêcher la fermeture en cliquant à l'intérieur du panneau
            filterPanel.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            document.getElementById('filter-known').addEventListener('change', updateFilters);
            document.getElementById('filter-visited').addEventListener('change', updateFilters);
            document.querySelectorAll('.filter-color-checkbox').forEach(cb => cb.addEventListener('change', updateFilters));
            document.getElementById('reset-filters').addEventListener('click', resetFilters);
            document.getElementById('filter-show-regions').addEventListener('change', updateFilters); // Add listener for region visibility filter

            // Charger les filtres sauvegardés
            loadFiltersFromLocal();
        }
        function updateFilters() {
            activeFilters.known = document.getElementById('filter-known').checked;
            activeFilters.visited = document.getElementById('filter-visited').checked;
            activeFilters.colors = [];
            document.querySelectorAll('.filter-color-checkbox:checked').forEach(cb => {
                activeFilters.colors.push(cb.dataset.color);
            });
            renderLocations();

            // Show or hide regions based on the checkbox
            const showRegions = document.getElementById('filter-show-regions').checked;
            if (showRegions) {
                renderRegions();
                regionsLayer.style.display = 'block';
            } else {
                regionsLayer.style.display = 'none';
            }

            // Sauvegarder les filtres dans le localStorage
            saveFiltersToLocal();
            scheduleAutoSync();
        }
        function resetFilters() {
            document.getElementById('filter-known').checked = false;
            document.getElementById('filter-visited').checked = false;
            document.querySelectorAll('.filter-color-checkbox').forEach(cb => cb.checked = false);
            document.getElementById('filter-show-regions').checked = true; // Reset region visibility to checked
            updateFilters();
        }

        function saveFiltersToLocal() {
            const filterState = {
                known: activeFilters.known,
                visited: activeFilters.visited,
                colors: activeFilters.colors,
                showRegions: document.getElementById('filter-show-regions').checked
            };
            localStorage.setItem('middleEarthFilters', JSON.stringify(filterState));
        }

        function loadFiltersFromLocal() {
            const saved = localStorage.getItem('middleEarthFilters');
            if (saved) {
                try {
                    const filterState = JSON.parse(saved);
                    activeFilters.known = filterState.known || false;
                    activeFilters.visited = filterState.visited || false;
                    activeFilters.colors = filterState.colors || [];

                    // Appliquer les filtres à l'interface
                    document.getElementById('filter-known').checked = activeFilters.known;
                    document.getElementById('filter-visited').checked = activeFilters.visited;
                    document.getElementById('filter-show-regions').checked = filterState.showRegions !== undefined ? filterState.showRegions : true;

                    // Appliquer les couleurs
                    document.querySelectorAll('.filter-color-checkbox').forEach(cb => {
                        cb.checked = activeFilters.colors.includes(cb.dataset.color);
                    });

                    // Appliquer les filtres
                    renderLocations();
                    const showRegions = document.getElementById('filter-show-regions').checked;
                    if (showRegions) {
                        renderRegions();
                        regionsLayer.style.display = 'block';
                    } else {
                        regionsLayer.style.display = 'none';
                    }
                } catch (e) {
                    console.error('Failed to load filters from localStorage:', e);
                }
            }
        }
        viewport.addEventListener('wheel', (event) => { event.preventDefault(); const zoomIntensity = 0.1; const wheel = event.deltaY < 0 ? 1 : -1; const zoom = Math.exp(wheel * zoomIntensity); const rect = viewport.getBoundingClientRect(); const mouseX = event.clientX - rect.left; const mouseY = event.clientY - rect.top; panX = mouseX - (mouseX - panX) * zoom; panY = mouseY - (mouseY - panY) * zoom; scale = Math.max(0.1, Math.min(scale * zoom, 5)); applyTransform(); });
        // Gestionnaire mousedown principal du viewport
        function handleViewportMouseDown(event) {
            console.log("🖱️ Main viewport mousedown, mode:", {drawing: isDrawingMode, adding: isAddingLocationMode, region: isAddingRegionMode});

            if (event.target.closest('.location-marker, #info-box')) return;
            hideInfoBox();

            if (isAddingLocationMode) {
                console.log("📍 Adding location mode active");
                addLocation(event);
                return;
            }

            if (isAddingRegionMode) {
                console.log("🌍 Adding region mode active");
                const coords = getCanvasCoordinates(event);
                console.log("🌍 Adding region point at:", coords);
                addRegionPoint(coords);
                return;
            }

            if (isDrawingMode) {
                console.log("🎨 Drawing mode active, mousedown handled by drawing handler");
                return;
            }

            console.log("👆 Starting pan mode");
            event.preventDefault();
            isPanning = true;
            startPanX = event.clientX - panX;
            startPanY = event.clientY - panY;
            viewport.classList.add('panning');
        }
        viewport.addEventListener('mousemove', (event) => { if (isPanning) { event.preventDefault(); panX = event.clientX - startPanX; panY = event.clientY - startPanY; applyTransform(); } });
        ['mouseup', 'mouseleave'].forEach(event => viewport.addEventListener(event, () => { isPanning = false; viewport.classList.remove('panning'); }));
        // Gestionnaires d'événements pour le dessin - attachés au viewport au lieu du canvas
        viewport.addEventListener('mousedown', (event) => {
            console.log("🖱️ Viewport mousedown event fired, isDrawingMode:", isDrawingMode);

            // Handle drawing mode specifically
            if (isDrawingMode) {
                // Vérifier qu'on ne clique pas sur un marqueur ou autre élément
                if (event.target.closest('.location-marker, #info-box')) {
                    console.log("❌ Clicked on marker or info box, ignoring");
                    return;
                }

                console.log("🎨 Starting drawing...");
                event.preventDefault();
                event.stopPropagation();

                ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                isDrawing = true;
                totalPathPixels = 0;

                // Reset journey tracking
                journeyPath = [];
                traversedRegions.clear();
                nearbyLocations.clear();
                journeyDiscoveries = [];

                // Réinitialiser les segments de voyage
                resetVoyageSegments();

                startPoint = getCanvasCoordinates(event);
                lastPoint = startPoint;

                // Add start point to journey path
                journeyPath.push({x: startPoint.x, y: startPoint.y});

                console.log("📍 Start point:", startPoint);
                ctx.beginPath();
                ctx.moveTo(lastPoint.x, lastPoint.y);
                updateDistanceDisplay();
                distanceContainer.classList.remove('hidden');
                console.log("✅ Drawing initialized");
                return;
            }

            // Handle all other modes (panning, adding location, adding region)
            handleViewportMouseDown(event);
        });

        viewport.addEventListener('mousemove', (event) => {
            if (!isDrawing || !isDrawingMode) return;

            console.log("✏️ Mouse move during drawing");
            const currentPoint = getCanvasCoordinates(event);
            const segmentLength = Math.sqrt(Math.pow(currentPoint.x - lastPoint.x, 2) + Math.pow(currentPoint.y - lastPoint.y, 2));
            totalPathPixels += segmentLength;

            // Add current point to journey path for region/location detection
            journeyPath.push({x: currentPoint.x, y: currentPoint.y});

            lastPoint = currentPoint;
            ctx.lineTo(currentPoint.x, currentPoint.y);
            ctx.stroke();
            updateDistanceDisplay();
            console.log("✏️ Drawing segment, total pixels:", totalPathPixels.toFixed(1));
        });

        ['mouseup', 'mouseleave'].forEach(eventType => viewport.addEventListener(eventType, (event) => {
            if (isDrawing) {
                console.log("🛑 Drawing stopped on", eventType);
                isDrawing = false;
                console.log("🔄 Programmation de la synchronisation après tracé");
                scheduleAutoSync(); // Synchroniser après avoir terminé un segment de tracé
            }
        }));
        // Les boutons zoom ont été supprimés de l'interface
        // document.getElementById('zoom-in').addEventListener('click', () => { scale *= 1.2; applyTransform(); });
        // document.getElementById('zoom-out').addEventListener('click', () => { scale /= 1.2; applyTransform(); });
        // document.getElementById('reset-zoom').addEventListener('click', resetView);
        document.getElementById('draw-mode').addEventListener('click', (e) => {
            console.log("🎨 Draw mode button clicked");
            isAddingLocationMode = false;
            isAddingRegionMode = false;
            viewport.classList.remove('adding-location', 'adding-region');
            document.getElementById('add-location-mode').classList.remove('btn-active');
            document.getElementById('add-region-mode').classList.remove('btn-active');
            cancelRegionCreation();

            // Si on désactive le mode dessin et qu'il y a un tracé, synchroniser
            if (isDrawingMode && journeyPath.length > 0) {
                console.log("🔄 Synchronisation lors de la désactivation du mode dessin");
                scheduleAutoSync();
            }

            isDrawingMode = !isDrawingMode;
            console.log("🎨 Drawing mode is now:", isDrawingMode);
            viewport.classList.toggle('drawing', isDrawingMode);
            e.currentTarget.classList.toggle('btn-active', isDrawingMode);

            // Ensure canvas has proper pointer events when in drawing mode
            if (isDrawingMode) {
                drawingCanvas.style.pointerEvents = 'auto';
                console.log("✅ Canvas pointer events enabled");
            } else {
                drawingCanvas.style.pointerEvents = 'none';
                console.log("❌ Canvas pointer events disabled");
            }

            // Re-render locations to update pointer events
            renderLocations();
        });
        document.getElementById('add-location-mode').addEventListener('click', (e) => {
            isDrawingMode = false;
            isAddingRegionMode = false;
            viewport.classList.remove('drawing', 'adding-region');
            document.getElementById('draw-mode').classList.remove('btn-active');
            document.getElementById('add-region-mode').classList.remove('btn-active');
            cancelRegionCreation();
            isAddingLocationMode = !isAddingLocationMode;
            viewport.classList.toggle('adding-location', isAddingLocationMode);
            e.currentTarget.classList.toggle('btn-active', isAddingLocationMode);
            // Re-render locations to update event handlers
            renderLocations();
        });

        document.getElementById('add-region-mode').addEventListener('click', (e) => {
            isDrawingMode = false;
            isAddingLocationMode = false;
            viewport.classList.remove('drawing', 'adding-location');
            document.getElementById('draw-mode').classList.remove('btn-active');
            document.getElementById('add-location-mode').classList.remove('btn-active');
            isAddingRegionMode = !isAddingRegionMode;
            viewport.classList.toggle('adding-region', isAddingRegionMode);
            e.currentTarget.classList.toggle('btn-active', isAddingRegionMode);

            if (!isAddingRegionMode) {
                cancelRegionCreation();
            }

            renderLocations();
        });
        document.getElementById('erase').addEventListener('click', () => {
            ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            totalPathPixels = 0;
            startPoint = null;
            lastPoint = null;
            journeyPath = [];
            traversedRegions.clear();
            nearbyLocations.clear();
            journeyDiscoveries = []; // Clear discoveries as well

            // Réinitialiser les informations de voyage
            resetVoyageSegments();

            // Masquer le bouton de voyage
            const voyageBtn = document.getElementById('voyage-segments-btn');
            if (voyageBtn) voyageBtn.classList.add('hidden');

            updateDistanceDisplay();
            console.log("🔄 Synchronisation après effacement du tracé");
            scheduleAutoSync(); // Synchroniser après effacement du tracé
        });
        document.getElementById('export-locations').addEventListener('click', exportUnifiedData);
        document.getElementById('import-locations').addEventListener('click', () => document.getElementById('import-file-input').click());
        document.getElementById('import-file-input').addEventListener('change', importUnifiedData);

        // Event listeners pour l'import des régions
        const importRegionsBtn = document.getElementById('import-regions');
        const importRegionsInput = document.getElementById('import-regions-input');
        const exportRegionsBtn = document.getElementById('export-regions');

        if (importRegionsBtn && importRegionsInput) {
            importRegionsBtn.addEventListener('click', () => importRegionsInput.click());
            importRegionsInput.addEventListener('change', importUnifiedData);
        }

        if (exportRegionsBtn) {
            exportRegionsBtn.addEventListener('click', exportUnifiedData);
        }
        // document.getElementById('reset-locations').addEventListener('click', () => { if (confirm("Voulez-vous vraiment réinitialiser tous les lieux par défaut ?")) { locationsData = getDefaultLocations(); renderLocations(); saveLocationsToLocal(); } });
        mapSwitchBtn.addEventListener('click', () => {
            isPlayerView = !isPlayerView;
            const icon = document.getElementById('map-switch-icon');
            if (isPlayerView) {
                mapImage.style.opacity = '1';
                loremasterMapImage.style.opacity = '0';
                icon.className = 'fas fa-book-open';
                mapSwitchBtn.title = "Vue Gardien";
            } else {
                mapImage.style.opacity = '0';
                loremasterMapImage.style.opacity = '1';
                icon.className = 'fas fa-users';
                mapSwitchBtn.title = "Vue Joueurs";
            }
        });
        document.getElementById('confirm-add-location').addEventListener('click', () => { const nameInput = document.getElementById('location-name-input'); const descInput = document.getElementById('location-desc-input'); const imageInput = document.getElementById('location-image-input'); const color = document.querySelector('#add-color-picker .selected').dataset.color; const known = document.getElementById('location-known-input').checked; const visited = document.getElementById('location-visited-input').checked; if (nameInput.value && newLocationCoords) { const newLocation = { id: Date.now(), name: nameInput.value, description: descInput.value, imageUrl: imageInput.value, color: color, known: known, visited: visited, type: "custom", coordinates: newLocationCoords, Rumeur: "A définir", Tradition_Ancienne: "A définir" }; locationsData.locations.push(newLocation); renderLocations(); saveLocationsToLocal(); } addLocationModal.classList.add('hidden'); nameInput.value = ''; descInput.value = ''; imageInput.value = ''; newLocationCoords = null; });
        document.getElementById('cancel-add-location').addEventListener('click', () => { addLocationModal.classList.add('hidden'); document.getElementById('location-name-input').value = ''; document.getElementById('location-desc-input').value = ''; document.getElementById('location-image-input').value = ''; newLocationCoords = null; });
        function addLocation(event) { newLocationCoords = getCanvasCoordinates(event); addLocationModal.classList.remove('hidden'); document.getElementById('location-name-input').focus(); isAddingLocationMode = false; viewport.classList.remove('adding-location'); document.getElementById('add-location-mode').classList.remove('btn-active'); const addColorPicker = document.getElementById('add-color-picker'); addColorPicker.innerHTML = Object.keys(colorMap).map((color, index) => `<div class="color-swatch ${index === 0 ? 'selected' : ''}" data-color="${color}" style="background-color: ${colorMap[color]}"></div>`).join(''); addColorPicker.querySelectorAll('.color-swatch').forEach(swatch => { swatch.addEventListener('click', () => { addColorPicker.querySelector('.color-swatch.selected').classList.remove('selected'); swatch.classList.add('selected'); }); }); document.getElementById('generate-add-desc').addEventListener('click', handleGenerateDescription); document.getElementById('location-known-input').checked = true; document.getElementById('location-visited-input').checked = false; const addVisitedCheckbox = document.getElementById('location-visited-input'); const addKnownCheckbox = document.getElementById('location-known-input'); if(addVisitedCheckbox && addKnownCheckbox) { addVisitedCheckbox.addEventListener('change', () => { if (addVisitedCheckbox.checked) { addKnownCheckbox.checked = true; } }); } }
        function saveLocationsToLocal() {
            localStorage.setItem('middleEarthLocations', JSON.stringify(locationsData));
            scheduleAutoSync(); // Synchroniser après modification
        }
        // === FONCTIONS UNIFIÉES D'IMPORT/EXPORT ===

        function exportUnifiedData() {
            // Fusionner les lieux et les régions dans un seul tableau locations
            const allLocations = [];

            // Ajouter tous les lieux normaux
            if (locationsData.locations) {
                locationsData.locations.forEach(location => {
                    allLocations.push({
                        ...location,
                        type: location.type || "custom" // S'assurer qu'il y a un type
                    });
                });
            }

            // Ajouter toutes les régions (converties en format location avec type="region")
            if (regionsData.regions) {
                regionsData.regions.forEach(region => {
                    // Convertir la structure de région en format location unifié
                    const regionAsLocation = {
                        id: region.id,
                        name: region.name,
                        description: region.description || "",
                        imageUrl: region.imageUrl || "",
                        color: region.color,
                        known: region.known !== undefined ? region.known : true,
                        visited: region.visited !== undefined ? region.visited : false,
                        type: "region",
                        coordinates: {
                            points: region.points || [] // Les points du polygone de la région
                        }
                    };

                    // Ajouter les propriétés additionnelles si elles existent
                    if (region.Rumeur) regionAsLocation.Rumeur = region.Rumeur;
                    if (region.Tradition_Ancienne) regionAsLocation.Tradition_Ancienne = region.Tradition_Ancienne;

                    allLocations.push(regionAsLocation);
                });
            }

            const unifiedData = {
                locations: allLocations
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(unifiedData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "Landmark.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            document.body.removeChild(downloadAnchorNode);
            console.log(`✅ Export unifié terminé - ${allLocations.length} éléments sauvegardés (lieux et régions)`);
        }

        // Ancienne fonction de compatibilité (garde pour les anciens liens)
        function exportLocationsToFile() {
            exportUnifiedData(); // Rediriger vers la fonction unifiée
        }
        function importUnifiedData(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);

                    // Supporter les différents formats de fichiers
                    let locationsArray = [];

                    // Format unifié : { locations: [...] }
                    if (importedData.locations && Array.isArray(importedData.locations)) {
                        locationsArray = importedData.locations;
                    }
                    // Format ancien : { regions: [...] } - convertir les régions en locations
                    else if (importedData.regions && Array.isArray(importedData.regions)) {
                        locationsArray = importedData.regions.map(region => ({
                            id: region.id,
                            name: region.name,
                            description: region.description || "",
                            imageUrl: region.imageUrl || "",
                            color: region.color,
                            known: region.known !== undefined ? region.known : true,
                            visited: region.visited !== undefined ? region.visited : false,
                            type: "region",
                            coordinates: {
                                points: region.points || []
                            },
                            ...(region.Rumeur && { Rumeur: region.Rumeur }),
                            ...(region.Tradition_Ancienne && { Tradition_Ancienne: region.Tradition_Ancienne })
                        }));
                    }
                    // Format très ancien : tableau direct de locations à la racine
                    else if (Array.isArray(importedData)) {
                        locationsArray = importedData;
                    }
                    else {
                        alert("Fichier JSON invalide. Le fichier doit contenir une propriété 'locations' (tableau) ou 'regions' (tableau), ou être un tableau direct de locations.");
                        return;
                    }

                    // Séparer les lieux normaux des régions basé sur la structure des coordonnées
                    const normalLocations = [];
                    const regionLocations = [];

                    locationsArray.forEach(item => {
                        // Déterminer si c'est une région ou un lieu normal
                        const isRegion = item.type === "region" ||
                                        (item.coordinates && item.coordinates.points && Array.isArray(item.coordinates.points));

                        if (isRegion) {
                            // Convertir la location-région vers le format région interne
                            const region = {
                                id: item.id,
                                name: item.name,
                                description: item.description || "",
                                imageUrl: item.imageUrl || "",
                                color: item.color,
                                known: item.known !== undefined ? item.known : true,
                                visited: item.visited !== undefined ? item.visited : false,
                                points: item.coordinates?.points || []
                            };

                            // Ajouter les propriétés additionnelles si elles existent
                            if (item.Rumeur) region.Rumeur = item.Rumeur;
                            if (item.Tradition_Ancienne) region.Tradition_Ancienne = item.Tradition_Ancienne;

                            regionLocations.push(region);
                        } else {
                            // C'est un lieu normal - s'assurer qu'il a la bonne structure de coordonnées
                            const location = {
                                ...item,
                                type: item.type || "custom"
                            };

                            // S'assurer que les coordonnées sont au bon format {x, y}
                            if (item.coordinates && typeof item.coordinates.x === 'number' && typeof item.coordinates.y === 'number') {
                                location.coordinates = {
                                    x: item.coordinates.x,
                                    y: item.coordinates.y
                                };
                            }

                            normalLocations.push(location);
                        }
                    });

                    // Compter les éléments à importer
                    const locationCount = normalLocations.length;
                    const regionCount = regionLocations.length;

                    let message = `Le fichier contient ${locationsArray.length} éléments :\n`;
                    if (locationCount > 0) message += `- ${locationCount} lieux\n`;
                    if (regionCount > 0) message += `- ${regionCount} régions\n`;
                    message += "\nVoulez-vous :\n- OK : Remplacer toutes les données existantes\n- Annuler : Fusionner avec les données existantes";

                    const shouldReplace = confirm(message);

                    let addedLocations = 0, updatedLocations = 0;
                    let addedRegions = 0, updatedRegions = 0;

                    // === TRAITEMENT DES LIEUX ===
                    if (locationCount > 0) {
                        if (shouldReplace) {
                            locationsData = { locations: normalLocations };
                            addedLocations = normalLocations.length;
                        } else {
                            // Fusionner les lieux
                            normalLocations.forEach(importedLocation => {
                                const existingLocation = locationsData.locations.find(
                                    loc => loc.name === importedLocation.name
                                );

                                if (existingLocation) {
                                    Object.assign(existingLocation, importedLocation);
                                    updatedLocations++;
                                } else {
                                    // Générer un nouvel ID unique pour éviter les collisions
                                    importedLocation.id = Date.now() + Math.floor(Math.random() * 1000);
                                    // S'assurer que l'ID est vraiment unique
                                    while (locationsData.locations.find(loc => loc.id === importedLocation.id)) {
                                        importedLocation.id = Date.now() + Math.floor(Math.random() * 1000);
                                    }
                                    locationsData.locations.push(importedLocation);
                                    addedLocations++;
                                }
                            });
                        }
                        renderLocations();
                        saveLocationsToLocal();
                    }

                    // === TRAITEMENT DES RÉGIONS ===
                    if (regionCount > 0) {
                        if (shouldReplace) {
                            regionsData = { regions: regionLocations };
                            addedRegions = regionLocations.length;
                        } else {
                            // Fusionner les régions
                            regionLocations.forEach(importedRegion => {
                                const existingRegion = regionsData.regions.find(
                                    reg => reg.name === importedRegion.name
                                );

                                if (existingRegion) {
                                    Object.assign(existingRegion, importedRegion);
                                    updatedRegions++;
                                } else {
                                    // Générer un nouvel ID unique pour éviter les collisions
                                    importedRegion.id = Date.now() + Math.floor(Math.random() * 1000);
                                    // S'assurer que l'ID est vraiment unique
                                    while (regionsData.regions.find(reg => reg.id === importedRegion.id)) {
                                        importedRegion.id = Date.now() + Math.floor(Math.random() * 1000);
                                    }
                                    regionsData.regions.push(importedRegion);
                                    addedRegions++;
                                }
                            });
                        }
                        renderRegions();
                        saveRegionsToLocal();
                    }

                    scheduleAutoSync();

                    // Message de confirmation
                    if (shouldReplace) {
                        let confirmMessage = "Import réussi !\n";
                        if (addedLocations > 0) confirmMessage += `- ${addedLocations} lieux importés\n`;
                        if (addedRegions > 0) confirmMessage += `- ${addedRegions} régions importées\n`;
                        alert(confirmMessage);
                    } else {
                        let confirmMessage = "Import terminé :\n";
                        if (addedLocations > 0 || updatedLocations > 0) {
                            confirmMessage += `Lieux : ${addedLocations} ajoutés, ${updatedLocations} mis à jour\n`;
                        }
                        if (addedRegions > 0 || updatedRegions > 0) {
                            confirmMessage += `Régions : ${addedRegions} ajoutées, ${updatedRegions} mises à jour\n`;
                        }
                        alert(confirmMessage);
                    }

                    console.log(`✅ Import unifié terminé - ${addedLocations + addedRegions} éléments traités`);

                } catch (err) {
                    alert("Erreur lors de la lecture du fichier JSON : " + err.message);
                    console.error("Erreur d'import unifié:", err);
                }

                // Réinitialiser l'input file
                event.target.value = '';
            };

            reader.readAsText(file);
        }

        // Anciennes fonctions de compatibilité (gardées pour les anciens liens)
        function importLocationsFromFile(event) {
            importUnifiedData(event); // Rediriger vers la fonction unifiée
        }

        function exportRegionsToFile() {
            exportUnifiedData(); // Rediriger vers la fonction unifiée
        }

        function importRegionsFromFile(event) {
            importUnifiedData(event); // Rediriger vers la fonction unifiée
        }

        function getCanvasCoordinates(event) { const rect = mapContainer.getBoundingClientRect(); const x = (event.clientX - rect.left) / scale; const y = (event.clientY - rect.top) / scale; return { x, y }; }
        function updateDistanceDisplay() {
            const voyageBtn = document.getElementById('voyage-segments-btn');

            if (totalPathPixels === 0 || MAP_WIDTH === 0) {
                distanceContainer.classList.add('hidden');
                if (voyageBtn) voyageBtn.classList.add('hidden');
                return;
            }
            distanceContainer.classList.remove('hidden');
            if (voyageBtn) voyageBtn.classList.remove('hidden');

            const miles = totalPathPixels * (MAP_DISTANCE_MILES / MAP_WIDTH);
            const days = miles / 20;
            const roundedDays = Math.ceil(days * 2) / 2;
            distanceDisplay.innerHTML = `<strong>${Math.round(miles)}</strong> miles &nbsp;&nbsp;|&nbsp;&nbsp; <strong>${roundedDays.toFixed(1)}</strong> jours`;
            updateJourneyInfo();
        }

        function updateJourneyInfo() {
            updateDiscoveriesChronologically();
            displayJourneyInfo();
        }

        function updateDiscoveriesChronologically() {
            // Track region segments for duration calculation
            let regionSegments = new Map(); // region name -> {entryIndex, exitIndex}
            let currentRegions = new Set(); // regions currently being traversed

            // Track location proximity types
            let locationProximityTypes = new Map(); // location name -> 'traversed' or 'nearby'

            // Process each point in the journey path to maintain chronological order
            for (let i = 0; i < journeyPath.length; i++) {
                const currentPoint = journeyPath[i];

                // Check which regions this point is in
                let pointRegions = new Set();
                regionsData.regions.forEach(region => {
                    if (region.points && region.points.length >= 3) {
                        if (isPointInPolygon(currentPoint, region.points)) {
                            pointRegions.add(region.name);

                            if (!traversedRegions.has(region.name)) {
                                traversedRegions.add(region.name);
                                // Add to chronological discoveries if not already present
                                if (!journeyDiscoveries.some(d => d.name === region.name && d.type === 'region')) {
                                    journeyDiscoveries.push({
                                        name: region.name,
                                        type: 'region',
                                        discoveryIndex: i
                                    });
                                }
                                // Mark entry point for this region
                                regionSegments.set(region.name, {entryIndex: i, exitIndex: i});
                            } else {
                                // Update exit point for this region
                                let segment = regionSegments.get(region.name);
                                if (segment) {
                                    segment.exitIndex = i;
                                }
                            }
                        }
                    }
                });

                // Check for regions we're exiting
                currentRegions.forEach(regionName => {
                    if (!pointRegions.has(regionName)) {
                        // We've exited this region, finalize its segment
                        let segment = regionSegments.get(regionName);
                        if (segment) {
                            segment.exitIndex = i - 1; // Previous point was the last point in region
                        }
                    }
                });

                currentRegions = pointRegions;

                // Check locations at this point
                locationsData.locations.forEach(location => {
                    if (!location.coordinates || typeof location.coordinates.x === 'undefined' || typeof location.coordinates.y === 'undefined') {
                        return;
                    }

                    const distance = Math.sqrt(
                        Math.pow(location.coordinates.x - currentPoint.x, 2) +
                        Math.pow(location.coordinates.y - currentPoint.y, 2)
                    );

                    if (distance <= PROXIMITY_DISTANCE) {
                        if (!nearbyLocations.has(location.name)) {
                            nearbyLocations.add(location.name);

                            // Determine proximity type based on distance
                            let proximityType = 'nearby'; // default for 11-50 pixels
                            if (distance <= 10) {
                                proximityType = 'traversed'; // 0-10 pixels
                            }

                            // If location already exists with 'nearby', upgrade to 'traversed' if applicable
                            const existingType = locationProximityTypes.get(location.name);
                            if (!existingType || (existingType === 'nearby' && proximityType === 'traversed')) {
                                locationProximityTypes.set(location.name, proximityType);
                            }

                            // Add to chronological discoveries if not already present
                            if (!journeyDiscoveries.some(d => d.name === location.name && d.type === 'location')) {
                                journeyDiscoveries.push({
                                    name: location.name,
                                    type: 'location',
                                    discoveryIndex: i,
                                    proximityType: locationProximityTypes.get(location.name)
                                });
                            } else {
                                // Update existing discovery with new proximity type if better
                                const existingDiscovery = journeyDiscoveries.find(d => d.name === location.name && d.type === 'location');
                                if (existingDiscovery) {
                                    existingDiscovery.proximityType = locationProximityTypes.get(location.name);
                                }
                            }
                        } else {
                            // Location already discovered, but check if we need to upgrade proximity type
                            let proximityType = 'nearby';
                            if (distance <= 10) {
                                proximityType = 'traversed';
                            }

                            const existingType = locationProximityTypes.get(location.name);
                            if (existingType === 'nearby' && proximityType === 'traversed') {
                                locationProximityTypes.set(location.name, proximityType);
                                // Update existing discovery
                                const existingDiscovery = journeyDiscoveries.find(d => d.name === location.name && d.type === 'location');
                                if (existingDiscovery) {
                                    existingDiscovery.proximityType = proximityType;
                                }
                            }
                        }
                    }
                });
            }

            // Store region segments and location proximity types for duration calculation
            window.regionSegments = regionSegments;
            window.locationProximityTypes = locationProximityTypes;
        }

        function isPointInPolygon(point, polygon) {
            let inside = false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
                    (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                    inside = !inside;
                }
            }
            return inside;
        }

        function calculatePathDistance(startIndex, endIndex) {
            if (startIndex >= endIndex || startIndex < 0 || endIndex >= journeyPath.length) {
                return 0;
            }

            let distance = 0;
            for (let i = startIndex; i < endIndex; i++) {
                const point1 = journeyPath[i];
                const point2 = journeyPath[i + 1];
                distance += Math.sqrt(
                    Math.pow(point2.x - point1.x, 2) +
                    Math.pow(point2.y - point1.y, 2)
                );
            }
            return distance;
        }

        function pixelsToMiles(pixels) {
            return pixels * (MAP_DISTANCE_MILES / MAP_WIDTH);
        }

        function milesToDays(miles) {
            const days = miles / 20; // 20 miles per day
            return Math.round(days * 2) / 2; // Round to nearest half day
        }

        function getDiscoveryTooltipContent(discoveryName, type) {
            let data;
            if (type === 'location') {
                data = locationsData.locations.find(loc => loc.name === discoveryName);
            } else if (type === 'region') {
                data = regionsData.regions.find(reg => reg.name === discoveryName);
            }

            if (!data) return '';

            let content = '';
            if (data.description) {
                content += `<div><strong>Description :</strong><br>${data.description}</div>`;
            }

            return content;
        }

        function displayJourneyInfo() {
            const traversedRegionsInfo = document.getElementById('traversed-regions-info');
            const traversedRegionsList = document.getElementById('traversed-regions-list');
            const nearbyLocationsInfo = document.getElementById('nearby-locations-info');
            const nearbyLocationsList = document.getElementById('nearby-locations-list');

            // Sort discoveries by discovery order, keeping them mixed
            const chronologicalDiscoveries = journeyDiscoveries.sort((a, b) => a.discoveryIndex - b.discoveryIndex);

            if (chronologicalDiscoveries.length > 0) {
                // Calculate travel times for each discovery
                const discoveryElements = chronologicalDiscoveries.map((discovery, index) => {
                    const icon = discovery.type === 'region' ? '🗺️' : '📍';

                    // Calculate reach time for this discovery
                    let startIndex = 0;
                    if (index > 0) {
                        // Find the end point of the previous discovery
                        const prevDiscovery = chronologicalDiscoveries[index - 1];
                        if (prevDiscovery.type === 'region' && window.regionSegments) {
                            const segment = window.regionSegments.get(prevDiscovery.name);
                            startIndex = segment ? segment.exitIndex : prevDiscovery.discoveryIndex;
                        } else {
                            startIndex = prevDiscovery.discoveryIndex;
                        }
                    }

                    const reachDistance = calculatePathDistance(startIndex, discovery.discoveryIndex);
                    const reachMiles = pixelsToMiles(reachDistance);
                    const reachDays = milesToDays(reachMiles);

                    // Check if this is a starting location (close to journey start)
                    let travelInfo;
                    if (discovery.type === 'location' && startPoint && discovery.discoveryIndex === 0) {
                        // Find the actual location to check distance from start point
                        const location = locationsData.locations.find(loc => loc.name === discovery.name);
                        if (location && location.coordinates) {
                            const distanceFromStart = Math.sqrt(
                                Math.pow(location.coordinates.x - startPoint.x, 2) +
                                Math.pow(location.coordinates.y - startPoint.y, 2)
                            );
                            if (distanceFromStart <= 20) {
                                travelInfo = "(point de départ)";
                            } else {
                                // Add proximity information for locations
                                let proximityText = '';
                                if (discovery.proximityType === 'traversed') {
                                    proximityText = ', traversé';
                                } else if (discovery.proximityType === 'nearby') {
                                    proximityText = ', passage à proximité';
                                }
                                travelInfo = `(atteint en ${reachDays} jour${reachDays !== 1 ? 's' : ''}${proximityText})`;
                            }
                        } else {
                            // Add proximity information for locations
                            let proximityText = '';
                            if (discovery.proximityType === 'traversed') {
                                proximityText = ', traversé';
                            } else if (discovery.proximityType === 'nearby') {
                                proximityText = ', passage à proximité';
                            }
                            travelInfo = `(atteint en ${reachDays} jour${reachDays !== 1 ? 's' : ''}${proximityText})`;
                        }
                    } else {
                        // Add proximity information for locations
                        let proximityText = '';
                        if (discovery.type === 'location') {
                            if (discovery.proximityType === 'traversed') {
                                proximityText = ', traversé';
                            } else if (discovery.proximityType === 'nearby') {
                                proximityText = ', passage à proximité';
                            }
                        }
                        travelInfo = `(atteint en ${reachDays} jour${reachDays !== 1 ? 's' : ''}${proximityText})`;
                    }

                    let displayText = `${icon} ${discovery.name} ${travelInfo}`;

                    // For regions, also calculate duration inside the region
                    if (discovery.type === 'region' && window.regionSegments) {
                        const segment = window.regionSegments.get(discovery.name);
                        if (segment) {
                            const regionDistance = calculatePathDistance(segment.entryIndex, segment.exitIndex);
                            const regionMiles = pixelsToMiles(regionDistance);
                            const regionDays = milesToDays(regionMiles);

                            // Replace travelInfo for regions to include duration
                            if (travelInfo === "(point de départ)") {
                                displayText = `${icon} ${discovery.name} (point de départ, durée ${regionDays} jour${regionDays !== 1 ? 's' : ''})`;
                            } else {
                                displayText = `${icon} ${discovery.name} (atteint en ${reachDays} jour${reachDays !== 1 ? 's' : ''}, durée ${regionDays} jour${regionDays !== 1 ? 's' : ''})`;
                            }
                        }
                    }

                    // Get tooltip content
                    const tooltipContent = getDiscoveryTooltipContent(discovery.name, discovery.type);

                    // Create span sans tooltip par défaut
                    return `<span class="discovery-item clickable-discovery" data-discovery-name="${discovery.name}" data-discovery-type="region">${displayText}</span>`;
                });

                // Join with line breaks instead of commas
                const discoveryListHTML = discoveryElements.join('<br>');

                // Show only one section with all discoveries
                traversedRegionsInfo.classList.remove('hidden');
                traversedRegionsList.innerHTML = discoveryListHTML;
                nearbyLocationsInfo.classList.add('hidden');

                // Update the title to reflect mixed content
                const regionsTitle = traversedRegionsInfo.querySelector('.font-semibold');
                if (regionsTitle) {
                    regionsTitle.textContent = 'Découvertes du voyage :';
                    regionsTitle.className = 'font-semibold text-blue-400 mb-1';
                }

                // Setup enhanced tooltips
                setupDiscoveryTooltips();

                console.log("🌟 Journey discoveries (chronological):", chronologicalDiscoveries.map(d => `${d.type}: ${d.name}`));
            } else {
                traversedRegionsInfo.classList.add('hidden');
                nearbyLocationsInfo.classList.add('hidden');
                console.log("🌟 No discoveries made");
            }
        }

        function setupDiscoveryTooltips() {
            // Remove existing tooltips
            const existingTooltips = document.querySelectorAll('.discovery-tooltip');
            existingTooltips.forEach(tooltip => tooltip.remove());

            const discoveryItems = document.querySelectorAll('.discovery-item');

            discoveryItems.forEach(item => {
                const discoveryName = item.dataset.discoveryName;
                const discoveryType = item.dataset.discoveryType;

                item.addEventListener('mouseenter', (e) => {
                    // Highlight the corresponding location or region on the map
                    highlightDiscoveryOnMap(discoveryName, discoveryType, true);

                    const tooltipContent = getDiscoveryTooltipContent(discoveryName, discoveryType);

                    if (tooltipContent) {
                        const tooltip = document.createElement('div');
                        tooltip.className = 'discovery-tooltip';
                        tooltip.innerHTML = tooltipContent;
                        tooltip.style.cssText = `
                            position: absolute;
                            background: rgba(17, 24, 39, 0.95);
                            color: white;
                            padding: 12px;
                            border-radius: 8px;
                            border: 1px solid #4b5563;
                            font-size: 14px;
                            max-width: 320px;
                            z-index: 1000;
                            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                            line-height: 1.4;
                        `;

                        document.body.appendChild(tooltip);

                        // Position tooltip à gauche de l'élément
                        const rect = item.getBoundingClientRect();
                        const tooltipRect = tooltip.getBoundingClientRect();

                        let left = rect.left + window.scrollX - tooltipRect.width - 10;
                        let top = rect.top + window.scrollY;

                        // Si le tooltip déborde à gauche, le placer à droite
                        if (left < 10) {
                            left = rect.right + window.scrollX + 10;
                        }

                        // Ajuster si le tooltip déborde en haut
                        if (top < window.scrollY + 10) {
                            top = window.scrollY + 10;
                        }

                        // Ajuster si le tooltip déborde en bas
                        if (top + tooltipRect.height > window.innerHeight + window.scrollY - 10) {
                            top = window.innerHeight + window.scrollY - tooltipRect.height - 10;
                        }

                        tooltip.style.left = left + 'px';
                        tooltip.style.top = top + 'px';
                    }
                });

                item.addEventListener('mouseleave', () => {
                    // Remove highlight from the map
                    highlightDiscoveryOnMap(discoveryName, discoveryType, false);

                    const tooltips = document.querySelectorAll('.discovery-tooltip');
                    tooltips.forEach(tooltip => tooltip.remove());
                });

                // Add click event listener to open modal
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (discoveryType === 'location') {
                        const location = locationsData.locations.find(loc => loc.name === discoveryName);
                        if (location) {
                            // Simulate a click event on the location marker to open its info box
                            const fakeEvent = {
                                currentTarget: { dataset: { id: location.id.toString() } },
                                stopPropagation: () => {},
                                preventDefault: () => {}
                            };

                            showInfoBox(fakeEvent);

                            // Force expand the info box
                            if (!infoBox.classList.contains('expanded')) {
                                toggleInfoBoxExpand();
                            }
                        }
                    } else if (discoveryType === 'region') {
                        const region = regionsData.regions.find(reg => reg.name === discoveryName);
                        if (region) {
                            // Simulate a click event on the region to open its info box
                            const fakeEvent = {
                                stopPropagation: () => {},
                                preventDefault: () => {}
                            };

                            showRegionInfo(fakeEvent, region);

                            // Force expand the info box
                            if (!infoBox.classList.contains('expanded')) {
                                toggleInfoBoxExpand();
                            }
                        }
                    }
                });
            });
        }

        function highlightDiscoveryOnMap(discoveryName, discoveryType, highlight) {
            if (discoveryType === 'location') {
                // Find and highlight location marker
                const locationMarkers = document.querySelectorAll('.location-marker');
                locationMarkers.forEach(marker => {
                    const locationId = parseInt(marker.dataset.id, 10);
                    const location = locationsData.locations.find(loc => loc.id === locationId);

                    if (location && location.name === discoveryName) {
                        if (highlight) {
                            marker.style.borderColor = '#60a5fa'; // Light blue
                            marker.style.borderWidth = '6px';
                            marker.style.zIndex = '1000';
                        } else {
                            // Restore original border
                            marker.style.borderColor = location.visited ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
                            marker.style.borderWidth = '4px';
                            marker.style.zIndex = '';
                        }
                    }
                });
            } else if (discoveryType === 'region') {
                // Find and highlight region path
                const regionPaths = regionsLayer.querySelectorAll('.region');
                regionPaths.forEach(path => {
                    const regionId = parseInt(path.dataset.regionId, 10);
                    const region = regionsData.regions.find(reg => reg.id === regionId);

                    if (region && region.name === discoveryName) {
                        if (highlight) {
                            path.style.stroke = '#1e40af'; // Dark blue
                            path.style.strokeWidth = '6'; // Thicker border
                            path.style.zIndex = '1000';
                        } else {
                            // Restore original stroke
                            path.style.stroke = colorMap[region.color] || colorMap.green;
                            path.style.strokeWidth = '2';
                            path.style.zIndex = '';
                        }
                    }
                });
            }
        }
        // Le bouton generate-journey-log a été supprimé - la fonctionnalité est maintenant intégrée dans voyage-manager.js
        // document.getElementById('generate-journey-log').addEventListener('click', handleGenerateJourneyLog);
        document.getElementById('close-journey-log').addEventListener('click', () => journeyLogModal.classList.add('hidden'));

        // --- Narration Functions ---
        function getNarrationPromptAddition() {
            const selectedStyle = document.querySelector('input[name="narration-style"]:checked');
            const adventurersGroup = localStorage.getItem('adventurersGroup') || '';
            const adventurersQuest = localStorage.getItem('adventurersQuest') || '';

            let addition = '';

            // Add group and quest info if available
            if (adventurersGroup.trim()) {
                addition += `\n\nGroupe d'aventuriers : ${adventurersGroup}`;
            }

            if (adventurersQuest.trim()) {
                addition += `\n\nQuête : ${adventurersQuest}`;
            }

            // Add style instruction
            if (selectedStyle) {
                const style = selectedStyle.value;
                switch (style) {
                    case 'detailed':
                        addition += '\n\nStyle : Rédigez une narration détaillée en plusieurs paragraphes avec un style littéraire évocateur.';
                        break;
                    case 'brief':
                        addition += '\n\nStyle : Rédigez une narration brève en un seul paragraphe concis.';
                        break;
                    case 'keywords':
                        addition += '\n\nStyle : Fournissez uniquement des mots-clés évocateurs pour inspiration du Meneur de Jeu.';
                        break;
                }
            }

            return addition;
        }

        // --- Image Edit Functions ---
        function generateImageEditHTML(images) {
            return images.map((img, index) => `
                <div class="image-edit-item bg-gray-800 p-3 rounded mb-2">
                    <div class="flex items-center space-x-2 mb-2">
                        <input type="url" class="image-url-input flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm" value="${img.url}" placeholder="URL de l'image">
                        <label class="flex items-center text-sm">
                            <input type="checkbox" class="default-image-checkbox mr-1" ${img.isDefault ? 'checked' : ''}>
                            Défaut
                        </label>
                        <button type="button" class="remove-image-btn text-red-400 hover:text-red-300 text-sm px-2 py-1">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    ${img.url ? `<img src="${img.url}" alt="Aperçu" class="w-20 h-20 object-cover rounded" onerror="this.style.display='none'">` : ''}
                </div>
            `).join('');
        }

        function setupImageEditListeners() {
            const container = document.getElementById('edit-images-container');
            const addBtn = document.getElementById('add-image-btn');

            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    const existingImages = container.querySelectorAll('.image-edit-item').length;
                    if (existingImages >= 5) {
                        alert('Maximum 5 images par lieu/région.');
                        return;
                    }

                    const newImageHtml = generateImageEditHTML([{ url: '', isDefault: false }]);
                    container.insertAdjacentHTML('beforeend', newImageHtml);
                    setupImageEditItemListeners(container.lastElementChild);
                });
            }

            // Setup existing items
            container.querySelectorAll('.image-edit-item').forEach(setupImageEditItemListeners);
        }

        function setupImageEditItemListeners(item) {
            const removeBtn = item.querySelector('.remove-image-btn');
            const defaultCheckbox = item.querySelector('.default-image-checkbox');

            if (removeBtn) {
                removeBtn.addEventListener('click', () => item.remove());
            }

            if (defaultCheckbox) {
                defaultCheckbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        // Uncheck other default checkboxes
                        document.querySelectorAll('.default-image-checkbox').forEach(cb => {
                            if (cb !== e.target) cb.checked = false;
                        });
                    }
                });
            }
        }

        // --- Gemini API Functions ---
        async function callGemini(prompt, button) {
            const buttonIcon = button.querySelector('.gemini-icon') || button;
            const originalContent = buttonIcon.innerHTML;
            buttonIcon.innerHTML = `<i class="fas fa-spinner gemini-btn-spinner"></i>`;
            button.disabled = true;

            let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory };

            try {
                // Récupérer la clé API depuis le serveur
                const configResponse = await fetch('/api/gemini/config');
                const config = await configResponse.json();

                if (!config.api_key_configured || !config.api_key) {
                    console.error("Gemini API key not configured on server.");
                    buttonIcon.innerHTML = originalContent;
                    button.disabled = false;
                    return "Erreur: Clé API Gemini non configurée sur le serveur.";
                }

                const apiModel = 'gemini-2.0-flash-exp';
                const apiVersion = 'v1beta';
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${config.api_key}`;

                // Logs pour debug
                console.log("🤖 [GEMINI API] Version:", apiVersion);
                console.log("🤖 [GEMINI API] Modèle:", apiModel);
                console.log("🤖 [GEMINI API] Prompt envoyé:");
                console.log("📝", prompt);
                console.log("🤖 [GEMINI API] URL complète:", apiUrl.replace(config.api_key, '[API_KEY_HIDDEN]'));

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                console.log("🤖 [GEMINI API] Statut de réponse:", response.status);

                if (!response.ok) {
                    // Try to get more details from the response body if available
                    let errorMsg = `API request failed with status ${response.status}`;
                    try {
                        const errorData = await response.json();
                        console.error("🤖 [GEMINI API] Erreur détaillée:", errorData);
                        errorMsg += `: ${errorData.error?.message || JSON.stringify(errorData)}`;
                    } catch (jsonError) {
                        // Ignore JSON parsing errors
                    }
                    throw new Error(errorMsg);
                }

                const result = await response.json();
                console.log("🤖 [GEMINI API] Réponse reçue:", result);

                if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
                    const responseText = result.candidates[0].content.parts[0].text;
                    console.log("✅ [GEMINI API] Texte généré (longueur: " + responseText.length + " caractères)");
                    return responseText;
                } else {
                    // Handle cases where the response might be empty or malformed
                    console.warn("🤖 [GEMINI API] Réponse vide ou malformée:", result);
                    throw new Error("Invalid response structure from API");
                }
            } catch (error) {
                console.error("❌ [GEMINI API] Échec de l'appel:", error);
                return `Désolé, une erreur est survenue lors de la génération du texte: ${error.message}`;
            } finally {
                buttonIcon.innerHTML = originalContent;
                button.disabled = false;
            }
        }

        function findNearestLocation(point) {
            if (!point) return { name: 'un lieu sauvage' };
            let nearest = null;
            let minDistance = Infinity;
            locationsData.locations.forEach(loc => {
                // Ensure location has valid coordinates before calculating distance
                if (loc.coordinates && typeof loc.coordinates.x !== 'undefined' && typeof loc.coordinates.y !== 'undefined') {
                    const distance = Math.sqrt(Math.pow(loc.coordinates.x - point.x, 2) + Math.pow(loc.coordinates.y - point.y, 2));
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearest = loc;
                    }
                }
            });
            return nearest || { name: 'un lieu inconnu' };
        }

        async function handleGenerateJourneyLog(event) {
            const button = event.currentTarget;
            if (!startPoint || !lastPoint) {
                alert("Vous devez commencer un tracé sur la carte pour générer une chronique de voyage.");
                return;
            }

            const startLocation = findNearestLocation(startPoint);
            const endLocation = findNearestLocation(lastPoint);
            const miles = Math.round(totalPathPixels * (MAP_DISTANCE_MILES / MAP_WIDTH));
            const days = (Math.ceil((miles / 20) * 2) / 2).toFixed(1);

            // Générer la liste des découvertes chronologiques pour le prompt
            let journeyDetails = '';
            if (journeyDiscoveries && journeyDiscoveries.length > 0) {
                // Trier par ordre de découverte
                const chronologicalDiscoveries = journeyDiscoveries.sort((a, b) => a.discoveryIndex - b.discoveryIndex);

                const discoveryList = chronologicalDiscoveries.map((discovery, index) => {
                    const icon = discovery.type === 'region' ? '🗺️' : '📍';

                    // Calculer le temps pour atteindre cette découverte
                    let startIndex = 0;
                    if (index > 0) {
                        const prevDiscovery = chronologicalDiscoveries[index - 1];
                        if (prevDiscovery.type === 'region' && window.regionSegments) {
                            const segment = window.regionSegments.get(prevDiscovery.name);
                            startIndex = segment ? segment.exitIndex : prevDiscovery.discoveryIndex;
                        } else {
                            startIndex = prevDiscovery.discoveryIndex;
                        }
                    }

                    const reachDistance = calculatePathDistance(startIndex, discovery.discoveryIndex);
                    const reachMiles = pixelsToMiles(reachDistance);
                    const reachDays = milesToDays(reachMiles);

                    // Vérifier si c'est un point de départ
                    let travelInfo;
                    if (discovery.type === 'location' && startPoint && discovery.discoveryIndex === 0) {
                        // Find the actual location to check distance from start point
                        const location = locationsData.locations.find(loc => loc.name === discovery.name);
                        if (location && location.coordinates) {
                            const distanceFromStart = Math.sqrt(
                                Math.pow(location.coordinates.x - startPoint.x, 2) +
                                Math.pow(location.coordinates.y - startPoint.y, 2)
                            );
                            if (distanceFromStart <= 20) {
                                travelInfo = "(point de départ)";
                            } else {
                                // Add proximity information for locations
                                let proximityText = '';
                                if (discovery.proximityType === 'traversed') {
                                    proximityText = ', traversé';
                                } else if (discovery.proximityType === 'nearby') {
                                    proximityText = ', passage à proximité';
                                }
                                travelInfo = `(atteint en ${reachDays} jour${reachDays !== 1 ? 's' : ''}${proximityText})`;
                            }
                        } else {
                            // Add proximity information for locations
                            let proximityText = '';
                            if (discovery.proximityType === 'traversed') {
                                proximityText = ', traversé';
                            } else if (discovery.proximityType === 'nearby') {
                                proximityText = ', passage à proximité';
                            }
                            travelInfo = `(atteint en ${reachDays} jour${reachDays !== 1 ? 's' : ''}${proximityText})`;
                        }
                    } else {
                        // Add proximity information for locations
                        let proximityText = '';
                        if (discovery.type === 'location') {
                            if (discovery.proximityType === 'traversed') {
                                proximityText = ', traversé';
                            } else if (discovery.proximityType === 'nearby') {
                                proximityText = ', passage à proximité';
                            }
                        }
                        travelInfo = `(atteint en ${reachDays} jour${reachDays !== 1 ? 's' : ''}${proximityText})`;
                    }

                    let displayText = `${icon} ${discovery.name} ${travelInfo}`;

                    // Pour les régions, ajouter la durée de traversée
                    if (discovery.type === 'region' && window.regionSegments) {
                        const segment = window.regionSegments.get(discovery.name);
                        if (segment) {
                            const regionDistance = calculatePathDistance(segment.entryIndex, segment.exitIndex);
                            const regionMiles = pixelsToMiles(regionDistance);
                            const regionDays = milesToDays(regionMiles);

                            if (travelInfo === "(point de départ)") {
                                displayText = `${icon} ${discovery.name} (point de départ, durée ${regionDays} jour${regionDays !== 1 ? 's' : ''})`;
                            } else {
                                displayText = `${icon} ${discovery.name} (atteint en ${reachDays} jour${reachDays !== 1 ? 's' : ''}, durée ${regionDays} jour${regionDays !== 1 ? 's' : ''})`;
                            }
                        }
                    }

                    return displayText;
                }).join(', ');

                journeyDetails = `\n\nVoici les étapes de ce voyage :\n${discoveryList}`;
            }

            const narrationAddition = getNarrationPromptAddition();
            const prompt = `Rédige une courte chronique de voyage, dans le style de J.R.R. Tolkien, pour un périple en Terre du Milieu. Le voyage a débuté à ${startLocation.name} et s'est terminé près de ${endLocation.name}, couvrant une distance d'environ ${miles} miles, soit environ ${days} jours de marche. ${journeyDetails}.${narrationAddition}`;


            const journeyLogContent = document.getElementById('journey-log-content');
            journeyLogContent.innerHTML = '<p>Génération de la chronique en cours...</p>';
            journeyLogModal.classList.remove('hidden');

            const result = await callGemini(prompt, button);
            journeyLogContent.innerHTML = result.replace(/\n/g, '<br>');
        }

        async function handleGenerateDescription(event) {
            const button = event.currentTarget;
            const modal = button.closest('.bg-gray-900');
            const nameInput = modal.querySelector('input[type="text"]');
            const descTextarea = modal.querySelector('textarea');
            const locationName = nameInput.value;

            if (!locationName) {
                alert("Veuillez d'abord entrer un nom pour le lieu.");
                return;
            }

            const prompt = `Rédige une courte description évocatrice pour un lieu de la Terre du Milieu nommé '${locationName}'. Décris son apparence, son atmosphère et son histoire possible, dans le style de J.R.R. Tolkien. Sois concis.`;

            const result = await callGemini(prompt, button);
            descTextarea.value = result;
        }

        // --- Google Authentication Functions ---
        async function checkAuthStatus() {
            logAuth("🔐 [AUTH] Vérification du statut d'authentification...", "");
            try {
                const response = await fetch('/api/auth/user');
                logAuth("🔐 [AUTH] Réponse reçue:", response.status);

                if (response.ok) {
                    const data = await response.json();
                    logAuth("🔐 [AUTH] Données d'authentification reçues:", data);

                    if (data.authenticated && data.user) {
                        currentUser = data.user;
                        logAuth("🔐 [AUTH] Utilisateur authentifié:", currentUser.name);
                        updateAuthUI(true);
                        await loadSavedContexts();
                        enableAutoSync();
                    } else {
                        currentUser = null;
                        logAuth("🔐 [AUTH] Utilisateur non authentifié", "");
                        updateAuthUI(false);
                    }
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                logAuth("🔐 [AUTH] Erreur lors de la vérification d'authentification:", error.message || error);
                currentUser = null;
                updateAuthUI(false);
            }
        }

        function handleGoogleSignIn() {
            logAuth("Redirection vers Google OAuth...");
            // Redirect to Google OAuth flow on the server
            window.location.href = '/auth/google';
        }

        function updateAuthUI(isAuthenticated) {
            logAuth("Mise à jour de l'interface utilisateur d'authentification");
            authStatusPanel.classList.add('hidden');
            authContentPanel.classList.remove('hidden');

            const authIcon = document.getElementById('auth-icon');
            const userProfilePic = document.getElementById('user-profile-pic');
            const authBtn = document.getElementById('auth-btn');

            if (isAuthenticated) {
                logAuth("Affichage du panneau utilisateur connecté");
                loggedInPanel.classList.remove('hidden');
                loggedOutPanel.classList.add('hidden');
                authUserName.textContent = currentUser.name || currentUser.email || 'Utilisateur';

                // Afficher la photo de profil si disponible
                if (currentUser.picture) {
                    userProfilePic.src = currentUser.picture;
                    userProfilePic.classList.remove('hidden');
                    authIcon.classList.add('hidden');
                    authBtn.title = `Connecté en tant que ${currentUser.name || currentUser.email}`;
                } else {
                    // Pas de photo, garder l'icône mais changer le style
                    userProfilePic.classList.add('hidden');
                    authIcon.classList.remove('hidden');
                    authIcon.className = 'fas fa-user-check text-green-400';
                    authBtn.title = `Connecté en tant que ${currentUser.name || currentUser.email}`;
                }

                // loadSavedContexts() est appelé dans checkAuthStatus après la confirmation de connexion
                // enableAutoSync() est appelé dans checkAuthStatus après la confirmation de connexion
            } else {
                logAuth("Affichage du panneau utilisateur non connecté");
                loggedInPanel.classList.add('hidden');
                loggedOutPanel.classList.remove('hidden');

                // Remettre l'icône par défaut
                userProfilePic.classList.add('hidden');
                authIcon.classList.remove('hidden');
                authIcon.className = 'fas fa-user';
                authBtn.title = 'Authentification et sauvegarde';

                disableAutoSync(); // Désactiver la synchronisation
            }
        }

        async function saveCurrentContext() {
            const contextName = contextNameInput.value.trim();
            if (!contextName) {
                alert("Veuillez entrer un nom pour le contexte.");
                return;
            }
            if (!currentUser) {
                alert("Vous devez être connecté pour sauvegarder des contextes.");
                return;
            }

            const currentData = {
                locations: locationsData,
                regions: regionsData,
                scale: scale,
                panX: panX,
                panY: panY,
                activeFilters: activeFilters,
                filters: activeFilters, // Ajout explicite des filtres pour compatibilité
                journeyPath: journeyPath,
                totalPathPixels: totalPathPixels,
                startPoint: startPoint,
                lastPoint: lastPoint,
                journeyDiscoveries: journeyDiscoveries, // Included journey discoveries
                currentSeason: currentSeason // Included season data
            };

            try {
                const response = await fetch('/api/contexts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: contextName, data: currentData })
                });

                if (response.ok) {
                    alert(`Contexte "${contextName}" sauvegardé avec succès !`);
                    contextNameInput.value = ''; // Clear input
                    loadSavedContexts(); // Refresh list
                } else {
                    const errorData = await response.json();
                    alert(`Erreur lors de la sauvegarde du contexte: ${errorData.error}`);
                }
            } catch (error) {
                console.error("Error saving context:", error);
                alert("Erreur réseau lors de la sauvegarde du contexte.");
            }
        }

        async function loadSavedContexts() {
            if (!currentUser) return;

            savedContextsDiv.innerHTML = '<p class="text-gray-500 italic">Chargement des contextes...</p>';
            if (!currentUser) {
                savedContextsDiv.innerHTML = '<p class="text-gray-500 italic">Connectez-vous pour voir vos contextes.</p>';
                return;
            }

            try {
                const response = await fetch('/api/contexts');
                if (response.ok) {
                    const contexts = await response.json();
                    savedContexts = contexts; // Store fetched contexts
                    displaySavedContexts(contexts);
                } else {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des contextes:', error.message || error);
                savedContextsDiv.innerHTML = '<p class="text-red-500">Impossible de charger les contextes.</p>';
            }
        }

        function displaySavedContexts(contexts) {
            savedContextsDiv.innerHTML = ''; // Clear previous content
            if (!contexts || contexts.length === 0) {
                savedContextsDiv.innerHTML = '<p class="text-gray-500 italic">Aucun contexte sauvegardé.</p>';
                return;
            }

            contexts.forEach(context => {
                const contextEl = document.createElement('div');
                contextEl.className = 'flex justify-between items-center bg-gray-700 p-2 rounded mb-1';
                contextEl.innerHTML = `
                    <span class="text-sm">${context.name}</span>
                    <div class="flex space-x-2">
                        <button class="load-context-btn text-blue-400 hover:text-blue-300" data-context-id="${context.id}">Charger</button>
                        <button class="delete-context-btn text-red-400 hover:text-red-300" data-context-id="${context.id}">Supprimer</button>
                    </div>
                `;
                savedContextsDiv.appendChild(contextEl);
            });

            // Add event listeners for load and delete buttons
            savedContextsDiv.querySelectorAll('.load-context-btn').forEach(btn => {
                btn.addEventListener('click', (e) => loadContext(e.target.dataset.contextId));
            });
            savedContextsDiv.querySelectorAll('.delete-context-btn').forEach(btn => {
                btn.addEventListener('click', (e) => deleteContext(e.target.dataset.contextId));
            });
        }

        async function loadContext(contextId) {
            try {
                const response = await fetch(`/api/contexts/${contextId}`);
                if (!response.ok) {
                    throw new Error(`Failed to load context: ${response.status}`);
                }

                const context = await response.json();

                // Load data
                locationsData = context.data.locations || { locations: [] };
                regionsData = context.data.regions || { regions: [] };
                scale = context.data.scale || 1;
                panX = context.data.panX || 0;
                panY = context.data.panY || 0;
                activeFilters = context.data.activeFilters || context.data.filters || { known: false, visited: false, colors: [] };

                // Load journey data
                journeyPath = context.data.journeyPath || [];
                totalPathPixels = context.data.totalPathPixels || 0;
                startPoint = context.data.startPoint || null;
                lastPoint = context.data.lastPoint || null;
                journeyDiscoveries = context.data.journeyDiscoveries || []; // Load journey discoveries

                // Load season data
                if (context.data.currentSeason && seasonNames[context.data.currentSeason]) {
                    currentSeason = context.data.currentSeason;
                    localStorage.setItem('currentSeason', currentSeason);
                }

                // Load calendar data
                if (typeof calendarManager !== 'undefined') {
                    if (context.data.calendarData) {
                        calendarManager.setCalendarData(context.data.calendarData);
                    }
                    if (context.data.currentCalendarDate) {
                        calendarManager.setCurrentCalendarDate(context.data.currentCalendarDate);
                    }
                    if (context.data.isCalendarMode !== undefined) {
                        calendarManager.setIsCalendarMode(context.data.isCalendarMode);
                    }
                    calendarManager.updateSeasonDisplay(); // Update season display based on loaded calendar data
                }

                // Redraw journey path if it exists
                if (journeyPath.length > 0) {
                    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                    ctx.beginPath();
                    ctx.moveTo(journeyPath[0].x, journeyPath[0].y);

                    for (let i = 1; i < journeyPath.length; i++) {
                        ctx.lineTo(journeyPath[i].x, journeyPath[i].y);
                    }
                    ctx.stroke();

                    // Update distance display
                    updateDistanceDisplay();
                    updateJourneyInfo();
                } else {
                    // Clear canvas if no journey path
                    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                    distanceContainer.classList.add('hidden');
                }

                // Re-render everything
                renderLocations();
                renderRegions();
                applyTransform();
                updateFilters(); // Apply loaded filters

                // Update UI elements
                document.getElementById('filter-known').checked = activeFilters.known;
                document.getElementById('filter-visited').checked = activeFilters.visited;
                document.getElementById('filter-show-regions').checked = true;
                document.querySelectorAll('.filter-color-checkbox').forEach(cb => {
                    cb.checked = activeFilters.colors.includes(cb.dataset.color);
                });

                // Update season UI (handled by CalendarManager now)

                alert(`Contexte "${context.name}" chargé.`);
                authModal.classList.add('hidden'); // Close modal after loading
            } catch (error) {
                console.error("Error loading context:", error);
                alert("Error loading context.");
            }
        }

        async function deleteContext(contextId) {
            if (!confirm("Êtes-vous sûr de vouloir supprimer ce contexte ?")) return;

            try {
                const response = await fetch(`/api/contexts/${contextId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    savedContexts = savedContexts.filter(c => c.id !== contextId);
                    displaySavedContexts(savedContexts);
                    alert("Contexte supprimé.");
                } else {
                    throw new Error(`Failed to delete context: ${response.status}`);
                }
            } catch (error) {
                console.error("Error deleting context:", error);
                alert("Erreur lors de la suppression du contexte.");
            }
        }

        // Setup settings event listeners
        function setupSettingsEventListeners() {
            // Settings button
            const settingsBtn = document.getElementById('settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => {
                    const settingsModal = document.getElementById('settings-modal');
                    if (settingsModal) {
                        settingsModal.classList.remove('hidden');
                        // Configurer les onglets à chaque ouverture
                        setupSettingsTabSwitching();
                    }
                });
            }

            // Close settings modal
            const closeSettingsBtn = document.getElementById('close-settings-modal');
            if (closeSettingsBtn) {
                closeSettingsBtn.addEventListener('click', () => {
                    const settingsModal = document.getElementById('settings-modal');
                    if (settingsModal) {
                        settingsModal.classList.add('hidden');
                    }
                });
            }

            // Maps event listeners
            setupMapsEventListeners();

            // Season indicator click to open settings
            const seasonIndicator = document.getElementById('season-indicator');
            const calendarDateIndicator = document.getElementById('calendar-date-indicator');

            // Réinitialiser les listeners du CalendarManager si nécessaire
            if (typeof calendarManager !== 'undefined') {
                calendarManager.reinitializeListeners();
            }

            if (seasonIndicator) {
                seasonIndicator.addEventListener('click', openSettingsOnSeasonTab);
            }

            if (calendarDateIndicator) {
                calendarDateIndicator.addEventListener('click', openSettingsOnSeasonTab);
            }
        }

        // Setup authentication event listeners
        function setupAuthEventListeners() {
            logAuth("Configuration des event listeners d'authentification...");

            waitForElement('#auth-btn', (authBtn) => {
                logAuth("Bouton d'authentification trouvé et configuré");
                authBtn.addEventListener('click', (event) => {
                    logAuth("Clic sur le bouton d'authentification détecté!");
                    event.preventDefault();
                    event.stopPropagation();
                    toggleAuthModal();
                });
            });

            waitForElement('#close-auth-modal', (closeAuthModalBtn) => {
                logAuth("Bouton de fermeture modal trouvé et configuré");
                closeAuthModalBtn.addEventListener('click', (event) => {
                    logAuth("Clic sur le bouton de fermeture modal détecté!");
                    event.preventDefault();
                    event.stopPropagation();
                    const authModal = document.getElementById('auth-modal');
                    if (authModal) {
                        authModal.classList.add('hidden');
                    }
                });
            });

            waitForElement('#save-context-btn', (saveContextBtn) => {
                logAuth("Bouton de sauvegarde contexte trouvé et configuré");
                saveContextBtn.addEventListener('click', saveCurrentContext);
            });

            waitForElement('#google-signin-btn', (googleSigninBtn) => {
                logAuth("Bouton Google Sign-In trouvé et configuré");
                googleSigninBtn.addEventListener('click', handleGoogleSignIn);
            });
        }

        // Helper function to wait for an element and then execute a callback
        function waitForElement(selector, callback, maxWait = 5000) {
            const startTime = Date.now();

            function check() {
                const element = document.querySelector(selector);
                if (element) {
                    callback(element);
                } else if (Date.now() - startTime < maxWait) {
                    setTimeout(check, 100);
                } else {
                    logAuth("TIMEOUT: Élément non trouvé:", selector);
                }
            }

            check();
        }

        // --- Voyage Segments Functions ---
        function resetVoyageSegments() {
            currentVoyage = null;
            voyageSegments = [];
            isVoyageActive = false;
            currentSegmentIndex = 0;
            activatedSegments.clear();
            console.log("🧹 Segments de voyage réinitialisés");
        }

        function handleStartVoyage() {
            if (journeyPath.length === 0 || journeyDiscoveries.length === 0) {
                alert("Vous devez d'abord tracer un chemin sur la carte pour démarrer un voyage.");
                return;
            }

            // Initialize voyage
            currentVoyage = {
                startPoint: startPoint,
                journeyPath: [...journeyPath],
                journeyDiscoveries: [...journeyDiscoveries],
                totalDistance: totalPathPixels,
                createdAt: new Date().toISOString()
            };

            // Générer automatiquement tous les segments basés sur les régions traversées
            voyageSegments = generateVoyageSegments();

            // Réinitialiser l'état d'activation
            activatedSegments.clear();

            isVoyageActive = true;
            currentSegmentIndex = 0;

            console.log("🚢 Voyage démarré:", currentVoyage);
            console.log("🗺️ Segments générés:", voyageSegments);
            console.log("🎯 Index initial:", currentSegmentIndex);
            console.log("📊 État voyage:", {
                isVoyageActive: isVoyageActive,
                totalSegments: voyageSegments.length,
                currentIndex: currentSegmentIndex,
                activatedSegments: Array.from(activatedSegments)
            });
            updateVoyageSegmentsDisplay();
            scheduleAutoSync();
        }

        function generateVoyageSegments() {
            const segments = [];

            // Extraire les régions dans l'ordre chronologique
            const regionDiscoveries = journeyDiscoveries
                .filter(d => d.type === 'region')
                .sort((a, b) => a.discoveryIndex - b.discoveryIndex);

            if (regionDiscoveries.length === 0) {
                // Pas de régions, créer un segment simple
                return [{
                    id: 1,
                    duration: 1, // Par défaut 1 jour
                    startLocation: 'Point de départ',
                    endLocation: 'Point d\'arrivée',
                    status: 'active',
                    createdAt: new Date().toISOString()
                }];
            }

            // Créer des segments basés sur les transitions entre régions
            for (let i = 0; i < regionDiscoveries.length; i++) {
                const currentRegion = regionDiscoveries[i];
                const nextRegion = regionDiscoveries[i + 1];

                segments.push({
                    id: i + 1,
                    duration: 1, // Par défaut 1 jour
                    startLocation: currentRegion.name,
                    endLocation: nextRegion ? nextRegion.name : findEndLocation(),
                    status: 'active',
                    createdAt: new Date().toISOString()
                });
            }

            return segments;
        }

        function findEndLocation() {
            // Trouver le dernier lieu ou région significatif
            const lastDiscoveries = journeyDiscoveries
                .sort((a, b) => b.discoveryIndex - a.discoveryIndex)
                .slice(0, 3);

            for (const discovery of lastDiscoveries) {
                if (discovery.type === 'region') {
                    return discovery.name;
                }
            }

            for (const discovery of lastDiscoveries) {
                if (discovery.type === 'location') {
                    return discovery.name;
                }
            }

            return 'Point d\'arrivée';
        }

        function generateSegmentName(segmentIndex) {
            console.log("🏷️ Génération nom segment:", {
                segmentIndex: segmentIndex,
                hasVoyage: !!currentVoyage,
                segmentsLength: voyageSegments.length,
                segmentExists: !!voyageSegments[segmentIndex]
            });

            if (!currentVoyage || voyageSegments.length === 0 || !voyageSegments[segmentIndex]) {
                console.log("⚠️ Segment par défaut utilisé");
                return "Segment de voyage";
            }

            const segment = voyageSegments[segmentIndex];
            const name = segment.startLocation;
            console.log("✅ Nom généré:", name);
            return name;
        }

        function findLocationAtDay(dayTarget) {
            if (!currentVoyage || !journeyPath.length) return "lieu inconnu";

            const totalDays = getTotalJourneyDays();
            const targetRatio = Math.min(dayTarget / totalDays, 1);
            const targetPathIndex = Math.floor(targetRatio * (journeyPath.length - 1));
            const targetPoint = journeyPath[targetPathIndex];

            // Chercher le lieu le plus proche
            let nearestLocation = null;
            let minDistance = Infinity;

            locationsData.locations.forEach(location => {
                if (!location.coordinates) return;

                const distance = Math.sqrt(Math.pow(location.coordinates.x - targetPoint.x, 2) + Math.pow(location.coordinates.y - targetPoint.y, 2));

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestLocation = location;
                }
            });

            return nearestLocation ? nearestLocation.name : "lieu inconnu";
        }

        function calculateSegmentDailyContent(segmentIndex) {
            if (!currentVoyage || !voyageSegments[segmentIndex]) {
                return [];
            }

            // Ne calculer que si le segment est activé
            if (!activatedSegments.has(segmentIndex)) {
                return [{
                    day: 1,
                    chronologicalItems: [],
                    activities: ["🚶 Voyage le long du chemin tracé"],
                    calendarDate: getCalendarDateForSegmentDay(segmentIndex, 1)
                }];
            }

            const segment = voyageSegments[segmentIndex];
            const dailyContent = [];

            // Calculer les jours cumulés jusqu'au segment actuel (inclus)
            let segmentStartDays = 0;
            for (let i = 0; i < segmentIndex; i++) {
                segmentStartDays += voyageSegments[i].duration;
            }

            // Calculer les indices de chemin pour ce segment
            const totalDays = getTotalJourneyDays();
            const segmentStartRatio = segmentStartDays / totalDays;
            const segmentEndRatio = (segmentStartDays + segment.duration) / totalDays;

            const segmentStartIndex = Math.floor(segmentStartRatio * (journeyPath.length - 1));
            const segmentEndIndex = Math.min(
                Math.floor(segmentEndRatio * (journeyPath.length - 1)),
                journeyPath.length - 1
            );

            // Créer le contenu journalier
            for (let day = 1; day <= segment.duration; day++) {
                const currentDay = segmentStartDays + day;
                const dayContent = {
                    day: day,
                    chronologicalItems: [],
                    activities: []
                };

                // Calculer la plage d'indices de chemin pour ce jour
                const dayStartRatio = (currentDay - 1) / totalDays;
                const dayEndRatio = currentDay / totalDays;
                const dayStartIndex = Math.floor(dayStartRatio * (journeyPath.length - 1));
                const dayEndIndex = Math.floor(dayEndRatio * (journeyPath.length - 1));

                // Collecter toutes les découvertes pour ce jour avec leur index de découverte
                const dayDiscoveries = [];

                // Ajouter les découvertes de régions
                journeyDiscoveries.forEach(discovery => {
                    if (discovery.type === 'region' && window.regionSegments) {
                        const regionSegment = window.regionSegments.get(discovery.name);
                        if (regionSegment) {
                            // Vérifier si cette région est traversée pendant ce jour
                            const regionOverlapsDay = (
                                regionSegment.entryIndex <= dayEndIndex &&
                                regionSegment.exitIndex >= dayStartIndex
                            );

                            if (regionOverlapsDay) {
                                dayDiscoveries.push({
                                    ...discovery,
                                    sortIndex: discovery.discoveryIndex,
                                    content: `🗺️ ${escapeHtml(discovery.name)}`,
                                    isEntry: discovery.discoveryIndex >= dayStartIndex && discovery.discoveryIndex <= dayEndIndex,
                                    isExit: regionSegment.exitIndex >= dayStartIndex && regionSegment.exitIndex <= dayEndIndex
                                });
                            }
                        }
                    }
                });

                // Ajouter les découvertes de lieux
                journeyDiscoveries.forEach(discovery => {
                    if (discovery.type === 'location') {
                        // Vérifier si ce lieu est découvert pendant ce jour
                        if (discovery.discoveryIndex >= dayStartIndex && discovery.discoveryIndex <= dayEndIndex) {
                            dayDiscoveries.push({
                                ...discovery,
                                sortIndex: discovery.discoveryIndex,
                                content: `📍 ${escapeHtml(discovery.name)}`
                            });
                        }
                    }
                });

                // Trier toutes les découvertes par ordre chronologique (index de découverte)
                dayDiscoveries.sort((a, b) => a.sortIndex - b.sortIndex);

                // Ajouter au contenu du jour
                dayContent.chronologicalItems = dayDiscoveries.map(item => item.content);

                // Ajouter des activités génériques si nécessaire
                if (dayContent.chronologicalItems.length === 0) {
                    dayContent.activities.push("🚶 Voyage le long du chemin tracé");
                }

                dailyContent.push(dayContent);
            }

            return dailyContent;
        }

        function getCalendarDateForSegmentDay(segmentIndex, dayInSegment) {
            if (!calendarManager || !calendarManager.getIsCalendarMode() || !calendarManager.getCurrentCalendarDate() || !calendarManager.getCalendarData()) {
                return null;
            }

            const calendarData = calendarManager.getCalendarData();
            const currentCalendarDate = calendarManager.getCurrentCalendarDate();

            // Calculer le jour absolu depuis le début du voyage
            let absoluteDay = dayInSegment;
            for (let i = 0; i < segmentIndex; i++) {
                absoluteDay += voyageSegments[i].duration;
            }

            // Trouver le mois et jour actuels dans le calendrier
            const currentMonthIndex = calendarData.findIndex(m => m.name === currentCalendarDate.month);
            if (currentMonthIndex === -1) return null;

            let monthIndex = currentMonthIndex;
            let day = currentCalendarDate.day + absoluteDay - 1;

            // Naviguer à travers les mois si nécessaire
            while (day > calendarData[monthIndex].days.length) {
                day -= calendarData[monthIndex].days.length;
                monthIndex = (monthIndex + 1) % calendarData.length;
            }

            return {
                month: calendarData[monthIndex].name,
                day: day
            };
        }

        function renderSegmentContent(segmentIndex) {
            const segmentContentDiv = document.getElementById('segment-content');
            const dailyContent = calculateSegmentDailyContent(segmentIndex);

            if (dailyContent.length === 0) {
                segmentContentDiv.innerHTML = '<div class="text-gray-500 text-center">Aucun contenu pour ce segment</div>';
                return;
            }

            const contentHtml = dailyContent.map(dayData => {
                let dayTitle = `Jour ${dayData.day}`;

                // Ajouter la date du calendrier si disponible
                const calendarDate = getCalendarDateForSegmentDay(segmentIndex, dayData.day);
                if (calendarDate) {
                    dayTitle += ` (${calendarDate.day} ${calendarDate.month})`;
                }

                let dayActivities = [];

                // Ajouter les découvertes dans l'ordre chronologique
                if (dayData.chronologicalItems && dayData.chronologicalItems.length > 0) {
                    dayActivities = [...dayData.chronologicalItems];
                }

                // Ajouter les activités génériques
                if (dayData.activities && dayData.activities.length > 0) {
                    dayActivities = dayActivities.concat(dayData.activities);
                }

                return `
                    <div class="day-section">
                        <h5 class="font-semibold text-blue-300 mb-2">${dayTitle}</h5>
                        <div class="ml-4 text-sm text-gray-300 space-y-1">
                            ${dayActivities.map(activity => {
                                // Analyser l'activité pour détecter les lieux et régions
                                const processedActivity = processActivityForHighlight(activity);
                                return `<p class="leading-relaxed">${processedActivity}</p>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('');

            // Use innerHTML to properly render HTML content
            segmentContentDiv.innerHTML = contentHtml;
            setupSegmentDiscoveryHighlight();
        }

        function updateCurrentSegmentDisplay() {
            console.log("🔄 Mise à jour segment:", {
                currentSegmentIndex: currentSegmentIndex,
                totalSegments: voyageSegments.length,
                isVoyageActive: isVoyageActive,
                currentSegment: voyageSegments[currentSegmentIndex],
                activatedSegments: Array.from(activatedSegments)
            });

            const currentSegmentDiv = document.getElementById('current-segment-display');
            const noVoyageMessage = document.getElementById('no-voyage-message');
            const progressBar = document.getElementById('voyage-progress-bar');
            const endMessage = document.getElementById('voyage-end-message');
            const modalTitle = document.getElementById('voyage-modal-title');

            if (!isVoyageActive || voyageSegments.length === 0) {
                console.log("❌ Pas de voyage actif oupas de segments");
                currentSegmentDiv.classList.add('hidden');
                noVoyageMessage.classList.remove('hidden');
                progressBar.classList.add('hidden');
                endMessage.classList.add('hidden');
                modalTitle.textContent = "Segments de Voyage";
                return;
            }

            // Vérifier que l'index est valide
            if (currentSegmentIndex < 0 || currentSegmentIndex >= voyageSegments.length) {
                console.error("❌ Index de segment invalide:", currentSegmentIndex, "segments disponibles:", voyageSegments.length);
                currentSegmentIndex = Math.max(0, Math.min(currentSegmentIndex, voyageSegments.length - 1));
                console.log("🔧 Index corrigé à:", currentSegmentIndex);
            }

            // Activer automatiquement le premier segment
            if (currentSegmentIndex === 0) {
                activatedSegments.add(0);
            }

            noVoyageMessage.classList.add('hidden');
            currentSegmentDiv.classList.remove('hidden');

            // Mettre à jour le titre du segment avec indicateur d'activation
            const segmentTitle = document.getElementById('segment-title');
            const segmentName = generateSegmentName(currentSegmentIndex);
            const isActivated = activatedSegments.has(currentSegmentIndex);
            segmentTitle.innerHTML = isActivated ? segmentName : `${segmentName} <span class="text-gray-500">(non activé)</span>`;

            console.log("📝 Titre du segment mis à jour:", segmentName, "Activé:", isActivated);

            // Mettre à jour les boutons de navigation
            const prevBtn = document.getElementById('prev-segment-btn');
            const nextBtn = document.getElementById('next-segment-btn');

            // Bouton précédent : masqué si premier segment
            if (currentSegmentIndex === 0) {
                prevBtn.style.visibility = 'hidden';
            } else {
                prevBtn.style.visibility = 'visible';
            }

            // Bouton suivant : vérifier s'il peut y avoir un segment suivant
            const canHaveNextSegment = checkIfMoreSegmentsNeeded() || currentSegmentIndex < voyageSegments.length - 1;

            if (!canHaveNextSegment) {
                nextBtn.style.visibility = 'hidden';
            } else {
                nextBtn.style.visibility = 'visible';
                const nextSegmentExists = currentSegmentIndex + 1 < voyageSegments.length;
                if (nextSegmentExists) {
                    const nextSegmentActivated = activatedSegments.has(currentSegmentIndex + 1);
                    nextBtn.title = nextSegmentActivated ? "Segment suivant" : "Activer le segment suivant";
                    nextBtn.innerHTML = nextSegmentActivated ? '<i class="fas fa-chevron-right"></i>' : '<i class="fas fa-play"></i>';
                } else {
                    // Le segment suivant n'existe pas encore mais peut être créé
                    nextBtn.title = "Créer et activer le segment suivant";
                    nextBtn.innerHTML = '<i class="fas fa-plus"></i>';
                }
            }

            // Vérifier si c'est la fin du voyage (plus de segments possibles et on est au dernier segment)
            if (!canHaveNextSegment && currentSegmentIndex === voyageSegments.length - 1) {
                endMessage.classList.remove('hidden');
            } else {
                endMessage.classList.add('hidden');
            }

            // Mettre à jour le slider de durée
            const durationSlider = document.getElementById('current-segment-duration');
            const durationValue = document.getElementById('current-segment-duration-value');
            const currentSegment = voyageSegments[currentSegmentIndex];

            durationSlider.value = currentSegment.duration;
            durationValue.textContent = currentSegment.duration;

            // Mettre à jour le contenu du segment
            renderSegmentContent(currentSegmentIndex);

            // Mettre à jour la barre de progression basée sur le segment
            updateSegmentProgressBar();
            progressBar.classList.remove('hidden');
        }

        function updateSegmentProgressBar() {
            if (!voyageSegments[currentSegmentIndex]) return;

            // Calculer les jours cumulés jusqu'au segment actuel (inclus)
            let cumulativeDays = 0;
            for (let i = 0; i <= currentSegmentIndex; i++) {
                cumulativeDays += voyageSegments[i].duration;
            }

            // Calculer le total de jours basé sur la distance du tracé (valeur fixe)
            const totalVoyageDays = getTotalJourneyDays();

            // Calculer le pourcentage de progression
            const progressPercent = totalVoyageDays > 0 ? (cumulativeDays / totalVoyageDays) * 100 : 0;

            const progressFill = document.getElementById('progress-fill');
            const progressMarker = document.getElementById('progress-marker');
            const progressIndicator = document.getElementById('progress-indicator');
            const totalDaysSpan = document.getElementById('total-days');

            progressFill.style.width = `${progressPercent}%`;
            progressMarker.style.left = `calc(${progressPercent}% - 12px)`;
            progressMarker.querySelector('span').textContent = cumulativeDays;

            progressIndicator.textContent = `Progression : ${cumulativeDays} / ${totalVoyageDays} jours`;
            totalDaysSpan.textContent = totalVoyageDays;
        }

        function navigateToSegment(direction) {
            console.log("🧭 Navigation segment:", {
                direction: direction,
                currentIndex: currentSegmentIndex,
                totalSegments: voyageSegments.length,
                activatedSegments: Array.from(activatedSegments),
                segmentNames: voyageSegments.map((s, i) => `${i}: ${s.startLocation} -> ${s.endLocation}`)
            });

            if (direction === 'prev' && currentSegmentIndex > 0) {
                currentSegmentIndex--;
                console.log("⬅️ Navigation précédente vers segment", currentSegmentIndex);
            } else if (direction === 'next') {
                const nextIndex = currentSegmentIndex + 1;

                // Si le segment suivant n'existe pas, le créer dynamiquement
                if (nextIndex >= voyageSegments.length) {
                    const needsMoreSegments = checkIfMoreSegmentsNeeded();
                    if (needsMoreSegments) {
                        createNextSegment();
                        console.log("🆕 Nouveau segment créé:", voyageSegments.length - 1);
                    } else {
                        console.log("🏁 Voyage terminé, pas de segment suivant nécessaire");
                        return; // Pas de segment suivant possible
                    }
                }

                // Si le segment suivant n'est pas activé, l'activer
                if (!activatedSegments.has(nextIndex)) {
                    activatedSegments.add(nextIndex);
                    console.log("🎬 Activation du segment", nextIndex);
                }

                currentSegmentIndex = nextIndex;
                console.log("➡️ Navigation suivante vers segment", currentSegmentIndex);
            } else {
                console.log("🚫 Navigation impossible:", direction, "currentIndex:", currentSegmentIndex, "totalSegments:", voyageSegments.length);
                return; // Arrêter ici si la navigation n'est pas possible
            }

            updateCurrentSegmentDisplay();
            scheduleAutoSync();
        }

        function handleSegmentDurationChange() {
            const newDuration = parseInt(document.getElementById('current-segment-duration').value);
            const durationValue = document.getElementById('current-segment-duration-value');

            durationValue.textContent = newDuration;

            if (voyageSegments[currentSegmentIndex]) {
                voyageSegments[currentSegmentIndex].duration = newDuration;

                // Supprimer tous les segments suivants
                removeFollowingSegments();

                // Recalculer le contenu du segment actuel
                renderSegmentContent(currentSegmentIndex);

                // Mettre à jour l'affichage complet (y compris le message de fin)
                updateCurrentSegmentDisplay();
                scheduleAutoSync();
            }
        }

        function removeFollowingSegments() {
            // Supprimer tous les segments après le segment actuel
            voyageSegments = voyageSegments.slice(0, currentSegmentIndex + 1);

            // Supprimer les activations des segments supprimés
            const segmentsToRemove = [];
            activatedSegments.forEach(index => {
                if (index > currentSegmentIndex) {
                    segmentsToRemove.push(index);
                }
            });
            segmentsToRemove.forEach(index => {
                activatedSegments.delete(index);
            });

            console.log("🗑️ Segments suivants supprimés. Nouveaux segments:", voyageSegments.length);
            console.log("🗑️ Segments activés restants:", Array.from(activatedSegments));
        }

        function updateVoyageSegmentsDisplay() {
            // Cette fonction est maintenant simplifiée car on utilise updateCurrentSegmentDisplay
            if (isVoyageActive) {
                updateCurrentSegmentDisplay();
            } else {
                // Cacher tous les éléments du voyage
                document.getElementById('current-segment-display').classList.add('hidden');
                document.getElementById('voyage-progress-bar').classList.add('hidden');
                document.getElementById('voyage-end-message').classList.add('hidden');
                document.getElementById('no-voyage-message').classList.remove('hidden');
            }
        }

        function getTotalJourneyDays() {
            // Utiliser la distance totale du tracé actuel ou sauvegardé
            let distanceToUse = totalPathPixels;
            if (currentVoyage && currentVoyage.totalDistance) {
                distanceToUse = currentVoyage.totalDistance;
            }

            if (distanceToUse === 0) {
                return 0;
            }

            const totalMiles = pixelsToMiles(distanceToUse);
            return milesToDays(totalMiles);
        }



        function getRemainingJourneyDays() {
            const totalJourneyDays = getTotalJourneyDays();
            const segmentDays = voyageSegments.reduce((total, segment) => total + segment.duration, 0);
            return Math.max(0, totalJourneyDays - segmentDays);
        }

        function checkIfMoreSegmentsNeeded() {
            const totalJourneyDays = getTotalJourneyDays();
            const currentSegmentDays = voyageSegments.reduce((total, segment) => total + segment.duration, 0);

            // Il faut plus de segments si on n'a pas encore couvert toute la durée du voyage
            return currentSegmentDays < totalJourneyDays;
        }

        function createNextSegment() {
            if (!currentVoyage || !journeyDiscoveries) return;

            const nextSegmentIndex = voyageSegments.length;

            // Calculer les jours déjà couverts
            const coveredDays = voyageSegments.reduce((total, segment) => total + segment.duration, 0);
            const totalJourneyDays = getTotalJourneyDays();

            // Calculer la position dans le voyage pour ce nouveau segment
            const segmentStartRatio = coveredDays / totalJourneyDays;
            const segmentStartPathIndex = Math.floor(segmentStartRatio * (journeyPath.length - 1));

            // Trouver la prochaine découverte significative après le point actuel
            const remainingDiscoveries = journeyDiscoveries.filter(discovery =>
                discovery.discoveryIndex > segmentStartPathIndex
            ).sort((a, b) => a.discoveryIndex - b.discoveryIndex);

            let startLocation, endLocation;

            // Déterminer le point de départ (fin du segment précédent)
            if (voyageSegments.length > 0) {
                const prevSegment = voyageSegments[voyageSegments.length - 1];
                startLocation = prevSegment.endLocation;
            } else {
                startLocation = 'Point de départ';
            }

            // Déterminer le point d'arrivée du nouveau segment
            if (remainingDiscoveries.length > 0) {
                // Utiliser la prochaine découverte comme destination
                const nextDiscovery = remainingDiscoveries[0];
                endLocation = nextDiscovery.name;
            } else {
                // Pas de découverte restante, utiliser la fin du voyage
                endLocation = findEndLocation();
            }

            // Créer le nouveau segment
            const newSegment = {
                id: nextSegmentIndex + 1,
                duration: 1, // Par défaut 1 jour
                startLocation: startLocation,
                endLocation: endLocation,
                status: 'active',
                createdAt: new Date().toISOString()
            };

            voyageSegments.push(newSegment);
            console.log("🆕 Nouveau segment créé:", newSegment);
        }

        // Navigation globale pour les segments
        window.navigateToSegment = navigateToSegment;

        function processActivityForHighlight(activity) {
            // Nettoyer d'abord le texte de tout HTML résiduel
            const cleanActivity = activity.replace(/<[^>]*>/g, '');
            let processedActivity = cleanActivity;

            // Chercher les noms de lieux (en évitant les doublons)
            locationsData.locations.forEach(location => {
                const locationName = location.name;
                // Échapper les caractères spéciaux pour la regex
                const escapedName = locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');

                // Vérifier si le nom n'est pas déjà dans un span
                if (!processedActivity.includes(`data-discovery-name="${locationName}"`)) {
                    processedActivity = processedActivity.replace(regex, (match) => {
                        return `<span class="segment-discovery-item" data-discovery-name="${escapeHtml(locationName)}" data-discovery-type="location">${escapeHtml(match)}</span>`;
                    });
                }
            });

            // Chercher les noms de régions (en évitant les doublons)
            regionsData.regions.forEach(region => {
                const regionName = region.name;
                // Échapper les caractères spéciaux pour la regex
                const escapedName = regionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');

                // Vérifier si le nom n'est pas déjà dans un span
                if (!processedActivity.includes(`data-discovery-name="${regionName}"`)) {
                    processedActivity = processedActivity.replace(regex, (match) => {
                        return `<span class="segment-discovery-item" data-discovery-name="${escapeHtml(regionName)}" data-discovery-type="region">${escapeHtml(match)}</span>`;
                    });
                }
            });

            return processedActivity;
        }

        function setupSegmentDiscoveryHighlight() {
            // Remove existing tooltips
            const existingTooltips = document.querySelectorAll('.discovery-tooltip');
            existingTooltips.forEach(tooltip => tooltip.remove());

            const discoveryItems = document.querySelectorAll('.segment-discovery-item');

            discoveryItems.forEach(item => {
                const discoveryName = item.dataset.discoveryName;
                const discoveryType = item.dataset.discoveryType;

                item.addEventListener('mouseenter', () => {
                    highlightDiscoveryOnMap(discoveryName, discoveryType, true);
                });

                item.addEventListener('mouseleave', () => {
                    highlightDiscoveryOnMap(discoveryName, discoveryType, false);
                });

                // Add click event listener to open modal
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (discoveryType === 'location') {
                        const location = locationsData.locations.find(loc => loc.name === discoveryName);
                        if (location) {
                            const fakeEvent = {
                                currentTarget: { dataset: { id: location.id.toString() } },
                                stopPropagation: () => {},
                                preventDefault: () => {}
                            };
                            showInfoBox(fakeEvent);
                            if (!infoBox.classList.contains('expanded')) {
                                toggleInfoBoxExpand();
                            }
                        }
                    } else if (discoveryType === 'region') {
                        const region = regionsData.regions.find(reg => reg.name === discoveryName);
                        if (region) {
                            const fakeEvent = {
                                stopPropagation: () => {},
                                preventDefault: () => {}
                            };
                            showRegionInfo(fakeEvent, region);
                            if (!infoBox.classList.contains('expanded')) {
                                toggleInfoBoxExpand();
                            }
                        }
                    }
                });
            });
        }

        // --- Event listeners pour les segments de voyage ---
        // Les event listeners pour les segments de voyage sont maintenant gérés par VoyageManager

        // --- Settings Modal Functions ---
        function openSettingsOnSeasonTab() {
            console.log("📅 Ouverture des paramètres sur l'onglet saison");
            try {
                loadSettings('season');
                // Ensure CalendarManager listeners are properly set up
                if (typeof calendarManager !== 'undefined' && calendarManager.reinitializeListeners) {
                    setTimeout(() => {
                        calendarManager.reinitializeListeners();
                    }, 100); // Small delay to ensure DOM is ready
                }
            } catch (error) {
                console.error("Erreur lors de l'ouverture des paramètres:", error);
            }
        }

        function switchSettingsTab(tabName = 'maps') {
            const tabButtons = document.querySelectorAll('.settings-tab-button');
            const tabContents = document.querySelectorAll('.settings-tab-content');

            tabButtons.forEach(button => {
                if (button.dataset.tab === tabName) {
                    button.classList.add('active', 'border-blue-500', 'text-white');
                    button.classList.remove('border-transparent', 'text-gray-400');
                } else {
                    button.classList.add('border-transparent', 'text-gray-400');
                    button.classList.remove('active', 'border-blue-500', 'text-white');
                }
            });

            tabContents.forEach(content => {
                if (content.id === `${tabName}-tab`) {
                    content.classList.add('active');
                    content.classList.remove('hidden');
                } else {
                    content.classList.remove('active');
                    content.classList.add('hidden');
                }
            });
        }

        function loadSettings(activeTab = 'maps') {
            console.log("🔧 Chargement des paramètres, onglet actif:", activeTab);

            // Load data
            loadMapsData();
            renderMapsGrid();

            // Setup season listeners via CalendarManager if available
            if (typeof calendarManager !== 'undefined' && calendarManager.reinitializeListeners) {
                calendarManager.reinitializeListeners();
            }

            // Show modal and activate correct tab
            settingsModal.classList.remove('hidden');
            switchSettingsTab(activeTab);

            // Load and display content
            loadAdventurersGroup();
            loadAdventurersQuest();
        }

        function loadAdventurersGroup() {
            const saved = localStorage.getItem('adventurersGroup');
            const textarea = document.getElementById('adventurers-group');
            if (textarea) {
                textarea.value = saved || '';
            }
            updateMarkdownContent('adventurers-content', saved);
        }

        function loadAdventurersQuest() {
            const saved = localStorage.getItem('adventurersQuest');
            const textarea = document.getElementById('adventurers-quest');
            if (textarea) {
                textarea.value = saved || '';
            }
            updateMarkdownContent('quest-content', saved);
        }

        function setupSettingsTabSwitching() {
            // Attendre que le DOM soit complètement chargé
            setTimeout(() => {
                const tabButtons = document.querySelectorAll('.settings-tab-button');
                const tabContents = document.querySelectorAll('.settings-tab-content');

                console.log('🔧 Setup tabs:', tabButtons.length, 'buttons,', tabContents.length, 'contents');

                tabButtons.forEach((button, index) => {
                    // Supprimer les anciens event listeners en clonant
                    const newButton = button.cloneNode(true);
                    button.parentNode.replaceChild(newButton, button);

                    // Ajouter le nouvel event listener
                    newButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        const targetTab = newButton.dataset.tab;
                        console.log('🔧 Tab clicked:', targetTab);

                        // Mettre à jour les références après le clonage
                        const currentTabButtons = document.querySelectorAll('.settings-tab-button');
                        const currentTabContents = document.querySelectorAll('.settings-tab-content');

                        // Update active tab button
                        currentTabButtons.forEach(btn => {
                            btn.classList.remove('active', 'border-blue-500', 'text-white');
                            btn.classList.add('border-transparent', 'text-gray-400');
                        });
                        newButton.classList.add('active', 'border-blue-500', 'text-white');
                        newButton.classList.remove('border-transparent', 'text-gray-400');

                        // Update active tab content
                        currentTabContents.forEach(content => {
                            content.classList.remove('active');
                            content.classList.add('hidden');
                        });

                        const targetContent = document.getElementById(`${targetTab}-tab`);
                        console.log('🔧 Target content:', targetContent);
                        if (targetContent) {
                            targetContent.classList.add('active');
                            targetContent.classList.remove('hidden');
                        }
                    });
                });

                // Setup edit mode listeners
                setupEditModeListeners();
            }, 100);
        }

        function setupEditModeListeners() {
            // Adventurers edit listeners
            const editAdventurersBtn = document.getElementById('edit-adventurers-btn');
            const cancelAdventurersEdit = document.getElementById('cancel-adventurers-edit');
            const saveAdventurersEdit = document.getElementById('save-adventurers-edit');
            const adventurersReadMode = document.getElementById('adventurers-read-mode');
            const adventurersEditMode = document.getElementById('adventurers-edit-mode');
            const adventurersTextarea = document.getElementById('adventurers-group');

            if (editAdventurersBtn) {
                editAdventurersBtn.addEventListener('click', () => {
                    adventurersReadMode.classList.add('hidden');
                    adventurersEditMode.classList.remove('hidden');
                });
            }

            if (cancelAdventurersEdit) {
                cancelAdventurersEdit.addEventListener('click', () => {
                    adventurersEditMode.classList.add('hidden');
                    adventurersReadMode.classList.remove('hidden');
                    // Reload original content
                    const saved = localStorage.getItem('adventurersGroup');
                    if (adventurersTextarea) {
                        adventurersTextarea.value = saved || '';
                    }
                });
            }

            if (saveAdventurersEdit) {
                saveAdventurersEdit.addEventListener('click', () => {
                    const content = adventurersTextarea.value;
                    localStorage.setItem('adventurersGroup', content);
                    updateMarkdownContent('adventurers-content', content);
                    adventurersEditMode.classList.add('hidden');
                    adventurersReadMode.classList.remove('hidden');
                    scheduleAutoSync();
                });
            }

            // Quest edit listeners
            const editQuestBtn = document.getElementById('edit-quest-btn');
            const cancelQuestEdit = document.getElementById('cancel-quest-edit');
            const saveQuestEdit = document.getElementById('save-quest-edit');
            const questReadMode = document.getElementById('quest-read-mode');
            const questEditMode = document.getElementById('quest-edit-mode');
            const questTextarea = document.getElementById('adventurers-quest');

            if (editQuestBtn) {
                editQuestBtn.addEventListener('click', () => {
                    questReadMode.classList.add('hidden');
                    questEditMode.classList.remove('hidden');
                });
            }

            if (cancelQuestEdit) {
                cancelQuestEdit.addEventListener('click', () => {
                    questEditMode.classList.add('hidden');
                    questReadMode.classList.remove('hidden');
                    // Reload original content
                    const saved = localStorage.getItem('adventurersQuest');
                    if (questTextarea) {
                        questTextarea.value = saved || '';
                    }
                });
            }

            if (saveQuestEdit) {
                saveQuestEdit.addEventListener('click', () => {
                    const content = questTextarea.value;
                    localStorage.setItem('adventurersQuest', content);
                    updateMarkdownContent('quest-content', content);
                    questEditMode.classList.add('hidden');
                    questReadMode.classList.remove('hidden');
                    scheduleAutoSync();
                });
            }
        }

        // === FONCTIONS POUR LE STYLE DE NARRATION ===

        function setupNarrationStyleListeners() {
            console.log('📖 Configuration des listeners de narration...');

            // Utiliser waitForElement pour s'assurer que les éléments existent
            waitForElement('input[name="narration-style"]', () => {
                const narrationRadios = document.querySelectorAll('input[name="narration-style"]');
                console.log('📖 Radio buttons de narration trouvés:', narrationRadios.length);

                narrationRadios.forEach(radio => {
                    radio.addEventListener('change', () => {
                        if (radio.checked) {
                            console.log('📖 Style de narration changé:', radio.value);
                            localStorage.setItem('narrationStyle', radio.value);
                            updateJourneyButtonTitle();
                        }
                    });
                });
            });
        }

        function updateJourneyButtonTitle() {
            const narrationStyle = localStorage.getItem('narrationStyle') || 'brief';
            const journeyButton = document.getElementById('generate-journey-log');
            const styleLabel = document.getElementById('journey-style-label');

            console.log('📖 Mise à jour du titre du bouton:', narrationStyle, journeyButton ? 'Bouton trouvé' : 'Bouton non trouvé');

            if (!journeyButton) return;

            let styleText = '';
            let shortStyleText = '';
            switch (narrationStyle) {
                case 'detailed':
                    styleText = '(Narration détaillée)';
                    shortStyleText = 'Voyage – Détaillée';
                    break;
                case 'brief':
                    styleText = '(Narration brève)';
                    shortStyleText = 'Voyage – Brève';
                    break;
                case 'keywords':
                    styleText = '(Points clés seulement)';
                    shortStyleText = 'Voyage – Points clés';
                    break;
                default:
                    styleText = '(Narration brève)';
                    shortStyleText = 'Voyage – Brève';
            }

            // Mettre à jour l'infobulle (title) et aria-label
            journeyButton.title = `Générer une chronique de voyage ${styleText}`;
            journeyButton.setAttribute('aria-label', `Générer une chronique de voyage ${styleText}`);

            // Mettre à jour le texte visible du bouton
            if (styleLabel) {
                styleLabel.textContent = shortStyleText;
            }

            console.log('📖 Nouveau titre du bouton:', journeyButton.title);
            console.log('📖 Nouveau texte du bouton:', shortStyleText);
        }

        async function handleGenerateAdventurers(event) {
            const button = event.currentTarget;

            const prompt = `Crée un groupe d'aventuriers pour les Terres du Milieu dans l'Eriador de la fin du Troisième Âge.

Voici la procédure à suivre :

a- Choisis aléatoirement un nombre d'aventurier entre 2 et 5
b- Pour chaque individu du nombre d'aventurier fais les choses suivantes dans l'ordre :
- Choisis un peuple aléatoirement (parmi : "Hobbits de la Comté", "Hommes de Bree", "Rôdeur du Nord", "Elfes du Lindon", "Nains des Montagnes Bleues"). Il faut que cette sélection soit réellement aléatoire.
- Choisis un Nom (dans le style des noms utilisés parmi les races de Tolkien, mais sans utiliser de noms trop connus comme Aragorn, Legolas, Frodo, etc)
- Choisis Occupation/rôle (garde-forestier, marchand, érudit, guerrier, etc.)
- Choisis un lien cohérent (famille, ami, collègue, redevable, etc) entre les aventuriers, en faisant en sorte que les aventuriers de races différentes ne soient pas de la même famille.

Puis décris leur quête ou objectif commun qui les unit dans cette aventure, sans préciser ce qu'ils devront faire pour l'atteindre. Explique pourquoi ce sont eux et pas d'autres aventuriers qui poursuivent cette quête.

Format de réponse en Markdown:
## Groupe d'aventuriers
[Description de chaque membre avec nom (en gras), peuple (en italique), occupation, lien avec les autres aventuriers]

## Quête
[Description de leur mission commune]

Reste fidèle à l'univers de Tolkien, à la géographie et l'histoire de l'Eriador.`;

            // Appeler Gemini pour générer le contenu
            const result = await callGemini(prompt, button);

            // Analyser le résultat pour séparer groupe et quête
            const parts = result.split('## Quête');
            if (parts.length === 2) {
                const groupPart = parts[0].replace('## Groupe d\'aventuriers', '').trim();
                const questPart = parts[1].trim();

                // Update textareas
                const groupTextarea = document.getElementById('adventurers-group');
                const questTextarea = document.getElementById('adventurers-quest');

                if (groupTextarea) groupTextarea.value = groupPart;
                if (questTextarea) questTextarea.value = questPart;

                // Update displays
                updateMarkdownContent('adventurers-content', groupPart);
                updateMarkdownContent('quest-content', questPart);

                // Sauvegarder
                localStorage.setItem('adventurersGroup', groupPart);
                localStorage.setItem('adventurersQuest', questPart);
                scheduleAutoSync();
            } else {
                // Si le format n'est pas comme attendu, mettre tout dans le groupe
                const groupTextarea = document.getElementById('adventurers-group');
                if (groupTextarea) groupTextarea.value = result;
                updateMarkdownContent('adventurers-content', result);
                localStorage.setItem('adventurersGroup', result);
                scheduleAutoSync();
            }
        }

        // --- Sync Status Display Function ---
        function updateSyncStatus(message) {
            console.log(`🔄 Sync Status: ${message}`);
            // You can also display this message in the UI if there's a status element
            const statusElement = document.getElementById('sync-status');
            if (statusElement) {
                statusElement.textContent = message;
                statusElement.style.opacity = '1';
                setTimeout(() => {
                    statusElement.style.opacity = '0';
                }, 3000); // Hide after 3 seconds
            }
        }

        // Démarrer l'application quand le DOM est prêt
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp();
        }