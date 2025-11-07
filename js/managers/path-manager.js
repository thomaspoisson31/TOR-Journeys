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
            console.log("🛑 Drawing stopped");
            this.isDrawing = false;
            // Auto-sync sera géré par le main.js
            console.log("🔄 Drawing segment completed");

            // Recalculer les informations du voyage
            this.updatePathData();

            // Déplacer le marqueur de position au début du tracé avec animation
            if (window.positionManager && window.journeyPath.length > 0) {
                const startPoint = window.journeyPath[0];
                window.positionManager.animateToPosition(startPoint.x, startPoint.y);
            }

            console.log("🏁 Drawing mode ended - journey path created");
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
        // Calculer la distance totale
        this.calculateTotalDistance();

        // Détecter les découvertes
        this.detectDiscoveries();

        // Mettre à jour les variables globales
        window.journeyPath = this.path;
        window.journeyDiscoveries = this.discoveries;
        window.totalPathPixels = this.totalDistance;

        // Mettre à jour l'affichage
        this.updateDistanceDisplay();

        // Afficher le bouton de voyage si le chemin est suffisant
        if (this.path.length > 10) {
            this.showVoyageButton();
        }
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
        if (!this.dataManager.locationsData && !this.dataManager.regionsData) return;

        this.discoveries = [];
        this.regionSegments.clear();

        // Détecter les lieux proches du tracé
        this.detectNearbyLocations();

        // Détecter les régions traversées
        this.detectTraversedRegions();
    }

    detectNearbyLocations() {
        if (!this.dataManager.locationsData?.locations) return;

        const PROXIMITY_THRESHOLD = 80; // pixels
        const activeMapUrl = window.settingsManager?.activeMapUrl;

        this.dataManager.locationsData.locations.forEach(location => {
            if (!location.coordinates) return;

            // Filtrer par mapId : n'afficher que les lieux compatibles avec la carte active
            if (activeMapUrl) {
                const locationMapId = location.mapId;
                
                // Si le lieu a un mapId défini et qu'il ne correspond pas à la carte active, l'ignorer
                if (locationMapId && locationMapId !== null && locationMapId !== undefined) {
                    if (String(locationMapId) !== String(activeMapUrl)) {
                        console.log(`⏭️ [PathManager] Lieu "${location.name}" ignoré (mapId: ${locationMapId} ≠ ${activeMapUrl})`);
                        return; // Ignorer ce lieu
                    }
                }
                // Si le lieu n'a pas de mapId, il est compatible avec toutes les cartes
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

            if (minDistance <= PROXIMITY_THRESHOLD) {
                console.log(`✅ [PathManager] Lieu "${location.name}" détecté et ajouté aux découvertes`);
                this.discoveries.push({
                    type: 'location',
                    name: location.name,
                    discoveryIndex: closestIndex,
                    distance: minDistance,
                    proximityType: minDistance <= 20 ? 'traversed' : 'nearby',
                    mapId: location.mapId || null
                });
            }
        });
    }

    detectTraversedRegions() {
        if (!this.dataManager.regionsData?.regions) return;

        const activeMapUrl = window.settingsManager?.activeMapUrl;

        this.dataManager.regionsData.regions.forEach(region => {
            // Utiliser 'coordinates' au lieu de 'points' pour le nouveau format
            const regionCoords = region.coordinates || region.points;
            if (!regionCoords || regionCoords.length < 3) return;

            // Filtrer par mapId : n'afficher que les régions compatibles avec la carte active
            if (activeMapUrl) {
                const regionMapId = region.mapId;
                
                // Si la région a un mapId défini et qu'il ne correspond pas à la carte active, l'ignorer
                if (regionMapId && regionMapId !== null && regionMapId !== undefined) {
                    if (String(regionMapId) !== String(activeMapUrl)) {
                        console.log(`⏭️ [PathManager] Région "${region.name}" ignorée (mapId: ${regionMapId} ≠ ${activeMapUrl})`);
                        return; // Ignorer cette région
                    }
                }
                // Si la région n'a pas de mapId, elle est compatible avec toutes les cartes
            }

            const intersections = [];

            // Vérifier les intersections du tracé avec la région
            for (let i = 1; i < this.path.length; i++) {
                const point = this.path[i];

                if (this.isPointInPolygon(point, regionCoords)) {
                    intersections.push(i);
                }
            }

            if (intersections.length > 0) {
                const entryIndex = Math.min(...intersections);
                const exitIndex = Math.max(...intersections);

                console.log(`✅ [PathManager] Région "${region.name}" traversée et ajoutée aux découvertes`);

                // Stocker le segment de région
                this.regionSegments.set(region.name, {
                    entryIndex: entryIndex,
                    exitIndex: exitIndex,
                    region: region
                });

                this.discoveries.push({
                    type: 'region',
                    name: region.name,
                    discoveryIndex: entryIndex,
                    proximityType: 'traversed',
                    mapId: region.mapId || null
                });
            }
        });
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
}

export default PathManager;