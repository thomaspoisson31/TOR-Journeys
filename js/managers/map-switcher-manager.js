class MapSwitcherManager {
    constructor() {
        this.container = null;
        this.thumbnailsContainer = null;
        this.tooltipElement = null;
    }

    init() {
        console.log('🗺️ MapSwitcherManager initialized');
        this.container = document.getElementById('map-switcher-container');
        this.thumbnailsContainer = document.getElementById('map-thumbnails');
        
        if (!this.container || !this.thumbnailsContainer) {
            console.warn('⚠️ MapSwitcherManager: Container not found');
            return;
        }

        this.createTooltip();
        this.renderThumbnails();
    }

    createTooltip() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.id = 'map-thumbnail-tooltip';
        this.tooltipElement.className = 'fixed z-[200] bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none opacity-0 transition-opacity duration-200 whitespace-nowrap';
        document.body.appendChild(this.tooltipElement);
    }

    showTooltip(text, event) {
        if (!this.tooltipElement) return;
        
        this.tooltipElement.textContent = text;
        this.tooltipElement.style.opacity = '1';
        
        const rect = event.target.getBoundingClientRect();
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 8;
        
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
            top = rect.bottom + 8;
        }
        
        this.tooltipElement.style.left = `${left}px`;
        this.tooltipElement.style.top = `${top}px`;
    }

    hideTooltip() {
        if (this.tooltipElement) {
            this.tooltipElement.style.opacity = '0';
        }
    }

    getAvailableMaps() {
        if (window.settingsManager && window.settingsManager.availableMaps) {
            return window.settingsManager.availableMaps;
        }
        return [];
    }

    getActiveMapUrl() {
        if (window.settingsManager) {
            return window.settingsManager.activeMapUrl;
        }
        return null;
    }

    hasUnsavedChanges() {
        if (window.authManager && window.authManager.hasUnsavedChanges) {
            return true;
        }
        return false;
    }

    async confirmSwitchIfNeeded() {
        if (!this.hasUnsavedChanges()) {
            return true;
        }

        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-[300] flex items-center justify-center bg-black bg-opacity-50';
            modal.innerHTML = `
                <div class="bg-gray-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl border border-gray-600">
                    <div class="text-center mb-4">
                        <i class="fas fa-exclamation-triangle text-yellow-500 text-3xl mb-2"></i>
                        <h3 class="text-lg font-bold text-white">Modifications non sauvegardées</h3>
                    </div>
                    <p class="text-gray-300 text-sm mb-6 text-center">
                        Vous avez des modifications en cours. Voulez-vous les sauvegarder avant de changer de carte ?
                    </p>
                    <div class="flex gap-2 justify-center">
                        <button id="map-switch-save" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors">
                            Sauvegarder
                        </button>
                        <button id="map-switch-discard" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors">
                            Ignorer
                        </button>
                        <button id="map-switch-cancel" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors">
                            Annuler
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const saveBtn = modal.querySelector('#map-switch-save');
            const discardBtn = modal.querySelector('#map-switch-discard');
            const cancelBtn = modal.querySelector('#map-switch-cancel');

            saveBtn.addEventListener('click', async () => {
                modal.remove();
                if (window.authManager && typeof window.authManager.manualSync === 'function') {
                    await window.authManager.manualSync();
                }
                resolve(true);
            });

            discardBtn.addEventListener('click', () => {
                modal.remove();
                if (window.authManager) {
                    window.authManager.hasUnsavedChanges = false;
                }
                resolve(true);
            });

            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    }

    async switchToMap(index) {
        const maps = this.getAvailableMaps();
        if (index < 0 || index >= maps.length) return;

        const canSwitch = await this.confirmSwitchIfNeeded();
        if (!canSwitch) return;

        if (window.settingsManager && typeof window.settingsManager.setActiveMap === 'function') {
            window.settingsManager.setActiveMap(index);
            this.renderThumbnails();
        }
    }

    renderThumbnails() {
        if (!this.thumbnailsContainer) return;

        const maps = this.getAvailableMaps();
        const activeMapUrl = this.getActiveMapUrl();

        if (maps.length <= 1) {
            this.container.style.display = 'none';
            return;
        }

        this.container.style.display = 'block';

        this.thumbnailsContainer.innerHTML = maps.map((map, index) => {
            const isActive = map.url === activeMapUrl;
            const borderClass = isActive 
                ? 'border-3 border-blue-500 ring-2 ring-blue-400' 
                : 'border border-gray-500 hover:border-gray-300';
            
            return `
                <div class="map-thumbnail-btn ${borderClass} rounded overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105"
                     data-map-index="${index}"
                     data-map-name="${this.escapeHtml(map.name)}"
                     style="width: 48px; height: 48px;">
                    <img src="${this.escapeHtml(map.url)}" 
                         alt="${this.escapeHtml(map.name)}"
                         class="w-full h-full object-cover"
                         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22><rect fill=%22%23374151%22 width=%2248%22 height=%2248%22/><text x=%2224%22 y=%2228%22 text-anchor=%22middle%22 fill=%22%239CA3AF%22 font-size=%2212%22>?</text></svg>'">
                </div>
            `;
        }).join('');

        this.setupThumbnailEvents();
    }

    setupThumbnailEvents() {
        const thumbnails = this.thumbnailsContainer.querySelectorAll('.map-thumbnail-btn');
        
        thumbnails.forEach(thumbnail => {
            const mapName = thumbnail.dataset.mapName;
            const mapIndex = parseInt(thumbnail.dataset.mapIndex, 10);

            thumbnail.addEventListener('mouseenter', (e) => {
                this.showTooltip(mapName, e);
            });

            thumbnail.addEventListener('mousemove', (e) => {
                this.showTooltip(mapName, e);
            });

            thumbnail.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });

            thumbnail.addEventListener('click', () => {
                this.switchToMap(mapIndex);
            });

            thumbnail.addEventListener('touchstart', (e) => {
                this.showTooltip(mapName, e);
            }, { passive: true });

            thumbnail.addEventListener('touchend', () => {
                this.hideTooltip();
            });
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    refresh() {
        this.renderThumbnails();
    }
}

export default MapSwitcherManager;
