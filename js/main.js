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
    seasonNames,
    mapStyles,
    defaultFilterState,
    regionTypes
} from './utils/constants.js';

// Exposer les constantes globalement
import { getColorFromRegionType } from './utils/constants.js';

window.constants = {
    colorMap,
    regionColorMap,
    regionTypes,
    seasonSymbols,
    seasonNames,
    getColorFromRegionType
};

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
import RandomTablesManager from './managers/random-tables-manager.js'; // Import du RandomTablesManager
import MapSwitcherManager from './managers/map-switcher-manager.js'; // Import du MapSwitcherManager
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


// --- Fonction de chargement de la version ---
async function loadVersionInfo() {
    try {
        // Vérifier si on est en environnement de développement
        const envResponse = await fetch('/api/environment');
        const envData = await envResponse.json();
        const isDevelopment = envData.environment === 'development';

        if (!isDevelopment) {
            console.log('🏭 Production mode - version badge hidden');
            return;
        }

        // Charger le fichier version.json
        const versionResponse = await fetch('/version.json');
        const versionData = await versionResponse.json();

        // Afficher le badge de version
        const versionBadge = document.getElementById('version-badge');
        const versionNumber = document.getElementById('version-number');

        if (versionBadge && versionNumber) {
            versionNumber.textContent = `v${versionData.version}`;
            versionBadge.classList.remove('hidden');
            console.log(`🏷️ Version affichée: v${versionData.version} (${versionData.date})`);
        }
    } catch (error) {
        console.warn('⚠️ Unable to load version info:', error);
    }
}

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
let randomTablesManager; // Déclaration du RandomTablesManager

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

// ==========================================
// 🎮 TOOLBAR VISIBILITY MANAGEMENT
// ==========================================

/**
 * Met à jour la visibilité des boutons de la toolbar en fonction du mode aventure
 */
function updateToolbarButtonsVisibility() {
    const adventureMode = window.positionManager?.adventureMode || false;

    // Boutons à masquer quand le mode aventure est INACTIF
    const drawModeBtn = document.getElementById('draw-mode');
    const journalBtn = document.getElementById('journal-btn');
    const randomRollBtn = document.getElementById('random-roll-btn');

    // Boutons à masquer quand le mode aventure est ACTIF
    const addLocationBtn = document.getElementById('add-location-mode');
    const addRegionBtn = document.getElementById('add-region-mode');
    const filterBtn = document.getElementById('filter-btn');
    const settingsBtn = document.getElementById('settings-btn');

    if (adventureMode) {
        // Mode aventure ACTIF : masquer ajout lieu/région/filtres/paramètres, afficher tracé/journal/tirage
        if (drawModeBtn) drawModeBtn.classList.remove('hidden');
        if (journalBtn) journalBtn.classList.remove('hidden');
        if (randomRollBtn) randomRollBtn.classList.remove('hidden');
        if (addLocationBtn) addLocationBtn.classList.add('hidden');
        if (addRegionBtn) addRegionBtn.classList.add('hidden');
        if (filterBtn) filterBtn.classList.add('hidden');
        if (settingsBtn) settingsBtn.classList.add('hidden');
    } else {
        // Mode aventure INACTIF : masquer tracé/journal/tirage, afficher ajout lieu/région/filtres/paramètres
        if (drawModeBtn) drawModeBtn.classList.add('hidden');
        if (journalBtn) journalBtn.classList.add('hidden');
        if (randomRollBtn) randomRollBtn.classList.add('hidden');
        if (addLocationBtn) addLocationBtn.classList.remove('hidden');
        if (addRegionBtn) addRegionBtn.classList.remove('hidden');
        if (filterBtn) filterBtn.classList.remove('hidden');
        if (settingsBtn) settingsBtn.classList.remove('hidden');
    }

    console.log(`🎮 Visibilité des boutons mise à jour - Mode Aventure: ${adventureMode ? 'Actif' : 'Inactif'}`);
}

// Exposer la fonction globalement
window.updateToolbarButtonsVisibility = updateToolbarButtonsVisibility;

// ==========================================
// 🔍 DEBUG & LOGGING
// ==========================================

