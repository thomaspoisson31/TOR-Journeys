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
        this.touchStartTime = 0;
        this.touchHasMoved = false;
        this.lastTapTime = 0;
        this.isJourneyFinalized = false; // Flag pour bloquer l'ajout de waypoints après finalisation
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
        const finishBtn = this.dom.getElementById('finish-journey-btn');
        const viewBtn = this.dom.getElementById('view-journey-btn');

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

        if (finishBtn) {
            finishBtn.addEventListener('click', () => {
                console.log('🏁 Bouton Terminer le voyage cliqué');
                if (this.path.length >= 2) {
                    this.finalizeJourney();
                } else {
                    console.log('⚠️ Il faut au moins 2 waypoints pour terminer un voyage');
                }
            });
        }

        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                console.log('👁️ Bouton Voir le voyage cliqué');
                const modal = this.dom.getElementById('voyage-segments-modal');
                if (modal && window.voyageManager) {
                    modal.classList.remove('hidden');
                    window.voyageManager.updateDisplay();
                    setTimeout(() => {
                        window.voyageManager.centerMapOnJourney();
                    }, 100);
                }
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
            viewport.addEventListener('dblclick', (e) => this.handleViewportDoubleClick(e));

            // Gestionnaires tactiles (mobile)
            viewport.addEventListener('touchstart', (e) => this.handleViewportTouchStart(e), { passive: false });
            viewport.addEventListener('touchmove', (e) => this.handleViewportTouchMove(e), { passive: false });
            viewport.addEventListener('touchend', (e) => this.handleViewportTouchEnd(e), { passive: false });
        }
    }

    handleViewportMouseDown(event) {
        console.log("🖱️ Viewport mousedown event fired, isDrawingMode:", this.isDrawingMode);

        // Handle drawing mode specifically - système waypoints
        if (this.isDrawingMode) {
            // Bloquer l'ajout de waypoints si le voyage est finalisé
            if (this.isJourneyFinalized) {
                console.log("⚠️ Voyage finalisé - impossible d'ajouter des waypoints. Recommencez un nouveau voyage.");
                return;
            }

            // Vérifier qu'on ne clique pas sur un marqueur de lieu/région ou l'infobox
            // MAIS permettre le clic sur le marqueur de position
            const clickedElement = event.target.closest('.location-marker, #info-box');
            const clickedPositionMarker = event.target.closest('.position-marker');
            
            if (clickedElement && !clickedPositionMarker) {
                console.log("❌ Clicked on marker or info box, ignoring");
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            // Si on clique sur le marqueur de position, utiliser ses coordonnées
            let clickPoint;
            if (clickedPositionMarker && window.positionManager && window.positionManager.currentPosition) {
                clickPoint = {
                    x: window.positionManager.currentPosition.x,
                    y: window.positionManager.currentPosition.y
                };
                console.log("📍 Waypoint ajouté à l'emplacement du marqueur de position:", clickPoint);
            } else {
                clickPoint = this.getCanvasCoordinates(event);
            }

            // Si c'est le premier clic (initialisation du voyage)
            if (this.path.length === 0) {
                console.log("🎨 Starting waypoint journey...");

                // Clear canvas
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.totalDistance = 0;
                this.regionSegments.clear();
                this.discoveries = [];

                // Utiliser la position du marqueur comme waypoint 0
                let startWaypoint;
                if (window.positionManager && window.positionManager.currentPosition) {
                    startWaypoint = {
                        x: window.positionManager.currentPosition.x,
                        y: window.positionManager.currentPosition.y
                    };
                    console.log("📍 Waypoint 0 (marqueur position):", startWaypoint);
                } else {
                    startWaypoint = clickPoint;
                    console.log("📍 Waypoint 0 (clic):", startWaypoint);
                }

                this.path.push(startWaypoint);
                this.lastPoint = startWaypoint;

                // Dessiner un point de départ
                this.ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(startWaypoint.x, startWaypoint.y, 6, 0, 2 * Math.PI);
                this.ctx.fill();

                // Le premier clic ajoute le waypoint 1 immédiatement
                console.log(`📍 Adding waypoint 1:`, clickPoint);

                this.path.push(clickPoint);

                // Dessiner la ligne depuis le marqueur
                this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
                this.ctx.lineWidth = 5;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
                this.ctx.lineTo(clickPoint.x, clickPoint.y);
                this.ctx.stroke();

                // Dessiner le waypoint
                this.ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(clickPoint.x, clickPoint.y, 6, 0, 2 * Math.PI);
                this.ctx.fill();

                this.lastPoint = clickPoint;

                this.showDistanceContainer();
                this.calculateTotalDistance();
                this.updateDistanceDisplay();
                this.showFinishButton();
                console.log("✅ Waypoint journey initialized with first waypoint");
            } else {
                // Ajouter un nouveau waypoint
                console.log(`📍 Adding waypoint ${this.path.length}:`, clickPoint);

                this.path.push(clickPoint);

                // Dessiner la ligne depuis le dernier waypoint
                this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
                this.ctx.lineWidth = 5;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
                this.ctx.lineTo(clickPoint.x, clickPoint.y);
                this.ctx.stroke();

                // Dessiner le waypoint
                this.ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(clickPoint.x, clickPoint.y, 6, 0, 2 * Math.PI);
                this.ctx.fill();

                this.lastPoint = clickPoint;

                // Calculer la distance totale
                this.calculateTotalDistance();
                this.updateDistanceDisplay();

                // Ne PAS afficher le bouton Voyage pendant le tracé
                // Il sera affiché uniquement lors de la finalisation

                console.log(`✅ Waypoint ${this.path.length} added - Total distance: ${this.totalDistance.toFixed(0)}px`);
            }

            return;
        }

        // Si pas en mode dessin, ne pas gérer l'événement ici
        // Laisser les autres gestionnaires s'en occuper
    }

    handleViewportMouseMove(event) {
        // Pas de mousemove handling dans le système waypoints
        // L'affichage se fait uniquement lors des clics
        return;
    }

    handleViewportMouseUp(event) {
        // Pas nécessaire dans le système waypoints
        return;
    }

    handleViewportDoubleClick(event) {
        if (!this.isDrawingMode) return;
        if (this.path.length < 2) return; // Il faut au moins 2 waypoints

        // Vérifier si on double-clique sur un marqueur de lieu/région
        const clickedElement = event.target.closest('.location-marker, #info-box');
        const clickedPositionMarker = event.target.closest('.position-marker');
        
        // Ignorer le double-clic sur les marqueurs de lieu/région (mais pas sur le marqueur de position)
        if (clickedElement && !clickedPositionMarker) {
            return;
        }

        console.log('🏁 Double-clic détecté - Fin du voyage');
        event.preventDefault();
        event.stopPropagation();

        // Finaliser le voyage
        this.finalizeJourney();
    }

    // Gestionnaires d'événements tactiles
    handleViewportTouchStart(event) {
        console.log("👆 Viewport touchstart event fired, isDrawingMode:", this.isDrawingMode);

        if (this.isDrawingMode) {
            // Vérifier qu'on ne touche pas un marqueur de lieu/région
            // MAIS permettre le touch sur le marqueur de position
            const touchedElement = event.target.closest('.location-marker, #info-box');
            const touchedPositionMarker = event.target.closest('.position-marker');
            
            if (touchedElement && !touchedPositionMarker) {
                console.log("❌ Touched on marker or info box, ignoring");
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            this.touchStartTime = Date.now();
            this.touchHasMoved = false;

            // Simuler un mousedown pour ajouter un waypoint
            // (la logique est gérée par handleViewportMouseDown)
            const fakeMouseEvent = {
                target: event.target,
                clientX: event.touches[0].clientX,
                clientY: event.touches[0].clientY,
                preventDefault: () => event.preventDefault(),
                stopPropagation: () => event.stopPropagation()
            };

            this.handleViewportMouseDown(fakeMouseEvent);
            return;
        }
    }

    handleViewportTouchMove(event) {
        if (!this.isDrawingMode) return;

        // Tracker si le doigt bouge (pour détecter appui long vs tap)
        this.touchHasMoved = true;
    }

    handleViewportTouchEnd(event) {
        if (!this.isDrawingMode) return;
        if (this.path.length === 0) return;

        const touchDuration = Date.now() - this.touchStartTime;

        // Vérifier si on touche un marqueur de lieu/région
        const touchedElement = event.target.closest('.location-marker, #info-box');
        const touchedPositionMarker = event.target.closest('.position-marker');
        
        // Ignorer les touches sur les marqueurs de lieu/région (mais pas sur le marqueur de position)
        if (touchedElement && !touchedPositionMarker) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        // Double tap = fin du voyage
        if (!this.touchHasMoved && touchDuration < 500) {
            // Détecter le double tap
            const now = Date.now();
            const timeSinceLastTap = now - (this.lastTapTime || 0);

            if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
                // C'est un double tap
                if (this.path.length >= 2) {
                    console.log('🏁 Double tap détecté - Fin du voyage');
                    this.finalizeJourney();
                    this.lastTapTime = 0; // Reset
                } else {
                    console.log('⚠️ Il faut au moins 2 waypoints pour terminer un voyage');
                }
            } else {
                // Premier tap, enregistrer le timestamp
                this.lastTapTime = now;
            }
        }
        // Sinon, c'est un tap normal qui sera géré par handleViewportTouchStart -> mousedown
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
            // Réinitialiser le flag de finalisation pour permettre un nouveau voyage
            this.isJourneyFinalized = false;

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
            this.isJourneyFinalized = false;

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

            // Nettoyer le tracé et l'affichage
            this.clearPath();

            // Réactiver les gestionnaires de pan
            this.enablePanHandlers();

            console.log('✏️ Mode dessin désactivé - pan réactivé - tracé effacé');
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
        this.isJourneyFinalized = false;

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
        this.hideFinishButton();
        this.hideViewJourneyButton();

        console.log('🧹 Chemin effacé');
    }

    updatePathData() {
        console.log('🔄 [updatePathData] DÉBUT');
        console.log('🔄 [updatePathData] path.length:', this.path.length);

        // Calculer la distance totale
        this.calculateTotalDistance();
        console.log('🔄 [updatePathData] totalDistance:', this.totalDistance);

        // ⚡ OPTIMISATION: Ne plus détecter les découvertes ici (sera fait en fin de tracé uniquement)
        // this.detectDiscoveries(); // SUPPRIMÉ pour performance

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

        // Ne PAS afficher le bouton de voyage ici
        // Il sera affiché uniquement lors de la finalisation

        console.log('🔄 [updatePathData] FIN');
    }

    finalizeJourney() {
        console.log('🏁 [finalizeJourney] Finalisation du voyage');
        console.log(`🏁 Voyage avec ${this.path.length} waypoints`);

        // Marquer le voyage comme finalisé pour bloquer l'ajout de waypoints
        this.isJourneyFinalized = true;

        // Calculer la distance totale finale
        this.calculateTotalDistance();

        // Détecter les découvertes (lieux et régions)
        console.log('🔍 Détection des lieux et régions traversés...');
        this.detectDiscoveries();

        // Mettre à jour les variables globales
        window.journeyPath = this.path;
        window.journeyDiscoveries = this.discoveries;
        window.totalPathPixels = this.totalDistance;
        window.regionSegments = this.regionSegments;

        // Mettre à jour l'affichage
        this.updateDistanceDisplay();

        // Masquer le bouton Terminer et afficher le bouton Voir
        this.hideFinishButton();
        this.showViewJourneyButton();

        console.log('✅ [finalizeJourney] Voyage finalisé:');
        console.log(`  - ${this.path.length} waypoints`);
        console.log(`  - ${this.totalDistance.toFixed(0)} pixels`);
        console.log(`  - ${this.discoveries.length} découvertes`);

        // Déplacer le marqueur au début du voyage
        if (window.positionManager && this.path.length > 0) {
            const startPoint = this.path[0];
            window.positionManager.animateToPosition(startPoint.x, startPoint.y);
        }

        // NE PAS désactiver le mode dessin après finalisation
        // L'icône reste active pour permettre de tracer un nouveau voyage immédiatement
        // Elle se désactivera uniquement par un clic manuel ou l'activation d'une autre icône

        // Informer l'utilisateur
        console.log('✅ Voyage finalisé - mode dessin reste actif mais bloqué pour ajout de waypoints');
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

    densifyPath(path, spacing = 25) {
        if (path.length < 2) return path;

        const densePath = [path[0]]; // Commencer avec le premier waypoint

        for (let i = 1; i < path.length; i++) {
            const start = path[i - 1];
            const end = path[i];

            // Calculer la distance du segment
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy);

            // Si le segment est court, juste ajouter le point final
            if (segmentLength <= spacing) {
                densePath.push(end);
                continue;
            }

            // Nombre de points intermédiaires à ajouter
            const numPoints = Math.floor(segmentLength / spacing);

            // Ajouter les points intermédiaires
            for (let j = 1; j <= numPoints; j++) {
                const ratio = (j * spacing) / segmentLength;
                densePath.push({
                    x: start.x + dx * ratio,
                    y: start.y + dy * ratio
                });
            }

            // Ajouter le point final du segment
            densePath.push(end);
        }

        console.log(`🔍 [densifyPath] Tracé densifié: ${path.length} waypoints → ${densePath.length} points (espacement: ${spacing}px)`);
        return densePath;
    }

    detectDiscoveries() {
        console.log('🔍 [detectDiscoveries] DÉBUT de la détection');

        // IMPORTANT: Synchroniser avec les données globales avant détection
        if (this.dataManager && typeof this.dataManager.syncFromGlobalData === 'function') {
            this.dataManager.syncFromGlobalData();
        }

        console.log('🔍 [detectDiscoveries] dataManager.locationsData:', this.dataManager.locationsData);
        console.log('🔍 [detectDiscoveries] dataManager.regionsData:', this.dataManager.regionsData);
        console.log('🔍 [detectDiscoveries] path.length:', this.path.length);

        if (!this.dataManager.locationsData && !this.dataManager.regionsData) {
            console.log('❌ [detectDiscoveries] Pas de données - ABANDON');
            return;
        }

        this.discoveries = [];
        this.regionSegments.clear();

        // Densifier le tracé pour une meilleure détection
        const densePath = this.densifyPath(this.path, 25);

        console.log('🔍 [detectDiscoveries] Appel de detectNearbyLocations...');
        // Détecter les lieux proches du tracé (avec tracé densifié)
        this.detectNearbyLocations(densePath);
        console.log('🔍 [detectDiscoveries] Après detectNearbyLocations - discoveries.length:', this.discoveries.length);

        console.log('🔍 [detectDiscoveries] Appel de detectTraversedRegions...');
        // Détecter les régions traversées (avec tracé densifié)
        this.detectTraversedRegions(densePath);
        console.log('🔍 [detectDiscoveries] Après detectTraversedRegions - discoveries.length:', this.discoveries.length);
        console.log('🔍 [detectDiscoveries] FIN - Total découvertes:', this.discoveries.length);
    }

    detectNearbyLocations(densePath = null) {
        console.log('📍 [detectNearbyLocations] DÉBUT');
        console.log('📍 [detectNearbyLocations] locationsData:', this.dataManager.locationsData);
        console.log('📍 [detectNearbyLocations] locations array:', this.dataManager.locationsData?.locations);

        if (!this.dataManager.locationsData?.locations) {
            console.log('❌ [detectNearbyLocations] Pas de données de lieux - ABANDON');
            return;
        }

        // Utiliser le tracé densifié si fourni, sinon le tracé original
        const pathToUse = densePath || this.path;

        const PROXIMITY_THRESHOLD = 80; // pixels
        const activeMapUrl = window.settingsManager?.activeMapUrl;

        console.log('📍 [detectNearbyLocations] activeMapUrl:', activeMapUrl);
        console.log('📍 [detectNearbyLocations] PROXIMITY_THRESHOLD:', PROXIMITY_THRESHOLD);
        console.log('📍 [detectNearbyLocations] Nombre total de lieux:', this.dataManager.locationsData.locations.length);
        console.log('📍 [detectNearbyLocations] Nombre de points du tracé:', pathToUse.length);

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

            // NOTE: Les lieux inconnus sont maintenant collectés dans les découvertes de voyage
            // même en mode Aventure, afin qu'ils puissent être marqués comme "Connus" 
            // lors de l'affichage de la modale de voyage (voir markDiscoveriesAsKnown)
            // La visibilité sur la carte reste gérée par le FilterManager

            // Calculer la distance minimale entre ce lieu et tous les SEGMENTS du tracé
            let minDistance = Infinity;
            let closestIndex = -1;

            // Vérifier la proximité avec chaque segment
            for (let i = 1; i < pathToUse.length; i++) {
                const segmentStart = pathToUse[i - 1];
                const segmentEnd = pathToUse[i];

                // Distance point-segment (perpendiculaire)
                const distance = this.pointToSegmentDistance(
                    location.coordinates,
                    segmentStart,
                    segmentEnd
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = i; // Index du segment
                }
            }

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

    detectTraversedRegions(densePath = null) {
        console.log('🗺️ [detectTraversedRegions] DÉBUT');
        console.log('🗺️ [detectTraversedRegions] regionsData:', this.dataManager.regionsData);
        console.log('🗺️ [detectTraversedRegions] regions array:', this.dataManager.regionsData?.regions);

        if (!this.dataManager.regionsData?.regions) {
            console.log('❌ [detectTraversedRegions] Pas de données de régions - ABANDON');
            return;
        }

        // CORRECTION: Toujours densifier le tracé pour garantir des indices cohérents
        const pathToUse = densePath || this.densifyPath(this.path, 25);
        
        console.log(`🗺️ [detectTraversedRegions] Tracé utilisé: ${pathToUse.length} points (original: ${this.path.length} waypoints)`);
        
        // Sauvegarder le tracé densifié globalement
        window.densifiedPath = pathToUse;

        const activeMapUrl = window.settingsManager?.activeMapUrl;

        console.log('🗺️ [detectTraversedRegions] activeMapUrl:', activeMapUrl);
        console.log('🗺️ [detectTraversedRegions] Nombre total de régions:', this.dataManager.regionsData.regions.length);
        console.log('🗺️ [detectTraversedRegions] Nombre de points du tracé:', pathToUse.length);

        let processedCount = 0;
        let skippedNoCoords = 0;
        let skippedMapId = 0;
        let skippedNoIntersection = 0;

        this.dataManager.regionsData.regions.forEach((region, index) => {
            console.log(`🗺️ [detectTraversedRegions] Traitement région ${index + 1}/${this.dataManager.regionsData.regions.length}: "${region.name}"`);

            const regionCoords = region.coordinates || region.points;
            console.log(`🗺️ [detectTraversedRegions] - regionCoords:`, regionCoords);
            console.log(`🗺️ [detectTraversedRegions] - mapId:`, region.mapId);

            if (!regionCoords || regionCoords.length < 3) {
                console.log(`⏭️ [detectTraversedRegions] - Région "${region.name}" ignorée: pas assez de coordonnées (${regionCoords?.length || 0} points)`);
                skippedNoCoords++;
                return;
            }

            // Filtrer par mapId
            if (activeMapUrl) {
                const regionMapId = region.mapId;
                if (regionMapId && regionMapId !== null && regionMapId !== undefined) {
                    if (String(regionMapId) !== String(activeMapUrl)) {
                        console.log(`⏭️ [detectTraversedRegions] - Région "${region.name}" ignorée (mapId: ${regionMapId} ≠ ${activeMapUrl})`);
                        skippedMapId++;
                        return;
                    } else {
                        console.log(`✅ [detectTraversedRegions] - Région "${region.name}" mapId compatible: ${regionMapId}`);
                    }
                } else {
                    console.log(`✅ [detectTraversedRegions] - Région "${region.name}" sans mapId (compatible avec toutes cartes)`);
                }
            }

            // Détecter tous les segments de traversée pour cette région
            const segments = [];
            let inRegion = false;
            let currentSegmentStart = -1;

            for (let i = 0; i < pathToUse.length; i++) {
                const point = pathToUse[i];
                const isInside = this.isPointInPolygon(point, regionCoords);

                if (isInside && !inRegion) {
                    // Entrée dans la région
                    currentSegmentStart = i;
                    inRegion = true;
                    console.log(`🗺️ [detectTraversedRegions] - "${region.name}" ENTRÉE à l'index ${i}`);
                } else if (!isInside && inRegion) {
                    // Sortie de la région
                    segments.push({
                        entryIndex: currentSegmentStart,
                        exitIndex: i - 1,
                        region: region
                    });
                    console.log(`🗺️ [detectTraversedRegions] - "${region.name}" SORTIE à l'index ${i - 1} (segment ${segments.length})`);
                    inRegion = false;
                }
            }

            // Si encore dans la région à la fin du tracé
            if (inRegion) {
                segments.push({
                    entryIndex: currentSegmentStart,
                    exitIndex: pathToUse.length - 1,
                    region: region
                });
                console.log(`🗺️ [detectTraversedRegions] - "${region.name}" FIN du tracé dans la région (segment ${segments.length})`);
            }

            if (segments.length > 0) {
                console.log(`🗺️ [detectTraversedRegions] - Région "${region.name}" traversée ${segments.length} fois`);

                // Ajouter la découverte (une seule fois, basée sur le premier segment)
                const regionDiscovery = {
                    type: 'region',
                    name: region.name,
                    discoveryIndex: segments[0].entryIndex,
                    proximityType: 'traversed',
                    mapId: region.mapId || null
                };
                this.discoveries.push(regionDiscovery);

                // Stocker TOUS les segments pour cette région
                if (!window.regionSegments) {
                    window.regionSegments = new Map();
                }
                window.regionSegments.set(region.name, segments);

                console.log(`✅ [detectTraversedRegions] - "${region.name}" ${segments.length} segment(s) stocké(s):`, segments);
                processedCount++;
            } else {
                console.log(`⏭️ [detectTraversedRegions] - Région "${region.name}" non traversée`);
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

    pointToSegmentDistance(point, segmentStart, segmentEnd) {
        // Distance du point au segment (perpendiculaire la plus courte)
        const px = point.x;
        const py = point.y;
        const x1 = segmentStart.x;
        const y1 = segmentStart.y;
        const x2 = segmentEnd.x;
        const y2 = segmentEnd.y;

        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    segmentIntersectsPolygon(segmentStart, segmentEnd, polygon) {
        // Vérifier si le segment intersecte un des côtés du polygone
        for (let i = 0; i < polygon.length; i++) {
            const polyStart = polygon[i];
            const polyEnd = polygon[(i + 1) % polygon.length];

            if (this.segmentsIntersect(segmentStart, segmentEnd, polyStart, polyEnd)) {
                return true;
            }
        }
        return false;
    }

    segmentsIntersect(p1, p2, p3, p4) {
        // Vérifier si deux segments s'intersectent
        const ccw = (A, B, C) => {
            return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
        };

        return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
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

    showFinishButton() {
        const finishBtn = this.dom.getElementById('finish-journey-btn');
        if (finishBtn) {
            finishBtn.classList.remove('hidden');
        }
    }

    hideFinishButton() {
        const finishBtn = this.dom.getElementById('finish-journey-btn');
        if (finishBtn) {
            finishBtn.classList.add('hidden');
        }
    }

    showViewJourneyButton() {
        const viewBtn = this.dom.getElementById('view-journey-btn');
        if (viewBtn) {
            viewBtn.classList.remove('hidden');
        }
    }

    hideViewJourneyButton() {
        const viewBtn = this.dom.getElementById('view-journey-btn');
        if (viewBtn) {
            viewBtn.classList.add('hidden');
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