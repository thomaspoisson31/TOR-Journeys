/**
 * CharactersManager - Gestion des personnages de l'aventure
 */
class CharactersManager {
    constructor() {
        this.characters = [];
        this.currentCharacter = null;
        this.filters = {
            pj: true,
            pnj: true,
            monstre: true,
            known: false,
            met: false,
            knownLocations: true,
            nextSession: false,
            activeMap: true // Par défaut : afficher uniquement les personnages de la carte active
        };
        this.sortBy = 'name';
        // Added for Gemini integration
        this.isGeneratingDescription = false;

        console.log("👥 CharactersManager initialized");
    }

    init() {
        this.loadCharactersFromLocal();
        this.setupEventListeners();
        console.log("✅ CharactersManager setup complete");
    }

    setupEventListeners() {
        // Bouton principal dans la toolbar
        const charactersBtn = document.getElementById('characters-btn');
        if (charactersBtn) {
            charactersBtn.addEventListener('click', () => this.openCharactersModal());
        }

        // Bouton fermer la modale
        const closeBtn = document.getElementById('close-characters-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeCharactersModal());
        }

        // Bouton ajouter un personnage
        const addBtn = document.getElementById('add-character-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openAddCharacterModal());
        }

        // Bouton supprimer tous les personnages
        const deleteAllBtn = document.getElementById('delete-all-characters-btn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => this.deleteAllCharactersForActiveMap());
        }

        // Bouton exporter les personnages
        const exportBtn = document.getElementById('export-characters-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCharacters());
        }

        // Bouton importer les personnages
        const importBtn = document.getElementById('import-characters-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('import-characters-input');
                if (fileInput) {
                    fileInput.click();
                }
            });
        }

        // Input file pour l'import
        const importFileInput = document.getElementById('import-characters-input');
        if (importFileInput) {
            // Retirer les anciens écouteurs pour éviter les doublons
            importFileInput.replaceWith(importFileInput.cloneNode(true));
            const newImportFileInput = document.getElementById('import-characters-input');
            newImportFileInput.addEventListener('change', (event) => this.handleImportCharacters(event));
        }

        // Boutons de la modale d'ajout
        const cancelAddBtn = document.getElementById('cancel-add-character');
        const confirmAddBtn = document.getElementById('confirm-add-character');
        const generateDescBtn = document.getElementById('generate-character-desc'); // Ajout du bouton Wizard

        if (cancelAddBtn) {
            cancelAddBtn.addEventListener('click', () => this.closeAddCharacterModal());
        }

        if (confirmAddBtn) {
            confirmAddBtn.addEventListener('click', () => this.confirmAddCharacter());
        }

        // Ajout de l'écouteur pour le bouton Wizard
        if (generateDescBtn) {
            generateDescBtn.addEventListener('click', () => this.generateCharacterDescription());
        }

        // Filtres par type
        const filterPJ = document.getElementById('filter-pj');
        const filterPNJ = document.getElementById('filter-pnj');
        const filterMonstre = document.getElementById('filter-monstre');

        if (filterPJ) {
            filterPJ.addEventListener('change', (e) => {
                this.filters.pj = e.target.checked;
                this.updateFilterUIState();
                this.renderCharactersList();
            });
        }

        if (filterPNJ) {
            filterPNJ.addEventListener('change', (e) => {
                this.filters.pnj = e.target.checked;
                this.updateFilterUIState();
                this.renderCharactersList();
            });
        }

        if (filterMonstre) {
            filterMonstre.addEventListener('change', (e) => {
                this.filters.monstre = e.target.checked;
                this.updateFilterUIState();
                this.renderCharactersList();
            });
        }

        // Filtres par statut
        const filterKnown = document.getElementById('filter-known');
        const filterMet = document.getElementById('filter-met');

        if (filterKnown) {
            filterKnown.addEventListener('change', (e) => {
                this.filters.known = e.target.checked;
                this.updateFilterUIState();
                this.renderCharactersList();
            });
        }

        if (filterMet) {
            filterMet.addEventListener('change', (e) => {
                this.filters.met = e.target.checked;
                this.updateFilterUIState();
                this.renderCharactersList();
            });
        }

        // Filtre par lieux et régions connus
        const filterKnownLocations = document.getElementById('filter-known-locations');
        if (filterKnownLocations) {
            filterKnownLocations.addEventListener('change', (e) => {
                this.filters.knownLocations = e.target.checked;
                this.updateFilterUIState();
                this.renderCharactersList();
            });
        }

        // Filtre par prochaine séance
        const filterNextSession = document.getElementById('filter-next-session');
        if (filterNextSession) {
            filterNextSession.addEventListener('change', (e) => {
                this.filters.nextSession = e.target.checked;
                this.updateFilterUIState();
                this.renderCharactersList();
            });
        }

        // Filtre "Carte active uniquement"
        const filterActiveMap = document.getElementById('filter-active-map');
        if (filterActiveMap) {
            filterActiveMap.addEventListener('change', (e) => {
                this.filters.activeMap = e.target.checked;
                this.renderCharactersList();
            });
        }

        // Tri
        const sortSelect = document.getElementById('sort-characters');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.renderCharactersList();
            });
        }

        // Clic sur l'icône d'entonnoir pour désactiver tous les filtres
        const filterIcon = document.getElementById('filter-status-icon');
        if (filterIcon) {
            filterIcon.addEventListener('click', () => {
                // Vérifier si des filtres sont actifs
                const hasActiveFilters = !this.filters.pj || !this.filters.pnj || !this.filters.monstre || 
                                          this.filters.known || this.filters.met;

                // Si des filtres sont actifs, les désactiver tous
                if (hasActiveFilters) {
                    this.disableFilters();
                }
            });

            // Ajouter un style de curseur pointer sur l'icône
            filterIcon.style.cursor = 'pointer';
        }
    }

    loadCharactersFromLocal() {
        try {
            const stored = localStorage.getItem('middleEarthCharacters');
            if (stored) {
                const data = JSON.parse(stored);
                this.characters = data.characters || [];

                // Normaliser les IDs en String pour tous les personnages
                this.characters = this.characters.map(char => ({
                    ...char,
                    id: String(char.id),
                    associatedLocations: (char.associatedLocations || []).map(id => String(id)),
                    associatedRegions: (char.associatedRegions || []).map(id => String(id))
                }));

                console.log(`📚 ${this.characters.length} personnages chargés depuis localStorage (IDs normalisés)`);

                // MIGRATION : Supprimer la relation directe personnage-carte
                // On effectue la migration en mémoire mais on ne force pas la sauvegarde cloud immédiatement
                // pour éviter d'écraser les données du cloud au démarrage.
                let migrationPerformed = false;
                this.characters.forEach(char => {
                    if (char.hasOwnProperty('mapId')) {
                        delete char.mapId;
                        migrationPerformed = true;
                    }
                });
                if (migrationPerformed) {
                    console.log("🔄 Migration mapId effectuée en mémoire.");
                }
            } else {
                this.characters = [];
            }
        } catch (e) {
            console.error("❌ Erreur parsing characters:", e);
            this.characters = [];
        }
    }


    saveCharactersToLocal() {
        localStorage.setItem('middleEarthCharacters', JSON.stringify({ characters: this.characters }));

        // Synchronisation cloud
        if (typeof scheduleAutoSync === 'function') {
            scheduleAutoSync();
        }
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }
    }

    openCharactersModal() {
        const modal = document.getElementById('characters-modal');
        if (modal) {
            modal.classList.remove('hidden');
            
            // Vérifier si le mode Aventure est actif (MJ ou Player)
            const isAdventureActive = window.positionManager && typeof window.positionManager.isAdventureActive === 'function'
                ? window.positionManager.isAdventureActive()
                : (window.positionManager?.adventureMode === 'mj' || window.positionManager?.adventureMode === 'player');
            
            if (isAdventureActive) {
                // Mode Aventure (MJ/Player) : forcer le filtre "Connus" uniquement
                this.filters.known = true;
                this.filters.met = false;
                this.filters.nextSession = false;
                
                // Masquer la barre de filtres
                const filterContainer = modal.querySelector('.bg-gray-700.rounded-lg.p-3');
                if (filterContainer) {
                    filterContainer.style.display = 'none';
                }
                
                // Masquer les boutons d'action
                const addBtn = document.getElementById('add-character-btn');
                const deleteAllBtn = document.getElementById('delete-all-characters-btn');
                const exportBtn = document.getElementById('export-characters-btn');
                const importBtn = document.getElementById('import-characters-btn');
                
                if (addBtn) addBtn.style.display = 'none';
                if (deleteAllBtn) deleteAllBtn.style.display = 'none';
                if (exportBtn) exportBtn.style.display = 'none';
                if (importBtn) importBtn.style.display = 'none';
            } else {
                // Mode Normal : afficher la barre de filtres et les boutons
                const filterContainer = modal.querySelector('.bg-gray-700.rounded-lg.p-3');
                if (filterContainer) {
                    filterContainer.style.display = 'flex';
                }
                
                // Réafficher les boutons d'action
                const addBtn = document.getElementById('add-character-btn');
                const deleteAllBtn = document.getElementById('delete-all-characters-btn');
                const exportBtn = document.getElementById('export-characters-btn');
                const importBtn = document.getElementById('import-characters-btn');
                
                if (addBtn) addBtn.style.display = '';
                if (deleteAllBtn) deleteAllBtn.style.display = '';
                if (exportBtn) exportBtn.style.display = '';
                if (importBtn) importBtn.style.display = '';
            }
            
            this.syncFiltersUI();
            this.updateFilterUIState();
            this.renderCharactersList();
        }
    }

    syncFiltersUI() {
        // Synchroniser l'UI avec l'état des filtres
        const filterPJ = document.getElementById('filter-pj');
        const filterPNJ = document.getElementById('filter-pnj');
        const filterMonstre = document.getElementById('filter-monstre');
        const filterKnown = document.getElementById('filter-known');
        const filterMet = document.getElementById('filter-met');
        const filterKnownLocations = document.getElementById('filter-known-locations');
        const filterActiveMap = document.getElementById('filter-active-map');

        if (filterPJ) filterPJ.checked = this.filters.pj;
        if (filterPNJ) filterPNJ.checked = this.filters.pnj;
        if (filterMonstre) filterMonstre.checked = this.filters.monstre;
        if (filterKnown) filterKnown.checked = this.filters.known;
        if (filterMet) filterMet.checked = this.filters.met;
        if (filterKnownLocations) filterKnownLocations.checked = this.filters.knownLocations;
        if (filterActiveMap) filterActiveMap.checked = this.filters.activeMap;

        const filterNextSession = document.getElementById('filter-next-session');
        if (filterNextSession) filterNextSession.checked = this.filters.nextSession;
    }

    updateFilterUIState() {
        const filterIcon = document.getElementById('filter-status-icon');

        // Vérifier si au moins un filtre est actif
        const hasActiveFilters = !this.filters.pj || !this.filters.pnj || !this.filters.monstre || 
                                  this.filters.known || this.filters.met || !this.filters.knownLocations ||
                                  this.filters.nextSession;

        // Mettre à jour l'icône d'entonnoir
        if (filterIcon) {
            if (hasActiveFilters) {
                filterIcon.classList.remove('text-gray-500');
                filterIcon.classList.add('text-orange-500');
                filterIcon.title = 'Filtres actifs';
            } else {
                filterIcon.classList.remove('text-orange-500');
                filterIcon.classList.add('text-gray-500');
                filterIcon.title = 'Aucun filtre actif';
            }
        }
    }

    disableFilters() {
        // Réinitialiser tous les filtres (= désactiver le filtrage)
        this.filters.pj = true;
        this.filters.pnj = true;
        this.filters.monstre = true;
        this.filters.known = false;
        this.filters.met = false;
        this.filters.knownLocations = true;
        this.filters.nextSession = false;
        // On ne touche pas à allMaps ici car c'est un filtre structurel

        this.syncFiltersUI();
        this.updateFilterUIState();
        this.renderCharactersList();
    }

    closeCharactersModal() {
        const modal = document.getElementById('characters-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    sortCharacters(characters) {
        const sorted = [...characters];

        switch(this.sortBy) {
            case 'name':
                sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'name-desc':
                sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
                break;
            case 'id':
                sorted.sort((a, b) => String(a.id).localeCompare(String(b.id)));
                break;
            case 'id-desc':
                sorted.sort((a, b) => String(b.id).localeCompare(String(a.id)));
                break;
            case 'type':
                sorted.sort((a, b) => {
                    const typeA = a.type || 'PNJ';
                    const typeB = b.type || 'PNJ';
                    // Ordre: PJ, PNJ, Monstre
                    const order = { 'PJ': 1, 'PNJ': 2, 'Monstre': 3 };
                    return (order[typeA] || 99) - (order[typeB] || 99);
                });
                break;
        }

        return sorted;
    }

    renderCharactersList() {
        const listContainer = document.getElementById('characters-list');
        if (!listContainer) return;

        // Vérifier si le mode Aventure est actif (MJ ou Player)
        const isAdventureActive = window.positionManager && typeof window.positionManager.isAdventureActive === 'function'
            ? window.positionManager.isAdventureActive()
            : (window.positionManager?.adventureMode === 'mj' || window.positionManager?.adventureMode === 'player');

        // Filtrer les personnages par carte active si demandé
        let filteredCharacters = this.characters.filter(character => {
            if (this.filters.activeMap) {
                return this.isCharacterOnActiveMap(character);
            }
            return true;
        });

        // En mode Aventure (MJ/Player) : filtrer UNIQUEMENT les personnages connus
        if (isAdventureActive) {
            filteredCharacters = filteredCharacters.filter(character => {
                return character.known === true;
            });
        } else {
            // Mode Normal : appliquer les filtres standards
            
            // Appliquer les filtres de type
            filteredCharacters = filteredCharacters.filter(character => {
                const type = character.type || 'PNJ';
                if (type === 'PJ') return this.filters.pj;
                if (type === 'PNJ') return this.filters.pnj;
                if (type === 'Monstre') return this.filters.monstre;
                return true;
            });

            // Appliquer les filtres de statut
            filteredCharacters = filteredCharacters.filter(character => {
                // Si aucun filtre n'est coché, afficher tous les personnages
                if (!this.filters.known && !this.filters.met) return true;

                // Si les deux filtres sont cochés, afficher les personnages connus OU rencontrés
                if (this.filters.known && this.filters.met) {
                    return character.known === true || character.met === true;
                }

                // Si seulement "Connus" est coché
                if (this.filters.known && !this.filters.met) {
                    return character.known === true;
                }

                // Si seulement "Rencontrés" est coché
                if (!this.filters.known && this.filters.met) {
                    return character.met === true;
                }

                return true;
            });

            // Appliquer le filtre "Prochaine Séance" sur le personnage lui-même (condition ET)
            if (this.filters.nextSession) {
                filteredCharacters = filteredCharacters.filter(character => {
                    return character.nextSession === true;
                });
            }
        }

        if (filteredCharacters.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <i class="fas fa-users fa-3x mb-4"></i>
                    <p class="text-lg">Aucun personnage pour cette carte</p>
                    <p class="text-sm mt-2">Cliquez sur "Ajouter un personnage" pour commencer</p>
                </div>
            `;
            return;
        }

        // Regrouper les personnages par lieu et région
        const locationsData = window.locationsData?.locations || [];
        const regionsData = window.regionsData?.regions || [];

        // Créer des groupes par lieu
        const locationGroups = {};
        const regionGroups = {};
        const noAssociationCharacters = [];

        filteredCharacters.forEach(character => {
            const hasLocations = character.associatedLocations && character.associatedLocations.length > 0;
            const hasRegions = character.associatedRegions && character.associatedRegions.length > 0;

            if (!hasLocations && !hasRegions) {
                noAssociationCharacters.push(character);
                return;
            }

            // Ajouter aux groupes de lieux
            if (hasLocations) {
                character.associatedLocations.forEach(locationId => {
                    const location = locationsData.find(loc => String(loc.id) === String(locationId));
                    if (location) {
                        if (this.filters.knownLocations && !location.known) {
                            return;
                        }
                        const locationName = location.name;
                        if (!locationGroups[locationName]) {
                            locationGroups[locationName] = [];
                        }
                        locationGroups[locationName].push(character);
                    }
                });
            }

            // Ajouter aux groupes de régions
            if (hasRegions) {
                character.associatedRegions.forEach(regionId => {
                    const region = regionsData.find(reg => String(reg.id) === String(regionId));
                    if (region) {
                        if (this.filters.knownLocations && !region.known) {
                            return;
                        }
                        const regionName = region.name;
                        if (!regionGroups[regionName]) {
                            regionGroups[regionName] = [];
                        }
                        regionGroups[regionName].push(character);
                    }
                });
            }
        });

        // Trier les noms de lieux et régions alphabétiquement
        const sortedLocationNames = Object.keys(locationGroups).sort((a, b) => a.localeCompare(b));
        const sortedRegionNames = Object.keys(regionGroups).sort((a, b) => a.localeCompare(b));

        // Générer le HTML
        let html = '';

        // Afficher les groupes de lieux
        sortedLocationNames.forEach(locationName => {
            html += `
                <div class="mb-6">
                    <h3 class="text-lg font-bold text-purple-400 mb-3 flex items-center">
                        <i class="fas fa-map-marker-alt mr-2"></i>${locationName}
                    </h3>
                    <div class="space-y-2">
                        ${locationGroups[locationName].map(character => this.renderCharacterCard(character)).join('')}
                    </div>
                </div>
            `;
        });

        // Afficher les groupes de régions
        sortedRegionNames.forEach(regionName => {
            html += `
                <div class="mb-6">
                    <h3 class="text-lg font-bold text-orange-400 mb-3 flex items-center">
                        <i class="fas fa-mountain mr-2"></i>${regionName}
                    </h3>
                    <div class="space-y-2">
                        ${regionGroups[regionName].map(character => this.renderCharacterCard(character)).join('')}
                    </div>
                </div>
            `;
        });

        // Afficher les personnages sans association
        if (noAssociationCharacters.length > 0) {
            html += `
                <div class="mb-6">
                    <h3 class="text-lg font-bold text-gray-400 mb-3 flex items-center">
                        <i class="fas fa-question-circle mr-2"></i>Sans Lieu ou Région
                    </h3>
                    <div class="space-y-2">
                        ${noAssociationCharacters.map(character => this.renderCharacterCard(character)).join('')}
                    </div>
                </div>
            `;
        }

        listContainer.innerHTML = html;
    }

    renderCharacterCard(character) {
        // Sélectionner l'image à afficher
        // Priorité 1: Image marquée explicitement comme "vignette" (avec crop data)
        // Priorité 2: Image marquée comme "principale"
        // Priorité 3: La première image disponible
        let displayImage = character.images?.find(img => img.type === 'vignette');

        if (!displayImage) {
            displayImage = character.images?.find(img => img.type === 'principale');
        }

        if (!displayImage && character.images?.length > 0) {
            displayImage = character.images[0];
        }

        // Nettoyage: Si l'URL contient encore "/thumbs/", on essaie de revenir à l'image originale
        // car on ne veut plus utiliser les fichiers physiques de thumbnails qui sont souvent manquants
        if (displayImage && displayImage.url && displayImage.url.includes('/thumbs/')) {
            // Tenter de reconstruire l'URL originale
            // Ex: .../thumbs/thumb_image.png -> .../image.png
            // Ex: .../thumbs/image_thumb.png -> .../image.png
            // C'est une heuristique, mais ça peut sauver des affichages
            let originalUrl = displayImage.url.replace('/thumbs/', '/');
            originalUrl = originalUrl.replace('thumb_', '');
            originalUrl = originalUrl.replace('_thumb', '');

            // On ne modifie pas l'objet image persistant ici pour éviter des effets de bord,
            // on crée juste un objet temporaire pour l'affichage
            displayImage = { ...displayImage, url: originalUrl };
        }

        // Déterminer la couleur du cartouche selon le type
        let typeClass = 'bg-green-600';
        let borderClass = 'border-green-500';
        const type = character.type || 'PNJ';

        if (type === 'PJ') {
            typeClass = 'bg-blue-600';
            borderClass = 'border-blue-500';
        } else if (type === 'Monstre') {
            typeClass = 'bg-red-600';
            borderClass = 'border-red-500';
        }

        // Calculer le transform CSS pour la vignette
        let thumbnailStyle = '';
        // Si on a des données de crop (soit sur une vraie vignette, soit sur une image principale utilisée comme vignette)
        // On vérifie d'abord si une vignette explicite existe pour récupérer ses données de crop
        const explicitVignette = character.images?.find(img => img.type === 'vignette');
        const cropSource = explicitVignette || displayImage;

        if (cropSource?.thumbnailCrop) {
            const crop = cropSource.thumbnailCrop;
            const zoom = crop.zoom || 1;
            const offsetX = crop.offsetX || 0;
            const offsetY = crop.offsetY || 0;
            thumbnailStyle = `style="transform: scale(${zoom}) translate(${offsetX}%, ${offsetY}%); transform-origin: center;"`;
        }

        const clickHandler = `onclick="window.charactersManager.showCharacterInfoBox('${character.id}')"`;
        const cursorClass = 'cursor-pointer';
        const hoverClass = 'hover:bg-gray-600';

        // Tronquer la description à 150 caractères
        const shortDescription = character.description 
            ? (character.description.length > 150 
                ? character.description.substring(0, 150) + '...' 
                : character.description)
            : '';

        return `
            <div class="character-card bg-gray-700 rounded-lg p-4 ${hoverClass} transition-colors ${cursorClass}" 
                 data-character-id="${character.id}"
                 ${clickHandler}>
                <div class="flex items-center space-x-4">
                    ${displayImage ? `
                        <div class="w-16 h-16 rounded-full overflow-hidden border-2 ${borderClass} flex-shrink-0">
                            <img src="${displayImage.url}" alt="${character.name}"
                                 class="w-full h-full object-cover" ${thumbnailStyle}
                                 onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iMjAgMjF2LTJhNCA0IDAgMCAwLTQtNEg4YTQgNCAwIDAgMC00IDR2MiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iNyIgcj0iNCIvPjwvc3ZnPg=='; this.style.transform='none'; this.parentElement.classList.add('bg-gray-600', 'flex', 'items-center', 'justify-content');">
                        </div>
                    ` : `
                        <div class="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center border-2 ${borderClass} flex-shrink-0">
                            <i class="fas fa-user text-2xl text-gray-400"></i>
                        </div>
                    `}
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="text-lg font-bold">${character.name}</h3>
                            <span class="inline-block px-2 py-1 text-xs rounded ${typeClass} flex-shrink-0">
                                ${type}
                            </span>
                        </div>
                        ${shortDescription ? `
                            <p class="text-sm text-gray-300 mb-2 line-clamp-2">${shortDescription}</p>
                        ` : ''}
                    </div>
                    <i class="fas fa-chevron-right text-gray-400 flex-shrink-0"></i>
                </div>
            </div>
        `;
    }

    getAssociatedLocationNames(character) {
        if (!character.associatedLocations || character.associatedLocations.length === 0) {
            return [];
        }

        // Correction: S'assurer que window.locationsData est défini avant d'y accéder
        const locationsData = window.locationsData || { locations: [] };
        if (!locationsData.locations) {
            return [];
        }

        return character.associatedLocations
            .map(locationId => {
                const location = locationsData.locations.find(loc => String(loc.id) === String(locationId));
                return location ? location.name : null;
            })
            .filter(name => name !== null);
    }

    getAssociatedRegionNames(character) {
        if (!character.associatedRegions || character.associatedRegions.length === 0) {
            return [];
        }

        // Correction: S'assurer que window.regionsData est défini avant d'y accéder
        const regionsData = window.regionsData || { regions: [] };
        if (!regionsData.regions) {
            return [];
        }

        return character.associatedRegions
            .map(regionId => {
                const region = regionsData.regions.find(reg => String(reg.id) === String(regionId));
                return region ? region.name : null;
            })
            .filter(name => name !== null);
    }

    openAddCharacterModal() {
        const modal = document.getElementById('add-character-modal');
        if (modal) {
            modal.classList.remove('hidden');

            // Réinitialiser le formulaire
            document.getElementById('character-name-input').value = '';
            document.getElementById('character-desc-input').value = '';
            document.getElementById('character-type-pj').checked = true;

            // Réinitialiser le bouton Wizard et le champ de description
            this.resetCharacterDescriptionButton();

            // Réinitialiser le composant d'upload
            const uploadContainer = document.getElementById('character-image-upload-container');
            if (uploadContainer && window.uploadManager) {
                uploadContainer.innerHTML = '';
                window.uploadManager.createImageSelector(uploadContainer, 'locations', (result) => {
                    if (result) {
                        this.handleImageUpload(result);
                    }
                });
            }

            // Réinitialiser la liste des images
            this.tempCharacterImages = [];
            this.updateImagesList();
        }
    }

    closeAddCharacterModal() {
        const modal = document.getElementById('add-character-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    handleImageUpload(uploadResult) {
        if (!this.tempCharacterImages) {
            this.tempCharacterImages = [];
        }

        const newImage = {
            url: uploadResult.url,
            type: this.tempCharacterImages.length === 0 ? 'principale' : null
        };

        this.tempCharacterImages.push(newImage);
        this.updateImagesList();
    }

    updateImagesList() {
        const listContainer = document.getElementById('character-images-list');
        if (!listContainer) return;

        if (!this.tempCharacterImages || this.tempCharacterImages.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-500 text-sm">Aucune image ajoutée</p>';
            return;
        }

        const html = this.tempCharacterImages.map((image, index) => `
            <div class="flex items-center justify-between bg-gray-700 p-2 rounded mb-2">
                <div class="flex items-center flex-grow">
                    <img src="${image.url}" alt="Preview" class="w-12 h-12 object-cover rounded mr-3">
                    <div class="flex-grow">
                        <div class="text-sm">${image.url.substring(0, 30)}...</div>
                        <div class="flex items-center space-x-2 mt-1">
                            ${image.type === 'principale' ? '<span class="text-xs bg-blue-500 text-white px-2 py-1 rounded">Principale</span>' : ''}
                            ${image.type === 'vignette' ? '<span class="text-xs bg-green-500 text-white px-2 py-1 rounded">Vignette</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="flex space-x-1 ml-2">
                    <button onclick="window.charactersManager.toggleImageTypeMenu(${index})" 
                            class="text-blue-400 hover:text-blue-300 p-1" title="Changer le type">
                        <i class="fas fa-tag"></i>
                    </button>
                    <div id="char-image-type-menu-${index}" class="hidden absolute right-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-10 w-32">
                        <button onclick="window.charactersManager.setImageType(${index}, 'principale')" 
                                class="block w-full text-left px-3 py-2 text-sm hover:bg-gray-700">Principale</button>
                        <button onclick="window.charactersManager.setImageType(${index}, 'vignette')" 
                                class="block w-full text-left px-3 py-2 text-sm hover:bg-gray-700">Vignette</button>
                        <button onclick="window.charactersManager.setImageType(${index}, null)" 
                                class="block w-full text-left px-3 py-2 text-sm hover:bg-gray-700">Sans type</button>
                    </div>
                    <button onclick="window.charactersManager.removeImage(${index})" 
                            class="text-red-400 hover:text-red-300 p-1" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        listContainer.innerHTML = html;
    }

    toggleImageTypeMenu(index) {
        const menu = document.getElementById(`char-image-type-menu-${index}`);
        if (menu) {
            document.querySelectorAll('[id^="char-image-type-menu-"]').forEach(m => {
                if (m !== menu) m.classList.add('hidden');
            });
            menu.classList.toggle('hidden');
        }
    }

    setImageType(index, type) {
        if (!this.tempCharacterImages || index < 0 || index >= this.tempCharacterImages.length) {
            return;
        }

        // Si on définit une image comme principale/vignette, retirer ce type des autres
        if (type === 'principale' || type === 'vignette') {
            this.tempCharacterImages.forEach((img, i) => {
                if (i !== index && img.type === type) {
                    img.type = null;
                }
            });
        }

        this.tempCharacterImages[index].type = type;
        this.updateImagesList();
    }

    removeImage(index) {
        if (!this.tempCharacterImages || index < 0 || index >= this.tempCharacterImages.length) {
            return;
        }

        this.tempCharacterImages.splice(index, 1);
        this.updateImagesList();
    }

    // Méthode pour réinitialiser l'état du bouton Wizard
    resetCharacterDescriptionButton() {
        const generateBtn = document.getElementById('generate-character-desc');
        const descInput = document.getElementById('character-desc-input');
        if (generateBtn && descInput) {
            generateBtn.innerHTML = '<span class="gemini-icon">✨</span>';
            generateBtn.disabled = false;
            descInput.disabled = false;
            this.isGeneratingDescription = false;
        }
    }

    // Méthode pour mettre à jour l'état du bouton Wizard en mode loader
    setGeneratingDescriptionState() {
        const generateBtn = document.getElementById('generate-character-desc');
        const descInput = document.getElementById('character-desc-input');
        if (generateBtn) {
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Icône de chargement
            generateBtn.disabled = true;
        }
        if (descInput) {
            descInput.disabled = true;
        }
        this.isGeneratingDescription = true;
    }

    // Méthode pour générer la description avec Gemini
    async generateCharacterDescription() {
        if (this.isGeneratingDescription) return;

        this.setGeneratingDescriptionState();

        try {
            // 1. Récupérer les données contextuelles
            const characterType = document.querySelector('input[name="character-type"]:checked').value;
            const characterName = document.getElementById('character-name-input').value.trim();
            const characterDescriptionInput = document.getElementById('character-desc-input').value.trim(); // Description pré-existante
            const activeMapUrl = window.settingsManager?.activeMapUrl || 'fr_tor_2nd_eriadors_map_page-0001.webp';
            const activeMapName = window.settingsManager?.activeMapName || 'Carte inconnue';

            // Obtenir les détails de la carte active (région, lieu)
            const currentPos = window.positionManager?.currentPosition || { x: 0, y: 0 }; // Position du marqueur de position

            // Chercher le lieu le plus proche (à 50 pixels près)
            let activeLocation = null;
            let minDistance = 50; // Seuil de proximité

            if (window.locationsData && window.locationsData.locations) {
                window.locationsData.locations.forEach(location => {
                    const dx = location.coordinates.x - currentPos.x;
                    const dy = location.coordinates.y - currentPos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < minDistance) {
                        minDistance = distance;
                        activeLocation = location;
                    }
                });
            }

            // Chercher la région contenant le lieu ou la position
            let activeRegion = null;
            if (window.regionsData && window.regionsData.regions) {
                window.regionsData.regions.forEach(region => {
                    if (region.coordinates && Array.isArray(region.coordinates)) {
                        // Vérifier si le point est dans le polygone
                        const point = activeLocation ? activeLocation.coordinates : currentPos;
                        if (this.isPointInPolygon(point, region.coordinates)) {
                            activeRegion = region;
                        }
                    }
                });
            }

            // 2. Construire le prompt pour Gemini
            let prompt = `Tu es un assistant spécialisé dans la création de personnages pour des jeux de rôle dans l'univers de la Terre du Milieu (Tolkien).\n\n`;
            prompt += `Génère une description immersive et cohérente pour un personnage avec les informations suivantes :\n\n`;

            // a- Type de personnage
            prompt += `**Type** : ${characterType === 'PJ' ? 'Personnage Joueur' : characterType === 'PNJ' ? 'Personnage Non Joueur' : 'Monstre'}\n\n`;

            // b- Contexte de localisation
            prompt += `**Contexte géographique** :\n`;
            prompt += `- Carte actuelle : ${activeMapName}\n`;
            if (activeRegion) {
                prompt += `- Région : ${activeRegion.name}\n`;
            }
            if (activeLocation) {
                prompt += `- Lieu proche : ${activeLocation.name}\n`;
            }
            prompt += `- Position approximative : (${Math.round(currentPos.x)}, ${Math.round(currentPos.y)})\n\n`;

            // c- Nom et description existante du personnage
            if (characterName) {
                prompt += `**Nom** : ${characterName}\n\n`;
            }
            if (characterDescriptionInput) {
                prompt += `**Description déjà existante** : ${characterDescriptionInput}\n\n`;
            }

            prompt += `**Instructions** :\n`;
            prompt += `- Génère une description de **maximum 3 paragraphes**\n`;
            prompt += `- Inclus obligatoirement :\n`;
            prompt += `  1. L'origine précise du personnage (ex: "Un Nain des Montagnes Bleues", "Un Rôdeur du Gondor")\n`;
            prompt += `  2. Son occupation actuelle\n`;
            prompt += `  3. Ce qu'il cherche/désire actuellement et pourquoi il se trouve dans cette région\n`;
            prompt += `- Reste cohérent avec l'univers de Tolkien\n`;
            prompt += `- Sois concis et immersif\n\n`;
            prompt += `**Réponds UNIQUEMENT avec la description, sans titre ni formatage supplémentaire.**`;

            // Log du prompt pour debug
            console.log("🤖 [CharactersManager] Prompt envoyé à Gemini :");
            console.log(prompt);

            // 3. Appeler l'API Gemini
            const generatedDescription = await window.geminiManager.generateContent(prompt, null, 'character_description');

            if (generatedDescription && typeof generatedDescription === 'string') {
                document.getElementById('character-desc-input').value = generatedDescription.trim();
                this.showNotification("Description générée", "La description du personnage a été générée par Gemini.", "success");
                console.log("✅ Description générée avec succès");
            } else {
                console.error("❌ Gemini API response invalid:", generatedDescription);
                this.showNotification("Erreur de génération", "Impossible de générer la description avec Gemini. Réponse invalide.", "error");
            }

        } catch (error) {
            console.error("❌ Erreur lors de la génération de la description:", error);
            this.showNotification("Erreur de génération", `Une erreur est survenue : ${error.message}`, "error");
        } finally {
            // 4. Réactiver le bouton et désactiver le loader
            this.resetCharacterDescriptionButton();
        }
    }


    confirmAddCharacter() {
        const name = document.getElementById('character-name-input').value.trim();
        const description = document.getElementById('character-desc-input').value.trim();

        // Déterminer le type sélectionné
        let type = 'PNJ'; // Valeur par défaut
        if (document.getElementById('character-type-pj').checked) {
            type = 'PJ';
        } else if (document.getElementById('character-type-pnj').checked) {
            type = 'PNJ';
        } else if (document.getElementById('character-type-monstre').checked) {
            type = 'Monstre';
        }

        if (!name) {
            alert('Le nom du personnage est obligatoire');
            return;
        }

        // Récupérer la carte active (uniquement pour les logs, plus d'association directe)
        const activeMapId = window.settingsManager?.activeMapUrl || 'inconnu';

        const newCharacter = {
            id: Date.now(),
            name: name,
            description: description,
            type: type,
            images: this.tempCharacterImages || []
            // mapId supprimé : la relation est désormais via les lieux/régions
        };

        this.characters.push(newCharacter);
        this.saveCharactersToLocal();

        this.closeAddCharacterModal();
        this.renderCharactersList();

        console.log(`✅ Personnage créé: ${name} (${type})`);
    }

    showCharacterInfoBox(characterId) {
        // Recharger les données depuis localStorage pour avoir les associations à jour
        this.loadCharactersFromLocal();

        const character = this.characters.find(c => String(c.id) === String(characterId));
        if (!character) {
            console.warn(`Personnage non trouvé avec l'ID: ${characterId}`);
            return;
        }

        console.log(`👁️ [showCharacterInfoBox] Affichage de "${character.name}" avec:`, {
            associatedLocations: character.associatedLocations || [],
            associatedRegions: character.associatedRegions || []
        });

        // NE PAS fermer la modale de personnages - elle restera visible en arrière-plan
        // this.closeCharactersModal(); // SUPPRIMÉ

        // Utiliser la même infobox que les lieux
        if (window.infoBoxManager) {
            // Réinitialiser previousInfoBox car on vient de la liste des personnages, pas d'une InfoBox
            window.infoBoxManager.previousInfoBox = null;

            // Créer un événement simulé pour le positionnement
            const fakeEvent = {
                clientX: window.innerWidth / 2,
                clientY: window.innerHeight / 2,
                type: 'click'
            };
            window.infoBoxManager.showInfoBox(fakeEvent, character, 'character');

            // Forcer l'affichage de l'onglet Description avec rafraîchissement du contenu
            setTimeout(() => {
                console.log(`📋 [showCharacterInfoBox] Affichage forcé de l'onglet Description pour ${character.name}`);
                window.infoBoxManager.switchTab('text');
                // Forcer le re-render du contenu de l'onglet Description
                window.infoBoxManager.renderReadMode();
            }, 100);
        }
    }

    deleteCharacter(characterId) {
        const index = this.characters.findIndex(c => String(c.id) === String(characterId));
        if (index === -1) return;

        const character = this.characters[index];
        if (!confirm(`Supprimer le personnage "${character.name}" ?`)) {
            return;
        }

        this.characters.splice(index, 1);
        this.saveCharactersToLocal();

        // Fermer l'infobox et rafraîchir la liste
        if (window.infoBoxManager) {
            window.infoBoxManager.hideInfoBox();
        }
        this.openCharactersModal();

        console.log(`🗑️ Personnage supprimé: ${character.name}`);
    }

    updateCharacter(characterId, updates) {
        const character = this.characters.find(c => String(c.id) === String(characterId));
        if (!character) {
            console.warn(`Personnage non trouvé avec l'ID: ${characterId}`);
            return;
        }

        Object.assign(character, updates);
        this.saveCharactersToLocal();

        console.log(`✏️ Personnage mis à jour: ${character.name}`);
    }

    exportCharacters() {
        try {
            console.log("📤 Starting characters export...");

            const activeMapUrl = window.settingsManager?.activeMapUrl;
            const activeMapName = window.settingsManager?.activeMapName || 'Carte';

            if (!activeMapUrl) {
                this.showNotification("Erreur d'export", "Aucune carte active", "error");
                return;
            }

            // IMPORTANT: Recharger depuis localStorage pour avoir les données à jour
            this.loadCharactersFromLocal();

            console.log(`📤 [exportCharacters] Total personnages disponibles: ${this.characters?.length || 0}`);

            // Filtrer les personnages par carte active (ou tous si le filtre est désactivé)
            const charactersToExport = this.characters.filter(character => {
                // Si le filtre "Carte active" est activé, on filtre
                if (this.filters.activeMap) {
                    return this.isCharacterOnActiveMap(character);
                }
                // Sinon on exporte tout
                return true;
            });

            const exportData = {
                characters: charactersToExport.map(character => ({
                    id: character.id,
                    name: character.name,
                    description: character.description || "",
                    type: character.type || "PNJ", // Exporte PJ, PNJ ou Monstre
                    images: character.images || [],
                    associatedLocations: character.associatedLocations || [],
                    associatedRegions: character.associatedRegions || []
                    // mapId supprimé de l'export
                }))
            };

            // Nom de fichier basé sur la carte active
            const sanitizedMapName = activeMapName.replace(/[^a-z0-9]/gi, '_');
            const fileName = `${sanitizedMapName}_Personnages.json`;

            // Télécharger le fichier
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", fileName);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            document.body.removeChild(downloadAnchorNode);

            console.log(`✅ Export terminé - ${charactersToExport.length} personnages de "${activeMapName}" sauvegardés`);
            this.showNotification("Export réussi", `${charactersToExport.length} personnages de "${activeMapName}" exportés`, "success");

        } catch (error) {
            console.error("❌ Erreur lors de l'export des personnages:", error);
            this.showNotification("Erreur d'export", error.message, "error");
        }
    }

    handleImportCharacters(event) {
        // Vérifier si un import est déjà en cours
        if (this.isImporting) {
            console.log("⚠️ Import déjà en cours, ignoré");
            return;
        }

        const file = event.target.files[0];
        console.log("📥 Fichier sélectionné:", file ? file.name : "aucun");

        if (!file) return;

        this.isImporting = true;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                console.log("📥 JSON parsé avec succès:", importedData);

                if (!importedData.characters || !Array.isArray(importedData.characters)) {
                    this.showNotification("Import échoué", "Format de fichier invalide. Attendu: { characters: [...] }", "error");
                    this.isImporting = false;
                    return;
                }

                const importedCharacters = importedData.characters;
                console.log(`📥 ${importedCharacters.length} personnages à importer`);

                // Afficher la modal de confirmation
                this.showImportCharactersModal(importedCharacters);

            } catch (err) {
                console.error("❌ Erreur lors de l'import:", err);
                this.showNotification("Erreur d'import", "Fichier JSON invalide: " + err.message, "error");
                this.isImporting = false;
            }

            // Nettoyer l'input
            event.target.value = '';
        };

        reader.readAsText(file);
    }

    showImportCharactersModal(importedCharacters) {
        let message = `Voulez-vous importer ${importedCharacters.length} personnage(s) ?\n\n`;
        message += `Remplacer : Supprime tous les personnages existants\n`;
        message += `Fusionner : Ajoute les nouveaux personnages`;

        const userChoice = confirm(message + "\n\nOK = Remplacer, Annuler pour choisir Fusionner");

        if (userChoice === null) {
            this.isImporting = false;
            return; // Annulation complète
        }

        const mode = userChoice ? 'replace' : 'merge';
        this.processImportCharacters(importedCharacters, mode);
    }

    processImportCharacters(importedCharacters, mode) {
        try {
            if (mode === 'replace') {
                console.log("📥 Mode REPLACE - Remplacement de tous les personnages");
                this.characters = importedCharacters.map(char => {
                    const newChar = {
                        id: String(char.id || Date.now() + Math.random()),
                        name: char.name || 'Personnage sans nom',
                        description: char.description || '',
                        type: char.type || 'PNJ',
                        images: char.images || [],
                        associatedLocations: (char.associatedLocations || []).map(id => String(id)),
                        associatedRegions: (char.associatedRegions || []).map(id => String(id)),
                        Rumeurs: char.Rumeurs || (char.Rumeur ? [char.Rumeur] : [])
                        // mapId est implicitement exclu car non copié
                    };
                    return newChar;
                });
            } else {
                console.log("📥 Mode MERGE - Fusion des personnages");
                importedCharacters.forEach(importedChar => {
                    // Normaliser les IDs de l'import avant la comparaison
                    const normalizedImportedChar = {
                        ...importedChar,
                        id: String(importedChar.id || Date.now() + Math.random()),
                        associatedLocations: (importedChar.associatedLocations || []).map(id => String(id)),
                        associatedRegions: (importedChar.associatedRegions || []).map(id => String(id)),
                        Rumeurs: importedChar.Rumeurs || (importedChar.Rumeur ? [importedChar.Rumeur] : [])
                    };
                    // Supprimer mapId si présent
                    delete normalizedImportedChar.mapId;

                    const existingChar = this.characters.find(c => String(c.id) === normalizedImportedChar.id);

                    if (existingChar) {
                        // Mettre à jour le personnage existant
                        Object.assign(existingChar, {
                            description: normalizedImportedChar.description || existingChar.description,
                            type: normalizedImportedChar.type || existingChar.type,
                            images: normalizedImportedChar.images || existingChar.images,
                            associatedLocations: normalizedImportedChar.associatedLocations || existingChar.associatedLocations,
                            associatedRegions: normalizedImportedChar.associatedRegions || existingChar.associatedRegions,
                            Rumeurs: normalizedImportedChar.Rumeurs || existingChar.Rumeurs
                        });
                        console.log(`🔄 Personnage mis à jour: ${normalizedImportedChar.name} (ID: ${normalizedImportedChar.id})`);
                    } else {
                        // Ajouter le nouveau personnage avec un ID unique
                        const newChar = {
                            id: normalizedImportedChar.id,
                            name: normalizedImportedChar.name || 'Personnage sans nom',
                            description: normalizedImportedChar.description || '',
                            type: normalizedImportedChar.type || 'PNJ',
                            images: normalizedImportedChar.images || [],
                            associatedLocations: normalizedImportedChar.associatedLocations,
                            associatedRegions: normalizedImportedChar.associatedRegions,
                            Rumeurs: normalizedImportedChar.Rumeurs
                        };
                        this.characters.push(newChar);
                        console.log(`➕ Nouveau personnage ajouté: ${normalizedImportedChar.name}`);
                    }
                });
            }

            this.saveCharactersToLocal();
            this.renderCharactersList();

            this.showNotification("Import réussi", `${importedCharacters.length} personnage(s) importé(s) (mode: ${mode})`, "success");
            console.log(`✅ Import terminé: ${importedCharacters.length} personnages`);

            // Synchronisation bidirectionnelle Lieux ↔ PNJ
            console.log("🔄 [Import] Synchronisation automatique Lieux ↔ PNJ");
            this.syncCharacterLocationsFromLocationData();

            // Auto-sync cloud
            console.log("☁️ [Import] Synchronisation cloud forcée après import");
            if (typeof scheduleAutoSync === 'function') {
                scheduleAutoSync();
            }
            if (typeof window.authManager?.syncUserData === 'function') {
                window.authManager.syncUserData();
            }

        } catch (error) {
            console.error("❌ Erreur lors du traitement de l'import:", error);
            this.showNotification("Erreur d'import", error.message, "error");
            this.isImporting = false;
        }
    }

    // Nouvelle méthode pour synchroniser les associations entre lieux et personnages
    syncCharacterLocationsFromLocationData() {
        if (!window.locationsData || !window.locationsData.locations) {
            console.warn("⚠️ Pas de données de localisation disponibles pour la synchronisation bidirectionnelle.");
            return;
        }

        // 1. Mettre à jour les personnages à partir des lieux
        window.locationsData.locations.forEach(location => {
            const associatedCharacterIds = location.associatedCharacters || [];
            const locationId = String(location.id);

            associatedCharacterIds.forEach(charId => {
                const character = this.characters.find(c => String(c.id) === String(charId));
                if (character) {
                    // Ajouter le lieu au personnage s'il n'y est pas déjà
                    if (!character.associatedLocations.includes(locationId)) {
                        character.associatedLocations.push(locationId);
                        console.log(`➕ Lieu "${location.name}" ajouté à "${character.name}"`);
                    }
                } else {
                    // Si le personnage n'existe pas encore, on pourrait le créer ici si nécessaire,
                    // mais pour l'instant, on ignore car on se concentre sur la mise à jour des existants.
                    console.log(`ℹ️ Personnage ${charId} associé au lieu "${location.name}" mais non trouvé dans la liste des personnages.`);
                }
            });
        });

        // 2. Mettre à jour les lieux à partir des personnages
        this.characters.forEach(character => {
            const associatedLocationIds = character.associatedLocations || [];
            const characterId = String(character.id);

            associatedLocationIds.forEach(locationId => {
                const location = window.locationsData.locations.find(loc => String(loc.id) === String(locationId));
                if (location) {
                    // Ajouter le personnage au lieu s'il n'y est pas déjà
                    if (!location.associatedCharacters.includes(characterId)) {
                        if (!location.associatedCharacters) {
                            location.associatedCharacters = [];
                        }
                        location.associatedCharacters.push(characterId);
                        console.log(`➕ Personnage "${character.name}" ajouté au lieu "${location.name}"`);

                        // Si les données de lieux sont modifiables (par exemple, dans un cache en mémoire ou via un manager dédié),
                        // il faudrait ici déclencher une sauvegarde ou une mise à jour.
                        // Pour l'instant, on assume que window.locationsData.locations est une référence modifiable.
                        // Une sauvegarde locale ou une mise à jour via un appel API serait nécessaire pour persister ces changements.
                    }
                } else {
                    console.warn(`⚠️ Lieu ${locationId} associé au personnage "${character.name}" mais non trouvé dans les données de lieux.`);
                }
            });
        });

        // Sauvegarder les modifications des personnages (les changements sur les lieux dépendent de leur gestion)
        this.saveCharactersToLocal();
        console.log("🔄 Synchronisation bidirectionnelle Lieux ↔ Personnages terminée.");
    }


    showNotification(title, message, type = 'info') {
        // Créer une notification simple
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;

        notification.innerHTML = `
            <div class="font-semibold">${title}</div>
            <div class="text-sm">${message}</div>
        `;

        document.body.appendChild(notification);

        // Supprimer après 5 secondes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    deleteAllCharactersForActiveMap() {
        const activeMapId = window.settingsManager?.activeMapUrl;
        const activeMapName = window.settingsManager?.activeMapName || 'cette carte';

        if (!activeMapId) {
            this.showNotification("Erreur", "Aucune carte active", "error");
            return;
        }

        // Préparer les listes de référence
        const allLocations = window.locationsData?.locations || [];
        const allRegions = window.regionsData?.regions || [];

        // Identifier les personnages à supprimer (associés EXCLUSIVEMENT à cette carte)
        const charactersToDelete = this.characters.filter(character => {
            // 1. A-t-il un lien avec la carte active ?
            const isLinkedToActiveMap = this.isCharacterOnActiveMap(character);
            if (!isLinkedToActiveMap) return false;

            // 2. A-t-il un lien avec UNE AUTRE carte ?
            let hasLinkToOtherMap = false;

            // Vérifier lieux
            if (character.associatedLocations) {
                const otherMapLoc = character.associatedLocations.some(locId => {
                    const loc = allLocations.find(l => String(l.id) === String(locId));
                    // Si le lieu a un mapId différent de l'actuel OU pas de mapId (global), on conserve
                    // On ne supprime que si le personnage est EXCLUSIVEMENT lié à des lieux spécifiques de CETTE carte
                    return loc && String(loc.mapId || '') !== String(activeMapId);
                });
                if (otherMapLoc) hasLinkToOtherMap = true;
            }

            // Vérifier régions
            if (!hasLinkToOtherMap && character.associatedRegions) {
                const otherMapReg = character.associatedRegions.some(regId => {
                    const reg = allRegions.find(r => String(r.id) === String(regId));
                    // Même logique pour les régions
                    return reg && String(reg.mapId || '') !== String(activeMapId);
                });
                if (otherMapReg) hasLinkToOtherMap = true;
            }

            // On supprime SI lié à la carte active ET PAS lié à une autre carte
            return !hasLinkToOtherMap;
        });

        if (charactersToDelete.length === 0) {
            this.showNotification("Information", "Aucun personnage associé exclusivement à cette carte.", "info");
            return;
        }

        // Double confirmation
        const firstConfirm = confirm(
            `⚠️ ATTENTION ⚠️\n\n` +
            `Vous allez supprimer DÉFINITIVEMENT ${charactersToDelete.length} personnage(s) associés EXCLUSIVEMENT à "${activeMapName}".\n\n` +
            `Les personnages partagés avec d'autres cartes seront conservés.\n\n` +
            `Voulez-vous continuer ?`
        );

        if (!firstConfirm) {
            return;
        }

        const doubleConfirm = confirm(
            `🚨 DERNIÈRE CONFIRMATION 🚨\n\n` +
            `Confirmez-vous la suppression de ces ${charactersToDelete.length} personnage(s) ?`
        );

        if (!doubleConfirm) {
            return;
        }

        try {
            console.log(`🗑️ Suppression de personnages exclusifs à la carte: ${activeMapId}`);

            // Créer un Set des IDs à supprimer pour performance
            const idsToDelete = new Set(charactersToDelete.map(c => c.id));

            // Filtrer la liste principale
            const initialCount = this.characters.length;
            this.characters = this.characters.filter(c => !idsToDelete.has(c.id));

            const deletedCount = initialCount - this.characters.length;
            console.log(`✅ ${deletedCount} personnage(s) supprimé(s)`);

            // Sauvegarder
            this.saveCharactersToLocal();

            // Rafraîchir la liste
            this.renderCharactersList();

            // Marquer comme non sauvegardé pour afficher l'icône cloud
            if (typeof window.markAsUnsaved === 'function') {
                window.markAsUnsaved();
            }

            // Notification de succès
            this.showNotification(
                "Suppression réussie", 
                `${deletedCount} personnage(s) supprimé(s) de "${activeMapName}"`, 
                "success"
            );

        } catch (error) {
            console.error("❌ Erreur lors de la suppression des personnages:", error);
            this.showNotification("Erreur", "Impossible de supprimer les personnages: " + error.message, "error");
        }
    }

    // Vérifie si un personnage est lié à la carte active via ses lieux/régions
    isCharacterOnActiveMap(character) {
        const activeMapId = window.settingsManager?.activeMapUrl;
        if (!activeMapId) return true; // Pas de carte active, on montre tout (ou rien, selon logique, mais ici tout est plus sûr)

        // 1. Vérifier les lieux associés
        if (character.associatedLocations && character.associatedLocations.length > 0) {
            const locations = window.locationsData?.locations || [];
            const hasLocationOnMap = character.associatedLocations.some(locId => {
                const location = locations.find(l => String(l.id) === String(locId));
                // Si le lieu a le bon mapId OU pas de mapId (lieu global), on considère qu'il est sur la carte
                return location && (!location.mapId || location.mapId === activeMapId);
            });
            if (hasLocationOnMap) return true;
        }

        // 2. Vérifier les régions associées
        if (character.associatedRegions && character.associatedRegions.length > 0) {
            const regions = window.regionsData?.regions || [];
            const hasRegionOnMap = character.associatedRegions.some(regId => {
                const region = regions.find(r => String(r.id) === String(regId));
                return region && (!region.mapId || region.mapId === activeMapId);
            });
            if (hasRegionOnMap) return true;
        }

        // Si aucune association, le personnage n'est pas "sur la carte" au sens strict
        return false;
    }

    // Fonction utilitaire pour vérifier si un point est dans un polygone
    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // Méthode pour récupérer toutes les données (pour synchronisation)
    getAllData() {
        return { characters: this.characters };
    }

    // Getter pour AuthManager
    get charactersData() {
        return { characters: this.characters };
    }

    // Setter pour AuthManager
    set charactersData(data) {
        this.loadCharacters(data);
    }

    // Méthode pour charger les personnages depuis des données externes (AuthManager)
    loadCharacters(data) {
        if (data && data.characters && Array.isArray(data.characters)) {
            this.characters = data.characters;
            console.log(`👥 CharactersManager: ${this.characters.length} personnages chargés via setter/loadCharacters`);
            this.renderCharactersList();
        } else {
            console.warn("⚠️ Données de personnages invalides reçues via setter/loadCharacters");
        }
    }

    // Ajout de la méthode addCharacter pour normaliser les IDs
    addCharacter(characterData) {
        const newCharacter = {
            id: String(Date.now() + Math.random()),
            name: characterData.name || 'Nouveau personnage',
            description: characterData.description || '',
            type: characterData.type || 'PNJ',
            images: characterData.images || [],
            associatedLocations: (characterData.associatedLocations || []).map(id => String(id)),
            associatedRegions: (characterData.associatedRegions || []).map(id => String(id))
            // Pas de mapId
        };

        this.characters.push(newCharacter);
        this.saveCharactersToLocal();
        this.renderCharactersList();

        console.log("✅ Personnage ajouté:", newCharacter.name, "ID:", newCharacter.id);
        return newCharacter;
    }
}

export default CharactersManager;

console.log("👥 CharactersManager module loaded");