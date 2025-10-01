
/**
 * ImportExportManager - Gestionnaire d'import/export unifié
 * Gère l'export et l'import des lieux et régions en format JSON unifié
 */

class ImportExportManager {
    constructor(dataManager, scheduleAutoSyncCallback = null) {
        this.dataManager = dataManager;
        this.scheduleAutoSync = scheduleAutoSyncCallback;
        
        // Références aux éléments DOM
        this.exportBtn = null;
        this.importBtn = null;
        this.importFileInput = null;
        this.importModal = null;
        
        console.log("📤 ImportExportManager initialized");
    }

    /**
     * Initialise les event listeners pour les boutons d'import/export
     */
    init() {
        this.exportBtn = document.getElementById('export-locations');
        this.importBtn = document.getElementById('import-locations');
        this.importFileInput = document.getElementById('import-file-input');
        this.importModal = document.getElementById('import-modal');

        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.exportUnifiedData());
        }

        if (this.importBtn) {
            this.importBtn.addEventListener('click', () => this.triggerImport());
        }

        if (this.importFileInput) {
            this.importFileInput.addEventListener('change', (event) => this.importUnifiedData(event));
        }

        // Setup de la modal d'import si elle existe
        this.setupImportModal();

        console.log("📤 ImportExportManager event listeners configured");
    }

    /**
     * Exporte les données unifiées (lieux + régions) en format JSON
     */
    exportUnifiedData() {
        try {
            console.log("📤 Starting unified export...");

            const allLocations = [];

            // Ajouter les lieux normaux
            if (this.dataManager.locationsData?.locations) {
                this.dataManager.locationsData.locations.forEach(location => {
                    const exportLocation = {
                        ...location,
                        type: location.type || "custom"
                    };

                    // Assurer la structure des coordonnées pour les lieux normaux
                    if (location.coordinates && typeof location.coordinates.x === 'number' && typeof location.coordinates.y === 'number') {
                        exportLocation.coordinates = {
                            x: location.coordinates.x,
                            y: location.coordinates.y
                        };
                    }

                    allLocations.push(exportLocation);
                });
            }

            // Ajouter les régions comme lieux avec type "region"
            if (this.dataManager.regionsData?.regions) {
                this.dataManager.regionsData.regions.forEach(region => {
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
                            points: region.coordinates || region.points || []
                        }
                    };

                    // Ajouter les champs optionnels s'ils existent
                    if (region.Rumeur) regionAsLocation.Rumeur = region.Rumeur;
                    if (region.Tradition_Ancienne) regionAsLocation.Tradition_Ancienne = region.Tradition_Ancienne;
                    if (region.images) regionAsLocation.images = region.images;

                    allLocations.push(regionAsLocation);
                });
            }

            // Créer la structure finale
            const unifiedData = {
                locations: allLocations
            };

            // Télécharger le fichier
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(unifiedData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "MiddleEarthData.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            document.body.removeChild(downloadAnchorNode);

            console.log(`✅ Export unifié terminé - ${allLocations.length} éléments sauvegardés (lieux et régions)`);
            
            // Notification utilisateur
            this.showNotification("Export réussi", `${allLocations.length} éléments exportés vers MiddleEarthData.json`, "success");

        } catch (error) {
            console.error("❌ Erreur lors de l'export unifié:", error);
            this.showNotification("Erreur d'export", error.message, "error");
        }
    }

    /**
     * Déclenche la sélection de fichier pour l'import
     */
    triggerImport() {
        if (this.importFileInput) {
            this.importFileInput.click();
        }
    }

    /**
     * Importe des données depuis un fichier JSON
     */
    importUnifiedData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Valider et traiter les données
                const processedData = this.validateAndProcessImportData(importedData);
                
                if (processedData.locations.length === 0 && processedData.regions.length === 0) {
                    this.showNotification("Import échoué", "Aucune donnée valide trouvée dans le fichier", "error");
                    return;
                }

                // Afficher la modal de confirmation
                this.showImportModal(processedData);

            } catch (err) {
                console.error("❌ Erreur lors de l'import:", err);
                this.showNotification("Erreur d'import", "Fichier JSON invalide: " + err.message, "error");
            }

            // Nettoyer l'input
            event.target.value = '';
        };

        reader.readAsText(file);
    }

    /**
     * Valide et traite les données importées pour supporter différents formats
     */
    validateAndProcessImportData(data) {
        console.log("🔍 Validation des données importées...");

        const result = {
            locations: [],
            regions: []
        };

        let locationsArray = [];

        // Détecter le format des données
        if (data.locations && Array.isArray(data.locations)) {
            // Format unifié moderne
            locationsArray = data.locations;
        } else if (data.regions && Array.isArray(data.regions)) {
            // Format ancien avec seulement des régions
            locationsArray = data.regions.map(region => ({
                ...region,
                type: "region",
                coordinates: { points: region.points || region.coordinates || [] }
            }));
        } else if (Array.isArray(data)) {
            // Format array direct
            locationsArray = data;
        } else {
            throw new Error("Format de fichier non reconnu");
        }

        // Traiter chaque élément
        locationsArray.forEach(item => {
            try {
                const isRegion = item.type === "region" || 
                               (item.coordinates && item.coordinates.points && Array.isArray(item.coordinates.points)) ||
                               (item.points && Array.isArray(item.points));

                if (isRegion) {
                    // Traiter comme région
                    const region = {
                        id: item.id || `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        name: item.name || "Région sans nom",
                        description: item.description || "",
                        imageUrl: item.imageUrl || "",
                        color: item.color || "gray",
                        known: item.known !== undefined ? item.known : true,
                        visited: item.visited !== undefined ? item.visited : false,
                        coordinates: item.coordinates?.points || item.points || []
                    };

                    // Ajouter les champs optionnels
                    if (item.Rumeur) region.Rumeur = item.Rumeur;
                    if (item.Tradition_Ancienne) region.Tradition_Ancienne = item.Tradition_Ancienne;
                    if (item.images) region.images = item.images;

                    result.regions.push(region);
                } else {
                    // Traiter comme lieu normal
                    const location = {
                        id: item.id || `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        name: item.name || "Lieu sans nom",
                        description: item.description || "",
                        imageUrl: item.imageUrl || "",
                        color: item.color || "blue",
                        known: item.known !== undefined ? item.known : true,
                        visited: item.visited !== undefined ? item.visited : false,
                        type: item.type || "custom"
                    };

                    // Coordonnées pour les lieux normaux
                    if (item.coordinates && typeof item.coordinates.x === 'number' && typeof item.coordinates.y === 'number') {
                        location.coordinates = {
                            x: item.coordinates.x,
                            y: item.coordinates.y
                        };
                    } else {
                        console.warn(`⚠️ Lieu ${item.name} sans coordonnées valides, ignoré`);
                        return;
                    }

                    // Ajouter les champs optionnels
                    if (item.Rumeur) location.Rumeur = item.Rumeur;
                    if (item.Tradition_Ancienne) location.Tradition_Ancienne = item.Tradition_Ancienne;
                    if (item.images) location.images = item.images;

                    result.locations.push(location);
                }
            } catch (itemError) {
                console.warn(`⚠️ Erreur lors du traitement de l'élément ${item.name}:`, itemError);
            }
        });

        console.log(`✅ Validation terminée: ${result.locations.length} lieux, ${result.regions.length} régions`);
        return result;
    }

    /**
     * Affiche la modal de confirmation d'import
     */
    showImportModal(processedData) {
        // Créer la modal si elle n'existe pas
        if (!this.importModal) {
            this.createImportModal();
        }

        const modal = this.importModal;
        const summaryEl = modal.querySelector('#import-summary');
        const replaceBtn = modal.querySelector('#import-replace');
        const mergeBtn = modal.querySelector('#import-merge');
        const cancelBtn = modal.querySelector('#import-cancel');

        // Mettre à jour le résumé
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div class="space-y-2">
                    <p><strong>Données à importer :</strong></p>
                    <ul class="list-disc list-inside space-y-1">
                        <li>${processedData.locations.length} lieu(x)</li>
                        <li>${processedData.regions.length} région(s)</li>
                    </ul>
                    <p class="text-sm text-gray-600 mt-4">
                        Choisissez comment traiter les données existantes :
                    </p>
                </div>
            `;
        }

        // Configurer les boutons
        if (replaceBtn) {
            replaceBtn.onclick = () => {
                this.processImport(processedData, 'replace');
                this.hideImportModal();
            };
        }

        if (mergeBtn) {
            mergeBtn.onclick = () => {
                this.processImport(processedData, 'merge');
                this.hideImportModal();
            };
        }

        if (cancelBtn) {
            cancelBtn.onclick = () => {
                this.hideImportModal();
            };
        }

        // Afficher la modal
        modal.classList.remove('hidden');
    }

    /**
     * Traite l'import selon le mode choisi
     */
    processImport(processedData, mode) {
        try {
            console.log(`📥 Traitement import en mode: ${mode}`);

            if (mode === 'replace') {
                // Remplacer toutes les données
                if (processedData.locations.length > 0) {
                    this.dataManager.locationsData = { locations: processedData.locations };
                } else {
                    // Si pas de lieux dans l'import, garder une structure vide
                    this.dataManager.locationsData = { locations: [] };
                }
                
                if (processedData.regions.length > 0) {
                    this.dataManager.regionsData = { regions: processedData.regions };
                } else {
                    // Si pas de régions dans l'import, garder une structure vide  
                    this.dataManager.regionsData = { regions: [] };
                }
                
                // Mettre à jour les références globales APRÈS avoir mis à jour le dataManager
                window.locationsData = this.dataManager.locationsData;
                window.regionsData = this.dataManager.regionsData;
            } else if (mode === 'merge') {
                // Fusionner les données
                this.mergeLocations(processedData.locations);
                this.mergeRegions(processedData.regions);
            }

            // Sauvegarder
            this.dataManager.saveLocationsToLocal();
            this.dataManager.saveRegionsToLocal();

            // Forcer la mise à jour des références globales avant le re-render
            window.locationsData = this.dataManager.locationsData;
            window.regionsData = this.dataManager.regionsData;

            // Re-render avec un léger délai pour s'assurer que les données sont bien synchronisées
            setTimeout(() => {
                if (typeof window.renderLocations === 'function') {
                    console.log(`🎯 Re-rendering ${this.dataManager.locationsData?.locations?.length || 0} locations after import`);
                    window.renderLocations();
                }
                if (typeof window.renderRegions === 'function') {
                    console.log(`🌍 Re-rendering ${this.dataManager.regionsData?.regions?.length || 0} regions after import`);
                    window.renderRegions();
                }
            }, 100);

            // Auto-sync si disponible
            if (this.scheduleAutoSync && typeof this.scheduleAutoSync === 'function') {
                this.scheduleAutoSync();
            }

            const totalImported = processedData.locations.length + processedData.regions.length;
            this.showNotification("Import réussi", `${totalImported} éléments importés avec succès (mode: ${mode})`, "success");
            
            console.log(`✅ Import terminé: ${processedData.locations.length} lieux, ${processedData.regions.length} régions`);

        } catch (error) {
            console.error("❌ Erreur lors du traitement de l'import:", error);
            this.showNotification("Erreur d'import", error.message, "error");
        }
    }

    /**
     * Fusionne les lieux importés avec les existants
     */
    mergeLocations(importedLocations) {
        if (!importedLocations || importedLocations.length === 0) return;

        if (!this.dataManager.locationsData || !this.dataManager.locationsData.locations) {
            this.dataManager.locationsData = { locations: [] };
        }

        importedLocations.forEach(importedLocation => {
            const existingLocation = this.dataManager.locationsData.locations.find(
                loc => loc.name === importedLocation.name
            );

            if (existingLocation) {
                // Mettre à jour le lieu existant
                Object.assign(existingLocation, importedLocation);
                console.log(`🔄 Lieu mis à jour: ${importedLocation.name}`);
            } else {
                // Ajouter le nouveau lieu avec un ID unique
                this.ensureUniqueId(importedLocation, this.dataManager.locationsData.locations);
                this.dataManager.locationsData.locations.push(importedLocation);
                console.log(`➕ Nouveau lieu ajouté: ${importedLocation.name}`);
            }
        });

        // S'assurer que les références globales sont bien mises à jour
        this.dataManager.locationsData = { ...this.dataManager.locationsData };
        window.locationsData = this.dataManager.locationsData;
    }

    /**
     * Fusionne les régions importées avec les existantes
     */
    mergeRegions(importedRegions) {
        if (!importedRegions || importedRegions.length === 0) return;

        if (!this.dataManager.regionsData || !this.dataManager.regionsData.regions) {
            this.dataManager.regionsData = { regions: [] };
        }

        importedRegions.forEach(importedRegion => {
            const existingRegion = this.dataManager.regionsData.regions.find(
                reg => reg.name === importedRegion.name
            );

            if (existingRegion) {
                // Mettre à jour la région existante
                Object.assign(existingRegion, importedRegion);
                console.log(`🔄 Région mise à jour: ${importedRegion.name}`);
            } else {
                // Ajouter la nouvelle région avec un ID unique
                this.ensureUniqueId(importedRegion, this.dataManager.regionsData.regions);
                this.dataManager.regionsData.regions.push(importedRegion);
                console.log(`➕ Nouvelle région ajoutée: ${importedRegion.name}`);
            }
        });

        // S'assurer que les références globales sont bien mises à jour
        this.dataManager.regionsData = { ...this.dataManager.regionsData };
        window.regionsData = this.dataManager.regionsData;
    }

    /**
     * Assure qu'un élément a un ID unique
     */
    ensureUniqueId(item, existingItems) {
        const originalId = item.id;
        let newId = originalId;
        let counter = 1;

        while (existingItems.find(existing => existing.id === newId)) {
            newId = `${originalId}_${counter}`;
            counter++;
        }

        if (newId !== originalId) {
            console.log(`🔧 ID modifié pour éviter conflit: ${originalId} → ${newId}`);
            item.id = newId;
        }
    }

    /**
     * Crée la modal d'import si elle n'existe pas
     */
    createImportModal() {
        const modalHTML = `
            <div id="import-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 class="text-lg font-semibold mb-4">Importer des données</h3>
                    <div id="import-summary" class="mb-6"></div>
                    <div class="flex space-x-3">
                        <button id="import-replace" class="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                            Remplacer tout
                        </button>
                        <button id="import-merge" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            Fusionner
                        </button>
                        <button id="import-cancel" class="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.importModal = document.getElementById('import-modal');

        // Fermer sur clic extérieur
        this.importModal.addEventListener('click', (e) => {
            if (e.target === this.importModal) {
                this.hideImportModal();
            }
        });
    }

    /**
     * Masque la modal d'import
     */
    hideImportModal() {
        if (this.importModal) {
            this.importModal.classList.add('hidden');
        }
    }

    /**
     * Configure la modal d'import existante
     */
    setupImportModal() {
        if (this.importModal) {
            // Setup des event listeners si la modal existe déjà
            const replaceBtn = this.importModal.querySelector('#import-replace');
            const mergeBtn = this.importModal.querySelector('#import-merge');
            const cancelBtn = this.importModal.querySelector('#import-cancel');

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.hideImportModal());
            }

            // Fermer sur clic extérieur
            this.importModal.addEventListener('click', (e) => {
                if (e.target === this.importModal) {
                    this.hideImportModal();
                }
            });
        }
    }

    /**
     * Affiche une notification à l'utilisateur
     */
    showNotification(title, message, type = 'info') {
        // Créer une notification simple
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        
        notification.innerHTML = `
            <div class="font-semibold">${title}</div>
            <div class="text-sm">${message}</div>
        `;

        document.body.appendChild(notification);

        // Supprimer après 5 secondes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

export default ImportExportManager;
