// Gestionnaire des filtres avancés pour les lieux et régions

export default class FilterManager {
    constructor() {
        this.activeFilters = {
            colors: [], // Unifié pour lieux et régions
            visited: [], // Array: peut contenir 'visited' et/ou 'not_visited'
            known: [],   // Array: peut contenir 'known' et/ou 'unknown'
            types: [],
            showLocations: true, // Afficher les lieux
            showRegions: false,   // Afficher les régions (désactivé par défaut)
            regionsOpacity: 0.5  // Opacité des régions (0-1)
        };

        this.isFilterPanelOpen = false;
        this.filteredLocations = [];
        this.filteredRegions = [];
        this.filtersByMap = {}; // Filtres par carte (mapId -> filtres)

        console.log("🔍 FilterManager initialized");
    }

    // Méthode pour charger les filtres depuis localStorage (appelée après l'init complète)
    loadFiltersFromStorage() {
        const savedFiltersByMap = localStorage.getItem('filtersByMap');
        if (savedFiltersByMap) {
            try {
                this.filtersByMap = JSON.parse(savedFiltersByMap);
                console.log("🔍 FilterManager: Filtres chargés depuis localStorage:", this.filtersByMap);
                console.log(`🔍 FilterManager: ${Object.keys(this.filtersByMap).length} carte(s) avec filtres`);
                return true;
            } catch (e) {
                console.error("❌ Erreur lors du chargement des filtres depuis localStorage:", e);
            }
        }
        return false;
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

        // Filtres de couleurs unifiés
        this.setupUnifiedColorFilters();

        // Filtres visited/known
        this.setupStatusFilters();

        // Filtres de types
        this.setupTypeFilters();

        // Filtres d'affichage
        this.setupDisplayFilters();

        // Fermer la modale en cliquant en dehors
        this.setupOutsideClickListener();

        console.log("✅ Filter listeners setup complete");

        // IMPORTANT: Charger d'abord depuis localStorage avant les retries
        this.loadFiltersFromStorage();
        
        // IMPORTANT: Charger les filtres immédiatement si disponibles
        this.tryLoadFiltersForActiveMap();
    }

    // Nouvelle méthode pour essayer de charger les filtres pour la carte active
    tryLoadFiltersForActiveMap(retryCount = 0) {
        const maxRetries = 5;
        const retryDelay = 200;

        const activeMapUrl = window.settingsManager?.activeMapUrl;
        console.log(`🔍 [tryLoadFiltersForActiveMap retry=${retryCount}] activeMapUrl:`, activeMapUrl);
        console.log(`🔍 [tryLoadFiltersForActiveMap] filtersByMap keys:`, Object.keys(this.filtersByMap));
        
        if (activeMapUrl && this.filtersByMap[activeMapUrl]) {
            console.log(`✅ Chargement des filtres pour la carte active: ${activeMapUrl}`);
            console.log(`📊 Filtres à charger:`, this.filtersByMap[activeMapUrl]);
            this.loadFiltersForMap(activeMapUrl);
            return true;
        } else if (retryCount < maxRetries) {
            console.log(`⏳ Retry ${retryCount + 1}/${maxRetries} pour charger les filtres...`);
            setTimeout(() => {
                this.tryLoadFiltersForActiveMap(retryCount + 1);
            }, retryDelay);
            return false;
        } else {
            console.warn(`⚠️ Impossible de charger les filtres après ${maxRetries} tentatives`);
            console.log(`🔍 activeMapUrl final:`, activeMapUrl);
            console.log(`🔍 Filtres disponibles:`, Object.keys(this.filtersByMap));
            return false;
        }
    }

    setupOutsideClickListener() {
        document.addEventListener('click', (e) => {
            const filterPanel = document.getElementById('filter-panel');
            const filterBtn = document.getElementById('filter-btn');
            
            if (this.isFilterPanelOpen && filterPanel && filterBtn) {
                // Vérifier si le clic est en dehors du panel et du bouton
                if (!filterPanel.contains(e.target) && !filterBtn.contains(e.target)) {
                    this.closeFilterPanel();
                }
            }
        });
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
        // Filtres "Visité" - checkboxes
        const visitedCheckbox = document.getElementById('visited-checkbox');
        const notVisitedCheckbox = document.getElementById('not-visited-checkbox');

        if (visitedCheckbox) {
            visitedCheckbox.addEventListener('change', () => this.updateVisitedFilter());
        }
        if (notVisitedCheckbox) {
            notVisitedCheckbox.addEventListener('change', () => this.updateVisitedFilter());
        }

        // Filtres "Connu" - checkboxes
        const knownCheckbox = document.getElementById('known-checkbox');
        const unknownCheckbox = document.getElementById('unknown-checkbox');

        if (knownCheckbox) {
            knownCheckbox.addEventListener('change', () => this.updateKnownFilter());
        }
        if (unknownCheckbox) {
            unknownCheckbox.addEventListener('change', () => this.updateKnownFilter());
        }
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

        // Slider d'opacité des régions
        this.setupOpacitySlider();
    }

