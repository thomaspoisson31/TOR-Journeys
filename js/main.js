// Version de débogage simplifiée - chargement progressif des fonctionnalités

// --- Import des constantes ---
import {


// Support pour Marked.js (optionnel, pour le rendu Markdown)
window.marked = window.marked || null;

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
import './managers/calendar-manager.js'; // Import du CalendarManager global

console.log("✅ Constants loaded successfully");

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

        // Ajouter l'événement de clic
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            showInfoBox(e, location);
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

        if (!region.coordinates || !Array.isArray(region.coordinates) || region.coordinates.length === 0) {
            console.warn(`⚠️ Region ${region.name} has invalid coordinates:`, region.coordinates);
            return;
        }

        // Vérifier que chaque coordonnée a x et y
        const validCoords = region.coordinates.every(coord => 
            coord && typeof coord.x === 'number' && typeof coord.y === 'number'
        );

        if (!validCoords) {
            console.warn(`⚠️ Region ${region.name} has invalid coordinate format:`, region.coordinates);
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
        const points = region.coordinates.map(coord => `${coord.x},${coord.y}`).join(' ');
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
            showInfoBox(e, region, 'region');
        });

        // Ajouter à la couche des régions
        regionsLayer.appendChild(polygon);
        renderedCount++;

        console.log(`✅ Rendered region: ${region.name} with ${region.coordinates.length} points`);
    });

    console.log(`✅ Rendered ${renderedCount} region polygons`);
}


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

    // Configurer les paramètres
    setupSettingsModal();

    resetView(); // Vue initiale optimale

    console.log("✅ Map initialized successfully");
}

// --- Variables d'état pour la navigation ---
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;
let minScale = 0.1;
let maxScale = 4.0;

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
    // Ne pas permettre le pan si on est en mode tracé ou dessin
    if (isRegionDrawingMode || window.isDrawingMode) return;

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
        if (isPanning && !window.isDrawingMode) {
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;

            panX += deltaX;
            panY += deltaY;

            constrainPan();
            updateMapTransform();

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });

    viewport.addEventListener('mouseup', (e) => {
        if (e.button === 0 && !window.isDrawingMode) {
            isPanning = false;
            viewport.style.cursor = 'grab';
        }
    });

    viewport.addEventListener('mouseleave', () => {
        if (!window.isDrawingMode) {
            isPanning = false;
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

// --- Event Listeners pour l'info-box ---
function setupInfoBoxListeners() {
    console.log("📋 Setting up info-box listeners...");

    // Bouton fermer
    const closeBtn = document.getElementById('info-box-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideInfoBox);
    }

    // Bouton étendre/réduire
    const expandBtn = document.getElementById('info-box-expand');
    if (expandBtn) {
        expandBtn.addEventListener('click', toggleInfoBoxExpand);
    }

    // Gestion des onglets
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetTab = e.target.dataset.tab;

            // Désactiver tous les onglets
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Activer l'onglet cliqué
            e.target.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // Gestionnaire principal pour les clics dans le viewport
    viewport.addEventListener('click', handleViewportClick);

    // Clic droit pour finir le tracé de région
    viewport.addEventListener('contextmenu', (e) => {
        if (isRegionDrawingMode && regionPoints.length >= 3) {
            e.preventDefault();
            finishRegionDrawing();
        }
    });

    // Touche Échap pour fermer
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const infoBox = document.getElementById('info-box');
            if (infoBox && infoBox.style.display === 'block') {
                hideInfoBox();
            }
        }
    });

    console.log("✅ Info-box listeners setup complete");
}

// --- Fonctions d'info-box des lieux ---
let currentInfoBox = null;
let isInfoBoxExpanded = false;

