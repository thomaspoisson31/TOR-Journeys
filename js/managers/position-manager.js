
class PositionManager {
    constructor(domElements, mapConstants) {
        this.dom = domElements;
        this.mapConstants = mapConstants;
        this.positionMarker = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.currentPosition = this.loadPosition();
    }

    init() {
        console.log("📍 Initializing PositionManager...");
        this.createPositionMarker();
        this.setupEventListeners();
        console.log("✅ PositionManager initialized");
    }

    loadPosition() {
        const saved = localStorage.getItem('adventurers_position');
        if (saved) {
            return JSON.parse(saved);
        }
        // Position par défaut au centre de la carte
        return {
            x: this.mapConstants.MAP_WIDTH / 2,
            y: this.mapConstants.MAP_HEIGHT / 2
        };
    }

    savePosition() {
        localStorage.setItem('adventurers_position', JSON.stringify(this.currentPosition));
        console.log("💾 Position saved:", this.currentPosition);
    }

    createPositionMarker() {
        const positionLayer = this.dom.getElementById('position-layer');
        if (!positionLayer) {
            console.error("❌ Position layer not found");
            return;
        }

        // Créer le marqueur de position
        this.positionMarker = document.createElement('div');
        this.positionMarker.id = 'position-marker';
        this.positionMarker.className = 'position-marker';
        this.positionMarker.title = 'Position des aventuriers';
        
        // Créer l'image
        const img = document.createElement('img');
        img.src = '/images/markers/Position.png';
        img.alt = 'Position';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
        
        // Gestion des erreurs de chargement de l'image
        img.onerror = () => {
            // Afficher un emoji de secours
            this.positionMarker.innerHTML = '<div style="font-size: 48px; line-height: 64px; text-align: center;">📍</div>';
        };

        this.positionMarker.appendChild(img);

        // Positionner le marqueur
        this.updateMarkerPosition();

        // Ajouter à la couche dédiée
        positionLayer.appendChild(this.positionMarker);
    }

    updateMarkerPosition() {
        if (!this.positionMarker) return;

        this.positionMarker.style.left = `${this.currentPosition.x}px`;
        this.positionMarker.style.top = `${this.currentPosition.y}px`;
        
        // Adapter la taille selon le zoom
        this.updateMarkerSize();
    }
    
    updateMarkerSize() {
        if (!this.positionMarker) return;
        
        const currentScale = window.scale || 1;
        const zoomPercentage = currentScale * 100;
        
        // Taille x2 en dessous de 50%, taille normale au-dessus
        const sizeMultiplier = zoomPercentage < 50 ? 2 : 1;
        
        const baseSize = 64;
        const newSize = baseSize * sizeMultiplier;
        
        this.positionMarker.style.width = `${newSize}px`;
        this.positionMarker.style.height = `${newSize}px`;
        
        // Vérifier la proximité avec les lieux ayant des rumeurs
        this.checkRumoursProximity();
    }

    checkRumoursProximity() {
        if (!this.positionMarker || !window.locationsData || !window.locationsData.locations) return;

        const PROXIMITY_THRESHOLD = 100; // 100 pixels
        let nearRumours = false;

        // Vérifier chaque lieu
        for (const location of window.locationsData.locations) {
            // Vérifier si le lieu a des rumeurs
            const hasRumours = (location.Rumeurs && location.Rumeurs.length > 0 && 
                               location.Rumeurs.some(r => r && r !== "A définir")) ||
                              (location.Rumeur && location.Rumeur !== "A définir");

            if (hasRumours && location.coordinates) {
                // Calculer la distance
                const dx = location.coordinates.x - this.currentPosition.x;
                const dy = location.coordinates.y - this.currentPosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= PROXIMITY_THRESHOLD) {
                    nearRumours = true;
                    break;
                }
            }
        }

