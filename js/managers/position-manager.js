class PositionManager {
    constructor(domElements, mapConstants) {
        this.dom = domElements;
        this.mapConstants = mapConstants;
        this.positionMarker = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.currentPosition = this.loadPosition();
        this.adventureMode = this.loadAdventureMode(); // Nouvel état pour le mode aventure (string: 'admin', 'mj', 'player')
        this.savedFilters = null; // Sauvegarde des filtres avant activation du mode Aventure
        this.isLocked = window.isViewerMode || false; // Verrouillage du mode (pour le viewer)
    }

    setLockedMode(locked) {
        this.isLocked = locked;
    }

    loadAdventureMode() {
        // Si le mode Viewer est actif, forcer le mode joueur
        if (this.isLocked || window.isViewerMode) return 'player';

        const savedMode = localStorage.getItem('adventurers_adventure_mode');
        // Migration de la compatibilité ascendante
        if (savedMode === 'true') return 'mj';
        if (savedMode === 'false') return 'admin';
        // Si c'est déjà une chaîne valide, la retourner, sinon par défaut 'admin'
        if (['admin', 'mj', 'player'].includes(savedMode)) return savedMode;
        return 'admin';
    }

    saveAdventureMode() {
        localStorage.setItem('adventurers_adventure_mode', this.adventureMode);
        console.log(`💾 [PositionManager.saveAdventureMode] Mode Aventure sauvegardé: ${this.adventureMode}`);
    }

    toggleAdventureMode() {
        if (this.isLocked) {
            console.warn("🔒 Mode Aventure verrouillé, impossible de changer.");
            return;
        }

        // Cycle : Admin -> MJ -> Player -> Admin
        const previousMode = this.adventureMode;

        if (this.adventureMode === 'admin') {
            this.adventureMode = 'mj';
        } else if (this.adventureMode === 'mj') {
            this.adventureMode = 'player';
        } else {
            this.adventureMode = 'admin';
        }

        console.log(`🎮 Mode Aventure changé: ${previousMode} -> ${this.adventureMode}`);

        // Gérer les filtres et l'état
        const isNowActive = this.isAdventureActive();
        const wasActive = previousMode !== 'admin';

        if (isNowActive && !wasActive) {
            // Activation du mode aventure (MJ ou Player) depuis Admin
            this.saveFiltersBeforeAdventureMode();
            this.applyAdventureModeFilters();
        } else if (!isNowActive && wasActive) {
            // Désactivation (retour à Admin)
            this.restoreFiltersAfterAdventureMode();
        } else if (isNowActive && wasActive) {
            // Changement entre MJ et Player : réappliquer les filtres pour être sûr
            // (techniquement les filtres sont les mêmes, mais ça ne fait pas de mal)
            this.applyAdventureModeFilters();
        }

        // Mettre à jour l'indicateur visuel
        this.updateAdventureModeIndicator();

        // Mettre à jour la classe CSS du body
        this.updateBodyClass();

        // Sauvegarder l'état
        this.saveAdventureMode();

        // Réinitialiser le drag en cours si besoin
        if (isNowActive) {
            this.isDragging = false;
        }
        // Le marqueur de position reste toujours déplaçable
        if (this.positionMarker) {
            this.positionMarker.style.cursor = 'move';
        }

        // Mettre à jour la visibilité des boutons de la toolbar
        if (typeof window.updateToolbarButtonsVisibility === 'function') {
            window.updateToolbarButtonsVisibility();
        }

        // Si la modale de position est ouverte, la mettre à jour
        const positionModal = document.getElementById('position-modal');
        if (positionModal && !positionModal.classList.contains('hidden')) {
            this.updatePositionModal(positionModal);
        }
    }

    // Helper pour savoir si on est en mode aventure (MJ ou Player)
    isAdventureActive() {
        return this.adventureMode === 'mj' || this.adventureMode === 'player';
    }

    updateBodyClass() {
        document.body.classList.remove('mode-admin', 'mode-mj', 'mode-player');
        document.body.classList.add(`mode-${this.adventureMode}`);
    }

    saveFiltersBeforeAdventureMode() {
        // Utiliser this.dom.filterManager si window.filterManager n'est pas encore disponible
        const filterManager = window.filterManager;
        if (!filterManager) {
            console.warn('⚠️ [PositionManager] FilterManager non encore initialisé');
            return;
        }

        // Sauvegarder une COPIE PROFONDE des filtres actuels
        this.savedFilters = JSON.parse(JSON.stringify(filterManager.getActiveFilters()));
        console.log('💾 [PositionManager] Filtres sauvegardés avant mode Aventure:', this.savedFilters);
    }

    applyAdventureModeFilters() {
        const filterManager = window.filterManager;
        if (!filterManager) {
            console.warn('⚠️ [PositionManager] FilterManager non encore initialisé');
            return;
        }

        console.log(`🎮 [PositionManager] Application des filtres du mode Aventure (${this.adventureMode})`);

        // Forcer les filtres : Régions non affichées + Lieux Connus uniquement (ou Visités en Viewer)
        let modeFilters = {
            showRegions: false,  // Masquer les régions
            showLocations: true  // Afficher les lieux
        };

        if (window.isViewerMode) {
            console.log('🔒 [PositionManager] Mode Viewer détecté: Affichage uniquement des lieux visités');
            modeFilters.visited = ['visited']; // Uniquement les lieux visités
            modeFilters.known = [];            // Désactiver le filtre connu
        } else {
            modeFilters.known = ['known'];     // Uniquement les lieux connus (Mode MJ/Joueur standard)
        }

        filterManager.activeFilters = {
            ...filterManager.activeFilters,
            ...modeFilters
        };

        // Mettre à jour l'interface des filtres
        filterManager.updateFilterUI();

        // NE PAS sauvegarder dans filtersByMap pendant le mode Aventure
        // Appliquer les filtres SANS sauvegarder
        const originalSaveMethod = filterManager.saveFiltersForCurrentMap;
        filterManager.saveFiltersForCurrentMap = () => {
            console.log('⚠️ [PositionManager] Sauvegarde des filtres désactivée pendant mode Aventure');
        };

        filterManager.applyFilters();

        // Restaurer la méthode de sauvegarde
        filterManager.saveFiltersForCurrentMap = originalSaveMethod;

        console.log('✅ [PositionManager] Filtres du mode Aventure appliqués:', filterManager.activeFilters);
    }

    restoreFiltersAfterAdventureMode() {
        const filterManager = window.filterManager;
        if (!filterManager) {
            console.warn('⚠️ [PositionManager] FilterManager non encore initialisé');
            return;
        }

        if (!this.savedFilters) {
            console.warn('⚠️ [PositionManager] Pas de filtres sauvegardés à restaurer');
            // Par défaut, afficher tous les lieux (connus ET inconnus)
            filterManager.activeFilters = {
                colors: [],
                visited: [],
                known: [], // Vide = afficher tout
                types: [],
                showLocations: true,
                showRegions: false,
                regionsOpacity: 0.5
            };
        } else {
            console.log('🔄 [PositionManager] Restauration des filtres précédents:', this.savedFilters);
            // Restaurer les filtres sauvegardés
            filterManager.activeFilters = JSON.parse(JSON.stringify(this.savedFilters));
        }

        // Mettre à jour l'interface des filtres
        filterManager.updateFilterUI();

        // Appliquer les filtres restaurés (cette fois avec sauvegarde)
        filterManager.applyFilters();

        console.log('✅ [PositionManager] Filtres restaurés avec succès:', filterManager.activeFilters);
    }

    updateMarkerCursor() {
        if (!this.positionMarker) return;
        // Le marqueur de position est toujours déplaçable (même en mode aventure)
        this.positionMarker.style.cursor = 'move';
    }

    updateAdventureModeIndicator() {
        const indicator = document.getElementById('adventure-mode-indicator');
        if (indicator) {
            indicator.classList.remove('hidden');
            indicator.classList.remove('bg-gray-600', 'bg-green-600', 'bg-orange-600');

            if (this.adventureMode === 'mj') {
                indicator.classList.add('bg-green-600');
                indicator.textContent = 'Mode MJ';
            } else if (this.adventureMode === 'player') {
                indicator.classList.add('bg-orange-600'); // Utiliser orange pour joueur
                indicator.textContent = 'Mode Joueur';
            } else {
                indicator.classList.add('bg-gray-600');
                indicator.textContent = 'Mode Admin';
            }
        }
    }

    init() {
        console.log("📍 Initializing PositionManager...");
        this.createPositionMarker();
        this.setupEventListeners();
        this.updateMarkerCursor(); // Initialiser le curseur
        this.updateAdventureModeIndicator(); // Afficher l'indicateur dès le chargement
        this.updateBodyClass(); // Initialiser la classe CSS du body

        // IMPORTANT: Appliquer les filtres du mode Aventure si actif au chargement
        if (this.isAdventureActive()) {
            console.log("🎮 [PositionManager.init] Mode Aventure actif au chargement - application des filtres");
            // Attendre que FilterManager soit disponible
            setTimeout(() => {
                if (window.filterManager) {
                    this.applyAdventureModeFilters();
                } else {
                    console.warn("⚠️ [PositionManager.init] FilterManager non disponible");
                }
            }, 100);
        }

        console.log("✅ PositionManager initialized with position:", this.currentPosition);
        console.log("✅ Mode Aventure initial:", this.adventureMode);
    }

    loadPosition() {
        const fromCloud = localStorage.getItem('adventurers_position_from_cloud');
        const activeMapId = window.settingsManager?.activeMapUrl;

        console.log("📍 [PositionManager.loadPosition] État du flag cloud:", fromCloud);
        console.log("📍 [PositionManager.loadPosition] Carte active:", activeMapId);

        const saved = localStorage.getItem('adventurers_position');
        console.log("📍 [PositionManager.loadPosition] Position dans localStorage:", saved);

        if (saved) {
            try {
                const position = JSON.parse(saved);

                if (position.mapId && activeMapId && position.mapId !== activeMapId) {
                    console.log("📍 [PositionManager] Position d'une autre carte, utilisation position par défaut");
                    return this.getDefaultPosition();
                }

                if (fromCloud === 'true') {
                    console.log("📍 [PositionManager] Position chargée depuis CLOUD via localStorage:", position);
                } else {
                    console.log("📍 [PositionManager] Position chargée depuis localStorage local:", position);
                }

                return position;
            } catch (e) {
                console.error("❌ [PositionManager] Erreur parsing position:", e);
                localStorage.removeItem('adventurers_position_from_cloud');
            }
        }

        return this.getDefaultPosition();
    }

    getDefaultPosition() {
        const activeMapId = window.settingsManager?.activeMapUrl;
        const defaultPosition = {
            x: this.mapConstants.MAP_WIDTH / 2,
            y: this.mapConstants.MAP_HEIGHT / 2,
            mapId: activeMapId
        };
        console.log("📍 [PositionManager] Utilisation de la position par défaut:", defaultPosition);
        return defaultPosition;
    }

    savePosition() {
        const activeMapId = window.settingsManager?.activeMapUrl;
        const positionToSave = {
            x: this.currentPosition.x,
            y: this.currentPosition.y,
            mapId: activeMapId
        };

        console.log("💾 [PositionManager.savePosition] Sauvegarde position:", positionToSave);
        localStorage.setItem('adventurers_position', JSON.stringify(positionToSave));

        const cloudFlag = localStorage.getItem('adventurers_position_from_cloud');
        console.log("💾 [PositionManager.savePosition] Flag cloud après save:", cloudFlag);
    }

    createPositionMarker() {
        const positionLayer = this.dom.getElementById('position-layer');
        if (!positionLayer) {
            console.error("❌ Position layer not found");
            return;
        }

        const existingMarkers = positionLayer.querySelectorAll('.position-marker');
        existingMarkers.forEach(marker => marker.remove());
        console.log(`📍 [PositionManager] ${existingMarkers.length} marqueur(s) existant(s) supprimé(s)`);

        this.positionMarker = document.createElement('div');
        this.positionMarker.id = 'position-marker';
        this.positionMarker.className = 'position-marker';
        this.positionMarker.title = 'Position des aventuriers';

        const img = document.createElement('img');
        img.src = '/images/markers/Position.png';
        img.alt = 'Position';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.display = 'block';

        img.onerror = () => {
            this.positionMarker.innerHTML = '<div style="font-size: 48px; line-height: 64px; text-align: center;">📍</div>';
        };

        this.positionMarker.appendChild(img);
        this.updateMarkerPosition();
        this.positionMarker.style.cursor = 'move'; // Le marqueur de position est toujours déplaçable
        positionLayer.appendChild(this.positionMarker);
    }

    updateMarkerPosition() {
        if (!this.positionMarker) return;

        this.positionMarker.style.left = `${this.currentPosition.x}px`;
        this.positionMarker.style.top = `${this.currentPosition.y}px`;
        this.updateMarkerSize();
    }

    updateMarkerSize() {
        if (!this.positionMarker) return;

        const currentScale = window.scale || 1;
        const zoomPercentage = currentScale * 100;
        const sizeMultiplier = zoomPercentage < 50 ? 2 : 1;
        const baseSize = 64;
        const newSize = baseSize * sizeMultiplier;

        this.positionMarker.style.width = `${newSize}px`;
        this.positionMarker.style.height = `${newSize}px`;
        this.checkRumoursProximity();
    }

    checkRumoursProximity() {
        if (!this.positionMarker || !window.locationsData || !window.locationsData.locations) return;

        const PROXIMITY_THRESHOLD = 100;
        let nearRumours = false;

        for (const location of window.locationsData.locations) {
            const hasRumours = (location.Rumeurs && location.Rumeurs.length > 0 &&
                               location.Rumeurs.some(r => r && r !== "A définir")) ||
                              (location.Rumeur && location.Rumeur !== "A définir");

            if (hasRumours && location.coordinates) {
                const dx = location.coordinates.x - this.currentPosition.x;
                const dy = location.coordinates.y - this.currentPosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= PROXIMITY_THRESHOLD) {
                    nearRumours = true;
                    break;
                }
            }
        }

        if (!nearRumours && window.regionsData && window.regionsData.regions) {
            for (const region of window.regionsData.regions) {
                const hasRumours = (region.Rumeurs && region.Rumeurs.length > 0 &&
                                   region.Rumeurs.some(r => r && r !== "A définir")) ||
                                  (region.Rumeur && region.Rumeur !== "A définir");

                if (hasRumours && region.points && region.points.length > 0) {
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

        // --- Gestion du glisser-déposer (souris) ---
        this.positionMarker.addEventListener('mousedown', (e) => {
            // En mode dessin, laisser passer l'événement pour PathManager
            if (window.isDrawingMode) {
                console.log("📍 [PositionManager] Mode dessin actif - propagation du clic vers PathManager");
                // Ne pas empêcher la propagation - laisser PathManager gérer
                return;
            }
            
            // Permettre le drag du marqueur de position (même en mode aventure)
            if (e.button === 0) {
                this.handleDragStart(e);
            }
        });

        this.dragMoveHandler = (e) => {
            if (this.isDragging) {
                this.handleDrag(e);
            }
        };

        this.dragEndHandler = (e) => {
            if (this.isDragging && e.button === 0) {
                this.handleDragEnd(e);
            }
        };

        document.addEventListener('mousemove', this.dragMoveHandler);
        document.addEventListener('mouseup', this.dragEndHandler);

        // --- Événements tactiles pour mobile ---
        let touchStartTime = 0;
        let touchHasMoved = false;

        this.positionMarker.addEventListener('touchstart', (e) => {
            if (window.isDrawingMode) {
                // En mode dessin, laisser passer l'événement pour PathManager
                console.log("📍 [PositionManager] Mode dessin actif - propagation du touch vers PathManager");
                // Ne pas bloquer la propagation
                return;
            }
            
            touchStartTime = Date.now();
            touchHasMoved = false;

            const touch = e.touches[0];
            this.isDragging = true;
            this.dragStartX = touch.clientX;
            this.dragStartY = touch.clientY;

            const viewport = this.dom.getElementById('viewport');
            if (viewport) {
                viewport.style.pointerEvents = 'none';
            }
            e.stopPropagation();
        }, { passive: false });

        this.positionMarker.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;

            touchHasMoved = true;
            e.preventDefault();

            const touch = e.touches[0];
            const scale = window.scale || 1;
            const deltaX = touch.clientX - this.dragStartX;
            const deltaY = touch.clientY - this.dragStartY;

            const mapDeltaX = deltaX / scale;
            const mapDeltaY = deltaY / scale;

            const newX = this.currentPosition.x + mapDeltaX;
            const newY = this.currentPosition.y + mapDeltaY;

            this.currentPosition.x = Math.max(0, Math.min(this.mapConstants.MAP_WIDTH, newX));
            this.currentPosition.y = Math.max(0, Math.min(this.mapConstants.MAP_HEIGHT, newY));

            this.updateMarkerPosition();
            this.checkRumoursProximity();

            this.dragStartX = touch.clientX;
            this.dragStartY = touch.clientY;
        }, { passive: false });

        this.positionMarker.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;

            e.preventDefault();
            e.stopPropagation();

            if (this.isDragging) {
                this.isDragging = false;
                const viewport = this.dom.getElementById('viewport');
                if (viewport) {
                    viewport.style.pointerEvents = 'auto';
                }

                this.savePosition();
                if (typeof window.markAsUnsaved === 'function') {
                    window.markAsUnsaved();
                }
                if (typeof window.scheduleAutoSync === 'function') {
                    window.scheduleAutoSync();
                }
            }

            // Si c'est un long press sans mouvement, ouvrir la modal
            if (!touchHasMoved && touchDuration >= 500) {
                this.showPositionModal(e);
            }
        }, { passive: false });

        // Clic droit pour ouvrir la modal compacte (desktop)
        this.positionMarker.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.showPositionModal(e);
            return false;
        });

        // Gestionnaire global pour fermer la modale au clic droit en dehors
        document.addEventListener('contextmenu', (e) => {
            const modal = document.getElementById('position-modal');
            if (modal && !modal.classList.contains('hidden')) {
                // Vérifier si le clic est en dehors de la modale et du marqueur
                if (!modal.contains(e.target) && !this.positionMarker.contains(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                    modal.classList.add('hidden');
                    return false;
                }
            }
        });

        // Mise à jour du curseur au survol
        this.positionMarker.addEventListener('mouseenter', () => {
            if (!this.isDragging && !window.isDrawingMode) {
                this.updateMarkerCursor();
            }
        });

        this.positionMarker.addEventListener('mouseleave', () => {
            if (!this.isDragging && !window.isDrawingMode) {
                this.positionMarker.style.cursor = 'pointer'; // Retour au curseur par défaut
            }
        });
    }

    handleDragStart(e) {
        e.stopPropagation();
        e.preventDefault();

        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;

        this.positionMarker.style.cursor = 'move'; // Curseur de déplacement pendant le drag

        const viewport = this.dom.getElementById('viewport');
        if (viewport) {
            viewport.style.pointerEvents = 'none';
        }
    }

    handleDrag(e) {
        if (!this.isDragging) return;

        e.preventDefault();

        const scale = window.scale || 1;
        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;

        const mapDeltaX = deltaX / scale;
        const mapDeltaY = deltaY / scale;

        const newX = this.currentPosition.x + mapDeltaX;
        const newY = this.currentPosition.y + mapDeltaY;

        this.currentPosition.x = Math.max(0, Math.min(this.mapConstants.MAP_WIDTH, newX));
        this.currentPosition.y = Math.max(0, Math.min(this.mapConstants.MAP_HEIGHT, newY));

        this.updateMarkerPosition();
        this.checkRumoursProximity();

        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
    }

    handleDragEnd(e) {
        if (!this.isDragging) return;

        this.isDragging = false;
        // Le curseur est géré par updateMarkerCursor() appelée après la sauvegarde

        const viewport = this.dom.getElementById('viewport');
        if (viewport) {
            viewport.style.pointerEvents = 'auto';
        }

        this.savePosition();
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }
        this.updateMarkerCursor(); // Mettre à jour le curseur après le drag end
    }

    showPositionModal(event) {
        let modal = document.getElementById('position-modal');
        if (!modal) {
            modal = this.createPositionModal();
            document.body.appendChild(modal);
        }

        this.updatePositionModal(modal); // Utilisation de la nouvelle méthode

        if (event) {
            const modalWidth = 250; // Ajusté pour le nouveau contenu
            const modalHeight = 150; // Ajusté pour le nouveau contenu

            let left = event.clientX + 10;
            let top = event.clientY - modalHeight / 2;

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

        modal.classList.remove('hidden');
    }

    createPositionModal() {
        const modal = document.createElement('div');
        modal.id = 'position-modal';
        modal.className = 'hidden absolute z-50 bg-gray-900 bg-opacity-95 border border-gray-700 rounded-lg p-3 shadow-xl';
        modal.style.minWidth = '280px';
        modal.style.maxWidth = '400px';

        modal.innerHTML = `
            <div class="space-y-2">
                <div class="flex items-center justify-between text-xs text-gray-400">
                    <span>Mode Aventure:</span>
                    <span id="adventure-mode-status" class="font-bold px-2 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity" title="Cliquer pour basculer"></span>
                </div>

                <div id="position-nearby-locations" class="hidden pt-2 border-t border-gray-600">
                    <div id="nearby-locations-list" class="space-y-1"></div>
                </div>

                <div id="position-current-regions" class="hidden pt-2 border-t border-gray-600">
                    <div id="current-regions-list" class="space-y-1"></div>
                </div>
            </div>
        `;

        // Gestionnaire d'événement pour le statut cliquable
        const statusSpan = modal.querySelector('#adventure-mode-status');
        statusSpan.addEventListener('click', () => {
            this.toggleAdventureMode();
        });

        // Fermer en cliquant ailleurs (clic gauche uniquement)
        document.addEventListener('click', (e) => {
            if (modal.classList.contains('hidden')) return;
            if (!modal.contains(e.target) && !this.positionMarker.contains(e.target)) {
                modal.classList.add('hidden');
            }
        }, true);

        return modal;
    }

    updatePositionModal(modal) {
        if (!modal) modal = document.getElementById('position-modal');
        if (!modal) return;

        const statusSpan = modal.querySelector('#adventure-mode-status');

        if (!statusSpan) return;

        // Gérer le verrouillage visuel
        if (this.isLocked) {
            statusSpan.style.pointerEvents = 'none';
            statusSpan.style.opacity = '0.7';
            statusSpan.title = "Mode verrouillé";
        } else {
            statusSpan.style.pointerEvents = 'auto';
            statusSpan.style.opacity = '1';
            statusSpan.title = "Cliquer pour basculer";
        }

        // Mise à jour de l'affichage du statut
        if (this.adventureMode === 'mj') {
            statusSpan.textContent = "MJ";
            statusSpan.style.backgroundColor = '#22C55E'; // Vert
            statusSpan.style.color = '#fff';
        } else if (this.adventureMode === 'player') {
            statusSpan.textContent = "Joueur";
            statusSpan.style.backgroundColor = '#F97316'; // Orange (Tailwind orange-500 approx)
            statusSpan.style.color = '#fff';
        } else {
            statusSpan.textContent = "Admin";
            statusSpan.style.backgroundColor = '#6B7280'; // Gris
            statusSpan.style.color = '#fff';
        }

        // Mettre à jour l'indicateur dans le cartouche de date
        this.updateAdventureModeIndicator();

        // Mettre à jour les lieux et régions
        this.updateNearbyLocationsAndRegions(modal);
    }

    updateNearbyLocationsAndRegions(modal) {
        if (!modal) modal = document.getElementById('position-modal');
        if (!modal) return;

        const nearbyLocationsSection = modal.querySelector('#position-nearby-locations');
        const nearbyLocationsList = modal.querySelector('#nearby-locations-list');
        const currentRegionsSection = modal.querySelector('#position-current-regions');
        const currentRegionsList = modal.querySelector('#current-regions-list');

        if (!nearbyLocationsSection || !nearbyLocationsList || !currentRegionsSection || !currentRegionsList) return;

        const PROXIMITY_THRESHOLD = 100; // pixels
        const colorMap = {
            red: '#EF4444',
            blue: '#3B82F6',
            green: '#22C55E',
            violet: '#8B5CF6',
            orange: '#FCA503',
            black: '#111827',
            yellow: '#EACC08',
            purple: '#9333EA',
            gray: '#6B7280'
        };

        // Trouver les lieux à proximité
        const nearbyLocations = [];
        if (window.locationsData && window.locationsData.locations) {
            const activeMapId = window.settingsManager?.activeMapUrl;

            window.locationsData.locations.forEach(location => {
                if (location.coordinates && (!location.mapId || location.mapId === activeMapId)) {
                    const dx = location.coordinates.x - this.currentPosition.x;
                    const dy = location.coordinates.y - this.currentPosition.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= PROXIMITY_THRESHOLD) {
                        nearbyLocations.push({
                            name: location.name,
                            color: location.color || 'gray',
                            distance: Math.round(distance),
                            data: location
                        });
                    }
                }
            });
        }

        // Trouver les régions traversées
        const currentRegions = [];
        if (window.regionsData && window.regionsData.regions) {
            const activeMapId = window.settingsManager?.activeMapUrl;

            window.regionsData.regions.forEach(region => {
                // Extraire les points depuis différentes structures possibles
                let points = [];
                if (region.points && Array.isArray(region.points)) {
                    points = region.points;
                } else if (region.coordinates?.points && Array.isArray(region.coordinates.points)) {
                    points = region.coordinates.points;
                } else if (Array.isArray(region.coordinates)) {
                    points = region.coordinates;
                }

                // Vérifier que la région a des coordonnées valides
                if (points.length >= 3 && (!region.mapId || region.mapId === activeMapId)) {
                    // Vérifier si le point est dans le polygone
                    if (this.isPointInPolygon(this.currentPosition, points)) {
                        currentRegions.push({
                            name: region.name,
                            color: region.color || 'gray',
                            data: region
                        });
                    }
                }
            });
        }

        const isAdventureActive = this.isAdventureActive();

        // Afficher les lieux à proximité
        if (nearbyLocations.length > 0) {
            nearbyLocationsSection.classList.remove('hidden');
            nearbyLocationsList.innerHTML = nearbyLocations
                .sort((a, b) => a.distance - b.distance)
                .map(loc => {
                    const bgColor = colorMap[loc.color] || colorMap.gray;
                    const escapedName = loc.name.replace(/'/g, "\\'");
                    const exploreIcon = isAdventureActive ? `<i class="fas fa-compass ml-2 cursor-pointer hover:text-yellow-400 transition-colors" onclick="window.positionManager.explorePlace('${escapedName}', 'location')" title="Explorer"></i>` : '';
                    return `<div class="text-xs px-2 py-1 rounded flex items-center justify-between" style="background-color: ${bgColor}30; border-left: 3px solid ${bgColor};">
                        <span class="font-medium text-white">${loc.name}</span>
                        ${exploreIcon}
                    </div>`;
                })
                .join('');
        } else {
            nearbyLocationsSection.classList.add('hidden');
        }

        // Afficher les régions survolées
        if (currentRegions.length > 0) {
            currentRegionsSection.classList.remove('hidden');
            currentRegionsList.innerHTML = currentRegions
                .map(reg => {
                    const bgColor = colorMap[reg.color] || colorMap.gray;
                    const escapedName = reg.name.replace(/'/g, "\\'");
                    const exploreIcon = isAdventureActive ? `<i class="fas fa-compass ml-2 cursor-pointer hover:text-yellow-400 transition-colors" onclick="window.positionManager.explorePlace('${escapedName}', 'region')" title="Explorer"></i>` : '';
                    return `<div class="text-xs px-2 py-1 rounded flex items-center justify-between" style="background-color: ${bgColor}30; border-left: 3px solid ${bgColor};">
                        <span class="font-medium text-white">${reg.name}</span>
                        ${exploreIcon}
                    </div>`;
                })
                .join('');
        } else {
            currentRegionsSection.classList.add('hidden');
        }
    }

    explorePlace(placeName, placeType) {
        console.log(`🧭 Exploration de ${placeType}: ${placeName}`);

        // Ajouter une entrée au journal d'aventure
        if (window.journalManager) {
            // Obtenir la date actuelle du calendrier
            let currentDate = 'Date inconnue';
            if (window.calendarManager && window.calendarManager.currentCalendarDate) {
                const calDate = window.calendarManager.currentCalendarDate;
                currentDate = `${calDate.day} ${calDate.month}`;
            }

            // Créer une nouvelle entrée de journal au format attendu par JournalManager
            const newEntry = {
                title: `Exploration - ${placeName}`,
                totalDays: 1,
                generatedAt: new Date().toISOString(),
                journeyType: 'exploration', // Identifier comme exploration
                days: [{
                    dayNumber: 1,
                    calendarDate: currentDate,
                    weatherSymbol: null,
                    discoveries: [],
                    description: `**Exploration de ${placeType === 'location' ? 'lieu' : 'région'}**\n\n${placeName}`,
                    eventResult: null,
                    startCoordinates: null
                }]
            };

            // Ajouter au journal
            window.journalManager.loadJournal();
            window.journalManager.journal.unshift(newEntry);
            localStorage.setItem('travelJournal', JSON.stringify(window.journalManager.journal));

            // Incrémenter la date du calendrier de +1 jour après l'exploration
            if (window.calendarManager && window.calendarManager.isCalendarMode && window.calendarManager.currentCalendarDate && window.calendarManager.calendarData) {
                const calDate = window.calendarManager.currentCalendarDate;
                const monthIndex = window.calendarManager.calendarData.findIndex(m => m.name === calDate.month);

                if (monthIndex >= 0) {
                    let newDay = calDate.day + 1;
                    let newMonthIndex = monthIndex;

                    // Gérer le passage au mois suivant
                    const month = window.calendarManager.calendarData[monthIndex];
                    const maxDays = month.days.length;

                    if (newDay > maxDays) {
                        newDay = 1;
                        newMonthIndex = (monthIndex + 1) % window.calendarManager.calendarData.length;
                    }

                    // Mettre à jour la date
                    window.calendarManager.currentCalendarDate = {
                        month: window.calendarManager.calendarData[newMonthIndex].name,
                        day: newDay
                    };

                    // Mettre à jour la saison
                    const newSeason = window.calendarManager.calendarData[newMonthIndex].season.toLowerCase();
                    window.calendarManager.currentSeason = newSeason;

                    // Sauvegarder et afficher
                    window.calendarManager.updateSeasonDisplay();
                    window.calendarManager.saveCalendarToLocal();

                    console.log(`📅 Date du calendrier incrémentée après exploration : ${newDay} ${window.calendarManager.calendarData[newMonthIndex].name}`);
                }
            }

            // Marquer comme non sauvegardé
            if (typeof window.markAsUnsaved === 'function') {
                window.markAsUnsaved();
            }

            console.log(`📖 Entrée ajoutée au journal d'aventure:`, newEntry);

            // Notification visuelle
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            notification.innerHTML = '<i class="fas fa-check mr-2"></i>Ajouté au journal';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }

        // Ouvrir la modale du lieu/région
        if (placeType === 'location') {
            const location = window.locationsData?.locations.find(loc => loc.name === placeName);
            if (location && window.infoBoxManager) {
                // Fermer la modale de position
                const positionModal = document.getElementById('position-modal');
                if (positionModal) {
                    positionModal.classList.add('hidden');
                }

                // Ouvrir l'infobox du lieu
                const fakeEvent = {
                    clientX: window.innerWidth / 2,
                    clientY: window.innerHeight / 2,
                    type: 'click'
                };
                window.infoBoxManager.showInfoBox(fakeEvent, location, 'location');
            }
        } else if (placeType === 'region') {
            const region = window.regionsData?.regions.find(reg => reg.name === placeName);
            if (region && window.infoBoxManager) {
                // Fermer la modale de position
                const positionModal = document.getElementById('position-modal');
                if (positionModal) {
                    positionModal.classList.add('hidden');
                }

                // Ouvrir l'infobox de la région
                const fakeEvent = {
                    clientX: window.innerWidth / 2,
                    clientY: window.innerHeight / 2,
                    type: 'click'
                };
                window.infoBoxManager.showInfoBox(fakeEvent, region, 'region');
            }
        }
    }

    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    centerMapOnPosition() {
        // Cette fonction est supprimée car le bouton "Centrer" a été retiré de la modal.
        console.warn("La fonction centerMapOnPosition() a été appelée mais le bouton correspondant a été retiré de la modal.");
    }

    // Méthode pour mettre à jour la position programmatiquement
    setPosition(x, y) {
        const activeMapId = window.settingsManager?.activeMapUrl;
        this.currentPosition = { x, y, mapId: activeMapId };
        this.updateMarkerPosition();
        this.savePosition();
        this.updatePositionModal(); // Mettre à jour la modal si elle est ouverte
    }

    // Méthode pour obtenir la position actuelle
    getPosition() {
        return { ...this.currentPosition };
    }

    // Méthode pour animer le déplacement du marqueur vers une nouvelle position
    animateToPosition(targetX, targetY, duration = 1000) {
        const startX = this.currentPosition.x;
        const startY = this.currentPosition.y;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const currentX = startX + (targetX - startX) * easeProgress;
            const currentY = startY + (targetY - startY) * easeProgress;

            this.currentPosition.x = currentX;
            this.currentPosition.y = currentY;
            this.updateMarkerPosition();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                const activeMapId = window.settingsManager?.activeMapUrl;
                this.currentPosition = {
                    x: targetX,
                    y: targetY,
                    mapId: activeMapId
                };
                this.updateMarkerPosition();
                this.savePosition();

                if (typeof window.markAsUnsaved === 'function') {
                    window.markAsUnsaved();
                }
                if (typeof window.scheduleAutoSync === 'function') {
                    window.scheduleAutoSync();
                }

                console.log(`📍 Marqueur de position déplacé au début du tracé: (${Math.round(targetX)}, ${Math.round(targetY)})`);
            }
        };

        requestAnimationFrame(animate);
    }
}

export default PositionManager;