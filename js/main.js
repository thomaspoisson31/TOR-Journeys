// Version de débogage simplifiée - chargement progressif des fonctionnalités

// --- Import des constantes ---
import {
    colorMap,
    regionColorMap,
    getDefaultLocations,
    getDefaultRegions,
    MAP_DISTANCE_MILES,
    LOCATIONS_URL,
    PROXIMITY_DISTANCE,
    SYNC_DELAY,
    seasonSymbols,
    seasonNames
} from './utils/constants.js';

// --- Import des managers ---
import DataManager from './managers/data-manager.js';
import FilterManager from './managers/filter-manager.js';
import VoyageManager from './managers/voyage-manager.js';
import PathManager from './managers/path-manager.js';
import SettingsManager from './managers/settings-manager.js';
import AuthManager from './managers/auth-manager.js';
import InfoBoxManager from './managers/infobox-manager.js';
import ImportExportManager from './managers/import-export-manager.js';
import ZoomManager from './managers/zoom-manager.js';
import PositionManager from './managers/position-manager.js';
import JournalManager from './managers/journal-manager.js';
import AdventureManager from './managers/adventure-manager.js';
import LibraryManager from './managers/library-manager.js';
import CharactersManager from './managers/characters-manager.js'; // Import du CharactersManager
import './managers/calendar-manager.js'; // Import du CalendarManager global

console.log("✅ Constants loaded successfully");

// Support pour Marked.js (optionnel, pour le rendu Markdown)
window.marked = window.marked || null;

// --- Variables globales essentielles ---
let locationsData;
let regionsData = getDefaultRegions();
let MAP_WIDTH = 0, MAP_HEIGHT = 0;
let scale = 1, panX = 0, panY = 0;

// Exposer scale globalement pour le ZoomManager
window.scale = scale;

// --- Managers ---
let dataManager;
let filterManager;
let voyageManager;
let pathManager;
let calendarManager;
let settingsManager;
let authManager;
let infoBoxManager;
let importExportManager;
let zoomManager;
let positionManager;
let journalManager;
let adventureManager;
let charactersManager; // Déclaration du CharactersManager

console.log("✅ Global variables initialized");

// --- DOM Elements essentiels ---
const viewport = document.getElementById('viewport');
const mapContainer = document.getElementById('map-container');
const mapImage = document.getElementById('map-image');
const loaderOverlay = document.getElementById('loader-overlay');

console.log("✅ Essential DOM elements:", {
    viewport: !!viewport,
    mapContainer: !!mapContainer,
    mapImage: !!mapImage,
    loaderOverlay: !!loaderOverlay
});

// --- Fonction d'initialisation simplifiée ---
async function initializeApp() {
    console.log('🚀 Starting simplified application...');

    try {
        // Initialiser les managers
        dataManager = new DataManager();
        console.log("✅ DataManager initialized");
        filterManager = new FilterManager(); // DOM elements are implicitly accessed
        console.log("✅ FilterManager initialized");
        voyageManager = new VoyageManager({
            getElementById: (id) => document.getElementById(id),
            showModal: (modal) => modal.classList.remove('hidden'),
            hideModal: (modal) => modal.classList.add('hidden'),
            voyageSegmentsModal: document.getElementById('voyage-segments-modal')
        }, {
            MAP_DISTANCE_MILES: MAP_DISTANCE_MILES,
            MAP_WIDTH: MAP_WIDTH
        });
        console.log("✅ VoyageManager initialized");
        pathManager = new PathManager({
            getElementById: (id) => document.getElementById(id)
        }, dataManager, {
            MAP_DISTANCE_MILES,
            MAP_WIDTH: MAP_WIDTH || 5103 // Utiliser la valeur globale ou fallback
        });
        console.log("✅ PathManager initialized");

        // Initialiser CalendarManager
        calendarManager = new window.CalendarManager();
        calendarManager.init();
        window.calendarManager = calendarManager; // Exposer globalement pour AuthManager
        console.log("✅ CalendarManager initialized");

        // Initialiser SettingsManager
        settingsManager = new SettingsManager();
        settingsManager.init();
        window.settingsManager = settingsManager; // Exposer globalement pour les onclick
        console.log("✅ SettingsManager initialized");

        // Initialiser AuthManager
        authManager = new AuthManager();
        authManager.init();
        window.authManager = authManager; // Exposer globalement pour les onclick

        // Ajouter cette ligne après l'initialisation de l'AuthManager (vers la ligne 150)
        // Exposer la fonction markAsUnsaved pour que les autres managers puissent signaler des modifications
        window.markAsUnsaved = () => {
            if (window.authManager && window.authManager.isAuthenticated) {
                window.authManager.markAsUnsaved();
            }
        };

        // Exposer scheduleAutoSync globalement pour les autres managers
        window.scheduleAutoSync = () => {
            if (authManager && authManager.isAuthenticated) {
                authManager.scheduleAutoSync();
            }
        };

        console.log("✅ AuthManager initialized");

        // Initialiser InfoBoxManager
        infoBoxManager = new InfoBoxManager(
            { getElementById: (id) => document.getElementById(id) },
            dataManager,
            window.geminiManager
        );
        window.infoBoxManager = infoBoxManager; // Exposer globalement pour les onclick
        console.log("✅ InfoBoxManager initialized");

        // Initialiser ImportExportManager
        importExportManager = new ImportExportManager(
            dataManager,
            window.scheduleAutoSync // Callback pour la synchronisation automatique
        );
        importExportManager.init();
        window.importExportManager = importExportManager; // Exposer globalement pour les onclick
        console.log("✅ ImportExportManager initialized");

        // Initialiser les structures vides (seront remplies par AuthManager)
        console.log("📍 Initializing data structures...");
        await dataManager.loadInitialLocations();
        locationsData = dataManager.locationsData;
        window.locationsData = locationsData;

        dataManager.loadRegionsFromLocal();
        regionsData = dataManager.regionsData;
        window.regionsData = regionsData;
        console.log("✅ Data structures initialized (will be populated from cloud)");

        // Attendre que SettingsManager charge la carte active
        if (mapImage) {
            // La carte sera chargée par SettingsManager.loadSettings() appelé par AuthManager
            mapImage.onload = () => {
                console.log("🗺️ Map image loaded successfully");
                initializeMap();
                console.log("⏳ Waiting for cloud data before rendering...");
            };
            mapImage.onerror = () => {
                console.error("❌ Map image failed to load");
                if (loaderOverlay) {
                    loaderOverlay.innerHTML = `
                        <div class="text-2xl text-red-500 text-center p-4">
                            <i class="fas fa-exclamation-triangle mb-4 text-4xl"></i><br>
                            Erreur de chargement de la carte<br>
                            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
                                Recharger
                            </button>
                        </div>
                    `;
                }
            };
            console.log("⏳ Waiting for SettingsManager to load active map...");
        }

    } catch (error) {
        console.error("❌ Error during simplified initialization:", error);
        if (loaderOverlay) {
            loaderOverlay.innerHTML = `
                <div class="text-2xl text-red-500 text-center p-4">
                    <i class="fas fa-exclamation-triangle mb-4 text-4xl"></i><br>
                    Erreur de démarrage: ${error.message}<br>
                    <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
                        Recharger
                    </button>
                </div>
            `;
        }
    }
}

// --- Fonction d'affichage des lieux ---
function renderLocations() {
    // console.log("🎯 Rendering locations...");

    // IMPORTANT: Synchroniser avec window.locationsData si elle existe
    if (window.locationsData && (!locationsData || locationsData.locations?.length === 0)) {
        locationsData = window.locationsData;
        // console.log("🔄 Synchronisation avec window.locationsData");
    }

    // console.log("📊 locationsData:", locationsData);
    // console.log("📊 locationsData.locations:", locationsData?.locations);

    const locationsLayer = document.getElementById('locations-layer');
    if (!locationsLayer) {
        console.error("❌ Locations layer not found");
        return;
    }

    // Nettoyer les marqueurs existants
    locationsLayer.innerHTML = '';

    if (!locationsData || !locationsData.locations) {
        console.log("⚠️ No locations data to render");
        return;
    }

    let renderedCount = 0;
    const currentScale = window.scale || 1;
    const showThumbnails = currentScale > 0.5; // Afficher les vignettes si zoom > 50%

    // console.log(`📱 [renderLocations] currentScale=${currentScale.toFixed(3)}, showThumbnails=${showThumbnails}`);

    locationsData.locations.forEach(location => {
        if (!location.coordinates || typeof location.coordinates.x !== 'number' || typeof location.coordinates.y !== 'number') {
            console.warn(`⚠️ Location ${location.name} has invalid coordinates`);
            return;
        }

        // Filtrer les lieux : afficher ceux sans mapId OU ceux correspondant à la carte active
        const activeMapId = window.settingsManager?.activeMapUrl;
        if (location.mapId && activeMapId && location.mapId !== activeMapId) {
            // Ne pas afficher uniquement si un mapId existe ET qu'il ne correspond pas à la carte active
            return;
        }

        // Créer le marqueur
        const marker = document.createElement('div');
        marker.className = 'location-marker';
        marker.dataset.id = location.id;
        marker.title = location.name;

        // Positionner le marqueur
        marker.style.left = `${location.coordinates.x}px`;
        marker.style.top = `${location.coordinates.y}px`;

        // Chercher une image de type vignette
        let thumbnailUrl = null;
        if (showThumbnails && location.images && Array.isArray(location.images)) {
            const thumbnailImg = location.images.find(img => img.type === 'vignette');
            if (thumbnailImg) {
                thumbnailUrl = thumbnailImg.url;
            }
        }

        if (thumbnailUrl) {
            // Afficher la vignette avec effets visuels améliorés
            marker.style.backgroundColor = 'transparent';
            marker.style.border = 'none';
            marker.style.width = '64px';
            marker.style.height = '64px';
            marker.style.backgroundImage = `url('${thumbnailUrl}')`;
            marker.style.backgroundSize = 'cover';
            marker.style.backgroundPosition = 'center';
            marker.style.borderRadius = '50%';
            marker.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.6), 0 3px 8px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.4)';
        } else {
            // Afficher le cercle coloré
            const color = colorMap[location.color] || colorMap.blue;
            marker.style.backgroundColor = color;
            marker.style.backgroundImage = 'none';
            marker.style.width = '64px';
            marker.style.height = '64px';
            marker.style.border = 'none';
            marker.style.borderRadius = '50%';
            marker.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.6), 0 3px 8px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.4)';
        }

        // Ajouter les événements de clic et de glisser-déplacer (souris)
        marker.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Clic gauche seulement
                e.stopPropagation(); // Empêcher la propagation vers le viewport
                handleLocationDragStart(e, marker, location);
            }
        });

        marker.addEventListener('mouseup', (e) => {
            if (e.button === 0 && !hasDraggedLocation) {
                // Seulement si aucun drag n'a lieu
                e.stopPropagation();
                e.preventDefault();
                infoBoxManager.showInfoBox(e, location, 'location');
            }
        });

        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });

        // Événements tactiles pour mobile
        let touchStartTime = 0;
        let touchHasMoved = false;

        marker.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            touchHasMoved = false;
            console.log(`📱 [TOUCH] touchstart on marker ${location.name}:`, {
                timeStamp: e.timeStamp,
                touches: e.touches.length,
                targetClass: e.target.className,
                targetId: e.target.dataset?.id,
                isDrawingMode: window.isDrawingMode,
                isRegionDrawingMode: isRegionDrawingMode,
                isLocationAddingMode: isLocationAddingMode
            });
            e.stopPropagation();
        }, { passive: false });

        marker.addEventListener('touchmove', (e) => {
            if (!touchHasMoved) {
                console.log(`📱 [TOUCH] First touchmove on marker ${location.name}`);
            }
            touchHasMoved = true;
        }, { passive: true });

        marker.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;
            console.log(`📱 [TOUCH] touchend on marker ${location.name}:`, {
                duration: touchDuration,
                hasMoved: touchHasMoved,
                willOpenInfoBox: !touchHasMoved && touchDuration < 500,
                willOpenColorModal: !touchHasMoved && touchDuration >= 500
            });

            e.preventDefault();
            e.stopPropagation();

            if (!touchHasMoved && touchDuration < 500) {
                // Tap simple : ouvrir l'infobox
                console.log(`📱 [TOUCH] Opening infobox for ${location.name}`);
                infoBoxManager.showInfoBox(e, location, 'location');
            } else if (!touchHasMoved && touchDuration >= 500) {
                // Long press : ouvrir le menu de couleur
                console.log(`📱 [TOUCH] Opening color modal for ${location.name}`);
                showColorChangeModal(e, location, 'location');
            }
        }, { passive: false });

        // Ajouter l'événement de clic droit pour changer la couleur (desktop)
        marker.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showColorChangeModal(e, location, 'location');
        });

        // Forcer pointer-events pour s'assurer que les marqueurs sont cliquables
        marker.style.pointerEvents = 'auto';
        marker.style.touchAction = 'none'; // Empêcher le comportement par défaut du navigateur

        // Ajouter à la couche des lieux
        locationsLayer.appendChild(marker);
        renderedCount++;
    });

    console.log(`✅ Rendered ${renderedCount} location markers (thumbnails: ${showThumbnails})`);
}

