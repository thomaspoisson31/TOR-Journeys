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
            met: false
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
            
            // Vérifier si le mode Aventure est actif
            const adventureMode = window.positionManager?.adventureMode || false;
            
            if (adventureMode) {
                // Mode Aventure : forcer le filtre "Connus" uniquement
                this.filters.known = true;
                this.filters.met = false;
                
                // Masquer la barre de filtres
                const filterContainer = modal.querySelector('.bg-gray-700.rounded-lg.p-3');
                if (filterContainer) {
                    filterContainer.style.display = 'none';
                }
            } else {
                // Mode Normal : afficher la barre de filtres
                const filterContainer = modal.querySelector('.bg-gray-700.rounded-lg.p-3');
                if (filterContainer) {
                    filterContainer.style.display = 'flex';
                }
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

        if (filterPJ) filterPJ.checked = this.filters.pj;
        if (filterPNJ) filterPNJ.checked = this.filters.pnj;
        if (filterMonstre) filterMonstre.checked = this.filters.monstre;
        if (filterKnown) filterKnown.checked = this.filters.known;
        if (filterMet) filterMet.checked = this.filters.met;
    }

    updateFilterUIState() {
        const filterIcon = document.getElementById('filter-status-icon');

        // Vérifier si au moins un filtre est actif
        const hasActiveFilters = !this.filters.pj || !this.filters.pnj || !this.filters.monstre || 
                                  this.filters.known || this.filters.met;

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

        // Vérifier si le mode Aventure est actif
        const adventureMode = window.positionManager?.adventureMode || false;

        // Filtrer les personnages par carte active
        const activeMapId = window.settingsManager?.activeMapUrl;
        let filteredCharacters = this.characters.filter(character => {
            // Afficher les personnages sans mapId OU ceux correspondant à la carte active
            if (!character.mapId || !activeMapId) return true;
            return character.mapId === activeMapId;
        });

        // En mode Aventure : filtrer UNIQUEMENT les personnages connus
        if (adventureMode) {
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
        }

        // Appliquer le tri
        filteredCharacters = this.sortCharacters(filteredCharacters);

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

        const html = filteredCharacters.map(character => {
            // Afficher UNIQUEMENT l'image de type "vignette"
            const thumbnailImage = character.images?.find(img => img.type === 'vignette');

            // Récupérer les noms des lieux et régions associés
            const associatedLocationNames = this.getAssociatedLocationNames(character);
            const associatedRegionNames = this.getAssociatedRegionNames(character);

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
            if (thumbnailImage?.thumbnailCrop) {
                const crop = thumbnailImage.thumbnailCrop;
                const zoom = crop.zoom || 1;
                const offsetX = crop.offsetX || 0;
                const offsetY = crop.offsetY || 0;
                thumbnailStyle = `style="transform: scale(${zoom}) translate(${offsetX}%, ${offsetY}%); transform-origin: center;"`;
            }

            const isAdventureMode = window.positionManager?.adventureMode || false;
            const clickHandler = isAdventureMode ? '' : `onclick="window.charactersManager.showCharacterInfoBox('${character.id}')"`;
            const cursorClass = isAdventureMode ? 'cursor-default' : 'cursor-pointer';
            const hoverClass = isAdventureMode ? '' : 'hover:bg-gray-600';

            return `
                <div class="character-card bg-gray-700 rounded-lg p-4 ${hoverClass} transition-colors ${cursorClass}" 
                     data-character-id="${character.id}"
                     ${clickHandler}>
                    <div class="flex items-center space-x-4">
                        ${thumbnailImage ? `
                            <div class="w-16 h-16 rounded-full overflow-hidden border-2 ${borderClass}">
                                <img src="${thumbnailImage.url}" alt="${character.name}" 
                                     class="w-full h-full object-cover" ${thumbnailStyle}>
                            </div>
                        ` : `
                            <div class="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center border-2 ${borderClass}">
                                <i class="fas fa-user text-2xl text-gray-400"></i>
                            </div>
                        `}
                        <div class="flex-1">
                            <h3 class="text-lg font-bold">${character.name}</h3>
                            <div class="flex flex-wrap gap-2 mt-1">
                                <span class="inline-block px-2 py-1 text-xs rounded ${typeClass}">
                                    ${type}
                                </span>
                                ${associatedLocationNames.map(name => `
                                    <span class="inline-block px-2 py-1 text-xs rounded bg-purple-600">
                                        <i class="fas fa-map-marker-alt mr-1"></i>${name}
                                    </span>
                                `).join('')}
                                ${associatedRegionNames.map(name => `
                                    <span class="inline-block px-2 py-1 text-xs rounded bg-orange-600">
                                        <i class="fas fa-mountain mr-1"></i>${name}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                        <i class="fas fa-chevron-right text-gray-400"></i>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = html;
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

        // Récupérer la carte active
        const activeMapId = window.settingsManager?.activeMapUrl || 'fr_tor_2nd_eriadors_map_page-0001.webp';

        const newCharacter = {
            id: Date.now(),
            name: name,
            description: description,
            type: type,
            images: this.tempCharacterImages || [],
            mapId: activeMapId
        };

        this.characters.push(newCharacter);
        this.saveCharactersToLocal();

        this.closeAddCharacterModal();
        this.renderCharactersList();

        console.log(`✅ Personnage créé: ${name} (${type}) avec mapId: ${activeMapId}`);
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

            // Filtrer les personnages par carte active
            const charactersToExport = this.characters.filter(character => {
                // Exporter les personnages sans mapId OU ceux correspondant à la carte active
                if (!character.mapId) return true;
                return character.mapId === activeMapUrl;
            });

            const exportData = {
                characters: charactersToExport.map(character => ({
                    id: character.id,
                    name: character.name,
                    description: character.description || "",
                    type: character.type || "PNJ", // Exporte PJ, PNJ ou Monstre
                    images: character.images || [],
                    associatedLocations: character.associatedLocations || [],
                    associatedRegions: character.associatedRegions || [],
                    mapId: character.mapId || null
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
        // Vérifier si les personnages ont des mapId différents de la carte active
        const activeMapId = window.settingsManager?.activeMapUrl;
        const differentMapIds = new Set();

        importedCharacters.forEach(char => {
            if (char.mapId && char.mapId !== activeMapId) {
                differentMapIds.add(char.mapId);
            }
        });

        let message = `Voulez-vous importer ${importedCharacters.length} personnage(s) ?\n\n`;

        if (differentMapIds.size > 0) {
            message += `⚠️ ATTENTION : Ces personnages proviennent d'une autre carte.\n`;
            message += `Ils seront réassignés à la carte active actuelle.\n\n`;
        }

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
            // Récupérer la carte active pour associer les personnages importés
            const activeMapId = window.settingsManager?.activeMapUrl || 'fr_tor_2nd_eriadors_map_page-0001.webp';

            if (mode === 'replace') {
                console.log("📥 Mode REPLACE - Remplacement de tous les personnages");
                this.characters = importedCharacters.map(char => ({
                    id: String(char.id || Date.now() + Math.random()),
                    name: char.name || 'Personnage sans nom',
                    description: char.description || '',
                    type: char.type || 'PNJ',
                    images: char.images || [],
                    associatedLocations: (char.associatedLocations || []).map(id => String(id)),
                    associatedRegions: (char.associatedRegions || []).map(id => String(id)),
                    mapId: char.mapId || activeMapId,
                    Rumeurs: char.Rumeurs || (char.Rumeur ? [char.Rumeur] : [])
                }));
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

                    const existingChar = this.characters.find(c => String(c.id) === normalizedImportedChar.id);

                    if (existingChar) {
                        // Mettre à jour le personnage existant
                        Object.assign(existingChar, {
                            description: normalizedImportedChar.description || existingChar.description,
                            type: normalizedImportedChar.type || existingChar.type,
                            images: normalizedImportedChar.images || existingChar.images,
                            associatedLocations: normalizedImportedChar.associatedLocations || existingChar.associatedLocations,
                            associatedRegions: normalizedImportedChar.associatedRegions || existingChar.associatedRegions,
                            mapId: normalizedImportedChar.mapId || existingChar.mapId || activeMapId,
                            Rumeurs: normalizedImportedChar.Rumeurs || existingChar.Rumeurs
                        });
                        console.log(`🔄 Personnage mis à jour: ${normalizedImportedChar.name} (ID: ${normalizedImportedChar.id})`);
                    } else {
                        // Ajouter le nouveau personnage avec un ID unique et le mapId
                        const newChar = {
                            id: normalizedImportedChar.id,
                            name: normalizedImportedChar.name || 'Personnage sans nom',
                            description: normalizedImportedChar.description || '',
                            type: normalizedImportedChar.type || 'PNJ',
                            images: normalizedImportedChar.images || [],
                            associatedLocations: normalizedImportedChar.associatedLocations,
                            associatedRegions: normalizedImportedChar.associatedRegions,
                            mapId: normalizedImportedChar.mapId || activeMapId,
                            Rumeurs: normalizedImportedChar.Rumeurs
                        };
                        this.characters.push(newChar);
                        console.log(`➕ Nouveau personnage ajouté: ${normalizedImportedChar.name} avec mapId: ${newChar.mapId}`);
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

        // Compter les personnages qui seront supprimés
        const charactersToDelete = this.characters.filter(character => {
            if (!character.mapId || !activeMapId) return false;
            return character.mapId === activeMapId;
        });

        if (charactersToDelete.length === 0) {
            this.showNotification("Information", "Aucun personnage à supprimer pour cette carte", "info");
            return;
        }

        // Double confirmation
        const firstConfirm = confirm(
            `⚠️ ATTENTION ⚠️\n\n` +
            `Vous allez supprimer DÉFINITIVEMENT ${charactersToDelete.length} personnage(s) de "${activeMapName}".\n\n` +
            `Cette action est irréversible.\n\n` +
            `Voulez-vous continuer ?`
        );

        if (!firstConfirm) {
            return;
        }

        const doubleConfirm = confirm(
            `🚨 DERNIÈRE CONFIRMATION 🚨\n\n` +
            `Vous allez supprimer DÉFINITIVEMENT ${charactersToDelete.length} personnage(s) de "${activeMapName}".\n\n` +
            `Confirmez-vous cette suppression ?`
        );

        if (!doubleConfirm) {
            return;
        }

        try {
            console.log(`🗑️ Suppression de tous les personnages de la carte active: ${activeMapId}`);

            // Supprimer uniquement les personnages de la carte active
            const initialCount = this.characters.length;
            this.characters = this.characters.filter(character => {
                if (!character.mapId) return true; // Garder les personnages sans mapId
                return character.mapId !== activeMapId; // Garder les personnages des autres cartes
            });

            const deletedCount = initialCount - this.characters.length;
            console.log(`✅ ${deletedCount} personnage(s) supprimé(s) de la carte active`);

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

    // Ajout de la méthode addCharacter pour normaliser les IDs
    addCharacter(characterData) {
        const newCharacter = {
            id: String(Date.now() + Math.random()),
            name: characterData.name || 'Nouveau personnage',
            description: characterData.description || '',
            type: characterData.type || 'PNJ',
            images: characterData.images || [],
            associatedLocations: (characterData.associatedLocations || []).map(id => String(id)),
            associatedRegions: (characterdata.associatedRegions || []).map(id => String(id)),
            mapId: window.settingsManager?.activeMapUrl || null
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