    setupOpacitySlider() {
        const opacitySlider = document.getElementById('regions-opacity-slider');
        const opacityValue = document.getElementById('regions-opacity-value');

        if (opacitySlider && opacityValue) {
            // Définir la valeur initiale
            opacitySlider.value = this.activeFilters.regionsOpacity * 100;
            opacityValue.textContent = `${Math.round(this.activeFilters.regionsOpacity * 100)}%`;

            // Mettre à jour en temps réel
            opacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value) / 100;
                this.activeFilters.regionsOpacity = value;
                opacityValue.textContent = `${e.target.value}%`;
                this.updateRegionsOpacity();
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

    updateVisitedFilter() {
        const visitedCheckbox = document.getElementById('visited-checkbox');
        const notVisitedCheckbox = document.getElementById('not-visited-checkbox');
        
        this.activeFilters.visited = [];
        if (visitedCheckbox && visitedCheckbox.checked) {
            this.activeFilters.visited.push('visited');
        }
        if (notVisitedCheckbox && notVisitedCheckbox.checked) {
            this.activeFilters.visited.push('not_visited');
        }
        
        this.applyFilters();
    }

    updateKnownFilter() {
        const knownCheckbox = document.getElementById('known-checkbox');
        const unknownCheckbox = document.getElementById('unknown-checkbox');
        
        this.activeFilters.known = [];
        if (knownCheckbox && knownCheckbox.checked) {
            this.activeFilters.known.push('known');
        }
        if (unknownCheckbox && unknownCheckbox.checked) {
            this.activeFilters.known.push('unknown');
        }
        
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
            visited: [],
            known: [],
            types: [],
            showLocations: true,
            showRegions: false,
            regionsOpacity: 0.5
        };

        // Réinitialiser l'interface
        // Checkboxes couleurs
        document.querySelectorAll('input[type="checkbox"][id^="filter-color-"]').forEach(cb => {
            cb.checked = false;
        });

        // Checkboxes status
        const visitedCheckbox = document.getElementById('visited-checkbox');
        const notVisitedCheckbox = document.getElementById('not-visited-checkbox');
        const knownCheckbox = document.getElementById('known-checkbox');
        const unknownCheckbox = document.getElementById('unknown-checkbox');
        
        if (visitedCheckbox) visitedCheckbox.checked = false;
        if (notVisitedCheckbox) notVisitedCheckbox.checked = false;
        if (knownCheckbox) knownCheckbox.checked = false;
        if (unknownCheckbox) unknownCheckbox.checked = false;

        // Types
        document.querySelectorAll('input[name="type-filter"]').forEach(cb => {
            cb.checked = false;
        });

        // Cases à cocher d'affichage
        const showLocationsFilter = document.getElementById('show-locations');
        const showRegionsFilter = document.getElementById('show-regions');
        if (showLocationsFilter) showLocationsFilter.checked = true;
        if (showRegionsFilter) showRegionsFilter.checked = false;

        // Slider d'opacité
        const opacitySlider = document.getElementById('regions-opacity-slider');
        const opacityValue = document.getElementById('regions-opacity-value');
        if (opacitySlider) opacitySlider.value = 50;
        if (opacityValue) opacityValue.textContent = '50%';

        // Appliquer les filtres vides (montrer tout)
        this.applyFilters();
    }

