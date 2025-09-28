
class EventManager {
    constructor(domElements, callbacks) {
        this.dom = domElements;
        this.callbacks = callbacks;
    }

    setupAllEventListeners() {
        this.setupViewportEvents();
        this.setupToolbarEvents();
        this.setupModalEvents();
        this.setupFilterEvents();
        this.setupAuthEvents();
    }

    setupViewportEvents() {
        // Déplacer tous les event listeners du viewport ici
        this.dom.viewport.addEventListener('wheel', this.callbacks.handleWheel);
        this.dom.viewport.addEventListener('mousedown', this.callbacks.handleMouseDown);
        this.dom.viewport.addEventListener('mousemove', this.callbacks.handleMouseMove);
        // etc...
    }

    setupToolbarEvents() {
        // Déplacer tous les event listeners de la toolbar ici
        this.dom.getElementById('draw-mode').addEventListener('click', this.callbacks.handleDrawMode);
        this.dom.getElementById('add-location-mode').addEventListener('click', this.callbacks.handleAddLocation);
        // etc...
    }

    setupModalEvents() {
        // Event listeners des modales
    }

    setupFilterEvents() {
        // Event listeners des filtres
    }

    setupAuthEvents() {
        // Event listeners d'authentification
    }
}

export default EventManager;
