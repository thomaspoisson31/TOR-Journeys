class JournalManager {
    constructor() {
        this.journal = [];
        this.objectives = [];
        this.journalModal = null;
        this.journalContent = null;
        this.journalEmpty = null;
        this.currentTab = 'journal-list';
        this.rumorsContent = null;
        this.rumorsEmpty = null;
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

        // Références pour l'onglet Rumeurs
        this.rumorsContent = document.getElementById('rumors-content');
        this.rumorsEmpty = document.getElementById('rumors-empty');
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
        const savedJournal = localStorage.getItem('travelJournal');
        if (savedJournal && savedJournal !== 'null' && savedJournal !== 'undefined') {
            try {
                const parsed = JSON.parse(savedJournal);
                // S'assurer que c'est bien un tableau
                this.journal = Array.isArray(parsed) ? parsed : [];
                console.log(`📖 ${this.journal.length} voyage(s) chargé(s) depuis le localStorage`);
            } catch (e) {
                console.error("Erreur lors du chargement du journal:", e);
                this.journal = [];
            }
        } else {
            // Initialiser avec un tableau vide si rien n'est sauvegardé
            this.journal = [];
            console.log("📖 Aucun voyage trouvé dans le localStorage");
        }
    }

    openJournal() {
        this.loadJournal();
        this.loadObjectives();
        this.loadRumors(); // Charger les rumeurs à l'ouverture
        this.renderJournal();
        this.renderRumors(); // Afficher les rumeurs

        // Afficher l'onglet par défaut (Journal)
        this.switchTab('journal-list');

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
            .replace(/<p>(<h[1-6]>)/g, '$1')
            .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
            .replace(/<p>(<ul>)/g, '$1')
            .replace(/(<\/ul>)<\/p>/g, '$1');
    }

    renderJournal() {
        if (!this.journalContent || !this.journalEmpty) return;

        if (this.journal.length === 0) {
            this.journalContent.classList.add('hidden');
            this.journalEmpty.classList.remove('hidden');
            return;
        }

        this.journalContent.classList.remove('hidden');
        this.journalEmpty.classList.add('hidden');

        // Trier le journal par date ascendante
        const sortedJournal = [...this.journal].sort((a, b) => {
            const dateA = a.days && a.days.length > 0 && a.days[0].calendarDate
                ? a.days[0].calendarDate
                : a.generatedAt;
            const dateB = b.days && b.days.length > 0 && b.days[0].calendarDate
                ? b.days[0].calendarDate
                : b.generatedAt;

            // Si les deux ont des dates calendrier, comparer par celles-ci
            if (typeof dateA === 'string' && typeof dateB === 'string') {
                return dateA.localeCompare(dateB);
            }

            // Sinon, comparer par generatedAt
            return new Date(a.generatedAt) - new Date(b.generatedAt);
        });

        // Générer le HTML pour chaque voyage (version simplifiée pour la liste)
        const journalHTML = sortedJournal.map((journey, sortedIndex) => {
            // Trouver l'index original pour la suppression
            const originalIndex = this.journal.indexOf(journey);

            // Déterminer les dates à afficher
            let displayStartDate = '';
            let displayEndDate = '';

            // Si c'est un voyage avec des jours et une date calendrier
            if (journey.days && journey.days.length > 0 && journey.days[0].calendarDate) {
                displayStartDate = journey.days[0].calendarDate;
                // Date de fin = dernier jour
                if (journey.days[journey.days.length - 1].calendarDate) {
                    displayEndDate = journey.days[journey.days.length - 1].calendarDate;
                }
            } else {
                // Sinon utiliser la date de génération classique
                const generatedDate = new Date(journey.generatedAt);
                displayStartDate = generatedDate.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }

            // Construire la chaîne de dates
            const dateDisplay = displayEndDate && displayEndDate !== displayStartDate
                ? `${displayStartDate} → ${displayEndDate}`
                : displayStartDate;

            // Toutes les entrées sont cliquables
            return `
                <div class="border border-gray-300 rounded-lg bg-white shadow-sm mb-4 hover:shadow-md transition-shadow cursor-pointer" onclick="window.journalManager.openJourneyInVoyageModal(${originalIndex})">
                    <div class="p-4">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <h3 class="text-xl font-bold mb-1" style="color: #940000;">${journey.title}</h3>
                                <p class="text-sm text-gray-600">${dateDisplay} • ${journey.totalDays} jour${journey.totalDays > 1 ? 's' : ''}</p>
                            </div>
                            <button onclick="event.stopPropagation(); window.journalManager.deleteJourney(${originalIndex})"
                                    class="text-red-500 hover:text-red-700 p-2"
                                    title="Supprimer ce voyage">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.journalContent.innerHTML = journalHTML;
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

    deleteJourney(index) {
        if (confirm("Êtes-vous sûr de vouloir supprimer ce voyage du journal ?")) {
            this.journal.splice(index, 1);
            localStorage.setItem('travelJournal', JSON.stringify(this.journal));

            // Marquer comme non sauvegardé
            if (typeof window.markAsUnsaved === 'function') {
                window.markAsUnsaved();
            }

            // Synchroniser avec le cloud si authentifié
            if (typeof window.scheduleAutoSync === 'function') {
                window.scheduleAutoSync();
            }

            this.renderJournal();
            console.log("📖 Voyage supprimé du journal");
        }
    }

    exportJournalAsMarkdown() {
        if (this.journal.length === 0) {
            alert("Le journal est vide");
            return;
        }

        let markdown = "# Journal de Voyage - Terre du Milieu\n\n";

        this.journal.forEach(journey => {
            const generatedDate = new Date(journey.generatedAt);
            const formattedDate = generatedDate.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            markdown += `## ${journey.title}\n`;
            markdown += `*Généré le ${formattedDate}*\n\n`;

            journey.days.forEach(day => {
                markdown += `### Jour ${day.dayNumber} / ${journey.totalDays} - ${day.calendarDate}`;
                if (day.weatherSymbol) {
                    markdown += ` ${day.weatherSymbol}`;
                }
                markdown += `\n\n`;

                if (day.eventResult) {
                    markdown += `**Événement :** ${day.eventResult}\n\n`;
                }

                if (day.description) {
                    markdown += `${day.description}\n\n`;
                }
            });

            markdown += `---\n\n`;
        });

        // Télécharger le fichier
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `journal-voyage-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);

        console.log("📖 Journal exporté en Markdown");
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

        const objectivesHTML = this.objectives.map((objective, index) => `
            <div class="objective-item ${objective.completed ? 'completed' : ''}" data-index="${index}">
                <input type="checkbox" ${objective.completed ? 'checked' : ''}
                       onchange="window.journalManager.toggleObjectiveComplete(${index})">
                <div class="objective-text">${this.escapeHtml(objective.text)}</div>
                <button onclick="window.journalManager.deleteObjective(${index})"
                        class="text-red-500 hover:text-red-700 p-2 ml-2"
                        title="Supprimer cet objectif">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        objectivesList.innerHTML = objectivesHTML;
    }

    addObjective() {
        const text = prompt("Nouvel objectif d'aventure :");
        if (text && text.trim()) {
            this.objectives.push({
                text: text.trim(),
                completed: false,
                createdAt: new Date().toISOString()
            });
            this.saveObjectives();
            this.renderObjectives();
        }
    }

    toggleObjectiveComplete(index) {
        if (this.objectives[index]) {
            this.objectives[index].completed = !this.objectives[index].completed;
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
        if (!this.rumorsContent || !this.rumorsEmpty) return;

        if (this.rumors.length === 0) {
            this.rumorsContent.innerHTML = ''; // Vider le contenu
            this.rumorsContent.classList.add('hidden');
            this.rumorsEmpty.classList.remove('hidden');
            return;
        }

        this.rumorsContent.classList.remove('hidden');
        this.rumorsEmpty.classList.add('hidden');

        // Organiser les rumeurs par catégorie
        const categorizedRumors = {
            regions: {},
            locations: {},
            characters: {}
        };

        this.rumors.forEach(rumor => {
            if (rumor.region) {
                if (!categorizedRumors.regions[rumor.region]) {
                    categorizedRumors.regions[rumor.region] = [];
                }
                categorizedRumors.regions[rumor.region].push(rumor);
            }
            if (rumor.location) {
                if (!categorizedRumors.locations[rumor.location]) {
                    categorizedRumors.locations[rumor.location] = [];
                }
                categorizedRumors.locations[rumor.location].push(rumor);
            }
            if (rumor.character) {
                if (!categorizedRumors.characters[rumor.character]) {
                    categorizedRumors.characters[rumor.character] = [];
                }
                categorizedRumors.characters[rumor.character].push(rumor);
            }
        });

        let rumorsHTML = '';

        // Rendu des régions
        const sortedRegions = Object.keys(categorizedRumors.regions).sort();
        if (sortedRegions.length > 0) {
            rumorsHTML += `
                <div>
                    <h3 class="text-xl font-bold mb-2" style="color: #940000;">Régions</h3>
                    <ul class="list-disc pl-5 space-y-1">
            `;
            sortedRegions.forEach(region => {
                rumorsHTML += `<li>${this.escapeHtml(region)}</li>`;
                // Afficher les rumeurs associées si nécessaire (optionnel)
                // categorizedRumors.regions[region].forEach(rumor => {
                //     rumorsHTML += `<li class="ml-4 text-sm text-gray-700">${this.simpleMarkdown(rumor.text)}</li>`;
                // });
            });
            rumorsHTML += '</ul></div>';
        }

        // Rendu des lieux
        const sortedLocations = Object.keys(categorizedRumors.locations).sort();
        if (sortedLocations.length > 0) {
            rumorsHTML += `
                <div>
                    <h3 class="text-xl font-bold mb-2" style="color: #940000;">Lieux</h3>
                    <ul class="list-disc pl-5 space-y-1">
            `;
            sortedLocations.forEach(location => {
                rumorsHTML += `<li>${this.escapeHtml(location)}</li>`;
                // categorizedRumors.locations[location].forEach(rumor => {
                //     rumorsHTML += `<li class="ml-4 text-sm text-gray-700">${this.simpleMarkdown(rumor.text)}</li>`;
                // });
            });
            rumorsHTML += '</ul></div>';
        }

        // Rendu des personnages
        const sortedCharacters = Object.keys(categorizedRumors.characters).sort();
        if (sortedCharacters.length > 0) {
            rumorsHTML += `
                <div>
                    <h3 class="text-xl font-bold mb-2" style="color: #940000;">Personnages</h3>
                    <ul class="list-disc pl-5 space-y-1">
            `;
            sortedCharacters.forEach(character => {
                rumorsHTML += `<li>${this.escapeHtml(character)}</li>`;
                // categorizedRumors.characters[character].forEach(rumor => {
                //     rumorsHTML += `<li class="ml-4 text-sm text-gray-700">${this.simpleMarkdown(rumor.text)}</li>`;
                // });
            });
            rumorsHTML += '</ul></div>';
        }

        this.rumorsContent.innerHTML = rumorsHTML;
    }


    // Méthode pour récupérer toutes les données (pour synchronisation)
    getAllData() {
        return {
            journal: this.journal,
            objectives: this.objectives,
            rumors: this.rumors // Inclure les rumeurs
        };
    }
}

export default JournalManager;