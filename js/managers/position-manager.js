class PositionManager {
    constructor(domElements, mapConstants) {
        this.dom = domElements;
        this.mapConstants = mapConstants;
        this.positionMarker = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.currentPosition = this.loadPosition();
        this.adventureMode = this.loadAdventureMode(); // Nouvel état pour le mode aventure
    }

    loadAdventureMode() {
        const savedMode = localStorage.getItem('adventurers_adventure_mode');
        return savedMode === 'true'; // Retourne true si 'true', sinon false par défaut
    }

    saveAdventureMode() {
        localStorage.setItem('adventurers_adventure_mode', this.adventureMode.toString());
        console.log(`💾 [PositionManager.saveAdventureMode] Mode Aventure sauvegardé: ${this.adventureMode}`);
    }

    toggleAdventureMode() {
        this.adventureMode = !this.adventureMode;
        this.saveAdventureMode();
        this.updateMarkerCursor(); // Mettre à jour le curseur
        this.updatePositionModal(); // Mettre à jour la modal avec le nouvel état

        // Si le mode aventure est activé, désactiver le glissement manuel immédiatement
        if (this.adventureMode) {
            this.isDragging = false;
            this.positionMarker.style.cursor = 'default'; // Changer le curseur si le mode aventure est actif
        } else {
            this.updateMarkerCursor(); // Réinitialiser le curseur si le mode aventure est désactivé
        }

        // Si le mode aventure est activé, et que l'on vient de le désactiver, alors il faut réactiver le drag et mettre à jour le curseur
        if (!this.adventureMode) {
            this.updateMarkerCursor();
        }

        // Marquer comme modifié et synchroniser avec le cloud
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }

        // Mettre à jour la visibilité des boutons de la toolbar
        if (typeof window.updateToolbarButtonsVisibility === 'function') {
            window.updateToolbarButtonsVisibility();
        }
    }

    updateMarkerCursor() {
        if (!this.positionMarker) return;

        if (this.adventureMode) {
            // En mode aventure, le marqueur ne doit pas être déplaçable manuellement
            this.positionMarker.style.cursor = 'default'; 
        } else {
            // Sinon, curseur de déplacement par défaut
            this.positionMarker.style.cursor = 'move';
        }
    }

    init() {
        console.log("📍 Initializing PositionManager...");
        this.createPositionMarker();
        this.setupEventListeners();
        this.updateMarkerCursor(); // Initialiser le curseur
        this.updateAdventureModeIndicator(); // Afficher l'indicateur dès le chargement
        console.log("✅ PositionManager initialized with position:", this.currentPosition);
        console.log("✅ Mode Aventure initial:", this.adventureMode ? "Actif" : "Inactif");
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
            // Ne pas permettre le drag si le mode dessin est actif OU si le mode aventure est actif
            if (e.button === 0 && !window.isDrawingMode && !this.adventureMode) { 
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
            if (window.isDrawingMode || this.adventureMode) return; // Ne pas démarrer si mode dessin ou mode aventure

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
        modal.style.minWidth = '250px'; // Augmenté

        modal.innerHTML = `
            <div class="space-y-2">
                <div class="flex items-center justify-between text-xs text-gray-400">
                    <span>Mode Aventure:</span>
                    <span id="adventure-mode-status" class="font-bold px-2 py-1 rounded-full"></span>
                </div>

                <button id="adventure-mode-toggle-btn" class="w-full px-2 py-1 rounded text-xs transition-colors flex items-center justify-center font-semibold">
                    <span id="adventure-mode-toggle-text"></span>
                </button>
            </div>
        `;

        // Gestionnaire d'événement pour le bouton d'activation/désactivation du mode aventure
        const toggleButton = modal.querySelector('#adventure-mode-toggle-btn');
        toggleButton.addEventListener('click', () => {
            this.toggleAdventureMode();
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

    updatePositionModal(modal) {
        if (!modal) modal = document.getElementById('position-modal');
        if (!modal) return;

        const statusSpan = modal.querySelector('#adventure-mode-status');
        const toggleButton = modal.querySelector('#adventure-mode-toggle-btn');

        if (!statusSpan || !toggleButton) return;

        // Mise à jour de l'affichage du statut et du bouton
        if (this.adventureMode) {
            statusSpan.textContent = "Actif";
            statusSpan.style.backgroundColor = '#22C55E'; // Vert
            statusSpan.style.color = '#fff';

            toggleButton.textContent = "Interrompre mode Aventure";
            toggleButton.style.backgroundColor = '#F97316'; // Orange
            toggleButton.style.color = '#fff';
            toggleButton.style.borderColor = '#EA580C';
        } else {
            statusSpan.textContent = "Inactif";
            statusSpan.style.backgroundColor = '#6B7280'; // Gris
            statusSpan.style.color = '#fff';

            toggleButton.textContent = "Activer mode Aventure";
            toggleButton.style.backgroundColor = '#22C55E'; // Vert
            toggleButton.style.color = '#fff';
            toggleButton.style.borderColor = '#16A34A';
        }

        // Mettre à jour l'indicateur dans le cartouche de date
        this.updateAdventureModeIndicator();
    }

    updateAdventureModeIndicator() {
        const indicator = document.getElementById('adventure-mode-indicator');
        if (!indicator) return;

        if (this.adventureMode) {
            indicator.classList.remove('hidden');
        } else {
            indicator.classList.add('hidden');
        }
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