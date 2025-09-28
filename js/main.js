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

console.log("✅ Constants loaded successfully");

// --- Variables globales essentielles ---
let locationsData;
let regionsData = getDefaultRegions();
let MAP_WIDTH = 0, MAP_HEIGHT = 0;
let scale = 1, panX = 0, panY = 0;

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
        // Test de chargement des données
        console.log("📍 Loading initial locations...");
        await loadInitialLocations();
        console.log("✅ Locations loaded successfully");

        // Test d'initialisation de la carte
        if (mapImage) {
            mapImage.onload = () => {
                console.log("🗺️ Map image loaded successfully");
                initializeMap();
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

// --- Chargement des locations (simplifié) ---
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(LOCATIONS_URL, {
            signal: controller.signal,
            cache: 'no-cache'
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
        locationsData = getDefaultLocations();
        saveLocationsToLocal();
    }
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
function saveLocationsToLocal() {
    localStorage.setItem('middleEarthLocations', JSON.stringify(locationsData));
}

// --- Démarrage de l'application ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log("📋 Simplified main.js loaded - waiting for DOM ready");