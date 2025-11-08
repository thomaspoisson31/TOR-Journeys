class JournalManager {
    constructor() {
        this.journal = [];
        this.journalModal = null;
        this.journalContent = null;
        this.journalEmpty = null;
    }

    init() {
        console.log("📖 Initialisation du JournalManager");
        this.setupDOMReferences();
        this.setupEventListeners();
        this.loadJournal();
    }

    setupDOMReferences() {
        this.journalModal = document.getElementById('travel-journal-modal');
        this.journalContent = document.getElementById('journal-content');
        this.journalEmpty = document.getElementById('journal-empty');
        this.journalBtn = document.getElementById('journal-btn');
        this.closeJournalBtn = document.getElementById('close-journal-btn');
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
        this.renderJournal();
        if (this.journalModal) {
            this.journalModal.classList.remove('hidden');
        }
    }

    closeJournal() {
        if (this.journalModal) {
            this.journalModal.classList.add('hidden');
        }
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

        // Générer le HTML pour chaque voyage (version simplifiée pour la liste)
        const journalHTML = this.journal.map((journey, journeyIndex) => {
            const generatedDate = new Date(journey.generatedAt);
            const formattedDate = generatedDate.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            return `
                <div class="border border-gray-300 rounded-lg bg-white shadow-sm mb-4 hover:shadow-md transition-shadow cursor-pointer" onclick="window.journalManager.openJourneyInVoyageModal(${journeyIndex})">
                    <div class="p-4">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <h3 class="text-xl font-bold mb-1" style="color: #940000;">${journey.title}</h3>
                                <p class="text-sm text-gray-600">Généré le ${formattedDate} • ${journey.totalDays} jours</p>
                            </div>
                            <button onclick="event.stopPropagation(); window.journalManager.deleteJourney(${journeyIndex})" 
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

        // Mettre à jour le titre et sous-titre
        if (voyageTitle) {
            voyageTitle.textContent = journey.title;
        }
        if (voyageSubtitle) {
            const generatedDate = new Date(journey.generatedAt);
            const formattedDate = generatedDate.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            voyageSubtitle.innerHTML = `Généré le ${formattedDate} • <span id="voyage-total-days">${journey.totalDays}</span> jours`;
        }

        // Générer le HTML des jours
        const daysHTML = journey.days.map((day, index) => {
            let contentHtml = '';

            // Description du jour
            if (day.description) {
                contentHtml += `
                    <div class="bg-gray-50 rounded-lg p-3 mb-3">
                        <div class="text-xs text-gray-500 mb-1">📖 Description :</div>
                        <div class="text-sm text-gray-800 leading-relaxed">${day.description.replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            }

            // Événement aléatoire
            if (day.eventResult) {
                contentHtml += `
                    <div class="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-3">
                        <div class="flex items-center text-xs text-yellow-700 mb-2">
                            <i class="fas fa-dice mr-1"></i>
                            <span class="font-semibold">Événement aléatoire</span>
                        </div>
                        <div class="text-sm text-gray-800">${day.eventResult}</div>
                    </div>
                `;
            }

            // Découvertes
            if (!day.discoveries || day.discoveries.length === 0) {
                contentHtml += '<p class="text-gray-400 text-sm italic text-center py-2">Voyage tranquille...</p>';
            } else {
                contentHtml += '<div class="flex flex-wrap gap-2">';
                day.discoveries.forEach(discovery => {
                    const typeText = discovery.type === 'region' ? 'Région' : 'Lieu';
                    contentHtml += `
                        <div class="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                            <div class="text-sm">
                                <div class="font-medium text-gray-800">${discovery.name}</div>
                                <div class="text-xs text-gray-500">${typeText}</div>
                            </div>
                        </div>
                    `;
                });
                contentHtml += '</div>';
            }

            return `
                <div class="day-card mb-4 border border-gray-300 rounded-lg overflow-hidden" data-day-index="${index}">
                    <div class="day-header bg-gray-50 p-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <span class="text-lg font-bold" style="color: #940000;">Jour ${day.dayNumber}</span>
                                <span class="text-sm text-gray-600">${day.calendarDate}</span>
                                ${day.weatherSymbol ? `<span class="text-2xl" title="${day.weatherText || ''}">${day.weatherSymbol}</span>` : ''}
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

        // Masquer les boutons d'actions (car c'est un voyage du passé)
        const describeBtn = document.getElementById('describe-journey-header-btn');
        const finishBtn = document.getElementById('finish-journey-header-btn');
        if (describeBtn) describeBtn.classList.add('hidden');
        if (finishBtn) finishBtn.classList.add('hidden');

        // Afficher la modale
        voyageModal.classList.remove('hidden');
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

    // Méthode pour récupérer toutes les données (pour synchronisation)
    getAllData() {
        return this.journal;
    }
}

export default JournalManager;