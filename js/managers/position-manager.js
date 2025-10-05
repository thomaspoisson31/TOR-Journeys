
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
    }

    setupEventListeners() {
        if (!this.positionMarker) return;

        // Événements de glisser-déposer
        this.positionMarker.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Clic gauche seulement
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

        // Double-clic pour ouvrir la modal
        this.positionMarker.addEventListener('dblclick', (e) => {
            if (!this.isDragging) {
                e.stopPropagation();
                this.showPositionModal();
            }
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

    showPositionModal() {
        // Créer la modal si elle n'existe pas
        let modal = document.getElementById('position-modal');
        if (!modal) {
            modal = this.createPositionModal();
            document.body.appendChild(modal);
        }

        // Mettre à jour le contenu
        this.updateModalContent(modal);

        // Afficher la modal
        modal.classList.remove('hidden');
    }

    createPositionModal() {
        const modal = document.createElement('div');
        modal.id = 'position-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] hidden';

        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold flex items-center">
                        <i class="fas fa-map-marker-alt mr-2"></i>
                        Position des aventuriers
                    </h3>
                    <button id="close-position-modal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="space-y-4">
                    <div class="bg-gray-900 rounded-lg p-4">
                        <h4 class="text-sm font-semibold text-gray-400 mb-3">Coordonnées</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Position X</label>
                                <div id="position-x" class="text-2xl font-bold text-blue-400"></div>
                                <div class="text-xs text-gray-500">pixels</div>
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Position Y</label>
                                <div id="position-y" class="text-2xl font-bold text-blue-400"></div>
                                <div class="text-xs text-gray-500">pixels</div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gray-900 rounded-lg p-4">
                        <h4 class="text-sm font-semibold text-gray-400 mb-2">Actions</h4>
                        <button id="center-position-btn" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                            <i class="fas fa-crosshairs mr-2"></i>
                            Centrer la carte sur cette position
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        modal.querySelector('#close-position-modal').addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.querySelector('#center-position-btn').addEventListener('click', () => {
            this.centerMapOnPosition();
            modal.classList.add('hidden');
        });

        // Fermer en cliquant à l'extérieur
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
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