// --- Fonction d'initialisation simplifiée ---
async function initializeApp() {
    console.log('🚀 Starting simplified application...');

    // Charger et afficher la version en développement
    await loadVersionInfo();

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

        // Initialiser GeminiManager
        const GeminiManager = (await import('./managers/gemini-manager.js')).default;
        const geminiManager = new GeminiManager();
        window.geminiManager = geminiManager; // Exposer globalement
        window.geminiApi = geminiManager; // Alias pour compatibilité
        console.log("✅ GeminiManager initialized");

        // Initialiser InfoBoxManager
        infoBoxManager = new InfoBoxManager(
            { getElementById: (id) => document.getElementById(id) },
            dataManager,
            geminiManager
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
                    <div class="mt-6 flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
                        <button onclick="window.openSettingsForMap()" class="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white font-medium transition-colors flex items-center justify-center">
                            <i class="fas fa-cog mr-2"></i>Paramètres
                        </button>
                        <button onclick="location.reload()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors flex items-center justify-center">
                            <i class="fas fa-sync-alt mr-2"></i>Recharger
                        </button>
                    </div>
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

        // IMPORTANT: Vérifier si le lieu passe les filtres actifs (incluant mode Aventure)
        if (window.filterManager) {
            const isFiltered = window.filterManager.filteredLocations.some(loc => loc.id === location.id);
            const shouldShowLocations = window.filterManager.activeFilters.showLocations;

            if (!shouldShowLocations || !isFiltered) {
                // Le lieu ne passe pas les filtres actifs, ne pas l'afficher
                return;
            }
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
        let hasThumbnail = false;
        if (location.images && Array.isArray(location.images)) {
            const thumbnailImg = location.images.find(img => img.type === 'vignette');
            if (thumbnailImg) {
                hasThumbnail = true;
            }
        }

        // Appliquer l'opacité selon le statut connu
        const opacity = location.known === false ? '0.5' : '1';

        // Toujours afficher le cercle coloré
        const color = colorMap[location.color] || colorMap.blue;
        marker.style.backgroundColor = color;
        marker.style.backgroundImage = 'none';
        marker.style.width = '64px';
        marker.style.height = '64px';
        marker.style.border = 'none';
        marker.style.borderRadius = '50%';
        marker.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.6), 0 3px 8px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.4)';
        marker.style.opacity = opacity;

        // Ajouter la classe has-thumbnail si une vignette existe (pour l'effet de zoom au survol)
        if (hasThumbnail) {
            marker.classList.add('has-thumbnail');

            // Stocker les données de vignette dans le marqueur pour affichage au survol
            const thumbnailImage = location.images.find(img => img.type === 'vignette');
            if (thumbnailImage) {
                marker.dataset.thumbnailUrl = thumbnailImage.url;
                if (thumbnailImage.thumbnailCrop) {
                    marker.dataset.thumbnailCrop = JSON.stringify(thumbnailImage.thumbnailCrop);
                }
            }
        }

        // Gérer l'affichage de la vignette au survol (seulement si vignette existe)
        marker.addEventListener('mouseenter', () => {
            if (marker.dataset.thumbnailUrl) {
                // Créer et afficher la vignette dynamiquement au survol
                const imgElement = document.createElement('img');
                imgElement.src = marker.dataset.thumbnailUrl;
                imgElement.alt = location.name;
                imgElement.className = 'thumbnail-image hover-thumbnail';

                if (marker.dataset.thumbnailCrop) {
                    const crop = JSON.parse(marker.dataset.thumbnailCrop);
                    const zoom = crop.zoom || 1;
                    const offsetX = crop.offsetX || 0;
                    const offsetY = crop.offsetY || 0;
                    imgElement.style.transform = `scale(${zoom}) translate(${offsetX}%, ${offsetY}%)`;
                    imgElement.style.transformOrigin = 'center';
                }

                imgElement.style.width = '100%';
                imgElement.style.height = '100%';
                imgElement.style.objectFit = 'cover';
                marker.appendChild(imgElement);
            }
        });

        marker.addEventListener('mouseleave', () => {
            // Retirer la vignette temporaire
            const hoverThumbnail = marker.querySelector('.hover-thumbnail');
            if (hoverThumbnail) {
                hoverThumbnail.remove();
            }
        });

        // Événements de souris pour le glisser-déplacer
        marker.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Clic gauche seulement
                // Bloquer en mode ajout de lieu - priorité absolue
                if (isLocationAddingMode) {
                    return; // Laisser le clic se propager au viewport pour l'ajout
                }

                // Bloquer le drag en mode dessin de région
                if (isRegionDrawingMode) {
                    return; // Laisser le clic se propager au viewport pour le tracé
                }

                // En mode Aventure, on enregistre la position pour le clic mais on ne permet pas le drag
                if (window.positionManager && window.positionManager.adventureMode) {
                    dragStartX = e.clientX;
                    dragStartY = e.clientY;
                    e.stopPropagation();
                    return; // Le clic sera géré par l'événement click
                }

                e.stopPropagation();
                e.preventDefault();

                // Initialiser le drag potentiel (seulement hors mode Aventure)
                draggedLocationMarker = marker;
                draggedLocation = location;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                hasDraggedLocation = false;

                // Changer le curseur pour indiquer qu'on peut déplacer
                marker.style.cursor = 'grab';
            }
        });

        // Survol pour montrer le curseur de déplacement
        marker.addEventListener('mouseenter', () => {
            if (!isDraggingLocation && !window.isDrawingMode) {
                // Curseur croix en mode ajout de lieu
                if (isLocationAddingMode) {
                    marker.style.cursor = 'crosshair';
                }
                // Ne pas afficher le curseur "move" en mode Aventure
                else if (window.positionManager && window.positionManager.adventureMode) {
                    marker.style.cursor = 'pointer';
                } else {
                    marker.style.cursor = 'move';
                }
            }
        });

        marker.addEventListener('mouseleave', () => {
            if (!isDraggingLocation && !window.isDrawingMode) {
                // Garder la croix en mode ajout de lieu
                if (isLocationAddingMode) {
                    marker.style.cursor = 'crosshair';
                } else {
                    marker.style.cursor = 'pointer';
                }
            }
        });

        marker.addEventListener('click', (e) => {
            console.log("📍 [CLICK] Marker clicked:", location.name);
            e.stopPropagation();
            e.preventDefault();

            // Bloquer en mode ajout de lieu - priorité absolue
            if (isLocationAddingMode) {
                return;
            }

            // Bloquer le clic simple si on est en train de tracer une région
            if (isRegionDrawingMode) {
                return;
            }

            // Ne pas ouvrir l'infobox si on a dragué le marqueur (seuil de 5 pixels)
            // On vérifie dragStartX/Y qui sont set dans mousedown
            const dragDistance = (typeof dragStartX !== 'undefined') ? 
                Math.sqrt(Math.pow(e.clientX - dragStartX, 2) + Math.pow(e.clientY - dragStartY, 2)) : 0;
            
            if (dragDistance > 5) {
                return;
            }

            if (window.infoBoxManager) {
                window.infoBoxManager.showInfoBox(e, location, 'location');
            }
        });

        // Événements tactiles pour mobile
        let touchStartTime = 0;
        let touchHasMoved = false;

        marker.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            touchHasMoved = false;

            // Bloquer le drag tactile en mode Aventure (mais permettre le tap pour ouvrir l'infobox)
            if (window.positionManager && window.positionManager.adventureMode) {
                // On laisse passer pour détecter le tap, mais on ne permet pas le drag
                e.stopPropagation();
                return;
            }

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
            // Bloquer les interactions si on est en mode ajout de lieu - priorité absolue
            if (isLocationAddingMode) {
                return; // Laisser le clic se propager au viewport pour l'ajout
            }

            // Bloquer les interactions si on est en mode dessin de région
            if (isRegionDrawingMode) {
                return; // Laisser le clic se propager au viewport pour le tracé
            }

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

                // Forcer l'affichage de l'onglet Description avec rafraîchissement du contenu
                setTimeout(() => {
                    console.log(`📋 [TOUCH] Affichage forcé de l'onglet Description pour ${location.name}`);
                    infoBoxManager.switchTab('text');
                    infoBoxManager.renderReadMode();
                }, 100);
            } else if (!touchHasMoved && touchDuration >= 500) {
                // Long press : ouvrir le menu de couleur
                console.log(`📱 [TOUCH] Opening color modal for ${location.name}`);
                showColorChangeModal(e, location, 'location');
            }
        }, { passive: false });

        // Ajouter l'événement de clic droit pour changer la couleur (desktop)
        marker.addEventListener('contextmenu', (e) => {
            // Bloquer en mode ajout de lieu
            if (isLocationAddingMode) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            showColorChangeModal(e, location, 'location');
        });

        // Forcer pointer-events pour s'assurer que les marqueurs sont cliquables
        marker.style.pointerEvents = 'auto';
        marker.style.touchAction = 'none'; // Empêcher le comportement par défaut du navigateur
        marker.style.cursor = 'pointer'; // Curseur par défaut

        // Ajouter à la couche des lieux
        locationsLayer.appendChild(marker);
        renderedCount++;
    });

    console.log(`✅ Rendered ${renderedCount} location markers`);
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

        // Définir les styles du polygone - couleur dérivée du type
        const colorKey = window.constants?.getColorFromRegionType?.(region.regionType) || 'yellow';
        const fillColor = regionColorMap[colorKey] || regionColorMap.yellow;
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
            // Bloquer l'affichage de l'infobox si on est en mode ajout de lieu - priorité absolue
            if (isLocationAddingMode) {
                return; // Laisser le clic se propager au viewport pour l'ajout
            }

            // Bloquer l'affichage de l'infobox si on est en mode dessin de région OU en mode tracé de voyage
            if (isRegionDrawingMode || window.isDrawingMode) {
                return; // Laisser le clic se propager au viewport pour le tracé
            }

            e.stopPropagation();
            infoBoxManager.showInfoBox(e, region, 'region');

            // Forcer l'affichage de l'onglet Description avec rafraîchissement du contenu
            setTimeout(() => {
                console.log(`📋 [CLICK] Affichage forcé de l'onglet Description pour ${region.name}`);
                infoBoxManager.switchTab('text');
                infoBoxManager.renderReadMode();
            }, 100);
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
            // Bloquer l'affichage de l'infobox si on est en mode ajout de lieu - priorité absolue
            if (isLocationAddingMode) {
                return; // Laisser le clic se propager au viewport pour l'ajout
            }

            // Bloquer l'affichage de l'infobox si on est en mode dessin de région OU en mode tracé de voyage
            if (isRegionDrawingMode || window.isDrawingMode) {
                return; // Laisser le clic se propager au viewport pour le tracé
            }

            e.preventDefault();
            e.stopPropagation();

            const touchDuration = Date.now() - regionTouchStartTime;

            if (!regionTouchHasMoved && touchDuration < 500) {
                // Tap simple : ouvrir l'infobox
                infoBoxManager.showInfoBox(e, region, 'region');

                // Forcer l'affichage de l'onglet Description avec rafraîchissement du contenu
                setTimeout(() => {
                    console.log(`📋 [TOUCH] Affichage forcé de l'onglet Description pour ${region.name}`);
                    infoBoxManager.switchTab('text');
                    infoBoxManager.renderReadMode();
                }, 100);
            } else if (!regionTouchHasMoved && touchDuration >= 500) {
                // Long press désactivé pour les régions (couleur dérivée du type)
                // Ne rien faire
            }
        }, { passive: false });

        // Désactivation du clic droit pour les régions (couleur dérivée du type)
        polygon.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Ne rien faire - la couleur est maintenant dérivée du type de région
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