function showInfoBox(event, locationOrRegion, type = 'location') {
    console.log("📋 Showing info box for:", locationOrRegion.name, "Type:", type);

    const infoBox = document.getElementById('info-box');
    const infoBoxTitle = document.getElementById('info-box-title');
    const imageTab = document.getElementById('image-tab');
    const textTab = document.getElementById('text-tab');
    const rumeursTab = document.getElementById('rumeurs-tab');
    const traditionTab = document.getElementById('tradition-tab');

    if (!infoBox) {
        console.error("❌ Info box element not found");
        return;
    }

    // Sauvegarder la référence de l'objet actuel
    currentInfoBox = locationOrRegion;

    // Mettre à jour le titre (caché en mode compact)
    if (infoBoxTitle) {
        infoBoxTitle.textContent = locationOrRegion.name;
        infoBoxTitle.classList.add('hidden');
    }

    // Onglet Image
    if (imageTab) {
        const imageView = imageTab.querySelector('.image-view');
        if (imageView) {
            // Vérifier s'il y a des images
            if (locationOrRegion.images && locationOrRegion.images.length > 0) {
                const defaultImage = locationOrRegion.images.find(img => img.isDefault) || locationOrRegion.images[0];
                imageView.innerHTML = `
                    <img src="${defaultImage.url}" alt="${locationOrRegion.name}" class="modal-image">
                    <div class="image-caption">${locationOrRegion.name}</div>
                `;
            } else {
                // Pas d'image - afficher le titre en mode compact
                const typeLabel = type === 'region' ? 'Région' : 'Lieu';
                imageView.innerHTML = `
                    <div class="compact-title">${locationOrRegion.name}</div>
                    <div class="image-placeholder">Aucune image disponible pour cette ${typeLabel.toLowerCase()}</div>
                `;
            }
        }
    }

    // Onglet Texte
    if (textTab) {
        const textView = textTab.querySelector('.text-view');
        if (textView) {
            const h3 = textView.querySelector('h3');
            const p = textView.querySelector('p');

            if (h3) h3.textContent = locationOrRegion.name;
            if (p) {
                let description = '';
                if (type === 'region') {
                    description = locationOrRegion.description || 'Aucune description disponible pour cette région.';
                } else {
                    description = locationOrRegion.description || 'Aucune description disponible.';
                }
                p.textContent = description;
            }
        }
    }

    // Onglet Rumeurs
    if (rumeursTab) {
        const textView = rumeursTab.querySelector('.text-view');
        if (textView) {
            const p = textView.querySelector('p');
            if (p) {
                if (type === 'region') {
                    p.textContent = locationOrRegion.Rumeur || 'Aucune rumeur disponible pour cette région.';
                } else {
                    p.textContent = locationOrRegion.Rumeur || 'Aucune rumeur disponible.';
                }
            }
        }
    }

    // Onglet Tradition
    if (traditionTab) {
        const textView = traditionTab.querySelector('.text-view');
        if (textView) {
            const p = textView.querySelector('p');
            if (p) {
                if (type === 'region') {
                    p.textContent = locationOrRegion.Tradition_Ancienne || 'Aucune tradition ancienne disponible pour cette région.';
                } else {
                    p.textContent = locationOrRegion.Tradition_Ancienne || 'Aucune tradition ancienne disponible.';
                }
            }
        }
    }

    // Positionner et afficher l'info-box
    let x, y;

    if (type === 'region') {
        // Pour les régions, utiliser la position du clic
        const viewportRect = viewport.getBoundingClientRect();
        x = event.clientX - viewportRect.left;
        y = event.clientY - viewportRect.top;
    } else {
        // Pour les lieux, utiliser la position du marqueur
        const rect = event.currentTarget.getBoundingClientRect();
        const viewportRect = viewport.getBoundingClientRect();
        x = rect.left - viewportRect.left + rect.width / 2;
        y = rect.top - viewportRect.top + rect.height / 2;
    }

    // Ajuster pour éviter de sortir de l'écran
    const infoBoxWidth = 280; // Largeur approximative de l'info-box
    const infoBoxHeight = 300; // Hauteur approximative

    let finalX = Math.max(10, Math.min(x, viewport.clientWidth - infoBoxWidth - 10));
    let finalY = Math.max(10, Math.min(y, viewport.clientHeight - infoBoxHeight - 10));

    infoBox.style.left = `${finalX}px`;
    infoBox.style.top = `${finalY}px`;
    infoBox.style.display = 'block';

    // S'assurer que l'onglet Image est actif par défaut
    const tabButtons = infoBox.querySelectorAll('.tab-button');
    const tabContents = infoBox.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    const imageTabButton = infoBox.querySelector('.tab-button[data-tab="image"]');
    if (imageTabButton) {
        imageTabButton.classList.add('active');
        imageTab.classList.add('active');
    }

    console.log("✅ Info box displayed successfully");
}

