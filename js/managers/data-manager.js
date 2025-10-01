
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

    exportUnifiedData() {
        const allLocations = [];

        if (this.locationsData && this.locationsData.locations) {
            this.locationsData.locations.forEach(location => {
                allLocations.push({
                    ...location,
                    type: location.type || "custom"
                });
            });
        }

        if (this.regionsData && this.regionsData.regions) {
            this.regionsData.regions.forEach(region => {
                const regionAsLocation = {
                    id: region.id,
                    name: region.name,
                    description: region.description || "",
                    imageUrl: region.imageUrl || "",
                    color: region.color,
                    known: region.known !== undefined ? region.known : true,
                    visited: region.visited !== undefined ? region.visited : false,
                    type: "region",
                    coordinates: {
                        points: region.points || []
                    }
                };

                if (region.Rumeur) regionAsLocation.Rumeur = region.Rumeur;
                if (region.Tradition_Ancienne) regionAsLocation.Tradition_Ancienne = region.Tradition_Ancienne;

                allLocations.push(regionAsLocation);
            });
        }

        const unifiedData = { locations: allLocations };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(unifiedData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "Landmark.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        document.body.removeChild(downloadAnchorNode);
        console.log(`✅ Export unifié terminé - ${allLocations.length} éléments sauvegardés (lieux et régions)`);
    }

    importUnifiedData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                let locationsArray = [];

                if (importedData.locations && Array.isArray(importedData.locations)) {
                    locationsArray = importedData.locations;
                } else if (importedData.regions && Array.isArray(importedData.regions)) {
                    locationsArray = importedData.regions.map(region => ({
                        id: region.id,
                        name: region.name,
                        description: region.description || "",
                        imageUrl: region.imageUrl || "",
                        color: region.color,
                        known: region.known !== undefined ? region.known : true,
                        visited: region.visited !== undefined ? region.visited : false,
                        type: "region",
                        coordinates: {
                            points: region.points || []
                        },
                        ...(region.Rumeur && { Rumeur: region.Rumeur }),
                        ...(region.Tradition_Ancienne && { Tradition_Ancienne: region.Tradition_Ancienne })
                    }));
                } else if (Array.isArray(importedData)) {
                    locationsArray = importedData;
                } else {
                    alert("Fichier JSON invalide.");
                    return;
                }

                const normalLocations = [];
                const regionLocations = [];

                locationsArray.forEach(item => {
                    const isRegion = item.type === "region" ||
                                    (item.coordinates && item.coordinates.points && Array.isArray(item.coordinates.points));

                    if (isRegion) {
                        const region = {
                            id: item.id,
                            name: item.name,
                            description: item.description || "",
                            imageUrl: item.imageUrl || "",
                            color: item.color,
                            known: item.known !== undefined ? item.known : true,
                            visited: item.visited !== undefined ? item.visited : false,
                            points: item.coordinates?.points || []
                        };

                        if (item.Rumeur) region.Rumeur = item.Rumeur;
                        if (item.Tradition_Ancienne) region.Tradition_Ancienne = item.Tradition_Ancienne;

                        regionLocations.push(region);
                    } else {
                        const location = {
                            ...item,
                            type: item.type || "custom"
                        };

                        if (item.coordinates && typeof item.coordinates.x === 'number' && typeof item.coordinates.y === 'number') {
                            location.coordinates = {
                                x: item.coordinates.x,
                                y: item.coordinates.y
                            };
                        }

                        normalLocations.push(location);
                    }
                });

                const shouldReplace = confirm(`Le fichier contient ${locationsArray.length} éléments. Voulez-vous remplacer toutes les données existantes ?`);

                if (shouldReplace) {
                    if (normalLocations.length > 0) {
                        this.locationsData = { locations: normalLocations };
                        window.locationsData = this.locationsData;
                    }
                    if (regionLocations.length > 0) {
                        this.regionsData = { regions: regionLocations };
                        window.regionsData = this.regionsData;
                    }
                } else {
                    // Logique de fusion
                    if (normalLocations.length > 0) {
                        normalLocations.forEach(importedLocation => {
                            const existingLocation = this.locationsData.locations.find(
                                loc => loc.name === importedLocation.name
                            );

                            if (existingLocation) {
                                Object.assign(existingLocation, importedLocation);
                            } else {
                                importedLocation.id = Date.now() + Math.floor(Math.random() * 1000);
                                while (this.locationsData.locations.find(loc => loc.id === importedLocation.id)) {
                                    importedLocation.id = Date.now() + Math.floor(Math.random() * 1000);
                                }
                                this.locationsData.locations.push(importedLocation);
                            }
                        });
                    }

                    if (regionLocations.length > 0) {
                        regionLocations.forEach(importedRegion => {
                            const existingRegion = this.regionsData.regions.find(
                                reg => reg.name === importedRegion.name
                            );

                            if (existingRegion) {
                                Object.assign(existingRegion, importedRegion);
                            } else {
                                importedRegion.id = Date.now() + Math.floor(Math.random() * 1000);
                                while (this.regionsData.regions.find(reg => reg.id === importedRegion.id)) {
                                    importedRegion.id = Date.now() + Math.floor(Math.random() * 1000);
                                }
                                this.regionsData.regions.push(importedRegion);
                            }
                        });
                    }
                }

                if (typeof renderLocations === 'function') renderLocations();
                if (typeof renderRegions === 'function') renderRegions();
                
                this.saveLocationsToLocal();
                this.saveRegionsToLocal();

                if (typeof scheduleAutoSync === 'function') {
                    scheduleAutoSync();
                }

                alert("Import terminé avec succès !");
                console.log(`✅ Import unifié terminé`);

            } catch (err) {
                alert("Erreur lors de la lecture du fichier JSON : " + err.message);
                console.error("Erreur d'import unifié:", err);
            }

            event.target.value = '';
        };

        reader.readAsText(file);
    }
}

export default DataManager;
