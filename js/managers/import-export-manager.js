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
            this.importFileInput.addEventListener('change', (event) => this.handleImportFile(event));
        }

        // Setup de la modal d'import si elle existe
        this.setupImportModal();

        console.log("📤 ImportExportManager event listeners configured");
    }

    /**
     * Exporte les données unifiées (lieux + régions) en format JSON
     * Filtre par carte active uniquement
     */
    exportUnifiedData() {
        try {
            console.log("📤 Starting unified export...");

            const activeMapUrl = window.settingsManager?.activeMapUrl;
            const activeMapName = window.settingsManager?.activeMapName || 'Carte';
            
            if (!activeMapUrl) {
                this.showNotification("Erreur d'export", "Aucune carte active", "error");
                return;
            }

            console.log(`📤 [exportUnifiedData] Carte active: ${activeMapUrl}`);
            
            // IMPORTANT: Utiliser window.locationsData qui est la source de vérité après chargement cloud
            const locationsData = window.locationsData || this.dataManager.locationsData;
            const regionsData = window.regionsData || this.dataManager.regionsData;
            
            console.log(`📤 [exportUnifiedData] Total lieux disponibles: ${locationsData?.locations?.length || 0}`);

            const allLocations = [];

            // Ajouter les lieux normaux (filtrés par carte active)
            if (locationsData?.locations) {
                locationsData.locations.forEach(location => {
                    // Filtrer par carte active - comparer en tant que strings
                    if (location.mapId && String(location.mapId) !== String(activeMapUrl)) {
                        console.log(`⏭️ [exportUnifiedData] Lieu "${location.name}" ignoré (mapId: ${location.mapId})`);
                        return; // Ignorer ce lieu
                    }
                    
                    console.log(`✅ [exportUnifiedData] Lieu "${location.name}" ajouté (mapId: ${location.mapId})`);

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

                    // Exporter les rumeurs en tant que tableau
                    const rumeurs = location.Rumeurs || (location.Rumeur ? [location.Rumeur] : []);
                    const rumeursValides = rumeurs.filter(r => r && r !== "A définir");
                    if (rumeursValides.length > 0) {
                        exportLocation.Rumeurs = rumeursValides;
                    }

                    // Ajouter la tradition ancienne
                    if (location.Tradition_Ancienne && location.Tradition_Ancienne !== "A définir") {
                        exportLocation.Tradition_Ancienne = location.Tradition_Ancienne;
                    }

                    // Ajouter les personnages associés
                    if (location.associatedCharacters && location.associatedCharacters.length > 0) {
                        exportLocation.associatedCharacters = location.associatedCharacters;
                    }

                    allLocations.push(exportLocation);
                });
            }

            // Ajouter les régions comme lieux avec type "region" (filtrées par carte active)
            if (regionsData?.regions) {
                regionsData.regions.forEach(region => {
                    // Filtrer par carte active - comparer en tant que strings
                    if (region.mapId && String(region.mapId) !== String(activeMapUrl)) {
                        console.log(`⏭️ [exportUnifiedData] Région "${region.name}" ignorée (mapId: ${region.mapId})`);
                        return; // Ignorer cette région
                    }
                    
                    console.log(`✅ [exportUnifiedData] Région "${region.name}" ajoutée (mapId: ${region.mapId})`);

                    // Extraire les points depuis la structure existante
                    let points = [];
                    if (region.points) {
                        points = region.points;
                    } else if (region.coordinates?.points) {
                        points = region.coordinates.points;
                    } else if (Array.isArray(region.coordinates)) {
                        points = region.coordinates;
                    }

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
                            points: points
                        }
                    };

                    // Ajouter les champs optionnels s'ils existent
                    if (region.Rumeur) regionAsLocation.Rumeur = region.Rumeur;
                    if (region.Tradition_Ancienne) regionAsLocation.Tradition_Ancienne = region.Tradition_Ancienne;
                    if (region.images) regionAsLocation.images = region.images;
                    if (region.associatedCharacters && region.associatedCharacters.length > 0) {
                        regionAsLocation.associatedCharacters = region.associatedCharacters;
                    }

                    allLocations.push(regionAsLocation);
                });
            }

            console.log(`📤 [exportUnifiedData] Total éléments à exporter: ${allLocations.length}`);

            // Créer la structure finale
            const unifiedData = {
                locations: allLocations
            };

            // Nom de fichier basé sur la carte active
            const sanitizedMapName = activeMapName.replace(/[^a-z0-9]/gi, '_');
            const fileName = `${sanitizedMapName}_Lieux_Regions.json`;

            console.log(`📤 [exportUnifiedData] Nom du fichier: ${fileName}`);
            console.log(`📤 [exportUnifiedData] Structure finale:`, JSON.stringify(unifiedData).substring(0, 200) + "...");

            // Télécharger le fichier
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(unifiedData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", fileName);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            document.body.removeChild(downloadAnchorNode);

            console.log(`✅ Export unifié terminé - ${allLocations.length} éléments sauvegardés (lieux et régions) depuis "${activeMapName}"`);

            // Notification utilisateur
            this.showNotification("Export réussi", `${allLocations.length} éléments de "${activeMapName}" exportés`, "success");

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
    handleImportFile(event) {
        const file = event.target.files[0];
        console.log("📥 [IMPORT DEBUG] Fichier sélectionné:", file ? file.name : "aucun");

        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const rawText = e.target.result;
                console.log("📥 [IMPORT DEBUG] Contenu brut du fichier (premiers 500 caractères):", rawText.substring(0, 500));

                const importedData = JSON.parse(rawText);
                console.log("📥 [IMPORT DEBUG] JSON parsé avec succès:", importedData);
                console.log("📥 [IMPORT DEBUG] Structure du JSON:", {
                    isArray: Array.isArray(importedData),
                    hasLocations: !!importedData.locations,
                    hasRegions: !!importedData.regions,
                    keys: Object.keys(importedData)
                });

                // Valider et traiter les données
                const processedData = this.validateAndProcessImportData(importedData);
                console.log("📥 [IMPORT DEBUG] Données après validation:", {
                    locationsCount: processedData.locations.length,
                    regionsCount: processedData.regions.length
                });

                // Post-traitement: chercher les rumeurs multiples dans le texte brut
                if (processedData.locations.length > 0) {
                    this.enhanceRumeursFromRawText(rawText, processedData.locations);
                }

                if (processedData.locations.length === 0 && processedData.regions.length === 0) {
                    console.error("📥 [IMPORT DEBUG] Aucune donnée valide trouvée");
                    this.showNotification("Import échoué", "Aucune donnée valide trouvée dans le fichier", "error");
                    return;
                }

                // Afficher la modal de confirmation
                console.log("📥 [IMPORT DEBUG] Affichage de la modal de confirmation");
                this.showImportModal(processedData);

            } catch (err) {
                console.error("❌ [IMPORT DEBUG] Erreur complète:", err);
                console.error("❌ [IMPORT DEBUG] Stack trace:", err.stack);
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
        console.log("🔍 [VALIDATE DEBUG] Début validation des données importées");
        console.log("🔍 [VALIDATE DEBUG] Type de data:", typeof data);
        console.log("🔍 [VALIDATE DEBUG] Est un tableau?", Array.isArray(data));
        console.log("🔍 [VALIDATE DEBUG] Contenu complet data:", JSON.stringify(data, null, 2).substring(0, 1000));

        const result = {
            locations: [],
            regions: []
        };

        // Si c'est un tableau direct (ancien format)
        if (Array.isArray(data)) {
            console.log("🔍 [VALIDATE DEBUG] Format: tableau direct avec", data.length, "éléments");
            data.forEach((item, index) => {
                console.log(`🔍 [VALIDATE DEBUG] Traitement item ${index}:`, item.name || 'sans nom');
                this.processItem(item, result);
            });
        }
        // Si c'est un objet avec une propriété locations
        else if (data.locations && Array.isArray(data.locations)) {
            console.log("🔍 [VALIDATE DEBUG] Format: objet avec propriété locations, count:", data.locations.length);
            data.locations.forEach((item, index) => {
                console.log(`🔍 [VALIDATE DEBUG] Traitement location ${index}:`, item.name || 'sans nom');
                this.processItem(item, result);
            });
        }
        // Si c'est un objet avec une propriété regions
        else if (data.regions && Array.isArray(data.regions)) {
            console.log("🔍 [VALIDATE DEBUG] Format: objet avec propriété regions, count:", data.regions.length);
            data.regions.forEach((item, index) => {
                console.log(`🔍 [VALIDATE DEBUG] Traitement region ${index}:`, item.name || 'sans nom');
                this.processItem(item, result);
            });
        } else {
            console.error("🔍 [VALIDATE DEBUG] Format non reconnu! Structure:", {
                isObject: typeof data === 'object',
                keys: Object.keys(data || {}),
                hasLocations: !!data?.locations,
                hasRegions: !!data?.regions
            });
        }

        console.log(`✅ [VALIDATE DEBUG] Import validé: ${result.locations.length} lieux, ${result.regions.length} régions`);
        console.log("✅ [VALIDATE DEBUG] Résultat complet:", result);
        return result;
    }

    /**
     * Extrait les rumeurs d'un objet, même s'il y a des clés dupliquées
     * Note: JSON ne supporte pas vraiment les clés dupliquées, donc on utilise une regex
     */
    extractRumeursFromRawText(rawText, itemId) {
        const rumeurs = [];

        // Chercher toutes les occurrences de "Rumeur" dans le texte brut
        const rumeurPattern = /"Rumeur"\s*:\s*"([^"]+)"/g;
        let match;

        while ((match = rumeurPattern.exec(rawText)) !== null) {
            const rumeur = match[1];
            if (rumeur && rumeur !== "A définir") {
                rumeurs.push(rumeur);
            }
        }

        return rumeurs;
    }

    processItem(item, result) {
        console.log("🔍 [PROCESS DEBUG] Début traitement item:", item.name);
        console.log("🔍 [PROCESS DEBUG] Item complet:", JSON.stringify(item, null, 2).substring(0, 500));

        // Vérifier si c'est une région (a des points de coordonnées)
        if (item.type === 'region' || (item.coordinates && item.coordinates.points)) {
            console.log("🔍 [PROCESS DEBUG] Détecté comme RÉGION");

            // Extraire les points depuis la structure coordinates
            let points = [];
            if (item.coordinates?.points) {
                console.log("🔍 [PROCESS DEBUG] Points trouvés dans coordinates.points");
                points = item.coordinates.points;
            } else if (item.points) {
                console.log("🔍 [PROCESS DEBUG] Points trouvés dans item.points");
                points = item.points;
            } else if (Array.isArray(item.coordinates)) {
                console.log("🔍 [PROCESS DEBUG] Coordinates est un tableau");
                points = item.coordinates;
            }

            console.log("🔍 [PROCESS DEBUG] Points extraits:", points?.length || 0);

            // Vérifier que les points sont valides
            if (!points || points.length < 3) {
                console.warn(`⚠️ [PROCESS DEBUG] Région "${item.name}" ignorée : moins de 3 points valides (${points?.length || 0} points)`);
                return;
            }

            const region = {
                id: item.id || `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: item.name || 'Région sans nom',
                description: item.description || '',
                color: item.color || 'gray',
                known: item.known !== undefined ? item.known : true,
                visited: item.visited !== undefined ? item.visited : false,
                type: 'region',
                points: points  // Utiliser points directement
            };

            // Ajouter mapId SEULEMENT s'il existe dans le fichier importé
            if (item.mapId) {
                region.mapId = item.mapId;
            }

            // Ajouter les images si présentes
            if (item.imageUrl) region.imageUrl = item.imageUrl;
            if (item.images) region.images = item.images;
            
            // Mapper image_url vers images si présent (rétrocompatibilité)
            if (item.image_url && Array.isArray(item.image_url) && item.image_url.length > 0) {
                // Convertir le tableau image_url en format images
                region.images = item.image_url.map(url => ({
                    url: url,
                    type: null // Type sera défini plus tard si nécessaire
                }));
            }

            // Pour les régions: une seule rumeur
            if (item.Rumeur && item.Rumeur !== "A definir") {
                region.Rumeur = item.Rumeur;
            }

            // Tradition ancienne
            if (item.Tradition_Ancienne && item.Tradition_Ancienne !== "A definir") {
                region.Tradition_Ancienne = item.Tradition_Ancienne;
            }

            // Ajouter les personnages associés
            if (item.associatedCharacters && Array.isArray(item.associatedCharacters)) {
                region.associatedCharacters = item.associatedCharacters;
            }

            result.regions.push(region);
            console.log(`✅ Région importée: ${region.name} (${points.length} points, mapId: ${region.mapId || 'aucun'})`);
        }
        // Sinon c'est un lieu normal
        else {
            console.log("🔍 [PROCESS DEBUG] Détecté comme LIEU");
            console.log("🔍 [PROCESS DEBUG] Coordonnées brutes:", item.coordinates);

            // Vérifier que les coordonnées sont valides
            const x = item.coordinates?.x;
            const y = item.coordinates?.y;

            console.log("🔍 [PROCESS DEBUG] x =", x, "type:", typeof x);
            console.log("🔍 [PROCESS DEBUG] y =", y, "type:", typeof y);

            if (typeof x !== 'number' || typeof y !== 'number') {
                console.warn(`⚠️ [PROCESS DEBUG] Lieu "${item.name}" ignoré : coordonnées invalides x=${x}(${typeof x}), y=${y}(${typeof y})`, item.coordinates);
                return;
            }

            console.log("🔍 [PROCESS DEBUG] Coordonnées valides, création du lieu");

            const location = {
                id: item.id || `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: item.name || 'Lieu sans nom',
                description: item.description || '',
                color: item.color || 'blue',
                known: item.known !== undefined ? item.known : true,
                visited: item.visited !== undefined ? item.visited : false,
                type: item.type || 'custom',
                coordinates: {
                    x: x,
                    y: y
                }
            };

            // Ajouter mapId SEULEMENT s'il existe dans le fichier importé
            if (item.mapId) {
                location.mapId = item.mapId;
            }

            // Ajouter les images si présentes
            if (item.imageUrl) location.imageUrl = item.imageUrl;
            if (item.images) location.images = item.images;
            
            // Mapper image_url vers images si présent (rétrocompatibilité)
            if (item.image_url && Array.isArray(item.image_url) && item.image_url.length > 0) {
                // Convertir le tableau image_url en format images
                location.images = item.image_url.map(url => ({
                    url: url,
                    type: null // Type sera défini plus tard si nécessaire
                }));
            }

            // Gérer les rumeurs - support des formats anciens et nouveaux
            const rumeurs = [];

            // Si on a un tableau Rumeurs
            if (item.Rumeurs && Array.isArray(item.Rumeurs)) {
                rumeurs.push(...item.Rumeurs.filter(r => r && r !== "A définir"));
            }
            // Si on a une seule propriété Rumeur
            else if (item.Rumeur && item.Rumeur !== "A definir") {
                rumeurs.push(item.Rumeur);
            }

            if (rumeurs.length > 0) {
                location.Rumeurs = rumeurs;
            }

            // Ajouter la tradition ancienne
            if (item.Tradition_Ancienne && item.Tradition_Ancienne !== "A definir") {
                location.Tradition_Ancienne = item.Tradition_Ancienne;
            }

            // Ajouter les personnages associés
            if (item.associatedCharacters && Array.isArray(item.associatedCharacters)) {
                location.associatedCharacters = item.associatedCharacters;
            }

            result.locations.push(location);
            console.log(`✅ Lieu importé: ${location.name} (x:${x}, y:${y}, mapId: ${location.mapId || 'aucun'})`);
        }
    }

    /**
     * Améliore les rumeurs en extrayant toutes les occurrences depuis le texte JSON brut
     */
    enhanceRumeursFromRawText(rawText, locations) {
        // Cette fonction n'est plus nécessaire car processItem gère déjà correctement
        // le tableau Rumeurs du JSON. On la garde vide pour compatibilité.
        console.log("📚 Extraction des rumeurs déjà effectuée lors du parsing JSON");
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
    async processImport(processedData, mode) {
        try {
            console.log(`📥 [processImport] Début traitement en mode: ${mode}`);
            console.log(`📥 [processImport] Données à importer:`, {
                locations: processedData.locations.length,
                regions: processedData.regions.length
            });
            console.log(`📥 [processImport] Données ACTUELLES:`, {
                locations: this.dataManager.locationsData?.locations?.length || 0,
                regions: this.dataManager.regionsData?.regions?.length || 0
            });

            if (mode === 'replace') {
                console.log(`📥 [processImport] Mode REPLACE - Remplacement de toutes les données`);

                // Remplacer toutes les données
                if (processedData.locations.length > 0) {
                    console.log(`📥 [processImport] Attribution de ${processedData.locations.length} lieux au dataManager`);
                    this.dataManager.locationsData = { locations: processedData.locations };
                } else {
                    console.log(`📥 [processImport] Aucun lieu à importer - structure vide`);
                    this.dataManager.locationsData = { locations: [] };
                }

                if (processedData.regions.length > 0) {
                    console.log(`📥 [processImport] Attribution de ${processedData.regions.length} régions au dataManager`);
                    this.dataManager.regionsData = { regions: processedData.regions };
                } else {
                    console.log(`📥 [processImport] Aucune région à importer - structure vide`);
                    this.dataManager.regionsData = { regions: [] };
                }

                console.log(`📥 [processImport] Mise à jour des références globales window`);
                // Mettre à jour les références globales APRÈS avoir mis à jour le dataManager
                window.locationsData = this.dataManager.locationsData;
                window.regionsData = this.dataManager.regionsData;
                console.log(`📥 [processImport] Références globales mises à jour:`, {
                    windowLocations: window.locationsData?.locations?.length || 0,
                    windowRegions: window.regionsData?.regions?.length || 0
                });
            } else if (mode === 'merge') {
                console.log(`📥 [processImport] Mode MERGE - Fusion des données`);
                // Fusionner les données
                this.mergeLocations(processedData.locations);
                this.mergeRegions(processedData.regions);

                console.log(`📥 [processImport] Données APRÈS fusion:`, {
                    locations: this.dataManager.locationsData?.locations?.length || 0,
                    regions: this.dataManager.regionsData?.regions?.length || 0
                });
            }

            // Sauvegarder LOCALEMENT d'abord
            console.log(`📥 [processImport] Sauvegarde dans localStorage...`);
            try {
                this.dataManager.saveLocationsToLocal();
                console.log(`✅ [processImport] Lieux sauvegardés dans localStorage`);
            } catch (saveError) {
                console.error(`❌ [processImport] Erreur lors de la sauvegarde des lieux:`, saveError);
                throw saveError;
            }

            try {
                this.dataManager.saveRegionsToLocal();
                console.log(`✅ [processImport] Régions sauvegardées dans localStorage`);
            } catch (saveError) {
                console.error(`❌ [processImport] Erreur lors de la sauvegarde des régions:`, saveError);
                throw saveError;
            }

            // Forcer la mise à jour des références globales avant le re-render
            console.log(`📥 [processImport] Mise à jour finale des références globales...`);
            window.locationsData = this.dataManager.locationsData;
            window.regionsData = this.dataManager.regionsData;

            // Re-render immédiatement les lieux
            const locationCount = this.dataManager.locationsData?.locations?.length || 0;
            const regionCount = this.dataManager.regionsData?.regions?.length || 0;

            console.log(`🎯 [processImport] Re-rendering ${locationCount} locations after import`);
            console.log(`🌍 [processImport] Re-rendering ${regionCount} regions after import`);

            if (typeof window.renderLocations === 'function') {
                try {
                    window.renderLocations();
                    console.log(`✅ [processImport] Locations rendered successfully`);
                } catch (renderError) {
                    console.error(`❌ [processImport] Erreur lors du rendu des lieux:`, renderError);
                    throw renderError;
                }
            } else {
                console.error("❌ [processImport] window.renderLocations is not a function");
            }

            if (typeof window.renderRegions === 'function') {
                try {
                    window.renderRegions();
                    console.log(`✅ [processImport] Regions rendered successfully`);
                } catch (renderError) {
                    console.error(`❌ [processImport] Erreur lors du rendu des régions:`, renderError);
                    throw renderError;
                }
            } else {
                console.error("❌ [processImport] window.renderRegions is not a function");
            }

            // NE PAS marquer comme non sauvegardé - on va sauvegarder immédiatement

            const totalImported = processedData.locations.length + processedData.regions.length;
            this.showNotification("Import réussi", `${totalImported} éléments importés avec succès (mode: ${mode})`, "success");

            console.log(`✅ [processImport] Import terminé avec succès: ${processedData.locations.length} lieux, ${processedData.regions.length} régions`);

            // RECHARGEMENT DÉSACTIVÉ TEMPORAIREMENT POUR DEBUG
            console.log(`📥 [processImport] Rechargement automatique désactivé - les données sont en mémoire`);
            console.log(`📥 [processImport] Vous pouvez maintenant synchroniser manuellement avec le bouton de sync`);
            
            // Forcer une sauvegarde cloud immédiate après import
            if (window.authManager && window.authManager.isAuthenticated) {
                console.log(`📥 [processImport] Déclenchement sauvegarde cloud automatique...`);

                // Sauvegarder mais NE PAS recharger
                window.authManager.manualSync().then(() => {
                    console.log(`✅ [processImport] Sauvegarde cloud terminée avec succès`);
                    alert('✅ Import et sauvegarde réussis ! Les données sont maintenant visibles et synchronisées avec le cloud.');
                }).catch(error => {
                    console.error(`❌ [processImport] Erreur lors de la sauvegarde cloud:`, error);
                    alert(`Erreur lors de la sauvegarde cloud: ${error.message}\nLes données sont en mémoire mais non synchronisées. Veuillez sauvegarder manuellement.`);
                });
            }
            
            // ANCIEN CODE AVEC RECHARGEMENT (commenté pour debug)
            /*
            if (window.authManager && window.authManager.isAuthenticated) {
                window.authManager.manualSync().then(() => {
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }).catch(error => {
                    alert(`Erreur lors de la sauvegarde cloud: ${error.message}`);
                });
            } else {
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
            */

        } catch (error) {
            console.error("❌ [processImport] ERREUR COMPLÈTE:", error);
            console.error("❌ [processImport] Stack trace:", error.stack);
            console.error("❌ [processImport] Message:", error.message);
            console.error("❌ [processImport] Type:", typeof error);
            console.error("❌ [processImport] Détails:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
            this.showNotification("Erreur d'import", error.message || "Erreur inconnue lors de l'import", "error");
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

        const activeMapUrl = window.settingsManager?.activeMapUrl;
        console.log(`🔄 [mergeLocations] Carte active: ${activeMapUrl}`);
        console.log(`🔄 [mergeLocations] Lieux existants AVANT fusion: ${this.dataManager.locationsData.locations.length}`);

        // ÉTAPE 1: Conserver les lieux des AUTRES cartes
        const locationsFromOtherMaps = this.dataManager.locationsData.locations.filter(loc => {
            // Garder les lieux sans mapId OU ceux d'une autre carte
            const keepLocation = !loc.mapId || (activeMapUrl && loc.mapId !== activeMapUrl);
            if (keepLocation) {
                console.log(`✅ [mergeLocations] Conservation du lieu "${loc.name}" (mapId: ${loc.mapId || 'aucun'})`);
            }
            return keepLocation;
        });

        console.log(`🔄 [mergeLocations] Lieux conservés des autres cartes: ${locationsFromOtherMaps.length}`);

        // ÉTAPE 2: Traiter les lieux importés
        const processedImportedLocations = [];
        importedLocations.forEach(importedLocation => {
            // Chercher un lieu existant avec le même nom SUR LA MÊME CARTE
            const existingLocation = this.dataManager.locationsData.locations.find(
                loc => loc.name === importedLocation.name && 
                       (!loc.mapId || !activeMapUrl || loc.mapId === activeMapUrl)
            );

            if (existingLocation) {
                // Mettre à jour le lieu existant
                const updatedLocation = { ...existingLocation, ...importedLocation };
                processedImportedLocations.push(updatedLocation);
                console.log(`🔄 Lieu mis à jour: ${importedLocation.name}`);
            } else {
                // Ajouter le nouveau lieu avec un ID unique
                this.ensureUniqueId(importedLocation, [...locationsFromOtherMaps, ...processedImportedLocations]);
                processedImportedLocations.push(importedLocation);
                console.log(`➕ Nouveau lieu ajouté: ${importedLocation.name}`);
            }
        });

        // ÉTAPE 3: Fusionner les lieux des autres cartes + lieux importés
        const mergedLocations = [...locationsFromOtherMaps, ...processedImportedLocations];
        console.log(`🔄 [mergeLocations] Total lieux APRÈS fusion: ${mergedLocations.length}`);

        // ÉTAPE 4: Mettre à jour les données
        this.dataManager.locationsData = { locations: mergedLocations };
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

        const activeMapUrl = window.settingsManager?.activeMapUrl;
        console.log(`🔄 [mergeRegions] Carte active: ${activeMapUrl}`);
        console.log(`🔄 [mergeRegions] Régions existantes AVANT fusion: ${this.dataManager.regionsData.regions.length}`);

        // ÉTAPE 1: Conserver les régions des AUTRES cartes
        const regionsFromOtherMaps = this.dataManager.regionsData.regions.filter(reg => {
            // Garder les régions sans mapId OU celles d'une autre carte
            const keepRegion = !reg.mapId || (activeMapUrl && reg.mapId !== activeMapUrl);
            if (keepRegion) {
                console.log(`✅ [mergeRegions] Conservation de la région "${reg.name}" (mapId: ${reg.mapId || 'aucun'})`);
            }
            return keepRegion;
        });

        console.log(`🔄 [mergeRegions] Régions conservées des autres cartes: ${regionsFromOtherMaps.length}`);

        // ÉTAPE 2: Traiter les régions importées
        const processedImportedRegions = [];
        importedRegions.forEach(importedRegion => {
            // Chercher une région existante avec le même nom SUR LA MÊME CARTE
            const existingRegion = this.dataManager.regionsData.regions.find(
                reg => reg.name === importedRegion.name && 
                       (!reg.mapId || !activeMapUrl || reg.mapId === activeMapUrl)
            );

            if (existingRegion) {
                // Mettre à jour la région existante
                const updatedRegion = { ...existingRegion, ...importedRegion };
                processedImportedRegions.push(updatedRegion);
                console.log(`🔄 Région mise à jour: ${importedRegion.name}`);
            } else {
                // Ajouter la nouvelle région avec un ID unique
                this.ensureUniqueId(importedRegion, [...regionsFromOtherMaps, ...processedImportedRegions]);
                processedImportedRegions.push(importedRegion);
                console.log(`➕ Nouvelle région ajoutée: ${importedRegion.name}`);
            }
        });

        // ÉTAPE 3: Fusionner les régions des autres cartes + régions importées
        const mergedRegions = [...regionsFromOtherMaps, ...processedImportedRegions];
        console.log(`🔄 [mergeRegions] Total régions APRÈS fusion: ${mergedRegions.length}`);

        // ÉTAPE 4: Mettre à jour les données
        this.dataManager.regionsData = { regions: mergedRegions };
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
            <div id="import-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-[70]">
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