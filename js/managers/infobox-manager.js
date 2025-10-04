
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
                // Chercher l'image principale, sinon prendre la première
                const principaleImage = item.images.find(img => img.type === 'principale') || item.images[0];
                imageView.innerHTML = `
                    <img src="${principaleImage.url}" alt="${item.name}" class="modal-image">
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

        // Onglet Rumeurs et Traditions
        const rumeursTab = document.getElementById('rumeurs-traditions-tab');
        if (rumeursTab) {
            // Cacher le formulaire d'édition s'il existe
            const editForm = rumeursTab.querySelector('.edit-form');
            if (editForm) {
                editForm.style.display = 'none';
            }
            
            // Afficher la vue lecture
            const textView = rumeursTab.querySelector('.text-view');
            if (textView) {
                textView.style.display = 'block';
            }
            
            // Section Rumeurs
            const rumeursContent = rumeursTab.querySelector('#rumeurs-content');
            if (rumeursContent) {
                let rumeursHTML = '';
                
                // Normaliser les rumeurs en tableau
                const rumeurs = item.Rumeurs || (item.Rumeur ? [item.Rumeur] : []);
                const rumeursValides = rumeurs.filter(rumeur => rumeur && rumeur !== "A définir");
                
                if (rumeursValides.length > 0) {
                    rumeursHTML = rumeursValides.map((rumeur, index) => `
                        <div class="mb-4 ${index > 0 ? 'pt-4 border-t border-yellow-600 border-opacity-30' : ''}">
                            <div class="prose prose-invert">${this.renderMarkdown(rumeur)}</div>
                        </div>
                    `).join('');
                } else {
                    rumeursHTML = '<div class="prose prose-invert text-gray-400 italic">Aucune rumeur disponible.</div>';
                }
                
                rumeursContent.innerHTML = rumeursHTML;
            }

            // Section Tradition Ancienne
            const traditionContent = rumeursTab.querySelector('#tradition-content');
            if (traditionContent) {
                const traditionText = item.Tradition_Ancienne || '';
                if (traditionText) {
                    traditionContent.innerHTML = `<div class="prose prose-invert">${this.renderMarkdown(traditionText)}</div>`;
                } else {
                    traditionContent.innerHTML = '<div class="prose prose-invert text-gray-400 italic">Aucune tradition ancienne disponible.</div>';
                }
            }
        }

        // Onglet Événements de voyage
        const evenementsTab = document.getElementById('evenements-voyage-tab');
        if (evenementsTab) {
            const evenementsContent = evenementsTab.querySelector('#evenements-voyage-content');
            if (evenementsContent) {
                const evenements = item.Evenements_Voyage || [];
                
                if (evenements.length > 0) {
                    const tableHTML = `
                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse">
                                <thead>
                                    <tr class="bg-gray-800">
                                        <th class="border border-gray-600 px-3 py-2 text-left text-sm font-semibold">Dé du destin</th>
                                        <th class="border border-gray-600 px-3 py-2 text-left text-sm font-semibold">Résultat</th>
                                        <th class="border border-gray-600 px-3 py-2 text-left text-sm font-semibold">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${evenements.map((evt, index) => `
                                        <tr class="${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}">
                                            <td class="border border-gray-600 px-3 py-2 text-sm">${evt['Dé du destin'] || ''}</td>
                                            <td class="border border-gray-600 px-3 py-2 text-sm font-medium">${evt['Résultat'] || ''}</td>
                                            <td class="border border-gray-600 px-3 py-2 text-sm">${evt['Description'] || ''}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                    evenementsContent.innerHTML = tableHTML;
                } else {
                    evenementsContent.innerHTML = '<div class="prose prose-invert text-gray-400 italic">Aucun événement de voyage défini.</div>';
                }
            }
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

        // Onglet Rumeurs et Traditions (mode édition)
        const rumeursTab = document.getElementById('rumeurs-traditions-tab');
        if (rumeursTab) {
            const currentRumeurs = type === 'region' ? 
                (item.Rumeur || '') : 
                (item.Rumeurs ? item.Rumeurs.join('\n\n---\n\n') : (item.Rumeur || ''));
            
            // Cacher la vue lecture et afficher le mode édition
            const textView = rumeursTab.querySelector('.text-view');
            if (textView) {
                textView.style.display = 'none';
            }
            
            // Créer ou afficher le formulaire d'édition
            let editForm = rumeursTab.querySelector('.edit-form');
            if (!editForm) {
                editForm = document.createElement('div');
                editForm.className = 'edit-form p-4';
                rumeursTab.appendChild(editForm);
            }
            
            editForm.style.display = 'block';
            editForm.innerHTML = `
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2 text-white">
                        Rumeurs ${type === 'location' ? '(séparez par une ligne "---")' : ''} (Markdown supporté) :
                    </label>
                    <textarea id="edit-rumeurs" class="w-full p-2 border rounded h-40 bg-white text-black font-mono text-sm" placeholder="Utilisez Markdown: **gras**, *italique*, # Titres, - listes, etc.${type === 'location' ? '\n\nSéparez les rumeurs par:\n---' : ''}">${currentRumeurs}</textarea>
                    ${type === 'location' ? '<div class="text-xs text-gray-400 mt-1">Utilisez "---" sur une ligne seule pour séparer plusieurs rumeurs</div>' : ''}
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2 text-white">
                        Tradition Ancienne (Markdown supporté) :
                    </label>
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
            `;
        }

        // Onglet Événements de voyage (mode édition)
        const evenementsTab = document.getElementById('evenements-voyage-tab');
        if (evenementsTab) {
            // Nettoyer complètement l'onglet
            evenementsTab.innerHTML = '';
            const editForm = document.createElement('div');
            editForm.className = 'edit-form p-4';
            evenementsTab.appendChild(editForm);
            
            const currentEvenements = item.Evenements_Voyage || [];
            
            editForm.innerHTML = `
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2 text-white">
                        Importer un fichier JSON d'événements :
                    </label>
                    <input type="file" id="evenements-file-input" accept=".json" class="mb-2 block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700">
                    <div class="text-xs text-gray-400 mb-3">Format attendu : tableau JSON avec clés "Dé du destin", "Résultat", "Description"</div>
                    ${currentEvenements.length > 0 ? `<div class="text-sm text-green-400 mb-2">✓ ${currentEvenements.length} événement(s) chargé(s)</div>` : ''}
                </div>
                <div id="evenements-preview" class="mb-4 max-h-60 overflow-y-auto"></div>
                <div class="flex space-x-2">
                    <button onclick="window.infoBoxManager.saveEdit()" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                        <i class="fas fa-save mr-1"></i>Sauvegarder
                    </button>
                    <button onclick="window.infoBoxManager.exitEditMode()" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded">
                        <i class="fas fa-times mr-1"></i>Annuler
                    </button>
                    ${currentEvenements.length > 0 ? '<button onclick="window.infoBoxManager.clearEvenements()" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"><i class="fas fa-trash mr-1"></i>Effacer</button>' : ''}
                </div>
            `;

            // Afficher l'aperçu si des événements existent
            if (currentEvenements.length > 0) {
                this.updateEvenementsPreview(currentEvenements);
            }

            // Setup event listener pour l'import de fichier
            const fileInput = document.getElementById('evenements-file-input');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => this.handleEvenementsFileImport(e));
            }
        }
    }

    renderEditImagesList() {
        const item = this.currentItem;
        if (!item.images || item.images.length === 0) {
            return '<p class="text-gray-500">Aucune image</p>';
        }

        return item.images.map((image, index) => {
            const isPrincipale = image.type === 'principale';
            const isVignette = image.type === 'vignette';
            
            return `
            <div class="flex items-center justify-between bg-gray-100 p-2 rounded mb-2">
                <div class="flex items-center flex-grow">
                    <img src="${image.url}" alt="Preview" class="w-12 h-12 object-cover rounded mr-3">
                    <div class="flex-grow">
                        <div class="text-sm font-medium text-gray-800">${image.url.substring(0, 30)}${image.url.length > 30 ? '...' : ''}</div>
                        <div class="flex items-center space-x-2 mt-1">
                            ${isPrincipale ? '<span class="text-xs bg-blue-500 text-white px-2 py-1 rounded">Principale</span>' : ''}
                            ${isVignette ? '<span class="text-xs bg-green-500 text-white px-2 py-1 rounded">Vignette</span>' : ''}
                            ${!isPrincipale && !isVignette ? '<span class="text-xs bg-gray-400 text-white px-2 py-1 rounded">Sans type</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="flex space-x-1 ml-2">
                    <div class="relative">
                        <button onclick="window.infoBoxManager.toggleImageTypeMenu(${index})" class="text-blue-600 hover:text-blue-800 p-1" title="Changer le type">
                            <i class="fas fa-tag"></i>
                        </button>
                        <div id="image-type-menu-${index}" class="hidden absolute right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 w-32">
                            <button onclick="window.infoBoxManager.setImageType(${index}, 'principale')" class="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-gray-800">Principale</button>
                            <button onclick="window.infoBoxManager.setImageType(${index}, 'vignette')" class="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-gray-800">Vignette</button>
                            <button onclick="window.infoBoxManager.setImageType(${index}, null)" class="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-gray-800">Sans type</button>
                        </div>
                    </div>
                    <button onclick="window.infoBoxManager.removeImage(${index})" class="text-red-600 hover:text-red-800 p-1" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        }).join('');
    }

    toggleImageTypeMenu(index) {
        const menu = document.getElementById(`image-type-menu-${index}`);
        if (menu) {
            // Fermer tous les autres menus
            document.querySelectorAll('[id^="image-type-menu-"]').forEach(m => {
                if (m !== menu) m.classList.add('hidden');
            });
            menu.classList.toggle('hidden');
        }
    }

    async setImageType(index, type) {
        if (!this.currentItem.images || index < 0 || index >= this.currentItem.images.length) {
            return;
        }

        const image = this.currentItem.images[index];
        const oldType = image.type;

        // Si on définit une image comme principale, retirer ce type des autres
        if (type === 'principale') {
            this.currentItem.images.forEach((img, i) => {
                if (i !== index && img.type === 'principale') {
                    img.type = null;
                }
            });
        }

        // Si on définit une image comme vignette, retirer ce type des autres
        if (type === 'vignette') {
            this.currentItem.images.forEach((img, i) => {
                if (i !== index && img.type === 'vignette') {
                    img.type = null;
                    img.thumbnailUrl = null;
                }
            });

            // Créer la vignette si elle n'existe pas déjà
            if (!image.thumbnailUrl) {
                try {
                    const category = this.currentType === 'region' ? 'regions' : 'locations';
                    const response = await fetch('/api/image/create-thumbnail', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            image_url: image.url,
                            category: category
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Erreur lors de la création de la vignette');
                    }

                    const result = await response.json();
                    image.thumbnailUrl = result.thumbnail_url;
                    console.log("✅ Vignette créée:", result.thumbnail_url);
                } catch (error) {
                    console.error("❌ Erreur création vignette:", error);
                    alert("Erreur lors de la création de la vignette: " + error.message);
                    return;
                }
            }
        }

        // Définir le nouveau type
        image.type = type;

        // Re-render la liste des images
        const imagesList = document.getElementById('edit-images-list');
        if (imagesList) {
            imagesList.innerHTML = this.renderEditImagesList();
        }

        console.log(`🏷️ Type d'image changé (index ${index}): ${oldType} → ${type}`);
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
                    // Pour les lieux, séparer par "---"
                    if (rumeursText) {
                        this.currentItem.Rumeurs = rumeursText
                            .split(/\n---\n/)
                            .map(r => r.trim())
                            .filter(r => r !== '');
                        
                        // Compatibilité avec l'ancienne structure
                        if (this.currentItem.Rumeurs.length === 1) {
                            this.currentItem.Rumeur = this.currentItem.Rumeurs[0];
                        } else if (this.currentItem.Rumeurs.length === 0) {
                            this.currentItem.Rumeur = '';
                        }
                    } else {
                        this.currentItem.Rumeurs = [];
                        this.currentItem.Rumeur = '';
                    }
                }
            }

            // Tradition ancienne
            if (traditionField) {
                this.currentItem.Tradition_Ancienne = traditionField.value.trim();
            }

            // Événements de voyage
            if (this.tempEvenements !== undefined) {
                this.currentItem.Evenements_Voyage = this.tempEvenements;
                this.tempEvenements = undefined;
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

            // Passer en mode lecture
            this.isEditMode = false;
            this.updateInfoBoxContent();

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
            type: this.currentItem.images.length === 0 ? 'principale' : null, // Première image = principale
            thumbnailUrl: null
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
            type: this.currentItem.images.length === 0 ? 'principale' : null, // Première image = principale
            thumbnailUrl: null
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

        const wasPrincipale = this.currentItem.images[index].type === 'principale';
        this.currentItem.images.splice(index, 1);

        // Si on supprime l'image principale et qu'il reste des images, définir la première comme principale
        if (wasPrincipale && this.currentItem.images.length > 0) {
            this.currentItem.images[0].type = 'principale';
        }

        // Re-render la liste des images
        const imagesList = document.getElementById('edit-images-list');
        if (imagesList) {
            imagesList.innerHTML = this.renderEditImagesList();
        }

        console.log("🗑️ Image removed at index:", index);
    }

    setDefaultImage(index) {
        // Méthode conservée pour compatibilité, redirige vers setImageType
        this.setImageType(index, 'principale');
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

    handleEvenementsFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                
                // Valider le format
                if (!Array.isArray(jsonData)) {
                    alert('Format invalide : le fichier doit contenir un tableau JSON');
                    return;
                }

                // Valider les entrées
                const isValid = jsonData.every(item => 
                    item.hasOwnProperty('Dé du destin') || 
                    item.hasOwnProperty('Résultat') || 
                    item.hasOwnProperty('Description')
                );

                if (!isValid) {
                    alert('Format invalide : chaque entrée doit avoir au moins une des clés attendues');
                    return;
                }

                // Stocker temporairement les événements
                this.tempEvenements = jsonData;
                
                // Afficher l'aperçu
                this.updateEvenementsPreview(jsonData);
                
                console.log(`✅ ${jsonData.length} événement(s) importé(s)`);

            } catch (error) {
                console.error('❌ Erreur lors de l\'import:', error);
                alert('Erreur lors de la lecture du fichier JSON: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    updateEvenementsPreview(evenements) {
        const preview = document.getElementById('evenements-preview');
        if (!preview) return;

        if (evenements.length === 0) {
            preview.innerHTML = '';
            return;
        }

        preview.innerHTML = `
            <div class="text-sm font-medium mb-2 text-white">Aperçu (${evenements.length} événement(s)) :</div>
            <div class="bg-gray-800 rounded p-2 max-h-64 overflow-y-auto">
                <table class="w-full text-xs">
                    <thead>
                        <tr class="text-gray-400">
                            <th class="text-left p-1">Dé</th>
                            <th class="text-left p-1">Résultat</th>
                            <th class="text-left p-1">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${evenements.map((evt, i) => `
                            <tr class="border-t border-gray-700">
                                <td class="p-1">${evt['Dé du destin'] || '-'}</td>
                                <td class="p-1">${evt['Résultat'] || '-'}</td>
                                <td class="p-1 truncate max-w-xs" title="${evt['Description'] || '-'}">${(evt['Description'] || '-').substring(0, 50)}${(evt['Description'] || '').length > 50 ? '...' : ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    clearEvenements() {
        if (!confirm('Êtes-vous sûr de vouloir effacer tous les événements de voyage ?')) {
            return;
        }
        
        this.tempEvenements = [];
        this.updateEvenementsPreview([]);
        
        const fileInput = document.getElementById('evenements-file-input');
        if (fileInput) {
            fileInput.value = '';
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
                
                console.log(`🔍 Region index found: ${regionIndex}, Total regions: ${this.dataManager.regionsData.regions.length}`);
                
                if (regionIndex !== -1) {
                    // Supprimer la région
                    this.dataManager.regionsData.regions.splice(regionIndex, 1);
                    
                    console.log(`✅ Region removed from array, remaining: ${this.dataManager.regionsData.regions.length}`);
                    
                    // Mettre à jour toutes les références
                    window.regionsData = this.dataManager.regionsData;
                    
                    // Sauvegarder dans localStorage
                    this.dataManager.saveRegionsToLocal();
                    
                    // Re-render les régions AVANT de fermer l'infobox
                    if (typeof window.renderRegions === 'function') {
                        window.renderRegions();
                    } else if (typeof renderRegions === 'function') {
                        renderRegions();
                    }
                    
                    // Fermer l'info-box APRÈS le re-render pour éviter les références fantômes
                    this.hideInfoBox();
                    
                    console.log("✅ Region deleted successfully");
                } else {
                    console.error("❌ Region not found in data");
                    alert("Erreur : région non trouvée dans les données");
                }
            } else {
                // Supprimer de la liste des lieux
                const locationIndex = this.dataManager.locationsData.locations.findIndex(
                    location => location.id === this.currentItem.id
                );
                
                console.log(`🔍 Location index found: ${locationIndex}, Total locations: ${this.dataManager.locationsData.locations.length}`);
                
                if (locationIndex !== -1) {
                    // Supprimer le lieu
                    this.dataManager.locationsData.locations.splice(locationIndex, 1);
                    
                    console.log(`✅ Location removed from array, remaining: ${this.dataManager.locationsData.locations.length}`);
                    
                    // Mettre à jour toutes les références
                    window.locationsData = this.dataManager.locationsData;
                    
                    // Sauvegarder dans localStorage
                    this.dataManager.saveLocationsToLocal();
                    
                    // Re-render les lieux AVANT de fermer l'infobox
                    if (typeof window.renderLocations === 'function') {
                        window.renderLocations();
                    } else if (typeof renderLocations === 'function') {
                        renderLocations();
                    }
                    
                    // Fermer l'info-box APRÈS le re-render pour éviter les références fantômes
                    this.hideInfoBox();
                    
                    console.log("✅ Location deleted successfully");
                } else {
                    console.error("❌ Location not found in data");
                    alert("Erreur : lieu non trouvé dans les données");
                }
            }

            // Programmer la synchronisation
            if (typeof scheduleAutoSync === 'function') {
                scheduleAutoSync();
            }

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
