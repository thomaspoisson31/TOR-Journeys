// Version de débogage simplifiée - chargement progressif des fonctionnalités

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

// --- Import des managers ---
import DataManager from './managers/data-manager.js';
import FilterManager from './managers/filter-manager.js';
import VoyageManager from './managers/voyage-manager.js';
import PathManager from './managers/path-manager.js';
import SettingsManager from './managers/settings-manager.js';
import AuthManager from './managers/auth-manager.js';
import InfoBoxManager from './managers/infobox-manager.js';
import './managers/calendar-manager.js'; // Import du CalendarManager global

console.log("✅ Constants loaded successfully");

// Support pour Marked.js (optionnel, pour le rendu Markdown)
window.marked = window.marked || null;

// --- Variables globales essentielles ---
let locationsData;
let regionsData = getDefaultRegions();
let MAP_WIDTH = 0, MAP_HEIGHT = 0;
let scale = 1, panX = 0, panY = 0;

// --- Managers ---
let dataManager;
let filterManager;
let voyageManager;
let pathManager;
let calendarManager;
let settingsManager;
let authManager;
let infoBoxManager;

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
        console.log("✅ AuthManager initialized");

        // Initialiser InfoBoxManager
        infoBoxManager = new InfoBoxManager(
            { getElementById: (id) => document.getElementById(id) },
            dataManager,
            window.geminiManager
        );
        window.infoBoxManager = infoBoxManager; // Exposer globalement pour les onclick
        console.log("✅ InfoBoxManager initialized");

        // Charger les données
        console.log("📍 Loading initial locations...");
        await dataManager.loadInitialLocations();
        locationsData = dataManager.locationsData;
        window.locationsData = locationsData; // Exposer globalement pour les filtres
        console.log("✅ Locations loaded successfully");

        // Charger les régions
        dataManager.loadRegionsFromLocal();
        regionsData = dataManager.regionsData;
        window.regionsData = regionsData; // Exposer globalement pour les filtres
        console.log("✅ Regions loaded successfully");

        // Test d'initialisation de la carte
        if (mapImage) {
            mapImage.onload = () => {
                console.log("🗺️ Map image loaded successfully");
                initializeMap();
                // Afficher les lieux après l'initialisation de la carte
                renderLocations();
                // Afficher les régions après l'initialisation de la carte
                renderRegions();
            };
            mapImage.onerror = () => {
                console.error("❌ Map image failed to load");
            };
            mapImage.src = PLAYER_MAP_URL;
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
    console.log("🎯 Rendering locations...");

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

        // Créer le marqueur
        const marker = document.createElement('div');
        marker.className = 'location-marker';
        marker.dataset.id = location.id;
        marker.title = location.name;

        // Positionner le marqueur
        marker.style.left = `${location.coordinates.x}px`;
        marker.style.top = `${location.coordinates.y}px`;

        // Appliquer la couleur
        const color = colorMap[location.color] || colorMap.blue;
        marker.style.backgroundColor = color;

        // Ajouter les événements de clic et de glisser-déplacer
        marker.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Clic gauche seulement
                handleLocationDragStart(e, marker, location);
            }
        });

        marker.addEventListener('click', (e) => {
            // Éviter d'ouvrir l'info-box si on vient de faire un drag
            if (!isDraggingLocation) {
                e.stopPropagation();
                infoBoxManager.showInfoBox(e, location, 'location');
            }
        });

        // Ajouter à la couche des lieux
        locationsLayer.appendChild(marker);
        renderedCount++;
    });

    console.log(`✅ Rendered ${renderedCount} location markers`);
}