// Fonction pour ouvrir les paramètres en cas d'erreur de carte
window.openSettingsForMap = function() {
    const loaderOverlay = document.getElementById('loader-overlay');
    if (loaderOverlay) {
        // Ne pas masquer complètement, juste rendre transparent pour voir la modale par dessus
        // Ou mieux, laisser l'overlay mais s'assurer que la modale est au-dessus (z-index)
        // Le loader-overlay a z-50, settings-modal a z-60, donc ça devrait aller.
        // Mais si on veut que l'utilisateur puisse interagir avec la modale, il faut peut-être cacher le message d'erreur temporairement
        // ou simplement ouvrir la modale par dessus.

        // Si on cache l'overlay, on risque de voir une page vide/cassée dessous.
        // On va essayer d'ouvrir la modale directement.
    }

    if (window.settingsManager) {
        window.settingsManager.openSettings();
        window.settingsManager.switchTab('maps');
    } else {
        alert("Le gestionnaire de paramètres n'est pas encore initialisé. Veuillez recharger la page.");
    }
};

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
            // Exposer filterManager globalement AVANT setupFilterListeners
            window.filterManager = filterManager;
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
        window.voyageManager = voyageManager; // Exposer globalement pour les onclick
        console.log("✅ VoyageManager setup complete and exposed globally");
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

    // AdventureManager maintenu pour compatibilité des données (tables aléatoires)
    // mais sans initialiser les event listeners (bouton désactivé)
    adventureManager = new AdventureManager();
    // adventureManager.init(); // Désactivé - fonctionnalités dans les Paramètres
    window.adventureManager = adventureManager; // Exposer globalement pour accès aux données
    console.log("✅ AdventureManager initialized (data-only mode)");

    // Initialiser CharactersManager
    charactersManager = new CharactersManager();
    charactersManager.init();
    window.charactersManager = charactersManager; // Exposer globalement
    console.log("✅ CharactersManager initialized");

    // Initialiser RandomTablesManager
    randomTablesManager = new RandomTablesManager();
    randomTablesManager.init();
    window.randomTablesManager = randomTablesManager; // Exposer globalement
    console.log("✅ RandomTablesManager initialized");

    // Initialiser MapSwitcherManager
    const mapSwitcherManager = new MapSwitcherManager();
    mapSwitcherManager.init();
    window.mapSwitcherManager = mapSwitcherManager; // Exposer globalement
    console.log("✅ MapSwitcherManager initialized");

    // LibraryManager supprimé - fonctionnalité intégrée dans les modales

    // Configurer les événements de dessin après que tous les managers soient initialisés
    setupDrawingEvents();

    // Reset view to fit the entire map
    resetView();

    // Apply filters one final time after everything is loaded
    console.log("🔍 [initializeMap] Application finale des filtres après resetView");
    if (window.filterManager) {
        window.filterManager.applyFilters();
    }

    // Mettre à jour la visibilité des boutons de la toolbar en fonction du mode aventure
    if (typeof updateToolbarButtonsVisibility === 'function') {
        updateToolbarButtonsVisibility();
    }

    console.log("✅ Map initialized successfully");
}