// --- Fonction d'affichage des régions ---
function renderRegions() {
    // console.log("🌍 Rendering regions...");

    // IMPORTANT: Synchroniser avec window.regionsData si elle existe
    if (window.regionsData && (!regionsData || regionsData.regions?.length === 0)) {
        regionsData = window.regionsData;
        // console.log("🔄 Synchronisation avec window.regionsData");
    }

    // console.log("🌍 RegionsData:", regionsData);

    const regionsLayer = document.getElementById('regions-layer');
    if (!regionsLayer) {
        console.error("❌ Regions layer not found");
        return;
    }

    // Nettoyer les polygones existants (conserver les temporaires)
    const tempPolygon = document.getElementById('temp-region-polygon');
    regionsLayer.innerHTML = '';
    if (tempPolygon) {
        regionsLayer.appendChild(tempPolygon);
    }

    if (!regionsData || !regionsData.regions) {
        console.log("⚠️ No regions data to render");
        return;
    }

    let renderedCount = 0;
    const activeMapId = window.settingsManager?.activeMapUrl;

    regionsData.regions.forEach(region => {
        // console.log('🔍 Processing region:', region.name, region);

        // Filtrer les régions : afficher celles sans mapId OU celles correspondant à la carte active
        if (region.mapId && activeMapId && region.mapId !== activeMapId) {
            // Ne pas afficher uniquement si un mapId existe ET qu'il ne correspond pas à la carte active
            return;
        }

        // Extraire les points depuis différentes structures possibles
        let points = [];
        if (region.points && Array.isArray(region.points)) {
            points = region.points;
        } else if (region.coordinates?.points && Array.isArray(region.coordinates.points)) {
            points = region.coordinates.points;
        } else if (Array.isArray(region.coordinates)) {
            points = region.coordinates;
        }

        // Vérifier que la région a des coordonnées valides
        if (!points || points.length < 3) {
            console.warn(`⚠️ Region ${region.name} has invalid coordinates. Points:`, points, 'Original:', region.coordinates || region.points);
            return;
        }

        // Vérifier que chaque coordonnée a x et y
        const validCoords = points.every(coord =>
            coord && typeof coord.x === 'number' && typeof coord.y === 'number'
        );

        if (!validCoords) {
            console.warn(`⚠️ Region ${region.name} has invalid coordinate format:`, points);
            return;
        }

        // Créer le polygone SVG directement dans la couche SVG
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('data-id', region.id);
        polygon.setAttribute('data-name', region.name);

        // Définir les styles du polygone
        const fillColor = regionColorMap[region.color] || regionColorMap.gray;
        const strokeColor = fillColor.replace(/0\.\d+\)$/, '0.8)'); // Bordure plus opaque
        polygon.setAttribute('fill', fillColor);
        polygon.setAttribute('stroke', strokeColor);
        polygon.setAttribute('fill-opacity', '1');
        polygon.setAttribute('stroke-opacity', '1');
        polygon.setAttribute('stroke-width', '3');

        // Créer les points du polygone
        const pointsStr = points
            .map(pt => `${pt.x},${pt.y}`)
            .join(' ');
        polygon.setAttribute('points', pointsStr);

        // Ajouter le titre pour le hover
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = region.name;
        polygon.appendChild(title);

        // Rendre le polygone cliquable
        polygon.style.pointerEvents = 'auto';
        polygon.style.cursor = 'pointer';

        // Ajouter l'événement de clic pour afficher la modal commune
        polygon.addEventListener('click', (e) => {
            e.stopPropagation();
            infoBoxManager.showInfoBox(e, region, 'region');
        });

        // Événements tactiles pour mobile
        let regionTouchStartTime = 0;
        let regionTouchHasMoved = false;

        polygon.addEventListener('touchstart', (e) => {
            regionTouchStartTime = Date.now();
            regionTouchHasMoved = false;
            e.stopPropagation();
        }, { passive: false });

        polygon.addEventListener('touchmove', (e) => {
            regionTouchHasMoved = true;
        }, { passive: true });

        polygon.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const touchDuration = Date.now() - regionTouchStartTime;

            if (!regionTouchHasMoved && touchDuration < 500) {
                // Tap simple : ouvrir l'infobox
                infoBoxManager.showInfoBox(e, region, 'region');
            } else if (!regionTouchHasMoved && touchDuration >= 500) {
                // Long press : ouvrir le menu de couleur
                showColorChangeModal(e, region, 'region');
            }
        }, { passive: false });

        // Ajouter l'événement de clic droit pour changer la couleur (desktop)
        polygon.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showColorChangeModal(e, region, 'region');
        });

        // Ajouter à la couche des régions
        regionsLayer.appendChild(polygon);
        renderedCount++;

        console.log(`✅ Rendered region: ${region.name} with ${points.length} points`);
    });

    console.log(`✅ Rendered ${renderedCount} region polygons`);
}

// Exposer les fonctions de rendu globalement
window.renderLocations = renderLocations;
window.renderRegions = renderRegions;
window.initializeMap = initializeMap;

