
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

        // Événements de tracé sur le canvas
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
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
            
            // Activer les événements sur le canvas
            if (typeof window.toggleDrawingEvents === 'function') {
                window.toggleDrawingEvents(true);
            }
            
            console.log('✏️ Mode dessin activé');
        } else {
            if (drawModeBtn) {
                drawModeBtn.classList.remove('btn-active');
                drawModeBtn.title = 'Tracer un voyage';
            }
            if (viewport) {
                viewport.classList.remove('drawing');
                viewport.style.cursor = 'grab';
            }
            
            // Désactiver les événements sur le canvas
            if (typeof window.toggleDrawingEvents === 'function') {
                window.toggleDrawingEvents(false);
            }
            
            console.log('✏️ Mode dessin désactivé');
        }

        // Mettre à jour les variables globales
        window.isDrawingMode = this.isDrawingMode;
    }

    onMouseDown(e) {
        if (!this.isDrawingMode) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const point = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };

        if (this.path.length === 0) {
            // Premier point - commencer le tracé
            this.path.push(point);
            this.ctx.beginPath();
            this.ctx.moveTo(point.x, point.y);
            console.log('🎯 Début du tracé de chemin');
        } else {
            // Continuer le tracé
            this.path.push(point);
            this.ctx.lineTo(point.x, point.y);
            this.ctx.stroke();
        }

        this.lastPoint = point;
        this.updatePathData();
    }

    onMouseMove(e) {
        if (!this.isDrawingMode || !this.lastPoint) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const currentPoint = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };

        // Dessiner une ligne continue
        this.path.push(currentPoint);
        this.ctx.lineTo(currentPoint.x, currentPoint.y);
        this.ctx.stroke();

        this.lastPoint = currentPoint;
        this.updatePathData();
    }

    onMouseUp(e) {
        if (!this.isDrawingMode) return;
        
        // Finaliser le segment actuel
        this.lastPoint = null;
        console.log(`🛤️ Segment de chemin complété (${this.path.length} points)`);
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