function hideInfoBox() {
    const infoBox = document.getElementById('info-box');
    if (infoBox) {
        infoBox.style.display = 'none';
        currentInfoBox = null;
        isInfoBoxExpanded = false;
        infoBox.classList.remove('expanded');
    }
}

function toggleInfoBoxExpand() {
    const infoBox = document.getElementById('info-box');
    const infoBoxTitle = document.getElementById('info-box-title');

    if (!infoBox) return;

    isInfoBoxExpanded = !isInfoBoxExpanded;

    if (isInfoBoxExpanded) {
        infoBox.classList.add('expanded');
        if (infoBoxTitle) infoBoxTitle.classList.remove('hidden');

        // Centrer l'info-box étendue
        infoBox.style.left = '50%';
        infoBox.style.top = '50%';
        infoBox.style.transform = 'translate(-50%, -50%)';
    } else {
        infoBox.classList.remove('expanded');
        if (infoBoxTitle) infoBoxTitle.classList.add('hidden');
        infoBox.style.transform = 'none';

        // Repositionner si nécessaire
        if (currentInfoBox) {
            // Garder la position actuelle en mode compact
        }
    }
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



// --- Fonctions de gestion des paramètres ---
function setupSettingsModal() {
    console.log("⚙️ Setting up settings modal...");

    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-modal');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettingsModal);
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettingsModal);
    }

    // Gestion des onglets
    setupSettingsTabs();

    // Gestion des cartes
    setupMapsTab();

    // Gestion des aventuriers
    setupAdventurersTab();

    // Gestion de la quête
    setupQuestTab();

    // Gestion des saisons (déjà gérée par CalendarManager)
    setupSeasonTab();

    console.log("✅ Settings modal setup complete");
}

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('hidden');
        
        // Réinitialiser les listeners du CalendarManager
        if (calendarManager) {
            calendarManager.reinitializeListeners();
            calendarManager.updateCalendarUI();
        }

        // Charger les données actuelles
        loadSettingsData();
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function setupSettingsTabs() {
    const tabButtons = document.querySelectorAll('.settings-tab-button');
    const tabContents = document.querySelectorAll('.settings-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetTab = e.target.dataset.tab;

            // Désactiver tous les onglets
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.style.color = '#9ca3af';
                btn.style.borderColor = 'transparent';
            });
            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });

            // Activer l'onglet cliqué
            e.target.classList.add('active');
            e.target.style.color = 'white';
            e.target.style.borderColor = '#3b82f6';
            
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'flex';
            }

            // Actions spécifiques par onglet
            if (targetTab === 'season' && calendarManager) {
                calendarManager.reinitializeListeners();
                calendarManager.updateCalendarUI();
            } else if (targetTab === 'maps') {
                loadMapsData();
            }
        });
    });
}

function setupMapsTab() {
    console.log("🗺️ Setting up maps tab...");
    
    const addMapBtn = document.getElementById('add-map-btn');
    if (addMapBtn) {
        addMapBtn.addEventListener('click', () => {
            console.log("🗺️ Add map button clicked");
            // Pour l'instant, afficher un message
            alert("Fonctionnalité d'ajout de cartes à implémenter");
        });
    }
}

function setupAdventurersTab() {
    console.log("👥 Setting up adventurers tab...");

    const editBtn = document.getElementById('edit-adventurers-btn');
    const saveBtn = document.getElementById('save-adventurers-edit');
    const cancelBtn = document.getElementById('cancel-adventurers-edit');
    const wizardBtn = document.getElementById('generate-adventurers-wizard');

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            toggleAdventurersEditMode(true);
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveAdventurersData();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            toggleAdventurersEditMode(false);
        });
    }

    if (wizardBtn) {
        wizardBtn.addEventListener('click', () => {
            generateAdventurersWithWizard();
        });
    }
}

function setupQuestTab() {
    console.log("🗡️ Setting up quest tab...");

    const editBtn = document.getElementById('edit-quest-btn');
    const saveBtn = document.getElementById('save-quest-edit');
    const cancelBtn = document.getElementById('cancel-quest-edit');

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            toggleQuestEditMode(true);
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveQuestData();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            toggleQuestEditMode(false);
        });
    }

    // Gestion des styles de narration
    const narrationRadios = document.querySelectorAll('input[name="narration-style"]');
    narrationRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                localStorage.setItem('narrationStyle', e.target.value);
                console.log("📖 Style de narration changé:", e.target.value);
            }
        });
    });
}