// --- Initialisation carte simplifiée ---
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

    // Mettre à jour l'affichage des dimensions
    updateMapDimensionsDisplay();

    // Mettre à jour les constantes du PathManager avec les vraies dimensions
    if (pathManager) {
        pathManager.mapConstants.MAP_WIDTH = MAP_WIDTH;
    }

    // Configuration de la couche SVG des régions
    const regionsLayer = document.getElementById('regions-layer');
    if (regionsLayer) {
        regionsLayer.setAttribute('width', MAP_WIDTH);
        regionsLayer.setAttribute('height', MAP_HEIGHT);
        regionsLayer.setAttribute('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
        regionsLayer.style.position = 'absolute';
        regionsLayer.style.top = '0';
        regionsLayer.style.left = '0';
        regionsLayer.style.width = `${MAP_WIDTH}px`;
        regionsLayer.style.height = `${MAP_HEIGHT}px`;
        regionsLayer.style.pointerEvents = 'auto'; // Permettre les clics sur les régions
        console.log("✅ Regions layer configured");
    }

    // Simple reset view
    const viewportWidth = viewport.clientWidth;
    if (viewportWidth > 0 && MAP_WIDTH > 0) {
        scale = viewportWidth / MAP_WIDTH;
        window.scale = scale; // Synchroniser avec window.scale
        panX = 0;
        panY = 0;
        console.log(`🗺️ [initializeMap] Scale initial: ${scale.toFixed(3)} (viewportWidth=${viewportWidth}, MAP_WIDTH=${MAP_WIDTH})`);
        mapContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

    mapImage.classList.remove('opacity-0');
    if (loaderOverlay) {
        loaderOverlay.style.opacity = '0';
        setTimeout(() => { loaderOverlay.style.display = 'none'; }, 500);
    }

    // Initialiser la navigation après que la carte soit chargée
    setupMapNavigation();
    setupInfoBoxListeners();
    setupRegionDrawing(); // Nouveau : tracé de régions
    setupLocationAdding(); // Nouveau : ajout de lieux

    // Configurer le système de filtres
    if (filterManager) {
        console.log("🔍 Setting up FilterManager...");
        filterManager.setupFilterListeners();
        // N'appliquer les filtres initiaux que si aucun filtre sauvegardé n'existe
        // (les filtres sauvegardés seront restaurés par AuthManager si nécessaire)
        const hasSavedFilters = localStorage.getItem('middleEarthLocations') !== null;
        if (!hasSavedFilters) {
            filterManager.applyFilters();
        }
        console.log("✅ FilterManager setup complete");
    } else {
        console.error("❌ FilterManager not initialized");
    }

    // Initialiser les gestionnaires après chargement de la carte
    if (voyageManager) {
        console.log("🚀 Setting up VoyageManager...");
        voyageManager.init();
        console.log("✅ VoyageManager setup complete");
    } else {
        console.error("❌ VoyageManager not initialized");
    }
    if (pathManager) {
        console.log("🗺️ Setting up PathManager...");
        pathManager.init();
        console.log("✅ PathManager setup complete");
    } else {
        console.error("❌ PathManager not initialized");
    }

    // Initialiser ou réutiliser ZoomManager
    if (window.zoomManager) {
        console.log('🔍 [initializeMap] ZoomManager existe déjà, mise à jour des constantes');
        // Mettre à jour les constantes avec les nouvelles dimensions
        window.zoomManager.mapConstants.MAP_WIDTH = MAP_WIDTH;
        window.zoomManager.mapConstants.MAP_HEIGHT = MAP_HEIGHT;
        window.zoomManager.mapConstants.minScale = minScale;
        window.zoomManager.mapConstants.maxScale = maxScale;

        // Synchroniser l'affichage
        window.zoomManager.updateDisplay();
    } else {
        console.log('🔍 [initializeMap] Création du ZoomManager');
        zoomManager = new ZoomManager(
            { getElementById: (id) => document.getElementById(id) },
            {
                minScale: minScale,
                maxScale: maxScale,
                MAP_WIDTH: MAP_WIDTH,
                MAP_HEIGHT: MAP_HEIGHT
            }
        );
        zoomManager.onZoomChange = (newScale) => {
            // Zoomer en centrant sur le centre du viewport
            const viewportWidth = viewport.clientWidth;
            const viewportHeight = viewport.clientHeight;
            const currentScale = window.scale || scale;
            zoomToPoint(newScale / currentScale, viewportWidth / 2, viewportHeight / 2);

            // Mettre à jour la taille du marqueur de position après un court délai
            setTimeout(() => {
                if (positionManager) {
                    positionManager.updateMarkerSize();
                }
            }, 10);
        };
        zoomManager.init();
        window.zoomManager = zoomManager; // Exposer globalement
    }

    // Initialiser ou réinitialiser PositionManager
    console.log("📍 [main.js] Création du PositionManager avec MAP_WIDTH:", MAP_WIDTH, "MAP_HEIGHT:", MAP_HEIGHT);

    // Log de l'état du localStorage avant init
    const savedPos = localStorage.getItem('adventurers_position');
    const cloudFlag = localStorage.getItem('adventurers_position_from_cloud');
    console.log("📍 [main.js] État localStorage AVANT init PositionManager - position:", savedPos, "flag:", cloudFlag);

    // Détruire l'ancien PositionManager s'il existe
    if (window.positionManager) {
        console.log("📍 [main.js] Destruction de l'ancien PositionManager");
        // Nettoyer les event listeners si nécessaire
        if (window.positionManager.positionMarker) {
            window.positionManager.positionMarker.remove();
        }
    }

    positionManager = new PositionManager(
        { getElementById: (id) => document.getElementById(id) },
        { MAP_WIDTH, MAP_HEIGHT }
    );
    positionManager.init();
    window.positionManager = positionManager; // Exposer globalement
    console.log("✅ PositionManager initialized with position:", positionManager.currentPosition);

    // Nettoyer le flag cloud après l'initialisation si présent
    if (cloudFlag === 'true') {
        console.log("📍 [main.js] Nettoyage du flag cloud après initialisation");
        localStorage.removeItem('adventurers_position_from_cloud');
    }

    // Initialiser JournalManager
    journalManager = new JournalManager();
    journalManager.init();
    window.journalManager = journalManager; // Exposer globalement
    console.log("✅ JournalManager initialized");

    // Initialiser AdventureManager
    adventureManager = new AdventureManager();
    adventureManager.init();
    window.adventureManager = adventureManager; // Exposer globalement
    console.log("✅ AdventureManager initialized");

    // Initialiser CharactersManager
    charactersManager = new CharactersManager();
    charactersManager.init();
    window.charactersManager = charactersManager; // Exposer globalement
    console.log("✅ CharactersManager initialized");

    // LibraryManager supprimé - fonctionnalité intégrée dans les modales

    // Configurer les événements de dessin après que tous les managers soient initialisés
    setupDrawingEvents();

    resetView(); // Vue initiale optimale

    console.log("✅ Map initialized successfully");
}

// --- Variables d'état pour la navigation ---
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;
let minScale = 0.1;
let maxScale = 4.0;

// --- Variables d'état pour le glisser-déplacer des lieux ---
let isDraggingLocation = false;
let draggedLocationMarker = null;
let dragStartX = 0;
let dragStartY = 0;
let hasDraggedLocation = false; // Flag pour détecter si un drag a eu lieu

// --- Variables d'état pour le tracé de régions ---
let isRegionDrawingMode = false;
let regionPoints = [];
let tempRegionPolygon = null;

// --- Variables d'état pour le changement de couleur ---
let isColorChangeModalOpen = false;
let currentColorChangeTarget = null;
let currentColorChangeType = null; // 'location' ou 'region'

// --- Fonctions de navigation de la carte ---
function updateMapTransform() {
    window.scale = scale; // Toujours synchroniser window.scale
    mapContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    updateMapDimensionsDisplay();
}

function updateMapDimensionsDisplay() {
    const widthDisplay = document.getElementById('map-width-display');
    const heightDisplay = document.getElementById('map-height-display');

    if (widthDisplay && heightDisplay && MAP_WIDTH > 0 && MAP_HEIGHT > 0) {
        // Afficher les dimensions réelles de la carte (100%), sans tenir compte du zoom
        widthDisplay.textContent = MAP_WIDTH;
        heightDisplay.textContent = MAP_HEIGHT;
    }
}

function constrainPan() {
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const scaledMapWidth = MAP_WIDTH * scale;
    const scaledMapHeight = MAP_HEIGHT * scale;

    // Si la carte est plus petite que le viewport, centrer
    if (scaledMapWidth <= viewportWidth) {
        panX = (viewportWidth - scaledMapWidth) / 2;
    } else {
        // Contraintes horizontales : la carte peut déborder du viewport
        const maxPanX = 0; // Bord gauche de la carte aligné avec le bord gauche du viewport
        const minPanX = viewportWidth - scaledMapWidth; // Bord droit de la carte aligné avec le bord droit du viewport
        panX = Math.max(minPanX, Math.min(maxPanX, panX));
    }

    // Si la carte est plus petite que le viewport, centrer
    if (scaledMapHeight <= viewportHeight) {
        panY = (viewportHeight - scaledMapHeight) / 2;
    } else {
        // Contraintes verticales : la carte peut déborder du viewport
        const maxPanY = 0; // Bord haut de la carte aligné avec le bord haut du viewport
        const minPanY = viewportHeight - scaledMapHeight; // Bord bas de la carte aligné avec le bord bas du viewport
        panY = Math.max(minPanY, Math.min(maxPanY, panY));
    }
}

function zoomToPoint(zoomFactor, clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    const viewportX = clientX - rect.left;
    const viewportY = clientY - rect.top;

    // Point dans le système de coordonnées de la carte avant zoom
    const mapX = (viewportX - panX) / scale;
    const mapY = (viewportY - panY) / scale;

    // Nouveau scale avec contraintes
    const oldScale = scale;
    const newScale = Math.max(minScale, Math.min(maxScale, scale * zoomFactor));

    console.log(`🔍 [main.js] zoomToPoint: oldScale=${oldScale.toFixed(3)}, zoomFactor=${zoomFactor.toFixed(3)}, newScale=${newScale.toFixed(3)}`);

    if (newScale !== scale) {
        // Ajuster le pan pour garder le point sous le curseur
        panX = viewportX - mapX * newScale;
        panY = viewportY - mapY * newScale;
        scale = newScale;
        window.scale = scale; // Synchroniser avec window.scale

        constrainPan();
        updateMapTransform();

        // Rafraîchir les marqueurs si on passe le seuil de 50%
        const shouldShowThumbnails = newScale > 0.5;
        const wasShowingThumbnails = oldScale > 0.5;
        if (shouldShowThumbnails !== wasShowingThumbnails) {
            renderLocations();
        }

        // Mettre à jour la taille du marqueur de position
        if (positionManager) {
            positionManager.updateMarkerSize();
        }

        // Synchroniser le ZoomManager après le changement de zoom
        if (zoomManager) {
            setTimeout(() => {
                zoomManager.updateDisplay();
            }, 10);
        }
    }
}

function resetView() {
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;

    if (viewportWidth > 0 && viewportHeight > 0 && MAP_WIDTH > 0 && MAP_HEIGHT > 0) {
        const oldScale = scale;

        // Calculer le zoom pour faire rentrer la carte dans le viewport
        const scaleX = viewportWidth / MAP_WIDTH;
        const scaleY = viewportHeight / MAP_HEIGHT;
        const newScale = Math.min(scaleX, scaleY) * 0.9; // 90% pour laisser un peu de marge

        // IMPORTANT: Toujours synchroniser scale ET window.scale
        scale = newScale;
        window.scale = newScale;

        console.log(`🔍 [resetView] Nouveau scale calculé: ${newScale.toFixed(3)} (MAP_WIDTH=${MAP_WIDTH}, MAP_HEIGHT=${MAP_HEIGHT})`);

        // Centrer la carte
        panX = (viewportWidth - MAP_WIDTH * newScale) / 2;
        panY = (viewportHeight - MAP_HEIGHT * newScale) / 2;

        updateMapTransform();

        // Rafraîchir les marqueurs si on passe le seuil de 50%
        const shouldShowThumbnails = newScale > 0.5;
        const wasShowingThumbnails = oldScale > 0.5;
        if (shouldShowThumbnails !== wasShowingThumbnails) {
            renderLocations();
        }

        // Synchroniser le ZoomManager APRÈS avoir mis à jour scale et window.scale
        if (zoomManager) {
            console.log(`🔍 [resetView] Synchronisation ZoomManager avec scale=${window.scale.toFixed(3)}`);
            // Attendre que le DOM soit mis à jour
            requestAnimationFrame(() => {
                zoomManager.updateDisplay();
            });
        }
    }
}

// Exposer resetView globalement pour le ZoomManager
window.resetView = resetView;

function handlePanStart(e) {
    // Vérifier si le clic est sur un marqueur ou une région
    if (e.target.classList.contains('location-marker') || e.target.tagName.toLowerCase() === 'polygon') {
        return; // Laisser l'événement se propager au marqueur/région
    }

    // Ne pas permettre le pan si on est en mode tracé, dessin ou déplacement de lieu
    if (isRegionDrawingMode || window.isDrawingMode || isDraggingLocation) return;

    if (e.button === 0) { // Clic gauche uniquement
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        viewport.style.cursor = 'grabbing';
        e.preventDefault();
    }
}

// --- Event Listeners pour la navigation ---
function setupMapNavigation() {
    console.log("🎮 Setting up map navigation...");

    // Détection tactile sans perturber desktop
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Touch events ADDITIONNELS (ne remplacent pas la souris)
    if (isTouchDevice) {
        let touchStartX = 0, touchStartY = 0;
        let touchDist = 0;

        viewport.addEventListener('touchstart', (e) => {
            console.log(`📱 [VIEWPORT] touchstart:`, {
                touches: e.touches.length,
                target: e.target.tagName,
                targetClass: e.target.className,
                targetId: e.target.id,
                dataset: e.target.dataset,
                isDrawingMode: window.isDrawingMode,
                isRegionDrawingMode: isRegionDrawingMode,
                isLocationAddingMode: isLocationAddingMode,
                path: e.composedPath().map(el => el.tagName || el.nodeName).slice(0, 5)
            });

            if (e.touches.length === 2) {
                // Pan avec deux doigts OU Pinch zoom
                touchStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                touchStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                touchDist = Math.sqrt(dx * dx + dy * dy);
            }
        }, { passive: true });

        viewport.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && !window.isDrawingMode) {
                // Calculer le centre actuel des deux doigts
                const currentCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const currentCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

                // Calculer la nouvelle distance pour le zoom
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const newDist = Math.sqrt(dx * dx + dy * dy);

                // Détecter si c'est un pinch (changement de distance) ou un pan (déplacement du centre)
                const distChange = Math.abs(newDist - touchDist);
                const centerDeltaX = currentCenterX - touchStartX;
                const centerDeltaY = currentCenterY - touchStartY;
                const centerMovement = Math.sqrt(centerDeltaX * centerDeltaX + centerDeltaY * centerDeltaY);

                // Si le mouvement du centre est plus important que le changement de distance, c'est un pan
                if (centerMovement > distChange) {
                    // Pan à deux doigts
                    panX += centerDeltaX;
                    panY += centerDeltaY;
                    constrainPan();
                    updateMapTransform();

                    touchStartX = currentCenterX;
                    touchStartY = currentCenterY;
                } else {
                    // Pinch zoom
                    const oldScale = scale;
                    const zoomFactor = newDist / touchDist;
                    zoomToPoint(zoomFactor, currentCenterX, currentCenterY);
                    touchDist = newDist;

                    touchStartX = currentCenterX;
                    touchStartY = currentCenterY;

                    // Rafraîchir les marqueurs si on passe le seuil de 50%
                    const shouldShowThumbnails = scale > 0.5;
                    const wasShowingThumbnails = oldScale > 0.5;
                    if (shouldShowThumbnails !== wasShowingThumbnails) {
                        console.log(`📱 [MOBILE] Basculement vignettes: ${shouldShowThumbnails ? 'OUI' : 'NON'} (scale=${scale.toFixed(3)})`);
                        renderLocations();
                    }
                }

                // Mettre à jour le ZoomManager
                if (zoomManager) {
                    zoomManager.updateDisplay();
                }
            }
        }, { passive: true });

        viewport.addEventListener('touchend', (e) => {
            console.log(`📱 [VIEWPORT] touchend:`, {
                touches: e.touches.length,
                changedTouches: e.changedTouches.length,
                target: e.target.tagName,
                targetClass: e.target.className
            });
        }, { passive: true });
    }

    // Zoom avec la molette (PRÉSERVÉ pour desktop)
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        console.log(`🔍 [main.js] wheel event: deltaY=${e.deltaY}, zoomFactor=${zoomFactor}`);
        zoomToPoint(zoomFactor, e.clientX, e.clientY);

        // Synchroniser le ZoomManager avec un petit délai pour attendre la fin de l'animation
        if (zoomManager) {
            setTimeout(() => {
                console.log(`🔍 [main.js] Appel updateDisplay du ZoomManager après molette`);
                zoomManager.updateDisplay();
            }, 10);
        }
    });

    // Déplacement par glisser-déposer
    viewport.addEventListener('mousedown', handlePanStart);

    viewport.addEventListener('mousemove', (e) => {
        if (isPanning && !window.isDrawingMode && !isDraggingLocation) {
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;

            panX += deltaX;
            panY += deltaY;

            constrainPan();
            updateMapTransform();

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        } else if (isDraggingLocation && draggedLocationMarker) {
            handleLocationDrag(e);
        }
    });

    viewport.addEventListener('mouseup', (e) => {
        if (e.button === 0 && !window.isDrawingMode) {
            if (isDraggingLocation) {
                handleLocationDragEnd(e);
            } else {
                isPanning = false;
                viewport.style.cursor = 'grab';
            }
        }
    });

    viewport.addEventListener('mouseleave', () => {
        if (!window.isDrawingMode) {
            isPanning = false;
            if (isDraggingLocation && draggedLocationMarker) {
                handleLocationDragEnd();
            }
            viewport.style.cursor = 'grab';
        }
    });

    // Double-clic pour centrer et zoomer
    viewport.addEventListener('dblclick', (e) => {
        e.preventDefault();
        zoomToPoint(1.5, viewport.clientWidth / 2, viewport.clientHeight / 2);
    });

    // Touches clavier pour la navigation
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return; // Ignorer si on tape dans un champ
        }

        const panSpeed = 50;
        let moved = false;

        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                panY += panSpeed;
                moved = true;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                panY -= panSpeed;
                moved = true;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                panX += panSpeed;
                moved = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                panX -= panSpeed;
                moved = true;
                break;
            case '+':
            case '=':
                zoomToPoint(1.2, viewport.clientWidth / 2, viewport.clientHeight / 2);
                moved = true;
                break;
            case '-':
                zoomToPoint(0.8, viewport.clientWidth / 2, viewport.clientHeight / 2);
                moved = true;
                break;
            case '0':
            case 'Home':
                resetView();
                moved = true;
                break;
        }

        if (moved) {
            e.preventDefault();
            constrainPan();
            updateMapTransform();
        }
    });

    // Redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
        constrainPan();
        updateMapTransform();
    });

    // Curseur par défaut
    viewport.style.cursor = 'grab';

    console.log("✅ Map navigation setup complete");
}

