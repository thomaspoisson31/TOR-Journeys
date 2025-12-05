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
        // IMPORTANT: Toujours synchroniser depuis window.locationsData qui est la source de vérité
        this.locationsData = window.locationsData || this.locationsData;
        
        if (this.locationsData) {
            // FORCER une copie profonde pour s'assurer que toutes les modifications sont capturées
            const dataToSave = JSON.parse(JSON.stringify(this.locationsData));
            
            // Sauvegarder dans localStorage
            localStorage.setItem('middleEarthLocations', JSON.stringify(dataToSave));

            // IMPORTANT: Synchroniser avec window.locationsData pour cohérence globale
            window.locationsData = dataToSave;
            this.locationsData = dataToSave;

            console.log('💾 [DataManager]', dataToSave.locations?.length || 0, 'lieux sauvegardés dans localStorage');
            console.log('✅ [DataManager] window.locationsData synchronisé:', window.locationsData.locations?.length || 0, 'lieux');
            
            // Log de vérification des coordonnées
            const lastLocation = dataToSave.locations[dataToSave.locations.length - 1];
            if (lastLocation) {
                console.log('🔍 [DataManager] Dernier lieu sauvegardé:', lastLocation.name, 'coords:', lastLocation.coordinates);
            }
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
        // IMPORTANT: Toujours synchroniser depuis window.regionsData qui est la source de vérité
        this.regionsData = window.regionsData || this.regionsData;
        
        if (this.regionsData) {
            // FORCER une copie profonde pour s'assurer que toutes les modifications sont capturées
            const dataToSave = JSON.parse(JSON.stringify(this.regionsData));
            
            // Sauvegarder dans localStorage
            localStorage.setItem('middleEarthRegions', JSON.stringify(dataToSave));

            // IMPORTANT: Synchroniser avec window.regionsData pour cohérence globale
            window.regionsData = dataToSave;
            this.regionsData = dataToSave;

            console.log('💾 [DataManager]', dataToSave.regions?.length || 0, 'régions sauvegardées dans localStorage');
            console.log('✅ [DataManager] window.regionsData synchronisé:', window.regionsData.regions?.length || 0, 'régions');
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

    // Méthode pour synchroniser les données depuis window (appelée après chargement cloud)
    syncFromGlobalData() {
        if (window.locationsData) {
            this.locationsData = window.locationsData;
            console.log('🔄 [DataManager] locationsData synchronisé depuis window:', this.locationsData.locations?.length || 0, 'lieux');
        }
        if (window.regionsData) {
            this.regionsData = window.regionsData;
            console.log('🔄 [DataManager] regionsData synchronisé depuis window:', this.regionsData.regions?.length || 0, 'régions');
        }
    }

    // Les méthodes d'export/import ont été déplacées vers ImportExportManager
}

export default DataManager;