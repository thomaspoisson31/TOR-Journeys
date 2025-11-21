
export default class VoyageManager {
    constructor(domHelpers, mapConstants) {
        this.domHelpers = domHelpers;
        this.mapConstants = mapConstants;
        
        // Références DOM
        this.voyageSegmentsBtn = null;
        this.voyageSegmentsModal = null;
        this.voyageDaysContent = null;
        
        // État du voyage
        this.currentVoyage = null;
        this.voyageSegments = [];
        this.currentSegmentIndex = 0;
        this.activatedSegments = new Set();
        
        console.log("🎨 VoyageManager constructed");
    }

    init() {
        console.log("🎨 VoyageManager initializing...");
        
        // Récupérer les références DOM
        this.voyageSegmentsBtn = this.domHelpers.getElementById('voyage-segments-btn');
        this.voyageSegmentsModal = this.domHelpers.getElementById('voyage-segments-modal');
        this.voyageDaysContent = this.domHelpers.getElementById('voyage-days-content');
        
        // Charger le voyage actif s'il existe
        this.loadCurrentVoyage();
        
        // Configurer les event listeners
        this.setupEventListeners();
        
        console.log("✅ VoyageManager initialized");
    }

    setupEventListeners() {
        // Bouton d'ouverture de la modal
        if (this.voyageSegmentsBtn) {
            this.voyageSegmentsBtn.addEventListener('click', () => this.openVoyageModal());
        }

        // Bouton de fermeture de la modal
        const closeBtn = this.domHelpers.getElementById('close-voyage-segments');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeVoyageModal());
        }
    }

    setupDrawingListeners() {
        console.log("🎨 VoyageManager drawing listeners configured");
        // Cette méthode sera appelée par main.js après l'initialisation
        // Les listeners de dessin sont gérés par PathManager
    }

    loadCurrentVoyage() {
        const savedVoyage = localStorage.getItem('currentVoyage');
        if (savedVoyage) {
            try {
                this.currentVoyage = JSON.parse(savedVoyage);
                console.log("📍 Voyage actif chargé:", this.currentVoyage);
            } catch (error) {
                console.error("❌ Erreur lors du chargement du voyage:", error);
            }
        }
    }

    saveCurrentVoyage() {
        if (this.currentVoyage) {
            localStorage.setItem('currentVoyage', JSON.stringify(this.currentVoyage));
            console.log("💾 Voyage sauvegardé");
        }
    }

    openVoyageModal() {
        if (this.voyageSegmentsModal) {
            this.voyageSegmentsModal.classList.remove('hidden');
            console.log("📖 Modal de voyage ouverte");
        }
    }

    closeVoyageModal() {
        if (this.voyageSegmentsModal) {
            this.voyageSegmentsModal.classList.add('hidden');
            console.log("📖 Modal de voyage fermée");
        }
    }

    // Méthodes utilitaires pour la compatibilité
    getVoyages() {
        return this.voyageSegments;
    }

    getCurrentVoyage() {
        return this.currentVoyage;
    }
}