// --- Event Listeners simplifiés ---
function setupInfoBoxListeners() {
    console.log("📋 Setting up info-box listeners...");

    // Gestionnaire principal pour les clics dans le viewport
    viewport.addEventListener('click', handleViewportClick);

    // Clic droit pour finir le tracé de région
    viewport.addEventListener('contextmenu', (e) => {
        if (isRegionDrawingMode && regionPoints.length >= 3) {
            e.preventDefault();
            finishRegionDrawing();
        } else if (!isRegionDrawingMode && !isLocationAddingMode) {
            // Fermer la modale de changement de couleur si ouverte
            if (isColorChangeModalOpen) {
                e.preventDefault();
                hideColorChangeModal();
            }
        }
    });

    // Clic sur la date du jour pour ouvrir les paramètres
    const calendarDateIndicator = document.getElementById('calendar-date-indicator');
    const seasonIndicator = document.getElementById('season-indicator');

    if (calendarDateIndicator) {
        calendarDateIndicator.addEventListener('click', () => {
            if (settingsManager) {
                settingsManager.openSettings();
                settingsManager.switchTab('season');
            }
        });
    }

    if (seasonIndicator) {
        seasonIndicator.addEventListener('click', () => {
            if (settingsManager) {
                settingsManager.openSettings();
                settingsManager.switchTab('season');
            }
        });
    }

    console.log("✅ Info-box listeners setup complete");
}

// --- Fonctions de tracé de régions ---
function setupRegionDrawing() {
    console.log("🎨 Setting up region drawing...");

    const addRegionBtn = document.getElementById('add-region-mode');
    const addRegionModal = document.getElementById('add-region-modal');
    const cancelBtn = document.getElementById('cancel-add-region');
    const confirmBtn = document.getElementById('confirm-add-region');

    if (addRegionBtn) {
        addRegionBtn.addEventListener('click', toggleRegionDrawingMode);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelRegionCreation);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmRegionCreation);
    }

    // Setup des sélecteurs de couleur pour les régions
    setupRegionColorPicker();

    console.log("✅ Region drawing setup complete");
}

function toggleRegionDrawingMode() {
    isRegionDrawingMode = !isRegionDrawingMode;
    const addRegionBtn = document.getElementById('add-region-mode');

    if (isRegionDrawingMode) {
        console.log("🎨 Entering region drawing mode");
        regionPoints = [];
        clearTempRegionPolygon();

        // Changer l'apparence du bouton
        if (addRegionBtn) {
            addRegionBtn.classList.add('btn-active');
            addRegionBtn.title = "Arrêter le tracé de région";
        }

        // Changer le curseur
        viewport.style.cursor = 'crosshair';
        viewport.classList.add('adding-region');

        // Désactiver le pan temporairement
        viewport.removeEventListener('mousedown', handlePanStart);
    } else {
        console.log("🎨 Exiting region drawing mode");
        exitRegionDrawingMode();
    }
}

function exitRegionDrawingMode() {
    isRegionDrawingMode = false;
    regionPoints = [];
    clearTempRegionPolygon();

    const addRegionBtn = document.getElementById('add-region-mode');
    if (addRegionBtn) {
        addRegionBtn.classList.remove('btn-active');
        addRegionBtn.title = "Créer une région";
    }

    // Restaurer le curseur normal
    viewport.style.cursor = 'grab';
    viewport.classList.remove('adding-region');

    // Réactiver le pan
    setupMapNavigation();
}

function handleRegionClick(event) {
    if (!isRegionDrawingMode) return;

    // Empêcher le pan et autres interactions
    event.stopPropagation();
    event.preventDefault();

    const rect = viewport.getBoundingClientRect();
    const viewportX = event.clientX - rect.left;
    const viewportY = event.clientY - rect.top;

    // Convertir les coordonnées du viewport vers les coordonnées de la carte
    const mapX = (viewportX - panX) / scale;
    const mapY = (viewportY - panY) / scale;

    // Ajouter le point
    regionPoints.push({ x: Math.round(mapX), y: Math.round(mapY) });

    console.log(`🎯 Added region point: (${Math.round(mapX)}, ${Math.round(mapY)})`);

    // Mettre à jour l'affichage temporaire
    updateTempRegionDisplay();

    // Si on a au moins 3 points, on peut fermer la région
    if (regionPoints.length >= 3) {
        // Double-clic ou clic droit pour fermer
        if (event.detail === 2 || event.button === 2) {
            finishRegionDrawing();
        }
    }
}

function updateTempRegionDisplay() {
    clearTempRegionPolygon();

    if (regionPoints.length < 2) return;

    const regionsLayer = document.getElementById('regions-layer');
    if (!regionsLayer) return;

    // Créer un polygone temporaire
    const tempGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    tempGroup.id = 'temp-region-polygon';

    // Ligne temporaire pour montrer la forme en cours
    if (regionPoints.length >= 2) {
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const points = regionPoints.map(p => `${p.x},${p.y}`).join(' ');

        polygon.setAttribute('points', points);
        polygon.setAttribute('fill', 'rgba(34, 197, 94, 0.2)');
        polygon.setAttribute('stroke', 'rgba(34, 197, 94, 0.8)');
        polygon.setAttribute('stroke-width', '2');
        polygon.setAttribute('stroke-dasharray', '5,5');

        tempGroup.appendChild(polygon);
    }

    // Points de contrôle
    regionPoints.forEach((point, index) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', '6');
        circle.setAttribute('fill', 'rgba(34, 197, 94, 0.8)');
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '2');

        tempGroup.appendChild(circle);
    });

    regionsLayer.appendChild(tempGroup);
    tempRegionPolygon = tempGroup;
}

