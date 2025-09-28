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

console.log("✅ Constants loaded successfully");

// --- Variables globales essentielles ---
let locationsData;
let regionsData = getDefaultRegions();
let MAP_WIDTH = 0, MAP_HEIGHT = 0;
let scale = 1, panX = 0, panY = 0;

// --- Managers ---
let dataManager;

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

        // Charger les données
        console.log("📍 Loading initial locations...");
        await dataManager.loadInitialLocations();
        locationsData = dataManager.locationsData;
        console.log("✅ Locations loaded successfully");

        // Charger les régions
        dataManager.loadRegionsFromLocal();
        regionsData = dataManager.regionsData;
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
        regionsLayer.style.pointerEvents = 'none'; // Permettre les clics à travers
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
    // Ne pas permettre le pan si on est en mode tracé
    if (isRegionDrawingMode) return;

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
        if (isPanning) {
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
        if (e.button === 0) {
            isPanning = false;
            viewport.style.cursor = 'grab';
        }
    });

    viewport.addEventListener('mouseleave', () => {
        isPanning = false;
        viewport.style.cursor = 'grab';
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

function showInfoBox(event, location) {
    console.log("📋 Showing info box for:", location.name);

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

    // Sauvegarder la référence du lieu actuel
    currentInfoBox = location;

    // Mettre à jour le titre (caché en mode compact)
    if (infoBoxTitle) {
        infoBoxTitle.textContent = location.name;
        infoBoxTitle.classList.add('hidden');
    }

    // Onglet Image
    if (imageTab) {
        const imageView = imageTab.querySelector('.image-view');
        if (imageView) {
            // Vérifier s'il y a des images
            if (location.images && location.images.length > 0) {
                const defaultImage = location.images.find(img => img.isDefault) || location.images[0];
                imageView.innerHTML = `
                    <img src="${defaultImage.url}" alt="${location.name}" class="modal-image">
                    <div class="image-caption">${location.name}</div>
                `;
            } else {
                // Pas d'image - afficher le titre en mode compact
                imageView.innerHTML = `
                    <div class="compact-title">${location.name}</div>
                    <div class="image-placeholder">Aucune image disponible</div>
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

            if (h3) h3.textContent = location.name;
            if (p) p.textContent = location.description || 'Aucune description disponible.';
        }
    }

    // Onglet Rumeurs
    if (rumeursTab) {
        const textView = rumeursTab.querySelector('.text-view');
        if (textView) {
            const p = textView.querySelector('p');
            if (p) p.textContent = location.Rumeur || 'Aucune rumeur disponible.';
        }
    }

    // Onglet Tradition
    if (traditionTab) {
        const textView = traditionTab.querySelector('.text-view');
        if (textView) {
            const p = textView.querySelector('p');
            if (p) p.textContent = location.Tradition_Ancienne || 'Aucune tradition ancienne disponible.';
        }
    }

    // Positionner et afficher l'info-box
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();

    // Position relative au viewport
    const x = rect.left - viewportRect.left + rect.width / 2;
    const y = rect.top - viewportRect.top + rect.height / 2;

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

    if (addLocationBtn) {
        addLocationBtn.addEventListener('click', toggleLocationAddingMode);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelLocationCreation);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmLocationCreation);
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

// --- Fonctions de base ---
// Les fonctions de sauvegarde sont maintenant gérées par DataManager

// --- Démarrage de l'application ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log("📋 Simplified main.js loaded - waiting for DOM ready");