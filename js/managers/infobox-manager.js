
import UploadManager from './upload-manager.js';

/**
 * InfoBoxManager - Gestion des info-boxes avec édition
 */
class InfoBoxManager {
    constructor(domUtils, dataManager, geminiManager) {
        this.domUtils = domUtils;
        this.dataManager = dataManager;
        this.geminiManager = geminiManager;
        
        this.currentItem = null;
        this.currentType = null;
        this.isEditMode = false;
        this.isExpanded = false;
        
        // Initialiser l'UploadManager
        this.uploadManager = new UploadManager();
        
        this.setupEventListeners();
        
        console.log("📋 InfoBoxManager initialized with UploadManager");
    }

    setupEventListeners() {
        // Bouton fermer
        const closeBtn = document.getElementById('info-box-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideInfoBox());
        }

        // Bouton étendre/réduire - désactivé (toujours en mode étendu)
        const expandBtn = document.getElementById('info-box-expand');
        if (expandBtn) {
            expandBtn.style.display = 'none'; // Masquer le bouton
        }

        // Bouton éditer (icône crayon)
        const editBtn = document.getElementById('info-box-edit');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.enterEditMode());
        }

        // Bouton supprimer (icône poubelle)
        const deleteBtn = document.getElementById('info-box-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteItem());
        }

        // Gestion des onglets
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Touche Échap pour fermer
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const infoBox = document.getElementById('info-box');
                if (infoBox && infoBox.style.display === 'block') {
                    this.hideInfoBox();
                }
            }
        });
    }

    showInfoBox(event, item, type = 'location') {
        console.log("📋 Showing info box for:", item.name, "Type:", type);

        const infoBox = document.getElementById('info-box');
        if (!infoBox) {
            console.error("❌ Info box element not found");
            return;
        }

        this.currentItem = item;
        this.currentType = type;
        this.isEditMode = false;

        // Toujours forcer le mode étendu
        this.isExpanded = true;
        infoBox.classList.add('expanded');
        
        // Mettre à jour l'icône d'expansion
        const expandBtn = document.getElementById('info-box-expand');
        if (expandBtn) {
            expandBtn.className = 'fas fa-compress';
            expandBtn.title = 'Vue compacte';
        }
        
        this.positionInfoBoxExpanded();
        
        infoBox.style.display = 'block';
        
        // S'assurer que l'onglet Image est actif par défaut
        this.switchTab('image');

        // Mettre à jour le contenu après avoir configuré l'affichage
        this.updateInfoBoxContent();

        console.log("✅ Info box displayed successfully in expanded mode");
    }

    hideInfoBox() {
        const infoBox = document.getElementById('info-box');
        if (infoBox) {
            infoBox.style.display = 'none';
            this.currentItem = null;
            this.currentType = null;
            this.isEditMode = false;
            this.isExpanded = false;
            infoBox.classList.remove('expanded');
        }
    }

    toggleExpand() {
        // Fonction désactivée - toujours en mode étendu
        console.log("📋 Toggle expand disabled - always in expanded mode");
    }

    switchTab(tabName) {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        // Désactiver tous les onglets
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Activer l'onglet sélectionné
        const targetButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
        const targetContent = document.getElementById(`${tabName}-tab`);

        if (targetButton) targetButton.classList.add('active');
        if (targetContent) targetContent.classList.add('active');
    }

    positionInfoBox(event, type) {
        // Toujours utiliser le positionnement étendu
        this.positionInfoBoxExpanded();
    }

    positionInfoBoxExpanded() {
        const infoBox = document.getElementById('info-box');
        const viewport = document.getElementById('viewport');
        
        if (!infoBox || !viewport) return;

        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;
        const margin = 20;

        // Utiliser 90% des dimensions du viewport
        const desiredWidth = Math.floor(viewportWidth * 0.9);
        const desiredHeight = Math.floor(viewportHeight * 0.9);

        // Centrer l'info-box
        const left = Math.floor((viewportWidth - desiredWidth) / 2);
        const top = Math.floor((viewportHeight - desiredHeight) / 2);

        infoBox.style.left = `${left}px`;
        infoBox.style.top = `${top}px`;
        infoBox.style.width = `${desiredWidth}px`;
        infoBox.style.height = `${desiredHeight}px`;
        infoBox.style.maxWidth = 'none';
        infoBox.style.transform = 'none';
    }

    updateInfoBoxContent() {
        if (!this.currentItem) return;

        const infoBoxTitle = document.getElementById('info-box-title');
        const editBtn = document.getElementById('info-box-edit');
        const deleteBtn = document.getElementById('info-box-delete');

        // Toujours afficher le titre
        if (infoBoxTitle) {
            infoBoxTitle.textContent = this.currentItem.name;
            infoBoxTitle.classList.remove('hidden');
        }

        // Toujours afficher les boutons crayon et poubelle
        if (editBtn) {
            editBtn.classList.remove('hidden');
            // Changer la couleur selon le mode
            if (this.isEditMode) {
                editBtn.style.color = '#60a5fa'; // bleu clair
            } else {
                editBtn.style.color = '#ffffff'; // blanc
            }
        }

        if (deleteBtn) {
            deleteBtn.classList.remove('hidden');
        }

        if (this.isEditMode) {
            this.renderEditMode();
        } else {
            this.renderReadMode();
        }
    }

    renderReadMode() {
        const item = this.currentItem;
        const type = this.currentType;

        // Onglet Image
        const imageTab = document.getElementById('image-tab');
        if (imageTab) {
            // Nettoyer complètement l'onglet et créer la structure
            imageTab.innerHTML = '';
            const imageView = this.createImageView(imageTab);
            
            if (item.images && item.images.length > 0) {
                const defaultImage = item.images.find(img => img.isDefault) || item.images[0];
                imageView.innerHTML = `
                    <img src="${defaultImage.url}" alt="${item.name}" class="modal-image">
                    <div class="image-caption">${item.name}</div>
                `;
            } else {
                const typeLabel = type === 'region' ? 'Région' : 'Lieu';
                imageView.innerHTML = `
                    <div class="compact-title">${item.name}</div>
                    <div class="image-placeholder">Aucune image disponible pour cette ${typeLabel.toLowerCase()}</div>
                `;
            }
        }

        // Onglet Texte
        const textTab = document.getElementById('text-tab');
        if (textTab) {
            // Nettoyer complètement l'onglet et créer la structure
            textTab.innerHTML = '';
            const textView = this.createTextView(textTab);
            textView.innerHTML = `
                <h3>${item.name}</h3>
                <div class="prose prose-invert">${this.renderMarkdown(item.description || 'Aucune description disponible.')}</div>
            `;
        }

        // Onglet Rumeurs
        const rumeursTab = document.getElementById('rumeurs-tab');
        if (rumeursTab) {
            // Nettoyer complètement l'onglet et créer la structure
            rumeursTab.innerHTML = '';
            const textView = this.createTextView(rumeursTab);
            let rumeursContent = '';
            
            if (type === 'region') {
                rumeursContent = item.Rumeur || 'Aucune rumeur disponible pour cette région.';
            } else {
                if (item.Rumeurs && item.Rumeurs.length > 0) {
                    const rumeursValides = item.Rumeurs.filter(rumeur => rumeur && rumeur !== "A définir");
                    if (rumeursValides.length > 0) {
                        rumeursContent = rumeursValides.join('\n\n');
                    } else {
                        rumeursContent = 'Aucune rumeur disponible.';
                    }
                } else {
                    rumeursContent = item.Rumeur || 'Aucune rumeur disponible.';
                }
            }
            
            textView.innerHTML = `
                <div class="prose prose-invert">${this.renderMarkdown(rumeursContent)}</div>
            `;
        }

        // Onglet Tradition
        const traditionTab = document.getElementById('tradition-tab');
        if (traditionTab) {
            // Nettoyer complètement l'onglet et créer la structure
            traditionTab.innerHTML = '';
            const textView = this.createTextView(traditionTab);
            const traditionContent = item.Tradition_Ancienne || 'Aucune tradition ancienne disponible.';
            textView.innerHTML = `
                <div class="prose prose-invert">${this.renderMarkdown(traditionContent)}</div>
            `;
        }
    }

    renderEditMode() {
        const item = this.currentItem;
        const type = this.currentType;

        // Onglet Image (mode édition)
        const imageTab = document.getElementById('image-tab');
        if (imageTab) {
            // Nettoyer complètement l'onglet
            imageTab.innerHTML = `
                <div class="edit-form p-4">
                    <h4 class="font-bold mb-3">Éditer les images</h4>
                    <div id="edit-images-list" class="mb-3">
                        ${this.renderEditImagesList()}
                    </div>
                    <div class="mb-3">
                        <label class="block text-sm font-medium mb-2 text-white">Ajouter une image :</label>
                        <div id="image-upload-container" class="mb-3"></div>
                        <div class="text-xs text-gray-400 mb-2">Ou utilisez une URL :</div>
                        <div class="flex space-x-2">
                            <input type="url" id="new-image-url" class="flex-1 p-2 border rounded bg-white text-black text-sm" placeholder="https://example.com/image.jpg">
                            <button onclick="window.infoBoxManager.addImageFromUrl()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                                <i class="fas fa-plus mr-1"></i>Ajouter URL
                            </button>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="window.infoBoxManager.saveEdit()" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                            <i class="fas fa-save mr-1"></i>Sauvegarder
                        </button>
                        <button onclick="window.infoBoxManager.exitEditMode()" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded">
                            <i class="fas fa-times mr-1"></i>Annuler
                        </button>
                    </div>
                </div>
            `;

            // Créer le composant d'upload d'images
            const uploadContainer = imageTab.querySelector('#image-upload-container');
            if (uploadContainer) {
                const category = this.currentType === 'region' ? 'regions' : 'locations';
                this.uploadManager.createImageSelector(uploadContainer, category, (result) => {
                    if (result) {
                        this.addImageFromUpload(result);
                    }
                });
            }
        }

        // Onglet Texte (mode édition)
        const textTab = document.getElementById('text-tab');
        if (textTab) {
            // Nettoyer complètement l'onglet
            textTab.innerHTML = `
                <div class="edit-form p-4">
                    <div class="mb-3">
                        <label class="block text-sm font-medium mb-2 text-white">Nom :</label>
                        <input type="text" id="edit-name" value="${item.name}" class="w-full p-2 border rounded bg-white text-black">
                    </div>
                    <div class="mb-3">
                        <label class="block text-sm font-medium mb-2 text-white">Description (Markdown supporté) :</label>
                        <textarea id="edit-description" class="w-full p-2 border rounded h-32 bg-white text-black font-mono text-sm" placeholder="Utilisez Markdown: **gras**, *italique*, # Titres, - listes, etc.">${item.description || ''}</textarea>
                        <button onclick="window.infoBoxManager.generateDescription()" class="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded">
                            <i class="fas fa-magic mr-1"></i>Générer avec IA
                        </button>
                    </div>
                    
                    <div class="flex space-x-2">
                        <button onclick="window.infoBoxManager.saveEdit()" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                            <i class="fas fa-save mr-1"></i>Sauvegarder
                        </button>
                        <button onclick="window.infoBoxManager.exitEditMode()" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded">
                            <i class="fas fa-times mr-1"></i>Annuler
                        </button>
                    </div>
                </div>
            `;
        }

        // Onglet Rumeurs (mode édition)
        const rumeursTab = document.getElementById('rumeurs-tab');
        if (rumeursTab) {
            const currentRumeurs = type === 'region' ? 
                (item.Rumeur || '') : 
                (item.Rumeurs ? item.Rumeurs.join('\n') : (item.Rumeur || ''));
            
            // Nettoyer complètement l'onglet
            rumeursTab.innerHTML = `
                <div class="edit-form p-4">
                    <div class="mb-3">
                        <label class="block text-sm font-medium mb-2 text-white">Rumeurs ${type === 'location' ? '(une par ligne)' : ''} (Markdown supporté) :</label>
                        <textarea id="edit-rumeurs" class="w-full p-2 border rounded h-32 bg-white text-black font-mono text-sm" placeholder="Utilisez Markdown: **gras**, *italique*, # Titres, - listes, etc.">${currentRumeurs}</textarea>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="window.infoBoxManager.saveEdit()" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                            <i class="fas fa-save mr-1"></i>Sauvegarder
                        </button>
                        <button onclick="window.infoBoxManager.exitEditMode()" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded">
                            <i class="fas fa-times mr-1"></i>Annuler
                        </button>
                    </div>
                </div>
            `;
        }

        // Onglet Tradition (mode édition)
        const traditionTab = document.getElementById('tradition-tab');
        if (traditionTab) {
            // Nettoyer complètement l'onglet
            traditionTab.innerHTML = `
                <div class="edit-form p-4">
                    <div class="mb-3">
                        <label class="block text-sm font-medium mb-2 text-white">Tradition Ancienne (Markdown supporté) :</label>
                        <textarea id="edit-tradition" class="w-full p-2 border rounded h-32 bg-white text-black font-mono text-sm" placeholder="Utilisez Markdown: **gras**, *italique*, # Titres, - listes, etc.">${item.Tradition_Ancienne || ''}</textarea>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="window.infoBoxManager.saveEdit()" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                            <i class="fas fa-save mr-1"></i>Sauvegarder
                        </button>
                        <button onclick="window.infoBoxManager.exitEditMode()" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded">
                            <i class="fas fa-times mr-1"></i>Annuler
                        </button>
                    </div>
                </div>
            `;
        }
    }

    renderEditImagesList() {
        const item = this.currentItem;
        if (!item.images || item.images.length === 0) {
            return '<p class="text-gray-500">Aucune image</p>';
        }

        return item.images.map((image, index) => `
            <div class="flex items-center justify-between bg-gray-100 p-2 rounded mb-2">
                <div class="flex items-center">
                    <img src="${image.url}" alt="Preview" class="w-12 h-12 object-cover rounded mr-3">
                    <div>
                        <div class="text-sm font-medium">${image.url.substring(0, 40)}${image.url.length > 40 ? '...' : ''}</div>
                        ${image.isDefault ? '<span class="text-xs bg-blue-500 text-white px-2 py-1 rounded">Par défaut</span>' : ''}
                    </div>
                </div>
                <div class="flex space-x-1">
                    ${!image.isDefault ? `<button onclick="window.infoBoxManager.setDefaultImage(${index})" class="text-blue-600 hover:text-blue-800" title="Définir par défaut"><i class="fas fa-star"></i></button>` : ''}
                    <button onclick="window.infoBoxManager.removeImage(${index})" class="text-red-600 hover:text-red-800" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    

    // Fonction utilitaire pour le rendu Markdown basique
    renderMarkdown(text) {
        if (!text) return '';
        
        // Conversion Markdown basique
        return text
            // Titres
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            // Gras et italique
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Listes
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            // Paragraphes
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.*)$/gim, function(match) {
                if (match.startsWith('<h') || match.startsWith('<ul') || match.startsWith('<li') || match.startsWith('</')) {
                    return match;
                }
                return match.trim() ? `<p>${match}</p>` : '';
            })
            // Nettoyage
            .replace(/<p><\/p>/g, '')
            .replace(/<p>(<h[1-6]>)/g, '$1')
            .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
            .replace(/<p>(<ul>)/g, '$1')
            .replace(/(<\/ul>)<\/p>/g, '$1');
    }

    createImageView(parent) {
        const imageView = document.createElement('div');
        imageView.className = 'image-view';
        parent.appendChild(imageView);
        return imageView;
    }

    createTextView(parent) {
        const textView = document.createElement('div');
        textView.className = 'text-view';
        parent.appendChild(textView);
        return textView;
    }

    

    enterEditMode() {
        if (!this.currentItem) return;
        
        console.log("✏️ Entering edit mode for:", this.currentItem.name);
        this.isEditMode = true;
        this.updateInfoBoxContent();
        
        // Déjà en mode étendu par défaut
    }

    exitEditMode() {
        console.log("❌ Exiting edit mode");
        this.isEditMode = false;
        this.updateInfoBoxContent();
    }

    async saveEdit() {
        if (!this.currentItem) return;

        console.log("💾 Saving edit for:", this.currentItem.name);

        try {
            // Récupérer les valeurs des champs
            const nameField = document.getElementById('edit-name');
            const descField = document.getElementById('edit-description');
            const rumeursField = document.getElementById('edit-rumeurs');
            const traditionField = document.getElementById('edit-tradition');

            // Valider les champs obligatoires
            if (nameField && !nameField.value.trim()) {
                alert("Le nom ne peut pas être vide.");
                return;
            }

            // Mettre à jour l'objet
            if (nameField) this.currentItem.name = nameField.value.trim();
            if (descField) this.currentItem.description = descField.value.trim();

            // Gestion des rumeurs
            if (rumeursField) {
                const rumeursText = rumeursField.value.trim();
                if (this.currentType === 'region') {
                    this.currentItem.Rumeur = rumeursText;
                } else {
                    // Pour les lieux, séparer par ligne
                    this.currentItem.Rumeurs = rumeursText ? rumeursText.split('\n').filter(r => r.trim() !== '') : [];
                    if (this.currentItem.Rumeurs.length === 1) {
                        this.currentItem.Rumeur = this.currentItem.Rumeurs[0];
                    }
                }
            }

            // Tradition ancienne
            if (traditionField) {
                this.currentItem.Tradition_Ancienne = traditionField.value.trim();
            }

            // Sauvegarder via DataManager
            if (this.currentType === 'region') {
                this.dataManager.saveRegionsToLocal();
                // Re-render les régions
                if (typeof renderRegions === 'function') {
                    renderRegions();
                }
            } else {
                this.dataManager.saveLocationsToLocal();
                // Re-render les lieux
                if (typeof renderLocations === 'function') {
                    renderLocations();
                }
            }

            // Programmer la synchronisation
            if (typeof scheduleAutoSync === 'function') {
                scheduleAutoSync();
            }

            // Sortir du mode édition
            this.exitEditMode();

            console.log("✅ Edit saved successfully");

        } catch (error) {
            console.error("❌ Error saving edit:", error);
            alert("Erreur lors de la sauvegarde : " + error.message);
        }
    }

    addImageFromUrl() {
        const urlField = document.getElementById('new-image-url');
        if (!urlField || !urlField.value.trim()) {
            alert("Veuillez entrer une URL d'image valide.");
            return;
        }

        const url = urlField.value.trim();
        
        // Initialiser le tableau d'images si nécessaire
        if (!this.currentItem.images) {
            this.currentItem.images = [];
        }

        // Ajouter l'image
        const newImage = {
            url: url,
            isDefault: this.currentItem.images.length === 0 // Première image = par défaut
        };

        this.currentItem.images.push(newImage);
        
        // Vider le champ
        urlField.value = '';
        
        // Re-render la liste des images
        const imagesList = document.getElementById('edit-images-list');
        if (imagesList) {
            imagesList.innerHTML = this.renderEditImagesList();
        }

        console.log("🖼️ Image added from URL:", url);
    }

    addImageFromUpload(uploadResult) {
        // Initialiser le tableau d'images si nécessaire
        if (!this.currentItem.images) {
            this.currentItem.images = [];
        }

        // Ajouter l'image uploadée
        const newImage = {
            url: uploadResult.url,
            isDefault: this.currentItem.images.length === 0 // Première image = par défaut
        };

        this.currentItem.images.push(newImage);
        
        // Re-render la liste des images
        const imagesList = document.getElementById('edit-images-list');
        if (imagesList) {
            imagesList.innerHTML = this.renderEditImagesList();
        }

        console.log("🖼️ Image added from upload:", uploadResult.url);
    }

    removeImage(index) {
        if (!this.currentItem.images || index < 0 || index >= this.currentItem.images.length) {
            return;
        }

        const wasDefault = this.currentItem.images[index].isDefault;
        this.currentItem.images.splice(index, 1);

        // Si on supprime l'image par défaut et qu'il reste des images, définir la première comme par défaut
        if (wasDefault && this.currentItem.images.length > 0) {
            this.currentItem.images[0].isDefault = true;
        }

        // Re-render la liste des images
        const imagesList = document.getElementById('edit-images-list');
        if (imagesList) {
            imagesList.innerHTML = this.renderEditImagesList();
        }

        console.log("🗑️ Image removed at index:", index);
    }

    setDefaultImage(index) {
        if (!this.currentItem.images || index < 0 || index >= this.currentItem.images.length) {
            return;
        }

        // Retirer le statut par défaut de toutes les images
        this.currentItem.images.forEach(img => img.isDefault = false);
        
        // Définir la nouvelle image par défaut
        this.currentItem.images[index].isDefault = true;

        // Re-render la liste des images
        const imagesList = document.getElementById('edit-images-list');
        if (imagesList) {
            imagesList.innerHTML = this.renderEditImagesList();
        }

        console.log("⭐ Default image set to index:", index);
    }

    async generateDescription() {
        const nameField = document.getElementById('edit-name');
        const descField = document.getElementById('edit-description');

        if (!nameField || !nameField.value.trim()) {
            alert("Veuillez d'abord entrer un nom.");
            return;
        }

        if (!this.geminiManager || !this.geminiManager.isAvailable()) {
            alert("Service de génération IA non disponible.");
            return;
        }

        const itemName = nameField.value.trim();
        const isRegion = this.currentType === 'region';

        try {
            // Désactiver le bouton pendant la génération
            const generateBtn = event.target;
            const originalContent = generateBtn.innerHTML;
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Génération...';

            let prompt;
            if (isRegion) {
                prompt = `Rédige une courte description évocatrice pour une région de la Terre du Milieu nommée '${itemName}'. Décris son paysage, son climat, son histoire et les peuples qui l'habitent, dans le style de J.R.R. Tolkien. Sois concis et évocateur (3-4 phrases maximum).`;
            } else {
                prompt = `Rédige une courte description évocatrice pour un lieu de la Terre du Milieu nommé '${itemName}'. Décris son apparence, son ambiance et son histoire possible, dans le style de J.R.R. Tolkien. Sois concis et évocateur (2-3 phrases maximum).`;
            }

            const generatedDescription = await this.geminiManager.generateText(prompt);
            
            if (descField) {
                descField.value = generatedDescription;
            }

            // Restaurer le bouton
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalContent;

            console.log("✨ Description generated successfully");

        } catch (error) {
            console.error("❌ Error generating description:", error);
            alert(`Erreur lors de la génération : ${error.message}`);
            
            // Restaurer le bouton en cas d'erreur
            const generateBtn = event.target;
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-magic mr-1"></i>Générer avec IA';
        }
    }

    deleteItem() {
        if (!this.currentItem) return;

        const itemType = this.currentType === 'region' ? 'région' : 'lieu';
        const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer ${this.currentType === 'region' ? 'cette' : 'ce'} ${itemType} "${this.currentItem.name}" ?\n\nCette action est irréversible.`);
        
        if (!confirmed) return;

        console.log(`🗑️ Deleting ${itemType}:`, this.currentItem.name);

        try {
            if (this.currentType === 'region') {
                // Supprimer de la liste des régions
                const regionIndex = this.dataManager.regionsData.regions.findIndex(
                    region => region.id === this.currentItem.id
                );
                
                if (regionIndex !== -1) {
                    this.dataManager.regionsData.regions.splice(regionIndex, 1);
                    
                    // Mettre à jour les données globales
                    window.regionsData = this.dataManager.regionsData;
                    
                    this.dataManager.saveRegionsToLocal();
                    
                    // Re-render les régions avec la fonction globale
                    if (typeof window.renderRegions === 'function') {
                        window.renderRegions();
                    } else if (typeof renderRegions === 'function') {
                        renderRegions();
                    }
                    
                    console.log("✅ Region deleted successfully");
                }
            } else {
                // Supprimer de la liste des lieux
                const locationIndex = this.dataManager.locationsData.locations.findIndex(
                    location => location.id === this.currentItem.id
                );
                
                if (locationIndex !== -1) {
                    this.dataManager.locationsData.locations.splice(locationIndex, 1);
                    
                    // Mettre à jour les données globales
                    window.locationsData = this.dataManager.locationsData;
                    
                    this.dataManager.saveLocationsToLocal();
                    
                    // Re-render les lieux avec la fonction globale
                    if (typeof window.renderLocations === 'function') {
                        window.renderLocations();
                    } else if (typeof renderLocations === 'function') {
                        renderLocations();
                    }
                    
                    console.log("✅ Location deleted successfully");
                }
            }

            // Programmer la synchronisation
            if (typeof scheduleAutoSync === 'function') {
                scheduleAutoSync();
            }

            // Fermer l'info-box
            this.hideInfoBox();

        } catch (error) {
            console.error("❌ Error deleting item:", error);
            alert(`Erreur lors de la suppression : ${error.message}`);
        }
    }
}

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InfoBoxManager;
}

// Export ES6 par défaut
export default InfoBoxManager;

console.log("📋 InfoBoxManager module loaded");
