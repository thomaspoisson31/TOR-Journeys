
/**
 * CharactersManager - Gestion des personnages de l'aventure
 */
class CharactersManager {
    constructor() {
        this.characters = [];
        this.currentCharacter = null;
        
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

        // Boutons de la modale d'ajout
        const cancelAddBtn = document.getElementById('cancel-add-character');
        const confirmAddBtn = document.getElementById('confirm-add-character');
        
        if (cancelAddBtn) {
            cancelAddBtn.addEventListener('click', () => this.closeAddCharacterModal());
        }
        
        if (confirmAddBtn) {
            confirmAddBtn.addEventListener('click', () => this.confirmAddCharacter());
        }
    }

    loadCharactersFromLocal() {
        const stored = localStorage.getItem('middleEarthCharacters');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.characters = data.characters || [];
                console.log(`📚 ${this.characters.length} personnages chargés depuis localStorage`);
            } catch (e) {
                console.error("❌ Erreur parsing characters:", e);
                this.characters = [];
            }
        } else {
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
            this.renderCharactersList();
        }
    }

    closeCharactersModal() {
        const modal = document.getElementById('characters-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    renderCharactersList() {
        const listContainer = document.getElementById('characters-list');
        if (!listContainer) return;

        if (this.characters.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <i class="fas fa-users fa-3x mb-4"></i>
                    <p class="text-lg">Aucun personnage créé</p>
                    <p class="text-sm mt-2">Cliquez sur "Ajouter un personnage" pour commencer</p>
                </div>
            `;
            return;
        }

        const html = this.characters.map(character => {
            const thumbnailImage = character.images?.find(img => img.type === 'vignette');
            const principalImage = character.images?.find(img => img.type === 'principale');
            const displayImage = thumbnailImage || principalImage || character.images?.[0];

            return `
                <div class="character-card bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer" 
                     data-character-id="${character.id}"
                     onclick="window.charactersManager.showCharacterInfoBox(${character.id})">
                    <div class="flex items-center space-x-4">
                        ${displayImage ? `
                            <img src="${displayImage.url}" alt="${character.name}" 
                                 class="w-16 h-16 rounded-full object-cover border-2 ${character.type === 'PJ' ? 'border-blue-500' : 'border-green-500'}">
                        ` : `
                            <div class="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center border-2 ${character.type === 'PJ' ? 'border-blue-500' : 'border-green-500'}">
                                <i class="fas fa-user text-2xl text-gray-400"></i>
                            </div>
                        `}
                        <div class="flex-1">
                            <h3 class="text-lg font-bold">${character.name}</h3>
                            <span class="inline-block px-2 py-1 text-xs rounded ${character.type === 'PJ' ? 'bg-blue-600' : 'bg-green-600'}">
                                ${character.type || 'PNJ'}
                            </span>
                        </div>
                        <i class="fas fa-chevron-right text-gray-400"></i>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = html;
    }

    openAddCharacterModal() {
        const modal = document.getElementById('add-character-modal');
        if (modal) {
            modal.classList.remove('hidden');
            
            // Réinitialiser le formulaire
            document.getElementById('character-name-input').value = '';
            document.getElementById('character-desc-input').value = '';
            document.getElementById('character-type-pj').checked = true;
            
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

    confirmAddCharacter() {
        const name = document.getElementById('character-name-input').value.trim();
        const description = document.getElementById('character-desc-input').value.trim();
        const type = document.getElementById('character-type-pj').checked ? 'PJ' : 'PNJ';

        if (!name) {
            alert('Le nom du personnage est obligatoire');
            return;
        }

        const newCharacter = {
            id: Date.now(),
            name: name,
            description: description,
            type: type,
            images: this.tempCharacterImages || []
        };

        this.characters.push(newCharacter);
        this.saveCharactersToLocal();
        
        this.closeAddCharacterModal();
        this.renderCharactersList();
        
        console.log(`✅ Personnage créé: ${name} (${type})`);
    }

    showCharacterInfoBox(characterId) {
        const character = this.characters.find(c => c.id === characterId);
        if (!character) return;

        this.currentCharacter = character;
        this.closeCharactersModal();

        // Utiliser la même infobox que les lieux
        if (window.infoBoxManager) {
            window.infoBoxManager.showInfoBox({ clientX: 0, clientY: 0 }, character, 'character');
        }
    }

    deleteCharacter(characterId) {
        const index = this.characters.findIndex(c => c.id === characterId);
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
        const character = this.characters.find(c => c.id === characterId);
        if (!character) return;

        Object.assign(character, updates);
        this.saveCharactersToLocal();
        
        console.log(`✏️ Personnage mis à jour: ${character.name}`);
    }
}

export default CharactersManager;

console.log("👥 CharactersManager module loaded");
