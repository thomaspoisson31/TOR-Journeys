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
    resetView(); // Vue initiale optimale

    console.log("✅ Map initialized successfully");
}

// --- Variables d'état pour la navigation ---
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;
let minScale = 0.1;
let maxScale = 4.0;

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
    viewport.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Clic gauche uniquement
            isPanning = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            viewport.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });

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

    // Fermer l'info-box en cliquant ailleurs
    viewport.addEventListener('click', (e) => {
        const infoBox = document.getElementById('info-box');
        if (infoBox && infoBox.style.display === 'block' && !infoBox.contains(e.target)) {
            // Ne fermer que si on ne clique pas sur un marqueur
            if (!e.target.classList.contains('location-marker')) {
                hideInfoBox();
            }
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

// --- Fonctions de base ---
// Les fonctions de sauvegarde sont maintenant gérées par DataManager

// --- Démarrage de l'application ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log("📋 Simplified main.js loaded - waiting for DOM ready");