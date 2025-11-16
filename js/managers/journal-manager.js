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

            // Description du jour avec rendu Markdown
            if (day.description) {
                const descriptionHtml = this.simpleMarkdown(day.description);
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
                    <div class="bg-gray-800 border border-yellow-500 rounded-lg p-3 mb-3">
                        <div class="flex items-center text-xs text-yellow-400 mb-2">
                            <i class="fas fa-dice mr-1"></i>
                            <span class="font-semibold">Événement aléatoire</span>
                        </div>
                        <div class="text-sm prose prose-sm max-w-none" style="color: #f3f4f6 !important;">
                            <div style="color: #f3f4f6 !important;">${eventHtml}</div>
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

    // Méthode pour récupérer toutes les données (pour synchronisation)
    getAllData() {
        return this.journal;
    }
}

export default JournalManager;