function setupSeasonTab() {
    console.log("🌱 Setting up season tab...");
    
    // Gestion déjà effectuée par CalendarManager
    // Ajouter les listeners pour les clics sur les indicateurs de saison dans l'en-tête
    const seasonIndicator = document.getElementById('season-indicator');
    const calendarDateIndicator = document.getElementById('calendar-date-indicator');

    if (seasonIndicator) {
        seasonIndicator.addEventListener('click', () => {
            openSettingsModal();
            // Activer l'onglet saison
            const seasonTabBtn = document.querySelector('.settings-tab-button[data-tab="season"]');
            if (seasonTabBtn) {
                seasonTabBtn.click();
            }
        });
    }

    if (calendarDateIndicator) {
        calendarDateIndicator.addEventListener('click', () => {
            openSettingsModal();
            // Activer l'onglet saison
            const seasonTabBtn = document.querySelector('.settings-tab-button[data-tab="season"]');
            if (seasonTabBtn) {
                seasonTabBtn.click();
            }
        });
    }
}

function loadSettingsData() {
    console.log("📋 Loading settings data...");

    // Charger les données des aventuriers
    const savedAdventurers = localStorage.getItem('adventurersGroup');
    const adventurersContent = document.getElementById('adventurers-content');
    const adventurersTextarea = document.getElementById('adventurers-group');

    if (savedAdventurers && adventurersContent) {
        adventurersContent.innerHTML = marked ? marked.parse(savedAdventurers) : `<p>${savedAdventurers}</p>`;
    } else if (adventurersContent) {
        adventurersContent.innerHTML = '<p class="text-gray-400 italic">Aucune description d\'aventuriers définie.</p>';
    }

    if (savedAdventurers && adventurersTextarea) {
        adventurersTextarea.value = savedAdventurers;
    }

    // Charger les données de la quête
    const savedQuest = localStorage.getItem('adventurersQuest');
    const questContent = document.getElementById('quest-content');
    const questTextarea = document.getElementById('adventurers-quest');

    if (savedQuest && questContent) {
        questContent.innerHTML = marked ? marked.parse(savedQuest) : `<p>${savedQuest}</p>`;
    } else if (questContent) {
        questContent.innerHTML = '<p class="text-gray-400 italic">Aucune description de quête définie.</p>';
    }

    if (savedQuest && questTextarea) {
        questTextarea.value = savedQuest;
    }

    // Charger le style de narration
    const savedNarrationStyle = localStorage.getItem('narrationStyle') || 'brief';
    const narrationRadio = document.querySelector(`input[name="narration-style"][value="${savedNarrationStyle}"]`);
    if (narrationRadio) {
        narrationRadio.checked = true;
    }

    // Charger les données des cartes
    loadMapsData();
}

function loadMapsData() {
    console.log("🗺️ Loading maps data...");
    
    // Mettre à jour les aperçus des cartes actives
    const playerMapPreview = document.getElementById('active-player-map-preview');
    const loremasterMapPreview = document.getElementById('active-loremaster-map-preview');

    if (playerMapPreview) {
        playerMapPreview.src = mapImage.src;
    }

    if (loremasterMapPreview) {
        const loremasterImg = document.getElementById('loremaster-map-image');
        if (loremasterImg && loremasterImg.src) {
            loremasterMapPreview.src = loremasterImg.src;
        }
    }
}

function toggleAdventurersEditMode(edit) {
    const readMode = document.getElementById('adventurers-read-mode');
    const editMode = document.getElementById('adventurers-edit-mode');

    if (edit) {
        readMode.style.display = 'none';
        editMode.classList.remove('hidden');
        editMode.style.display = 'flex';
        
        // Copier le contenu actuel dans le textarea
        const savedAdventurers = localStorage.getItem('adventurersGroup') || '';
        const textarea = document.getElementById('adventurers-group');
        if (textarea) {
            textarea.value = savedAdventurers;
            textarea.focus();
        }
    } else {
        readMode.style.display = 'block';
        editMode.classList.add('hidden');
        editMode.style.display = 'none';
    }
}

