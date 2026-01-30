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

    switchToMap(index) {
        const maps = this.getAvailableMaps();
        if (index < 0 || index >= maps.length) return;

        // Sauvegarde automatique en arrière-plan (fire and forget)
        if (window.authManager && window.authManager.isAuthenticated) {
            console.log('🗺️ [MapSwitcher] Lancement de la sauvegarde en arrière-plan...');
            if (typeof window.authManager.manualSync === 'function') {
                window.authManager.manualSync()
                    .then(() => console.log('✅ [MapSwitcher] Sauvegarde arrière-plan terminée'))
                    .catch(error => console.error('❌ [MapSwitcher] Erreur sauvegarde arrière-plan:', error));
            }
        }

        // Changement de carte immédiat (sans attendre la sync)
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
