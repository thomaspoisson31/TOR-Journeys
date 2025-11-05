/**
 * InfoBoxManager - Gestion des info-boxes avec édition
 */
import UploadManager from './upload-manager.js';

class InfoBoxManager {
    constructor(domUtils, dataManager, geminiManager) {
        this.domUtils = domUtils;
        this.dataManager = dataManager;
        this.geminiManager = geminiManager;

        this.currentItem = null;
        this.currentType = null;
        this.isEditMode = false;
        this.isExpanded = false;

        // Stack pour la navigation arrière
        this.previousInfoBox = null;

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

        // Gestion des onglets - amélioration pour gérer le clic sur l'icône
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Récupérer le data-tab du bouton, même si on clique sur l'icône
                const tabName = button.dataset.tab || e.currentTarget.dataset.tab;
                if (tabName) {
                    this.switchTab(tabName);
                }
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
        console.log("📋 [InfoBoxManager] Showing info box for:", item.name, "Type:", type, {
            eventType: event?.type,
            timeStamp: event?.timeStamp,
            target: event?.target?.className,
            currentItem: this.currentItem?.name,
            isEditMode: this.isEditMode
        });

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

        // Mettre à jour le contenu après avoir configuré l'affichage
        this.updateInfoBoxContent();

        // IMPORTANT: Appliquer la logique d'affichage des onglets après l'affichage
        this.updateTabsVisibility();

        console.log("✅ Info box displayed successfully in expanded mode");
    }

    hideInfoBox() {
        const infoBox = document.getElementById('info-box');
        if (infoBox) {
            // Vérifier s'il y a une infobox précédente à afficher ET qu'elle vient bien d'une InfoBox
            if (this.previousInfoBox && this.previousInfoBox.fromInfoBox) {
                console.log("🔙 Retour à l'infobox précédente:", this.previousInfoBox.item.name);
                const previous = this.previousInfoBox;
                const shouldShowPersonnagesTab = previous.shouldShowPersonnagesTab;
                this.previousInfoBox = null; // Réinitialiser pour éviter une boucle

                // Créer un événement simulé pour le positionnement
                const fakeEvent = {
                    clientX: window.innerWidth / 2,
                    clientY: window.innerHeight / 2,
                    type: 'click'
                };

                // Réafficher l'infobox précédente
                this.showInfoBox(fakeEvent, previous.item, previous.type);

                // Si demandé, afficher l'onglet Personnages
                if (shouldShowPersonnagesTab) {
                    setTimeout(() => {
                        this.switchTab('personnages');
                    }, 100);
                }
            } else {
                // Fermeture normale
                infoBox.style.display = 'none';
                this.currentItem = null;
                this.currentType = null;
                this.isEditMode = false;
                this.isExpanded = false;
                infoBox.classList.remove('expanded');
                // Réinitialiser previousInfoBox dans tous les cas
                this.previousInfoBox = null;
            }
        }
    }

    toggleExpand() {
        // Fonction désactivée - toujours en mode étendu
        console.log("📋 Toggle expand disabled - always in expanded mode");
    }

    switchTab(tabName) {
        console.log(`📋 [switchTab] Changement d'onglet vers: ${tabName}, currentType: ${this.currentType}`);

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

        // Appliquer la logique d'affichage conditionnel
        this.updateTabsVisibility();
    }

