
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
        if (savedJournal) {
            try {
                this.journal = JSON.parse(savedJournal);
                console.log(`📖 ${this.journal.length} voyage(s) chargé(s) depuis le localStorage`);
            } catch (e) {
                console.error("Erreur lors du chargement du journal:", e);
                this.journal = [];
            }
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

        // Générer le HTML pour chaque voyage
        const journalHTML = this.journal.map((journey, journeyIndex) => {
            const generatedDate = new Date(journey.generatedAt);
            const formattedDate = generatedDate.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const daysHTML = journey.days.map(day => {
                let dayContent = '';

                // Trouver le premier lieu ou région de la journée
                let firstDiscovery = null;
                if (day.discoveries && day.discoveries.length > 0) {
                    // Prioriser les lieux, sinon prendre la première région
                    firstDiscovery = day.discoveries.find(d => d.type === 'location') || day.discoveries[0];
                }

                // Sous-titre avec jour, date, météo et première découverte
                dayContent += `<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">`;
                dayContent += `Jour ${day.dayNumber} / ${journey.totalDays} - ${day.calendarDate}`;
                if (day.weatherSymbol) {
                    dayContent += ` ${day.weatherSymbol}`;
                }
                if (firstDiscovery) {
                    dayContent += ` (${firstDiscovery.name})`;
                }
                dayContent += `</h3>`;

                // Événement du jour (si présent)
                if (day.eventResult) {
                    dayContent += `<div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3">`;
                    dayContent += `<p class="text-sm text-gray-800"><strong>Événement :</strong> ${day.eventResult}</p>`;
                    dayContent += `</div>`;
                }

                // Description du jour (si présente)
                if (day.description) {
                    dayContent += `<div class="text-gray-700 leading-relaxed mb-4">`;
                    dayContent += day.description.replace(/\n/g, '<br>');
                    dayContent += `</div>`;
                }

                return dayContent;
            }).join('');

            return `
                <div class="border border-gray-300 rounded-lg bg-white shadow-sm mb-6">
                    <div class="p-6 pb-4">
                        <div class="flex justify-between items-start">
                            <div class="flex-1 cursor-pointer" onclick="window.journalManager.toggleJourney(${journeyIndex})">
                                <div class="flex items-center">
                                    <i id="journey-icon-${journeyIndex}" class="fas fa-chevron-right text-gray-500 mr-3 transition-transform"></i>
                                    <div>
                                        <h2 class="text-2xl font-bold text-gray-900 mb-1 hover:text-blue-600 transition-colors">${journey.title}</h2>
                                        <p class="text-sm text-gray-500">Généré le ${formattedDate} • ${journey.totalDays} jours</p>
                                    </div>
                                </div>
                            </div>
                            <button onclick="window.journalManager.deleteJourney(${journeyIndex})" 
                                    class="text-red-500 hover:text-red-700 p-2 ml-4" 
                                    title="Supprimer ce voyage">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div id="journey-content-${journeyIndex}" class="hidden px-6 pb-6">
                        <hr class="border-gray-200 mb-4">
                        ${daysHTML}
                    </div>
                </div>
            `;
        }).join('');

        this.journalContent.innerHTML = journalHTML;
    }

    toggleJourney(journeyIndex) {
        const content = document.getElementById(`journey-content-${journeyIndex}`);
        const icon = document.getElementById(`journey-icon-${journeyIndex}`);
        
        if (!content || !icon) return;
        
        if (content.classList.contains('hidden')) {
            // Expand
            content.classList.remove('hidden');
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-down');
        } else {
            // Collapse
            content.classList.add('hidden');
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-right');
        }
    }

    deleteJourney(index) {
        if (confirm("Êtes-vous sûr de vouloir supprimer ce voyage du journal ?")) {
            this.journal.splice(index, 1);
            localStorage.setItem('travelJournal', JSON.stringify(this.journal));
            
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
}

export default JournalManager;