// --- Fonction d'affichage des régions ---
function renderRegions() {
    console.log("🌍 Rendering regions...");
    console.log("🌍 RegionsData:", regionsData);

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

    regionsData.regions.forEach(region => {
        console.log(`🔍 Processing region: ${region.name}`, region);

        // Gérer les deux formats de coordonnées : 'coordinates' et 'points'
        let coords = region.coordinates || region.points;

        if (!coords || !Array.isArray(coords) || coords.length === 0) {
            console.warn(`⚠️ Region ${region.name} has invalid coordinates:`, coords);
            return;
        }

        // Vérifier que chaque coordonnée a x et y
        const validCoords = coords.every(coord => 
            coord && typeof coord.x === 'number' && typeof coord.y === 'number'
        );

        if (!validCoords) {
            console.warn(`⚠️ Region ${region.name} has invalid coordinate format:`, coords);
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

        // Créer les points du polygone en utilisant les coordonnées appropriées
        const points = coords.map(coord => `${coord.x},${coord.y}`).join(' ');
        polygon.setAttribute('points', points);

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

        // Ajouter à la couche des régions
        regionsLayer.appendChild(polygon);
        renderedCount++;

        console.log(`✅ Rendered region: ${region.name} with ${coords.length} points`);
    });

    console.log(`✅ Rendered ${renderedCount} region polygons`);
}

// Exposer les fonctions de rendu globalement
window.renderLocations = renderLocations;
window.renderRegions = renderRegions;

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
        panX = 0;
        panY = 0;
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
        // Appliquer les filtres initiaux (montrer tout)
        filterManager.applyFilters();
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

// --- Variables d'état pour le tracé de régions ---
let isRegionDrawingMode = false;
let regionPoints = [];
let tempRegionPolygon = null;

// --- Fonctions de navigation de la carte ---
function updateMapTransform() {
    mapContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

function constrainPan() {
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const scaledMapWidth = MAP_WIDTH * scale;
    const scaledMapHeight = MAP_HEIGHT * scale;

    // Contraintes horizontales
    const maxPanX = Math.max(0, (scaledMapWidth - viewportWidth) / 2);
    const minPanX = Math.min(0, -(scaledMapWidth - viewportWidth) / 2);
    panX = Math.max(minPanX, Math.min(maxPanX, panX));

    // Contraintes verticales
    const maxPanY = Math.max(0, (scaledMapHeight - viewportHeight) / 2);
    const minPanY = Math.min(0, -(scaledMapHeight - viewportHeight) / 2);
    panY = Math.max(minPanY, Math.min(maxPanY, panY));
}

function zoomToPoint(zoomFactor, clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    const viewportX = clientX - rect.left;
    const viewportY = clientY - rect.top;

    // Point dans le système de coordonnées de la carte avant zoom
    const mapX = (viewportX - panX) / scale;
    const mapY = (viewportY - panY) / scale;

    // Nouveau scale avec contraintes
    const newScale = Math.max(minScale, Math.min(maxScale, scale * zoomFactor));

    if (newScale !== scale) {
        // Ajuster le pan pour garder le point sous le curseur
        panX = viewportX - mapX * newScale;
        panY = viewportY - mapY * newScale;
        scale = newScale;

        constrainPan();
        updateMapTransform();
    }
}

function resetView() {
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;

    if (viewportWidth > 0 && viewportHeight > 0 && MAP_WIDTH > 0 && MAP_HEIGHT > 0) {
        // Calculer le zoom pour faire rentrer la carte dans le viewport
        const scaleX = viewportWidth / MAP_WIDTH;
        const scaleY = viewportHeight / MAP_HEIGHT;
        scale = Math.min(scaleX, scaleY) * 0.9; // 90% pour laisser un peu de marge

        // Centrer la carte
        panX = (viewportWidth - MAP_WIDTH * scale) / 2;
        panY = (viewportHeight - MAP_HEIGHT * scale) / 2;

        updateMapTransform();
    }
}

function handlePanStart(e) {
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

    // Zoom avec la molette
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        zoomToPoint(zoomFactor, e.clientX, e.clientY);
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
        zoomToPoint(1.5, e.clientX, e.clientY);
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
    const regionDesc = descInput ? descInput.value.trim() : '';
    const regionColor = selectedColorSwatch ? selectedColorSwatch.dataset.color : 'gray';

    // Créer la nouvelle région avec le bon format de coordonnées
    const newRegion = {
        id: `region_${Date.now()}`,
        name: regionName,
        description: regionDesc,
        color: regionColor,
        coordinates: [...regionPoints], // Format: array de {x, y}
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
        generateEditDescBtn.addEventListener('click', handleGenerateDescription); // Utilise la même fonction
        console.log("✅ Generate edit description button configured");
    }

    // Setup des sélecteurs de couleur pour les lieux
    setupLocationColorPicker();

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
    const locationImage = imageInput ? imageInput.value.trim() : '';
    const locationKnown = knownInput ? knownInput.checked : true;
    const locationVisited = visitedInput ? visitedInput.checked : false;
    const locationColor = selectedColorSwatch ? selectedColorSwatch.dataset.color : 'blue';

    // Créer le nouveau lieu
    const newLocation = {
        id: `location_${Date.now()}`,
        name: locationName,
        description: locationDesc,
        color: locationColor,
        coordinates: { ...window.pendingLocationCoordinates },
        known: locationKnown,
        visited: locationVisited,
        type: "custom"
    };

    // Ajouter l'image si fournie
    if (locationImage) {
        newLocation.images = [{
            url: locationImage,
            isDefault: true
        }];
    }

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

    isDraggingLocation = true;
    draggedLocationMarker = marker;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    // Changer le curseur
    viewport.style.cursor = 'move';
    marker.style.cursor = 'move';

    console.log(`🎯 Starting drag for location: ${location.name}`);
}

function handleLocationDrag(e) {
    if (!isDraggingLocation || !draggedLocationMarker) return;

    e.preventDefault();

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
    if (!isDraggingLocation || !draggedLocationMarker) return;

    console.log("🎯 Ending location drag");

    // Trouver le lieu correspondant et mettre à jour ses coordonnées
    const locationId = draggedLocationMarker.dataset.id;
    const location = locationsData.locations.find(loc => loc.id == locationId);

    if (location) {
        const newX = parseFloat(draggedLocationMarker.style.left);
        const newY = parseFloat(draggedLocationMarker.style.top);

        location.coordinates.x = newX;
        location.coordinates.y = newY;

        console.log(`🎯 Updated location ${location.name} coordinates to (${newX.toFixed(1)}, ${newY.toFixed(1)})`);

        // Sauvegarder les changements
        if (dataManager) {
            dataManager.saveLocationsToLocal();
        }

        // Programmer la synchronisation
        if (typeof scheduleAutoSync === 'function') {
            scheduleAutoSync();
        }
    }

    // Réinitialiser l'état
    const wasDragging = isDraggingLocation;
    isDraggingLocation = false;
    draggedLocationMarker.style.cursor = 'pointer';
    draggedLocationMarker = null;
    viewport.style.cursor = 'grab';

    // Délai plus long pour éviter que le clic se déclenche après le drag
    setTimeout(() => {
        isDraggingLocation = false;
    }, 300);
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