function clearTempRegionPolygon() {
    const tempPolygon = document.getElementById('temp-region-polygon');
    if (tempPolygon) {
        tempPolygon.remove();
    }
    tempRegionPolygon = null;
}

function finishRegionDrawing() {
    if (regionPoints.length < 3) {
        alert("Une région doit avoir au moins 3 points.");
        return;
    }

    console.log(`🎨 Finishing region with ${regionPoints.length} points`);

    // Afficher la modal de création de région
    showRegionCreationModal();
}

function showRegionCreationModal() {
    const modal = document.getElementById('add-region-modal');
    const nameInput = document.getElementById('region-name-input');
    const descInput = document.getElementById('region-desc-input');

    if (modal) {
        // Réinitialiser les champs
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';

        // Sélectionner la première couleur par défaut
        const firstColorSwatch = document.querySelector('#region-color-picker .color-swatch');
        if (firstColorSwatch) {
            document.querySelectorAll('#region-color-picker .color-swatch').forEach(swatch => {
                swatch.classList.remove('selected');
            });
            firstColorSwatch.classList.add('selected');
        }

        modal.classList.remove('hidden');
        if (nameInput) nameInput.focus();
    }
}

function cancelRegionCreation() {
    const modal = document.getElementById('add-region-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    // Sortir du mode tracé
    exitRegionDrawingMode();
}

function confirmRegionCreation() {
    const nameInput = document.getElementById('region-name-input');
    const descInput = document.getElementById('region-desc-input');
    const selectedColorSwatch = document.querySelector('#region-color-picker .color-swatch.selected');

    if (!nameInput || !nameInput.value.trim()) {
        alert("Veuillez entrer un nom pour la région.");
        return;
    }

    const regionName = nameInput.value.trim();
    const regionDescription = descInput ? descInput.value.trim() : '';
    const selectedRegionColor = selectedColorSwatch ? selectedColorSwatch.dataset.color : 'gray';

    // Ajout du mapId
    const activeMapId = window.settingsManager?.activeMapUrl || 'fr_tor_2nd_eriadors_map_page-0001.webp';

    const newRegion = {
        id: `region_${Date.now()}`,
        name: regionName,
        description: regionDescription,
        color: selectedRegionColor,
        mapId: activeMapId,
        coordinates: regionPoints.map(point => ({
            x: point.x,
            y: point.y
        })),
        known: true,
        visited: false
    };

    console.log("💾 Creating new region:", newRegion);
    console.log("💾 Region points:", regionPoints);

    // Ajouter à la liste des régions
    if (!regionsData.regions) {
        regionsData.regions = [];
    }
    regionsData.regions.push(newRegion);

    // Mettre à jour les données globales
    regionsData = { ...regionsData };
    dataManager.regionsData = regionsData;

    // Sauvegarder via DataManager
    if (dataManager) {
        dataManager.saveRegionsToLocal();
        console.log("💾 Region saved to localStorage");
    }

    // Marquer comme non sauvegardé pour afficher l'icône cloud
    if (typeof window.markAsUnsaved === 'function') {
        window.markAsUnsaved();
    }

    // Re-render les régions
    console.log("🌍 Re-rendering regions after creation...");
    renderRegions();

    // Fermer la modal
    const modal = document.getElementById('add-region-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    // Sortir du mode tracé
    exitRegionDrawingMode();

    console.log("✅ Region created successfully:", regionName);
}

// --- Fonctions de création de lieux ---
let isLocationAddingMode = false;

function setupLocationAdding() {
    console.log("📍 Setting up location adding...");

    const addLocationBtn = document.getElementById('add-location-mode');
    const addLocationModal = document.getElementById('add-location-modal');
    const cancelBtn = document.getElementById('cancel-add-location');
    const confirmBtn = document.getElementById('confirm-add-location');
    const generateDescBtn = document.getElementById('generate-add-desc');
    const generateEditDescBtn = document.getElementById('generate-edit-desc'); // Bouton pour la modale d'édition

    if (addLocationBtn) {
        addLocationBtn.addEventListener('click', toggleLocationAddingMode);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelLocationCreation);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmLocationCreation);
    }

    if (generateDescBtn) {
        generateDescBtn.addEventListener('click', handleGenerateLocationDescription);
        console.log("✅ Generate description button configured");
    }

    // Ajout de l'écouteur pour le bouton de génération de description dans la modale d'édition
    if (generateEditDescBtn) {
        generateEditDescBtn.addEventListener('click', handleGenerateLocationDescription); // Utilise la même fonction
        console.log("✅ Generate edit description button configured");
    }

    // Setup du bouton de bibliothèque
    const chooseFromLibraryBtn = document.getElementById('choose-from-library-btn');
    if (chooseFromLibraryBtn) {
        chooseFromLibraryBtn.addEventListener('click', openLibrarySelection);
    }

    // Setup de la modale de sélection de bibliothèque
    setupLibrarySelectionModal();

    // Setup des sélecteurs de couleur pour les lieux
    setupLocationColorPicker();

    // Setup de la modale de changement de couleur
    setupColorChangeModal();

    console.log("✅ Location adding setup complete");
}

function toggleLocationAddingMode() {
    isLocationAddingMode = !isLocationAddingMode;
    const addLocationBtn = document.getElementById('add-location-mode');

    if (isLocationAddingMode) {
        console.log("📍 Entering location adding mode");

        // Sortir du mode région si actif
        if (isRegionDrawingMode) {
            exitRegionDrawingMode();
        }

        // Changer l'apparence du bouton
        if (addLocationBtn) {
            addLocationBtn.classList.add('btn-active');
            addLocationBtn.title = "Arrêter l'ajout de lieu";
        }

        // Changer le curseur
        viewport.style.cursor = 'crosshair';
        viewport.classList.add('adding-location');
    } else {
        console.log("📍 Exiting location adding mode");
        exitLocationAddingMode();
    }
}

function exitLocationAddingMode() {
    isLocationAddingMode = false;

    const addLocationBtn = document.getElementById('add-location-mode');
    if (addLocationBtn) {
        addLocationBtn.classList.remove('btn-active');
        addLocationBtn.title = "Ajouter un lieu";
    }

    // Restaurer le curseur normal
    viewport.style.cursor = 'grab';
    viewport.classList.remove('adding-location');
}

function handleLocationClick(event) {
    if (!isLocationAddingMode) return;

    // Empêcher le pan et autres interactions
    event.stopPropagation();
    event.preventDefault();

    const rect = viewport.getBoundingClientRect();
    const viewportX = event.clientX - rect.left;
    const viewportY = event.clientY - rect.top;

    // Convertir les coordonnées du viewport vers les coordonnées de la carte
    const mapX = (viewportX - panX) / scale;
    const mapY = (viewportY - panY) / scale;

    // Sauvegarder les coordonnées pour la création
    window.pendingLocationCoordinates = { x: Math.round(mapX), y: Math.round(mapY) };

    console.log(`📍 Selected location coordinates: (${Math.round(mapX)}, ${Math.round(mapY)})`);

    // Afficher la modal de création de lieu
    showLocationCreationModal();
}

function showLocationCreationModal() {
    const modal = document.getElementById('add-location-modal');
    const nameInput = document.getElementById('location-name-input');
    const descInput = document.getElementById('location-desc-input');
    const imageInput = document.getElementById('location-image-input');
    const knownInput = document.getElementById('location-known-input');
    const visitedInput = document.getElementById('location-visited-input');

    if (modal) {
        // Réinitialiser les champs
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
        if (imageInput) imageInput.value = '';
        if (knownInput) knownInput.checked = true;
        if (visitedInput) visitedInput.checked = false;

        // Sélectionner la première couleur par défaut
        const firstColorSwatch = document.querySelector('#add-color-picker .color-swatch');
        if (firstColorSwatch) {
            document.querySelectorAll('#add-color-picker .color-swatch').forEach(swatch => {
                swatch.classList.remove('selected');
            });
            firstColorSwatch.classList.add('selected');
        }

        modal.classList.remove('hidden');
        if (nameInput) nameInput.focus();
    }
}

