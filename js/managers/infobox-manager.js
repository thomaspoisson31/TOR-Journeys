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

        // Variable pour stocker le contexte de la journée actuelle (pour les tables aléatoires)
        this.currentDayContext = null;

        // Initialiser l'UploadManager
        this.uploadManager = new UploadManager();

        // Variable pour stocker les images sélectionnées dans la bibliothèque
        this.selectedLibraryImagesForEdit = [];
        this.currentLibraryFolder = null;
        this.currentLibraryPath = [];
        this.libraryFolders = {};
        this.libraryStructure = {};

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

        // --- Gestion du contexte de journée ---
        // Si l'événement provient d'une journée spécifique (ex: clic sur une carte de voyage)
        // et que l'élément lié est un lieu/région, stocker le contexte de journée.
        if (event && event.detail && event.detail.day && (type === 'location' || type === 'region')) {
            console.log("📅 Détection d'un contexte de journée:", event.detail.day);
            this.currentDayContext = event.detail.day;
        } else if (type === 'location' || type === 'region') {
            // Si on ouvre un lieu/région sans contexte de journée explicite, réinitialiser le contexte.
            // Cela garantit que les tirages aléatoires se font sans contexte si l'origine n'est pas une journée.
            console.log("📅 Réinitialisation du contexte de journée car l'origine n'est pas une journée.");
            this.currentDayContext = null;
        } else {
            // Pour les personnages ou si le contexte n'est pas pertinent, on le laisse tel quel ou on le réinitialise.
            // La logique exacte dépend de si on veut *perpétuer* un contexte de journée pour un personnage lié à une journée.
            // Pour l'instant, on le réinitialise pour les types non-lieu/région pour éviter des effets de bord.
             console.log("📅 Réinitialisation du contexte de journée car le type n'est pas lieu/région.");
            this.currentDayContext = null;
        }
        // -------------------------------------


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
                // Réinitialiser le contexte de journée lors de la fermeture complète
                this.currentDayContext = null;
                console.log("📅 Contexte de journée réinitialisé lors de la fermeture complète.");

                // Si on ferme une infobox de personnage et que la modale personnages existe, la rouvrir
                const charactersModal = document.getElementById('characters-modal');
                if (charactersModal && !charactersModal.classList.contains('hidden')) {
                    console.log("🔙 Retour à la modale Personnages de l'Aventure");
                    // La modale est déjà visible, pas besoin de la rouvrir
                }
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

        // Mettre à jour les couleurs des icônes selon le contenu
        this.updateTabIconColors();
    }

    updateTabIconColors() {
        if (!this.currentItem) {
            console.log('🎨 [updateTabIconColors] Aucun item actuel');
            return;
        }

        const item = this.currentItem;
        const redColor = '#940000';
        const defaultColor = '#666666';

        console.log('🎨 [updateTabIconColors] Début de mise à jour pour:', item.name);

        // Onglet Description (text)
        const textTabButton = document.querySelector('.tab-button[data-tab="text"]');
        if (textTabButton) {
            const hasDescription = item.description && item.description.trim() !== '';
            const icon = textTabButton.querySelector('i');
            console.log('🎨 [Description] hasDescription:', hasDescription, 'description:', item.description?.substring(0, 50));
            console.log('🎨 [Description] icon trouvée:', !!icon);
            if (icon) {
                const targetColor = hasDescription ? redColor : defaultColor;
                icon.style.setProperty('color', targetColor, 'important');
                console.log('🎨 [Description] Couleur appliquée avec !important:', targetColor);
            }
        } else {
            console.log('🎨 [Description] Bouton non trouvé');
        }

        // Onglet Images
        const imageTabButton = document.querySelector('.tab-button[data-tab="image"]');
        if (imageTabButton) {
            const hasImages = item.images && item.images.length > 0;
            const icon = imageTabButton.querySelector('i');
            console.log('🎨 [Images] hasImages:', hasImages, 'count:', item.images?.length || 0);
            console.log('🎨 [Images] icon trouvée:', !!icon);
            if (icon) {
                const targetColor = hasImages ? redColor : defaultColor;
                icon.style.setProperty('color', targetColor, 'important');
                console.log('🎨 [Images] Couleur appliquée avec !important:', targetColor);
            }
        } else {
            console.log('🎨 [Images] Bouton non trouvé');
        }

        // Onglet Rumeurs et Traditions
        const rumeursTabButton = document.querySelector('.tab-button[data-tab="rumeurs-traditions"]');
        if (rumeursTabButton) {
            const rumeurs = item.Rumeurs || (item.Rumeur ? [item.Rumeur] : []);
            const rumeursValides = rumeurs.filter(r => r && r !== "A definir");
            const hasTradition = item.Tradition_Ancienne && item.Tradition_Ancienne.trim() !== '';
            const hasContent = rumeursValides.length > 0 || hasTradition;
            const icon = rumeursTabButton.querySelector('i');
            console.log('🎨 [Rumeurs] rumeurs brutes:', item.Rumeurs, 'rumeur unique:', item.Rumeur);
            console.log('🎨 [Rumeurs] rumeursValides count:', rumeursValides.length);
            console.log('🎨 [Rumeurs] hasTradition:', hasTradition, 'tradition:', item.Tradition_Ancienne?.substring(0, 50));
            console.log('🎨 [Rumeurs] hasContent:', hasContent);
            console.log('🎨 [Rumeurs] icon trouvée:', !!icon);
            if (icon) {
                const targetColor = hasContent ? redColor : defaultColor;
                icon.style.setProperty('color', targetColor, 'important');
                console.log('🎨 [Rumeurs] Couleur appliquée avec !important:', targetColor);
            }
        } else {
            console.log('🎨 [Rumeurs] Bouton non trouvé');
        }

        // Onglet Personnages (pour lieux et régions)
        const personnagesTabButton = document.querySelector('.tab-button[data-tab="personnages"]');
        if (personnagesTabButton && (this.currentType === 'location' || this.currentType === 'region')) {
            // Compter les personnages qui référencent ce lieu/région
            let hasPersonnages = false;
            let personnagesCount = 0;

            if (window.charactersManager && window.charactersManager.characters) {
                const itemId = String(item.id);
                const propertyName = this.currentType === 'location' ? 'associatedLocations' : 'associatedRegions';

                personnagesCount = window.charactersManager.characters.filter(char => {
                    const associations = char[propertyName] || [];
                    return associations.some(id => String(id) === itemId);
                }).length;

                hasPersonnages = personnagesCount > 0;
            }

            const icon = personnagesTabButton.querySelector('i');
            console.log('🎨 [Personnages] hasPersonnages:', hasPersonnages, 'count:', personnagesCount);
            console.log('🎨 [Personnages] icon trouvée:', !!icon);
            if (icon) {
                const targetColor = hasPersonnages ? redColor : defaultColor;
                icon.style.setProperty('color', targetColor, 'important');
                console.log('🎨 [Personnages] Couleur appliquée avec !important:', targetColor);
            }
        } else if (!personnagesTabButton) {
            console.log('🎨 [Personnages] Bouton non trouvé');
        } else {
            console.log('🎨 [Personnages] Type non compatible:', this.currentType);
        }

        // Onglet Lieux/Régions (pour personnages)
        const lieuxRegionsTabButton = document.querySelector('.tab-button[data-tab="lieux-regions"]');
        if (lieuxRegionsTabButton && this.currentType === 'character') {
            const hasLieuxRegions = (item.associatedLocations && item.associatedLocations.length > 0) ||
                                    (item.associatedRegions && item.associatedRegions.length > 0);
            const icon = lieuxRegionsTabButton.querySelector('i');
            console.log('🎨 [Lieux/Régions] hasLieuxRegions:', hasLieuxRegions);
            console.log('🎨 [Lieux/Régions] locations count:', item.associatedLocations?.length || 0);
            console.log('🎨 [Lieux/Régions] regions count:', item.associatedRegions?.length || 0);
            console.log('🎨 [Lieux/Régions] icon trouvée:', !!icon);
            if (icon) {
                const targetColor = hasLieuxRegions ? redColor : defaultColor;
                icon.style.setProperty('color', targetColor, 'important');
                console.log('🎨 [Lieux/Régions] Couleur appliquée avec !important:', targetColor);
            }
        } else if (!lieuxRegionsTabButton) {
            console.log('🎨 [Lieux/Régions] Bouton non trouvé');
        } else {
            console.log('🎨 [Lieux/Régions] Type non compatible:', this.currentType);
        }

        // Onglet Tables Aléatoires (événements-voyage)
        const evenementsTabButton = document.querySelector('.tab-button[data-tab="evenements-voyage"]');
        if (evenementsTabButton) {
            const hasTables = item.RandomTables && item.RandomTables.length > 0;
            const icon = evenementsTabButton.querySelector('i');
            console.log('🎨 [Tables Aléatoires] hasTables:', hasTables, 'count:', item.RandomTables?.length || 0);
            console.log('🎨 [Tables Aléatoires] icon trouvée:', !!icon);
            if (icon) {
                const targetColor = hasTables ? redColor : defaultColor;
                icon.style.setProperty('color', targetColor, 'important');
                console.log('🎨 [Tables Aléatoires] Couleur appliquée avec !important:', targetColor);
            }
        } else {
            console.log('🎨 [Tables Aléatoires] Bouton non trouvé');
        }

        console.log('🎨 [updateTabIconColors] Fin de mise à jour');
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
                            this.setupFullscreenImageListeners(); // Appel pour initialiser le zoom
                        });
                    });

                    // Fermeture de l'overlay
                    if (fullscreenOverlay) {
                        fullscreenOverlay.addEventListener('click', () => {
                            fullscreenOverlay.classList.add('hidden');
                            // Réinitialiser le zoom lors de la fermeture
                            this.resetZoomForFullscreen();
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

            // Section Description
            let descriptionHTML = `
                <h3>Description</h3>
                <div class="prose prose-invert mb-6">${this.renderMarkdown(item.description || 'Aucune description disponible.')}</div>
            `;

            // Section Type de région (uniquement pour les régions)
            let regionTypeHTML = '';
            if (type === 'region') {
                const regionType = item.regionType || null;
                const regionTypes = window.constants?.regionTypes || {};

                if (regionType && regionTypes[regionType]) {
                    const typeInfo = regionTypes[regionType];
                    regionTypeHTML = `
                        <h3>Type de région</h3>
                        <div class="mb-6">
                            <div class="inline-flex items-center space-x-2 px-3 py-2 rounded-lg border-2"
                                 style="background-color: ${typeInfo.bgColor}; border-color: ${typeInfo.color};">
                                <div class="w-4 h-4 rounded-full" style="background-color: ${typeInfo.color};"></div>
                                <span style="color: ${typeInfo.color}; font-weight: 600;">${typeInfo.name}</span>
                            </div>
                        </div>
                    `;
                } else {
                    regionTypeHTML = `
                        <h3>Type de région</h3>
                        <div class="mb-6">
                            <span class="text-gray-400 italic text-sm">Aucun type défini</span>
                        </div>
                    `;
                }
            }

            // Section Connaissance avec cases à cocher
            let knowledgeHTML = '<h3>Connaissance</h3><div class="flex flex-col space-y-2 mb-4">';

            if (type === 'character') {
                // Pour les personnages : Connu et Rencontré
                const isKnown = item.known || false;
                const isMet = item.met || false;

                knowledgeHTML += `
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" id="char-known-checkbox" ${isKnown ? 'checked' : ''}
                               onchange="window.infoBoxManager.toggleCharacterKnowledge('known', this.checked)"
                               class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                        <span>Connu</span>
                    </label>
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" id="char-met-checkbox" ${isMet ? 'checked' : ''}
                               onchange="window.infoBoxManager.toggleCharacterKnowledge('met', this.checked)"
                               class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                        <span>Rencontré</span>
                    </label>
                `;
            } else {
                // Pour les lieux/régions : Connue et Visitée
                const isKnown = item.known || false;
                const isVisited = item.visited || false;

                knowledgeHTML += `
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" id="location-known-checkbox" ${isKnown ? 'checked' : ''}
                               onchange="window.infoBoxManager.toggleLocationKnowledge('known', this.checked)"
                               class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                        <span>Connue</span>
                    </label>
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" id="location-visited-checkbox" ${isVisited ? 'checked' : ''}
                               onchange="window.infoBoxManager.toggleLocationKnowledge('visited', this.checked)"
                               class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                        <span>Visitée</span>
                    </label>
                `;
            }

            knowledgeHTML += '</div>';

            textView.innerHTML = descriptionHTML + regionTypeHTML + knowledgeHTML;
        }

        // Onglet Personnages (uniquement pour les lieux et régions)
        const personnagesTab = document.getElementById('personnages-tab');
        if (personnagesTab && (type === 'location' || type === 'region')) {
            this.renderPersonnagesTabRead();
        }

        // Onglet Lieux/Régions (uniquement pour les personnages)
        const lieuxRegionsTab = document.getElementById('lieux-regions-tab');
        if (lieuxRegionsTab && type === 'character') {
            if (typeof this.renderLieuxRegionsTabRead === 'function') {
                this.renderLieuxRegionsTabRead();
            } else {
                console.warn("⚠️ renderLieuxRegionsTabRead is not defined on InfoBoxManager");
                lieuxRegionsTab.innerHTML = '<div class="p-4 text-gray-400 italic">Informations sur les lieux non disponibles.</div>';
            }
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
            const rumeursSection = rumeursTab.querySelector('#rumeurs-section');
            const rumeursContent = rumeursTab.querySelector('#rumeurs-content');
            if (rumeursSection && rumeursContent) {
                // Normaliser les rumeurs en tableau
                const rumeurs = item.Rumeurs || (item.Rumeur ? [item.Rumeur] : []);
                const rumeursValides = rumeurs.filter(rumeur => rumeur && rumeur !== "A definir");

                // Mettre à jour le titre avec icône dé si plus d'une rumeur
                const titleElement = document.getElementById('rumeurs-title');
                if (titleElement) {
                    // Créer un conteneur flex pour le titre et le bouton
                    const titleContainer = document.createElement('div');
                    titleContainer.className = 'flex items-center mb-3';

                    const h3 = document.createElement('h3');
                    h3.textContent = 'Rumeurs';
                    h3.className = 'mb-0';
                    titleContainer.appendChild(h3);

                    if (rumeursValides.length > 1) {
                        const button = document.createElement('button');
                        button.onclick = () => window.infoBoxManager.rollRandomRumeur();
                        button.className = 'ml-2 text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-900 hover:bg-opacity-30';
                        button.title = 'Tirer une rumeur aléatoire';
                        button.style.color = '#3b82f6'; // Force la couleur en inline

                        const icon = document.createElement('i');
                        icon.className = 'fas fa-dice text-xl';
                        icon.style.color = '#3b82f6'; // Force la couleur en inline

                        button.appendChild(icon);
                        titleContainer.appendChild(button);
                    }

                    // Remplacer le h3 par le conteneur
                    titleElement.parentNode.replaceChild(titleContainer, titleElement);
                }

                let rumeursHTML = '';

                // Zone de résultat du tirage aléatoire (cachée par défaut)
                rumeursHTML += `
                    <div id="rumeur-random-result" class="hidden p-3 rounded-lg border border-gray-300 mb-4" style="background-color: #e8f4f8; border: 1px solid #3b82f6;">
                        <div class="text-sm font-semibold mb-2" style="color: #1e40af;">Rumeur tirée :</div>
                        <div id="rumeur-random-content" class="prose prose-invert" style="color: #1f2937;"></div>
                    </div>
                `;

                if (rumeursValides.length > 0) {
                    rumeursHTML += rumeursValides.map((rumeur, index) => `
                        <div class="mb-4 ${index > 0 ? 'pt-4 border-t border-yellow-600 border-opacity-30' : ''}">
                            <div class="prose prose-invert">${this.renderMarkdown(rumeur)}</div>
                        </div>
                    `).join('');
                } else {
                    rumeursHTML += '<div class="prose prose-invert text-gray-400 italic">Aucune rumeur disponible.</div>';
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

            const randomTables = item.RandomTables || [];

            if (randomTables.length > 0) {
                const tablesHTML = randomTables.map((table, tableIndex) => `
                    <div class="mb-4 p-3 rounded-lg border border-gray-300" style="background-color: #f5f5f5;">
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-semibold" style="color: #940000; font-family: 'Merriweather', serif;">${table.name || 'Table sans nom'}</span>
                            <button onclick="window.infoBoxManager.rollOnTable(${tableIndex})" class="text-blue-600 hover:text-blue-700 transition-colors" title="Tirer sur cette table">
                                <i class="fas fa-dice text-xl"></i>
                            </button>
                        </div>
                        <div class="text-xs" style="color: #6b7280;">${table.entries?.length || 0} entrée(s)</div>
                    </div>
                `).join('');

                evenementsTab.innerHTML = `
                    <div class="p-4 h-full overflow-y-auto" style="font-family: 'Merriweather', serif; background-color: white;">
                        ${tablesHTML}
                    </div>
                `;
            } else {
                evenementsTab.innerHTML = '<div class="p-4 text-gray-500 italic">Aucune table aléatoire</div>';
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
            // HTML pour la sélection du type de région (uniquement pour les régions)
            let regionTypeHTML = '';
            if (type === 'region') {
                const regionTypes = window.constants?.regionTypes || {};
                const currentType = item.regionType || '';

                const typeOptions = Object.keys(regionTypes).map(key => {
                    const typeInfo = regionTypes[key];
                    const isSelected = currentType === key;
                    return `
                        <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg border transition-all hover:bg-gray-700"
                               style="border-color: ${isSelected ? typeInfo.color : '#4b5563'}; background-color: ${isSelected ? typeInfo.bgColor : 'transparent'};">
                            <input type="radio" name="region-type" value="${key}" ${isSelected ? 'checked' : ''}
                                   class="w-4 h-4 cursor-pointer">
                            <div class="w-4 h-4 rounded-full" style="background-color: ${typeInfo.color};"></div>
                            <span class="text-white text-sm">${typeInfo.name}</span>
                        </label>
                    `;
                }).join('');

                regionTypeHTML = `
                    <div class="mb-3">
                        <label class="block text-sm font-medium mb-2 text-white">Type de région :</label>
                        <div class="space-y-2">
                            <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg border transition-all hover:bg-gray-700"
                                   style="border-color: #4b5563;">
                                <input type="radio" name="region-type" value="" ${!currentType ? 'checked' : ''}
                                       class="w-4 h-4 cursor-pointer">
                                <span class="text-gray-400 text-sm italic">Aucun type</span>
                            </label>
                            ${typeOptions}
                        </div>
                    </div>
                `;
            }

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
                    ${regionTypeHTML}

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

        // Onglet Rumeurs et Traditions (mode édition)
        const rumeursTab = document.getElementById('rumeurs-traditions-tab');
        if (rumeursTab) {
            // Préparer le tableau de rumeurs pour l'édition
            let rumeursArray = [];
            let currentTradition = item.Tradition_Ancienne || '';

            if (type === 'region') {
                // Pour les régions, on suppose que 'Rumeur' est une chaîne unique ou 'Rumeurs' un tableau
                const rumeurs = item.Rumeurs || (item.Rumeur ? [item.Rumeur] : []);
                rumeursArray = rumeurs.filter(r => r && r !== "A definir");
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
                    <div class="flex space-x-2 mb-3">
                        <button onclick="window.infoBoxManager.addRumeurInEdit()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm">
                            <i class="fas fa-plus mr-1"></i>Ajouter une rumeur
                        </button>
                        <button onclick="document.getElementById('import-rumeurs-json-input').click()" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm">
                            <i class="fas fa-file-import mr-1"></i>Importer JSON
                        </button>
                        <input type="file" id="import-rumeurs-json-input" accept=".json" class="hidden">
                    </div>
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

            // Setup event listener pour l'import de rumeurs JSON
            setTimeout(() => {
                const rumeursFileInput = document.getElementById('import-rumeurs-json-input');
                if (rumeursFileInput) {
                    rumeursFileInput.addEventListener('change', (e) => this.handleRumeursJsonImport(e));
                    console.log('✅ Event listener pour import JSON de rumeurs configuré');
                } else {
                    console.warn('⚠️ Input file pour import JSON de rumeurs non trouvé');
                }
            }, 100);
        }

        // Onglet Événements de voyage (mode édition)
        const evenementsTab = document.getElementById('evenements-voyage-tab');
        if (evenementsTab) {
            // Nettoyer complètement l'onglet
            evenementsTab.innerHTML = '';
            const editForm = document.createElement('div');
            editForm.className = 'edit-form';
            evenementsTab.appendChild(editForm);

            const randomTables = item.RandomTables || [];

            let tablesHTML = '';
            if (randomTables.length > 0) {
                tablesHTML = randomTables.map((table, index) => `
                    <div class="mb-4 p-3 rounded-lg border border-gray-300" style="background-color: #f5f5f5;">
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-semibold" style="color: #940000; font-family: 'Merriweather', serif;">${table.name || 'Table sans nom'}</span>
                            <button onclick="window.infoBoxManager.deleteRandomTable(${index})" class="text-red-600 hover:text-red-700">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="text-xs" style="color: #6b7280;">${table.entries?.length || 0} entrée(s)</div>
                    </div>
                `).join('');
            }

            editForm.innerHTML = `
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2 text-white">
                        Ajouter une table aléatoire :
                    </label>
                    <input type="file" id="new-random-table-input" accept=".json" class="mb-2 block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700">
                    <div class="text-xs text-gray-500 mb-3">Format JSON attendu</div>
                </div>

                <div id="tables-list" class="mb-4">
                    ${tablesHTML || '<div class="text-gray-500 text-sm italic">Aucune table</div>'}
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

            // Setup event listener pour l'import de fichier
            const fileInput = document.getElementById('new-random-table-input');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => this.handleNewRandomTableImport(e));
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
        circle.style.position = 'relative';

        // Ajouter le tooltip avec le mapID au survol
        if (item.mapId) {
            circle.title = `MapID: ${item.mapId}`;
            circle.style.cursor = 'help';
        } else {
            circle.title = 'Aucun mapID défini (compatible toutes cartes)';
            circle.style.cursor = 'help';
        }

        // Chercher la vignette dans les images
        let thumbnailImage = null;
        let thumbnailUrl = null;
        if (item.images && item.images.length > 0) {
            thumbnailImage = item.images.find(img => img.type === 'vignette');
            if (thumbnailImage) {
                thumbnailUrl = thumbnailImage.url; // Utiliser l'URL originale
            }
        }

        // Insérer le cercle au début du header, avant le titre
        const titleContainer = infoBoxHeader.querySelector('.flex.items-center.flex-grow');
        if (titleContainer) {
            titleContainer.insertBefore(circle, titleContainer.firstChild);
        }

        // Si une vignette existe, l'afficher avec les métadonnées de cadrage
        if (thumbnailUrl && thumbnailImage) {
            const img = document.createElement('img');
            img.src = thumbnailUrl;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.transformOrigin = 'center';
            img.style.transition = 'transform 0.1s ease-out';

            // Appliquer les métadonnées de cadrage si elles existent
            const crop = thumbnailImage.thumbnailCrop || { zoom: 1, offsetX: 0, offsetY: 0 };
            this.applyThumbnailTransform(img, crop);

            circle.appendChild(img);

            // Activer le mode inline seulement en mode édition
            if (this.isEditMode) {
                this.setupInlineThumbnailControls(circle, img, thumbnailImage);
            }
        }
    }

    applyThumbnailTransform(img, crop) {
        const zoom = crop.zoom || 1;
        const offsetX = crop.offsetX || 0;
        const offsetY = crop.offsetY || 0;
        img.style.transform = `scale(${zoom}) translate(${offsetX}%, ${offsetY}%)`;
    }

    setupInlineThumbnailControls(circle, img, thumbnailImage) {
        // Variables pour le drag
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let currentCrop = thumbnailImage.thumbnailCrop || { zoom: 1, offsetX: 0, offsetY: 0 };

        // Indicateur de mode édition
        const editIndicator = document.createElement('div');
        editIndicator.className = 'thumbnail-edit-indicator';
        editIndicator.innerHTML = '<i class="fas fa-expand-arrows-alt"></i>';
        editIndicator.style.cssText = `
            position: absolute;
            bottom: 2px;
            right: 2px;
            background: rgba(0,0,0,0.7);
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
            z-index: 10;
        `;
        circle.appendChild(editIndicator);

        // Afficher l'indicateur au survol
        circle.addEventListener('mouseenter', () => {
            editIndicator.style.opacity = '1';
            circle.style.cursor = 'move';
        });

        circle.addEventListener('mouseleave', () => {
            if (!isDragging) {
                editIndicator.style.opacity = '0';
                circle.style.cursor = 'default';
            }
        });

        // Zoom avec la molette
        circle.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            currentCrop.zoom = Math.max(0.5, Math.min(3, currentCrop.zoom + delta));

            this.applyThumbnailTransform(img, currentCrop);
            this.saveThumbnailCrop(thumbnailImage, currentCrop);
        });

        // Pan avec clic + drag
        circle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            circle.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = (e.clientX - startX) * 0.5; // Facteur de sensibilité
            const deltaY = (e.clientY - startY) * 0.5;

            currentCrop.offsetX = Math.max(-50, Math.min(50, currentCrop.offsetX + deltaX / 2));
            currentCrop.offsetY = Math.max(-50, Math.min(50, currentCrop.offsetY + deltaY / 2));

            startX = e.clientX;
            startY = e.clientY;

            this.applyThumbnailTransform(img, currentCrop);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                circle.style.cursor = 'move';
                this.saveThumbnailCrop(thumbnailImage, currentCrop);
            }
        });

        // Double-clic pour reset
        circle.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();

            currentCrop = { zoom: 1, offsetX: 0, offsetY: 0 };
            this.applyThumbnailTransform(img, currentCrop);
            this.saveThumbnailCrop(thumbnailImage, currentCrop);
        });
    }

    saveThumbnailCrop(thumbnailImage, crop) {
        // Mettre à jour l'objet image avec les métadonnées de cadrage
        thumbnailImage.thumbnailCrop = { ...crop };

        // Sauvegarder automatiquement
        if (this.currentType === 'location') {
            if (window.dataManager) {
                window.dataManager.saveLocationsToLocal();
            }
        } else if (this.currentType === 'region') {
            if (window.dataManager) {
                window.dataManager.saveRegionsToLocal();
            }
        } else if (this.currentType === 'character') {
            if (window.charactersManager) {
                window.charactersManager.saveCharactersToLocal();
            }
        }

        // Marquer comme non sauvegardé pour le cloud
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }

        console.log('📸 Thumbnail crop saved:', crop);
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

        // APPROCHE SÉCURISÉE : Forcer le mode lecture sans tout détruire
        setTimeout(() => {
            const personnagesTab = document.getElementById('personnages-tab');
            const lieuxRegionsTab = document.getElementById('lieux-regions-tab');

            if (this.currentType === 'location' || this.currentType === 'region') {
                console.log("🔄 [exitEditMode] Force mode lecture pour Personnages");

                if (personnagesTab) {
                    // 1. Cacher TOUS les formulaires d'édition
                    const editForms = personnagesTab.querySelectorAll('.edit-form');
                    editForms.forEach(form => {
                        form.style.display = 'none';
                        form.classList.add('hidden');
                    });

                    // 2. Afficher la vue lecture
                    const textView = personnagesTab.querySelector('.text-view');
                    if (textView) {
                        textView.style.display = 'block';
                        textView.classList.remove('hidden');
                    }

                    // 3. Re-render le contenu lecture
                    this.renderPersonnagesTabRead();
                }
            } else if (this.currentType === 'character') {
                console.log("🔄 [exitEditMode] Force mode lecture pour Lieux/Régions");

                if (lieuxRegionsTab) {
                    // Même logique pour lieux-régions
                    const editForms = lieuxRegionsTab.querySelectorAll('.edit-form');
                    editForms.forEach(form => {
                        form.style.display = 'none';
                        form.classList.add('hidden');
                    });

                    const textView = lieuxRegionsTab.querySelector('.text-view');
                    if (textView) {
                        textView.style.display = 'block';
                        textView.classList.remove('hidden');
                    }

                    this.renderLieuxRegionsTabRead();
                }
            }
        }, 10); // Timeout réduit mais conservé pour sécurité

        console.log("✅ [exitEditMode] Mode lecture activé");
    }

    addRumeurInEdit() {
        const rumeursList = document.getElementById('edit-rumeurs-list');
        if (!rumeursList) return;

        // Compter le nombre de rumeurs actuelles
        const currentRumeurs = rumeursList.querySelectorAll('.edit-rumeur-input');
        const newIndex = currentRumeurs.length;

        // Créer le HTML pour la nouvelle rumeur
        const newRumeurHTML = `
            <div class="flex items-start space-x-2 mb-2" data-rumeur-index="${newIndex}">
                <textarea rows="3" class="flex-1 p-2 border rounded bg-white text-black text-sm border-gray-600 edit-rumeur-input" data-index="${newIndex}" placeholder="Entrez une nouvelle rumeur..."></textarea>
                <button onclick="window.infoBoxManager.deleteRumeurInEdit(${newIndex})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded flex-shrink-0" title="Supprimer cette rumeur">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Supprimer le message "Aucune rumeur" s'il existe
        const noRumeursMsg = rumeursList.querySelector('.text-gray-400.italic');
        if (noRumeursMsg) {
            noRumeursMsg.remove();
        }

        // Ajouter la nouvelle rumeur
        rumeursList.insertAdjacentHTML('beforeend', newRumeurHTML);
    }

    deleteRumeurInEdit(index) {
        const rumeursList = document.getElementById('edit-rumeurs-list');
        if (!rumeursList) return;

        // Trouver et supprimer l'élément correspondant
        const rumeurElement = rumeursList.querySelector(`[data-rumeur-index="${index}"]`);
        if (rumeurElement) {
            rumeurElement.remove();

            // Réindexer les rumeurs restantes
            const remainingRumeurs = rumeursList.querySelectorAll('[data-rumeur-index]');
            remainingRumeurs.forEach((element, newIndex) => {
                element.setAttribute('data-rumeur-index', newIndex);
                const textarea = element.querySelector('textarea');
                const deleteBtn = element.querySelector('button');
                if (textarea) textarea.setAttribute('data-index', newIndex);
                if (deleteBtn) deleteBtn.setAttribute('onclick', `window.infoBoxManager.deleteRumeurInEdit(${newIndex})`);
            });

            // Si plus aucune rumeur, afficher le message
            if (remainingRumeurs.length === 0) {
                rumeursList.innerHTML = '<p class="text-gray-400 italic text-sm">Aucune rumeur. Cliquez sur "Ajouter une rumeur" ci-dessous.</p>';
            }
        }
    }

    handleRumeursJsonImport(event) {
        console.log('📥 [handleRumeursJsonImport] Import de rumeurs JSON déclenché');

        const file = event.target.files[0];
        if (!file) {
            console.warn('⚠️ [handleRumeursJsonImport] Aucun fichier sélectionné');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                console.log('✅ [handleRumeursJsonImport] JSON parsé:', jsonData);

                // Vérifier que c'est un tableau
                if (!Array.isArray(jsonData)) {
                    alert('Le fichier JSON doit contenir un tableau de rumeurs.');
                    return;
                }

                // Récupérer la liste de rumeurs actuelle
                const rumeursList = document.getElementById('edit-rumeurs-list');
                if (!rumeursList) {
                    console.error('❌ [handleRumeursJsonImport] Liste de rumeurs non trouvée');
                    return;
                }

                // Ajouter chaque rumeur du JSON
                jsonData.forEach((rumeur, index) => {
                    const currentIndex = rumeursList.children.length;
                    const rumeurDiv = document.createElement('div');
                    rumeurDiv.className = 'flex items-start space-x-2 mb-2';
                    rumeurDiv.setAttribute('data-rumeur-index', currentIndex);

                    // Extraire le texte de la rumeur
                    // Si c'est un objet avec une propriété "Description", l'extraire
                    // Sinon, si c'est une chaîne, l'utiliser directement
                    let rumeurText = '';
                    if (typeof rumeur === 'object' && rumeur !== null) {
                        // Chercher la propriété "Description" ou similaire
                        rumeurText = rumeur.Description || rumeur.description || rumeur.text || rumeur.content || JSON.stringify(rumeur);
                    } else if (typeof rumeur === 'string') {
                        rumeurText = rumeur;
                    } else {
                        rumeurText = String(rumeur);
                    }

                    rumeurDiv.innerHTML = `
                        <textarea rows="3" class="flex-1 p-2 border rounded bg-white text-black text-sm border-gray-600 edit-rumeur-input" data-index="${currentIndex}">${rumeurText}</textarea>
                        <button onclick="window.infoBoxManager.deleteRumeurInEdit(${currentIndex})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded flex-shrink-0" title="Supprimer cette rumeur">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;

                    rumeursList.appendChild(rumeurDiv);
                });

                console.log(`✅ [handleRumeursJsonImport] ${jsonData.length} rumeur(s) importée(s)`);
                alert(`${jsonData.length} rumeur(s) importée(s) avec succès !`);

            } catch (error) {
                console.error('❌ [handleRumeursJsonImport] Erreur lors du parsing JSON:', error);
                alert('Erreur lors de la lecture du fichier JSON. Vérifiez le format du fichier.');
            }
        };

        reader.readAsText(file);

        // Réinitialiser l'input pour permettre de réimporter le même fichier
        event.target.value = '';
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

        // Pour les régions: sauvegarder le type et synchroniser la couleur
        if (this.currentType === 'region') {
            const selectedType = document.querySelector('input[name="region-type"]:checked');
            if (selectedType) {
                const newType = selectedType.value || 'wild';
                this.currentItem.regionType = newType;
                // Synchroniser automatiquement la couleur selon le type
                if (window.constants?.getColorFromRegionType) {
                    this.currentItem.color = window.constants.getColorFromRegionType(newType);
                    console.log(`🎨 Couleur synchronisée pour région ${this.currentItem.name}: ${this.currentItem.color} (type: ${newType})`);
                }
            }
        }

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

        // Tradition ancienne (seulement pour lieux et régions)
        if (traditionTextarea && this.currentType !== 'character') {
            this.currentItem.Tradition_Ancienne = traditionTextarea.value.trim();
        }

        // RandomTables est déjà dans this.currentItem (modification directe)
        // Pas besoin de traitement supplémentaire

        // Personnages associés (pour lieux et régions uniquement)
        if (this.currentType === 'location' || this.currentType === 'region') {
            const checkboxes = document.querySelectorAll('.character-checkbox');

            // Log détaillé de CHAQUE checkbox pour debug
            console.log(`🔍 [SAVE] Analyse de ${checkboxes.length} checkbox(es):`);
            checkboxes.forEach((cb, index) => {
                console.log(`  Checkbox ${index}:`, {
                    checked: cb.checked,
                    value: cb.value,
                    dataCharacterId: cb.dataset.characterId,
                    className: cb.className
                });
            });

            // Récupérer les IDs des personnages cochés (normaliser en String)
            // IMPORTANT: Utiliser value maintenant qu'il est correctement défini
            const associatedCharacterIds = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => {
                    const id = String(cb.value || cb.dataset.characterId);
                    console.log(`    → ID récupéré pour checkbox cochée:`, id, `(value: ${cb.value}, data: ${cb.dataset.characterId})`);
                    return id;
                })
                .filter(id => id && id !== 'undefined' && id !== 'on'); // Filtrer les IDs invalides

            console.log(`🔍 [SAVE] AVANT update - ${this.currentType} "${this.currentItem.name}" (id: ${this.currentItem.id})`);
            console.log(`🔍 [SAVE] associatedCharacters AVANT:`, this.currentItem.associatedCharacters);
            console.log(`🔍 [SAVE] Nouvelles associations cochées (${associatedCharacterIds.length}):`, associatedCharacterIds);

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
            if (window.renderLocations) {
                window.renderLocations(); // Appel explicite à la fonction globale
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

        // Sortir du mode édition AVANT tout re-render
        this.exitEditMode();

        console.log("✅ [SAVE] Sauvegarde locale terminée - retour en mode lecture");

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
        const descField = document.getElementById('edit-description'); // Correction : utiliser descField

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

            if (descField) { // Utilisation de descField corrigée
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

    handleNewRandomTableImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);

                if (!Array.isArray(jsonData)) {
                    alert('Format invalide : le fichier doit contenir un tableau JSON');
                    return;
                }

                // Initialiser RandomTables si nécessaire
                if (!this.currentItem.RandomTables) {
                    this.currentItem.RandomTables = [];
                }

                // Ajouter la nouvelle table
                const tableName = file.name.replace(/\.json$/i, '');
                this.currentItem.RandomTables.push({
                    name: tableName,
                    entries: jsonData
                });

                console.log(`✅ Table "${tableName}" ajoutée avec ${jsonData.length} entrée(s)`);

                // Re-render le mode édition
                this.renderEditMode();

            } catch (error) {
                console.error('❌ Erreur lors de l\'import:', error);
                alert('Erreur lors de la lecture du fichier JSON: ' + error.message);
            }
        };
        reader.readAsText(file);

        // Reset le champ
        event.target.value = '';
    }

    deleteRandomTable(index) {
        if (!this.currentItem.RandomTables || index < 0 || index >= this.currentItem.RandomTables.length) {
            return;
        }

        const tableName = this.currentItem.RandomTables[index].name || 'cette table';
        if (!confirm(`Voulez-vous vraiment supprimer "${tableName}" ?`)) {
            return;
        }

        this.currentItem.RandomTables.splice(index, 1);
        console.log(`🗑️ Table "${tableName}" supprimée`);

        // Re-render le mode édition
        this.renderEditMode();
    }

    rollRandomRumeur() {
        if (!this.currentItem) return;

        const rumeurs = this.currentItem.Rumeurs || (this.currentItem.Rumeur ? [this.currentItem.Rumeur] : []);
        const rumeursValides = rumeurs.filter(rumeur => rumeur && rumeur !== "A definir");

        if (rumeursValides.length === 0) return;

        const randomIndex = Math.floor(Math.random() * rumeursValides.length);
        const rumeurTiree = rumeursValides[randomIndex];

        const resultDiv = document.getElementById('rumeur-random-result');
        const contentDiv = document.getElementById('rumeur-random-content');

        if (resultDiv && contentDiv) {
            // Générer un hash pour cette rumeur
            const resultHash = window.randomTablesManager ?
                window.randomTablesManager.generateResultHash(`${this.currentItem.name}::Rumeurs`, rumeurTiree) :
                `rumeur_random`;
            const isChecked = window.randomTablesManager && window.randomTablesManager.checkedResults[resultHash] || false;

            contentDiv.innerHTML = `
                <input type="checkbox"
                       class="random-result-checkbox mt-1 w-4 h-4 cursor-pointer"
                       data-result-hash="${resultHash}"
                       ${isChecked ? 'checked' : ''}
                       onchange="window.randomTablesManager && window.randomTablesManager.toggleResultChecked('${resultHash}', this.checked)">
                <div class="flex-1">${this.renderMarkdown(rumeurTiree)}</div>
            `;
            resultDiv.classList.remove('hidden');

            // Scroller vers le résultat
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    rollOnTable(tableIndex) {
        if (!this.currentItem || !this.currentItem.RandomTables) {
            console.warn('⚠️ Aucune table disponible');
            return;
        }

        const table = this.currentItem.RandomTables[tableIndex];
        if (!table) {
            console.warn('⚠️ Table non trouvée à l\'index', tableIndex);
            return;
        }

        console.log('🎲 Tirage sur la table:', table.name);
        console.log('📅 Contexte de journée actuel:', this.currentDayContext);

        // Transmettre le contexte de journée au RandomTablesManager
        if (window.randomTablesManager) {
            // Si nous avons un contexte de journée, le transmettre temporairement
            if (this.currentDayContext) {
                window.randomTablesManager.currentDayContext = this.currentDayContext;
            }
            window.randomTablesManager.rollOnTable(table);
        }
    }

    async openRandomTableFromInfoBox(tableData) {
        console.log('🎲 [openRandomTableFromInfoBox] Ouverture table:', tableData.name);
        console.log('🎲 [openRandomTableFromInfoBox] Contexte de journée actuel:', this.currentDayContext);

        if (!window.randomTablesManager) {
            console.error('❌ RandomTablesManager non disponible');
            return;
        }

        // Transmettre le contexte de journée si présent
        const dayContext = this.currentDayContext;

        // Ouvrir la modale des tables aléatoires avec le contexte
        window.randomTablesManager.openModal(dayContext);

        // Lancer directement le tirage sur cette table
        setTimeout(() => {
            window.randomTablesManager.rollOnTable(tableData);
        }, 100);
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

    rollRandomEvent() {
        if (!this.currentItem || !this.currentItem.Evenements_Voyage || this.currentItem.Evenements_Voyage.length === 0) {
            return;
        }

        const evenements = this.currentItem.Evenements_Voyage;
        const randomEvent = evenements[Math.floor(Math.random() * evenements.length)];

        const resultContainer = document.getElementById('random-event-result');
        const resultContent = document.getElementById('random-event-content');

        if (resultContainer && resultContent) {
            resultContent.innerHTML = `
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
            `;
            resultContainer.classList.remove('hidden');
        }
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
        const personnagesTab = document.getElementById('personnages-tab');
        if (!personnagesTab) {
            console.log('⚠️ [renderPersonnagesTabRead] Onglet personnages non trouvé');
            return;
        }

        console.log(`📋 [renderPersonnagesTabRead] Début du rendu pour ${this.currentType} "${this.currentItem.name}"`);

        // Récupérer les personnages associés DIRECTEMENT (depuis le lieu/région vers les personnages)
        const directAssociatedIds = this.currentItem.associatedCharacters || [];
        console.log(`📋 [renderPersonnagesTabRead] Associations DIRECTES (${directAssociatedIds.length}):`, directAssociatedIds);

        // Récupérer les personnages associés INVERSEMENT (depuis les personnages vers le lieu/région)
        const reverseAssociatedIds = [];
        const currentItemId = String(this.currentItem.id);

        if (window.charactersManager && window.charactersManager.characters) {
            window.charactersManager.characters.forEach(character => {
                const charId = String(character.id);

                // Vérifier si ce personnage n'est PAS déjà dans les associations directes
                if (!directAssociatedIds.includes(charId)) {
                    // Vérifier si le personnage a ce lieu/région dans ses associations
                    if (this.currentType === 'location') {
                        const associatedLocations = character.associatedLocations || [];
                        if (associatedLocations.includes(currentItemId)) {
                            reverseAssociatedIds.push(charId);
                            console.log(`  ↔️ [REVERSE] Personnage "${character.name}" (${charId}) associé au lieu via son associatedLocations`);
                        }
                    } else if (this.currentType === 'region') {
                        const associatedRegions = character.associatedRegions || [];
                        if (associatedRegions.includes(currentItemId)) {
                            reverseAssociatedIds.push(charId);
                            console.log(`  ↔️ [REVERSE] Personnage "${character.name}" (${charId}) associé à la région via son associatedRegions`);
                        }
                    }
                }
            });
        }

        console.log(`🔍 [renderPersonnagesTabRead] Associations INVERSES (${reverseAssociatedIds.length}):`, reverseAssociatedIds);

        // Fusionner les deux listes en évitant les doublons (directAssociatedIds en premier)
        const allAssociatedIds = [...new Set([...directAssociatedIds, ...reverseAssociatedIds])];
        console.log(`🔍 [renderPersonnagesTabRead] Total personnages (${allAssociatedIds.length}):`, allAssociatedIds);

        // Nettoyer complètement l'onglet
        personnagesTab.innerHTML = '';

        // Créer la structure de base
        const textView = document.createElement('div');
        textView.className = 'text-view';
        textView.style.cssText = 'flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column;';
        personnagesTab.appendChild(textView);

        // Conteneur scrollable avec fond blanc et padding cohérent
        const personnagesContent = document.createElement('div');
        personnagesContent.id = 'personnages-content';
        personnagesContent.style.cssText = 'flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 1rem; background-color: white;';
        textView.appendChild(personnagesContent);

        if (allAssociatedIds.length === 0) {
            personnagesContent.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400">
                    <i class="fas fa-users fa-3x mb-4"></i>
                    <p class="text-sm">Aucun personnage associé</p>
                </div>
            `;
            return;
        }

        // Afficher le titre et la liste des personnages (style cohérent avec Lieux/Régions)
        let html = '<h3 style="color: #940000; font-family: \'Merriweather\', serif; font-weight: 700; margin-bottom: 1rem; font-size: 1.35rem;"><i class="fas fa-users" style="margin-right: 0.5rem;"></i>Personnages associés</h3>';

        // Récupérer tous les personnages et les trier par ordre alphabétique
        const sortedCharacters = allAssociatedIds
            .map(characterId => window.charactersManager.characters.find(c => String(c.id) === String(characterId)))
            .filter(character => character !== undefined)
            .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

        // Parcourir tous les personnages associés triés alphabétiquement
        sortedCharacters.forEach(character => {
            const characterId = String(character.id);
            const isDirect = directAssociatedIds.includes(characterId);
            const isReverse = reverseAssociatedIds.includes(characterId);

            // Badge de type d'association
            let associationBadge = '';
            if (isReverse) {
                associationBadge = '<span class="inline-block px-2 py-1 text-xs rounded bg-purple-600 text-white ml-2">Lié</span>';
            }

            // Thumbnail
            const thumbnailImage = character.images?.find(img => img.type === 'vignette');
            let thumbnailStyle = '';
            if (thumbnailImage?.thumbnailCrop) {
                const crop = thumbnailImage.thumbnailCrop;
                const zoom = crop.zoom || 1;
                const offsetX = crop.offsetX || 0;
                const offsetY = crop.offsetY || 0;
                thumbnailStyle = `style="transform: scale(${zoom}) translate(${offsetX}%, ${offsetY}%);"`;
            }

            // Type de personnage (PJ, PNJ, Monstre)
            const type = character.type || 'PNJ';
            let typeClass = 'bg-green-600';
            let borderClass = 'border-green-500';

            if (type === 'PJ') {
                typeClass = 'bg-blue-600';
                borderClass = 'border-blue-500';
            } else if (type === 'Monstre') {
                typeClass = 'bg-red-600';
                borderClass = 'border-red-500';
            }

            html += `
                <div class="bg-white rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer mb-3 border border-gray-200"
                     onclick="window.infoBoxManager.showCharacterFromLocationInfoBox('${character.id}')">
                    <div class="flex items-center space-x-3">
                        ${thumbnailImage ? `
                            <div class="w-12 h-12 rounded-full overflow-hidden border-2 ${borderClass} flex-shrink-0">
                                <img src="${thumbnailImage.url}" alt="${character.name}"
                                     class="w-full h-full object-cover" ${thumbnailStyle}>
                            </div>
                        ` : `
                            <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 ${borderClass} flex-shrink-0">
                                <i class="fas fa-user text-xl text-gray-400"></i>
                            </div>
                        `}
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center flex-wrap gap-2">
                                <h4 class="font-semibold text-gray-800 truncate text-sm">${character.name}</h4>
                                <span class="inline-block px-2 py-1 text-xs rounded ${typeClass} text-white">${type}</span>
                                ${associationBadge}
                            </div>
                        </div>
                        <i class="fas fa-chevron-right text-gray-400 flex-shrink-0"></i>
                    </div>
                </div>
            `;
        });

        personnagesContent.innerHTML = html;

        console.log(`✅ [renderPersonnagesTabRead] Rendu terminé - ${sortedCharacters.length} personnage(s) affiché(s)`);
    }

    renderLieuxRegionsTabRead() {
        const lieuxRegionsTab = document.getElementById('lieux-regions-tab');
        if (!lieuxRegionsTab) return;

        console.log(`📋 [renderLieuxRegionsTabRead] Début du rendu pour personnage "${this.currentItem.name}"`);

        const character = this.currentItem;
        const associatedLocationIds = character.associatedLocations || [];
        const associatedRegionIds = character.associatedRegions || [];

        lieuxRegionsTab.innerHTML = '';

        const textView = document.createElement('div');
        textView.className = 'text-view';
        textView.style.cssText = 'flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column;';
        lieuxRegionsTab.appendChild(textView);

        const content = document.createElement('div');
        content.style.cssText = 'flex: 1; min-height: 0; overflow-y: auto; padding: 1rem; background-color: white;';
        textView.appendChild(content);

        if (associatedLocationIds.length === 0 && associatedRegionIds.length === 0) {
            content.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-gray-400"><i class="fas fa-map-marker-alt fa-3x mb-4"></i><p>Aucun lieu ou région associé</p></div>';
            return;
        }

        let html = '<h3 style="color: #940000; font-family: \'Merriweather\', serif; font-weight: 700; margin-bottom: 1rem; font-size: 1.35rem;"><i class="fas fa-map-marker-alt" style="margin-right: 0.5rem;"></i>Lieux et Régions associés</h3>';

        // Lieux
        associatedLocationIds.forEach(id => {
            const loc = window.locationsData?.locations?.find(l => String(l.id) === String(id));
            if (loc) {
                html += `
                    <div class="bg-white rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer mb-3 border border-gray-200"
                         onclick="window.infoBoxManager.navigateToLocation(event, '${loc.id}')">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-500 flex-shrink-0">
                                <i class="fas fa-map-marker-alt text-blue-600"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-semibold text-gray-800 truncate text-sm">${loc.name}</h4>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400 flex-shrink-0"></i>
                        </div>
                    </div>
                `;
            }
        });

        // Régions
        associatedRegionIds.forEach(id => {
            const reg = window.regionsData?.regions?.find(r => String(r.id) === String(id));
            if (reg) {
                html += `
                    <div class="bg-white rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer mb-3 border border-gray-200"
                         onclick="window.infoBoxManager.navigateToRegion(event, '${reg.id}')">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-500 flex-shrink-0">
                                <i class="fas fa-mountain text-orange-600"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-semibold text-gray-800 truncate text-sm">${reg.name}</h4>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400 flex-shrink-0"></i>
                        </div>
                    </div>
                `;
            }
        });

        content.innerHTML = html;
    }

    renderLieuxRegionsTabRead() {
        const lieuxRegionsTab = document.getElementById('lieux-regions-tab');
        if (!lieuxRegionsTab) return;

        console.log(`📋 [renderLieuxRegionsTabRead] Début du rendu pour personnage "${this.currentItem.name}"`);

        const character = this.currentItem;
        const associatedLocationIds = character.associatedLocations || [];
        const associatedRegionIds = character.associatedRegions || [];

        lieuxRegionsTab.innerHTML = '';

        const textView = document.createElement('div');
        textView.className = 'text-view';
        textView.style.cssText = 'flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column;';
        lieuxRegionsTab.appendChild(textView);

        const content = document.createElement('div');
        content.style.cssText = 'flex: 1; min-height: 0; overflow-y: auto; padding: 1rem; background-color: white;';
        textView.appendChild(content);

        if (associatedLocationIds.length === 0 && associatedRegionIds.length === 0) {
            content.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-gray-400"><i class="fas fa-map-marker-alt fa-3x mb-4"></i><p>Aucun lieu ou région associé</p></div>';
            return;
        }

        let html = '<h3 style="color: #940000; font-family: \'Merriweather\', serif; font-weight: 700; margin-bottom: 1rem; font-size: 1.35rem;"><i class="fas fa-map-marker-alt" style="margin-right: 0.5rem;"></i>Lieux et Régions associés</h3>';

        // Lieux
        associatedLocationIds.forEach(id => {
            const loc = window.locationsData?.locations?.find(l => String(l.id) === String(id));
            if (loc) {
                html += `
                    <div class="bg-white rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer mb-3 border border-gray-200"
                         onclick="window.infoBoxManager.navigateToLocation(event, '${loc.id}')">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-500 flex-shrink-0">
                                <i class="fas fa-map-marker-alt text-blue-600"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-semibold text-gray-800 truncate text-sm">${loc.name}</h4>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400 flex-shrink-0"></i>
                        </div>
                    </div>
                `;
            }
        });

        // Régions
        associatedRegionIds.forEach(id => {
            const reg = window.regionsData?.regions?.find(r => String(r.id) === String(id));
            if (reg) {
                html += `
                    <div class="bg-white rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer mb-3 border border-gray-200"
                         onclick="window.infoBoxManager.navigateToRegion(event, '${reg.id}')">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-500 flex-shrink-0">
                                <i class="fas fa-mountain text-orange-600"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-semibold text-gray-800 truncate text-sm">${reg.name}</h4>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400 flex-shrink-0"></i>
                        </div>
                    </div>
                `;
            }
        });

        content.innerHTML = html;
    }

    renderLieuxRegionsTabRead() {
        const lieuxRegionsTab = document.getElementById('lieux-regions-tab');
        if (!lieuxRegionsTab) return;

        console.log(`📋 [renderLieuxRegionsTabRead] Début du rendu pour personnage "${this.currentItem.name}"`);

        const character = this.currentItem;
        const associatedLocationIds = character.associatedLocations || [];
        const associatedRegionIds = character.associatedRegions || [];

        lieuxRegionsTab.innerHTML = '';

        const textView = document.createElement('div');
        textView.className = 'text-view';
        textView.style.cssText = 'flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column;';
        lieuxRegionsTab.appendChild(textView);

        const content = document.createElement('div');
        content.style.cssText = 'flex: 1; min-height: 0; overflow-y: auto; padding: 1rem; background-color: white;';
        textView.appendChild(content);

        if (associatedLocationIds.length === 0 && associatedRegionIds.length === 0) {
            content.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-gray-400"><i class="fas fa-map-marker-alt fa-3x mb-4"></i><p>Aucun lieu ou région associé</p></div>';
            return;
        }

        let html = '<h3 style="color: #940000; font-family: \'Merriweather\', serif; font-weight: 700; margin-bottom: 1rem; font-size: 1.35rem;"><i class="fas fa-map-marker-alt" style="margin-right: 0.5rem;"></i>Lieux et Régions associés</h3>';

        // Lieux
        associatedLocationIds.forEach(id => {
            const loc = window.locationsData?.locations?.find(l => String(l.id) === String(id));
            if (loc) {
                html += `
                    <div class="bg-white rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer mb-3 border border-gray-200"
                         onclick="window.infoBoxManager.navigateToLocation(event, '${loc.id}')">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-500 flex-shrink-0">
                                <i class="fas fa-map-marker-alt text-blue-600"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-semibold text-gray-800 truncate text-sm">${loc.name}</h4>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400 flex-shrink-0"></i>
                        </div>
                    </div>
                `;
            }
        });

        // Régions
        associatedRegionIds.forEach(id => {
            const reg = window.regionsData?.regions?.find(r => String(r.id) === String(id));
            if (reg) {
                html += `
                    <div class="bg-white rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer mb-3 border border-gray-200"
                         onclick="window.infoBoxManager.navigateToRegion(event, '${reg.id}')">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-500 flex-shrink-0">
                                <i class="fas fa-mountain text-orange-600"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-semibold text-gray-800 truncate text-sm">${reg.name}</h4>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400 flex-shrink-0"></i>
                        </div>
                    </div>
                `;
            }
        });

        content.innerHTML = html;
    }

    renderPersonnagesTabEdit() {
        console.log(`✏️ [renderPersonnagesTabEdit] Début du rendu en mode édition`);

        const personnagesTab = document.getElementById('personnages-tab');
        if (!personnagesTab) {
            console.error(`❌ [renderPersonnagesTabEdit] Onglet personnages-tab NON TROUVÉ`);
            return;
        }

        console.log(`✅ [renderPersonnagesTabEdit] Onglet personnages-tab trouvé`);

        if (!window.charactersManager || !window.charactersManager.characters) {
            personnagesTab.innerHTML = `
                <div class="edit-form p-4">
                    <p class="text-gray-400 italic text-sm">Aucun personnage disponible</p>
                </div>
            `;
            return;
        }

        // Récupérer les IDs des personnages associés (normalisés en String)
        const associatedCharacterIds = (this.currentItem.associatedCharacters || []).map(id => String(id));

        console.log(`📋 [renderPersonnagesTabEdit] Lieu/Région: ${this.currentItem.name}`);
        console.log(`📋 [renderPersonnagesTabEdit] associatedCharacterIds:`, associatedCharacterIds);

        // Filtrer les personnages selon la carte active
        const activeMapId = window.settingsManager?.activeMapUrl;
        const availableCharacters = window.charactersManager.characters.filter(char => {
            const isOnCurrentMap = !char.mapId || !activeMapId || char.mapId === activeMapId;
            console.log(`🔍 [renderPersonnagesTabEdit] ${char.name} - mapId: ${char.mapId}, activeMapId: ${activeMapId}, isOnCurrentMap: ${isOnCurrentMap}`);
            return isOnCurrentMap;
        });

        console.log(`📋 [renderPersonnagesTabEdit] ${availableCharacters.length} personnage(s) disponible(s)`);

        if (availableCharacters.length === 0) {
            personnagesTab.innerHTML = `
                <div class="edit-form p-4">
                    <p class="text-gray-400 italic text-sm">Aucun personnage disponible sur cette carte</p>
                </div>
            `;
            return;
        }

        const checkboxesHTML = availableCharacters.map(character => {
            const charIdString = String(character.id);
            const isChecked = associatedCharacterIds.includes(charIdString);
            const thumbnailImage = character.images?.find(img => img.type === 'vignette');

            console.log(`🔍 [renderPersonnagesTabEdit] Checkbox pour ${character.name} (ID: ${charIdString}) - checked: ${isChecked}`);

            return `
                <label class="flex items-center space-x-3 p-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors">
                    <input type="checkbox"
                           class="character-checkbox w-4 h-4 cursor-pointer"
                           value="${charIdString}"
                           data-character-id="${charIdString}"
                           ${isChecked ? 'checked' : ''}>
                    ${thumbnailImage ? `
                        <img src="${thumbnailImage.url}" alt="${character.name}"
                             class="w-10 h-10 rounded-full object-cover border-2 ${character.type === 'PJ' ? 'border-blue-500' : 'border-green-500'}">
                    ` : `
                        <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center border-2 ${character.type === 'PJ' ? 'border-blue-500' : 'border-green-500'}">
                            <i class="fas fa-user text-sm text-gray-600"></i>
                        </div>
                    `}
                    <div class="flex-1">
                        <div class="font-semibold text-gray-800">${character.name}</div>
                        <span class="inline-block px-2 py-0.5 text-xs rounded ${character.type === 'PJ' ? 'bg-blue-600' : 'bg-green-600'} text-white">
                            ${character.type || 'PNJ'}
                        </span>
                    </div>
                </label>
            `;
        }).join('');

        const html = `
            <div class="edit-form p-4">
                <div class="space-y-2 mb-4">
                    ${checkboxesHTML}
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

        personnagesTab.innerHTML = html;

        console.log(`✅ [renderPersonnagesTabEdit] Rendu terminé avec ${availableCharacters.length} personnage(s)`);
    }


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

    showCharacterFromLocationInfoBox(characterId) {
        console.log(`👁️ [showCharacterFromLocationInfoBox] Ouverture du personnage ${characterId} depuis InfoBox`);

        // Sauvegarder l'InfoBox actuelle pour permettre le retour
        this.previousInfoBox = {
            item: this.currentItem,
            type: this.currentType,
            fromInfoBox: true,
            shouldShowPersonnagesTab: true
        };

        console.log(`💾 [showCharacterFromLocationInfoBox] previousInfoBox sauvegardé:`, this.previousInfoBox);

        // Charger le personnage via CharactersManager
        if (window.charactersManager) {
            // Appel à la méthode dédiée pour afficher l'infobox du personnage
            window.charactersManager.showCharacterInfoBox(characterId);
        } else {
            console.error("❌ CharactersManager non disponible");
        }
    }

    deleteItem() {
        if (!this.currentItem) {
            console.error("❌ Aucun élément à supprimer");
            return;
        }

        const itemName = this.currentItem.name;
        const itemType = this.currentType;

        const confirmMessage = `Voulez-vous vraiment supprimer ${itemType === 'character' ? 'le personnage' : itemType === 'region' ? 'la région' : 'le lieu'} "${itemName}" ?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        console.log(`🗑️ [deleteItem] Suppression de ${itemType}: ${itemName} (ID: ${this.currentItem.id})`);

        if (itemType === 'location') {
            // Supprimer le lieu
            if (window.locationsData && window.locationsData.locations) {
                const index = window.locationsData.locations.findIndex(loc =>
                    String(loc.id) === String(this.currentItem.id)
                );

                if (index !== -1) {
                    window.locationsData.locations.splice(index, 1);

                    // Synchroniser avec dataManager
                    if (window.dataManager) {
                        window.dataManager.locationsData = window.locationsData;
                        window.dataManager.saveLocationsToLocal();
                    }

                    console.log(`✅ Lieu supprimé: ${itemName}`);
                } else {
                    console.error(`❌ Lieu non trouvé dans locationsData: ${this.currentItem.id}`);
                }
            }
        } else if (itemType === 'region') {
            // Supprimer la région
            if (window.regionsData && window.regionsData.regions) {
                const index = window.regionsData.regions.findIndex(reg =>
                    String(reg.id) === String(this.currentItem.id)
                );

                if (index !== -1) {
                    window.regionsData.regions.splice(index, 1);

                    // Synchroniser avec dataManager
                    if (window.dataManager) {
                        window.dataManager.regionsData = window.dataManager.regionsData;
                        window.dataManager.saveRegionsToLocal();
                    }

                    console.log(`✅ Région supprimée: ${itemName}`);
                } else {
                    console.error(`❌ Région non trouvée dans regionsData: ${this.currentItem.id}`);
                }
            }
        } else if (itemType === 'character') {
            // Supprimer le personnage via CharactersManager
            if (window.charactersManager) {
                window.charactersManager.deleteCharacter(this.currentItem.id);
                console.log(`✅ Personnage supprimé: ${itemName}`);
            }
        }

        // Fermer l'InfoBox
        this.hideInfoBox();

        // Re-render les éléments
        if (window.renderLocations) {
            window.renderLocations();
        }
        if (window.renderRegions) {
            window.renderRegions();
        }
    }

    // --- Zoom pour les images en plein écran ---
    setupFullscreenImageListeners() {
        const fullscreenOverlay = document.getElementById('fullscreen-overlay');
        const fullscreenImage = document.getElementById('fullscreen-image');

        if (!fullscreenOverlay || !fullscreenImage) {
            console.warn('⚠️ Fullscreen overlay ou image non trouvé');
            return;
        }

        let scale = 1;
        let isPanning = false;
        let startX = 0;
        let startY = 0;
        let translateX = 0;
        let translateY = 0;
        let lastMouseX = 0;
        let lastMouseY = 0;
    }

    toggleCharacterKnowledge(field, value) {
        if (!this.currentItem || this.currentType !== 'character') return;

        console.log(`📋 [toggleCharacterKnowledge] ${field} = ${value} pour ${this.currentItem.name}`);

        // Mettre à jour le personnage
        this.currentItem[field] = value;

        // Sauvegarder dans CharactersManager
        if (window.charactersManager) {
            const updates = {};
            updates[field] = value;
            window.charactersManager.updateCharacter(this.currentItem.id, updates);
        }

        console.log(`✅ [toggleCharacterKnowledge] Mise à jour sauvegardée`);
    }

    toggleLocationKnowledge(field, value) {
        if (!this.currentItem || (this.currentType !== 'location' && this.currentType !== 'region')) return;

        console.log(`📋 [toggleLocationKnowledge] ${field} = ${value} pour ${this.currentItem.name}`);
        console.log(`📋 [toggleLocationKnowledge] currentItem ID: ${this.currentItem.id}, Type: ${this.currentType}`);

        // Mettre à jour le lieu/région
        this.currentItem[field] = value;

        let locationFound = false;

        // Sauvegarder dans le dataManager approprié
        if (this.currentType === 'location') {
            // Chercher d'abord par ID, puis par nom si non trouvé (fallback pour les appels depuis la modale voyage)
            let location = window.locationsData.locations.find(l => String(l.id) === String(this.currentItem.id));
            
            if (!location && this.currentItem.name) {
                console.log(`⚠️ [toggleLocationKnowledge] Lieu non trouvé par ID, recherche par nom: ${this.currentItem.name}`);
                location = window.locationsData.locations.find(l => l.name === this.currentItem.name);
            }
            
            if (location) {
                location[field] = value;
                this.dataManager.saveLocationsToLocal();
                locationFound = true;
                console.log(`✅ [toggleLocationKnowledge] Lieu trouvé et mis à jour: ${location.name} (ID: ${location.id})`);
            } else {
                console.error(`❌ [toggleLocationKnowledge] Lieu non trouvé ni par ID ni par nom`);
            }
        } else if (this.currentType === 'region') {
            let region = window.regionsData.regions.find(r => String(r.id) === String(this.currentItem.id));
            
            if (!region && this.currentItem.name) {
                console.log(`⚠️ [toggleLocationKnowledge] Région non trouvée par ID, recherche par nom: ${this.currentItem.name}`);
                region = window.regionsData.regions.find(r => r.name === this.currentItem.name);
            }
            
            if (region) {
                region[field] = value;
                this.dataManager.saveRegionsToLocal();
                locationFound = true;
                console.log(`✅ [toggleLocationKnowledge] Région trouvée et mise à jour: ${region.name} (ID: ${region.id})`);
            } else {
                console.error(`❌ [toggleLocationKnowledge] Région non trouvée ni par ID ni par nom`);
            }
        }

        console.log(`✅ [toggleLocationKnowledge] Mise à jour sauvegardée, locationFound: ${locationFound}`);

        // Rafraîchir l'affichage sur la carte pour refléter le changement de statut
        // Cela permet aux lieux de devenir visibles/invisibles en mode Aventure
        if (field === 'known' && locationFound) {
            console.log(`🔄 [toggleLocationKnowledge] Rafraîchissement de l'affichage carte`);
            
            // En mode Aventure, utiliser les filtres spécifiques du mode Aventure
            if (window.positionManager && window.positionManager.adventureMode) {
                console.log(`🎮 [toggleLocationKnowledge] Mode Aventure actif - application des filtres Aventure`);
                window.positionManager.applyAdventureModeFilters();
            } else if (window.filterManager && typeof window.filterManager.applyFilters === 'function') {
                // Hors mode Aventure, appliquer les filtres normaux
                window.filterManager.applyFilters();
            }
        }
    }

    resetZoomForFullscreen() {
        // Cette méthode sera définie dans setupFullscreenImageListeners()
    }

    navigateToLocation(event, locationId) {
        console.log(`📍 [navigateToLocation] Navigation vers le lieu ID: ${locationId}`);

        // Vérifier que locationsData est disponible via window.locationsData
        if (!window.locationsData || !window.locationsData.locations) {
            console.error('❌ [navigateToLocation] window.locationsData non disponible');
            return;
        }

        // Chercher le lieu
        const location = window.locationsData.locations.find(loc => String(loc.id) === String(locationId));

        if (!location) {
            console.warn(`⚠️ [navigateToLocation] Lieu non trouvé avec l'ID: ${locationId}`);
            return;
        }

        console.log(`✅ [navigateToLocation] Lieu trouvé: ${location.name}`);

        // Sauvegarder l'InfoBox actuelle dans previousInfoBox avec un flag pour afficher l'onglet Personnages
        this.previousInfoBox = {
            item: this.currentItem,
            type: this.currentType,
            fromInfoBox: true, // FLAG IMPORTANT : indique qu'on vient d'une InfoBox
            shouldShowPersonnagesTab: true // FLAG pour afficher l'onglet Personnages au retour
        };

        console.log(`💾 [navigateToLocation] InfoBox précédente sauvegardée:`, this.previousInfoBox);

        // Créer un événement simulé pour le positionnement
        const fakeEvent = event || {
            clientX: window.innerWidth / 2,
            clientY: window.innerHeight / 2,
            type: 'click'
        };

        // Ouvrir l'infobox du lieu
        this.showInfoBox(fakeEvent, location, 'location');

        // Forcer l'affichage de l'onglet Description avec rafraîchissement du contenu
        setTimeout(() => {
            console.log(`📋 [navigateToLocation] Affichage forcé de l'onglet Description pour ${location.name}`);
            this.switchTab('text');
            // Forcer le re-render du contenu de l'onglet Description
            this.renderReadMode();
        }, 100);
    }

    navigateToRegion(event, regionId) {
        console.log(`🗺️ [navigateToRegion] Navigation vers la région ID: ${regionId}`);

        // Vérifier que regionsData est disponible via window.regionsData
        if (!window.regionsData || !window.regionsData.regions) {
            console.error('❌ [navigateToRegion] window.regionsData non disponible');
            return;
        }

        // Chercher la région
        const region = window.regionsData.regions.find(reg => String(reg.id) === String(regionId));

        if (!region) {
            console.warn(`⚠️ [navigateToRegion] Région non trouvée avec l'ID: ${regionId}`);
            return;
        }

        console.log(`✅ [navigateToRegion] Région trouvée: ${region.name}`);

        // Sauvegarder l'InfoBox actuelle dans previousInfoBox avec un flag pour afficher l'onglet Personnages
        this.previousInfoBox = {
            item: this.currentItem,
            type: this.currentType,
            fromInfoBox: true, // FLAG IMPORTANT : indique qu'on vient d'une InfoBox
            shouldShowPersonnagesTab: true // FLAG pour afficher l'onglet Personnages au retour
        };

        console.log(`💾 [navigateToRegion] InfoBox précédente sauvegardée:`, this.previousInfoBox);

        // Créer un événement simulé pour le positionnement
        const fakeEvent = event || {
            clientX: window.innerWidth / 2,
            clientY: window.innerHeight / 2,
            type: 'click'
        };

        // Ouvrir l'infobox de la région
        this.showInfoBox(fakeEvent, region, 'region');

        // Forcer l'affichage de l'onglet Description avec rafraîchissement du contenu
        setTimeout(() => {
            console.log(`📋 [navigateToRegion] Affichage forcé de l'onglet Description pour ${region.name}`);
            this.switchTab('text');
            // Forcer le re-render du contenu de l'onglet Description
            this.renderReadMode();
        }, 100);
    }

    navigateToCharacter(event, characterId) {
        console.log(`👤 [navigateToCharacter] Navigation vers le personnage ID: ${characterId}`);

        if (!window.charactersManager || !window.charactersManager.characters) {
            console.error("❌ [navigateToCharacter] charactersManager non disponible");
            return;
        }

        // Normaliser l'ID
        const normalizedId = String(characterId);

        // Trouver le personnage
        const character = window.charactersManager.characters.find(char => String(char.id) === normalizedId);

        if (!character) {
            console.warn(`⚠️ [navigateToCharacter] Personnage non trouvé avec l'ID: ${normalizedId}`);
            return;
        }

        console.log(`✅ [navigateToCharacter] Personnage trouvé: ${character.name}`);

        // Sauvegarder l'infobox actuelle pour pouvoir y revenir
        this.previousInfoBox = {
            item: this.currentItem,
            type: this.currentType,
            fromInfoBox: true,
            shouldShowPersonnagesTab: true // Retourner à l'onglet Personnages
        };

        console.log(`💾 [navigateToCharacter] InfoBox précédente sauvegardée:`, this.previousInfoBox);

        // Créer un événement simulé pour le positionnement
        const fakeEvent = event || {
            clientX: window.innerWidth / 2,
            clientY: window.innerHeight / 2,
            type: 'click'
        };

        // Ouvrir l'infobox du personnage
        this.showInfoBox(fakeEvent, character, 'character');

        // Forcer l'affichage de l'onglet Description avec rafraîchissement du contenu
        setTimeout(() => {
            console.log(`📋 [navigateToCharacter] Affichage forcé de l'onglet Description pour ${character.name}`);
            this.switchTab('text');
            // Forcer le re-render du contenu de l'onglet Description
            this.renderReadMode();
        }, 100);
    }
}

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InfoBoxManager;
}

// Export ES6 par défaut
export default InfoBoxManager;

console.log("📋 InfoBoxManager module loaded");