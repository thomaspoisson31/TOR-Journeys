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

        // Utiliser event delegation pour gérer les clics sur les en-têtes
        // Retirer tout listener précédent pour éviter les doublons
        const oldListener = voyageDaysContent._dayHeaderClickListener;
        if (oldListener) {
            voyageDaysContent.removeEventListener('click', oldListener);
        }

        // Créer et stocker le nouveau listener
        const dayHeaderClickListener = (e) => {
            // Trouver l'en-tête de jour cliqué
            const dayHeader = e.target.closest('.day-header');
            if (!dayHeader) return;

            const dayCard = dayHeader.closest('.day-card');
            if (!dayCard) return;

            const dayIndex = parseInt(dayCard.dataset.dayIndex);
            if (isNaN(dayIndex)) {
                console.warn('⚠️ Index de jour invalide');
                return;
            }

            console.log(`📅 Clic sur jour ${dayIndex + 1} (event delegation)`);
            
            const day = journey.days[dayIndex];
            if (!day) {
                console.warn(`⚠️ Données du jour ${dayIndex + 1} non disponibles`);
                return;
            }

            // Validation des coordonnées avant déplacement
            if (!day.startCoordinates || 
                typeof day.startCoordinates.x !== 'number' || 
                typeof day.startCoordinates.y !== 'number') {
                console.warn(`⚠️ Coordonnées invalides pour le jour ${day.dayNumber}:`, day.startCoordinates);
                
                // Message utilisateur si pas de coordonnées
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
                notification.textContent = `Pas de coordonnées disponibles pour le jour ${day.dayNumber}`;
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);
                
                return;
            }

            // Mettre à jour la date du calendrier si elle existe
            if (day.calendarDate && window.calendarManager) {
                console.log(`📅 Mise à jour de la date du calendrier: ${day.calendarDate}`);
                
                // Parser la date du calendrier (format "15 Nórui")
                const [dayNumber, monthName] = day.calendarDate.split(' ');
                const parsedDay = parseInt(dayNumber);
                
                if (parsedDay && monthName && window.calendarManager.calendarData) {
                    const monthIndex = window.calendarManager.calendarData.findIndex(m => m.name === monthName);
                    if (monthIndex >= 0) {
                        window.calendarManager.currentCalendarDate = {
                            month: monthName,
                            day: parsedDay
                        };
                        window.calendarManager.currentSeason = window.calendarManager.calendarData[monthIndex].season.toLowerCase();
                        window.calendarManager.updateSeasonDisplay();
                        window.calendarManager.saveCalendarToLocal();
                    }
                }
            }

            // Déplacer le marqueur de position avec validation
            if (window.positionManager) {
                console.log(`📍 Déplacement du marqueur vers le jour ${day.dayNumber}:`, day.startCoordinates);
                
                try {
                    window.positionManager.animateToPosition(
                        day.startCoordinates.x,
                        day.startCoordinates.y,
                        800
                    );
                } catch (error) {
                    console.error(`❌ Erreur lors du déplacement du marqueur:`, error);
                }
            } else {
                console.warn(`⚠️ PositionManager non disponible`);
            }
        };

        // Attacher le listener avec event delegation
        voyageDaysContent.addEventListener('click', dayHeaderClickListener);
        voyageDaysContent._dayHeaderClickListener = dayHeaderClickListener;

        // Ajouter le curseur pointer via CSS
        const style = document.createElement('style');
        style.textContent = '.day-header { cursor: pointer; }';
        if (!document.getElementById('journal-day-header-style')) {
            style.id = 'journal-day-header-style';
            document.head.appendChild(style);
        }

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