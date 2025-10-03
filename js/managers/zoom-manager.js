
// ZoomManager - Gestion du zoom avec interface visuelle
export default class ZoomManager {
    constructor(domUtils, mapConstants) {
        this.domUtils = domUtils;
        this.mapConstants = mapConstants;
        
        // Références DOM
        this.zoomControl = null;
        this.zoomSlider = null;
        this.zoomMarker = null;
        this.zoomTrack = null;
        this.zoomPercentageDisplay = null;
        this.zoomOutBtn = null;
        this.zoomInBtn = null;
        
        // État du drag
        this.isDragging = false;
        this.sliderWidth = 0;
        
        // Callbacks externes (seront définis par main.js)
        this.onZoomChange = null;
    }
    
    init() {
        console.log("🔍 Initializing ZoomManager...");
        this.createZoomBar();
        this.setupEventListeners();
        this.updateDisplay();
        console.log("✅ ZoomManager initialized");
    }
    
    createZoomBar() {
        // Créer le conteneur principal
        const zoomControl = document.createElement('div');
        zoomControl.id = 'zoom-control';
        zoomControl.className = 'fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20 bg-gray-900 bg-opacity-80 backdrop-filter backdrop-blur-sm rounded-lg p-3 border border-gray-700';
        
        zoomControl.innerHTML = `
            <div class="flex items-center gap-3">
                <button id="zoom-out-btn" class="zoom-btn" title="Dézoomer">
                    <i class="fas fa-minus"></i>
                </button>
                <div id="zoom-slider-container" class="relative">
                    <div id="zoom-track" class="zoom-track"></div>
                    <div id="zoom-marker" class="zoom-marker"></div>
                </div>
                <button id="zoom-in-btn" class="zoom-btn" title="Zoomer">
                    <i class="fas fa-plus"></i>
                </button>
                <span id="zoom-percentage" class="text-sm text-gray-300 ml-2">100%</span>
                <button id="zoom-reset-btn" class="zoom-btn ml-1" title="Réinitialiser le zoom">
                    <i class="fas fa-home"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(zoomControl);
        
        // Récupérer les références DOM
        this.zoomControl = zoomControl;
        this.zoomSlider = document.getElementById('zoom-slider-container');
        this.zoomMarker = document.getElementById('zoom-marker');
        this.zoomTrack = document.getElementById('zoom-track');
        this.zoomPercentageDisplay = document.getElementById('zoom-percentage');
        this.zoomOutBtn = document.getElementById('zoom-out-btn');
        this.zoomInBtn = document.getElementById('zoom-in-btn');
        this.zoomResetBtn = document.getElementById('zoom-reset-btn');
        
        // Calculer la largeur du slider
        this.sliderWidth = this.zoomTrack.offsetWidth;
    }
    
    setupEventListeners() {
        // Bouton zoom out
        this.zoomOutBtn.addEventListener('click', () => {
            this.adjustZoom(-0.2);
        });
        
        // Bouton zoom in
        this.zoomInBtn.addEventListener('click', () => {
            this.adjustZoom(0.2);
        });
        
        // Bouton reset
        this.zoomResetBtn.addEventListener('click', () => {
            if (typeof window.resetView === 'function') {
                window.resetView();
            }
        });
        
        // Clic sur la barre pour sauter à un niveau de zoom
        this.zoomTrack.addEventListener('click', (e) => {
            if (!this.isDragging) {
                this.handleSliderClick(e);
            }
        });
        
        // Drag du marqueur
        this.zoomMarker.addEventListener('mousedown', (e) => {
            this.startDrag(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.handleSliderDrag(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.stopDrag();
            }
        });
    }
    
    startDrag(event) {
        event.preventDefault();
        this.isDragging = true;
        this.zoomMarker.style.cursor = 'grabbing';
    }
    
    stopDrag() {
        this.isDragging = false;
        this.zoomMarker.style.cursor = 'grab';
    }
    
    handleSliderDrag(event) {
        const rect = this.zoomTrack.getBoundingClientRect();
        let x = event.clientX - rect.left;
        
        // Contraindre dans les limites
        x = Math.max(0, Math.min(x, this.sliderWidth));
        
        // Calculer le nouveau niveau de zoom
        const ratio = x / this.sliderWidth;
        const newScale = this.mapConstants.minScale + ratio * (this.mapConstants.maxScale - this.mapConstants.minScale);
        
        this.setZoomLevel(newScale);
    }
    
    handleSliderClick(event) {
        const rect = this.zoomTrack.getBoundingClientRect();
        let x = event.clientX - rect.left;
        
        // Contraindre dans les limites
        x = Math.max(0, Math.min(x, this.sliderWidth));
        
        // Calculer le nouveau niveau de zoom
        const ratio = x / this.sliderWidth;
        const newScale = this.mapConstants.minScale + ratio * (this.mapConstants.maxScale - this.mapConstants.minScale);
        
        this.setZoomLevel(newScale);
    }
    
    setZoomLevel(newScale) {
        // Contraindre le scale dans les limites
        newScale = Math.max(this.mapConstants.minScale, Math.min(this.mapConstants.maxScale, newScale));
        
        // Appeler le callback de changement de zoom
        if (this.onZoomChange) {
            this.onZoomChange(newScale);
        }
        
        // Mettre à jour l'affichage
        this.updateDisplay();
    }
    
    adjustZoom(delta) {
        const currentScale = window.scale || 1;
        const newScale = currentScale + delta;
        this.setZoomLevel(newScale);
    }
    
    updateSliderPosition() {
        const currentScale = window.scale || 1;
        const ratio = (currentScale - this.mapConstants.minScale) / (this.mapConstants.maxScale - this.mapConstants.minScale);
        const x = ratio * this.sliderWidth;
        
        this.zoomMarker.style.left = `${x}px`;
    }
    
    getZoomPercentage() {
        const currentScale = window.scale || 1;
        return Math.round(currentScale * 100);
    }
    
    updateDisplay() {
        this.updateSliderPosition();
        this.zoomPercentageDisplay.textContent = `${this.getZoomPercentage()}%`;
    }
}