        // Vérifier les régions ayant des rumeurs
        if (!nearRumours && window.regionsData && window.regionsData.regions) {
            for (const region of window.regionsData.regions) {
                // Vérifier si la région a des rumeurs
                const hasRumours = (region.Rumeurs && region.Rumeurs.length > 0 && 
                                   region.Rumeurs.some(r => r && r !== "A définir")) ||
                                  (region.Rumeur && region.Rumeur !== "A définir");

                if (hasRumours && region.points && region.points.length > 0) {
                    // Calculer la distance au centre de la région
                    const centerX = region.points.reduce((sum, p) => sum + p.x, 0) / region.points.length;
                    const centerY = region.points.reduce((sum, p) => sum + p.y, 0) / region.points.length;
                    
                    const dx = centerX - this.currentPosition.x;
                    const dy = centerY - this.currentPosition.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= PROXIMITY_THRESHOLD) {
                        nearRumours = true;
                        break;
                    }
                }
            }
        }

        // Appliquer ou retirer le cadre jaune
        if (nearRumours) {
            this.positionMarker.style.border = '4px solid #FCD34D';
            this.positionMarker.style.borderRadius = '8px';
            this.positionMarker.style.boxShadow = '0 0 20px rgba(252, 211, 77, 0.6)';
        } else {
            this.positionMarker.style.border = 'none';
            this.positionMarker.style.borderRadius = '0';
            this.positionMarker.style.boxShadow = 'none';
        }
    }

    setupEventListeners() {
        if (!this.positionMarker) return;

        // Événements de glisser-déposer
        this.positionMarker.addEventListener('mousedown', (e) => {
            // Ne pas permettre le drag si le mode dessin est actif
            if (e.button === 0 && !window.isDrawingMode) { // Clic gauche seulement et pas en mode dessin
                this.handleDragStart(e);
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.handleDrag(e);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (this.isDragging && e.button === 0) {
                this.handleDragEnd(e);
            }
        });

        // Clic droit pour ouvrir la modal compacte
        this.positionMarker.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showPositionModal(e);
        });
    }

    handleDragStart(e) {
        e.stopPropagation();
        e.preventDefault();

        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;

        this.positionMarker.style.cursor = 'move';
    }

    handleDrag(e) {
        if (!this.isDragging) return;

        e.preventDefault();

        const scale = window.scale || 1;
        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;

        // Convertir le delta en coordonnées de la carte
        const mapDeltaX = deltaX / scale;
        const mapDeltaY = deltaY / scale;

        // Calculer les nouvelles coordonnées
        const newX = this.currentPosition.x + mapDeltaX;
        const newY = this.currentPosition.y + mapDeltaY;

        // Contraindre dans les limites de la carte
        this.currentPosition.x = Math.max(0, Math.min(this.mapConstants.MAP_WIDTH, newX));
        this.currentPosition.y = Math.max(0, Math.min(this.mapConstants.MAP_HEIGHT, newY));

        // Mettre à jour l'affichage
        this.updateMarkerPosition();

        // Vérifier la proximité avec les rumeurs
        this.checkRumoursProximity();

        // Mettre à jour les coordonnées de départ pour le prochain mouvement
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
    }

    handleDragEnd(e) {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.positionMarker.style.cursor = 'move';

        // Sauvegarder la nouvelle position
        this.savePosition();

        // Programmer la synchronisation
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }
    }

    showPositionModal(event) {
        // Créer la modal si elle n'existe pas
        let modal = document.getElementById('position-modal');
        if (!modal) {
            modal = this.createPositionModal();
            document.body.appendChild(modal);
        }

        // Mettre à jour le contenu
        this.updateModalContent(modal);

        // Positionner la modal près du curseur
        if (event) {
            const modalWidth = 180;
            const modalHeight = 100;
            
            let left = event.clientX + 10;
            let top = event.clientY - modalHeight / 2;

            // Vérifier les limites de l'écran
            if (left + modalWidth > window.innerWidth) {
                left = event.clientX - modalWidth - 10;
            }
            if (top < 10) {
                top = 10;
            }
            if (top + modalHeight > window.innerHeight - 10) {
                top = window.innerHeight - modalHeight - 10;
            }

            modal.style.left = `${left}px`;
            modal.style.top = `${top}px`;
        }

        // Afficher la modal
        modal.classList.remove('hidden');
    }

    createPositionModal() {
        const modal = document.createElement('div');
        modal.id = 'position-modal';
        modal.className = 'hidden absolute z-50 bg-gray-900 bg-opacity-95 border border-gray-700 rounded-lg p-3 shadow-xl';
        modal.style.minWidth = '180px';

        modal.innerHTML = `
            <div class="space-y-2">
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-400">X:</span>
                    <span id="position-x" class="font-bold text-blue-400"></span>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-400">Y:</span>
                    <span id="position-y" class="font-bold text-blue-400"></span>
                </div>
                <button id="center-position-btn" class="w-full mt-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors flex items-center justify-center">
                    <i class="fas fa-crosshairs mr-1"></i>
                    <span>Centrer</span>
                </button>
            </div>
        `;

        // Event listeners
        modal.querySelector('#center-position-btn').addEventListener('click', () => {
            this.centerMapOnPosition();
            modal.classList.add('hidden');
        });

        // Fermer en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (modal.classList.contains('hidden')) return;
            if (!modal.contains(e.target) && !this.positionMarker.contains(e.target)) {
                modal.classList.add('hidden');
            }
        });

        return modal;
    }

    updateModalContent(modal) {
        const xElement = modal.querySelector('#position-x');
        const yElement = modal.querySelector('#position-y');

        if (xElement) {
            xElement.textContent = Math.round(this.currentPosition.x);
        }
        if (yElement) {
            yElement.textContent = Math.round(this.currentPosition.y);
        }
    }

    centerMapOnPosition() {
        const viewport = this.dom.getElementById('viewport');
        if (!viewport) return;

        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;
        const currentScale = window.scale || 1;

        // Calculer le pan nécessaire pour centrer la position
        window.panX = viewportWidth / 2 - this.currentPosition.x * currentScale;
        window.panY = viewportHeight / 2 - this.currentPosition.y * currentScale;

        // Appliquer la transformation
        const mapContainer = this.dom.getElementById('map-container');
        if (mapContainer) {
            mapContainer.style.transform = `translate(${window.panX}px, ${window.panY}px) scale(${currentScale})`;
        }
    }

    // Méthode pour mettre à jour la position programmatiquement
    setPosition(x, y) {
        this.currentPosition = { x, y };
        this.updateMarkerPosition();
        this.savePosition();
    }

    // Méthode pour obtenir la position actuelle
    getPosition() {
        return { ...this.currentPosition };
    }
}

export default PositionManager;
