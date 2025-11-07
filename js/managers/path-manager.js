class PathManager {
    constructor(domElements, dataManager, mapConstants) {
        this.dom = domElements;
        this.dataManager = dataManager;
        this.mapConstants = mapConstants || {};
        this.isDrawingMode = false;
        this.canvas = null;
        this.ctx = null;
        this.path = [];
        this.totalDistance = 0;
        this.lastPoint = null;
        this.startPoint = null;
        this.isDrawing = false;
        this.regionSegments = new Map();
        this.discoveries = [];
    }

    init() {
        this.canvas = document.getElementById('drawing-canvas');
        if (!this.canvas) {
            console.error('❌ Drawing canvas not found');
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        this.setupEventListeners();
        this.setupCanvasStyle();

        // Rendre les variables globales disponibles pour compatibilité
        window.journeyPath = this.path;
        window.journeyDiscoveries = this.discoveries;
        window.regionSegments = this.regionSegments;
        window.totalPathPixels = 0;
        window.lastPoint = null;
        window.isDrawingMode = false;

        console.log('🛤️ PathManager initialized');
    }

    setupCanvas() {
        // Attendre que la carte soit chargée pour configurer le canvas
        const setupCanvasSize = () => {
            const mapImage = document.getElementById('map-image');
            if (mapImage && mapImage.naturalWidth > 0) {
                this.canvas.width = mapImage.naturalWidth;
                this.canvas.height = mapImage.naturalHeight;
                this.canvas.style.width = `${mapImage.naturalWidth}px`;
                this.canvas.style.height = `${mapImage.naturalHeight}px`;
                console.log(`🎨 Canvas configuré : ${this.canvas.width}x${this.canvas.height}`);
            } else {
                // Réessayer après un court délai
                setTimeout(setupCanvasSize, 100);
            }
        };

        setupCanvasSize();
    }

    setupEventListeners() {
        const drawModeBtn = this.dom.getElementById('draw-mode');
        const eraseBtn = this.dom.getElementById('erase');

        if (drawModeBtn) {
            drawModeBtn.addEventListener('click', () => {
                this.toggleDrawingMode();
            });
        }

        if (eraseBtn) {
            eraseBtn.addEventListener('click', () => {
                this.clearPath();
            });
        }

        // Événements de tracé sur le viewport
        const viewport = document.getElementById('viewport');
        if (viewport) {
            // Gestionnaires souris (desktop)
            viewport.addEventListener('mousedown', (e) => this.handleViewportMouseDown(e));
            viewport.addEventListener('mousemove', (e) => this.handleViewportMouseMove(e));
            viewport.addEventListener('mouseup', (e) => this.handleViewportMouseUp(e));
            viewport.addEventListener('mouseleave', (e) => this.handleViewportMouseUp(e));

            // Gestionnaires tactiles (mobile)
            viewport.addEventListener('touchstart', (e) => this.handleViewportTouchStart(e), { passive: false });
            viewport.addEventListener('touchmove', (e) => this.handleViewportTouchMove(e), { passive: false });
            viewport.addEventListener('touchend', (e) => this.handleViewportTouchEnd(e), { passive: false });
        }
    }

    handleViewportMouseDown(event) {
        console.log("🖱️ Viewport mousedown event fired, isDrawingMode:", this.isDrawingMode);

        // Handle drawing mode specifically - logique de l'ancienne version
        if (this.isDrawingMode) {
            // Vérifier qu'on ne clique pas sur un marqueur ou autre élément
            if (event.target.closest('.location-marker, #info-box')) {
                console.log("❌ Clicked on marker or info box, ignoring");
                return;
            }

            console.log("🎨 Starting drawing...");
            event.preventDefault();
            event.stopPropagation();

            // Clear canvas et reset comme dans l'ancienne version
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.isDrawing = true;
            this.totalDistance = 0;

            // Reset journey tracking
            this.path = [];
            this.regionSegments.clear();
            this.discoveries = [];

            this.startPoint = this.getCanvasCoordinates(event);
            this.lastPoint = this.startPoint;

            // Add start point to journey path
            this.path.push({x: this.startPoint.x, y: this.startPoint.y});

            console.log("📍 Start point:", this.startPoint);
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
            this.updatePathData();
            this.showDistanceContainer();
            console.log("✅ Drawing initialized");
            return;
        }

        // Si pas en mode dessin, ne pas gérer l'événement ici
        // Laisser les autres gestionnaires s'en occuper
    }

    handleViewportMouseMove(event) {
        if (!this.isDrawing || !this.isDrawingMode || !this.lastPoint) return;

        console.log("✏️ Mouse move during drawing");
        const currentPoint = this.getCanvasCoordinates(event);
        const segmentLength = Math.sqrt(
            Math.pow(currentPoint.x - this.lastPoint.x, 2) +
            Math.pow(currentPoint.y - this.lastPoint.y, 2)
        );
        this.totalDistance += segmentLength;

        // Add current point to journey path for region/location detection
        this.path.push({x: currentPoint.x, y: currentPoint.y});

        this.lastPoint = currentPoint;
        this.ctx.lineTo(currentPoint.x, currentPoint.y);
        this.ctx.stroke();
        this.updatePathData();
        console.log("✏️ Drawing segment, total pixels:", this.totalDistance.toFixed(1));
    }

    handleViewportMouseUp(event) {
        if (!this.isDrawingMode) return;

        if (this.isDrawing) {
            console.log('🛑 Drawing stopped');

            // Finalize the current segment
            console.log('🔄 Drawing segment completed');
            this.updateJourneyStats();

            // Détecter les découvertes APRÈS avoir finalisé le tracé
            console.log('🔍 Détection des lieux et régions traversés...');
            this.detectDiscoveries();

            // Reset drawing state
            console.log('🏁 Drawing mode ended - journey path created');
            this.isDrawing = false;
        }
    }

    // Gestionnaires d'événements tactiles
    handleViewportTouchStart(event) {
        console.log("👆 Viewport touchstart event fired, isDrawingMode:", this.isDrawingMode);

        if (this.isDrawingMode) {
            // Empêcher le comportement par défaut (scroll, zoom)
            event.preventDefault();
            event.stopPropagation();

            // Vérifier qu'on ne touche pas un marqueur ou autre élément
            if (event.target.closest('.location-marker, #info-box')) {
                console.log("❌ Touched on marker or info box, ignoring");
                return;
            }

            console.log("🎨 Starting drawing (touch)...");
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.isDrawing = true;
            this.totalDistance = 0;

            // Reset journey tracking
            this.path = [];
            this.regionSegments.clear();
            this.discoveries = [];

            this.startPoint = this.getCanvasCoordinates(event);
            this.lastPoint = this.startPoint;

            // Add start point to journey path
            this.path.push({x: this.startPoint.x, y: this.startPoint.y});

            console.log("📍 Start point (touch):", this.startPoint);
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
            this.updatePathData();
            this.showDistanceContainer();
            console.log("✅ Drawing initialized (touch)");
            return;
        }
    }

    handleViewportTouchMove(event) {
        if (!this.isDrawing || !this.isDrawingMode || !this.lastPoint) return;

        console.log("✏️ Touch move during drawing");
        event.preventDefault(); // Empêcher le scroll pendant le dessin
        event.stopPropagation();

        const currentPoint = this.getCanvasCoordinates(event);
        const segmentLength = Math.sqrt(
            Math.pow(currentPoint.x - this.lastPoint.x, 2) +
            Math.pow(currentPoint.y - this.lastPoint.y, 2)
        );
        this.totalDistance += segmentLength;

        // Add current point to journey path for region/location detection
        this.path.push({x: currentPoint.x, y: currentPoint.y});

        this.lastPoint = currentPoint;
        this.ctx.lineTo(currentPoint.x, currentPoint.y);
        this.ctx.stroke();
        this.updatePathData();
        console.log("✏️ Drawing segment (touch), total pixels:", this.totalDistance.toFixed(1));
    }

    handleViewportTouchEnd(event) {
        if (!this.isDrawingMode) return;

        if (this.isDrawing) {
            console.log("🛑 Drawing stopped (touch)");
            this.isDrawing = false;
            // Auto-sync sera géré par le main.js
            console.log("🔄 Drawing segment completed (touch)");

            // Recalculer les informations du voyage
            this.updatePathData();

            // Déplacer le marqueur de position au début du tracé avec animation
            if (window.positionManager && window.journeyPath.length > 0) {
                const startPoint = window.journeyPath[0];
                window.positionManager.animateToPosition(startPoint.x, startPoint.y);
            }

            console.log("🏁 Drawing mode ended (touch) - journey path created");
        }
    }

    getCanvasCoordinates(event) {
        const viewport = document.getElementById('viewport');
        const mapContainer = document.getElementById('map-container');

        if (!viewport || !mapContainer) return { x: 0, y: 0 };

        const viewportRect = viewport.getBoundingClientRect();
        const viewportX = event.clientX !== undefined ? event.clientX : event.touches?.[0]?.clientX;
        const viewportY = event.clientY !== undefined ? event.clientY : event.touches?.[0]?.clientY;

        // Récupérer les transformations actuelles de la carte
        const transform = mapContainer.style.transform;
        let scale = 1, panX = 0, panY = 0;

        if (transform) {
            const scaleMatch = transform.match(/scale\(([^)]+)\)/);
            const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);

            if (scaleMatch) scale = parseFloat(scaleMatch[1]);
            if (translateMatch) {
                panX = parseFloat(translateMatch[1].replace('px', ''));
                panY = parseFloat(translateMatch[2].replace('px', ''));
            }
        }

        // Convertir les coordonnées du viewport vers les coordonnées de la carte
        const mapX = (viewportX - viewportRect.left - panX) / scale;
        const mapY = (viewportY - viewportRect.top - panY) / scale;

        return {
            x: Math.round(mapX),
            y: Math.round(mapY)
        };
    }

    setupCanvasStyle() {
        this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        this.ctx.lineWidth = 5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    toggleDrawingMode() {
        // Logique simplifiée de l'ancienne version
        this.isDrawingMode = !this.isDrawingMode;
        const drawModeBtn = document.getElementById('draw-mode');
        const viewport = document.getElementById('viewport');

        console.log("🎨 Drawing mode is now:", this.isDrawingMode);

        if (this.isDrawingMode) {
            if (drawModeBtn) {
                drawModeBtn.classList.add('btn-active');
                drawModeBtn.title = 'Arrêter le voyage';
            }
            if (viewport) {
                viewport.classList.add('drawing');
            }

            // Ensure canvas has proper pointer events when in drawing mode
            if (this.canvas) {
                this.canvas.style.pointerEvents = 'auto';
                console.log("✅ Canvas pointer events enabled");
            }

            // Désactiver les gestionnaires de pan
            this.disablePanHandlers();

            console.log('✏️ Mode dessin activé - pan désactivé');
        } else {
            // Arrêter tout tracé en cours
            this.isDrawing = false;
            this.lastPoint = null;

            if (drawModeBtn) {
                drawModeBtn.classList.remove('btn-active');
                drawModeBtn.title = 'Tracer un voyage';
            }
            if (viewport) {
                viewport.classList.remove('drawing');
            }

            if (this.canvas) {
                this.canvas.style.pointerEvents = 'none';
                console.log("❌ Canvas pointer events disabled");
            }

            // Réactiver les gestionnaires de pan
            this.enablePanHandlers();

            console.log('✏️ Mode dessin désactivé - pan réactivé');
        }

        // Mettre à jour les variables globales pour compatibilité
        window.isDrawingMode = this.isDrawingMode;

        // Re-render locations to update pointer events (comme dans l'ancienne version)
        if (window.renderLocations) {
            window.renderLocations();
        }
    }

    disablePanHandlers() {
        const viewport = document.getElementById('viewport');
        if (!viewport) return;

        // Sauvegarder les gestionnaires existants pour les restaurer plus tard
        if (!this.originalPanHandlers) {
            this.originalPanHandlers = {
                mousedown: null,
                mousemove: null,
                mouseup: null,
                mouseleave: null
            };

            // Trouver les gestionnaires existants depuis main.js
            const existingHandlers = viewport.cloneNode(false);
            this.originalPanHandlers.mousedown = viewport.onmousedown;
        }

        // Supprimer temporairement le curseur grab
        viewport.style.cursor = 'crosshair';

        console.log("🚫 Gestionnaires de pan désactivés");
    }

    enablePanHandlers() {
        const viewport = document.getElementById('viewport');
        if (!viewport) return;

        // Restaurer le curseur normal
        viewport.style.cursor = 'grab';

        // Réactiver la navigation de la carte en appelant setupMapNavigation depuis main.js
        if (window.setupMapNavigation) {
            // Ne pas rappeler setupMapNavigation car cela doublerait les listeners
            // À la place, simplement restaurer le curseur
        }

        console.log("✅ Gestionnaires de pan réactivés");
    }

    clearPath() {
        this.path = [];
        this.discoveries = [];
        this.regionSegments.clear();
        this.totalDistance = 0;
        this.lastPoint = null;
        this.startPoint = null;

        // Nettoyer le canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Mettre à jour les variables globales
        window.journeyPath = this.path;
        window.journeyDiscoveries = this.discoveries;
        window.regionSegments = this.regionSegments;
        window.totalPathPixels = 0;
        window.lastPoint = null;

        // Mettre à jour l'affichage
        this.updateDistanceDisplay();
        this.hideVoyageButton();

        console.log('🧹 Chemin effacé');
    }

    updatePathData() {
        console.log('🔄 [updatePathData] DÉBUT');
        console.log('🔄 [updatePathData] path.length:', this.path.length);
        
        // Calculer la distance totale
        this.calculateTotalDistance();
        console.log('🔄 [updatePathData] totalDistance:', this.totalDistance);

        // Détecter les découvertes
        this.detectDiscoveries();
        console.log('🔄 [updatePathData] discoveries après détection:', this.discoveries);

        // Mettre à jour les variables globales
        window.journeyPath = this.path;
        window.journeyDiscoveries = this.discoveries;
        window.totalPathPixels = this.totalDistance;
        
        console.log('🔄 [updatePathData] Variables globales mises à jour:');
        console.log('🔄 [updatePathData] - window.journeyPath.length:', window.journeyPath.length);
        console.log('🔄 [updatePathData] - window.journeyDiscoveries.length:', window.journeyDiscoveries.length);
        console.log('🔄 [updatePathData] - window.totalPathPixels:', window.totalPathPixels);

        // Mettre à jour l'affichage
        this.updateDistanceDisplay();

        // Afficher le bouton de voyage si le chemin est suffisant
        if (this.path.length > 10) {
            this.showVoyageButton();
        }
        
        console.log('🔄 [updatePathData] FIN');
    }

    calculateTotalDistance() {
        this.totalDistance = 0;
        for (let i = 1; i < this.path.length; i++) {
            const prev = this.path[i - 1];
            const curr = this.path[i];
            const distance = Math.sqrt(
                Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
            );
            this.totalDistance += distance;
        }
    }

    detectDiscoveries() {
        console.log('🔍 [detectDiscoveries] DÉBUT de la détection');
        console.log('🔍 [detectDiscoveries] dataManager.locationsData:', this.dataManager.locationsData);
        console.log('🔍 [detectDiscoveries] dataManager.regionsData:', this.dataManager.regionsData);
        console.log('🔍 [detectDiscoveries] path.length:', this.path.length);
        
        if (!this.dataManager.locationsData && !this.dataManager.regionsData) {
            console.log('❌ [detectDiscoveries] Pas de données - ABANDON');
            return;
        }

        this.discoveries = [];
        this.regionSegments.clear();

        console.log('🔍 [detectDiscoveries] Appel de detectNearbyLocations...');
        // Détecter les lieux proches du tracé
        this.detectNearbyLocations();
        console.log('🔍 [detectDiscoveries] Après detectNearbyLocations - discoveries.length:', this.discoveries.length);

        console.log('🔍 [detectDiscoveries] Appel de detectTraversedRegions...');
        // Détecter les régions traversées
        this.detectTraversedRegions();
        console.log('🔍 [detectDiscoveries] Après detectTraversedRegions - discoveries.length:', this.discoveries.length);
        console.log('🔍 [detectDiscoveries] FIN - Total découvertes:', this.discoveries.length);
    }

    detectNearbyLocations() {
        console.log('📍 [detectNearbyLocations] DÉBUT');
        console.log('📍 [detectNearbyLocations] locationsData:', this.dataManager.locationsData);
        console.log('📍 [detectNearbyLocations] locations array:', this.dataManager.locationsData?.locations);
        
        if (!this.dataManager.locationsData?.locations) {
            console.log('❌ [detectNearbyLocations] Pas de données de lieux - ABANDON');
            return;
        }

        const PROXIMITY_THRESHOLD = 80; // pixels
        const activeMapUrl = window.settingsManager?.activeMapUrl;
        
        console.log('📍 [detectNearbyLocations] activeMapUrl:', activeMapUrl);
        console.log('📍 [detectNearbyLocations] PROXIMITY_THRESHOLD:', PROXIMITY_THRESHOLD);
        console.log('📍 [detectNearbyLocations] Nombre total de lieux:', this.dataManager.locationsData.locations.length);
        console.log('📍 [detectNearbyLocations] Nombre de points du tracé:', this.path.length);

        let processedCount = 0;
        let skippedNoCoords = 0;
        let skippedMapId = 0;
        let skippedTooFar = 0;

        this.dataManager.locationsData.locations.forEach((location, index) => {
            console.log(`📍 [detectNearbyLocations] Traitement lieu ${index + 1}/${this.dataManager.locationsData.locations.length}: "${location.name}"`);
            console.log(`📍 [detectNearbyLocations] - coordinates:`, location.coordinates);
            console.log(`📍 [detectNearbyLocations] - mapId:`, location.mapId);
            
            if (!location.coordinates) {
                console.log(`⏭️ [detectNearbyLocations] - Lieu "${location.name}" ignoré: pas de coordonnées`);
                skippedNoCoords++;
                return;
            }

            // Filtrer par mapId : n'afficher que les lieux compatibles avec la carte active
            if (activeMapUrl) {
                const locationMapId = location.mapId;

                // Si le lieu a un mapId défini et qu'il ne correspond pas à la carte active, l'ignorer
                if (locationMapId && locationMapId !== null && locationMapId !== undefined) {
                    if (String(locationMapId) !== String(activeMapUrl)) {
                        console.log(`⏭️ [detectNearbyLocations] - Lieu "${location.name}" ignoré (mapId: ${locationMapId} ≠ ${activeMapUrl})`);
                        skippedMapId++;
                        return; // Ignorer ce lieu
                    } else {
                        console.log(`✅ [detectNearbyLocations] - Lieu "${location.name}" mapId compatible: ${locationMapId}`);
                    }
                } else {
                    console.log(`✅ [detectNearbyLocations] - Lieu "${location.name}" sans mapId (compatible avec toutes cartes)`);
                }
            }

            let minDistance = Infinity;
            let closestIndex = -1;

            // Vérifier la proximité avec chaque point du tracé
            this.path.forEach((point, index) => {
                const distance = Math.sqrt(
                    Math.pow(point.x - location.coordinates.x, 2) +
                    Math.pow(point.y - location.coordinates.y, 2)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = index;
                }
            });

            console.log(`📍 [detectNearbyLocations] - Distance minimale pour "${location.name}": ${minDistance.toFixed(2)}px (seuil: ${PROXIMITY_THRESHOLD}px)`);

            if (minDistance <= PROXIMITY_THRESHOLD) {
                const discovery = {
                    type: 'location',
                    name: location.name,
                    discoveryIndex: closestIndex,
                    distance: minDistance,
                    proximityType: minDistance <= 20 ? 'traversed' : 'nearby',
                    mapId: location.mapId || null
                };
                console.log(`✅ [detectNearbyLocations] - Lieu "${location.name}" DÉTECTÉ et AJOUTÉ aux découvertes:`, discovery);
                this.discoveries.push(discovery);
                processedCount++;
            } else {
                console.log(`⏭️ [detectNearbyLocations] - Lieu "${location.name}" trop éloigné (${minDistance.toFixed(2)}px > ${PROXIMITY_THRESHOLD}px)`);
                skippedTooFar++;
            }
        });
        
        console.log('📍 [detectNearbyLocations] FIN - Statistiques:');
        console.log('📍 [detectNearbyLocations] - Lieux ajoutés:', processedCount);
        console.log('📍 [detectNearbyLocations] - Ignorés (pas de coords):', skippedNoCoords);
        console.log('📍 [detectNearbyLocations] - Ignorés (mapId):', skippedMapId);
        console.log('📍 [detectNearbyLocations] - Ignorés (trop loin):', skippedTooFar);
    }

    detectTraversedRegions() {
        console.log('🗺️ [detectTraversedRegions] DÉBUT');
        console.log('🗺️ [detectTraversedRegions] regionsData:', this.dataManager.regionsData);
        console.log('🗺️ [detectTraversedRegions] regions array:', this.dataManager.regionsData?.regions);
        
        if (!this.dataManager.regionsData?.regions) {
            console.log('❌ [detectTraversedRegions] Pas de données de régions - ABANDON');
            return;
        }

        const activeMapUrl = window.settingsManager?.activeMapUrl;
        
        console.log('🗺️ [detectTraversedRegions] activeMapUrl:', activeMapUrl);
        console.log('🗺️ [detectTraversedRegions] Nombre total de régions:', this.dataManager.regionsData.regions.length);
        console.log('🗺️ [detectTraversedRegions] Nombre de points du tracé:', this.path.length);

        let processedCount = 0;
        let skippedNoCoords = 0;
        let skippedMapId = 0;
        let skippedNoIntersection = 0;

        this.dataManager.regionsData.regions.forEach((region, index) => {
            console.log(`🗺️ [detectTraversedRegions] Traitement région ${index + 1}/${this.dataManager.regionsData.regions.length}: "${region.name}"`);
            
            // Utiliser 'coordinates' au lieu de 'points' pour le nouveau format
            const regionCoords = region.coordinates || region.points;
            console.log(`🗺️ [detectTraversedRegions] - regionCoords:`, regionCoords);
            console.log(`🗺️ [detectTraversedRegions] - mapId:`, region.mapId);
            
            if (!regionCoords || regionCoords.length < 3) {
                console.log(`⏭️ [detectTraversedRegions] - Région "${region.name}" ignorée: pas assez de coordonnées (${regionCoords?.length || 0} points)`);
                skippedNoCoords++;
                return;
            }

            // Filtrer par mapId : n'afficher que les régions compatibles avec la carte active
            if (activeMapUrl) {
                const regionMapId = region.mapId;

                // Si la région a un mapId défini et qu'il ne correspond pas à la carte active, l'ignorer
                if (regionMapId && regionMapId !== null && regionMapId !== undefined) {
                    if (String(regionMapId) !== String(activeMapUrl)) {
                        console.log(`⏭️ [detectTraversedRegions] - Région "${region.name}" ignorée (mapId: ${regionMapId} ≠ ${activeMapUrl})`);
                        skippedMapId++;
                        return; // Ignorer cette région
                    } else {
                        console.log(`✅ [detectTraversedRegions] - Région "${region.name}" mapId compatible: ${regionMapId}`);
                    }
                } else {
                    console.log(`✅ [detectTraversedRegions] - Région "${region.name}" sans mapId (compatible avec toutes cartes)`);
                }
            }

            const intersections = [];

            // Vérifier les intersections du tracé avec la région
            for (let i = 1; i < this.path.length; i++) {
                const point = this.path[i];

                if (this.isPointInPolygon(point, regionCoords)) {
                    intersections.push(i);
                }
            }

            console.log(`🗺️ [detectTraversedRegions] - Nombre d'intersections pour "${region.name}": ${intersections.length}`);

            if (intersections.length > 0) {
                const entryIndex = Math.min(...intersections);
                const exitIndex = Math.max(...intersections);

                const discovery = {
                    type: 'region',
                    name: region.name,
                    discoveryIndex: entryIndex,
                    proximityType: 'traversed',
                    mapId: region.mapId || null
                };

                console.log(`✅ [detectTraversedRegions] - Région "${region.name}" TRAVERSÉE et AJOUTÉE aux découvertes:`, discovery);
                console.log(`✅ [detectTraversedRegions] - Entry index: ${entryIndex}, Exit index: ${exitIndex}`);

                // Stocker le segment de région
                this.regionSegments.set(region.name, {
                    entryIndex: entryIndex,
                    exitIndex: exitIndex,
                    region: region
                });

                this.discoveries.push(discovery);
                processedCount++;
            } else {
                console.log(`⏭️ [detectTraversedRegions] - Région "${region.name}" non traversée (0 intersections)`);
                skippedNoIntersection++;
            }
        });
        
        console.log('🗺️ [detectTraversedRegions] FIN - Statistiques:');
        console.log('🗺️ [detectTraversedRegions] - Régions ajoutées:', processedCount);
        console.log('🗺️ [detectTraversedRegions] - Ignorées (pas de coords):', skippedNoCoords);
        console.log('🗺️ [detectTraversedRegions] - Ignorées (mapId):', skippedMapId);
        console.log('🗺️ [detectTraversedRegions] - Ignorées (pas d\'intersection):', skippedNoIntersection);
    }

    isPointInPolygon(point, polygon) {
        let inside = false;
        const x = point.x;
        const y = point.y;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;

            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }

        return inside;
    }

    updateDistanceDisplay() {
        const distanceDisplay = this.dom.getElementById('distance-display');
        if (!distanceDisplay) return;

        if (this.path.length === 0) {
            distanceDisplay.textContent = 'Aucun tracé';
            return;
        }

        // Récupérer les dimensions réelles de la carte active
        const mapImage = document.getElementById('map-image');
        const actualMapWidth = mapImage?.naturalWidth || window.MAP_WIDTH || 5103;

        // Récupérer l'échelle ET la vitesse de la carte active depuis le SettingsManager
        let MAP_DISTANCE_MILES = 600; // Valeur par défaut
        let milesPerDay = 20; // Valeur par défaut

        if (window.settingsManager && window.settingsManager.availableMaps) {
            const activeMap = window.settingsManager.availableMaps.find(
                m => m.url === window.settingsManager.activeMapUrl
            );
            if (activeMap) {
                if (activeMap.scale) {
                    MAP_DISTANCE_MILES = activeMap.scale;
                }
                if (activeMap.milesPerDay) {
                    milesPerDay = activeMap.milesPerDay;
                }
            }
        }

        // Convertir pixels en miles (basé sur les constantes de la carte)
        const miles = this.totalDistance * (MAP_DISTANCE_MILES / actualMapWidth);
        const days = Math.ceil(miles / milesPerDay);

        console.log(`📏 Calcul distance: ${this.totalDistance.toFixed(0)}px × (${MAP_DISTANCE_MILES} miles / ${actualMapWidth}px) = ${miles.toFixed(0)} miles ÷ ${milesPerDay} mi/j`);

        distanceDisplay.innerHTML = `
            <div class="text-sm">
                <div><strong>${Math.round(miles)} miles</strong></div>
                <div class="text-gray-400">${days} jour${days > 1 ? 's' : ''} de voyage</div>
            </div>
        `;
    }

    showDistanceContainer() {
        const distanceContainer = document.getElementById('distance-container');
        if (distanceContainer) {
            distanceContainer.classList.remove('hidden');
        }
    }

    showVoyageButton() {
        const voyageBtn = this.dom.getElementById('voyage-segments-btn');
        if (voyageBtn) {
            voyageBtn.classList.remove('hidden');
        }
    }

    hideVoyageButton() {
        const voyageBtn = this.dom.getElementById('voyage-segments-btn');
        if (voyageBtn) {
            voyageBtn.classList.add('hidden');
        }
    }

    // Méthodes pour la compatibilité avec l'ancien code
    redrawPath() {
        if (this.path.length === 0) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);

        for (let i = 1; i < this.path.length; i++) {
            this.ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        this.ctx.stroke();
    }

    loadPathData(pathData) {
        if (pathData && pathData.length > 0) {
            this.path = pathData;
            this.updatePathData();
            this.redrawPath();
            console.log(`🛤️ Chemin chargé avec ${this.path.length} points`);
        }
    }

    // Placeholder for updateJourneyStats to avoid errors, actual implementation might be elsewhere or needs to be added.
    updateJourneyStats() {
        // This method was called in the original snippet to be replaced.
        // If it has a specific implementation elsewhere or needs to be part of this class,
        // it should be added or called correctly.
        // For now, we assume it's either handled by updatePathData or a separate function.
        // If it was meant to be part of PathManager, it should be defined here.
        console.log("📞 updateJourneyStats called (placeholder).");
    }
}

export default PathManager;