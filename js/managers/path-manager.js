
class PathManager {
    constructor(domElements, dataManager) {
        this.dom = domElements;
        this.dataManager = dataManager;
        this.isDrawingMode = false;
        this.canvas = null;
        this.ctx = null;
        this.path = [];
        this.totalDistance = 0;
        this.lastPoint = null;
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

        // Variables pour le tracé
        this.isDrawing = false;

        // Événements de tracé sur le viewport (pas le canvas)
        const viewport = document.getElementById('viewport');
        if (viewport) {
            viewport.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            viewport.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            viewport.addEventListener('mouseup', (e) => this.handleMouseUp(e));
            viewport.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
        }
    }

    handleMouseDown(e) {
        if (!this.isDrawingMode) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        this.isDrawing = true;
        const point = this.getMapCoordinates(e);
        
        if (this.path.length === 0) {
            // Premier point - commencer le tracé
            this.path.push(point);
            this.ctx.beginPath();
            this.ctx.moveTo(point.x, point.y);
            console.log('🎯 Début du tracé de chemin à', point);
        } else {
            // Continuer le tracé
            this.path.push(point);
            this.ctx.lineTo(point.x, point.y);
            this.ctx.stroke();
        }

        this.lastPoint = point;
        this.updatePathData();
    }

    handleMouseMove(e) {
        if (!this.isDrawingMode || !this.isDrawing || !this.lastPoint) return;

        e.preventDefault();
        const currentPoint = this.getMapCoordinates(e);

        // Dessiner une ligne continue
        this.path.push(currentPoint);
        this.ctx.lineTo(currentPoint.x, currentPoint.y);
        this.ctx.stroke();

        this.lastPoint = currentPoint;
        this.updatePathData();
    }

    handleMouseUp(e) {
        if (!this.isDrawingMode) return;
        
        this.isDrawing = false;
        this.lastPoint = null;
        console.log(`🛤️ Segment de chemin complété (${this.path.length} points)`);
    }

    getMapCoordinates(e) {
        const viewport = document.getElementById('viewport');
        const mapContainer = document.getElementById('map-container');
        
        if (!viewport || !mapContainer) return { x: 0, y: 0 };

        const viewportRect = viewport.getBoundingClientRect();
        const viewportX = e.clientX - viewportRect.left;
        const viewportY = e.clientY - viewportRect.top;

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
        const mapX = (viewportX - panX) / scale;
        const mapY = (viewportY - panY) / scale;

        return {
            x: Math.round(mapX),
            y: Math.round(mapY)
        };
    }

    setupCanvasStyle() {
        this.ctx.strokeStyle = '#ff6b35';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    toggleDrawingMode() {
        this.isDrawingMode = !this.isDrawingMode;
        const drawModeBtn = document.getElementById('draw-mode');
        const viewport = document.getElementById('viewport');

        if (this.isDrawingMode) {
            if (drawModeBtn) {
                drawModeBtn.classList.add('btn-active');
                drawModeBtn.title = 'Arrêter le tracé';
            }
            if (viewport) {
                viewport.classList.add('drawing');
                viewport.style.cursor = 'crosshair';
            }
            
            // Activer le canvas pour recevoir les événements
            this.canvas.style.pointerEvents = 'auto';
            
            console.log('✏️ Mode dessin activé - Cliquez et glissez pour tracer');
        } else {
            if (drawModeBtn) {
                drawModeBtn.classList.remove('btn-active');
                drawModeBtn.title = 'Tracer un voyage';
            }
            if (viewport) {
                viewport.classList.remove('drawing');
                viewport.style.cursor = 'grab';
            }
            
            // Désactiver le canvas
            this.canvas.style.pointerEvents = 'none';
            
            console.log('✏️ Mode dessin désactivé');
        }

        // Mettre à jour les variables globales
        window.isDrawingMode = this.isDrawingMode;
    }

    

    clearPath() {
        this.path = [];
        this.discoveries = [];
        this.regionSegments.clear();
        this.totalDistance = 0;
        this.lastPoint = null;

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

        this.dataManager.locationsData.locations.forEach(location => {
            if (!location.coordinates) return;

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
                this.discoveries.push({
                    type: 'location',
                    name: location.name,
                    discoveryIndex: closestIndex,
                    distance: minDistance,
                    proximityType: minDistance <= 20 ? 'traversed' : 'nearby'
                });
            }
        });
    }

    detectTraversedRegions() {
        if (!this.dataManager.regionsData?.regions) return;

        this.dataManager.regionsData.regions.forEach(region => {
            // Utiliser 'coordinates' au lieu de 'points' pour le nouveau format
            const regionCoords = region.coordinates || region.points;
            if (!regionCoords || regionCoords.length < 3) return;

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
                    proximityType: 'traversed'
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

        // Convertir pixels en miles (basé sur les constantes de la carte)
        const miles = this.totalDistance * (MAP_DISTANCE_MILES / MAP_WIDTH);
        const days = Math.ceil(miles / 20); // 20 miles par jour

        distanceDisplay.innerHTML = `
            <div class="text-sm">
                <div><strong>${Math.round(miles)} miles</strong></div>
                <div class="text-gray-400">${days} jour${days > 1 ? 's' : ''} de voyage</div>
            </div>
        `;
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
