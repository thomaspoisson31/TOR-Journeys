
// Gestionnaire des filtres avancés pour les lieux et régions

export default class FilterManager {
    constructor() {
        this.activeFilters = {
            colors: [], // Unifié pour lieux et régions
            visited: null, // null = tous, true = visités, false = non visités
            known: null,   // null = tous, true = connus, false = inconnus
            types: [],
            showLocations: true, // Afficher les lieux
            showRegions: true    // Afficher les régions
        };
        
        this.isFilterPanelOpen = false;
        this.filteredLocations = [];
        this.filteredRegions = [];
        
        console.log("🔍 FilterManager initialized");
    }

    // Initialiser les événements du gestionnaire de filtres
    setupFilterListeners() {
        console.log("🔍 Setting up filter listeners...");

        // Bouton principal de filtrage
        const filterBtn = document.getElementById('filter-btn');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => this.toggleFilterPanel());
        }

        // Bouton fermer le panel de filtres
        const closeFilterBtn = document.getElementById('close-filter-panel');
        if (closeFilterBtn) {
            closeFilterBtn.addEventListener('click', () => this.closeFilterPanel());
        }

        // Bouton réinitialiser les filtres
        const resetFiltersBtn = document.getElementById('reset-filters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => this.resetFilters());
        }

        // Bouton appliquer les filtres
        const applyFiltersBtn = document.getElementById('apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }

        // Filtres de couleurs unifiés
        this.setupUnifiedColorFilters();

        // Filtres visited/known
        this.setupStatusFilters();

        // Filtres de types
        this.setupTypeFilters();

        // Filtres d'affichage
        this.setupDisplayFilters();

        console.log("✅ Filter listeners setup complete");
    }

    setupUnifiedColorFilters() {
        const container = document.getElementById('unified-colors');
        if (!container) return;

        // Couleurs communes (intersection entre lieux et régions)
        const colors = ['blue', 'red', 'green', 'violet', 'orange', 'black'];

        container.innerHTML = '';

        colors.forEach(color => {
            const filterItem = document.createElement('div');
            filterItem.className = 'filter-color-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `filter-color-${color}`;
            checkbox.value = color;
            checkbox.addEventListener('change', () => this.updateUnifiedColorFilter(color, checkbox.checked));

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.className = 'filter-color-label';
            
            const colorSwatch = document.createElement('div');
            colorSwatch.className = 'filter-color-swatch';
            colorSwatch.style.backgroundColor = this.getLocationColor(color);

            label.appendChild(colorSwatch);
            filterItem.appendChild(checkbox);
            filterItem.appendChild(label);
            container.appendChild(filterItem);
        });
    }

    setupStatusFilters() {
        // Filtres "Visité"
        const visitedAll = document.getElementById('visited-all');
        const visitedYes = document.getElementById('visited-yes');
        const visitedNo = document.getElementById('visited-no');

        if (visitedAll) visitedAll.addEventListener('change', () => this.updateVisitedFilter(null));
        if (visitedYes) visitedYes.addEventListener('change', () => this.updateVisitedFilter(true));
        if (visitedNo) visitedNo.addEventListener('change', () => this.updateVisitedFilter(false));

        // Filtres "Connu"
        const knownAll = document.getElementById('known-all');
        const knownYes = document.getElementById('known-yes');
        const knownNo = document.getElementById('known-no');

        if (knownAll) knownAll.addEventListener('change', () => this.updateKnownFilter(null));
        if (knownYes) knownYes.addEventListener('change', () => this.updateKnownFilter(true));
        if (knownNo) knownNo.addEventListener('change', () => this.updateKnownFilter(false));
    }

    setupTypeFilters() {
        const typeFilters = document.querySelectorAll('input[name="type-filter"]');
        typeFilters.forEach(filter => {
            filter.addEventListener('change', () => {
                if (filter.checked) {
                    if (!this.activeFilters.types.includes(filter.value)) {
                        this.activeFilters.types.push(filter.value);
                    }
                } else {
                    this.activeFilters.types = this.activeFilters.types.filter(t => t !== filter.value);
                }
                this.applyFilters();
            });
        });
    }

    setupDisplayFilters() {
        const showLocationsFilter = document.getElementById('show-locations');
        const showRegionsFilter = document.getElementById('show-regions');

        if (showLocationsFilter) {
            showLocationsFilter.addEventListener('change', () => {
                this.activeFilters.showLocations = showLocationsFilter.checked;
                this.applyFilters();
            });
        }

        if (showRegionsFilter) {
            showRegionsFilter.addEventListener('change', () => {
                this.activeFilters.showRegions = showRegionsFilter.checked;
                this.applyFilters();
            });
        }
    }

    updateUnifiedColorFilter(color, isChecked) {
        if (isChecked) {
            if (!this.activeFilters.colors.includes(color)) {
                this.activeFilters.colors.push(color);
            }
        } else {
            this.activeFilters.colors = this.activeFilters.colors.filter(c => c !== color);
        }
        
        this.applyFilters();
    }

    updateVisitedFilter(value) {
        this.activeFilters.visited = value;
        this.applyFilters();
    }

    updateKnownFilter(value) {
        this.activeFilters.known = value;
        this.applyFilters();
    }

    toggleFilterPanel() {
        const filterPanel = document.getElementById('filter-panel');
        const filterBtn = document.getElementById('filter-btn');
        
        if (!filterPanel) return;

        this.isFilterPanelOpen = !this.isFilterPanelOpen;

        if (this.isFilterPanelOpen) {
            filterPanel.classList.remove('hidden');
            filterBtn.classList.add('btn-active');
        } else {
            filterPanel.classList.add('hidden');
            filterBtn.classList.remove('btn-active');
        }
    }

    closeFilterPanel() {
        const filterPanel = document.getElementById('filter-panel');
        const filterBtn = document.getElementById('filter-btn');
        
        if (filterPanel) {
            filterPanel.classList.add('hidden');
            this.isFilterPanelOpen = false;
        }
        
        if (filterBtn) {
            filterBtn.classList.remove('btn-active');
        }
    }

    resetFilters() {
        console.log("🔄 Resetting all filters...");
        
        // Réinitialiser les filtres actifs
        this.activeFilters = {
            colors: [],
            visited: null,
            known: null,
            types: [],
            showLocations: true,
            showRegions: true
        };

        // Réinitialiser l'interface
        // Checkboxes couleurs
        document.querySelectorAll('input[type="checkbox"][id^="filter-color-"]').forEach(cb => {
            cb.checked = false;
        });

        // Radios status
        const visitedAll = document.getElementById('visited-all');
        const knownAll = document.getElementById('known-all');
        if (visitedAll) visitedAll.checked = true;
        if (knownAll) knownAll.checked = true;

        // Types
        document.querySelectorAll('input[name="type-filter"]').forEach(cb => {
            cb.checked = false;
        });

        // Cases à cocher d'affichage
        const showLocationsFilter = document.getElementById('show-locations');
        const showRegionsFilter = document.getElementById('show-regions');
        if (showLocationsFilter) showLocationsFilter.checked = true;
        if (showRegionsFilter) showRegionsFilter.checked = true;

        // Appliquer les filtres vides (montrer tout)
        this.applyFilters();
    }

    applyFilters() {
        console.log("🔍 Applying filters...", this.activeFilters);

        // Obtenir les données depuis le contexte global
        const locationsData = window.locationsData;
        const regionsData = window.regionsData;

        if (!locationsData || !regionsData) {
            console.warn("⚠️ No data available for filtering");
            return;
        }

        // Filtrer les lieux
        this.filteredLocations = this.filterLocations(locationsData.locations || []);
        
        // Filtrer les régions
        this.filteredRegions = this.filterRegions(regionsData.regions || []);

        // Mettre à jour l'affichage
        this.updateDisplay();

        // Mettre à jour l'indicateur du bouton de filtre
        this.updateFilterButton();

        // Déclencher un événement personnalisé pour notifier les autres composants
        document.dispatchEvent(new CustomEvent('filtersApplied', {
            detail: {
                locations: this.filteredLocations,
                regions: this.filteredRegions,
                totalLocations: locationsData.locations?.length || 0,
                totalRegions: regionsData.regions?.length || 0
            }
        }));
    }

    filterLocations(locations) {
        return locations.filter(location => {
            // Filtre par couleur unifiée
            if (this.activeFilters.colors?.length > 0 && 
                !this.activeFilters.colors.includes(location.color)) {
                return false;
            }

            // Filtre par statut visité
            if (this.activeFilters.visited !== null && 
                location.visited !== this.activeFilters.visited) {
                return false;
            }

            // Filtre par statut connu
            if (this.activeFilters.known !== null && 
                location.known !== this.activeFilters.known) {
                return false;
            }

            // Filtre par type
            if (this.activeFilters.types?.length > 0 && 
                !this.activeFilters.types.includes(location.type || 'default')) {
                return false;
            }

            return true;
        });
    }

    filterRegions(regions) {
        return regions.filter(region => {
            // Filtre par couleur unifiée
            if (this.activeFilters.colors?.length > 0 && 
                !this.activeFilters.colors.includes(region.color)) {
                return false;
            }

            // Filtre par statut visité
            if (this.activeFilters.visited !== null && 
                region.visited !== this.activeFilters.visited) {
                return false;
            }

            // Filtre par statut connu
            if (this.activeFilters.known !== null && 
                region.known !== this.activeFilters.known) {
                return false;
            }

            return true;
        });
    }

    updateDisplay() {
        // Masquer/afficher les marqueurs de lieux
        const locationMarkers = document.querySelectorAll('.location-marker');
        locationMarkers.forEach(marker => {
            const locationId = marker.dataset.id;
            const isFiltered = this.filteredLocations.some(loc => loc.id == locationId);
            const isVisible = this.activeFilters.showLocations && isFiltered;
            marker.style.display = isVisible ? 'block' : 'none';
        });

        // Masquer/afficher les régions
        const regionPolygons = document.querySelectorAll('#regions-layer polygon[data-id]');
        regionPolygons.forEach(polygon => {
            const regionId = polygon.getAttribute('data-id');
            const isFiltered = this.filteredRegions.some(reg => reg.id === regionId);
            const isVisible = this.activeFilters.showRegions && isFiltered;
            
            // Utiliser 'block' explicitement pour les polygones SVG
            if (isVisible) {
                polygon.style.display = 'block';
            } else {
                polygon.style.display = 'none';
            }
        });

        console.log(`✅ Display updated - ${this.filteredLocations.length} locations, ${this.filteredRegions.length} regions visible`);
    }

    updateFilterButton() {
        const filterBtn = document.getElementById('filter-btn');
        if (filterBtn) {
            const hasActiveFilters = this.hasActiveFilters();
            if (hasActiveFilters) {
                filterBtn.classList.add('has-active-filters');
                filterBtn.title = 'Filtres actifs - Cliquer pour modifier';
            } else {
                filterBtn.classList.remove('has-active-filters');
                filterBtn.title = 'Filtrer les lieux et régions';
            }
        }
    }

    hasActiveFilters() {
        return (this.activeFilters.colors && this.activeFilters.colors.length > 0) ||
               this.activeFilters.visited !== null ||
               this.activeFilters.known !== null ||
               (this.activeFilters.types && this.activeFilters.types.length > 0) ||
               !this.activeFilters.showLocations ||
               !this.activeFilters.showRegions;
    }

    // Méthodes utilitaires pour les couleurs
    getLocationColor(color) {
        const colorMap = {
            blue: '#3B82F6',
            red: '#EF4444',
            green: '#10B981',
            violet: '#8B5CF6',
            orange: '#F97316',
            black: '#1F2937'
        };
        return colorMap[color] || colorMap.blue;
    }

    getRegionColor(color) {
        const regionColorMap = {
            green: 'rgba(34, 197, 94, 0.4)',
            red: 'rgba(239, 68, 68, 0.4)',
            blue: 'rgba(59, 130, 246, 0.4)',
            violet: 'rgba(139, 92, 246, 0.4)',
            orange: 'rgba(249, 115, 22, 0.4)',
            black: 'rgba(31, 41, 55, 0.4)',
            yellow: 'rgba(234, 179, 8, 0.4)',
            purple: 'rgba(147, 51, 234, 0.4)',
            gray: 'rgba(107, 114, 128, 0.4)'
        };
        return regionColorMap[color] || regionColorMap.gray;
    }

    getColorName(color) {
        const colorNames = {
            blue: 'Bleu',
            red: 'Rouge',
            green: 'Vert',
            violet: 'Violet',
            orange: 'Orange',
            black: 'Noir',
            yellow: 'Jaune',
            purple: 'Violet foncé',
            gray: 'Gris'
        };
        return colorNames[color] || color;
    }

    // Méthodes publiques pour l'intégration avec d'autres composants
    getFilteredLocations() {
        return this.filteredLocations;
    }

    getFilteredRegions() {
        return this.filteredRegions;
    }

    getActiveFilters() {
        return { ...this.activeFilters };
    }
}