// --- Fonctions de navigation de la carte ---
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
let dragThreshold = 3; // Distance minimale en pixels pour considérer un drag
let draggedLocation = null; // Stocke l'objet location en cours de drag

// --- Variables d'état pour le tracé de régions ---
let isRegionDrawingMode = false;
let regionPoints = [];
let tempRegionPolygon = null;

// --- Variables d'état pour le changement de couleur ---
let isColorChangeModalOpen = false;
let currentColorChangeTarget = null;
let currentColorChangeType = null; // 'location' ou 'region'

function updateMapTransform() {
    window.scale = scale; // Toujours synchroniser window.scale
    mapContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
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
                }

                // Mettre à jour le ZoomManager
                if (zoomManager) {
                    zoomManager.updateDisplay();
                }

                // Forcer la position des éléments UI sur mobile
                if (window.innerWidth <= 768) {
                    requestAnimationFrame(() => {
                        const toolbar = document.getElementById('toolbar');
                        const distanceContainer = document.getElementById('distance-container');
                        const zoomControl = document.getElementById('zoom-control');

                        if (toolbar) toolbar.style.transform = 'none';
                        if (distanceContainer) distanceContainer.style.transform = 'none';
                        if (zoomControl && window.innerWidth <= 480) {
                            zoomControl.style.transform = 'translateX(-50%)';
                        }
                    });
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
        const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
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
        // Gérer le drag de lieu si un marqueur est prêt
        if (draggedLocationMarker && !isDraggingLocation) {
            const deltaX = Math.abs(e.clientX - dragStartX);
            const deltaY = Math.abs(e.clientY - dragStartY);

            // Si on dépasse le seuil, on commence le drag
            if (deltaX > dragThreshold || deltaY > dragThreshold) {
                isDraggingLocation = true;
                hasDraggedLocation = true;
                viewport.style.cursor = 'grabbing';
                draggedLocationMarker.style.cursor = 'grabbing';
            }
        }

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
        if (e.button === 0) {
            // Gérer la fin du drag de lieu
            if (draggedLocationMarker) {
                if (!hasDraggedLocation && draggedLocation) {
                    // Simple clic sans mouvement : ouvrir l'infobox
                    e.stopPropagation();
                    e.preventDefault();
                    infoBoxManager.showInfoBox(e, draggedLocation, 'location');

                    // Forcer l'affichage de l'onglet Description avec rafraîchissement du contenu
                    setTimeout(() => {
                        console.log(`📋 [CLICK] Affichage forcé de l'onglet Description pour ${draggedLocation.name}`);
                        infoBoxManager.switchTab('text');
                        infoBoxManager.renderReadMode();
                    }, 100);
                } else if (isDraggingLocation) {
                    // Fin du drag : sauvegarder
                    handleLocationDragEnd(e);
                }

                // Réinitialiser
                if (draggedLocationMarker) {
                    draggedLocationMarker.style.cursor = 'grab';
                }
                draggedLocationMarker = null;
                draggedLocation = null;
                isDraggingLocation = false;
                hasDraggedLocation = false;
            } else if (!window.isDrawingMode && !isRegionDrawingMode) {
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

    // Double-clic pour centrer et zoomer (désactivé en mode tracé de région)
    viewport.addEventListener('dblclick', (e) => {
        // Ne pas zoomer si on est en mode tracé de région
        if (isRegionDrawingMode) {
            return;
        }

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

    // Clic sur l'indicateur de mode aventure pour basculer le mode
    const adventureModeIndicator = document.getElementById('adventure-mode-indicator');
    if (adventureModeIndicator) {
        adventureModeIndicator.addEventListener('click', () => {
            if (positionManager) {
                positionManager.toggleAdventureMode();
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

        // Sortir du mode dessin si actif
        if (pathManager && pathManager.isDrawingMode) {
            pathManager.toggleDrawingMode();
        }

        // Changer l'apparence du bouton
        if (addRegionBtn) {
            addRegionBtn.classList.add('btn-active');
            addRegionBtn.title = "Arrêter le tracé de région";
        }

        // Changer le curseur
        viewport.style.cursor = 'crosshair';
        viewport.classList.add('adding-region');

        // Désactiver les pointer-events des régions existantes pour permettre le tracé
        const regionsLayer = document.getElementById('regions-layer');
        if (regionsLayer) {
            regionsLayer.querySelectorAll('polygon').forEach(polygon => {
                polygon.style.pointerEvents = 'none';
            });
        }

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

    // Réactiver les pointer-events des régions existantes
    const regionsLayer = document.getElementById('regions-layer');
    if (regionsLayer) {
        regionsLayer.querySelectorAll('polygon').forEach(polygon => {
            polygon.style.pointerEvents = 'auto';
        });
    }

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
    tempGroup.style.pointerEvents = 'none'; // Permettre aux clics de traverser le polygone temporaire

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
    const uploadImageBtn = document.getElementById('upload-location-image'); // Bouton pour uploader une image

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

    // Gestion de l'upload d'image pour le lieu
    if (uploadImageBtn) {
        uploadImageBtn.addEventListener('click', openLibrarySelection);
        console.log("✅ Upload image button configured");
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

        // Sortir du mode dessin si actif
        if (pathManager && pathManager.isDrawingMode) {
            pathManager.toggleDrawingMode();
        }

        // Changer l'apparence du bouton
        if (addLocationBtn) {
            addLocationBtn.classList.add('btn-active');
            addLocationBtn.title = "Arrêter l'ajout de lieu";
        }

        // Changer le curseur
        viewport.style.cursor = 'crosshair';
        viewport.classList.add('adding-location');

        // Désactiver les pointer-events des régions existantes pour permettre l'ajout
        const regionsLayer = document.getElementById('regions-layer');
        if (regionsLayer) {
            regionsLayer.querySelectorAll('polygon').forEach(polygon => {
                polygon.style.pointerEvents = 'none';
            });
        }
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

    // Réactiver les pointer-events des régions existantes
    const regionsLayer = document.getElementById('regions-layer');
    if (regionsLayer) {
        regionsLayer.querySelectorAll('polygon').forEach(polygon => {
            polygon.style.pointerEvents = 'auto';
        });
    }
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
    const knownInput = document.getElementById('location-known-input');
    const visitedInput = document.getElementById('location-visited-input');
    const selectedImagesContainer = document.getElementById('selected-library-images');

    if (modal) {
        // Réinitialiser les champs
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
        // FORCER la case "Connu" à être cochée pour éviter que le lieu soit masqué par les filtres
        if (knownInput) {
            knownInput.checked = true;
            console.log("📍 [showLocationCreationModal] Case 'Connu' forcée à true");
        }
        if (visitedInput) visitedInput.checked = false;

        // Sélectionner la première couleur par défaut
        const firstColorSwatch = document.querySelector('#add-color-picker .color-swatch');
        if (firstColorSwatch) {
            document.querySelectorAll('#add-color-picker .color-swatch').forEach(swatch => {
                swatch.classList.remove('selected');
            });
            firstColorSwatch.classList.add('selected');
        }

        // Réinitialiser les images sélectionnées
        window.pendingLocationImages = [];
        selectedLibraryImages = [];
        if (selectedImagesContainer) {
            selectedImagesContainer.classList.add('hidden');
            document.getElementById('selected-images-list').innerHTML = '';
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
    const knownInput = document.getElementById('location-known-input');
    const visitedInput = document.getElementById('location-visited-input');
    const selectedColorSwatch = document.querySelector('#add-color-picker .color-swatch.selected');
    const selectedImagesContainer = document.getElementById('selected-library-images');

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
    const knownStatus = knownInput ? knownInput.checked : true;
    const visitedStatus = visitedInput ? visitedInput.checked : false;
    const selectedColor = selectedColorSwatch ? selectedColorSwatch.dataset.color : 'blue';

    // Récupérer les données d'images potentiellement sélectionnées dans la bibliothèque
    const uploadedImages = window.pendingLocationImages || [];

    // Ajout du mapId
    const activeMapId = window.settingsManager?.activeMapUrl || 'fr_tor_2nd_eriadors_map_page-0001.webp';

    const tempMarkerX = window.pendingLocationCoordinates.x;
    const tempMarkerY = window.pendingLocationCoordinates.y;

    const newLocation = {
        id: Date.now(),
        name: locationName,
        description: locationDesc || '',
        coordinates: { x: tempMarkerX, y: tempMarkerY },
        color: selectedColor,
        // En mode Aventure, marquer automatiquement comme connu pour éviter que le lieu disparaisse
        known: window.positionManager?.adventureMode ? true : knownStatus,
        visited: visitedStatus,
        images: uploadedImages,
        type: 'custom'
    };

    // IMPORTANT: Appliquer le mapId de la carte active
    if (activeMapId) {
        newLocation.mapId = activeMapId;
        console.log(`📍 [confirmLocationCreation] mapId appliqué au nouveau lieu: ${newLocation.mapId}`);
    }

    // IMPORTANT: Synchroniser avec window.locationsData
    if (!window.locationsData) {
        window.locationsData = locationsData;
    }
    window.locationsData.locations.push(newLocation);
    locationsData = window.locationsData;

    // Synchroniser avec window.locationsData ET dataManager
    window.locationsData = locationsData;
    dataManager.locationsData = locationsData;

    // Sauvegarder d'abord
    dataManager.saveLocationsToLocal();

    // IMPORTANT: Réappliquer les filtres pour inclure le nouveau lieu
    if (window.filterManager) {
        console.log("🔍 [confirmLocationCreation] Réapplication des filtres après création");
        console.log(`🔍 [confirmLocationCreation] Nouveau lieu - known: ${newLocation.known}, visited: ${newLocation.visited}`);
        console.log(`🔍 [confirmLocationCreation] Filtres actifs:`, window.filterManager.activeFilters);
        console.log(`📊 Total locations: ${window.locationsData.locations.length}`);

        // IMPORTANT: D'abord recalculer les lieux filtrés (sans toucher au DOM)
        window.filterManager.filteredLocations = window.filterManager.filterLocations(window.locationsData.locations || []);
        console.log(`🔍 [confirmLocationCreation] Après filterLocations: ${window.filterManager.filteredLocations.length} lieux passent les filtres`);

        // Puis re-render pour créer UNIQUEMENT les marqueurs filtrés
        renderLocations();

        console.log(`✅ Nouveau lieu rendu - ${window.filterManager.filteredLocations.length} lieux visibles sur ${window.locationsData.locations.length} total`);
    } else {
        // Fallback si filterManager n'est pas disponible
        renderLocations();
    }

    console.log(`✅ New location added: ${newLocation.name}`, newLocation);
    console.log(`📊 Total locations: ${window.locationsData.locations.length}`);

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
    if (selectedImagesContainer) {
        selectedImagesContainer.classList.add('hidden');
    }
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

function openLibrarySelection() {
    loadLibraryForSelection();
}

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

    content.innerHTML = `
        <div class="col-span-full mb-4">
            <h3 class="text-lg font-semibold text-white mb-2">Sélectionner un dossier :</h3>
        </div>
        ${folderNames.map(folder => `
            <div class="relative cursor-pointer rounded-lg overflow-hidden bg-gray-700 hover:ring-2 hover:ring-blue-500 transition-all p-6 flex flex-col items-center justify-center"
                 onclick="window.selectLibraryFolder('${folder}')">
                <i class="fas fa-folder text-blue-400 text-4xl mb-2"></i>
                <div class="text-white font-medium">${folder}</div>
                <div class="text-gray-400 text-sm">${libraryFolders[folder].length} image(s)</div>
            </div>
        `).join('')}
    `;
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

    content.innerHTML = `
        <div class="col-span-full mb-4 flex items-center">
            <button onclick="renderLibraryFolders()" class="flex items-center text-blue-400 hover:text-blue-300">
                <i class="fas fa-arrow-left mr-2"></i>
                Retour aux dossiers
            </button>
            <h3 class="text-lg font-semibold text-white ml-4">${currentLibraryFolder || 'Images'}</h3>
        </div>
    `;

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
function handleLocationDrag(e) {
    if (!isDraggingLocation || !draggedLocationMarker) return;

    e.preventDefault();
    e.stopPropagation();

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

function handleLocationDragEnd(e) {
    if (!draggedLocationMarker || !draggedLocation) return;

    const rect = viewport.getBoundingClientRect();
    const viewportX = (e?.clientX || dragStartX) - rect.left;
    const viewportY = (e?.clientY || dragStartY) - rect.top;

    // Convertir les coordonnées du viewport vers les coordonnées de la carte
    const mapX = (viewportX - panX) / scale;
    const mapY = (viewportY - panY) / scale;

    // Mettre à jour les coordonnées du lieu
    draggedLocation.coordinates = {
        x: Math.round(mapX),
        y: Math.round(mapY)
    };

    console.log(`📍 Lieu déplacé: ${draggedLocation.name} vers (${Math.round(mapX)}, ${Math.round(mapY)})`);

    // IMPORTANT: Mettre à jour window.locationsData pour que la sauvegarde fonctionne
    if (window.locationsData && window.locationsData.locations) {
        const locationIndex = window.locationsData.locations.findIndex(loc => loc.id === draggedLocation.id);
        if (locationIndex !== -1) {
            window.locationsData.locations[locationIndex] = { ...draggedLocation };
            console.log(`🔄 window.locationsData mis à jour pour ${draggedLocation.name}`);
        }
    }

    // Sauvegarder via DataManager
    if (dataManager) {
        dataManager.saveLocationsToLocal();
        console.log("💾 Coordonnées du lieu sauvegardées");
    }

    // Marquer comme non sauvegardé pour sync cloud
    if (typeof window.markAsUnsaved === 'function') {
        window.markAsUnsaved();
        console.log("☁️ Marqué comme non sauvegardé pour sync cloud");
    }

    // Réinitialiser les variables de drag
    draggedLocationMarker = null;
    draggedLocation = null;
    isDraggingLocation = false;
    hasDraggedLocation = false;

    // Re-render pour afficher la nouvelle position
    renderLocations();
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

// Exposer voyageManager globalement pour accès dans les onclick
window.voyageManager = voyageManager;

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