function cancelLocationCreation() {
    const modal = document.getElementById('add-location-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    // Sortir du mode ajout
    exitLocationAddingMode();
    window.pendingLocationCoordinates = null;
    window.pendingLocationImages = null; // Nettoyer les images temporaires
    selectedLibraryImages = [];

    // Cacher le conteneur d'images sélectionnées
    const container = document.getElementById('selected-library-images');
    if (container) {
        container.classList.add('hidden');
    }
}

function confirmLocationCreation() {
    const nameInput = document.getElementById('location-name-input');
    const descInput = document.getElementById('location-desc-input');
    const imageInput = document.getElementById('location-image-input');
    const knownInput = document.getElementById('location-known-input');
    const visitedInput = document.getElementById('location-visited-input');
    const selectedColorSwatch = document.querySelector('#add-color-picker .color-swatch.selected');

    if (!nameInput || !nameInput.value.trim()) {
        alert("Veuillez entrer un nom pour le lieu.");
        return;
    }

    if (!window.pendingLocationCoordinates) {
        alert("Erreur : aucune coordonnée sélectionnée.");
        return;
    }

    const locationName = nameInput.value.trim();
    const locationDesc = descInput ? descInput.value.trim() : '';
    const locationKnown = knownInput ? knownInput.checked : true;
    const locationVisited = visitedInput ? visitedInput.checked : false;
    const selectedColor = selectedColorSwatch ? selectedColorSwatch.dataset.color : 'blue';

    // Récupérer les données d'images potentiellement sélectionnées dans la bibliothèque
    const imageData = window.pendingLocationImages || [];

    // Ajout du mapId
    const activeMapId = window.settingsManager?.activeMapUrl || 'fr_tor_2nd_eriadors_map_page-0001.webp';

    const newLocation = {
        id: `location_${Date.now()}`,
        name: locationName,
        coordinates: { x: window.pendingLocationCoordinates.x, y: window.pendingLocationCoordinates.y },
        description: locationDesc,
        color: selectedColor,
        known: locationKnown,
        visited: locationVisited,
        type: 'custom',
        images: imageData,
        mapId: activeMapId
    };

    console.log("💾 Creating new location:", newLocation);

    // Ajouter à la liste des lieux
    if (!locationsData.locations) {
        locationsData.locations = [];
    }
    locationsData.locations.push(newLocation);

    // Mettre à jour les données globales
    locationsData = { ...locationsData };
    dataManager.locationsData = locationsData;

    // Sauvegarder via DataManager
    if (dataManager) {
        dataManager.saveLocationsToLocal();
    }

    // Marquer comme non sauvegardé pour afficher l'icône cloud
    if (typeof window.markAsUnsaved === 'function') {
        window.markAsUnsaved();
    }

    // Re-render les lieux
    renderLocations();

    // Fermer la modal
    const modal = document.getElementById('add-location-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    // Sortir du mode ajout
    exitLocationAddingMode();
    window.pendingLocationCoordinates = null;
    window.pendingLocationImages = null; // Nettoyer les images temporaires
    selectedLibraryImages = [];

    // Cacher le conteneur d'images sélectionnées
    const container = document.getElementById('selected-library-images');
    if (container) {
        container.classList.add('hidden');
    }

    console.log("✅ Location created successfully:", locationName);
}

// --- Fonctions de génération de description Gemini ---

// Fonction générique pour générer du texte via Gemini
async function callGemini(prompt, type = 'description') {
    console.log(`🤖 Calling Gemini API for type: ${type} with prompt:`, prompt);
    try {
        const response = await fetch('/api/gemini/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, type })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.content) {
            console.log("✅ Gemini API call successful");
            return data.content;
        } else {
            throw new Error(data.error || 'Réponse invalide de l\'API Gemini');
        }
    } catch (error) {
        console.error(`❌ Error calling Gemini API (${type}):`, error);
        throw error; // Propager l'erreur pour la gestion par l'appelant
    }
}

// Fonction pour gérer la génération de description dans la modale d'ajout de lieu
async function handleGenerateLocationDescription(event) {
    console.log("🤖 Generating location description...");

    const button = event.currentTarget;
    const nameInput = document.getElementById('location-name-input');
    const descTextarea = document.getElementById('location-desc-input');

    // Vérifier si l'appel vient de la modale d'édition
    const isEditing = button.id === 'generate-edit-desc';
    const editDescTextarea = isEditing ? document.getElementById('edit-location-desc-input') : null;

    if (!nameInput || !nameInput.value.trim()) {
        alert("Veuillez d'abord entrer un nom pour le lieu.");
        return;
    }

    const locationName = nameInput.value.trim();

    // Changer l'état du bouton
    const originalContent = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const prompt = `Rédige une courte description évocatrice pour un lieu de la Terre du Milieu nommé '${locationName}'. Décris son apparence, son ambiance et son histoire possible, dans le style de J.R.R. Tolkien. Sois concis et évocateur (2-3 phrases maximum).`;
        const generatedDescription = await callGemini(prompt, 'location_description');

        if (isEditing && editDescTextarea) {
            editDescTextarea.value = generatedDescription;
        } else if (descTextarea) {
            descTextarea.value = generatedDescription;
        }
        console.log("✅ Description generated successfully");

    } catch (error) {
        console.error("❌ Error generating description:", error);
        alert(`Erreur lors de la génération : ${error.message}`);
    } finally {
        // Restaurer l'état du bouton
        button.disabled = false;
        button.innerHTML = originalContent;
    }
}

// Fonction pour générer la description d'un voyage dans le VoyageManager
// Cette fonction sera appelée depuis VoyageManager.js
async function generateTravelDescription(voyageData) {
    console.log("🤖 Generating travel description...");

    const { origin, destination, mode, distance, duration, details } = voyageData;

    // Construire un prompt basé sur les données du voyage
    let prompt = `Décris un voyage dans la Terre du Milieu :`;
    if (origin) prompt += `\n- Point de départ : ${origin.name}`;
    if (destination) prompt += `\n- Destination : ${destination.name}`;
    if (mode) prompt += `\n- Mode de transport : ${mode}`;
    if (distance) prompt += `\n- Distance : ${distance.toFixed(1)} km`;
    if (duration) prompt += `\n- Durée estimée : ${duration}`;
    if (details) prompt += `\n- Détails notables : ${details}`;

    prompt += `\n\nSois descriptif, évocateur et dans le style de Tolkien. Raconte une courte anecdote ou une observation pertinente pour ce voyage. (environ 3-4 phrases)`;

    try {
        return await callGemini(prompt, 'travel_description');
    } catch (error) {
        console.error("❌ Error generating travel description:", error);
        throw error;
    }
}

// --- Fonctions de gestion des événements de viewport ---
function handleViewportClick(event) {
    // Ne pas intercepter les clics sur les marqueurs ou régions
    if (event.target.classList.contains('location-marker') || event.target.tagName.toLowerCase() === 'polygon') {
        return;
    }

    // Gérer les différents modes de clic
    if (isRegionDrawingMode) {
        handleRegionClick(event);
    } else if (isLocationAddingMode) {
        handleLocationClick(event);
    }
    // Autres modes peuvent être ajoutés ici
}

// --- Fonctions d'aide pour les sélecteurs de couleur ---
function setupRegionColorPicker() {
    const colorPicker = document.getElementById('region-color-picker');
    if (!colorPicker) return;

    colorPicker.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-swatch')) {
            // Désélectionner tous les échantillons
            colorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
                swatch.classList.remove('selected');
            });
            // Sélectionner l'échantillon cliqué
            e.target.classList.add('selected');
        }
    });
}

function setupLocationColorPicker() {
    const colorPicker = document.getElementById('add-color-picker');
    if (!colorPicker) return;

    colorPicker.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-swatch')) {
            // Désélectionner tous les échantillons
            colorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
                swatch.classList.remove('selected');
            });
            // Sélectionner l'échantillon cliqué
            e.target.classList.add('selected');
        }
    });
}

// --- Fonctions de gestion de la bibliothèque d'images ---
let selectedLibraryImages = [];

function setupLibrarySelectionModal() {
    const modal = document.getElementById('library-selection-modal');
    const closeBtn = document.getElementById('close-library-selection-btn');
    const cancelBtn = document.getElementById('cancel-library-selection-btn');
    const confirmBtn = document.getElementById('confirm-library-selection-btn');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeLibrarySelection);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeLibrarySelection);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmLibrarySelection);
    }

    // Fermer en cliquant à l'extérieur
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeLibrarySelection();
            }
        });
    }
}

let currentLibraryFolder = null;
let libraryFolders = {};

