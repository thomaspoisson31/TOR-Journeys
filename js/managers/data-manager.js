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
            // Sauvegarder dans localStorage
            localStorage.setItem('middleEarthLocations', JSON.stringify(this.locationsData));

            // IMPORTANT: Synchroniser avec window.locationsData pour cohérence globale
            window.locationsData = this.locationsData;

            console.log('💾 [DataManager]', this.locationsData.locations?.length || 0, 'lieux sauvegardés dans localStorage');
            console.log('✅ [DataManager] window.locationsData synchronisé:', window.locationsData.locations?.length || 0, 'lieux');
        }

        // Marquer comme non sauvegardé et déclencher la synchronisation
        if (window.authManager && window.authManager.isAuthenticated) {
            window.authManager.markAsUnsaved();
        }
        if (typeof scheduleAutoSync === 'function') {
            scheduleAutoSync();
        }
    }

    saveRegionsToLocal() {
        if (this.regionsData) {
            // Sauvegarder dans localStorage
            localStorage.setItem('middleEarthRegions', JSON.stringify(this.regionsData));

            // IMPORTANT: Synchroniser avec window.regionsData pour cohérence globale
            window.regionsData = this.regionsData;

            console.log('💾 [DataManager]', this.regionsData.regions?.length || 0, 'régions sauvegardées dans localStorage');
            console.log('✅ [DataManager] window.regionsData synchronisé:', this.regionsData.regions?.length || 0, 'régions');
        }

        // Marquer comme non sauvegardé et déclencher la synchronisation
        if (window.authManager && window.authManager.isAuthenticated) {
            window.authManager.markAsUnsaved();
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