function toggleQuestEditMode(edit) {
    const readMode = document.getElementById('quest-read-mode');
    const editMode = document.getElementById('quest-edit-mode');

    if (edit) {
        readMode.style.display = 'none';
        editMode.classList.remove('hidden');
        editMode.style.display = 'flex';
        
        // Copier le contenu actuel dans le textarea
        const savedQuest = localStorage.getItem('adventurersQuest') || '';
        const textarea = document.getElementById('adventurers-quest');
        if (textarea) {
            textarea.value = savedQuest;
            textarea.focus();
        }
    } else {
        readMode.style.display = 'block';
        editMode.classList.add('hidden');
        editMode.style.display = 'none';
    }
}

function saveAdventurersData() {
    const textarea = document.getElementById('adventurers-group');
    if (!textarea) return;

    const content = textarea.value.trim();
    localStorage.setItem('adventurersGroup', content);

    // Mettre à jour l'affichage
    const adventurersContent = document.getElementById('adventurers-content');
    if (adventurersContent) {
        if (content) {
            adventurersContent.innerHTML = marked ? marked.parse(content) : `<p>${content}</p>`;
        } else {
            adventurersContent.innerHTML = '<p class="text-gray-400 italic">Aucune description d\'aventuriers définie.</p>';
        }
    }

    toggleAdventurersEditMode(false);
    console.log("✅ Aventuriers sauvegardés");
}

function saveQuestData() {
    const textarea = document.getElementById('adventurers-quest');
    if (!textarea) return;

    const content = textarea.value.trim();
    localStorage.setItem('adventurersQuest', content);

    // Mettre à jour l'affichage
    const questContent = document.getElementById('quest-content');
    if (questContent) {
        if (content) {
            questContent.innerHTML = marked ? marked.parse(content) : `<p>${content}</p>`;
        } else {
            questContent.innerHTML = '<p class="text-gray-400 italic">Aucune description de quête définie.</p>';
        }
    }

    toggleQuestEditMode(false);
    console.log("✅ Quête sauvegardée");
}

async function generateAdventurersWithWizard() {
    console.log("🧙‍♂️ Generating adventurers with wizard...");

    const wizardBtn = document.getElementById('generate-adventurers-wizard');
    if (!wizardBtn) return;

    // Changer l'état du bouton
    const originalContent = wizardBtn.innerHTML;
    wizardBtn.disabled = true;
    wizardBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Génération...</span>';

    try {
        const prompt = `Génère un groupe d'aventuriers pour une campagne de Jeux de Rôles dans la Terre du Milieu (fin du Troisième Âge, région de l'Eriador). 

Crée un groupe de 3-5 aventuriers avec :
- Nom et prénom de chaque aventurier
- Peuple (Hobbit, Homme des Bree, Rôdeur du Nord, Elfe, Nain, etc.)
- Occupation/classe (Érudit, Guerrier, Chasseur, Ménestrel, etc.)
- Une courte description de personnalité (2-3 traits)
- Un objectif commun qui les unit

Format en Markdown avec des titres et listes. Sois créatif mais reste fidèle à l'univers de Tolkien.`;

        const generatedContent = await callGemini(prompt, 'adventurers_wizard');

        // Mettre à jour le textarea en mode édition
        const textarea = document.getElementById('adventurers-group');
        if (textarea) {
            textarea.value = generatedContent;
        }

        // Activer le mode édition pour permettre les modifications
        toggleAdventurersEditMode(true);

        console.log("✅ Aventuriers générés avec succès");

    } catch (error) {
        console.error("❌ Erreur lors de la génération:", error);
        alert(`Erreur lors de la génération : ${error.message}`);
    } finally {
        // Restaurer l'état du bouton
        wizardBtn.disabled = false;
        wizardBtn.innerHTML = originalContent;
    }
}

// --- Fonctions utilitaires pour la compatibilité ---
function scheduleAutoSync() {
    // Fonction pour la synchronisation automatique
    console.log("🔄 Auto-sync scheduled");
}