    applyFilters() {
        console.log("🔍 Applying filters...", this.activeFilters);
        console.log("🔍 Current filtersByMap:", this.filtersByMap);
        console.log("🔍 Active map:", window.settingsManager?.activeMapUrl);

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

        console.log(`📊 Filtered: ${this.filteredLocations.length}/${locationsData.locations?.length || 0} locations, ${this.filteredRegions.length}/${regionsData.regions?.length || 0} regions`);

        // Mettre à jour l'affichage
        this.updateDisplay();

        // Mettre à jour l'indicateur du bouton de filtre
        this.updateFilterButton();

        // Sauvegarder les filtres pour la carte active
        this.saveFiltersForCurrentMap();

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
            if (this.activeFilters.visited.length > 0) {
                const isVisited = location.visited === true;
                const showVisited = this.activeFilters.visited.includes('visited');
                const showNotVisited = this.activeFilters.visited.includes('not_visited');
                
                if (isVisited && !showVisited) return false;
                if (!isVisited && !showNotVisited) return false;
            }

            // Filtre par statut connu
            if (this.activeFilters.known.length > 0) {
                const isKnown = location.known === true;
                const showKnown = this.activeFilters.known.includes('known');
                const showUnknown = this.activeFilters.known.includes('unknown');
                
                if (isKnown && !showKnown) return false;
                if (!isKnown && !showUnknown) return false;
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
            if (this.activeFilters.visited.length > 0) {
                const isVisited = region.visited === true;
                const showVisited = this.activeFilters.visited.includes('visited');
                const showNotVisited = this.activeFilters.visited.includes('not_visited');
                
                if (isVisited && !showVisited) return false;
                if (!isVisited && !showNotVisited) return false;
            }

            // Filtre par statut connu
            if (this.activeFilters.known.length > 0) {
                const isKnown = region.known === true;
                const showKnown = this.activeFilters.known.includes('known');
                const showUnknown = this.activeFilters.known.includes('unknown');
                
                if (isKnown && !showKnown) return false;
                if (!isKnown && !showUnknown) return false;
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

        // Masquer/afficher le calque de régions
        const regionsLayer = document.getElementById('regions-layer');
        if (regionsLayer) {
            if (this.activeFilters.showRegions) {
                regionsLayer.style.display = 'block';
                this.updateRegionsOpacity();
            } else {
                regionsLayer.style.display = 'none';
            }
        }

        console.log(`✅ Display updated - ${this.filteredLocations.length} locations, ${this.filteredRegions.length} regions visible`);
    }

    updateRegionsOpacity() {
        const regionsLayer = document.getElementById('regions-layer');
        if (regionsLayer) {
            const polygons = regionsLayer.querySelectorAll('polygon');
            polygons.forEach(polygon => {
                polygon.setAttribute('fill-opacity', this.activeFilters.regionsOpacity);
            });
        }
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
               (this.activeFilters.visited && this.activeFilters.visited.length > 0) ||
               (this.activeFilters.known && this.activeFilters.known.length > 0) ||
               (this.activeFilters.types && this.activeFilters.types.length > 0) ||
               !this.activeFilters.showLocations ||
               !this.activeFilters.showRegions ||
               this.activeFilters.regionsOpacity !== 0.5;
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

    // Sauvegarder les filtres pour la carte active
    saveFiltersForCurrentMap() {
        const activeMapUrl = window.settingsManager?.activeMapUrl;
        if (!activeMapUrl) {
            console.warn("⚠️ [saveFiltersForCurrentMap] Pas de carte active pour sauvegarder les filtres");
            return;
        }

        this.filtersByMap[activeMapUrl] = { ...this.activeFilters };
        console.log(`💾 [saveFiltersForCurrentMap] Filtres sauvegardés pour la carte ${activeMapUrl}:`, this.filtersByMap[activeMapUrl]);
        console.log(`💾 [saveFiltersForCurrentMap] Total filtersByMap:`, this.filtersByMap);
        console.log(`💾 [saveFiltersForCurrentMap] Nombre total de cartes avec filtres: ${Object.keys(this.filtersByMap).length}`);
        
        // Sauvegarder aussi dans localStorage pour persistance immédiate
        localStorage.setItem('filtersByMap', JSON.stringify(this.filtersByMap));
        console.log(`💾 [saveFiltersForCurrentMap] Filtres sauvegardés dans localStorage`);

        // Marquer comme non sauvegardé pour déclencher la sync cloud
        if (window.authManager && window.authManager.isAuthenticated) {
            console.log(`☁️ [saveFiltersForCurrentMap] Appel de markAsUnsaved pour sync cloud`);
            window.authManager.markAsUnsaved();
        } else {
            console.warn(`⚠️ [saveFiltersForCurrentMap] AuthManager non disponible ou utilisateur non authentifié`);
        }
    }

    // Charger les filtres pour une carte spécifique
    loadFiltersForMap(mapUrl) {
        console.log(`🔍 [loadFiltersForMap] Tentative de chargement pour carte: ${mapUrl}`);
        console.log(`🔍 [loadFiltersForMap] filtersByMap disponibles:`, Object.keys(this.filtersByMap));
        
        if (this.filtersByMap[mapUrl]) {
            console.log(`📥 [loadFiltersForMap] Filtres trouvés:`, this.filtersByMap[mapUrl]);
            this.activeFilters = { ...this.filtersByMap[mapUrl] };
            console.log(`📥 [loadFiltersForMap] activeFilters après copie:`, this.activeFilters);
            
            // Mettre à jour l'UI
            console.log(`🎨 [loadFiltersForMap] Mise à jour de l'UI...`);
            this.updateFilterUI();
            console.log(`✅ [loadFiltersForMap] Appel de applyFilters...`);
            this.applyFilters();
            
            // Forcer le rendu après application des filtres
            setTimeout(() => {
                console.log(`🔄 [loadFiltersForMap] Rendu forcé des lieux et régions`);
                if (typeof window.renderLocations === 'function') {
                    window.renderLocations();
                }
                if (typeof window.renderRegions === 'function') {
                    window.renderRegions();
                }
            }, 100);
            
            return true;
        } else {
            console.warn(`⚠️ [loadFiltersForMap] Aucun filtre trouvé pour la carte ${mapUrl}`);
            // Si aucun filtre, réinitialiser aux valeurs par défaut et afficher tout
            this.activeFilters = {
                colors: [],
                visited: [],
                known: [],
                types: [],
                showLocations: true,
                showRegions: false,
                regionsOpacity: 0.5
            };
            this.updateFilterUI();
            this.applyFilters();
        }
        return false;
    }

    // Mettre à jour l'interface des filtres
    updateFilterUI() {
        // Checkboxes couleurs
        document.querySelectorAll('input[type="checkbox"][id^="filter-color-"]').forEach(cb => {
            const color = cb.value;
            cb.checked = this.activeFilters.colors?.includes(color) || false;
        });

        // Checkboxes status
        const visitedCheckbox = document.getElementById('visited-checkbox');
        const notVisitedCheckbox = document.getElementById('not-visited-checkbox');
        const knownCheckbox = document.getElementById('known-checkbox');
        const unknownCheckbox = document.getElementById('unknown-checkbox');
        
        if (visitedCheckbox) visitedCheckbox.checked = this.activeFilters.visited?.includes('visited') || false;
        if (notVisitedCheckbox) notVisitedCheckbox.checked = this.activeFilters.visited?.includes('not_visited') || false;
        if (knownCheckbox) knownCheckbox.checked = this.activeFilters.known?.includes('known') || false;
        if (unknownCheckbox) unknownCheckbox.checked = this.activeFilters.known?.includes('unknown') || false;

        // Cases à cocher d'affichage
        const showLocationsFilter = document.getElementById('show-locations');
        const showRegionsFilter = document.getElementById('show-regions');
        if (showLocationsFilter) showLocationsFilter.checked = this.activeFilters.showLocations !== false;
        if (showRegionsFilter) showRegionsFilter.checked = this.activeFilters.showRegions || false;

        // Slider d'opacité
        const opacitySlider = document.getElementById('regions-opacity-slider');
        const opacityValue = document.getElementById('regions-opacity-value');
        const opacity = this.activeFilters.regionsOpacity || 0.5;
        if (opacitySlider) opacitySlider.value = opacity * 100;
        if (opacityValue) opacityValue.textContent = `${Math.round(opacity * 100)}%`;
    }

    // Obtenir tous les filtres par carte (pour la sauvegarde cloud)
    getAllFiltersByMap() {
        return { ...this.filtersByMap };
    }

    // Charger tous les filtres par carte (depuis le cloud)
    setAllFiltersByMap(filtersByMap) {
        console.log("🔍 [setAllFiltersByMap] Appelé avec:", filtersByMap);
        
        if (filtersByMap && typeof filtersByMap === 'object') {
            this.filtersByMap = { ...filtersByMap };
            console.log("📥 [setAllFiltersByMap] Filtres par carte chargés depuis le cloud:", this.filtersByMap);
            console.log(`📥 [setAllFiltersByMap] Nombre de cartes: ${Object.keys(this.filtersByMap).length}`);
            console.log(`📥 [setAllFiltersByMap] Cartes disponibles:`, Object.keys(this.filtersByMap));
            
            // Sauvegarder IMMÉDIATEMENT dans localStorage pour persistance
            localStorage.setItem('filtersByMap', JSON.stringify(this.filtersByMap));
            console.log("💾 [setAllFiltersByMap] Filtres sauvegardés dans localStorage");
            
            // IMPORTANT: Charger et appliquer les filtres de la carte active immédiatement
            const activeMapUrl = window.settingsManager?.activeMapUrl;
            if (activeMapUrl && this.filtersByMap[activeMapUrl]) {
                console.log(`✅ [setAllFiltersByMap] Application immédiate des filtres pour ${activeMapUrl}`);
                this.loadFiltersForMap(activeMapUrl);
            } else {
                console.log(`⏳ [setAllFiltersByMap] Lancement du retry pour carte active`);
                this.tryLoadFiltersForActiveMap();
            }
        } else {
            console.warn("⚠️ [setAllFiltersByMap] Données invalides:", filtersByMap);
        }
    }
}