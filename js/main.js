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

    console.log("✅ Map initialized successfully");
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