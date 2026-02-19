class JournalManager {
    constructor() {
        this.journal = {
            content: '', // Texte continu du journal
            metadata: {
                lastModified: null,
                wordCount: 0
            }
        };
        this.objectives = [];
        this.journalModal = null;
        this.journalContent = null;
        this.journalEmpty = null;
        this.currentTab = 'journal-list';
        this.exportJournalMarkdownBtn = null;
        this.isEditMode = false; // Mode édition activé/désactivé
        this.entries = []; // Liste des entrées structurées (voyages)
    }

    init() {
        console.log("📖 Initialisation du JournalManager");
        this.setupDOMReferences();
        this.setupEventListeners();
        this.loadJournal();
        this.loadObjectives();
        this.loadRumors(); // Charger les rumeurs au démarrage
    }

    setupDOMReferences() {
        this.journalModal = document.getElementById('travel-journal-modal');
        this.journalContent = document.getElementById('journal-content');
        this.journalEmpty = document.getElementById('journal-empty');
        this.journalBtn = document.getElementById('journal-btn');
        this.closeJournalBtn = document.getElementById('close-journal-btn');
        this.exportJournalMarkdownBtn = document.getElementById('export-journal-markdown-btn'); // Get reference to the new button

        console.log('📖 [setupDOMReferences] Éléments trouvés:', {
            journalModal: !!this.journalModal,
            journalContent: !!this.journalContent,
            journalEmpty: !!this.journalEmpty,
            exportJournalMarkdownBtn: !!this.exportJournalMarkdownBtn // Log the new button reference
        });
    }

    setupEventListeners() {
        if (this.journalBtn) {
            this.journalBtn.addEventListener('click', () => this.openJournal());
        }

        if (this.closeJournalBtn) {
            this.closeJournalBtn.addEventListener('click', () => this.closeJournal());
        }

        if (this.journalModal) {
            this.journalModal.addEventListener('click', (e) => {
                if (e.target === this.journalModal) {
                    this.closeJournal();
                }
            });
        }

        // Gestion des onglets
        const tabButtons = document.querySelectorAll('.journal-tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.closest('.journal-tab-button').dataset.tab);
            });
        });

        // Bouton d'ajout d'objectif
        const addObjectiveBtn = document.getElementById('add-objective-btn');
        if (addObjectiveBtn) {
            addObjectiveBtn.addEventListener('click', () => this.addObjective());
        }

        // Bouton d'édition du journal
        const editJournalBtn = document.getElementById('edit-journal-btn');
        if (editJournalBtn) {
            editJournalBtn.addEventListener('click', () => this.toggleEditMode());
        }

        // Écouteur pour le bouton d'export Markdown
        if (this.exportJournalMarkdownBtn) {
            this.exportJournalMarkdownBtn.addEventListener('click', () => this.exportJournalAsMarkdown());
            console.log("📖 Écouteur d'événement ajouté pour le bouton d'export Markdown.");
        }
    }

    switchTab(tabName) {
        console.log(`📖 Changement d'onglet vers: ${tabName}`);
        this.currentTab = tabName;

        // Désactiver tous les onglets
        document.querySelectorAll('.journal-tab-button').forEach(btn => {
            btn.classList.remove('active', 'text-gray-800', 'border-red-800');
            btn.classList.add('text-gray-500', 'border-transparent');
        });
        document.querySelectorAll('.journal-tab-content').forEach(content => {
            content.classList.remove('active');
            content.classList.add('hidden');
        });

        // Activer l'onglet sélectionné
        const targetButton = document.querySelector(`.journal-tab-button[data-tab="${tabName}"]`);
        const targetContent = document.getElementById(`${tabName}-tab`);

        if (targetButton) {
            targetButton.classList.add('active', 'text-gray-800', 'border-red-800');
            targetButton.classList.remove('text-gray-500', 'border-transparent');
        }
        if (targetContent) {
            targetContent.classList.remove('hidden');
            targetContent.classList.add('active');
        }

        // Rafraîchir le contenu si nécessaire
        if (tabName === 'objectives') {
            this.renderObjectives();
        } else if (tabName === 'rumors') {
            this.renderRumors(); // Rendre le contenu de l'onglet rumeurs
        }
    }

    loadJournal() {
        // 1. Charger le journal textuel (Free Text)
        const savedTextJournal = localStorage.getItem('adventureJournal');
        if (savedTextJournal) {
            try {
                this.journal = JSON.parse(savedTextJournal);
            } catch (e) {
                console.error("Erreur chargement adventureJournal:", e);
                this.journal = { content: '', metadata: { wordCount: 0 } };
            }
        } else {
            // Fallback: Vérifier si l'ancien 'travelJournal' contient le texte
            const oldJournal = localStorage.getItem('travelJournal');
            if (oldJournal) {
                try {
                    const parsed = JSON.parse(oldJournal);
                    if (parsed && parsed.content !== undefined) {
                        this.journal = parsed;
                        // Migrer vers la nouvelle clé
                        localStorage.setItem('adventureJournal', JSON.stringify(this.journal));
                    } else {
                        this.journal = { content: '', metadata: { wordCount: 0 } };
                    }
                } catch (e) {
                    this.journal = { content: '', metadata: { wordCount: 0 } };
                }
            } else {
                this.journal = { content: '', metadata: { wordCount: 0 } };
            }
        }

        // 2. Charger les entrées structurées (Voyages)
        // On utilise 'travelJournal' pour stocker le tableau des voyages maintenant
        const savedEntries = localStorage.getItem('travelJournal');
        this.entries = [];

        if (savedEntries) {
            try {
                const parsed = JSON.parse(savedEntries);
                if (Array.isArray(parsed)) {
                    this.entries = parsed;
                } else if (parsed && parsed.content === undefined && typeof parsed === 'object') {
                    // Si c'est un objet mais pas le journal texte, c'est peut-être un format intermédiaire ?
                    // Pour l'instant on ignore ou on initialise vide
                }
            } catch (e) {
                console.error("Erreur chargement entrées journal:", e);
            }
        }

        console.log(`📖 Journal chargé : ${this.journal.metadata.wordCount} mots, ${this.entries.length} voyages`);

        // Synchroniser les tracés visibles
        this.syncSavedPaths();
    }

    syncSavedPaths() {
        if (!window.pathManager) return;

        // Effacer les anciens chemins sauvegardés
        window.pathManager.clearSavedPaths();

        // Récupérer l'URL de la carte active
        const activeMapUrl = window.settingsManager?.activeMapUrl;

        // Ajouter les chemins visibles qui correspondent à la carte active
        this.entries.forEach(entry => {
            // Vérifier si le chemin doit être affiché sur cette carte
            // - Si entry.mapId existe, il doit correspondre à activeMapUrl
            // - Si entry.mapId n'existe pas (anciens voyages), on l'affiche partout (comportement legacy)
            const isMapCompatible = !entry.mapId || entry.mapId === activeMapUrl;

            if (entry.visible && entry.path && entry.path.length > 0 && isMapCompatible) {
                window.pathManager.addSavedPath(entry.id, entry.path);
            }
        });
    }

    addEntry(entry) {
        this.entries.unshift(entry); // Ajouter au début (plus récent)
        this.saveEntries();
        this.renderJournal();
    }

    saveEntries() {
        localStorage.setItem('travelJournal', JSON.stringify(this.entries));
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }
    }

    toggleEntryVisibility(index) {
        if (this.entries[index]) {
            this.entries[index].visible = !this.entries[index].visible;
            this.saveEntries();
            this.syncSavedPaths();
            // Re-render pour mettre à jour la checkbox (déjà fait par le clic mais bon pour la synchro)
            // Pas nécessaire de re-render tout le journal, juste sync les chemins
        }
    }

    openJournal() {
        this.loadJournal();
        this.loadObjectives();
        this.loadRumors(); // Charger les rumeurs à l'ouverture
        this.renderJournal();
        this.renderRumors(); // Afficher les rumeurs

        // Afficher l'onglet par défaut (Rumeurs)
        this.switchTab('rumors');

        if (this.journalModal) {
            this.journalModal.classList.remove('hidden');
        }
    }

    closeJournal() {
        if (this.journalModal) {
            this.journalModal.classList.add('hidden');
        }
    }

    simpleMarkdown(text) {
        if (!text) return '';

        return text
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.*)$/gim, function(match) {
                if (match.startsWith('<h') || match.startsWith('<ul') || match.startsWith('<li') || match.startsWith('</')) {
                    return match;
                }
                return match.trim() ? `<p>${match}</p>` : '';
            })
            .replace(/<p><\/p>/g, '')
            .replace(/<p>(<h[1-6]>)>/g, '$1')
            .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
            .replace(/<p>(<ul>)/g, '$1')
            .replace(/(<\/ul>)<\/p>/g, '$1');
    }

    renderJournal() {
        if (!this.journalContent || !this.journalEmpty) return;

        // Rendu des entrées structurées
        const entriesList = document.getElementById('journal-entries-list');
        if (entriesList) {
            entriesList.innerHTML = '';
            // Créer une copie inversée avec les index originaux pour l'affichage (plus ancien en haut)
            const entriesToRender = this.entries.map((entry, index) => ({ entry, index })).reverse();

            entriesToRender.forEach(({ entry, index }) => {
                const entryDiv = document.createElement('div');
                entryDiv.className = 'flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors';

                // Checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'h-5 w-5 text-red-800 rounded border-gray-300 focus:ring-red-800 cursor-pointer';
                checkbox.checked = entry.visible || false;
                checkbox.onchange = () => this.toggleEntryVisibility(index);

                // Title
                const titleSpan = document.createElement('span');
                titleSpan.className = 'flex-grow text-gray-800 font-medium text-sm';
                titleSpan.textContent = entry.title || `Voyage du ${entry.startDate}`;

                // Delete button (optional but good for UX)
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'text-gray-400 hover:text-red-600 transition-colors';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.title = 'Supprimer cette entrée';
                deleteBtn.onclick = () => {
                    if(confirm('Supprimer cette entrée de journal ?')) {
                        this.entries.splice(index, 1);
                        this.saveEntries();
                        this.syncSavedPaths();
                        this.renderJournal();
                    }
                };

                entryDiv.appendChild(checkbox);
                entryDiv.appendChild(titleSpan);
                entryDiv.appendChild(deleteBtn);
                entriesList.appendChild(entryDiv);
            });
        }

        // Gestion de l'affichage vide/plein pour le texte libre
        const hasContent = this.journal.content && this.journal.content.trim() !== '';
        const hasEntries = this.entries.length > 0;

        if (!hasContent && !hasEntries && !this.isEditMode) {
            this.journalContent.classList.add('hidden');
            if (entriesList) entriesList.classList.add('hidden');
            this.journalEmpty.classList.remove('hidden');
            return;
        }

        this.journalEmpty.classList.add('hidden');
        if (entriesList) entriesList.classList.remove('hidden');
        this.journalContent.classList.remove('hidden');

        if (this.isEditMode) {
            // Mode édition : afficher une textarea
            this.journalContent.innerHTML = `
                <div class="journal-edit-container">
                    <textarea id="journal-edit-textarea" 
                              class="w-full p-4 border border-gray-300 rounded-lg resize-none"
                              style="font-family: 'Merriweather', serif; font-size: 0.875rem; line-height: 1.6;"
                              placeholder="Écrivez votre journal d'aventure...">${this.escapeHtml(this.journal.content)}</textarea>
                    <div class="mt-3 flex justify-between items-center text-sm text-gray-500 flex-shrink-0">
                        <span>${this.journal.metadata.wordCount} mots</span>
                        <button id="save-journal-btn" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                            <i class="fas fa-save mr-2"></i>Enregistrer
                        </button>
                    </div>
                </div>
            `;

            // Ajouter l'événement de sauvegarde
            const saveBtn = document.getElementById('save-journal-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => this.saveJournalContent());
            }

            // Auto-update word count
            const textarea = document.getElementById('journal-edit-textarea');
            if (textarea) {
                textarea.addEventListener('input', () => {
                    const words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
                    this.journalContent.querySelector('.text-sm.text-gray-500 span').textContent = `${words} mots`;
                });
            }
        } else {
            // Mode lecture : afficher le texte formaté en Markdown
            const htmlContent = this.simpleMarkdown(this.journal.content);
            this.journalContent.innerHTML = `
                <div class="journal-read-container prose prose-sm max-w-none p-4" style="font-family: 'Merriweather', serif; font-size: 0.875rem; line-height: 1.6; color: #1f2937;">
                    ${htmlContent}
                </div>
                <div class="mt-3 text-sm text-gray-500 px-4">
                    ${this.journal.metadata.wordCount} mots
                    ${this.journal.metadata.lastModified ? `• Dernière modification : ${new Date(this.journal.metadata.lastModified).toLocaleDateString('fr-FR')}` : ''}
                </div>
            `;
        }
    }

    openJourneyInVoyageModal(journeyIndex) {
        const journey = this.journal[journeyIndex];
        if (!journey) {
            console.error("Voyage non trouvé:", journeyIndex);
            return;
        }

        // Fermer la modale du journal
        this.closeJournal();

        // Ouvrir la modale de voyage et afficher les données du journal
        const voyageModal = document.getElementById('voyage-segments-modal');
        const voyageDaysContent = document.getElementById('voyage-days-content');
        const voyageTitle = voyageModal?.querySelector('h3');
        const voyageSubtitle = voyageModal?.querySelector('p.text-sm');

        if (!voyageModal || !voyageDaysContent) {
            console.error("Modale de voyage non trouvée");
            return;
        }

        // Déterminer le type de voyage
        const isExploration = journey.journeyType === 'exploration';
        console.log(`📖 Ouverture ${isExploration ? 'exploration' : 'voyage'}: ${journey.title}`);

        // Mettre à jour le titre et sous-titre
        if (voyageTitle) {
            voyageTitle.textContent = journey.title;
        }
        if (voyageSubtitle) {
            // Déterminer la date à afficher
            let displayDate = '';

            // Si c'est un voyage avec des jours et une date calendrier
            if (journey.days && journey.days.length > 0 && journey.days[0].calendarDate) {
                displayDate = journey.days[0].calendarDate;
            } else {
                // Sinon utiliser la date de génération classique
                const generatedDate = new Date(journey.generatedAt);
                displayDate = generatedDate.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }

            voyageSubtitle.innerHTML = `${displayDate} • <span id="voyage-total-days">${journey.totalDays}</span> jour${journey.totalDays > 1 ? 's' : ''}`;
        }

        // Générer le HTML des jours
        const daysHTML = journey.days.map((day, index) => {
            let contentHtml = '';

            // Description du jour avec rendu Markdown (en filtrant le champ "Dé du destin")
            if (day.description) {
                // Filtrer le champ "Dé du destin" de la description
                let filteredDescription = day.description;
                filteredDescription = filteredDescription.replace(/Dé du destin:\s*\d+\s*/gi, '');
                filteredDescription = filteredDescription.replace(/<div[^>]*>\s*<span[^>]*>Dé du destin:<\/span>[\s\S]*?<\/div>/gi, '');

                const descriptionHtml = this.simpleMarkdown(filteredDescription);
                contentHtml += `
                    <div class="bg-gray-50 rounded-lg p-3 mb-3">
                        <div class="text-xs text-gray-500 mb-1">📖 Description :</div>
                        <div class="text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none">${descriptionHtml}</div>
                    </div>
                `;
            }

            // Événement aléatoire avec rendu Markdown
            if (day.eventResult) {
                const eventHtml = this.simpleMarkdown(day.eventResult);
                contentHtml += `
                    <div class="bg-yellow-50 border border-yellow-400 rounded-lg p-3 mb-3">
                        <div class="flex items-center text-xs mb-2" style="color: #d97706;">
                            <i class="fas fa-dice mr-1"></i>
                            <span class="font-semibold">Événement aléatoire</span>
                        </div>
                        <div class="text-sm prose prose-sm max-w-none" style="color: #1f2937 !important;">
                            <div style="color: #1f2937 !important;">${eventHtml}</div>
                        </div>
                    </div>
                `;
            }

            // Message si pas de contenu
            if (!day.description && !day.eventResult) {
                contentHtml += '<p class="text-gray-400 text-sm italic text-center py-2">Voyage tranquille...</p>';
            }

            // Préparer les découvertes pour le header (max 2)
            const discoveries = day.discoveries || [];
            const headerDiscoveries = discoveries.slice(0, 2);
            const discoveriesHtml = headerDiscoveries.map(discovery => {
                const name = discovery.name.length > 15 ? discovery.name.substring(0, 12) + '...' : discovery.name;
                return `<span class="discovery-badge text-xs px-2 py-1 bg-gray-200 rounded text-gray-700" title="${discovery.name}" data-discovery-name="${discovery.name}" data-discovery-type="${discovery.type}" onclick="event.stopPropagation(); window.voyageManager.openDiscoveryFromHeader('${discovery.name}', '${discovery.type}')">${name}</span>`;
            }).join('');

            return `
                <div class="day-card mb-4 border border-gray-300 rounded-lg overflow-hidden" data-day-index="${index}">
                    <div class="day-header bg-gray-50 p-3">
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-base font-bold whitespace-nowrap" style="color: #940000;">Jour ${day.dayNumber}</span>
                                <span class="text-xs text-gray-600 whitespace-nowrap">${day.calendarDate}</span>
                                ${day.weatherSymbol ? `<span class="text-xl" title="${day.weatherText || ''}">${day.weatherSymbol}</span>` : ''}
                                ${discoveriesHtml}
                            </div>
                        </div>
                    </div>
                    <div class="day-content p-4 bg-white">
                        ${contentHtml}
                    </div>
                </div>
            `;
        }).join('');

        voyageDaysContent.innerHTML = daysHTML;

        // Masquer ou afficher les boutons d'actions selon le type
        const describeBtn = document.getElementById('describe-journey-header-btn');
        const finishBtn = document.getElementById('finish-journey-header-btn');

        if (isExploration) {
            // Mode Exploration : masquer les boutons
            if (describeBtn) describeBtn.classList.add('hidden');
            if (finishBtn) finishBtn.classList.add('hidden');
            console.log('🧭 Mode Exploration : boutons d\'action masqués');
        } else {
            // Mode Voyage : afficher les boutons (mais désactivés car voyage passé)
            if (describeBtn) describeBtn.classList.add('hidden');
            if (finishBtn) finishBtn.classList.add('hidden');
            console.log('🗺️ Mode Voyage : boutons d\'action masqués (voyage passé)');
        }

        // Les en-têtes de jours ne sont PAS cliquables depuis le journal
        // Désactiver complètement les listeners de clic
        console.log('🚫 En-têtes de jour non cliquables depuis le journal');

        // Ajouter le curseur par défaut pour tous les en-têtes
        const style = document.createElement('style');
        style.textContent = '.day-header { cursor: default; }';

        // Supprimer l'ancien style s'il existe
        const oldStyle = document.getElementById('journal-day-header-style');
        if (oldStyle) oldStyle.remove();

        style.id = 'journal-day-header-style';
        document.head.appendChild(style);

        // DÉSACTIVER les clics sur les en-têtes de jour pour les voyages enregistrés
        // Retirer le listener global de VoyageManager s'il existe
        if (voyageDaysContent._dayHeaderClickListener) {
            voyageDaysContent.removeEventListener('click', voyageDaysContent._dayHeaderClickListener);
            delete voyageDaysContent._dayHeaderClickListener;
            console.log('✅ Listener de clic sur en-têtes désactivé pour voyage enregistré');
        }

        // Afficher la modale
        voyageModal.classList.remove('hidden');

        // Ajouter un listener pour retourner au journal à la fermeture
        const closeVoyageBtn = document.getElementById('close-voyage-segments');
        if (closeVoyageBtn) {
            // Retirer l'ancien listener s'il existe
            const newCloseBtn = closeVoyageBtn.cloneNode(true);
            closeVoyageBtn.parentNode.replaceChild(newCloseBtn, closeVoyageBtn);

            // Ajouter le nouveau listener
            newCloseBtn.addEventListener('click', () => {
                voyageModal.classList.add('hidden');
                // Rouvrir le journal
                this.openJournal();
            });
        }
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        this.renderJournal();
        console.log(`📖 Mode édition : ${this.isEditMode ? 'activé' : 'désactivé'}`);
    }

    saveJournalContent() {
        const textarea = document.getElementById('journal-edit-textarea');
        if (!textarea) return;

        this.journal.content = textarea.value;
        this.journal.metadata.lastModified = new Date().toISOString();
        this.journal.metadata.wordCount = textarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;

        localStorage.setItem('adventureJournal', JSON.stringify(this.journal));

        // Marquer comme non sauvegardé
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }

        // Synchroniser avec le cloud si authentifié
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }

        this.isEditMode = false;
        this.renderJournal();
        console.log("📖 Journal texte sauvegardé");
    }

    appendContent(newContent) {
        // Ajouter du contenu en fin de journal avec la date calendrier
        const calendarDate = window.calendarManager?.currentCalendarDate;
        const dateStr = calendarDate ? `**${calendarDate.day} ${calendarDate.month}**` : "**Date inconnue**";
        
        if (this.journal.content.trim() !== '') {
            this.journal.content += '\n\n';
        }
        
        this.journal.content += `${dateStr} - ${newContent}`;
        this.journal.metadata.lastModified = new Date().toISOString();
        this.journal.metadata.wordCount = this.journal.content.trim().split(/\s+/).filter(w => w.length > 0).length;
        
        this.saveJournal();
        console.log("📖 Contenu ajouté au journal");
    }

    saveJournal() {
        localStorage.setItem('adventureJournal', JSON.stringify(this.journal));

        // Marquer comme non sauvegardé
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }

        // Synchroniser avec le cloud si authentifié
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }
    }

    exportJournalAsMarkdown() {
        if (!this.journal.content || this.journal.content.trim() === '') {
            alert("Le journal est vide");
            return;
        }

        // Le contenu est déjà en Markdown
        const markdown = this.journal.content;

        // Créer une modale pour afficher le Markdown et le bouton copier
        this.createMarkdownExportModal(markdown);

        console.log("📖 Journal prêt à être exporté en Markdown");
    }

    // Nouvelle fonction pour créer et afficher la modale d'export
    createMarkdownExportModal(markdownContent) {
        // Vérifier si la modale existe déjà, sinon la créer
        let exportModal = document.getElementById('markdown-export-modal');
        if (!exportModal) {
            exportModal = document.createElement('div');
            exportModal.id = 'markdown-export-modal';
            exportModal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 hidden';
            exportModal.innerHTML = `
                <div class="bg-white rounded-lg shadow-lg p-6 w-4/5 max-w-3xl max-h-[80vh] flex flex-col">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">Export Journal (Markdown)</h3>
                        <button id="close-markdown-export-modal" class="text-gray-400 hover:text-gray-600 focus:outline-none">
                            <i class="fas fa-times text-lg"></i>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto mb-4 p-4 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono whitespace-pre-wrap text-black" id="markdown-export-content">
                        <!-- Le contenu Markdown sera ici -->
                    </div>
                    <div class="flex justify-end space-x-4">
                        <button id="copy-markdown-to-clipboard-btn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2">
                            <i class="fas fa-copy"></i>
                            <span>Copier</span>
                        </button>
                        <button id="download-markdown-file-btn" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2">
                            <i class="fas fa-file-download"></i>
                            <span>Télécharger</span>
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(exportModal);
        }

        const modalContent = exportModal.querySelector('#markdown-export-content');
        const closeBtn = exportModal.querySelector('#close-markdown-export-modal');
        const copyBtn = exportModal.querySelector('#copy-markdown-to-clipboard-btn');
        const downloadBtn = exportModal.querySelector('#download-markdown-file-btn');

        modalContent.textContent = markdownContent;

        // Ajouter les écouteurs d'événements pour les boutons de la modale
        if (closeBtn) {
            closeBtn.onclick = () => {
                exportModal.classList.add('hidden');
            };
        }

        if (copyBtn) {
            copyBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(markdownContent);
                    alert('Contenu du journal copié dans le presse-papiers !');
                } catch (err) {
                    console.error('Erreur lors de la copie du presse-papiers:', err);
                    alert('Échec de la copie du presse-papiers.');
                }
            };
        }

        if (downloadBtn) {
            downloadBtn.onclick = () => {
                const blob = new Blob([markdownContent], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `journal-voyage-${new Date().toISOString().split('T')[0]}.md`;
                a.click();
                URL.revokeObjectURL(url);
            };
        }

        // Afficher la modale
        exportModal.classList.remove('hidden');
    }

    loadObjectives() {
        const savedObjectives = localStorage.getItem('adventureObjectives');
        if (savedObjectives && savedObjectives !== 'null' && savedObjectives !== 'undefined') {
            try {
                const parsed = JSON.parse(savedObjectives);
                this.objectives = Array.isArray(parsed) ? parsed : [];
                console.log(`📖 ${this.objectives.length} objectif(s) chargé(s) depuis le localStorage`);
            } catch (e) {
                console.error("Erreur lors du chargement des objectifs:", e);
                this.objectives = [];
            }
        } else {
            this.objectives = [];
            console.log("📖 Aucun objectif trouvé dans le localStorage");
        }
    }

    renderObjectives() {
        const objectivesList = document.getElementById('objectives-list');
        const objectivesEmpty = document.getElementById('objectives-empty');

        if (!objectivesList || !objectivesEmpty) return;

        if (this.objectives.length === 0) {
            objectivesList.innerHTML = '';
            objectivesEmpty.style.display = 'flex';
            return;
        }

        objectivesEmpty.style.display = 'none';

        const objectivesHTML = this.objectives.map((objective, index) => {
            const status = objective.status || 'proposed';
            const isCompleted = status === 'completed';
            return `
            <div class="objective-item ${isCompleted ? 'completed' : ''}" data-index="${index}">
                <select onchange="window.journalManager.updateObjectiveStatus(${index}, this.value)"
                        class="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 mr-2">
                    <option value="proposed" ${status === 'proposed' ? 'selected' : ''}>Proposé</option>
                    <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>En cours</option>
                    <option value="completed" ${status === 'completed' ? 'selected' : ''}>Atteint</option>
                </select>
                <div class="objective-text">${this.escapeHtml(objective.text)}</div>
                <button onclick="window.journalManager.deleteObjective(${index})"
                        class="text-red-500 hover:text-red-700 p-2 ml-2"
                        title="Supprimer cet objectif">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        }).join('');

        objectivesList.innerHTML = objectivesHTML;
    }

    addObjective() {
        const text = prompt("Nouvel objectif d'aventure :");
        if (text && text.trim()) {
            this.objectives.push({
                text: text.trim(),
                status: 'proposed',
                completed: false,
                createdAt: new Date().toISOString()
            });
            this.saveObjectives();
            this.renderObjectives();
        }
    }

    updateObjectiveStatus(index, status) {
        if (this.objectives[index]) {
            this.objectives[index].status = status;
            // Maintenir la compatibilité avec l'ancien système
            this.objectives[index].completed = (status === 'completed');
            this.saveObjectives();
            this.renderObjectives();
        }
    }

    deleteObjective(index) {
        if (confirm("Êtes-vous sûr de vouloir supprimer cet objectif ?")) {
            this.objectives.splice(index, 1);
            this.saveObjectives();
            this.renderObjectives();
        }
    }

    saveObjectives() {
        localStorage.setItem('adventureObjectives', JSON.stringify(this.objectives));
        console.log("💾 Objectifs sauvegardés dans localStorage");

        // Marquer comme non sauvegardé pour sync cloud
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }

        // Synchroniser avec le cloud si authentifié
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Méthodes pour les Rumeurs ---

    loadRumors() {
        const savedRumors = localStorage.getItem('adventureRumors');
        if (savedRumors && savedRumors !== 'null' && savedRumors !== 'undefined') {
            try {
                const parsed = JSON.parse(savedRumors);
                this.rumors = Array.isArray(parsed) ? parsed : [];
                console.log(`📖 ${this.rumors.length} rumeur(s) chargée(s) depuis le localStorage`);
            } catch (e) {
                console.error("Erreur lors du chargement des rumeurs:", e);
                this.rumors = [];
            }
        } else {
            this.rumors = [];
            console.log("📖 Aucune rumeur trouvée dans le localStorage");
        }

        // Charger les états des cases à cocher
        const savedStates = localStorage.getItem('rumorsCheckboxStates');
        if (savedStates && savedStates !== 'null' && savedStates !== 'undefined') {
            try {
                this.rumorsCheckboxStates = JSON.parse(savedStates);
                console.log(`📖 ${Object.keys(this.rumorsCheckboxStates).length} état(s) de cases à cocher chargé(s)`);
            } catch (e) {
                console.error("Erreur lors du chargement des états des cases à cocher:", e);
                this.rumorsCheckboxStates = {};
            }
        } else {
            this.rumorsCheckboxStates = {};
        }
    }

    saveRumors() {
        localStorage.setItem('adventureRumors', JSON.stringify(this.rumors));
        console.log("💾 Rumeurs sauvegardées dans localStorage");
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }
    }

    saveRumorsCheckboxStates() {
        localStorage.setItem('rumorsCheckboxStates', JSON.stringify(this.rumorsCheckboxStates));
        console.log("💾 États des cases à cocher des rumeurs sauvegardés");
        if (window.authManager && window.authManager.isAuthenticated) {
            window.authManager.markAsUnsaved();
        }
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }
    }

    toggleRumorCheckbox(itemType, itemName, rumorIndex) {
        const key = `${itemType}_${itemName}_${rumorIndex}`;
        this.rumorsCheckboxStates[key] = !this.rumorsCheckboxStates[key];
        this.saveRumorsCheckboxStates();
        console.log(`📖 Case à cocher rumeur ${key} mise à jour:`, this.rumorsCheckboxStates[key]);

        // Re-render si on est en mode "Sélection" pour mettre à jour l'affichage
        const rumorsFilter = localStorage.getItem('rumorsFilter') || 'selection';
        if (rumorsFilter === 'selection') {
            this.renderRumors();
        }
    }

    isRumorChecked(itemType, itemName, rumorIndex) {
        const key = `${itemType}_${itemName}_${rumorIndex}`;
        return this.rumorsCheckboxStates[key] || false;
    }

    addRumor(rumorData) {
        // Assurez-vous que rumorData est un objet et contient les informations nécessaires
        if (!rumorData || !rumorData.text) {
            console.warn("Tentative d'ajout d'une rumeur invalide:", rumorData);
            return;
        }

        // Vérifier si cette rumeur existe déjà pour éviter les doublons
        const exists = this.rumors.some(r => r.text === rumorData.text &&
                                        r.region === rumorData.region &&
                                        r.location === rumorData.location &&
                                        r.character === rumorData.character);
        if (exists) {
            console.log("Cette rumeur existe déjà.");
            return;
        }

        const newRumor = {
            ...rumorData,
            id: Date.now(), // Simple ID basé sur le timestamp
            createdAt: new Date().toISOString()
        };
        this.rumors.push(newRumor);
        this.saveRumors();
        this.renderRumors(); // Mettre à jour l'affichage
    }

    // Supprimer une rumeur par son ID
    deleteRumor(id) {
        if (confirm("Êtes-vous sûr de vouloir supprimer cette rumeur ?")) {
            this.rumors = this.rumors.filter(r => r.id !== id);
            this.saveRumors();
            this.renderRumors();
            console.log(`📖 Rumeur avec l'ID ${id} supprimée`);
        }
    }

    renderRumors() {
        console.log('📖 [renderRumors] Début du rendu des rumeurs');

        // Obtenir la carte active
        const activeMapUrl = localStorage.getItem('activeMapUrl');
        console.log('📖 [renderRumors] Carte active:', activeMapUrl);

        // Récupérer les données depuis window
        const locationsData = window.locationsData?.locations || [];
        const regionsData = window.regionsData?.regions || [];
        const charactersData = window.charactersManager?.characters || [];

        console.log('📖 [renderRumors] Données disponibles:', {
            locations: locationsData.length,
            regions: regionsData.length,
            characters: charactersData.length
        });

        // Filtrer et collecter les éléments avec rumeurs pour la carte active
        const regionsWithRumors = regionsData
            .filter(region => {
                const isActiveMap = region.mapId === activeMapUrl;
                const hasRumors = region.Rumeurs && Array.isArray(region.Rumeurs) && region.Rumeurs.length > 0;
                return isActiveMap && hasRumors;
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        const locationsWithRumors = locationsData
            .filter(location => {
                const isActiveMap = location.mapId === activeMapUrl;
                const hasRumors = location.Rumeurs && Array.isArray(location.Rumeurs) && location.Rumeurs.length > 0;
                return isActiveMap && hasRumors;
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        const charactersWithRumors = charactersData
            .filter(character => {
                const isActiveMap = character.mapId === activeMapUrl;
                // Les personnages utilisent "Rumeur" (singulier) au lieu de "Rumeurs" (pluriel)
                const hasRumor = character.Rumeur && typeof character.Rumeur === 'string' && character.Rumeur.trim().length > 0;
                const hasRumors = character.Rumeurs && Array.isArray(character.Rumeurs) && character.Rumeurs.length > 0;
                return isActiveMap && (hasRumor || hasRumors);
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        console.log('📖 [renderRumors] Éléments avec rumeurs:', {
            regions: regionsWithRumors.length,
            locations: locationsWithRumors.length,
            characters: charactersWithRumors.length
        });

        // Récupérer l'onglet Rumeurs directement
        const rumorsTab = document.getElementById('rumors-tab');
        if (!rumorsTab) {
            console.error('📖 [renderRumors] Onglet rumors-tab non trouvé !');
            return;
        }

        // Si aucun élément avec rumeurs
        if (regionsWithRumors.length === 0 && locationsWithRumors.length === 0 && charactersWithRumors.length === 0) {
            rumorsTab.innerHTML = `
                <div class="flex flex-col items-center justify-center text-center py-12 text-gray-500">
                    <i class="fas fa-comments fa-3x mb-4"></i>
                    <p class="text-lg">Aucune rumeur pour cette carte</p>
                    <p class="text-sm mt-2">Les rumeurs des lieux, régions et personnages apparaîtront ici</p>
                </div>
            `;
            console.log('📖 [renderRumors] Aucune rumeur trouvée pour la carte active');
            return;
        }

        // Charger l'état du filtre (par défaut: "selection")
        const rumorsFilter = localStorage.getItem('rumorsFilter') || 'selection';

        let rumorsHTML = '<div class="p-6 space-y-6">';

        // Ajouter le bouton de filtre
        rumorsHTML += `
            <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-300">
                <h3 class="text-lg font-semibold text-gray-800">Filtrer les rumeurs</h3>
                <div class="flex items-center space-x-3">
                    <span class="text-sm text-gray-600">Toutes</span>
                    <button id="rumors-filter-switch" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rumorsFilter === 'selection' ? 'bg-blue-600' : 'bg-gray-300'}">
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${rumorsFilter === 'selection' ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                    <span class="text-sm text-gray-600">Sélection</span>
                </div>
            </div>
        `;

        // Rendu des régions avec leurs rumeurs
        if (regionsWithRumors.length > 0) {
            rumorsHTML += `
                <div>
                    <h3 class="text-xl font-bold mb-3" style="color: #940000;">
                        <i class="fas fa-mountain mr-2"></i>Régions
                    </h3>
                    <div class="space-y-4">
            `;
            regionsWithRumors.forEach(region => {
                // Vérifier s'il y a au moins une rumeur à afficher selon le filtre
                const hasVisibleRumors = region.Rumeurs.some((rumor, index) => {
                    const isChecked = this.isRumorChecked('region', region.name, index);
                    return rumorsFilter === 'all' || isChecked;
                });

                if (!hasVisibleRumors) return;

                rumorsHTML += `
                    <div class="border-l-4 border-red-800 pl-4">
                        <h4 class="font-bold text-gray-800 mb-2">${this.escapeHtml(region.name)}</h4>
                        <div class="space-y-2">
                `;
                region.Rumeurs.forEach((rumor, index) => {
                    const isChecked = this.isRumorChecked('region', region.name, index);

                    // Filtrer selon le mode sélectionné
                    if (rumorsFilter === 'selection' && !isChecked) return;

                    const checkboxId = `rumor-region-${region.name.replace(/\s+/g, '_')}-${index}`;
                    rumorsHTML += `
                        <div class="flex items-start space-x-2">
                            <input type="checkbox"
                                   id="${checkboxId}"
                                   ${isChecked ? 'checked' : ''}
                                   onchange="window.journalManager.toggleRumorCheckbox('region', '${this.escapeHtml(region.name)}', ${index})"
                                   class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer">
                            <label for="${checkboxId}" class="text-sm cursor-pointer ${isChecked ? 'text-gray-900 font-bold' : 'text-gray-700'}">${this.escapeHtml(rumor)}</label>
                        </div>
                    `;
                });
                rumorsHTML += `
                        </div>
                    </div>
                `;
            });
            rumorsHTML += '</div></div>';
            console.log('📖 [renderRumors] Régions avec rumeurs ajoutées:', regionsWithRumors.length);
        }

        // Rendu des lieux avec leurs rumeurs
        if (locationsWithRumors.length > 0) {
            rumorsHTML += `
                <div>
                    <h3 class="text-xl font-bold mb-3" style="color: #940000;">
                        <i class="fas fa-map-marker-alt mr-2"></i>Lieux
                    </h3>
                    <div class="space-y-4">
            `;
            locationsWithRumors.forEach(location => {
                // Vérifier s'il y a au moins une rumeur à afficher selon le filtre
                const hasVisibleRumors = location.Rumeurs.some((rumor, index) => {
                    const isChecked = this.isRumorChecked('location', location.name, index);
                    return rumorsFilter === 'all' || isChecked;
                });

                if (!hasVisibleRumors) return;

                rumorsHTML += `
                    <div class="border-l-4 border-red-800 pl-4">
                        <h4 class="font-bold text-gray-800 mb-2">${this.escapeHtml(location.name)}</h4>
                        <div class="space-y-2">
                `;
                location.Rumeurs.forEach((rumor, index) => {
                    const isChecked = this.isRumorChecked('location', location.name, index);

                    // Filtrer selon le mode sélectionné
                    if (rumorsFilter === 'selection' && !isChecked) return;

                    const checkboxId = `rumor-location-${location.name.replace(/\s+/g, '_')}-${index}`;
                    rumorsHTML += `
                        <div class="flex items-start space-x-2">
                            <input type="checkbox"
                                   id="${checkboxId}"
                                   ${isChecked ? 'checked' : ''}
                                   onchange="window.journalManager.toggleRumorCheckbox('location', '${this.escapeHtml(location.name)}', ${index})"
                                   class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer">
                            <label for="${checkboxId}" class="text-sm cursor-pointer ${isChecked ? 'text-gray-900 font-bold' : 'text-gray-700'}">${this.escapeHtml(rumor)}</label>
                        </div>
                    `;
                });
                rumorsHTML += `
                        </div>
                    </div>
                `;
            });
            rumorsHTML += '</div></div>';
            console.log('📖 [renderRumors] Lieux avec rumeurs ajoutés:', locationsWithRumors.length);
        }

        // Rendu des personnages avec leurs rumeurs
        if (charactersWithRumors.length > 0) {
            rumorsHTML += `
                <div>
                    <h3 class="text-xl font-bold mb-3" style="color: #940000;">
                        <i class="fas fa-users mr-2"></i>Personnages
                    </h3>
                    <div class="space-y-4">
            `;
            charactersWithRumors.forEach(character => {
                // Convertir Rumeur (singulier) en tableau pour traitement unifié
                const rumorsArray = [];
                if (character.Rumeur && typeof character.Rumeur === 'string') {
                    rumorsArray.push(character.Rumeur);
                }
                if (character.Rumeurs && Array.isArray(character.Rumeurs)) {
                    rumorsArray.push(...character.Rumeurs);
                }

                // Vérifier s'il y a au moins une rumeur à afficher selon le filtre
                const hasVisibleRumors = rumorsArray.some((rumor, index) => {
                    const isChecked = this.isRumorChecked('character', character.name, index);
                    return rumorsFilter === 'all' || isChecked;
                });

                if (!hasVisibleRumors) return;

                rumorsHTML += `
                    <div class="border-l-4 border-red-800 pl-4">
                        <h4 class="font-bold text-gray-800 mb-2">${this.escapeHtml(character.name)}</h4>
                        <div class="space-y-2">
                `;
                rumorsArray.forEach((rumor, index) => {
                    const isChecked = this.isRumorChecked('character', character.name, index);

                    // Filtrer selon le mode sélectionné
                    if (rumorsFilter === 'selection' && !isChecked) return;

                    const checkboxId = `rumor-character-${character.name.replace(/\s+/g, '_')}-${index}`;
                    rumorsHTML += `
                        <div class="flex items-start space-x-2">
                            <input type="checkbox"
                                   id="${checkboxId}"
                                   ${isChecked ? 'checked' : ''}
                                   onchange="window.journalManager.toggleRumorCheckbox('character', '${character.name.replace(/'/g, "\\'")}', ${index})"
                                   class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer">
                            <label for="${checkboxId}" class="text-sm cursor-pointer ${isChecked ? 'text-gray-900 font-bold' : 'text-gray-700'}">${this.escapeHtml(rumor)}</label>
                        </div>
                    `;
                });
                rumorsHTML += `
                        </div>
                    </div>
                `;
            });
            rumorsHTML += '</div></div>';
            console.log('📖 [renderRumors] Personnages avec rumeurs ajoutés:', charactersWithRumors.length);
        }

        rumorsHTML += '</div>';
        rumorsTab.innerHTML = rumorsHTML;
        console.log('📖 [renderRumors] Rendu terminé avec succès');

        // Ajouter l'event listener pour le bouton switch
        const filterSwitch = document.getElementById('rumors-filter-switch');
        if (filterSwitch) {
            filterSwitch.addEventListener('click', () => {
                const currentFilter = localStorage.getItem('rumorsFilter') || 'selection';
                const newFilter = currentFilter === 'selection' ? 'all' : 'selection';
                localStorage.setItem('rumorsFilter', newFilter);
                console.log('📖 [renderRumors] Filtre changé:', newFilter);
                this.renderRumors(); // Re-render avec le nouveau filtre
            });
        }
    }


    // Méthode pour récupérer toutes les données (pour synchronisation)
    getAllData() {
        return {
            journal: this.journal, // Texte libre (adventureJournal)
            travelJournal: this.entries, // Entrées structurées (travelJournal)
            objectives: this.objectives,
            rumors: this.rumors,
            rumorsCheckboxStates: this.rumorsCheckboxStates
        };
    }
}

export default JournalManager;