async function loadLibraryForSelection() {
    const modal = document.getElementById('library-selection-modal');
    const content = document.getElementById('library-selection-content');
    const empty = document.getElementById('library-selection-empty');
    const loading = document.getElementById('library-selection-loading');
    const authRequired = document.getElementById('library-selection-auth-required');
    const pathInfo = document.getElementById('library-path-info');
    const pathDisplay = document.getElementById('library-path-display');

    if (!modal) return;

    // Réinitialiser la sélection
    selectedLibraryImages = [];
    currentLibraryFolder = null;
    libraryFolders = {};

    // Vérifier l'authentification
    if (!authManager || !authManager.isAuthenticated) {
        content.classList.add('hidden');
        empty.classList.add('hidden');
        loading.classList.add('hidden');
        authRequired.classList.remove('hidden');
        if (pathInfo) pathInfo.classList.add('hidden');
        modal.classList.remove('hidden');
        return;
    }

    // Afficher le chemin de stockage
    if (pathInfo && pathDisplay && authManager.currentUser) {
        const googleId = authManager.currentUser.google_id;
        pathDisplay.textContent = `uploads/${googleId}/`;
        pathInfo.classList.remove('hidden');
    }

    // Afficher le loading
    content.classList.add('hidden');
    empty.classList.add('hidden');
    authRequired.classList.add('hidden');
    loading.classList.remove('hidden');
    modal.classList.remove('hidden');

    try {
        const response = await fetch('/api/images/library', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();

        loading.classList.add('hidden');

        if (data.success && data.folders && Object.keys(data.folders).length > 0) {
            libraryFolders = data.folders;
            renderLibraryFolders();
            content.classList.remove('hidden');
        } else {
            empty.classList.remove('hidden');
        }

    } catch (error) {
        console.error("❌ Erreur lors du chargement de la bibliothèque:", error);
        loading.classList.add('hidden');
        empty.classList.add('hidden');
        const errorElement = document.getElementById('library-selection-error');
        if (errorElement) {
            errorElement.textContent = `Impossible de charger la bibliothèque : ${error.message}`;
            errorElement.classList.remove('hidden');
        }
    }
}

function renderLibraryFolders() {
    const content = document.getElementById('library-selection-content');
    if (!content) return;

    const folderNames = Object.keys(libraryFolders);

    content.innerHTML = '';
    
    // Ajouter le titre
    const titleDiv = document.createElement('div');
    titleDiv.className = 'col-span-full mb-4';
    titleDiv.innerHTML = '<h3 class="text-lg font-semibold text-white mb-2">Sélectionner un dossier :</h3>';
    content.appendChild(titleDiv);

    // Ajouter chaque dossier
    folderNames.forEach(folder => {
        const folderCard = document.createElement('div');
        folderCard.className = 'relative cursor-pointer rounded-lg overflow-hidden bg-gray-700 hover:ring-2 hover:ring-blue-500 transition-all p-6 flex flex-col items-center justify-center';
        folderCard.innerHTML = `
            <i class="fas fa-folder text-blue-400 text-4xl mb-2"></i>
            <div class="text-white font-medium">${folder}</div>
            <div class="text-gray-400 text-sm">${libraryFolders[folder].length} image(s)</div>
        `;
        folderCard.addEventListener('click', () => selectLibraryFolder(folder));
        content.appendChild(folderCard);
    });
}

// Exposer globalement pour renderLibraryImagesWithBackButton
window.renderLibraryFolders = renderLibraryFolders;

function selectLibraryFolder(folderName) {
    currentLibraryFolder = folderName;
    const images = libraryFolders[folderName] || [];
    renderLibraryImagesWithBackButton(images);
}

// Exposer globalement pour les onclick
window.selectLibraryFolder = selectLibraryFolder;

function renderLibraryImages(images) {
    const content = document.getElementById('library-selection-content');
    if (!content) return;

    content.innerHTML = '';

    images.forEach(image => {
        const imageCard = document.createElement('div');
        imageCard.className = 'relative cursor-pointer rounded-lg overflow-hidden bg-gray-700 hover:ring-2 hover:ring-blue-500 transition-all library-image-card';
        imageCard.dataset.url = image.url;
        imageCard.dataset.filename = image.filename;

        imageCard.innerHTML = `
            <img src="${image.url}" alt="${image.filename}" class="w-full h-32 object-cover">
            <div class="absolute top-2 right-2 hidden selected-indicator">
                <div class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                    <i class="fas fa-check text-xs"></i>
                </div>
            </div>
            <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                <div class="opacity-0 hover:opacity-100 transition-opacity text-white text-center p-2">
                    <p class="text-xs truncate">${image.filename}</p>
                </div>
            </div>
        `;

        imageCard.addEventListener('click', () => toggleImageSelection(imageCard));
        content.appendChild(imageCard);
    });
}

function renderLibraryImagesWithBackButton(images) {
    const content = document.getElementById('library-selection-content');
    if (!content) return;

    content.innerHTML = '';
    
    // Ajouter le header avec bouton retour
    const headerDiv = document.createElement('div');
    headerDiv.className = 'col-span-full mb-4 flex items-center';
    
    const backButton = document.createElement('button');
    backButton.className = 'flex items-center text-blue-400 hover:text-blue-300';
    backButton.innerHTML = '<i class="fas fa-arrow-left mr-2"></i>Retour aux dossiers';
    backButton.addEventListener('click', renderLibraryFolders);
    
    const titleH3 = document.createElement('h3');
    titleH3.className = 'text-lg font-semibold text-white ml-4';
    titleH3.textContent = currentLibraryFolder || 'Images';
    
    headerDiv.appendChild(backButton);
    headerDiv.appendChild(titleH3);
    content.appendChild(headerDiv);

    // Ajouter les images
    images.forEach(image => {
        const imageCard = document.createElement('div');
        imageCard.className = 'relative cursor-pointer rounded-lg overflow-hidden bg-gray-700 hover:ring-2 hover:ring-blue-500 transition-all library-image-card';
        imageCard.dataset.url = image.url;
        imageCard.dataset.filename = image.filename;

        imageCard.innerHTML = `
            <img src="${image.url}" alt="${image.filename}" class="w-full h-32 object-cover">
            <div class="absolute top-2 right-2 hidden selected-indicator">
                <div class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                    <i class="fas fa-check text-xs"></i>
                </div>
            </div>
            <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                <div class="opacity-0 hover:opacity-100 transition-opacity text-white text-center p-2">
                    <p class="text-xs truncate">${image.filename}</p>
                </div>
            </div>
        `;

        imageCard.addEventListener('click', () => toggleImageSelection(imageCard));
        content.appendChild(imageCard);
    });
}

function toggleImageSelection(card) {
    const url = card.dataset.url;
    const filename = card.dataset.filename;
    const indicator = card.querySelector('.selected-indicator');

    const index = selectedLibraryImages.findIndex(img => img.url === url);

    if (index > -1) {
        // Désélectionner
        selectedLibraryImages.splice(index, 1);
        indicator.classList.add('hidden');
        card.classList.remove('ring-2', 'ring-blue-500');
    } else {
        // Sélectionner
        selectedLibraryImages.push({ url, filename });
        indicator.classList.remove('hidden');
        card.classList.add('ring-2', 'ring-blue-500');
    }
}

function confirmLibrarySelection() {
    if (selectedLibraryImages.length === 0) {
        alert("Veuillez sélectionner au moins une image");
        return;
    }

    // Ajouter les images sélectionnées au lieu
    const selectedImagesContainer = document.getElementById('selected-library-images');
    const selectedImagesList = document.getElementById('selected-images-list');

    if (selectedImagesContainer && selectedImagesList) {
        selectedImagesList.innerHTML = '';
        selectedLibraryImages.forEach((image, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'flex items-center space-x-2 bg-gray-700 p-2 rounded';
            imageItem.innerHTML = `
                <img src="${image.url}" class="w-12 h-12 object-cover rounded">
                <span class="text-sm text-gray-300 flex-grow truncate">${image.filename}</span>
                <button type="button" class="text-red-400 hover:text-red-300" onclick="removeSelectedLibraryImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            selectedImagesList.appendChild(imageItem);
        });
        selectedImagesContainer.classList.remove('hidden');
    }

    // Stocker temporairement pour la création du lieu
    window.pendingLocationImages = selectedLibraryImages.map(img => ({
        url: img.url,
        isDefault: false
    }));

    closeLibrarySelection();
}

function removeSelectedLibraryImage(index) {
    const selectedImagesList = document.getElementById('selected-images-list');
    if (selectedLibraryImages[index]) {
        selectedLibraryImages.splice(index, 1);
        window.pendingLocationImages.splice(index, 1);

        // Re-render la liste
        if (selectedImagesList) {
            const items = selectedImagesList.children;
            if (items[index]) {
                items[index].remove();
            }
        }

        // Cacher le conteneur si vide
        if (selectedLibraryImages.length === 0) {
            const container = document.getElementById('selected-library-images');
            if (container) {
                container.classList.add('hidden');
            }
        }
    }
}

function closeLibrarySelection() {
    const modal = document.getElementById('library-selection-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Exposer globalement
window.removeSelectedLibraryImage = removeSelectedLibraryImage;

// --- Fonctions de la modale de changement de couleur ---
function setupColorChangeModal() {
    console.log("🎨 Setting up color change modal...");

    const cancelBtn = document.getElementById('cancel-color-change');
    const confirmBtn = document.getElementById('confirm-color-change');
    const deleteBtn = document.getElementById('delete-color-change');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideColorChangeModal);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmColorChange);
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteFromColorChangeModal);
    }

    // Créer les couleurs disponibles
    setupColorChangeColorPicker();

    // Fermer la modale en cliquant ailleurs
    document.addEventListener('click', (e) => {
        if (isColorChangeModalOpen && !document.getElementById('color-change-modal').contains(e.target)) {
            hideColorChangeModal();
        }
    });

    console.log("✅ Color change modal setup complete");
}

function setupColorChangeColorPicker() {
    const colorPicker = document.getElementById('color-change-picker');
    if (!colorPicker) return;

    // Couleurs communes pour lieux et régions
    const colors = ['blue', 'red', 'green', 'violet', 'orange', 'black'];

    colorPicker.innerHTML = '';

    colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.dataset.color = color;
        swatch.style.backgroundColor = getLocationColorForSwatch(color);

        swatch.addEventListener('click', () => {
            // Désélectionner tous les échantillons
            colorPicker.querySelectorAll('.color-swatch').forEach(s => {
                s.classList.remove('selected');
            });
            // Sélectionner l'échantillon cliqué
            swatch.classList.add('selected');
        });

        colorPicker.appendChild(swatch);
    });
}

function getLocationColorForSwatch(color) {
    const colorMap = {
        blue: '#3B82F6',
        red: '#EF4444',
        green: '#10B981',
        violet: '#8B5CF6',
        orange: '#F97316',
        black: '#1F2937'
    };
    return colorMap[color] || colorMap.blue;
}

function showColorChangeModal(event, target, type) {
    console.log(`🎨 Showing color change modal for ${type}:`, target.name);

    const modal = document.getElementById('color-change-modal');
    const title = document.getElementById('color-change-title');
    const colorPicker = document.getElementById('color-change-picker');
    const visitedCheckbox = document.getElementById('color-change-visited');
    const knownCheckbox = document.getElementById('color-change-known');
    const coordinatesDiv = document.getElementById('color-change-coordinates');
    const coordXDisplay = document.getElementById('coord-x-display');
    const coordYDisplay = document.getElementById('coord-y-display');

    if (!modal || !title || !colorPicker) return;

    // Stocker les informations de l'élément cible
    currentColorChangeTarget = target;
    currentColorChangeType = type;

    // Mettre à jour le titre
    title.textContent = `Modifier "${target.name}"`;

    // Afficher les coordonnées réelles pour les lieux (position absolue sur la carte originale)
    if (coordinatesDiv && coordXDisplay && coordYDisplay) {
        if (type === 'location' && target.coordinates) {
            coordinatesDiv.classList.remove('hidden');
            // Coordonnées réelles (100%), non affectées par le zoom
            coordXDisplay.textContent = Math.round(target.coordinates.x);
            coordYDisplay.textContent = Math.round(target.coordinates.y);
        } else {
            coordinatesDiv.classList.add('hidden');
        }
    }

    // Sélectionner la couleur actuelle
    colorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.remove('selected');
        if (swatch.dataset.color === target.color) {
            swatch.classList.add('selected');
        }
    });

    // Mettre à jour les cases à cocher avec les valeurs actuelles
    if (visitedCheckbox) {
        visitedCheckbox.checked = target.visited || false;
    }
    if (knownCheckbox) {
        knownCheckbox.checked = target.known !== undefined ? target.known : true;
    }

    // Positionner la modale à droite du clic
    const rect = viewport.getBoundingClientRect();
    const modalWidth = 280; // largeur approximative de la modale
    const modalHeight = 220; // hauteur approximative de la modale (augmentée pour les cases à cocher)

    let left = event.clientX + 10; // 10px à droite du curseur
    let top = event.clientY - modalHeight / 2; // centré verticalement sur le curseur

    // Vérifier les limites de l'écran
    if (left + modalWidth > window.innerWidth) {
        left = event.clientX - modalWidth - 10; // à gauche si pas assez de place à droite
    }
    if (top < 0) {
        top = 10;
    }
    if (top + modalHeight > window.innerHeight) {
        top = window.innerHeight - modalHeight - 10;
    }

    modal.style.left = `${left}px`;
    modal.style.top = `${top}px`;
    modal.classList.remove('hidden');

    isColorChangeModalOpen = true;
}

function hideColorChangeModal() {
    console.log("🎨 Hiding color change modal");

    const modal = document.getElementById('color-change-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    // Nettoyer les variables temporaires AVANT de fermer la modale
    const targetName = currentColorChangeTarget ? currentColorChangeTarget.name : 'inconnu';
    currentColorChangeTarget = null;
    currentColorChangeType = null;

    // Fermer la modale
    modal.classList.add('hidden');

    console.log(`✅ Modification de couleur terminée pour: ${targetName}`);
}

function deleteFromColorChangeModal() {
    if (!currentColorChangeTarget || !currentColorChangeType) {
        console.warn("⚠️ No target to delete");
        return;
    }

    const targetName = currentColorChangeTarget.name;
    console.log(`🗑️ Deleting ${currentColorChangeType}: ${targetName}`);

    if (currentColorChangeType === 'location') {
        // Supprimer le lieu
        const locationIndex = locationsData.locations.findIndex(loc => 
            String(loc.id) === String(currentColorChangeTarget.id)
        );

        if (locationIndex !== -1) {
            locationsData.locations.splice(locationIndex, 1);
            console.log(`✅ Lieu supprimé de locationsData à l'index ${locationIndex}`);

            // Synchroniser avec window.locationsData ET dataManager
            window.locationsData = locationsData;
            dataManager.locationsData = locationsData;

            // Sauvegarder localement
            dataManager.saveLocationsToLocal();

            // Re-render
            renderLocations();
        } else {
            console.error(`❌ Lieu non trouvé: ${currentColorChangeTarget.id}`);
        }
    } else if (currentColorChangeType === 'region') {
        // Supprimer la région
        const regionIndex = regionsData.regions.findIndex(reg => 
            String(reg.id) === String(currentColorChangeTarget.id)
        );

        if (regionIndex !== -1) {
            regionsData.regions.splice(regionIndex, 1);
            console.log(`✅ Région supprimée de regionsData à l'index ${regionIndex}`);

            // Synchroniser avec window.regionsData ET dataManager
            window.regionsData = regionsData;
            dataManager.regionsData = regionsData;

            // Sauvegarder localement
            dataManager.saveRegionsToLocal();

            // Re-render
            renderRegions();
        } else {
            console.error(`❌ Région non trouvée: ${currentColorChangeTarget.id}`);
        }
    }

    // Marquer comme non sauvegardé et synchroniser avec le cloud
    if (window.authManager && window.authManager.isAuthenticated) {
        window.authManager.markAsUnsaved();
        window.authManager.scheduleAutoSync();
    }

    // Fermer la modale
    hideColorChangeModal();

    // Afficher un message de confirmation temporaire
    showTemporaryMessage(`"${targetName}" supprimé${currentColorChangeType === 'location' ? '' : 'e'}`, 'error');

    console.log(`✅ ${currentColorChangeType} deleted successfully: ${targetName}`);
}

function showTemporaryMessage(message, type = 'success') {
    // Créer un élément de notification temporaire
    const notification = document.createElement('div');
    notification.className = `fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-xl text-white font-medium transition-all duration-300 ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`;
    notification.textContent = message;
    notification.style.opacity = '0';

    document.body.appendChild(notification);

    // Animation d'apparition
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);

    // Disparition après 3 secondes
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function confirmColorChange() {
    const selectedSwatch = document.querySelector('#color-change-picker .color-swatch.selected');
    const visitedCheckbox = document.getElementById('color-change-visited');
    const knownCheckbox = document.getElementById('color-change-known');

    if (!selectedSwatch || !currentColorChangeTarget || !currentColorChangeType) {
        console.warn("⚠️ No color selected or no target");
        return;
    }

    const newColor = selectedSwatch.dataset.color;
    const newVisited = visitedCheckbox ? visitedCheckbox.checked : currentColorChangeTarget.visited;
    const newKnown = knownCheckbox ? knownCheckbox.checked : currentColorChangeTarget.known;

    const originalColor = currentColorChangeTarget.color;
    const originalVisited = currentColorChangeTarget.visited;
    const originalKnown = currentColorChangeTarget.known;

    // Vérifier s'il y a des changements
    const hasChanges = newColor !== originalColor || newVisited !== originalVisited || newKnown !== originalKnown;

    if (!hasChanges) {
        console.log("🎨 No changes needed");
        hideColorChangeModal();
        return;
    }

    // Appliquer les changements
    currentColorChangeTarget.color = newColor;
    currentColorChangeTarget.visited = newVisited;
    currentColorChangeTarget.known = newKnown;

    console.log(`🎨 Updating ${currentColorChangeType}: ${currentColorChangeTarget.name}`, {
        color: `${originalColor} → ${newColor}`,
        visited: `${originalVisited} → ${newVisited}`,
        known: `${originalKnown} → ${newKnown}`
    });

    if (currentColorChangeType === 'location') {
        // IMPORTANT: Mettre à jour l'objet dans locationsData.locations
        const locationIndex = locationsData.locations.findIndex(loc => 
            String(loc.id) === String(currentColorChangeTarget.id)
        );

        if (locationIndex !== -1) {
            locationsData.locations[locationIndex] = currentColorChangeTarget;
            console.log(`✅ Lieu mis à jour dans locationsData à l'index ${locationIndex}`);
        } else {
            console.error(`❌ Lieu non trouvé dans locationsData: ${currentColorChangeTarget.id}`);
        }

        // Synchroniser avec window.locationsData ET dataManager
        window.locationsData = locationsData;
        dataManager.locationsData = locationsData;

        // Mettre à jour les données
        dataManager.saveLocationsToLocal();
        // Marquer comme non sauvegardé
        if (typeof scheduleAutoSync === 'function') {
            scheduleAutoSync();
        }
        // Re-render
        renderLocations();
    } else if (currentColorChangeType === 'region') {
        // IMPORTANT: Mettre à jour l'objet dans regionsData.regions
        const regionIndex = regionsData.regions.findIndex(reg => 
            String(reg.id) === String(currentColorChangeTarget.id)
        );

        if (regionIndex !== -1) {
            regionsData.regions[regionIndex] = currentColorChangeTarget;
            console.log(`✅ Région mise à jour dans regionsData à l'index ${regionIndex}`);
        } else {
            console.error(`❌ Région non trouvée dans regionsData: ${currentColorChangeTarget.id}`);
        }

        // Synchroniser avec window.regionsData ET dataManager
        window.regionsData = regionsData;
        dataManager.regionsData = regionsData;

        // Mettre à jour les données
        dataManager.saveRegionsToLocal();
        // Marquer comme non sauvegardé
        if (typeof scheduleAutoSync === 'function') {
            scheduleAutoSync();
        }
        // Re-render
        renderRegions();
    }

    // Fermer la modale
    hideColorChangeModal();

    console.log(`✅ Changes applied successfully for ${currentColorChangeTarget.name}`);
}

// --- Configuration des événements de dessin ---
function setupDrawingEvents() {
    console.log("🖌️ Setting up drawing events...");

    // Configuration du VoyageManager pour le dessin
    if (voyageManager) {
        console.log("👂 Adding VoyageManager drawing listeners...");
        voyageManager.setupDrawingListeners();
        console.log("✅ VoyageManager drawing listeners added");
    }

    console.log("✅ Drawing events setup complete");
}

// --- Fonctions de glisser-déplacer pour les lieux ---
function handleLocationDragStart(e, marker, location) {
    // Ne pas permettre le drag si on est en mode tracé ou dessin
    if (isRegionDrawingMode || window.isDrawingMode || isLocationAddingMode) return;

    e.stopPropagation();
    e.preventDefault();

    // Initialiser les flags de drag selon la méthode du document
    isDraggingLocation = true;
    hasDraggedLocation = false; // Reset du flag drag au mousedown
    draggedLocationMarker = marker;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    // Changer le curseur
    viewport.style.cursor = 'move';
    marker.style.cursor = 'move';

    console.log(`🎯 Starting potential drag for location: ${location.name}`);
}

function handleLocationDrag(e) {
    if (!isDraggingLocation || !draggedLocationMarker) return;

    e.preventDefault();

    // Marquer qu'un drag a eu lieu (selon la méthode du document)
    hasDraggedLocation = true;

    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    // Convertir le delta en coordonnées de la carte
    const mapDeltaX = deltaX / scale;
    const mapDeltaY = deltaY / scale;

    // Obtenir les coordonnées actuelles du marqueur
    const currentLeft = parseFloat(draggedLocationMarker.style.left);
    const currentTop = parseFloat(draggedLocationMarker.style.top);

    // Calculer les nouvelles coordonnées
    const newLeft = currentLeft + mapDeltaX;
    const newTop = currentTop + mapDeltaY;

    // Contraindre dans les limites de la carte
    const constrainedLeft = Math.max(0, Math.min(MAP_WIDTH, newLeft));
    const constrainedTop = Math.max(0, Math.min(MAP_HEIGHT, newTop));

    // Appliquer la nouvelle position
    draggedLocationMarker.style.left = `${constrainedLeft}px`;
    draggedLocationMarker.style.top = `${constrainedTop}px`;

    // Mettre à jour les coordonnées de départ pour le prochain mouvement
    dragStartX = e.clientX;
    dragStartY = e.clientY;
}

function handleLocationDragEnd(event) {
    if (!isDraggingLocation || !draggedLocationMarker) return;

    isDraggingLocation = false;
    viewport.style.cursor = 'grab';

    if (draggedLocationMarker && hasDraggedLocation) {
        const locationId = draggedLocationMarker.dataset.id;
        const locationIndex = locationsData.locations.findIndex(loc => String(loc.id) === String(locationId));

        if (locationIndex !== -1) {
            const newX = parseInt(draggedLocationMarker.style.left);
            const newY = parseInt(draggedLocationMarker.style.top);

            const originalLocation = locationsData.locations[locationIndex]; // Récupérer l'objet original

            console.log(`📍 Moved location ${originalLocation.name}: (${originalLocation.coordinates.x}, ${originalLocation.coordinates.y}) → (${newX}, ${newY})`);

            // IMPORTANT: Mettre à jour l'objet dans locationsData.locations
            locationsData.locations[locationIndex].coordinates.x = newX;
            locationsData.locations[locationIndex].coordinates.y = newY;

            // Synchroniser avec window.locationsData ET dataManager
            window.locationsData = locationsData;
            dataManager.locationsData = locationsData;

            // Sauvegarder les modifications
            dataManager.saveLocationsToLocal();

            console.log("✅ Position du lieu mise à jour et sauvegardée");
        } else {
            console.error(`❌ Lieu non trouvé pour la sauvegarde du déplacement: ${locationId}`);
        }
    }

    draggedLocationMarker = null;
    hasDraggedLocation = false;
}

// --- Fonctions utilitaires pour la compatibilité ---
function scheduleAutoSync() {
    // Fonction pour la synchronisation automatique
    console.log("🔄 Auto-sync scheduled");
    if (authManager && authManager.isAuthenticated) {
        authManager.scheduleAutoSync();
    }
}

// Exposer les fonctions nécessaires globalement
window.scheduleAutoSync = scheduleAutoSync;

// Fonctions utilitaires pour la compatibilité avec l'ancien code
window.updateDistanceDisplay = function() {
    if (pathManager) {
        pathManager.updateDistanceDisplay();
    }
};

window.updateJourneyInfo = function() {
    if (pathManager) {
        pathManager.updatePathData();
    }
};

// Fonction pour mettre en surbrillance les découvertes sur la carte
window.highlightDiscoveryOnMap = function(discoveryName, discoveryType, highlight) {
    if (discoveryType === 'location') {
        const marker = document.querySelector(`[data-id*="${discoveryName}"]`);
        if (marker) {
            if (highlight) {
                marker.style.boxShadow = '0 0 20px 5px rgba(59, 130, 246, 0.8)';
                marker.style.transform = 'translate(-50%, -50%) scale(1.2)';
                marker.style.zIndex = '1000';
            } else {
                marker.style.boxShadow = '';
                marker.style.transform = 'translate(-50%, -50%) scale(1)';
                marker.style.zIndex = '';
            }
        }
    } else if (discoveryType === 'region') {
        const regionElement = document.querySelector(`[data-name="${discoveryName}"]`); // Changed to data-name to match polygon attribute
        if (regionElement) {
            if (highlight) {
                regionElement.style.stroke = '#3b82f6';
                regionElement.style.strokeWidth = '4';
                regionElement.style.fill = 'rgba(59, 130, 246, 0.3)';
            } else {
                // Restaurer les styles originaux
                const region = regionsData.regions.find(r => r.name === discoveryName);
                if (region) {
                    const color = regionColorMap[region.color] || regionColorMap['gray'];
                    const fillColor = regionColorMap[region.color] || regionColorMap.gray;
                    const strokeColor = fillColor.replace(/0\.\d+\)$/, '0.8)'); // Bordure plus opaque
                    regionElement.style.stroke = strokeColor;
                    regionElement.style.strokeWidth = '3';
                    regionElement.style.fill = fillColor;
                }
            }
        }
    }
};

// --- Initialisation après chargement du DOM ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("📋 Simplified main.js loaded - waiting for DOM ready");
    initializeApp();
});