    updateTabsVisibility() {
        const isCharacter = this.currentType === 'character';
        const personnagesTabButton = document.querySelector('.tab-button[data-tab="personnages"]');
        const lieuxRegionsTabButton = document.querySelector('.tab-button[data-tab="lieux-regions"]');

        console.log(`📋 [updateTabsVisibility] Type: ${this.currentType}, isCharacter: ${isCharacter}`);
        console.log(`📋 [updateTabsVisibility] Boutons trouvés - Personnages: ${!!personnagesTabButton}, Lieux/Régions: ${!!lieuxRegionsTabButton}`);

        if (isCharacter) {
            // Pour les PERSONNAGES : masquer "Personnages", afficher "Lieux/Régions"
            if (personnagesTabButton) {
                personnagesTabButton.style.display = 'none';
                console.log(`📋 [updateTabsVisibility] ✓ Onglet Personnages MASQUÉ pour character`);
            }
            if (lieuxRegionsTabButton) {
                lieuxRegionsTabButton.style.display = 'block';
                console.log(`📋 [updateTabsVisibility] ✓ Onglet Lieux/Régions AFFICHÉ pour character`);
            }
        } else {
            // Pour les LIEUX/RÉGIONS : afficher "Personnages", masquer "Lieux/Régions"
            if (personnagesTabButton) {
                personnagesTabButton.style.display = 'block';
                console.log(`📋 [updateTabsVisibility] ✓ Onglet Personnages AFFICHÉ pour location/region`);
            }
            if (lieuxRegionsTabButton) {
                lieuxRegionsTabButton.style.display = 'none';
                console.log(`📋 [updateTabsVisibility] ✓ Onglet Lieux/Régions MASQUÉ pour location/region`);
            }
        }
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

        // Style similaire à la modale voyage : 50% de largeur, 95% de hauteur, ancré à droite
        const desiredWidth = Math.floor(viewportWidth * 0.5);
        const desiredHeight = Math.floor(viewportHeight * 0.95);

        // Positionner à droite avec marge (1.25rem = 20px)
        const right = 20;
        const top = Math.floor((viewportHeight - desiredHeight) / 2);

        infoBox.style.right = `${right}px`;
        infoBox.style.left = 'auto';
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

        // Mettre à jour l'affichage du cercle de vignette
        this.updateThumbnailCircle(this.currentItem);

        // Mettre à jour l'affichage du MapID
        this.updateMapIdDisplay(this.currentItem);


        // Toujours afficher le bouton crayon
        if (editBtn) {
            editBtn.classList.remove('hidden');
            editBtn.style.display = 'inline-block';
            // Changer la couleur selon le mode
            if (this.isEditMode) {
                editBtn.style.color = '#60a5fa'; // bleu clair
            } else {
                editBtn.style.color = '#ffffff'; // blanc
            }
        }

        // Afficher la poubelle uniquement en mode édition
        if (deleteBtn) {
            if (this.isEditMode) {
                deleteBtn.classList.remove('hidden');
                deleteBtn.style.display = 'flex';
            } else {
                deleteBtn.classList.add('hidden');
                deleteBtn.style.display = 'none';
            }
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

        // Onglet Image - Galerie
        const imageTab = document.getElementById('image-tab');
        if (imageTab) {
            imageTab.innerHTML = '';

            if (item.images && item.images.length > 0) {
                // Créer une galerie d'images
                const galleryHTML = `
                    <div class="image-gallery">
                        ${item.images.map((img, index) => `
                            <div class="gallery-item" data-index="${index}">
                                <img src="${img.url}" alt="${item.name}" class="gallery-image">
                            </div>
                        `).join('')}
                    </div>
                    <div id="fullscreen-overlay" class="fullscreen-overlay hidden">
                        <img id="fullscreen-image" src="" alt="${item.name}">
                    </div>
                `;
                imageTab.innerHTML = galleryHTML;

                // Ajouter les event listeners pour le plein écran
                setTimeout(() => {
                    const galleryItems = imageTab.querySelectorAll('.gallery-item');
                    const fullscreenOverlay = imageTab.querySelector('#fullscreen-overlay');
                    const fullscreenImage = imageTab.querySelector('#fullscreen-image');

                    galleryItems.forEach((galleryItem) => {
                        galleryItem.addEventListener('click', () => {
                            const img = galleryItem.querySelector('img');
                            fullscreenImage.src = img.src;
                            fullscreenOverlay.classList.remove('hidden');
                        });
                    });

                    if (fullscreenOverlay) {
                        fullscreenOverlay.addEventListener('click', () => {
                            fullscreenOverlay.classList.add('hidden');
                        });
                    }
                }, 100);
            } else {
                const typeLabel = type === 'region' ? 'Région' : (type === 'character' ? 'Personnage' : 'Lieu');
                imageTab.innerHTML = `
                    <div class="image-view">
                        <div class="compact-title">${item.name}</div>
                        <div class="image-placeholder">Aucune image disponible pour ce ${typeLabel.toLowerCase()}</div>
                    </div>
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
                <div class="prose prose-invert">${this.renderMarkdown(item.description || 'Aucune description disponible.')}</div>
            `;
        }

        // Onglet Personnages (uniquement pour les lieux et régions)
        const personnagesTab = document.getElementById('personnages-tab');
        if (personnagesTab && (type === 'location' || type === 'region')) {
            this.renderPersonnagesTabRead();
        }

        // Onglet Lieux / Régions (pour les personnages)
        const lieuxRegionsTab = document.getElementById('lieux-regions-tab');
        if (lieuxRegionsTab && type === 'character') {
            this.renderLieuxRegionsTabRead();
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
            // Nettoyer complètement l'onglet
            evenementsTab.innerHTML = '';

            const evenements = item.Evenements_Voyage || [];

            if (evenements.length > 0) {
                // Tirer un événement aléatoire
                const randomEvent = evenements[Math.floor(Math.random() * evenements.length)];

                const tableHTML = `
                    <div class="p-4 h-full overflow-y-auto" style="font-family: 'Merriweather', serif;">
                        <div class="mb-6 p-4 bg-blue-900 bg-opacity-50 border border-blue-600 rounded">
                            <h4 class="text-lg font-bold mb-3 text-blue-300" style="font-family: 'Merriweather', serif; font-size: 1.25rem;">
                                <i class="fas fa-dice mr-2"></i>Événement de voyage
                            </h4>
                            <div class="mb-2" style="font-family: 'Merriweather', serif; font-size: 1rem;">
                                <span class="font-semibold text-blue-200">Dé du destin :</span>
                                <span class="ml-2 text-white">${randomEvent['Dé du destin'] || '-'}</span>
                            </div>
                            <div class="mb-2" style="font-family: 'Merriweather', serif; font-size: 1rem;">
                                <span class="font-semibold text-blue-200">Résultat :</span>
                                <span class="ml-2 text-white">${randomEvent['Résultat'] || '-'}</span>
                            </div>
                            <div style="font-family: 'Merriweather', serif; font-size: 1rem;">
                                <span class="font-semibold text-blue-200">Description :</span>
                                <p class="mt-1 text-gray-200 leading-relaxed">${randomEvent['Description'] || '-'}</p>
                            </div>
                        </div>

                        <div class="mb-2">
                            <button onclick="window.infoBoxManager.toggleEvenementsTable()" class="flex items-center text-gray-300 hover:text-white transition-colors">
                                <i id="evenements-toggle-icon" class="fas fa-chevron-right mr-2"></i>
                                <h4 class="text-md font-semibold">Table complète des événements</h4>
                            </button>
                        </div>

                        <div id="evenements-table-container" class="hidden">
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
                    </div>
                `;
                evenementsTab.innerHTML = tableHTML;
            } else {
                evenementsTab.innerHTML = '<div class="p-4 prose prose-invert text-gray-400 italic">Aucune table aléatoire</div>';
            }
        }
    }

    renderLieuxRegionsTabRead() {
        console.log(`🗺️ [renderLieuxRegionsTabRead] ========== DÉBUT DU RENDU ==========`);

        const lieuxRegionsTab = document.getElementById('lieux-regions-tab');
        if (!lieuxRegionsTab) {
            console.error(`❌ [renderLieuxRegionsTabRead] Onglet lieux-regions-tab NON TROUVÉ !`);
            return;
        }

        console.log(`✅ [renderLieuxRegionsTabRead] Onglet lieux-regions-tab trouvé`);

        lieuxRegionsTab.innerHTML = '';

        const character = this.currentItem;
        console.log(`🗺️ [renderLieuxRegionsTabRead] Personnage complet:`, character);

        const associatedLocationIds = character.associatedLocations || [];
        const associatedRegionIds = character.associatedRegions || [];

        console.log(`🗺️ [renderLieuxRegionsTabRead] Rendu pour personnage "${character.name}"`);
        console.log(`🗺️ [renderLieuxRegionsTabRead] associatedLocationIds:`, associatedLocationIds);
        console.log(`🗺️ [renderLieuxRegionsTabRead] associatedRegionIds:`, associatedRegionIds);
        console.log(`🗺️ [renderLieuxRegionsTabRead] Type de associatedLocationIds:`, typeof associatedLocationIds, Array.isArray(associatedLocationIds));

        // Récupérer les lieux associés
        const locationsData = window.locationsData || { locations: [] };
        const associatedLocations = (locationsData.locations || []).filter(loc =>
            associatedLocationIds.includes(String(loc.id))
        );

        // Récupérer les régions associées
        const regionsData = window.regionsData || { regions: [] };
        const associatedRegions = (regionsData.regions || []).filter(reg =>
            associatedRegionIds.includes(String(reg.id))
        );

        console.log(`🗺️ [renderLieuxRegionsTabRead] ${associatedLocations.length} lieux associés trouvés`);
        console.log(`🗺️ [renderLieuxRegionsTabRead] ${associatedRegions.length} régions associées trouvées`);

        if (associatedLocations.length === 0 && associatedRegions.length === 0) {
            lieuxRegionsTab.innerHTML = '<p class="text-gray-500 p-4 italic" style="color: #6b7280 !important;">Aucun lieu ou région associé à ce personnage.</p>';
            return;
        }

        let html = '<div class="p-4 space-y-6">';

        // Section Lieux
        if (associatedLocations.length > 0) {
            html += `
                <div>
                    <h3 class="text-lg font-semibold mb-3 flex items-center" style="color: #940000 !important; font-family: 'Merriweather', serif;">
                        <i class="fas fa-map-marker-alt mr-2" style="color: #940000 !important;"></i>
                        Lieux associés
                    </h3>
                    <div class="space-y-2">
                        ${associatedLocations.map(location => {
                            const thumbnailImage = location.images?.find(img => img.type === 'vignette');
                            return `
                                <div class="location-card-compact bg-white rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                                     onclick="window.infoBoxManager.showLocationFromCharacter('${location.id}')"
                                     style="background-color: white !important;">
                                    <div class="flex items-center space-x-3">
                                        ${thumbnailImage ? `
                                            <img src="${thumbnailImage.url}" alt="${location.name}"
                                                 class="w-10 h-10 rounded-full object-cover border-2"
                                                 style="border-color: #940000 !important;">
                                        ` : `
                                            <div class="w-10 h-10 rounded-full flex items-center justify-center border-2"
                                                 style="background-color: #940000 !important; border-color: #940000 !important;">
                                                <i class="fas fa-map-marker-alt text-sm" style="color: white !important;"></i>
                                            </div>
                                        `}
                                        <div class="flex-1">
                                            <h4 class="font-medium" style="color: black !important;">${location.name}</h4>
                                        </div>
                                        <i class="fas fa-chevron-right" style="color: #6b7280 !important;"></i>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // Section Régions
        if (associatedRegions.length > 0) {
            html += `
                <div>
                    <h3 class="text-lg font-semibold mb-3 flex items-center" style="color: #940000 !important; font-family: 'Merriweather', serif;">
                        <i class="fas fa-mountain mr-2" style="color: #940000 !important;"></i>
                        Régions associées
                    </h3>
                    <div class="space-y-2">
                        ${associatedRegions.map(region => {
                            const thumbnailImage = region.images?.find(img => img.type === 'vignette');
                            return `
                                <div class="region-card-compact bg-white rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                                     onclick="window.infoBoxManager.showRegionFromCharacter('${region.id}')"
                                     style="background-color: white !important;">
                                    <div class="flex items-center space-x-3">
                                        ${thumbnailImage ? `
                                            <img src="${thumbnailImage.url}" alt="${region.name}"
                                                 class="w-10 h-10 rounded-full object-cover border-2"
                                                 style="border-color: #940000 !important;">
                                        ` : `
                                            <div class="w-10 h-10 rounded-full flex items-center justify-center border-2"
                                                 style="background-color: #940000 !important; border-color: #940000 !important;">
                                                <i class="fas fa-mountain text-sm" style="color: white !important;"></i>
                                            </div>
                                        `}
                                        <div class="flex-1">
                                            <h4 class="font-medium" style="color: black !important;">${region.name}</h4>
                                        </div>
                                        <i class="fas fa-chevron-right" style="color: #6b7280 !important;"></i>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        lieuxRegionsTab.innerHTML = html;
        console.log(`🗺️ [renderLieuxRegionsTabRead] ========== FIN DU RENDU ==========`);
    }

    renderLieuxRegionsTabEdit() {
        const lieuxRegionsTab = document.getElementById('lieux-regions-tab');
        if (!lieuxRegionsTab) return;

        const character = this.currentItem;
        const associatedLocationIds = character.associatedLocations || [];
        const associatedRegionIds = character.associatedRegions || [];

        // Récupérer tous les lieux et régions disponibles
        const locationsData = window.locationsData || { locations: [] };
        const regionsData = window.regionsData || { regions: [] };

        const allLocations = locationsData.locations || [];
        const allRegions = regionsData.regions || [];

        let html = `
            <div class="edit-form p-4 space-y-4">
                <div>
                    <h3 class="text-lg font-semibold text-white mb-3">Lieux associés</h3>
                    <div class="space-y-2 max-h-64 overflow-y-auto">
                        ${allLocations.length > 0 ? allLocations.map(location => `
                            <label class="flex items-center space-x-3 p-2 hover:bg-gray-700 rounded cursor-pointer">
                                <input type="checkbox"
                                       class="location-checkbox"
                                       data-location-id="${location.id}"
                                       ${associatedLocationIds.includes(String(location.id)) ? 'checked' : ''}>
                                <span class="text-white">${location.name}</span>
                            </label>
                        `).join('') : '<p class="text-gray-400 italic">Aucun lieu disponible</p>'}
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-white mb-3">Régions associées</h3>
                    <div class="space-y-2 max-h-64 overflow-y-auto">
                        ${allRegions.length > 0 ? allRegions.map(region => `
                            <label class="flex items-center space-x-3 p-2 hover:bg-gray-700 rounded cursor-pointer">
                                <input type="checkbox"
                                       class="region-checkbox"
                                       data-region-id="${region.id}"
                                       ${associatedRegionIds.includes(String(region.id)) ? 'checked' : ''}>
                                <span class="text-white">${region.name}</span>
                            </label>
                        `).join('') : '<p class="text-gray-400 italic">Aucune région disponible</p>'}
                    </div>
                </div>

                <div class="flex space-x-2 pt-4 border-t border-gray-600">
                    <button onclick="window.infoBoxManager.saveEdit()" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                        <i class="fas fa-save mr-1"></i>Sauvegarder
                    </button>
                    <button onclick="window.infoBoxManager.exitEditMode()" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded">
                        <i class="fas fa-times mr-1"></i>Annuler
                    </button>
                </div>
            </div>
        `;

        lieuxRegionsTab.innerHTML = html;
    }

    showLocationFromCharacter(locationId) {
        const locationsData = window.locationsData || { locations: [] };
        const location = (locationsData.locations || []).find(loc => String(loc.id) === String(locationId));

        if (!location) {
            console.warn(`Lieu non trouvé avec l'ID: ${locationId}`);
            return;
        }

        // Sauvegarder l'infobox actuelle (personnage) pour pouvoir y revenir
        this.previousInfoBox = {
            item: this.currentItem,
            type: this.currentType,
            fromInfoBox: true,
            shouldShowPersonnagesTab: false
        };

        const fakeEvent = {
            clientX: window.innerWidth / 2,
            clientY: window.innerHeight / 2,
            type: 'click'
        };

        this.showInfoBox(fakeEvent, location, 'location');
    }

    showRegionFromCharacter(regionId) {
        const regionsData = window.regionsData || { regions: [] };
        const region = (regionsData.regions || []).find(reg => String(reg.id) === String(regionId));

        if (!region) {
            console.warn(`Région non trouvée avec l'ID: ${regionId}`);
            return;
        }

        // Sauvegarder l'infobox actuelle (personnage) pour pouvoir y revenir
        this.previousInfoBox = {
            item: this.currentItem,
            type: this.currentType,
            fromInfoBox: true,
            shouldShowPersonnagesTab: false
        };

        const fakeEvent = {
            clientX: window.innerWidth / 2,
            clientY: window.innerHeight / 2,
            type: 'click'
        };

        this.showInfoBox(fakeEvent, region, 'region');
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
                    <div id="edit-images-gallery" class="mb-3">
                        ${this.renderEditImagesGallery()}
                    </div>
                    <div class="mb-3">
                        <label class="block text-sm font-medium mb-2 text-white">Ajouter une image :</label>
                        <button type="button" onclick="window.infoBoxManager.openLibraryForEdit()" class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors flex items-center justify-center space-x-2 mb-3">
                            <i class="fas fa-images"></i>
                            <span>Choisir dans la bibliothèque</span>
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

        // Onglet Personnages (mode édition)
        const personnagesTab = document.getElementById('personnages-tab');
        if (personnagesTab && (type === 'location' || type === 'region')) {
            this.renderPersonnagesTabEdit();
        }

        // Onglet Lieux / Régions (mode édition pour les personnages)
        const lieuxRegionsTab = document.getElementById('lieux-regions-tab');
        if (lieuxRegionsTab && type === 'character') {
            this.renderLieuxRegionsTabEdit();
        }

        // Onglet Rumeurs et Traditions (mode édition)
        const rumeursTab = document.getElementById('rumeurs-traditions-tab');
        if (rumeursTab) {
            // Préparer le tableau de rumeurs pour l'édition
            let rumeursArray = [];
            let currentTradition = item.Tradition_Ancienne || '';

            if (type === 'region') {
                // Pour les régions, on suppose que 'Rumeur' est une chaîne unique ou 'Rumeurs' un tableau
                const rumeurs = item.Rumeurs || (item.Rumeur ? [item.Rumeur] : []);
                rumeursArray = rumeurs.filter(r => r && r !== "A définir");
            } else { // Pour les lieux, on suppose que 'Rumeurs' est déjà un tableau ou une chaîne séparée par '---'
                const rumeursText = Array.isArray(item.Rumeurs) ? item.Rumeurs.join('\n\n---\n\n') : (item.Rumeur || '');
                rumeursArray = rumeursText.split(/\n---\n/).map(r => r.trim()).filter(r => r !== '');
            }

            // Cacher la vue lecture et afficher le mode édition
            const textView = rumeursTab.querySelector('.text-view');
            if (textView) {
                textView.style.display = 'none';
            }

            // Créer ou afficher le formulaire d'édition
            let editForm = rumeursTab.querySelector('.edit-form');
            if (!editForm) {
                editForm = document.createElement('div');
                editForm.className = 'edit-form'; // Retirer p-4 pour que le style du parent s'applique
                rumeursTab.appendChild(editForm);
            }

            editForm.style.display = 'block';

            // Générer le HTML pour les rumeurs
            const rumeursHTML = rumeursArray.map((rumeur, index) => `
                <div class="flex items-start space-x-2 mb-2" data-rumeur-index="${index}">
                    <textarea rows="3" class="flex-1 p-2 border rounded bg-white text-black text-sm border-gray-600 edit-rumeur-input" data-index="${index}">${rumeur}</textarea>
                    <button onclick="window.infoBoxManager.deleteRumeurInEdit(${index})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded flex-shrink-0" title="Supprimer cette rumeur">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');

            editForm.innerHTML = `
                <div class="mb-4">
                    <label class="block text-sm font-medium text-white mb-2">Rumeurs</label>
                    <div id="edit-rumeurs-list" class="space-y-2 mb-3">
                        ${rumeursHTML || '<p class="text-gray-400 italic text-sm">Aucune rumeur. Cliquez sur "Ajouter une rumeur" ci-dessous.</p>'}
                    </div>
                    <button onclick="window.infoBoxManager.addRumeurInEdit()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm">
                        <i class="fas fa-plus mr-1"></i>Ajouter une rumeur
                    </button>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-white mb-2">
                        Tradition Ancienne (Markdown supporté) :
                    </label>
                    <textarea id="edit-tradition" class="w-full p-2 border rounded h-32 bg-white text-black font-mono text-sm" placeholder="Utilisez Markdown: **gras**, *italique*, # Titres, - listes, etc.">${currentTradition}</textarea>
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

    renderEditImagesGallery() {
        const item = this.currentItem;
        if (!item.images || item.images.length === 0) {
            return '<p class="text-gray-400 text-center py-4">Aucune image</p>';
        }

        return `
            <div class="image-gallery">
                ${item.images.map((image, index) => {
                    const isVignette = image.type === 'vignette';

                    return `
                        <div class="gallery-item-edit relative">
                            <img src="${image.url}" alt="${item.name}" class="gallery-image">
                            <div class="flex items-center justify-center space-x-2 mt-2">
                                ${isVignette ? '<span class="text-xs bg-green-500 text-white px-2 py-1 rounded">Vignette</span>' : ''}
                                <button onclick="window.infoBoxManager.toggleImageTypeMenu(${index})" class="text-white hover:text-blue-300 p-1" title="Changer le type">
                                    <i class="fas fa-tag"></i>
                                </button>
                                <button onclick="window.infoBoxManager.removeImage(${index})" class="text-white hover:text-red-300 p-1" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                            <div id="image-type-menu-${index}" class="hidden absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded shadow-lg z-10 w-32">
                                <button onclick="window.infoBoxManager.setImageType(${index}, 'vignette')" class="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-gray-800">Vignette</button>
                                <button onclick="window.infoBoxManager.setImageType(${index}, null)" class="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-gray-800">Sans type</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
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

        // Re-render la galerie d'images
        const imagesGallery = document.getElementById('edit-images-gallery');
        if (imagesGallery) {
            imagesGallery.innerHTML = this.renderEditImagesGallery();
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
            .replace(/<p>(<h[1-6]>) /g, '$1')
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

    updateThumbnailCircle(item) {
        const infoBoxHeader = document.getElementById('info-box-header');
        if (!infoBoxHeader) return;

        // Supprimer l'ancien cercle s'il existe
        const existingCircle = document.getElementById('info-box-thumbnail-circle');
        if (existingCircle) {
            existingCircle.remove();
        }

        // Créer le cercle de vignette
        const circle = document.createElement('div');
        circle.id = 'info-box-thumbnail-circle';
        circle.style.width = '70px';
        circle.style.height = '70px';
        circle.style.borderRadius = '50%';
        circle.style.border = '2px solid #940000';
        circle.style.flexShrink = '0';
        circle.style.marginRight = '12px';
        circle.style.overflow = 'hidden';
        circle.style.backgroundColor = 'transparent';

        // Chercher la vignette dans les images
        let thumbnailUrl = null;
        if (item.images && item.images.length > 0) {
            const thumbnailImage = item.images.find(img => img.type === 'vignette');
            if (thumbnailImage && thumbnailImage.thumbnailUrl) {
                thumbnailUrl = thumbnailImage.thumbnailUrl;
            }
        }

        // Insérer le cercle au début du header, avant le titre
        const titleContainer = infoBoxHeader.querySelector('.flex.items-center.flex-grow');
        if (titleContainer) {
            titleContainer.insertBefore(circle, titleContainer.firstChild);
        }

        // Si une vignette existe, l'afficher
        if (thumbnailUrl) {
            const img = document.createElement('img');
            img.src = thumbnailUrl;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            circle.appendChild(img);
        }
    }

    updateMapIdDisplay(item) {
        const infoBoxTitle = document.getElementById('info-box-title');
        if (!infoBoxTitle) return;

        // Supprimer l'ancien affichage MapID s'il existe
        const existingMapIdDisplay = document.getElementById('info-box-mapid-display');
        if (existingMapIdDisplay) {
            existingMapIdDisplay.remove();
        }

        // Ne plus afficher le MapID - commenté pour debug futur si nécessaire
        // Le MapID est maintenant masqué de l'interface utilisateur
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

    addRumeurInEdit() {
        const list = document.getElementById('edit-rumeurs-list');
        if (!list) return;

        // Supprimer le message "Aucune rumeur" s'il existe
        const emptyMsg = list.querySelector('p.text-gray-400');
        if (emptyMsg) emptyMsg.remove();

        // Compter le nombre de rumeurs existantes
        const existingRumeurs = list.querySelectorAll('[data-rumeur-index]');
        const newIndex = existingRumeurs.length;

        const newRumeurHTML = `
            <div class="flex items-start space-x-2 mb-2" data-rumeur-index="${newIndex}">
                <textarea rows="3" class="flex-1 p-2 border rounded bg-white text-black text-sm border-gray-600 edit-rumeur-input" data-index="${newIndex}" placeholder="Nouvelle rumeur..."></textarea>
                <button onclick="window.infoBoxManager.deleteRumeurInEdit(${newIndex})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded flex-shrink-0" title="Supprimer cette rumeur">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', newRumeurHTML);
    }

    deleteRumeurInEdit(index) {
        const list = document.getElementById('edit-rumeurs-list');
        if (!list) return;

        const rumeurDiv = list.querySelector(`[data-rumeur-index="${index}"]`);
        if (rumeurDiv) {
            rumeurDiv.remove();
        }

        // Si plus aucune rumeur, afficher le message
        const remainingRumeurs = list.querySelectorAll('[data-rumeur-index]');
        if (remainingRumeurs.length === 0) {
            list.innerHTML = '<p class="text-gray-400 italic text-sm">Aucune rumeur. Cliquez sur "Ajouter une rumeur" ci-dessous.</p>';
        }
    }

    async saveEdit() {
        console.log("💾 Saving edit...");

        const nameInput = document.getElementById('edit-name');
        const descTextarea = document.getElementById('edit-description');
        const traditionTextarea = document.getElementById('edit-tradition');

        // Valider les champs obligatoires
        if (nameInput && !nameInput.value.trim()) {
            alert("Le nom ne peut pas être vide.");
            return;
        }

        // Mettre à jour l'objet
        if (nameInput) this.currentItem.name = nameInput.value.trim();
        if (descTextarea) this.currentItem.description = descTextarea.value.trim();

        // Gérer les rumeurs - récupérer depuis les textareas individuels
        const rumeurInputs = document.querySelectorAll('.edit-rumeur-input');
        if (rumeurInputs && rumeurInputs.length > 0) {
            const rumeursArray = Array.from(rumeurInputs)
                .map(input => input.value.trim())
                .filter(r => r.length > 0);

            if (rumeursArray.length > 1) {
                this.currentItem.Rumeurs = rumeursArray;
                delete this.currentItem.Rumeur; // Supprimer l'ancienne propriété si elle existe
            } else if (rumeursArray.length === 1) {
                this.currentItem.Rumeur = rumeursArray[0]; // Assigner comme Rumeur unique
                delete this.currentItem.Rumeurs;
            } else {
                delete this.currentItem.Rumeur;
                delete this.currentItem.Rumeurs;
            }
        } else {
            // Si aucun champ de rumeur n'existe (peut arriver si la liste était vide et qu'on n'a pas ajouté),
            // s'assurer que les propriétés sont supprimées si elles existaient.
            delete this.currentItem.Rumeur;
            delete this.currentItem.Rumeurs;
        }

        // Tradition ancienne
        if (traditionTextarea) {
            this.currentItem.Tradition_Ancienne = traditionTextarea.value.trim();
        }

        // Événements de voyage
        if (this.tempEvenements !== undefined) {
            this.currentItem.Evenements_Voyage = this.tempEvenements;
            this.tempEvenements = undefined;
        }

        // Personnages associés (pour lieux et régions uniquement)
        if (this.currentType === 'location' || this.currentType === 'region') {
            const checkboxes = document.querySelectorAll('.character-checkbox');
            const associatedCharacterIds = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.characterId);

            console.log(`🔍 [SAVE] AVANT update - ${this.currentType} "${this.currentItem.name}" (id: ${this.currentItem.id})`);
            console.log(`🔍 [SAVE] associatedCharacters AVANT:`, this.currentItem.associatedCharacters);
            console.log(`🔍 [SAVE] Nouvelles associations cochées:`, associatedCharacterIds);

            this.currentItem.associatedCharacters = associatedCharacterIds;

            console.log(`🔍 [SAVE] associatedCharacters APRÈS:`, this.currentItem.associatedCharacters);

            // Log des personnages concernés AVANT modification
            if (window.charactersManager) {
                console.log(`🔍 [SAVE] Personnages concernés - AVANT modification bidirectionnelle:`);
                associatedCharacterIds.forEach(charId => {
                    const char = window.charactersManager.characters.find(c => String(c.id) === String(charId));
                    if (char) {
                        console.log(`  - ${char.name} (id: ${char.id}):`, {
                            associatedLocations: char.associatedLocations,
                            associatedRegions: char.associatedRegions
                        });
                    }
                });
            }
        }

        console.log("💾 [SAVE] Objet après modification:", JSON.stringify(this.currentItem).substring(0, 200) + "...");

        // Sauvegarder via DataManager
        if (this.currentType === 'region') {
            // CRITIQUE: TOUJOURS synchroniser avec window.regionsData AVANT toute opération
            if (window.regionsData && window.regionsData.regions) {
                console.log(`🔄 [SAVE] Synchronisation AVANT recherche - window: ${window.regionsData.regions.length} régions, dataManager: ${this.dataManager.regionsData.regions.length} régions`);
                this.dataManager.regionsData = window.regionsData;
            }

            const regionIndex = this.dataManager.regionsData.regions.findIndex(reg =>
                String(reg.id) === String(this.currentItem.id)
            );

            console.log(`🔍 [SAVE] Recherche de la région ID ${this.currentItem.id} dans ${this.dataManager.regionsData.regions.length} régions - Index trouvé: ${regionIndex}`);

            if (regionIndex === -1) {
                console.error(`❌ [SAVE] Région non trouvée dans regionsData: ${this.currentItem.id}`);
                alert("Erreur : impossible de sauvegarder la région.");
                return;
            }

            console.log(`💾 [SAVE] Région AVANT mise à jour (index ${regionIndex}):`, JSON.stringify(this.dataManager.regionsData.regions[regionIndex]).substring(0, 150));

            // Mettre à jour l'objet complet dans le tableau
            this.dataManager.regionsData.regions[regionIndex] = { ...this.currentItem };

            console.log(`💾 [SAVE] Région APRÈS mise à jour (index ${regionIndex}):`, JSON.stringify(this.dataManager.regionsData.regions[regionIndex]).substring(0, 150));
            console.log(`🔍 [SAVE] region.associatedCharacters APRÈS sauvegarde:`, this.dataManager.regionsData.regions[regionIndex].associatedCharacters);

            // Synchroniser avec la variable globale
            window.regionsData = this.dataManager.regionsData;

            // Sauvegarder
            // IMPORTANT: Synchroniser dataManager.regionsData AVANT de sauvegarder
            if (window.dataManager) {
                window.dataManager.regionsData = window.regionsData;
                window.dataManager.saveRegionsToLocal();
            }

            // MODIFICATION BIDIRECTIONNELLE - Mettre à jour les personnages
            if (window.charactersManager && this.currentItem.associatedCharacters) {
                const regionId = String(this.currentItem.id);

                // Pour chaque personnage, vérifier s'il doit être associé ou dissocié
                window.charactersManager.characters.forEach(character => {
                    const charId = String(character.id);
                    const isAssociated = this.currentItem.associatedCharacters.includes(charId);

                    // Initialiser associatedRegions si nécessaire
                    if (!character.associatedRegions) {
                        character.associatedRegions = [];
                    }

                    const currentlyAssociated = character.associatedRegions.includes(regionId);

                    if (isAssociated && !currentlyAssociated) {
                        // Ajouter la région au personnage
                        character.associatedRegions.push(regionId);
                        console.log(`✅ [SAVE] Personnage ${character.name} associé à la région ${this.currentItem.name}`);
                    } else if (!isAssociated && currentlyAssociated) {
                        // Retirer la région du personnage
                        character.associatedRegions = character.associatedRegions.filter(
                            regId => String(regId) !== regionId
                        );
                        console.log(`❌ [SAVE] Personnage ${character.name} dissocié de la région ${this.currentItem.name}`);
                    }
                });

                // Sauvegarder les personnages
                window.charactersManager.saveCharactersToLocal();
                console.log(`💾 [SAVE] Personnages sauvegardés avec associations bidirectionnelles`);
            }

            // Log des personnages APRÈS modification bidirectionnelle
            if (window.charactersManager && this.currentItem.associatedCharacters) {
                console.log(`🔍 [SAVE] Personnages concernés - APRÈS modification bidirectionnelle:`);
                this.currentItem.associatedCharacters.forEach(charId => {
                    const char = window.charactersManager.characters.find(c => String(c.id) === String(charId));
                    if (char) {
                        console.log(`  - ${char.name} (id: ${char.id}):`, {
                            associatedLocations: char.associatedLocations,
                            associatedRegions: char.associatedRegions
                        });
                    }
                });
            }

            // Re-render
            if (typeof renderRegions === 'function') {
                renderRegions();
            }
        } else if (this.currentType === 'location') {
            // CRITIQUE: TOUJOURS synchroniser avec window.locationsData AVANT toute opération
            if (window.locationsData && window.locationsData.locations) {
                console.log(`🔄 [SAVE] Synchronisation AVANT recherche - window: ${window.locationsData.locations.length} lieux, dataManager: ${this.dataManager.locationsData.locations.length} lieux`);
                this.dataManager.locationsData = window.locationsData;
            }

            let locationIndex = this.dataManager.locationsData.locations.findIndex(loc =>
                String(loc.id) === String(this.currentItem.id)
            );

            console.log(`🔍 [SAVE] Recherche du lieu ID ${this.currentItem.id} dans ${this.dataManager.locationsData.locations.length} lieux - Index trouvé: ${locationIndex}`);

            // Si le lieu n'existe pas encore, l'ajouter au tableau
            if (locationIndex === -1) {
                console.log(`ℹ️ [SAVE] Nouveau lieu détecté: ${this.currentItem.id}, ajout au tableau`);
                this.dataManager.locationsData.locations.push({ ...this.currentItem });
                locationIndex = this.dataManager.locationsData.locations.length - 1;
            }

            console.log(`💾 [SAVE] Lieu AVANT mise à jour (index ${locationIndex}):`, JSON.stringify(this.dataManager.locationsData.locations[locationIndex]).substring(0, 150));

            // Mettre à jour l'objet complet dans le tableau
            this.dataManager.locationsData.locations[locationIndex] = { ...this.currentItem };

            console.log(`💾 [SAVE] Lieu APRÈS mise à jour (index ${locationIndex}):`, JSON.stringify(this.dataManager.locationsData.locations[locationIndex]).substring(0, 150));
            console.log(`🔍 [SAVE] location.associatedCharacters APRÈS sauvegarde:`, this.dataManager.locationsData.locations[locationIndex].associatedCharacters);

            // Synchroniser avec la variable globale
            window.locationsData = this.dataManager.locationsData;

            // Sauvegarder
            // IMPORTANT: Synchroniser dataManager.locationsData AVANT de sauvegarder
            if (window.dataManager) {
                window.dataManager.locationsData = window.locationsData;
                window.dataManager.saveLocationsToLocal();
            }

            // MODIFICATION BIDIRECTIONNELLE - Mettre à jour les personnages
            if (window.charactersManager && this.currentItem.associatedCharacters) {
                const locationId = String(this.currentItem.id);

                // Pour chaque personnage, vérifier s'il doit être associé ou dissocié
                window.charactersManager.characters.forEach(character => {
                    const charId = String(character.id);
                    const isAssociated = this.currentItem.associatedCharacters.includes(charId);

                    // Initialiser associatedLocations si nécessaire
                    if (!character.associatedLocations) {
                        character.associatedLocations = [];
                    }

                    const currentlyAssociated = character.associatedLocations.includes(locationId);

                    if (isAssociated && !currentlyAssociated) {
                        // Ajouter le lieu au personnage
                        character.associatedLocations.push(locationId);
                        console.log(`✅ [SAVE] Personnage ${character.name} associé au lieu ${this.currentItem.name}`);
                    } else if (!isAssociated && currentlyAssociated) {
                        // Retirer le lieu du personnage
                        character.associatedLocations = character.associatedLocations.filter(
                            locId => String(locId) !== locationId
                        );
                        console.log(`❌ [SAVE] Personnage ${character.name} dissocié du lieu ${this.currentItem.name}`);
                    }
                });

                // Sauvegarder les personnages
                window.charactersManager.saveCharactersToLocal();
                console.log(`💾 [SAVE] Personnages sauvegardés avec associations bidirectionnelles`);
            }

            // Log des personnages APRÈS modification bidirectionnelle
            if (window.charactersManager && this.currentItem.associatedCharacters) {
                console.log(`🔍 [SAVE] Personnages concernés - APRÈS modification bidirectionnelle:`);
                this.currentItem.associatedCharacters.forEach(charId => {
                    const char = window.charactersManager.characters.find(c => String(c.id) === String(charId));
                    if (char) {
                        console.log(`  - ${char.name} (id: ${char.id}):`, {
                            associatedLocations: char.associatedLocations,
                            associatedRegions: char.associatedRegions
                        });
                    }
                });
            }

            // Re-render
            if (typeof renderLocations === 'function') {
                renderLocations();
            }
        } else if (this.currentType === 'character') {
            if (window.charactersManager) {
                window.charactersManager.updateCharacter(this.currentItem.id, this.currentItem);
            }
        }

        // Log des personnages APRÈS modification bidirectionnelle
        if (window.charactersManager && this.currentItem.associatedCharacters) {
            console.log(`🔍 [SAVE] Personnages concernés - APRÈS modification bidirectionnelle:`);
            this.currentItem.associatedCharacters.forEach(charId => {
                const char = window.charactersManager.characters.find(c => String(c.id) === String(charId));
                if (char) {
                    console.log(`  - ${char.name} (id: ${char.id}):`, {
                        associatedLocations: char.associatedLocations,
                        associatedRegions: char.associatedRegions
                    });
                }
            });

            // IMPORTANT: Si l'objet courant est un personnage affiché, le mettre à jour
            if (this.currentType === 'character') {
                const updatedChar = window.charactersManager.characters.find(
                    c => String(c.id) === String(this.currentItem.id)
                );
                if (updatedChar) {
                    this.currentItem = updatedChar;
                    console.log(`🔄 [SAVE] Objet character rafraîchi dans InfoBox`);
                }
            }
        }

        // Re-render les lieux
        if (window.renderLocations) {
            window.renderLocations();
        }

        // Passer en mode lecture
        this.isEditMode = false;
        this.updateInfoBoxContent();

        // IMPORTANT: Forcer le re-render de l'onglet personnages si on est sur un lieu/région
        if (this.currentType === 'location' || this.currentType === 'region') {
            console.log('🔄 [SAVE] Re-render de l\'onglet personnages après sauvegarde');
            
            // Basculer vers l'onglet personnages pour montrer les changements
            this.switchTab('personnages');
            
            // Re-render immédiatement après le switch
            this.renderPersonnagesTabRead();
        }

        console.log("✅ [SAVE] Sauvegarde locale terminée");

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
            type: null,
            thumbnailUrl: null
        };

        this.currentItem.images.push(newImage);

        // Re-render la galerie d'images
        const imagesGallery = document.getElementById('edit-images-gallery');
        if (imagesGallery) {
            imagesGallery.innerHTML = this.renderEditImagesGallery();
        }

        console.log("🖼️ Image added from upload:", uploadResult.url);
    }

    removeImage(index) {
        if (!this.currentItem.images || index < 0 || index >= this.currentItem.images.length) {
            return;
        }

        this.currentItem.images.splice(index, 1);

        // Re-render la galerie d'images
        const imagesGallery = document.getElementById('edit-images-gallery');
        if (imagesGallery) {
            imagesGallery.innerHTML = this.renderEditImagesGallery();
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

    async openLibraryForEdit() {
        const modal = document.getElementById('library-selection-modal');
        const content = document.getElementById('library-selection-content');
        const empty = document.getElementById('library-selection-empty');
        const loading = document.getElementById('library-selection-loading');
        const authRequired = document.getElementById('library-selection-auth-required');
        const pathInfo = document.getElementById('library-path-info');
        const pathDisplay = document.getElementById('library-path-display');

        if (!modal) {
            console.error("❌ Modal library-selection-modal non trouvée");
            return;
        }

        console.log("🔍 selectedLibraryImagesForEdit AVANT initialisation:", this.selectedLibraryImagesForEdit);

        // Toujours réinitialiser la sélection à l'ouverture de la modale
        this.selectedLibraryImagesForEdit = [];
        console.log("✅ Initialisation de selectedLibraryImagesForEdit à []");

        this.currentLibraryFolder = null;
        this.currentLibraryPath = [];
        this.libraryFolders = {};
        this.libraryStructure = {};

        console.log("🔍 État après initialisation:", {
            selectedLibraryImagesForEdit: this.selectedLibraryImagesForEdit,
            currentLibraryFolder: this.currentLibraryFolder,
            currentLibraryPath: this.currentLibraryPath
        });

        // Vérifier l'authentification
        if (!window.authManager || !window.authManager.isAuthenticated) {
            content.classList.add('hidden');
            empty.classList.add('hidden');
            loading.classList.add('hidden');
            authRequired.classList.remove('hidden');
            if (pathInfo) pathInfo.classList.add('hidden');
            modal.classList.remove('hidden');
            return;
        }

        // Déterminer le dossier de départ selon le type d'élément
        const isCharacter = this.currentItem && this.currentType === 'character';
        const startPath = isCharacter ? 'people' : null;

        console.log("🔍 Type d'élément:", this.currentType, "- Chemin de départ:", startPath);

        // Afficher le chemin de stockage
        if (pathInfo && pathDisplay && window.authManager.currentUser) {
            const googleId = window.authManager.currentUser.google_id;
            // Utiliser le chemin de départ déterminé
            pathDisplay.textContent = `uploads/${googleId}/${startPath || ''}`;
            pathInfo.classList.remove('hidden');
        }

        // Afficher le loading
        content.classList.add('hidden');
        empty.classList.add('hidden');
        authRequired.classList.add('hidden');
        loading.classList.remove('hidden');
        modal.classList.remove('hidden');

        try {
            const response = await fetch('/api/images/library', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.folders && Object.keys(data.folders).length > 0) {
                // Filtrer la structure selon le type d'élément
                if (startPath) {
                    // Pour les personnages, filtrer uniquement les dossiers commençant par 'people'
                    const filteredFolders = {};
                    Object.keys(data.folders).forEach(key => {
                        if (key === startPath || key.startsWith(startPath + '/')) {
                            // Retirer le préfixe "people/" pour commencer directement dans ce dossier
                            const relativeKey = key === startPath ? '' : key.substring(startPath.length + 1);
                            if (relativeKey) { // Ignorer le dossier 'people' lui-même
                                filteredFolders[relativeKey] = data.folders[key];
                            }
                        }
                    });
                    this.buildLibraryStructure(filteredFolders);
                    console.log("✅ Structure filtrée pour", startPath, ":", Object.keys(filteredFolders).length, "sous-dossiers");
                } else {
                    this.buildLibraryStructure(data.folders);
                    console.log("✅ Structure de bibliothèque complète chargée:", Object.keys(data.folders).length, "dossiers");
                }

                this.renderLibraryNavigation(); // Utiliser la nouvelle méthode
                content.classList.remove('hidden');
            } else {
                empty.classList.remove('hidden');
            }

        } catch (error) {
            console.error("❌ Erreur lors du chargement de la bibliothèque:", error);
            alert(`Erreur lors du chargement de la bibliothèque: ${error.message}`);
            empty.classList.remove('hidden');
        } finally {
            loading.classList.add('hidden');
        }
    }

    // Nouvelle méthode pour construire et naviguer dans la structure
    buildLibraryStructure(folders) {
        this.libraryStructure = {};

        // Construire d'abord tous les dossiers (même vides)
        Object.keys(folders).forEach(folderPath => {
            const parts = folderPath.split('/').filter(p => p); // Filtrer les parties vides
            let current = this.libraryStructure;

            parts.forEach((part, index) => {
                if (!current[part]) {
                    current[part] = {
                        subfolders: {},
                        images: [],
                        fullPath: parts.slice(0, index + 1).join('/')
                    };
                }

                // Se déplacer vers les sous-dossiers pour la prochaine itération
                if (index < parts.length - 1) {
                    current = current[part].subfolders;
                } else {
                    // Dernier niveau : ajouter les images
                    current[part].images = folders[folderPath] || [];
                }
            });
        });

        console.log('📁 Structure de bibliothèque construite:', this.libraryStructure);
    }

    // Nouvelle méthode pour rendre la navigation de la bibliothèque
    renderLibraryNavigation(path = []) {
        const content = document.getElementById('library-selection-content');
        if (!content) return;

        let currentLevel = this.libraryStructure;
        let currentData = null;

        // Naviguer jusqu'au niveau actuel
        path.forEach(folder => {
            if (currentLevel[folder]) {
                currentData = currentLevel[folder];
                currentLevel = currentLevel[folder].subfolders || {};
            }
        });

        const folders = Object.keys(currentLevel);
        const currentImages = currentData ? (currentData.images || []) : [];

        console.log(`📂 [renderLibraryNavigation] Chemin actuel:`, path);
        console.log(`📂 Dossiers au niveau actuel:`, folders);
        console.log(`📂 Images au niveau actuel:`, currentImages.length);

        let breadcrumb = '';
        if (path.length > 0) {
            breadcrumb = `
                <div class="col-span-full mb-4 flex items-center space-x-2">
                    <button onclick="window.infoBoxManager.navigateLibraryUp()" class="flex items-center text-blue-400 hover:text-blue-300">
                        <i class="fas fa-arrow-left mr-2"></i>
                        Retour
                    </button>
                    <span class="text-gray-400">/</span>
                    <span class="text-white font-medium">${path.join(' / ')}</span>
                </div>
            `;
        }

        content.innerHTML = `
            ${breadcrumb}
            ${folders.length > 0 ? `
                <div class="col-span-full mb-4">
                    <h3 class="text-lg font-semibold text-white mb-2">${path.length > 0 ? 'Sous-dossiers :' : 'Sélectionner un dossier :'}</h3>
                </div>
                ${folders.map(folder => {
                    const info = currentLevel[folder];
                    const imageCount = (info.images || []).length;
                    const subfolderCount = Object.keys(info.subfolders || {}).length;

                    return `
                        <div class="relative cursor-pointer rounded-lg overflow-hidden bg-gray-700 hover:ring-2 hover:ring-blue-500 transition-all p-6 flex flex-col items-center justify-center"
                             onclick="window.infoBoxManager.navigateIntoLibraryFolder('${folder}')">
                            <i class="fas fa-folder text-blue-400 text-4xl mb-2"></i>
                            <div class="text-white font-medium">${folder}</div>
                            <div class="text-gray-400 text-sm">
                                ${imageCount > 0 ? `${imageCount} image(s)` : ''}
                                ${imageCount > 0 && subfolderCount > 0 ? ' • ' : ''}
                                ${subfolderCount > 0 ? `${subfolderCount} dossier(s)` : ''}
                                ${imageCount === 0 && subfolderCount === 0 ? 'Vide' : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            ` : ''}
            ${currentImages.length > 0 ? this.renderCurrentFolderImages(currentImages) : ''}
        `;

        console.log(`✅ [renderLibraryNavigation] Contenu HTML généré pour ${folders.length} dossier(s) et ${currentImages.length} image(s)`);
    }

    renderCurrentFolderImages(images) {
        if (!images || images.length === 0) return '';

        return `
            <div class="col-span-full mt-6 mb-2">
                <h4 class="text-md font-semibold text-white">Images dans ce dossier :</h4>
            </div>
            ${images.map(image => {
                const safeId = image.url.replace(/[^a-zA-Z0-9]/g, '_');
                const isSelected = this.selectedLibraryImagesForEdit &&
                                  this.selectedLibraryImagesForEdit.some(img => img.url === image.url);
                const selectedClass = isSelected ? 'ring-2 ring-blue-500' : '';
                const indicatorClass = isSelected ? '' : 'hidden';

                // Échapper correctement l'URL et le filename pour éviter les problèmes avec les caractères spéciaux
                const escapedUrl = image.url.replace(/'/g, "\\'");
                const escapedFilename = encodeURIComponent(image.filename).replace(/'/g, "\\'");

                return `
                    <div class="relative cursor-pointer rounded-lg overflow-hidden bg-gray-700 hover:ring-2 hover:ring-blue-500 transition-all library-image-card ${selectedClass}"
                         data-url="${image.url}"
                         data-filename="${encodeURIComponent(image.filename)}"
                         data-safeid="${safeId}"
                         onclick="event.preventDefault(); event.stopPropagation(); window.infoBoxManager.toggleLibraryImageSelectionForEdit('${escapedUrl}', '${escapedFilename}', '${safeId}');">
                        <img src="${image.url}" alt="${image.filename}" class="w-full h-32 object-cover">
                        <div class="absolute top-2 right-2 ${indicatorClass} selected-indicator-${safeId}">
                            <div class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                                <i class="fas fa-check text-xs"></i>
                            </div>
                        </div>
                        <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                            <div class="opacity-0 hover:opacity-100 transition-opacity text-white text-center p-2">
                                <p class="text-xs truncate">${image.filename}</p>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    }

    navigateIntoLibraryFolder(folderName) {
        console.log(`🔽 [navigateIntoLibraryFolder] Navigation vers: ${folderName}`);
        if (!this.currentLibraryPath) {
            this.currentLibraryPath = [];
        }
        this.currentLibraryPath.push(folderName);
        console.log(`🔽 Nouveau chemin:`, this.currentLibraryPath);
        this.renderLibraryNavigation(this.currentLibraryPath);
    }

    navigateLibraryUp() {
        console.log(`🔼 [navigateLibraryUp] Retour en arrière depuis:`, this.currentLibraryPath);
        if (!this.currentLibraryPath || this.currentLibraryPath.length === 0) return;
        this.currentLibraryPath.pop();
        console.log(`🔼 Nouveau chemin:`, this.currentLibraryPath);
        this.renderLibraryNavigation(this.currentLibraryPath);
    }





    toggleLibraryImageSelectionForEdit(url, filename, safeId) {
        console.log('🔍 [toggleLibraryImageSelectionForEdit] DÉBUT');
        console.log('   url:', url);
        console.log('   filename:', filename);
        console.log('   safeId:', safeId);

        // Initialiser le tableau si nécessaire
        if (!this.selectedLibraryImagesForEdit) {
            console.warn('⚠️ selectedLibraryImagesForEdit était undefined, réinitialisation');
            this.selectedLibraryImagesForEdit = [];
        }

        console.log('🔍 État actuel: this.selectedLibraryImagesForEdit =', JSON.stringify(this.selectedLibraryImagesForEdit));
        console.log('🔍 Nombre d\'images sélectionnées:', this.selectedLibraryImagesForEdit.length);

        // Rechercher la carte par data-safeid pour éviter les problèmes d'échappement
        const card = document.querySelector(`.library-image-card[data-safeid="${safeId}"]`);
        if (!card) {
            console.error('❌ Carte non trouvée pour safeId:', safeId);
            console.error('   Toutes les cartes présentes:', document.querySelectorAll('.library-image-card'));
            return;
        }

        const indicator = card.querySelector(`.selected-indicator-${safeId}`);
        if (!indicator) {
            console.error('❌ Indicateur non trouvé pour safeId:', safeId);
            console.error('   Contenu de la carte:', card.innerHTML);
            return;
        }

        // Vérifier si l'image est déjà sélectionnée
        const index = this.selectedLibraryImagesForEdit.findIndex(img => img.url === url);
        console.log('🔍 Index de l\'image dans le tableau:', index);

        if (index > -1) {
            // Désélectionner
            this.selectedLibraryImagesForEdit.splice(index, 1);
            indicator.classList.add('hidden');
            card.classList.remove('ring-2', 'ring-blue-500');
            console.log(`🔽 Image désélectionnée. Total: ${this.selectedLibraryImagesForEdit.length}`);
        } else {
            // Sélectionner
            const decodedFilename = decodeURIComponent(filename);
            this.selectedLibraryImagesForEdit.push({ url, filename: decodedFilename });
            indicator.classList.remove('hidden');
            card.classList.add('ring-2', 'ring-blue-500');
            console.log(`🔼 Image sélectionnée: ${decodedFilename}. Total: ${this.selectedLibraryImagesForEdit.length}`);
        }

        console.log('📋 Images sélectionnées actuellement:', this.selectedLibraryImagesForEdit.map(img => img.filename));
        console.log('🔍 [toggleLibraryImageSelectionForEdit] FIN');
    }

    confirmLibrarySelectionForEdit() {
        console.log("🔍 ========== DÉBUT confirmLibrarySelectionForEdit ==========");
        console.log("🔍 this:", this);
        console.log("🔍 Type de selectedLibraryImagesForEdit:", typeof this.selectedLibraryImagesForEdit);
        console.log("🔍 Est un tableau?", Array.isArray(this.selectedLibraryImagesForEdit));
        console.log("🔍 Contenu selectedLibraryImagesForEdit:", JSON.stringify(this.selectedLibraryImagesForEdit, null, 2));
        console.log("🔍 Longueur:", this.selectedLibraryImagesForEdit ? this.selectedLibraryImagesForEdit.length : 'undefined');

        // Vérifier toutes les cartes sélectionnées dans le DOM
        const selectedCardsInDOM = document.querySelectorAll('.library-image-card.ring-2.ring-blue-500');
        console.log("🔍 Cartes sélectionnées dans le DOM:", selectedCardsInDOM.length);
        selectedCardsInDOM.forEach((card, i) => {
            console.log(`   Carte ${i + 1}:`, card.dataset.url, card.dataset.filename);
        });

        if (!this.selectedLibraryImagesForEdit) {
            console.error("❌ selectedLibraryImagesForEdit est null ou undefined");
            alert("Erreur: le tableau de sélection n'existe pas. Vérifiez la console.");
            return;
        }

        if (this.selectedLibraryImagesForEdit.length === 0) {
            console.warn("⚠️ selectedLibraryImagesForEdit est vide (longueur: 0)");
            console.warn("   Mais", selectedCardsInDOM.length, "cartes semblent sélectionnées dans le DOM");
            alert("Veuillez sélectionner au moins une image");
            return;
        }

        console.log(`✅ ${this.selectedLibraryImagesForEdit.length} image(s) à ajouter`);
        console.log("🔍 currentItem:", this.currentItem);
        console.log("🔍 currentItem.images AVANT:", this.currentItem.images);

        // Initialiser le tableau d'images si nécessaire
        if (!this.currentItem.images) {
            console.log("⚠️ currentItem.images n'existe pas, initialisation...");
            this.currentItem.images = [];
        }

        // Ajouter les images sélectionnées
        this.selectedLibraryImagesForEdit.forEach((image, index) => {
            console.log("🔍 Ajout image", index + 1, "/", this.selectedLibraryImagesForEdit.length, ":", image);
            const newImage = {
                url: image.url,
                type: null,
                thumbnailUrl: null
            };
            console.log("🔍 Nouvelle image créée:", newImage);
            this.currentItem.images.push(newImage);
            console.log("🔍 currentItem.images après ajout:", this.currentItem.images.length, "image(s)");
        });

        console.log("🖼️ Images ajoutées, total:", this.currentItem.images.length);
        console.log("🔍 currentItem.images APRÈS:", JSON.stringify(this.currentItem.images, null, 2));

        // Re-render la galerie d'images
        const imagesGallery = document.getElementById('edit-images-gallery');
        console.log("🔍 Élément edit-images-gallery trouvé?", !!imagesGallery);
        if (imagesGallery) {
            console.log("🔍 Re-render de la galerie d'images...");
            imagesGallery.innerHTML = this.renderEditImagesGallery();
            console.log("✅ Galerie d'images re-rendue");
        } else {
            console.warn("⚠️ Élément edit-images-gallery non trouvé, impossible de re-render");
        }

        // Réinitialiser la sélection
        console.log("🔍 Réinitialisation de selectedLibraryImagesForEdit...");
        this.selectedLibraryImagesForEdit = [];
        console.log("✅ selectedLibraryImagesForEdit réinitialisé:", this.selectedLibraryImagesForEdit);

        // Fermer la modale
        console.log("🔍 Fermeture de la modale...");
        this.closeLibrarySelection();

        console.log("✅ Images ajoutées depuis la bibliothèque");
        console.log("🔍 ========== FIN confirmLibrarySelectionForEdit ==========");
    }

    closeLibrarySelection() {
        const modal = document.getElementById('library-selection-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.selectedLibraryImagesForEdit = [];
    }

    toggleEvenementsTable() {
        const tableContainer = document.getElementById('evenements-table-container');
        const toggleIcon = document.getElementById('evenements-toggle-icon');

        if (tableContainer && toggleIcon) {
            tableContainer.classList.toggle('hidden');

            if (tableContainer.classList.contains('hidden')) {
                toggleIcon.className = 'fas fa-chevron-right mr-2';
            } else {
                toggleIcon.className = 'fas fa-chevron-down mr-2';
            }
        }
    }

    renderPersonnagesTabRead() {
        const personnagesContent = document.getElementById('personnages-content');
        if (!personnagesContent) return;

        // Récupérer les IDs des personnages associés
        const associatedCharacterIds = this.currentItem.associatedCharacters || [];

        if (!window.charactersManager || !window.charactersManager.characters) {
            personnagesContent.innerHTML = '<p class="text-gray-400 italic text-sm">Aucun personnage disponible</p>';
            return;
        }

        // Filtrer les personnages associés à ce lieu/région
        const activeMapId = window.settingsManager?.activeMapUrl;
        const associatedCharacters = window.charactersManager.characters.filter(char => {
            const isAssociated = associatedCharacterIds.includes(char.id);
            const isOnCurrentMap = !char.mapId || !activeMapId || char.mapId === activeMapId;
            return isAssociated && isOnCurrentMap;
        });

        if (associatedCharacters.length === 0) {
            personnagesContent.innerHTML = '<p class="text-gray-400 italic text-sm">Aucun personnage associé à ce lieu</p>';
            return;
        }

        const html = associatedCharacters.map(character => {
            const thumbnailImage = character.images?.find(img => img.type === 'vignette');
            return `
                <div class="character-card-infobox bg-gray-700 hover:bg-gray-600 rounded-lg p-3 mb-3 cursor-pointer transition-colors"
                     onclick="window.infoBoxManager.showCharacterFromLocation('${character.id}')">
                    <div class="flex items-center space-x-3">
                        ${thumbnailImage ? `
                            <img src="${thumbnailImage.url}" alt="${character.name}"
                                 class="w-12 h-12 rounded-full object-cover border-2 ${character.type === 'PJ' ? 'border-blue-500' : 'border-green-500'}">
                        ` : `
                            <div class="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center border-2 ${character.type === 'PJ' ? 'border-blue-500' : 'border-green-500'}">
                                <i class="fas fa-user text-gray-400"></i>
                            </div>
                        `}
                        <div class="flex-1">
                            <div class="font-semibold text-white">${character.name}</div>
                            <span class="inline-block px-2 py-0.5 text-xs rounded ${character.type === 'PJ' ? 'bg-blue-600' : 'bg-green-600'} text-white">
                                ${character.type || 'PNJ'}
                            </span>
                        </div>
                        <i class="fas fa-chevron-right text-gray-400"></i>
                    </div>
                </div>
            `;
        }).join('');

        personnagesContent.innerHTML = html;
    }

    renderLieuxRegionsTabRead() {
        console.log(`🗺️ [renderLieuxRegionsTabRead] ========== DÉBUT DU RENDU ==========`);

        const lieuxRegionsTab = document.getElementById('lieux-regions-tab');
        if (!lieuxRegionsTab) {
            console.error(`❌ [renderLieuxRegionsTabRead] Onglet lieux-regions-tab NON TROUVÉ !`);
            return;
        }

        console.log(`✅ [renderLieuxRegionsTabRead] Onglet lieux-regions-tab trouvé`);

        lieuxRegionsTab.innerHTML = '';

        const character = this.currentItem;
        console.log(`🗺️ [renderLieuxRegionsTabRead] Personnage complet:`, character);

        const associatedLocationIds = character.associatedLocations || [];
        const associatedRegionIds = character.associatedRegions || [];

        console.log(`🗺️ [renderLieuxRegionsTabRead] Rendu pour personnage "${character.name}"`);
        console.log(`🗺️ [renderLieuxRegionsTabRead] associatedLocationIds:`, associatedLocationIds);
        console.log(`🗺️ [renderLieuxRegionsTabRead] associatedRegionIds:`, associatedRegionIds);
        console.log(`🗺️ [renderLieuxRegionsTabRead] Type de associatedLocationIds:`, typeof associatedLocationIds, Array.isArray(associatedLocationIds));

        // Récupérer les lieux associés
        const locationsData = window.locationsData || { locations: [] };
        const associatedLocations = (locationsData.locations || []).filter(loc =>
            associatedLocationIds.includes(String(loc.id))
        );

        // Récupérer les régions associées
        const regionsData = window.regionsData || { regions: [] };
        const associatedRegions = (regionsData.regions || []).filter(reg =>
            associatedRegionIds.includes(String(reg.id))
        );

        console.log(`🗺️ [renderLieuxRegionsTabRead] ${associatedLocations.length} lieux associés trouvés`);
        console.log(`🗺️ [renderLieuxRegionsTabRead] ${associatedRegions.length} régions associées trouvées`);

        if (associatedLocations.length === 0 && associatedRegions.length === 0) {
            lieuxRegionsTab.innerHTML = '<p class="text-gray-500 p-4 italic" style="color: #6b7280 !important;">Aucun lieu ou région associé à ce personnage.</p>';
            return;
        }

        let html = '<div class="p-4 space-y-6">';

        // Section Lieux
        if (associatedLocations.length > 0) {
            html += `
                <div>
                    <h3 class="text-lg font-semibold mb-3 flex items-center" style="color: #940000 !important; font-family: 'Merriweather', serif;">
                        <i class="fas fa-map-marker-alt mr-2" style="color: #940000 !important;"></i>
                        Lieux associés
                    </h3>
                    <div class="space-y-2">
                        ${associatedLocations.map(location => {
                            const thumbnailImage = location.images?.find(img => img.type === 'vignette');
                            return `
                                <div class="location-card-compact bg-white rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                                     onclick="window.infoBoxManager.showLocationFromCharacter('${location.id}')"
                                     style="background-color: white !important;">
                                    <div class="flex items-center space-x-3">
                                        ${thumbnailImage ? `
                                            <img src="${thumbnailImage.url}" alt="${location.name}"
                                                 class="w-10 h-10 rounded-full object-cover border-2"
                                                 style="border-color: #940000 !important;">
                                        ` : `
                                            <div class="w-10 h-10 rounded-full flex items-center justify-center border-2"
                                                 style="background-color: #940000 !important; border-color: #940000 !important;">
                                                <i class="fas fa-map-marker-alt text-sm" style="color: white !important;"></i>
                                            </div>
                                        `}
                                        <div class="flex-1">
                                            <h4 class="font-medium" style="color: black !important;">${location.name}</h4>
                                        </div>
                                        <i class="fas fa-chevron-right" style="color: #6b7280 !important;"></i>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // Section Régions
        if (associatedRegions.length > 0) {
            html += `
                <div>
                    <h3 class="text-lg font-semibold mb-3 flex items-center" style="color: #940000 !important; font-family: 'Merriweather', serif;">
                        <i class="fas fa-mountain mr-2" style="color: #940000 !important;"></i>
                        Régions associées
                    </h3>
                    <div class="space-y-2">
                        ${associatedRegions.map(region => {
                            const thumbnailImage = region.images?.find(img => img.type === 'vignette');
                            return `
                                <div class="region-card-compact bg-white rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                                     onclick="window.infoBoxManager.showRegionFromCharacter('${region.id}')"
                                     style="background-color: white !important;">
                                    <div class="flex items-center space-x-3">
                                        ${thumbnailImage ? `
                                            <img src="${thumbnailImage.url}" alt="${region.name}"
                                                 class="w-10 h-10 rounded-full object-cover border-2"
                                                 style="border-color: #940000 !important;">
                                        ` : `
                                            <div class="w-10 h-10 rounded-full flex items-center justify-center border-2"
                                                 style="background-color: #940000 !important; border-color: #940000 !important;">
                                                <i class="fas fa-mountain text-sm" style="color: white !important;"></i>
                                            </div>
                                        `}
                                        <div class="flex-1">
                                            <h4 class="font-medium" style="color: black !important;">${region.name}</h4>
                                        </div>
                                        <i class="fas fa-chevron-right" style="color: #6b7280 !important;"></i>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        lieuxRegionsTab.innerHTML = html;
        console.log(`🗺️ [renderLieuxRegionsTabRead] ========== FIN DU RENDU ==========`);
    }


    renderPersonnagesTabEdit() {
        const personnagesContent = document.getElementById('personnages-content');
        if (!personnagesContent) return;

        // Récupérer les IDs des personnages associés
        const associatedCharacterIds = this.currentItem.associatedCharacters || [];

        if (!window.charactersManager || !window.charactersManager.characters) {
            personnagesContent.innerHTML = '<p class="text-gray-400 italic text-sm">Aucun personnage disponible</p>';
            return;
        }

        // Filtrer les personnages de la carte active et trier par ordre alphabétique
        const activeMapId = window.settingsManager?.activeMapUrl;
        const availableCharacters = window.charactersManager.characters
            .filter(char => !char.mapId || !activeMapId || char.mapId === activeMapId)
            .sort((a, b) => a.name.localeCompare(b.name));

        if (availableCharacters.length === 0) {
            personnagesContent.innerHTML = '<p class="text-gray-400 italic text-sm">Aucun personnage disponible sur cette carte</p>';
            return;
        }

        const html = `
            <div class="space-y-2 mb-4">
                ${availableCharacters.map(character => {
                    const isAssociated = associatedCharacterIds.includes(character.id);
                    const thumbnailImage = character.images?.find(img => img.type === 'vignette');
                    return `
                        <label class="flex items-center space-x-3 p-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors">
                            <input type="checkbox"
                                   class="character-checkbox h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                   data-character-id="${character.id}"
                                   ${isAssociated ? 'checked' : ''}>
                            ${thumbnailImage ? `
                                <img src="${thumbnailImage.url}" alt="${character.name}"
                                     class="w-10 h-10 rounded-full object-cover border-2 ${character.type === 'PJ' ? 'border-blue-500' : 'border-green-500'}">
                            ` : `
                                <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center border-2 ${character.type === 'PJ' ? 'border-blue-500' : 'border-green-500'}">
                                    <i class="fas fa-user text-sm text-gray-400"></i>
                                </div>
                            `}
                            <div class="flex-1">
                                <div class="font-medium text-white text-sm">${character.name}</div>
                                <span class="inline-block px-2 py-0.5 text-xs rounded ${character.type === 'PJ' ? 'bg-blue-600' : 'bg-green-600'} text-white">
                                    ${character.type || 'PNJ'}
                                </span>
                            </div>
                        </label>
                    `;
                }).join('')}
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

        personnagesContent.innerHTML = html;
    }

    renderLieuxRegionsTabEdit() {
        const lieuxRegionsContent = document.getElementById('lieux-regions-content');
        if (!lieuxRegionsContent) return;

        // Récupérer les IDs des lieux/régions associés
        const associatedLocationRegionIds = this.currentItem.associatedLocations || this.currentItem.associatedRegions || [];

        if (!window.locationsManager && !window.regionsManager) {
            lieuxRegionsContent.innerHTML = '<p class="text-gray-400 italic text-sm">Gestionnaire de lieux/régions non disponible.</p>';
            return;
        }

        // Combiner les lieux et régions pour le filtrage
        const allLocations = window.locationsManager?.locationsData?.locations || [];
        const allRegions = window.regionsManager?.regionsData?.regions || [];
        const combinedItems = [...allLocations, ...allRegions];

        // Filtrer les lieux/régions de la carte active et trier par ordre alphabétique
        const activeMapId = window.settingsManager?.activeMapUrl;
        const availableItems = combinedItems
            .filter(item => !item.mapId || !activeMapId || item.mapId === activeMapId)
            .sort((a, b) => a.name.localeCompare(b.name));

        if (availableItems.length === 0) {
            lieuxRegionsContent.innerHTML = '<p class="text-gray-400 italic text-sm">Aucun lieu ou région disponible sur cette carte.</p>';
            return;
        }

        const html = `
            <div class="space-y-2 mb-4">
                ${availableItems.map(item => {
                    const isAssociated = associatedLocationRegionIds.includes(String(item.id));
                    const isRegion = item.hasOwnProperty('Tradition_Ancienne'); // Heuristic to determine if it's a region
                    const thumbnailImage = item.images?.find(img => img.type === 'vignette');
                    const itemType = isRegion ? 'Région' : 'Lieu';

                    return `
                        <label class="flex items-center space-x-3 p-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors">
                            <input type="checkbox"
                                   class="location-region-checkbox h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                   data-item-id="${item.id}"
                                   data-item-type="${isRegion ? 'region' : 'location'}"
                                   ${isAssociated ? 'checked' : ''}>
                            ${thumbnailImage ? `
                                <img src="${thumbnailImage.url}" alt="${item.name}"
                                     class="w-10 h-10 rounded-lg object-cover border-2 border-purple-500">
                            ` : `
                                <div class="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center border-2 border-purple-500">
                                    <i class="fas ${isRegion ? 'fa-map-marked-alt' : 'fa-map-marker-alt'} text-sm text-purple-400"></i>
                                </div>
                            `}
                            <div class="flex-1">
                                <div class="font-medium text-white text-sm">${item.name}</div>
                                <span class="inline-block px-2 py-0.5 text-xs rounded bg-purple-600 text-white">
                                    ${itemType}
                                </span>
                            </div>
                        </label>
                    `;
                }).join('')}
            </div>
            <div class="flex space-x-2">
                <button onclick="window.infoBoxManager.saveAssociatedCharactersForCharacter()" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                    <i class="fas fa-save mr-1"></i>Sauvegarder
                </button>
                <button onclick="window.infoBoxManager.exitEditMode()" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded">
                    <i class="fas fa-times mr-1"></i>Annuler
                </button>
            </div>
        `;

        lieuxRegionsContent.innerHTML = html;
    }


    showCharacterFromLocation(characterId) {
        if (!window.charactersManager) return;

        const character = window.charactersManager.characters.find(c => String(c.id) === String(characterId));
        if (!character) {
            console.warn(`Personnage non trouvé avec l'ID: ${characterId}`);
            return;
        }

        // Sauvegarder l'infobox actuelle avant d'afficher le personnage
        if (this.currentItem && this.currentType) {
            console.log("💾 Sauvegarde de l'infobox appelante:", this.currentItem.name, this.currentType);
            this.previousInfoBox = {
                item: this.currentItem,
                type: this.currentType,
                shouldShowPersonnagesTab: true, // Flag pour afficher l'onglet Personnages au retour
                fromInfoBox: true // Flag indiquant que l'appel vient d'une InfoBox
            };
        }

        // Créer un événement simulé pour le positionnement
        const fakeEvent = {
            clientX: window.innerWidth / 2,
            clientY: window.innerHeight / 2,
            type: 'click'
        };

        // Ouvrir la modale du personnage en surimpression
        if (window.infoBoxManager) {
            window.infoBoxManager.showInfoBox(fakeEvent, character, 'character');
        }
    }

    showLocationRegionFromCharacter(itemId, itemType) {
         if (!window.locationsManager && !window.regionsManager) {
            console.warn('Gestionnaire de lieux/régions non disponible.');
            return;
        }

        let item = null;
        if (itemType === 'location') {
            item = window.locationsManager?.locationsData?.locations.find(loc => String(loc.id) === String(itemId));
        } else if (itemType === 'region') {
            item = window.regionsManager?.regionsData?.regions.find(reg => String(reg.id) === String(itemId));
        }

        if (!item) {
            console.warn(`Lieu/Région non trouvé avec l'ID: ${itemId}, type: ${itemType}`);
            return;
        }

        // Sauvegarder l'infobox actuelle avant d'afficher le lieu/région
        if (this.currentItem && this.currentType) {
            console.log("💾 Sauvegarde de l'infobox appelante (personnage):", this.currentItem.name);
            this.previousInfoBox = {
                item: this.currentItem,
                type: this.currentType,
                // On ne veut pas forcer l'onglet "Personnages" au retour ici, mais plutôt l'onglet par défaut
            };
        }

        // Créer un événement simulé pour le positionnement
        const fakeEvent = {
            clientX: window.innerWidth / 2,
            clientY: window.innerHeight / 2,
            type: 'click'
        };

        // Ouvrir la modale du lieu/région
        if (window.infoBoxManager) {
            window.infoBoxManager.showInfoBox(fakeEvent, item, itemType);
        }
    }


    deleteItem() {
        if (!this.currentItem) return;

        const itemType = this.currentType === 'region' ? 'région' :
                        (this.currentType === 'character' ? 'personnage' : 'lieu');

        if (!confirm(`Êtes-vous sûr de vouloir supprimer ce ${itemType} ?`)) {
            return;
        }

        console.log(`🗑️ [DELETE] Début suppression de ${itemType}: ${this.currentItem.name}`);

        if (this.currentType === 'location') {
            const locationIndex = this.dataManager.locationsData.locations.findIndex(loc =>
                String(loc.id) === String(this.currentItem.id)
            );

            if (locationIndex !== -1) {
                console.log(`🗑️ [DELETE] Lieu trouvé à l'index ${locationIndex}, suppression...`);
                console.log(`🗑️ [DELETE] Nombre de lieux AVANT suppression: ${this.dataManager.locationsData.locations.length}`);

                // Supprimer le lieu
                this.dataManager.locationsData.locations.splice(locationIndex, 1);

                console.log(`🗑️ [DELETE] Nombre de lieux APRÈS suppression: ${this.dataManager.locationsData.locations.length}`);

                // Synchroniser avec la variable globale
                window.locationsData = this.dataManager.locationsData;

                // Sauvegarder localement (déclenchera aussi markAsUnsaved et scheduleAutoSync via DataManager)
                this.dataManager.saveLocationsToLocal();

                // Re-render
                if (typeof window.renderLocations === 'function') {
                    window.renderLocations();
                }

                console.log(`✅ [DELETE] Lieu supprimé: ${this.currentItem.name}`);
            } else {
                console.error(`❌ [DELETE] Lieu non trouvé pour suppression: ${this.currentItem.id}`);
            }
        } else if (this.currentType === 'region') {
            const regionIndex = this.dataManager.regionsData.regions.findIndex(reg =>
                String(reg.id) === String(this.currentItem.id)
            );

            if (regionIndex !== -1) {
                console.log(`🗑️ [DELETE] Région trouvée à l'index ${regionIndex}, suppression...`);
                console.log(`🗑️ [DELETE] Nombre de régions AVANT suppression: ${this.dataManager.regionsData.regions.length}`);

                // Supprimer la région
                this.dataManager.regionsData.regions.splice(regionIndex, 1);

                console.log(`🗑️ [DELETE] Nombre de régions APRÈS suppression: ${this.dataManager.regionsData.regions.length}`);

                // Synchroniser avec la variable globale
                window.regionsData = this.dataManager.regionsData;

                // Sauvegarder localement (déclenchera aussi markAsUnsaved et scheduleAutoSync via DataManager)
                this.dataManager.saveRegionsToLocal();

                // Re-render
                if (typeof renderRegions === 'function') {
                    renderRegions();
                }

                console.log(`✅ [DELETE] Région supprimée: ${this.currentItem.name}`);
            } else {
                console.error(`❌ [DELETE] Région non trouvée pour suppression: ${this.currentItem.id}`);
            }
        } else if (this.currentType === 'character') {
            if (window.charactersManager) {
                window.charactersManager.deleteCharacter(this.currentItem.id);
                console.log(`✅ [DELETE] Personnage supprimé: ${this.currentItem.name}`);
            }
        }

        this.hideInfoBox();
    }

    // Méthodes pour la gestion spécifique des éditions
    saveLocationEdit() {
        const location = this.dataManager.locationsData.locations.find(loc => loc.id === this.currentItem.id);
        if (!location) {
            console.error(`❌ Lieu non trouvé pour sauvegarde: ${this.currentItem.id}`);
            return;
        }

        location.name = document.getElementById('edit-name').value.trim();
        location.description = document.getElementById('edit-description').value.trim();
        // Récupérer la couleur du sélecteur (si existant)
        const colorPicker = document.querySelector('#edit-color-picker .color-swatch.selected');
        if (colorPicker) {
            location.color = colorPicker.dataset.color;
        }

        // Handle images - Assurez-vous que 'images' est géré correctement
        const imagesListElement = document.getElementById('edit-images-list');
        if (imagesListElement) {
            // Reconstruire l'array 'images' à partir du DOM ou de l'état actuel de this.currentItem.images
            // Ici, on suppose que this.currentItem.images a déjà été mis à jour par les méthodes addImage/removeImage
            if (this.currentItem.images && this.currentItem.images.length > 0) {
                location.images = this.currentItem.images;
            } else {
                delete location.images; // Supprimer la propriété si vide
            }
        }


        // IMPORTANT: Mettre à jour l'objet dans locationsData.locations
        const locationIndex = this.dataManager.locationsData.locations.findIndex(loc =>
            String(loc.id) === String(this.currentItem.id)
        );

        if (locationIndex !== -1) {
            this.dataManager.locationsData.locations[locationIndex] = location;
            console.log(`✅ Lieu mis à jour dans locationsData à l'index ${locationIndex}`);
        } else {
            console.error(`❌ Lieu non trouvé dans locationsData pour mise à jour directe: ${this.currentItem.id}`);
            // Optionnellement, ajouter le lieu s'il n'est pas trouvé (si c'est un nouvel ajout)
            // this.dataManager.locationsData.locations.push(location);
        }

        // Synchroniser avec window.locationsData
        window.locationsData = this.dataManager.locationsData;

        // Sauvegarder et re-render
        this.dataManager.saveLocationsToLocal();
        this.exitEditMode();
        if (typeof renderLocations === 'function') {
            renderLocations();
        }
    }

    saveRegionEdit() {
        const region = this.dataManager.regionsData.regions.find(reg => reg.id === this.currentItem.id);
        if (!region) {
            console.error(`❌ Région non trouvée pour sauvegarde: ${this.currentItem.id}`);
            return;
        }

        region.name = document.getElementById('edit-name').value.trim();
        region.description = document.getElementById('edit-description').value.trim();
        const rumeursText = document.getElementById('edit-rumeurs')?.value.trim();
        const traditionText = document.getElementById('edit-tradition')?.value.trim();

        if (rumeursText) {
            region.Rumeurs = rumeursText.split('\n').map(r => r.trim()).filter(r => r !== '');
            region.Rumeur = region.Rumeurs.join('\n\n---\n\n'); // Pour compatibilité
        } else {
            region.Rumeurs = [];
            region.Rumeur = '';
        }
        region.Tradition_Ancienne = traditionText;

        // Récupérer la couleur du sélecteur (si existant)
        const colorPicker = document.querySelector('#edit-color-picker .color-swatch.selected');
        if (colorPicker) {
            region.color = colorPicker.dataset.color;
        }

        // Handle images - Assurez-vous que 'images' est géré correctement
        const imagesListElement = document.getElementById('edit-images-list');
         if (imagesListElement) {
            if (this.currentItem.images && this.currentItem.images.length > 0) {
                region.images = this.currentItem.images;
            } else {
                delete region.images;
            }
        }

        // IMPORTANT: Mettre à jour l'objet dans regionsData.regions
        const regionIndex = this.dataManager.regionsData.regions.findIndex(reg =>
            String(reg.id) === String(this.currentItem.id)
        );

        if (regionIndex !== -1) {
            this.dataManager.regionsData.regions[regionIndex] = region;
            console.log(`✅ Région mise à jour dans regionsData à l'index ${regionIndex}`);
        } else {
            console.error(`❌ Région non trouvée dans regionsData pour mise à jour directe: ${this.currentItem.id}`);
        }

        // Synchroniser avec window.regionsData
        window.regionsData = this.dataManager.regionsData;

        // Sauvegarder et re-render
        this.dataManager.saveRegionsToLocal();
        this.exitEditMode();
        if (typeof renderRegions === 'function') {
            renderRegions();
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log("📤 Uploading image...");

        if (window.uploadManager) {
            window.uploadManager.uploadImage(file, 'locations')
                .then(result => {
                    if (result.success) {
                        const location = this.dataManager.locationsData.locations.find(loc => loc.id === this.currentItem.id);
                        if (!location) {
                             console.error(`❌ Lieu non trouvé pour ajout d'image: ${this.currentItem.id}`);
                            return;
                        }

                        if (!location.images) {
                            location.images = [];
                        }

                        location.images.push({
                            url: result.url,
                            type: location.images.length === 0 ? 'principale' : null, // Définir comme principale si c'est la première
                            thumbnailUrl: null
                        });

                        // IMPORTANT: Mettre à jour l'objet dans locationsData.locations
                        const locationIndex = this.dataManager.locationsData.locations.findIndex(loc =>
                            String(loc.id) === String(this.currentItem.id)
                        );

                        if (locationIndex !== -1) {
                            this.dataManager.locationsData.locations[locationIndex] = location;
                            console.log(`✅ Lieu mis à jour dans locationsData à l'index ${locationIndex}`);
                        }

                        // Synchroniser avec window.locationsData
                        window.locationsData = this.dataManager.locationsData;

                        this.dataManager.saveLocationsToLocal();
                        // Re-render la liste des images dans l'onglet d'édition
                        const imagesList = document.getElementById('edit-images-list');
                        if(imagesList) {
                            imagesList.innerHTML = this.renderEditImagesList();
                        }
                        console.log("✅ Image added successfully");
                    }
                })
                .catch(error => {
                    console.error("❌ Image upload failed:", error);
                    alert("Erreur lors de l'upload de l'image");
                });
        }
    }

    handleRegionImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log("📤 Uploading region image...");

        if (window.uploadManager) {
            window.uploadManager.uploadImage(file, 'regions')
                .then(result => {
                    if (result.success) {
                        const region = this.dataManager.regionsData.regions.find(reg => reg.id === this.currentItem.id);
                        if (!region) {
                            console.error(`❌ Région non trouvée pour ajout d'image: ${this.currentItem.id}`);
                            return;
                        }

                        if (!region.images) {
                            region.images = [];
                        }

                        region.images.push({
                            url: result.url,
                            type: region.images.length === 0 ? 'principale' : null, // Définir comme principale si c'est la première
                            thumbnailUrl: null
                        });

                        // IMPORTANT: Mettre à jour l'objet dans regionsData.regions
                        const regionIndex = this.dataManager.regionsData.regions.findIndex(reg =>
                            String(reg.id) === String(this.currentItem.id)
                        );

                        if (regionIndex !== -1) {
                            this.dataManager.regionsData.regions[regionIndex] = region;
                            console.log(`✅ Région mise à jour dans regionsData à l'index ${regionIndex}`);
                        }

                        // Synchroniser avec window.regionsData
                        window.regionsData = this.dataManager.regionsData;

                        this.dataManager.saveRegionsToLocal();
                        // Re-render la liste des images dans l'onglet d'édition
                        const imagesList = document.getElementById('edit-images-list');
                        if(imagesList) {
                            imagesList.innerHTML = this.renderEditImagesList();
                        }
                        console.log("✅ Region image added successfully");
                    }
                })
                .catch(error => {
                    console.error("❌ Region image upload failed:", error);
                    alert("Erreur lors de l'upload de l'image");
                });
        }
    }

    // Méthode placeholder pour updateImageTabForLocationEdit (à implémenter si nécessaire)
    updateImageTabForLocationEdit(location) {
        console.log("Placeholder: updateImageTabForLocationEdit called for", location.name);
        // Logique pour mettre à jour l'affichage de l'onglet image dans le mode édition
        const imagesList = document.getElementById('edit-images-list');
        if (imagesList) {
            imagesList.innerHTML = this.renderEditImagesList();
        }
    }

    // Méthode placeholder pour updateImageTabForRegionEdit (à implémenter si nécessaire)
    updateImageTabForRegionEdit(region) {
        console.log("Placeholder: updateImageTabForRegionEdit called for", region.name);
         // Logique pour mettre à jour l'affichage de l'onglet image dans le mode édition
        const imagesList = document.getElementById('edit-images-list');
        if (imagesList) {
            imagesList.innerHTML = this.renderEditImagesList();
        }
    }

    // Fonctions pour la gestion des associations lieu/région-personnage
    saveAssociatedCharacters() {
        if (!this.currentEntity || this.currentEntityType !== 'location') {
            console.warn('Tentative de sauvegarde de personnages pour une entité non-lieu');
            return;
        }

        const checkboxes = document.querySelectorAll('.character-checkbox');
        const selectedCharacterIds = [];

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedCharacterIds.push(checkbox.dataset.characterId);
            }
        });

        console.log(`💾 Sauvegarde de ${selectedCharacterIds.length} personnages pour le lieu ${this.currentEntity.name}`);

        // Mettre à jour l'entité actuelle (lieu)
        this.currentEntity.associatedCharacters = selectedCharacterIds;

        // NOUVEAU : Mise à jour bidirectionnelle - mettre à jour les personnages également
        if (window.charactersManager) {
            const locationId = this.currentEntity.id;

            // Pour chaque personnage, vérifier s'il doit être associé ou dissocié de ce lieu
            window.charactersManager.characters.forEach(character => {
                const isSelected = selectedCharacterIds.includes(String(character.id));

                // Initialiser associatedLocations si nécessaire
                if (!character.associatedLocations) {
                    character.associatedLocations = [];
                }

                const isAlreadyAssociated = character.associatedLocations.includes(String(locationId));

                if (isSelected && !isAlreadyAssociated) {
                    // Ajouter le lieu au personnage
                    character.associatedLocations.push(String(locationId));
                    console.log(`✅ Personnage ${character.name} associé au lieu ${this.currentEntity.name}`);
                } else if (!isSelected && isAlreadyAssociated) {
                    // Retirer le lieu du personnage
                    character.associatedLocations = character.associatedLocations.filter(
                        locId => String(locId) !== String(locationId)
                    );
                    console.log(`❌ Personnage ${character.name} dissocié du lieu ${this.currentEntity.name}`);
                }
            });

            // Sauvegarder les personnages
            window.charactersManager.saveCharactersToLocal();
        }

        // Sauvegarder via le DataManager
        if (window.dataManager) {
            window.dataManager.saveLocationsToLocal();
        }

        // Rafraîchir l'affichage
        this.renderPersonnagesTab();
    }


    saveAssociatedCharactersForRegion() {
        if (!this.currentEntity || this.currentEntityType !== 'region') {
            console.warn('Tentative de sauvegarde de personnages pour une entité non-région');
            return;
        }

        const checkboxes = document.querySelectorAll('.character-checkbox');
        const selectedCharacterIds = [];

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedCharacterIds.push(checkbox.dataset.characterId);
            }
        });

        console.log(`💾 Sauvegarde de ${selectedCharacterIds.length} personnages pour la région ${this.currentEntity.name}`);

        // Mettre à jour l'entité actuelle (région)
        this.currentEntity.associatedCharacters = selectedCharacterIds;

        // NOUVEAU : Mise à jour bidirectionnelle - mettre à jour les personnages également
        if (window.charactersManager) {
            const regionId = this.currentEntity.id;

            // Pour chaque personnage, vérifier s'il doit être associé ou dissocié de cette région
            window.charactersManager.characters.forEach(character => {
                const isSelected = selectedCharacterIds.includes(String(character.id));

                // Initialiser associatedRegions si nécessaire
                if (!character.associatedRegions) {
                    character.associatedRegions = [];
                }

                const isAlreadyAssociated = character.associatedRegions.includes(String(regionId));

                if (isSelected && !isAlreadyAssociated) {
                    // Ajouter la région au personnage
                    character.associatedRegions.push(String(regionId));
                    console.log(`✅ Personnage ${character.name} associé à la région ${this.currentEntity.name}`);
                } else if (!isSelected && isAlreadyAssociated) {
                    // Retirer la région du personnage
                    character.associatedRegions = character.associatedRegions.filter(
                        regId => String(regId) !== String(regionId)
                    );
                    console.log(`❌ Personnage ${character.name} dissocié de la région ${this.currentEntity.name}`);
                }
            });

            // Sauvegarder les personnages
            window.charactersManager.saveCharactersToLocal();
        }

        // Sauvegarder via le DataManager
        if (window.dataManager) {
            window.dataManager.saveRegionsToLocal();
        }

        // Rafraîchir l'affichage
        this.renderPersonnagesTabForRegion();
    }

    saveAssociatedCharactersForCharacter() {
        if (!this.currentEntity || this.currentEntityType !== 'character') {
            console.warn('Tentative de sauvegarde de lieux/régions pour une entité non-personnage');
            return;
        }

        const checkboxes = document.querySelectorAll('.location-region-checkbox');
        const associatedLocations = [];
        const associatedRegions = [];

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const itemId = String(checkbox.dataset.itemId);
                const itemType = checkbox.dataset.itemType;
                if (itemType === 'location') {
                    associatedLocations.push(itemId);
                } else if (itemType === 'region') {
                    associatedRegions.push(itemId);
                }
            }
        });

        console.log(`💾 Sauvegarde de ${associatedLocations.length} lieux et ${associatedRegions.length} régions pour le personnage ${this.currentEntity.name}`);

        // Mettre à jour l'entité actuelle (personnage)
        this.currentEntity.associatedLocations = associatedLocations;
        this.currentEntity.associatedRegions = associatedRegions;

        // Mettre à jour bidirectionnelle : mettre à jour les lieux et régions également
        if (window.locationsManager && window.locationsManager.locationsData && window.locationsManager.locationsData.locations) {
            const characterId = String(this.currentEntity.id);
            window.locationsManager.locationsData.locations.forEach(location => {
                const isAssociated = associatedLocations.includes(String(location.id));
                const characterManager = window.charactersManager; // Ensure charactersManager is available

                if (!location.associatedCharacters) {
                    location.associatedCharacters = [];
                }

                const isCurrentlyAssociated = location.associatedCharacters.includes(characterId);

                if (isAssociated && !isCurrentlyAssociated) {
                    location.associatedCharacters.push(characterId);
                    console.log(`✅ Lieu ${location.name} associé au personnage ${this.currentEntity.name}`);
                } else if (!isAssociated && isCurrentlyAssociated) {
                    location.associatedCharacters = location.associatedCharacters.filter(charId => String(charId) !== characterId);
                    console.log(`❌ Lieu ${location.name} dissocié du personnage ${this.currentEntity.name}`);
                }
            });
            window.locationsManager.saveLocationsToLocal();
        }

        if (window.regionsManager && window.regionsManager.regionsData && window.regionsManager.regionsData.regions) {
            const characterId = String(this.currentEntity.id);
            window.regionsManager.regionsData.regions.forEach(region => {
                const isAssociated = associatedRegions.includes(String(region.id));
                 const characterManager = window.charactersManager; // Ensure charactersManager is available

                if (!region.associatedCharacters) {
                    region.associatedCharacters = [];
                }

                const isCurrentlyAssociated = region.associatedCharacters.includes(characterId);

                if (isAssociated && !isCurrentlyAssociated) {
                    region.associatedCharacters.push(characterId);
                    console.log(`✅ Région ${region.name} associée au personnage ${this.currentEntity.name}`);
                } else if (!isAssociated && isCurrentlyAssociated) {
                    region.associatedCharacters = region.associatedCharacters.filter(charId => String(charId) !== characterId);
                    console.log(`❌ Région ${region.name} dissociée du personnage ${this.currentEntity.name}`);
                }
            });
             window.regionsManager.saveRegionsToLocal();
        }


        // Sauvegarder le personnage lui-même
        if (window.charactersManager) {
            window.charactersManager.updateCharacter(this.currentEntity.id, this.currentEntity);
        }

        // Rafraîchir l'affichage
        this.renderLieuxRegionsTabEdit();
    }
}

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InfoBoxManager;
}

// Export ES6 par défaut
export default InfoBoxManager;

console.log("📋 InfoBoxManager module loaded");