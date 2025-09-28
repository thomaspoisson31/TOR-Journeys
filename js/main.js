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

    const regionsLayer = document.getElementById('regions-layer');
    if (!regionsLayer) {
        console.error("❌ Regions layer not found");
        return;
    }

    // Nettoyer les polygones existants
    regionsLayer.innerHTML = '';

    if (!regionsData || !regionsData.regions) {
        console.log("⚠️ No regions data to render");
        return;
    }

    let renderedCount = 0;

    regionsData.regions.forEach(region => {
        if (!region.coordinates || !Array.isArray(region.coordinates) || region.coordinates.length === 0) {
            console.warn(`⚠️ Region ${region.name} has invalid coordinates`);
            return;
        }

        // Créer le polygone
        const polygon = document.createElement('div');
        polygon.className = 'region-polygon';
        polygon.dataset.id = region.id;
        polygon.title = region.name;

        // Définir les styles du polygone
        const color = regionColorMap[region.color] || regionColorMap.gray;
        polygon.style.backgroundColor = color;
        polygon.style.borderColor = color;
        polygon.style.opacity = '0.3'; // Semi-transparent

        // Créer le chemin SVG pour le polygone
        const points = region.coordinates.map(coord => `${coord.x},${coord.y}`).join(' ');
        polygon.innerHTML = `
            <svg width="${MAP_WIDTH}" height="${MAP_HEIGHT}" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" preserveAspectRatio="xMidYMid meet">
                <polygon points="${points}" />
            </svg>
        `;

        // Ajouter à la couche des régions
        regionsLayer.appendChild(polygon);
        renderedCount++;
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

    // Créer la nouvelle région
    const newRegion = {
        id: `region_${Date.now()}`,
        name: regionName,
        description: regionDesc,
        color: regionColor,
        coordinates: [...regionPoints], // Copie des points
        known: true,
        visited: false
    };

    console.log("💾 Creating new region:", newRegion);

    // Ajouter à la liste des régions
    if (!regionsData.regions) {
        regionsData.regions = [];
    }
    regionsData.regions.push(newRegion);

    // Sauvegarder via DataManager
    if (dataManager) {
        dataManager.saveRegionsToLocal();
    }

    // Re-render les régions
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

function setupRegionColorPicker() {
    const colorPicker = document.getElementById('region-color-picker');
    if (!colorPicker) return;

    const colors = ['green', 'red', 'blue', 'yellow', 'purple', 'orange', 'gray'];
    
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