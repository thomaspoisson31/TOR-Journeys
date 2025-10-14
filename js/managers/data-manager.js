import { LOCATIONS_URL, getDefaultLocations, getDefaultRegions } from '../utils/constants.js';

class DataManager {
    constructor() {
        this.locationsData = null;
        this.regionsData = null;
    }

    async loadInitialLocations() {
        console.log("📍 loadInitialLocations: Initialisation avec structure vide");
        // NE PLUS charger depuis localStorage ni URL
        // L'AuthManager chargera depuis le cloud après authentification
        this.locationsData = { locations: [] };
        window.locationsData = this.locationsData;
        console.log("✅ Structure de données initialisée (vide, en attente du cloud)");
    }

    saveLocationsToLocal() {
        if (this.locationsData) {
            localStorage.setItem('middleEarthLocations', JSON.stringify(this.locationsData));
            window.locationsData = this.locationsData;
        }
        if (typeof scheduleAutoSync === 'function') {
            scheduleAutoSync();
        }
    }

    saveRegionsToLocal() {
        if (this.regionsData) {
            localStorage.setItem('middleEarthRegions', JSON.JSON.stringify(this.regionsData));
            window.regionsData = this.regionsData;
        }
        if (typeof scheduleAutoSync === 'function') {
            scheduleAutoSync();
        }
    }

    loadRegionsFromLocal() {
        console.log("🌍 loadRegionsFromLocal: Initialisation avec structure vide");
        // NE PLUS charger depuis localStorage ni données par défaut
        // L'AuthManager chargera depuis le cloud après authentification
        this.regionsData = { regions: [] };
        window.regionsData = this.regionsData;
        console.log("✅ Structure de régions initialisée (vide, en attente du cloud)");
    }

    // Les méthodes d'export/import ont été déplacées vers ImportExportManager
}

export default DataManager;