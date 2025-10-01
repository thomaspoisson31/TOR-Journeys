
import { LOCATIONS_URL, getDefaultLocations, getDefaultRegions } from '../utils/constants.js';

class DataManager {
    constructor() {
        this.locationsData = null;
        this.regionsData = null;
    }

    async loadInitialLocations() {
        console.log("Attempting to load locations...");
        const savedData = localStorage.getItem('middleEarthLocations');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData && Array.isArray(parsedData.locations)) {
                   this.locationsData = parsedData;
                   window.locationsData = parsedData; // Rendre global
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
                this.locationsData = data;
                window.locationsData = data; // Rendre global
                console.log("✅ Success: Loaded default locations from URL.");
                this.saveLocationsToLocal();
            } else {
                throw new Error("Invalid JSON structure from URL");
            }
        } catch (error) {
            console.error("❌ Error fetching locations from URL, using empty list as fallback.", error);
            if (error.name === 'AbortError') {
                console.error("Request timed out after 10 seconds");
            }
            this.locationsData = getDefaultLocations();
            window.locationsData = this.locationsData;
            this.saveLocationsToLocal();
        }
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
            localStorage.setItem('middleEarthRegions', JSON.stringify(this.regionsData));
            window.regionsData = this.regionsData;
        }
        if (typeof scheduleAutoSync === 'function') {
            scheduleAutoSync();
        }
    }

    loadRegionsFromLocal() {
        const saved = localStorage.getItem('middleEarthRegions');
        if (saved) {
            try {
                this.regionsData = JSON.parse(saved);
                window.regionsData = this.regionsData;
            } catch (e) {
                console.error('Failed to load regions from localStorage:', e);
                this.regionsData = getDefaultRegions();
                window.regionsData = this.regionsData;
            }
        } else {
            this.regionsData = getDefaultRegions();
            window.regionsData = this.regionsData;
        }
    }

    // Les méthodes d'export/import ont été déplacées vers ImportExportManager
}

export default DataManager;