// Exposer les fonctions nécessaires globalement
window.openSettingsModal = openSettingsModal;
window.scheduleAutoSync = scheduleAutoSync;
window.calendarManager = calendarManager;

    console.log("Generated prompt for travel description:", prompt);

    try {
        const generatedDescription = await callGemini(prompt, 'travel_description');
        console.log("✅ Travel description generated successfully");
        return generatedDescription;
    } catch (error) {
        console.error("❌ Error generating travel description:", error);
        // Retourner un message d'erreur ou une description par défaut
        return `Impossible de générer la description du voyage. ${error.message}`;
    }
}


function setupLocationColorPicker() {
    const colorPicker = document.getElementById('add-color-picker');
    if (!colorPicker) return;

    const colors = ['blue', 'red', 'green', 'violet', 'orange', 'black'];

    colorPicker.innerHTML = '';

    colors.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.dataset.color = color;
        swatch.style.backgroundColor = colorMap[color] || colorMap.blue;

        if (index === 0) {
            swatch.classList.add('selected');
        }

        swatch.addEventListener('click', () => {
            document.querySelectorAll('#add-color-picker .color-swatch').forEach(s => {
                s.classList.remove('selected');
            });
            swatch.classList.add('selected');
        });

        colorPicker.appendChild(swatch);
    });
}

function setupRegionColorPicker() {
    const colorPicker = document.getElementById('region-color-picker');
    if (!colorPicker) return;

    const colors = ['green', 'red', 'blue', 'violet', 'orange', 'black', 'yellow', 'purple', 'gray'];

    colorPicker.innerHTML = '';

    colors.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.dataset.color = color;
        swatch.style.backgroundColor = regionColorMap[color] || regionColorMap.gray;

        if (index === 0) {
            swatch.classList.add('selected');
        }

        swatch.addEventListener('click', () => {
            document.querySelectorAll('#region-color-picker .color-swatch').forEach(s => {
                s.classList.remove('selected');
            });
            swatch.classList.add('selected');
        });

        colorPicker.appendChild(swatch);
    });
}

// Gestionnaire d'événements pour les clics dans le viewport
function handleViewportClick(event) {
    if (isRegionDrawingMode) {
        handleRegionClick(event);
        return;
    }

    if (isLocationAddingMode) {
        handleLocationClick(event);
        return;
    }

    // Gérer les autres types de clics (info-box, etc.)
    const infoBox = document.getElementById('info-box');
    if (infoBox && infoBox.style.display === 'block' && !infoBox.contains(event.target)) {
        if (!event.target.classList.contains('location-marker')) {
            hideInfoBox();
        }
    }
}

// --- Fonctions de dessin ---
function setupDrawingEvents() {
    console.log("🖌️ Setting up drawing events...");

    // Initialiser les icônes de dessin (si elles existent)
    const drawIcon = document.getElementById('draw-path-icon');
    if (drawIcon) {
        drawIcon.addEventListener('click', () => {
            if (voyageManager) {
                voyageManager.startDrawingPath();
            }
        });
    }

    const stopDrawIcon = document.getElementById('stop-draw-path-icon');
    if (stopDrawIcon) {
        stopDrawIcon.addEventListener('click', () => {
            if (voyageManager) {
                voyageManager.stopDrawingPath();
            }
        });
    }

    // Ajout des écouteurs pour le dessin de voyage
    if (voyageManager) {
        console.log("👂 Adding VoyageManager drawing listeners...");
        // Clic sur la carte pour ajouter un point de voyage
        viewport.addEventListener('click', voyageManager.handleMapClick);
        // Clic droit pour terminer le tracé de voyage
        viewport.addEventListener('contextmenu', voyageManager.handleMapRightClick);
        console.log("✅ VoyageManager drawing listeners added");
    } else {
        console.error("❌ VoyageManager not available for drawing listeners");
    }

    console.log("✅ Drawing events setup complete");
}

// --- Fonctions de base ---
// Les fonctions de sauvegarde sont maintenant gérées par DataManager

// --- Démarrage de l'application ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log("📋 Simplified main.js loaded - waiting for DOM ready");

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
        const regionElement = document.querySelector(`[data-region-name="${discoveryName}"]`);
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
                    regionElement.style.stroke = color;
                    regionElement.style.strokeWidth = '3'; // Use the original stroke width
                    regionElement.style.fill = color;
                }
            }
        }
    }
};