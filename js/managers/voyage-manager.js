import { MAP_DISTANCE_MILES } from '../utils/constants.js';

class VoyageManager {
    constructor(domElements, constants = {}) {
        this.dom = domElements;
        this.currentDayIndex = 0;
        this.totalJourneyDays = 0;
        this.dayByDayData = [];
        this.journeyDescriptions = {}; // Pour stocker les descriptions générées
        this.currentDescriptionDay = 1; // Pour suivre le jour affiché dans la modal de description

        // Stocker les constantes passées en paramètre
        this.MAP_DISTANCE_MILES = constants.MAP_DISTANCE_MILES || MAP_DISTANCE_MILES;
        this.MAP_WIDTH = constants.MAP_WIDTH || window.MAP_WIDTH || 5103;
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const voyageBtn = this.dom.getElementById('voyage-segments-btn');
        const closeBtn = this.dom.getElementById('close-voyage-segments');

        if (voyageBtn) {
            voyageBtn.addEventListener('click', () => {
                this.dom.showModal(this.dom.voyageSegmentsModal);
                // Appliquer le style fond blanc
                const modalContent = this.dom.voyageSegmentsModal.querySelector('.bg-gray-900');
                if (modalContent) {
                    modalContent.classList.add('voyage-modal-white');
                }
                this.updateDisplay();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.dom.hideModal(this.dom.voyageSegmentsModal);
            });
        }

        // Navigation buttons (now for day navigation)
        const prevBtn = this.dom.getElementById('prev-segment-btn');
        const nextBtn = this.dom.getElementById('next-segment-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.navigateToDay(this.currentDayIndex - 1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.navigateToDay(this.currentDayIndex + 1);
            });
        }
    }

    updateDisplay() {
        const noVoyageMessage = this.dom.getElementById('no-voyage-message');
        const currentSegmentDisplay = this.dom.getElementById('current-segment-display');

        // Utiliser les variables globales existantes
        if (typeof journeyPath === 'undefined' || journeyPath.length === 0) {
            noVoyageMessage.classList.remove('hidden');
            currentSegmentDisplay.classList.add('hidden');
        } else {
            noVoyageMessage.classList.add('hidden');
            currentSegmentDisplay.classList.remove('hidden');
            this.generateJourneyData();
            this.renderCurrentDay();
        }
    }

    generateJourneyData() {
        // Calculate total journey duration using global variables
        const miles = totalPathPixels * (this.MAP_DISTANCE_MILES / this.MAP_WIDTH);
        const days = Math.ceil(miles / 20); // 20 miles per day
        this.totalJourneyDays = Math.max(1, days);

        // Récupérer ou définir la date de début du voyage
        this.journeyStartDate = this.getJourneyStartDate();

        // Build absolute timeline
        const absoluteTimeline = this.buildAbsoluteTimeline();

        // Generate day by day data
        this.dayByDayData = [];
        for (let day = 1; day <= this.totalJourneyDays; day++) {
            const dayData = {
                day: day,
                discoveries: [],
                calendarDate: this.getCalendarDateForDay(day)
            };

            // Find discoveries for this day
            absoluteTimeline.forEach(timelineItem => {
                if (timelineItem.type === 'location') {
                    if (timelineItem.absoluteDay === day) {
                        dayData.discoveries.push(timelineItem.discovery);
                    }
                } else if (timelineItem.type === 'region') {
                    if (day >= timelineItem.absoluteStartDay && day <= timelineItem.absoluteEndDay) {
                        const exists = dayData.discoveries.some(d =>
                            d.name === timelineItem.discovery.name && d.type === timelineItem.discovery.type
                        );
                        if (!exists) {
                            dayData.discoveries.push(timelineItem.discovery);
                        }
                    }
                }
            });

            this.dayByDayData.push(dayData);
        }

        // Initialize to first day if not set
        if (this.currentDayIndex >= this.totalJourneyDays) {
            this.currentDayIndex = 0;
        }
    }

    buildAbsoluteTimeline() {
        // Utiliser les variables globales journeyDiscoveries
        const discoveries = journeyDiscoveries.sort((a, b) => a.discoveryIndex - b.discoveryIndex);
        const totalMiles = totalPathPixels * (this.MAP_DISTANCE_MILES / this.MAP_WIDTH);
        const totalPathPoints = journeyPath.length;

        const absoluteTimeline = [];
        let currentAbsoluteDay = 1;

        discoveries.forEach(discovery => {
            if (discovery.type === 'location') {
                // Calculer le jour où le lieu est atteint
                const discoveryRatio = discovery.discoveryIndex / totalPathPoints;
                const discoveryDay = Math.max(1, Math.ceil(discoveryRatio * this.totalJourneyDays));

                absoluteTimeline.push({
                    discovery: discovery,
                    absoluteDay: discoveryDay,
                    type: 'location'
                });
            } else if (discovery.type === 'region') {
                // Utiliser les segments de région s'ils existent
                if (window.regionSegments && window.regionSegments.has(discovery.name)) {
                    const regionSegment = window.regionSegments.get(discovery.name);

                    // Calculer les jours basés sur les indices
                    const startRatio = regionSegment.entryIndex / totalPathPoints;
                    const endRatio = regionSegment.exitIndex / totalPathPoints;

                    const regionStartDay = Math.max(1, Math.ceil(startRatio * this.totalJourneyDays));
                    const regionEndDay = Math.max(regionStartDay, Math.ceil(endRatio * this.totalJourneyDays));

                    absoluteTimeline.push({
                        discovery: discovery,
                        absoluteStartDay: regionStartDay,
                        absoluteEndDay: regionEndDay,
                        type: 'region'
                    });
                } else {
                    // Fallback si pas de segment
                    const discoveryRatio = discovery.discoveryIndex / totalPathPoints;
                    const discoveryDay = Math.max(1, Math.ceil(discoveryRatio * this.totalJourneyDays));

                    absoluteTimeline.push({
                        discovery: discovery,
                        absoluteStartDay: discoveryDay,
                        absoluteEndDay: discoveryDay,
                        type: 'region'
                    });
                }
            }
        });

        return absoluteTimeline;
    }

    getJourneyStartDate() {
        // Vérifier si une date de début est déjà enregistrée pour ce voyage
        const savedJourneyData = this.getSavedJourneyData();
        if (savedJourneyData && savedJourneyData.startDate) {
            return savedJourneyData.startDate;
        }

        // Si pas de date sauvée, utiliser la date courante et l'enregistrer
        if (typeof isCalendarMode !== 'undefined' && isCalendarMode &&
            typeof currentCalendarDate !== 'undefined' && currentCalendarDate &&
            typeof calendarData !== 'undefined' && calendarData) {

            const startDate = {
                month: currentCalendarDate.month,
                day: currentCalendarDate.day,
                monthIndex: calendarData.findIndex(m => m.name === currentCalendarDate.month)
            };

            // Sauvegarder la date de début
            this.saveJourneyStartDate(startDate);
            return startDate;
        }

        return null;
    }

    getSavedJourneyData() {
        if (typeof journeyPath === 'undefined' || journeyPath.length === 0) return null;

        // Créer une signature unique du voyage basée sur les points du tracé
        const pathSignature = this.createPathSignature(journeyPath);
        const savedData = localStorage.getItem(`journey_${pathSignature}`);

        return savedData ? JSON.parse(savedData) : null;
    }

    saveJourneyStartDate(startDate) {
        if (typeof journeyPath === 'undefined' || journeyPath.length === 0) return;

        const pathSignature = this.createPathSignature(journeyPath);
        const journeyData = {
            startDate: startDate,
            pathSignature: pathSignature,
            savedAt: new Date().toISOString()
        };

        localStorage.setItem(`journey_${pathSignature}`, JSON.stringify(journeyData));
        console.log(`📅 Date de début du voyage sauvegardée : ${startDate.day} ${startDate.month}`);
    }

    createPathSignature(path) {
        // Créer une signature basée sur les premiers et derniers points + longueur totale
        if (path.length === 0) return 'empty';

        const start = path[0];
        const end = path[path.length - 1];
        const length = path.length;

        return `${Math.round(start.x)}_${Math.round(start.y)}_${Math.round(end.x)}_${Math.round(end.y)}_${length}`;
    }

    getCalendarDateForDay(day) {
        // Utiliser la date de début fixe du voyage plutôt que la date courante
        if (this.journeyStartDate && typeof calendarData !== 'undefined' && calendarData) {
            let monthIndex = this.journeyStartDate.monthIndex;
            let calendarDay = this.journeyStartDate.day + day - 1;

            // Navigate through months if necessary
            while (calendarDay > calendarData[monthIndex].days.length) {
                calendarDay -= calendarData[monthIndex].days.length;
                monthIndex = (monthIndex + 1) % calendarData.length;
            }

            return `${calendarDay} ${calendarData[monthIndex].name}`;
        }

        return `Jour ${day}`;
    }

    renderCurrentDay() {
        if (this.dayByDayData.length === 0) {
            this.renderEmptyDay();
            return;
        }

        const currentDay = this.dayByDayData[this.currentDayIndex];

        // Update title with calendar date
        this.updateDayTitle(currentDay);

        // Update content
        this.updateDayContent(currentDay);

        // Update navigation buttons
        this.updateNavigationButtons();

        // Update progress bar
        this.updateProgressBar();
    }

    updateDayTitle(dayData) {
        const segmentTitle = document.getElementById('segment-title');
        const dayCounter = document.getElementById('day-counter');

        if (segmentTitle) {
            segmentTitle.textContent = dayData.calendarDate;
            segmentTitle.style.color = '#940000';
        }

        if (dayCounter) {
            dayCounter.textContent = `(Jour ${this.currentDayIndex + 1} sur ${this.totalJourneyDays})`;
            dayCounter.style.color = '#9CA3AF'; // Couleur grise (gray-400)
        }
    }

    updateDayContent(dayData) {
        const segmentContent = this.dom.getElementById('segment-content');
        if (!segmentContent) return;

        let contentHtml = '';

        if (dayData.discoveries.length === 0) {
            contentHtml = '<p class="text-gray-500 text-sm italic text-center p-4">Voyage tranquille...</p>';
        } else {
            const discoveriesHtml = dayData.discoveries.map(discovery => {
                const typeText = discovery.type === 'region' ? 'Région' : 'Lieu';
                let actionText = '';

                if (discovery.proximityType) {
                    actionText = discovery.proximityType === 'traversed' ? 'traversée' : 'passage à proximité';
                } else if (discovery.type === 'region') {
                    actionText = 'traversée';
                } else {
                    actionText = 'découvert';
                }

                // Obtenir l'image pour la miniature
                const imageUrl = this.getDiscoveryImage(discovery);

                return `
                    <div class="inline-block m-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors discovery-item text-center" data-discovery-name="${discovery.name}" data-discovery-type="${discovery.type}" style="width: 180px; vertical-align: top;">
                        <div class="w-[150px] h-[150px] mx-auto mb-2 bg-gray-600 rounded-lg overflow-hidden">
                            ${imageUrl ? `<img src="${imageUrl}" alt="${discovery.name}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">Aucune image</div>'}
                        </div>
                        <div class="font-medium text-white text-sm mb-1">${discovery.name}</div>
                        <div class="text-xs text-gray-400">${typeText} - ${actionText}</div>
                    </div>
                `;
            }).join('');

            contentHtml = `
                <div class="text-left">
                    ${discoveriesHtml}
                </div>
            `;
        }

        // Récupérer le style de narration pour l'affichage
        const narrationStyle = localStorage.getItem('narrationStyle') || 'brief';
        let styleText = '';
        switch (narrationStyle) {
            case 'detailed':
                styleText = ' (Détaillée)';
                break;
            case 'brief':
                styleText = ' (Brève)';
                break;
            case 'keywords':
                styleText = ' (Points clés)';
                break;
            default:
                styleText = ' (Brève)';
        }

        // Ajouter les boutons en bas
        let buttonsHtml = `
            <div class="mt-3 pt-3 border-t border-gray-600 space-y-3">
                <div id="current-day-description" class="hidden bg-gray-800 rounded-lg p-4 mb-3">
                    <div class="text-sm text-gray-400 mb-2">Description de la journée :</div>
                    <div id="current-day-description-text" class="text-gray-200 leading-relaxed text-sm"></div>
                </div>
                <button id="describe-journey-btn" class="w-full py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors" style="background-color: white; color: #940000; border: 1px solid #940000;">
                    <span class="gemini-icon">✨</span>
                    <span>Décrire le voyage${styleText}</span>
                </button>
        `;

        // Ajouter le bouton "Terminer le voyage" si on est au dernier jour
        const isLastDay = this.currentDayIndex === (this.totalJourneyDays - 1);
        if (isLastDay) {
            buttonsHtml += `
                <button id="finish-journey-btn" class="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium flex items-center justify-center space-x-2 transition-colors">
                    <i class="fas fa-flag-checkered"></i>
                    <span>Terminer le voyage</span>
                </button>
            `;
        }

        buttonsHtml += `</div>`;
        contentHtml += buttonsHtml;

        segmentContent.innerHTML = contentHtml;

        // Setup event listeners for discoveries
        this.setupDiscoveryInteractions();

        // Setup event listener for describe journey button
        const describeBtn = this.dom.getElementById('describe-journey-btn');
        if (describeBtn) {
            describeBtn.addEventListener('click', () => {
                this.generateAllJourneyDescriptions();
            });
        }

        // Afficher la description de la journée courante si elle existe
        this.updateCurrentDayDescription();

        // Setup event listener for finish journey button if it exists
        if (isLastDay) {
            const finishBtn = this.dom.getElementById('finish-journey-btn');
            if (finishBtn) {
                finishBtn.addEventListener('click', () => {
                    this.finishJourney();
                });
            }
        }
    }

    navigateToDay(targetDayIndex) {
        if (targetDayIndex < 0 || targetDayIndex >= this.totalJourneyDays) {
            return;
        }

        this.currentDayIndex = targetDayIndex;
        this.renderCurrentDay();
    }

    updateCurrentDayDescription() {
        const descriptionContainer = document.getElementById('current-day-description');
        const descriptionText = document.getElementById('current-day-description-text');

        if (!descriptionContainer || !descriptionText) return;

        const currentDayNumber = this.currentDayIndex + 1;
        const description = this.journeyDescriptions[currentDayNumber];

        if (description) {
            descriptionText.innerHTML = description.replace(/\n/g, '<br>');
            descriptionContainer.classList.remove('hidden');
        } else {
            descriptionContainer.classList.add('hidden');
        }
    }

    updateNavigationButtons() {
        const prevBtn = this.dom.getElementById('prev-segment-btn');
        const nextBtn = this.dom.getElementById('next-segment-btn');

        if (prevBtn) {
            // Style du bouton rond
            prevBtn.style.width = '32px';
            prevBtn.style.height = '32px';
            prevBtn.style.borderRadius = '50%';
            prevBtn.style.border = '2px solid #940000';
            prevBtn.style.backgroundColor = 'white';
            prevBtn.style.color = '#940000';
            prevBtn.style.display = 'flex';
            prevBtn.style.alignItems = 'center';
            prevBtn.style.justifyContent = 'center';

            prevBtn.style.opacity = this.currentDayIndex > 0 ? '1' : '0.3';
            prevBtn.style.cursor = this.currentDayIndex > 0 ? 'pointer' : 'not-allowed';
            prevBtn.title = this.currentDayIndex > 0 ? 'Jour précédent' : 'Premier jour';
        }

        if (nextBtn) {
            // Style du bouton rond
            nextBtn.style.width = '32px';
            nextBtn.style.height = '32px';
            nextBtn.style.borderRadius = '50%';
            nextBtn.style.border = '2px solid #940000';
            nextBtn.style.backgroundColor = 'white';
            nextBtn.style.color = '#940000';
            nextBtn.style.display = 'flex';
            nextBtn.style.alignItems = 'center';
            nextBtn.style.justifyContent = 'center';

            const canGoNext = this.currentDayIndex < (this.totalJourneyDays - 1);
            nextBtn.style.opacity = canGoNext ? '1' : '0.3';
            nextBtn.style.cursor = canGoNext ? 'pointer' : 'not-allowed';
            nextBtn.title = canGoNext ? 'Jour suivant' : 'Dernier jour';
        }
    }

    updateProgressBar() {
        const progressFill = this.dom.getElementById('progress-fill');
        const progressMarker = this.dom.getElementById('progress-marker');
        const progressBar = this.dom.getElementById('voyage-progress-bar');

        if (progressBar) {
            progressBar.classList.remove('hidden');
        }

        if (progressFill && progressMarker) {
            const progressPercentage = ((this.currentDayIndex + 1) / this.totalJourneyDays) * 100;
            progressFill.style.width = `${progressPercentage}%`;
            progressFill.style.backgroundColor = '#940000';
            progressMarker.style.left = `calc(${progressPercentage}% - 12px)`;
            progressMarker.style.backgroundColor = '#940000';

            // Update tooltip
            progressMarker.title = `Progression : ${this.currentDayIndex + 1} / ${this.totalJourneyDays} jours`;
        }
    }

    renderEmptyDay() {
        const segmentTitle = this.dom.getElementById('segment-title');
        const segmentContent = this.dom.getElementById('segment-content');

        if (segmentTitle) {
            segmentTitle.textContent = 'Aucun voyage tracé';
        }

        if (segmentContent) {
            segmentContent.innerHTML = '<p class="text-gray-400 text-center p-4">Tracez un chemin sur la carte pour voir les détails du voyage.</p>';
        }

        // Hide progress bar
        const progressBar = this.dom.getElementById('voyage-progress-bar');
        if (progressBar) {
            progressBar.classList.add('hidden');
        }
    }

    setupDiscoveryInteractions() {
        const discoveryItems = document.querySelectorAll('.discovery-item');

        discoveryItems.forEach(item => {
            const discoveryName = item.dataset.discoveryName;
            const discoveryType = item.dataset.discoveryType;

            // Survol - highlight sur la carte
            item.addEventListener('mouseenter', () => {
                this.highlightDiscoveryOnMap(discoveryName, discoveryType, true);
            });

            item.addEventListener('mouseleave', () => {
                this.highlightDiscoveryOnMap(discoveryName, discoveryType, false);
            });

            // Clic - ouvrir la modal
            item.addEventListener('click', () => {
                this.openDiscoveryModal(discoveryName, discoveryType);
            });
        });
    }

    highlightDiscoveryOnMap(discoveryName, discoveryType, highlight) {
        if (discoveryType === 'location') {
            // Utiliser la fonction globale pour les lieux
            if (typeof highlightDiscoveryOnMap === 'function') {
                highlightDiscoveryOnMap(discoveryName, discoveryType, highlight);
            }
        } else if (discoveryType === 'region') {
            // Utiliser la fonction globale pour les régions
            if (typeof highlightDiscoveryOnMap === 'function') {
                highlightDiscoveryOnMap(discoveryName, discoveryType, highlight);
            }
        }
    }

    openDiscoveryModal(discoveryName, discoveryType) {
        // Fermer la modal des segments de voyage
        this.dom.hideModal(this.dom.voyageSegmentsModal);

        if (discoveryType === 'location') {
            // Trouver le lieu et ouvrir sa modal
            if (typeof locationsData !== 'undefined' && locationsData.locations) {
                const location = locationsData.locations.find(loc => loc.name === discoveryName);
                if (location) {
                    // Simuler un événement de clic sur le marqueur
                    const fakeEvent = {
                        currentTarget: { dataset: { id: location.id.toString() } },
                        stopPropagation: () => {},
                        preventDefault: () => {}
                    };

                    if (typeof showInfoBox === 'function') {
                        showInfoBox(fakeEvent);

                        // Forcer l'expansion de la info box
                        const infoBox = document.getElementById('info-box');
                        if (infoBox && !infoBox.classList.contains('expanded')) {
                            if (typeof toggleInfoBoxExpand === 'function') {
                                toggleInfoBoxExpand();
                            }
                        }
                    }
                }
            }
        } else if (discoveryType === 'region') {
            // Trouver la région et ouvrir sa modal
            if (typeof regionsData !== 'undefined' && regionsData.regions) {
                const region = regionsData.regions.find(reg => reg.name === discoveryName);
                if (region) {
                    // Simuler un événement de clic sur la région
                    const fakeEvent = {
                        stopPropagation: () => {},
                        preventDefault: () => {}
                    };

                    if (typeof showRegionInfo === 'function') {
                        showRegionInfo(fakeEvent, region);

                        // Forcer l'expansion de la info box
                        const infoBox = document.getElementById('info-box');
                        if (infoBox && !infoBox.classList.contains('expanded')) {
                            if (typeof toggleInfoBoxExpand === 'function') {
                                toggleInfoBoxExpand();
                            }
                        }
                    }
                }
            }
        }
    }

    finishJourney() {
        // Obtenir la date du dernier jour
        const lastDayData = this.dayByDayData[this.totalJourneyDays - 1];
        if (!lastDayData) return;

        // Mettre à jour la date du calendrier principal si on est en mode calendrier
        if (typeof isCalendarMode !== 'undefined' && isCalendarMode &&
            this.journeyStartDate && typeof calendarData !== 'undefined' && calendarData) {

            // Calculer la nouvelle date basée sur la date de début fixe du voyage
            let monthIndex = this.journeyStartDate.monthIndex;
            let newDay = this.journeyStartDate.day + this.totalJourneyDays - 1;

            // Naviguer à travers les mois si nécessaire
            while (newDay > calendarData[monthIndex].days.length) {
                newDay -= calendarData[monthIndex].days.length;
                monthIndex = (monthIndex + 1) % calendarData.length;
            }

            // Mettre à jour la date courante globale
            currentCalendarDate = {
                month: calendarData[monthIndex].name,
                day: newDay
            };

            // Sauvegarder la nouvelle date
            if (typeof saveCalendarToLocal === 'function') {
                saveCalendarToLocal();
            }

            // Mettre à jour l'affichage de la saison
            if (typeof updateSeasonDisplay === 'function') {
                updateSeasonDisplay();
            }

            // Programmer une synchronisation
            if (typeof scheduleAutoSync === 'function') {
                scheduleAutoSync();
            }
        }

        // Fermer la modal des segments de voyage
        this.dom.hideModal(this.dom.voyageSegmentsModal);

        // Afficher un message de confirmation (optionnel)
        console.log(`🏁 Voyage terminé ! Date finale : ${lastDayData.calendarDate}`);
    }

    async generateAllJourneyDescriptions() {
        const allJourneyData = this.collectAllJourneyData();

        // Vérifier que nous avons des données de voyage
        if (!allJourneyData.totalMiles || allJourneyData.totalMiles === 0) {
            alert('Aucun voyage à décrire. Tracez d\'abord un chemin sur la carte.');
            return;
        }

        const button = this.dom.getElementById('describe-journey-btn');

        try {
            // Utiliser le GeminiManager global
            const response = await window.geminiManager.generateJourneyDescription(allJourneyData);
            this.parseAndDisplayAllJourneyDescriptions(response);
        } catch (error) {
            console.error('Erreur lors de la génération de la description:', error);
            alert('Erreur lors de la génération de la description de voyage: ' + error.message);

            if (button) {
                window.geminiManager.resetButton(button);
            }
        }
    }

    collectJourneyDataForPrompt(currentDay) {
        // Récupérer les données du groupe d'aventuriers et de la quête
        const adventurersGroup = localStorage.getItem('adventurersGroup') || '';
        const adventurersQuest = localStorage.getItem('adventurersQuest') || '';

        // Récupérer la saison actuelle
        const currentSeason = typeof window.currentSeason !== 'undefined' ? window.currentSeason : 'printemps-debut';
        const seasonNames = {
            'printemps-debut': 'Printemps-début',
            'printemps-milieu': 'Printemps-milieu',
            'printemps-fin': 'Printemps-fin',
            'ete-debut': 'Été-début',
            'ete-milieu': 'Été-milieu',
            'ete-fin': 'Été-fin',
            'automne-debut': 'Automne-début',
            'automne-milieu': 'Automne-milieu',
            'automne-fin': 'Automne-fin',
            'hiver-debut': 'Hiver-début',
            'hiver-milieu': 'Hiver-milieu',
            'hiver-fin': 'Hiver-fin'
        };
        const seasonName = seasonNames[currentSeason] || currentSeason;

        // Collecter les découvertes avec leurs descriptions
        const discoveriesWithDescriptions = currentDay.discoveries.map(discovery => {
            let description = '';

            if (discovery.type === 'location' && typeof locationsData !== 'undefined') {
                const location = locationsData.locations.find(loc => loc.name === discovery.name);
                if (location) {
                    description = location.description || '';
                }
            } else if (discovery.type === 'region' && typeof regionsData !== 'undefined') {
                const region = regionsData.regions.find(reg => reg.name === discovery.name);
                if (region) {
                    description = region.description || '';
                }
            }

            let actionText = '';
            if (discovery.proximityType) {
                actionText = discovery.proximityType === 'traversed' ? 'traversé' : 'passage à proximité';
            } else if (discovery.type === 'region') {
                actionText = 'traversé';
            } else {
                actionText = 'découvert';
            }

            return {
                name: discovery.name,
                type: discovery.type === 'region' ? 'Région' : 'Lieu',
                action: actionText,
                description: description
            };
        });

        return {
            adventurersGroup,
            adventurersQuest,
            season: seasonName,
            dayNumber: this.currentDayIndex + 1,
            calendarDate: currentDay.calendarDate,
            discoveries: discoveriesWithDescriptions
        };
    }

    collectAllJourneyData() {
        // Récupérer les données du groupe d'aventuriers et de la quête
        const adventurersGroup = localStorage.getItem('adventurersGroup') || '';
        const adventurersQuest = localStorage.getItem('adventurersQuest') || '';

        // Récupérer la saison actuelle
        const currentSeason = typeof window.currentSeason !== 'undefined' ? window.currentSeason : 'printemps-debut';
        const seasonNames = {
            'printemps-debut': 'Printemps-début',
            'printemps-milieu': 'Printemps-milieu',
            'printemps-fin': 'Printemps-fin',
            'ete-debut': 'Été-début',
            'ete-milieu': 'Été-milieu',
            'ete-fin': 'Été-fin',
            'automne-debut': 'Automne-début',
            'automne-milieu': 'Automne-milieu',
            'automne-fin': 'Automne-fin',
            'hiver-debut': 'Hiver-début',
            'hiver-milieu': 'Hiver-milieu',
            'hiver-fin': 'Hiver-fin'
        };
        const seasonName = seasonNames[currentSeason] || currentSeason;

        // Calculer le total des miles
        const totalMiles = totalPathPixels * (this.MAP_DISTANCE_MILES / this.MAP_WIDTH);

        // Collecter les données pour toutes les journées
        const allDaysData = this.dayByDayData.map((dayData, index) => {
            const discoveriesWithDescriptions = dayData.discoveries.map(discovery => {
                let description = '';

                if (discovery.type === 'location' && typeof locationsData !== 'undefined') {
                    const location = locationsData.locations.find(loc => loc.name === discovery.name);
                    if (location) {
                        description = location.description || '';
                    }
                } else if (discovery.type === 'region' && typeof regionsData !== 'undefined') {
                    const region = regionsData.regions.find(reg => reg.name === discovery.name);
                    if (region) {
                        description = region.description || '';
                    }
                }

                let actionText = '';
                if (discovery.proximityType) {
                    actionText = discovery.proximityType === 'traversed' ? 'traversé' : 'passage à proximité';
                } else if (discovery.type === 'region') {
                    actionText = 'traversé';
                } else {
                    actionText = 'découvert';
                }

                return {
                    name: discovery.name,
                    type: discovery.type === 'region' ? 'Région' : 'Lieu',
                    action: actionText,
                    description: description
                };
            });

            return {
                dayNumber: index + 1,
                calendarDate: dayData.calendarDate,
                discoveries: discoveriesWithDescriptions
            };
        });

        return {
            adventurersGroup,
            adventurersQuest,
            season: seasonName,
            totalDays: this.totalJourneyDays,
            totalMiles: totalMiles,
            allDays: allDaysData
        };
    }

    parseAndDisplayAllJourneyDescriptions(response) {
        try {
            // Nettoyer la réponse pour extraire le JSON
            let cleanResponse = response.trim();

            // Enlever les balises de code si présentes
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            const jsonData = JSON.parse(cleanResponse);

            if (!jsonData.descriptions || !Array.isArray(jsonData.descriptions)) {
                throw new Error('Format de réponse invalide');
            }

            // Stocker les descriptions pour chaque journée
            this.journeyDescriptions = {};
            jsonData.descriptions.forEach(dayDesc => {
                this.journeyDescriptions[dayDesc.day] = dayDesc.description;
            });

            // Mettre à jour l'affichage de la description courante dans la modale
            this.updateCurrentDayDescription();

            // Changer le texte du bouton pour indiquer qu'on peut maintenant voir les détails
            const describeBtn = this.dom.getElementById('describe-journey-btn');
            if (describeBtn) {
                const buttonText = describeBtn.querySelector('span:last-child');
                if (buttonText) {
                    buttonText.textContent = 'Descriptions générées ✓';
                }

                // Désactiver le bouton pour indiquer que l'action est terminée
                describeBtn.style.opacity = '0.7';
                describeBtn.style.cursor = 'default';
            }

        } catch (error) {
            console.error('Erreur lors du parsing JSON:', error);
            console.log('Réponse reçue:', response);

            // Fallback : afficher la réponse brute
            this.displayJourneyDescription(response, false);
        }
    }

    displayJourneyDescription(description, isFromMultipleGeneration = false) {
        // Créer ou réutiliser une modal pour afficher la description
        let descriptionModal = document.getElementById('journey-description-modal');

        if (!descriptionModal) {
            // Créer la modal si elle n'existe pas
            descriptionModal = document.createElement('div');
            descriptionModal.id = 'journey-description-modal';
            descriptionModal.className = 'hidden absolute inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4';

            descriptionModal.innerHTML = `
                <div class="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col journey-description-modal-white">
                    <div class="flex justify-between items-center mb-2">
                        <h3 id="journey-description-title" class="text-xl font-bold" style="color: #940000;">Description de la journée</h3>
                        <button id="close-journey-description" class="text-gray-400 hover:text-white">
                            <i class="fas fa-times fa-lg"></i>
                        </button>
                    </div>

                    <!-- Barre de progression avec navigation -->
                    <div class="mb-4">
                        <div class="flex items-center justify-between mb-2">
                            <button id="prev-day-desc" class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm transition-colors" style="background-color: #940000; border: 2px solid #940000;">
                                <i class="fas fa-chevron-left"></i>
                            </button>

                            <div class="flex-1 mx-4">
                                <div class="bg-gray-300 h-2 rounded-full relative">
                                    <div id="journey-progress-fill" class="h-2 rounded-full transition-all duration-300" style="background-color: #940000;"></div>
                                    <div id="journey-progress-marker" class="absolute top-0 w-4 h-4 rounded-full border-2 border-white transform -translate-y-1" style="background-color: #940000;"></div>
                                </div>
                            </div>

                            <button id="next-day-desc" class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm transition-colors" style="background-color: #940000; border: 2px solid #940000;">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>

                        <div class="text-center">
                            <span id="current-day-indicator" class="text-sm font-medium" style="color: #940000;">Jour 1</span>
                        </div>
                    </div>

                    <div id="journey-description-content" class="prose prose-invert overflow-y-auto text-gray-300 leading-relaxed flex-1"></div>
                    <div id="journey-description-controls" class="mt-4 pt-4 border-t border-gray-600 flex justify-end">
                        <button id="copy-journey-description" class="px-4 py-2 rounded-lg text-white font-medium transition-colors" style="background-color: #940000; border: 1px solid #940000;">
                            <i class="fas fa-copy mr-2"></i>Copier
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(descriptionModal);

            // Setup event listeners
            document.getElementById('close-journey-description').addEventListener('click', () => {
                descriptionModal.classList.add('hidden');
            });
        }

        // Variables pour gérer la navigation
        this.currentDescriptionDay = this.currentDayIndex + 1;
        this.currentDescriptionText = description;

        // Mettre à jour le contenu et afficher la modal
        this.updateDescriptionModal(description, isFromMultipleGeneration);
        descriptionModal.classList.remove('hidden');
    }

    updateDescriptionModal(description, showNavigation = false) {
        const title = document.getElementById('journey-description-title');
        const content = document.getElementById('journey-description-content');
        const navigationControls = document.getElementById('day-navigation-controls');
        const copyButton = document.getElementById('copy-journey-description');

        // Mettre à jour le titre
        const currentDay = this.dayByDayData[this.currentDescriptionDay - 1];
        if (currentDay) {
            title.textContent = `Description - ${currentDay.calendarDate}`;
        }

        // Mettre à jour le contenu
        content.innerHTML = description.replace(/\n/g, '<br>');

        // Gérer la navigation si on a plusieurs descriptions
        if (showNavigation && this.journeyDescriptions) {
            navigationControls.classList.remove('hidden');
            this.setupDescriptionNavigation();
        } else {
            navigationControls.classList.add('hidden');
        }

        // Mettre à jour le bouton copier
        copyButton.onclick = () => {
            navigator.clipboard.writeText(description).then(() => {
                const originalText = copyButton.innerHTML;
                copyButton.innerHTML = '<i class="fas fa-check mr-2"></i>Copié !';
                setTimeout(() => {
                    copyButton.innerHTML = originalText;
                }, 2000);
            });
        };
    }

    setupDescriptionNavigation() {
        const prevBtn = document.getElementById('prev-day-desc');
        const nextBtn = document.getElementById('next-day-desc');
        const indicator = document.getElementById('current-day-indicator');
        const progressFill = document.getElementById('journey-progress-fill');
        const progressMarker = document.getElementById('journey-progress-marker');

        // Mettre à jour l'indicateur
        indicator.textContent = `Jour ${this.currentDescriptionDay}`;

        // Mettre à jour la barre de progression
        if (progressFill && progressMarker) {
            const progressPercentage = (this.currentDescriptionDay / this.totalJourneyDays) * 100;
            progressFill.style.width = `${progressPercentage}%`;
            progressMarker.style.left = `calc(${progressPercentage}% - 8px)`;
        }

        // Gérer les boutons
        if (this.currentDescriptionDay > 1) {
            prevBtn.style.opacity = '1';
            prevBtn.style.backgroundColor = '#940000';
            prevBtn.disabled = false;
        } else {
            prevBtn.style.opacity = '0.5';
            prevBtn.style.backgroundColor = '#940000';
            prevBtn.disabled = true;
        }

        if (this.currentDescriptionDay < this.totalJourneyDays) {
            nextBtn.style.opacity = '1';
            nextBtn.style.backgroundColor = '#940000';
            nextBtn.disabled = false;
        } else {
            nextBtn.style.opacity = '0.5';
            nextBtn.style.backgroundColor = '#940000';
            nextBtn.disabled = true;
        }

        // Event listeners
        prevBtn.onclick = () => {
            if (this.currentDescriptionDay > 1) {
                this.currentDescriptionDay--;
                this.showDescriptionForDay(this.currentDescriptionDay);
            }
        };

        nextBtn.onclick = () => {
            if (this.currentDescriptionDay < this.totalJourneyDays) {
                this.currentDescriptionDay++;
                this.showDescriptionForDay(this.currentDescriptionDay);
            }
        };
    }

    showDescriptionForDay(dayNumber) {
        if (this.journeyDescriptions && this.journeyDescriptions[dayNumber]) {
            this.updateDescriptionModal(this.journeyDescriptions[dayNumber], true);
        } else {
            this.updateDescriptionModal(`Aucune description disponible pour le jour ${dayNumber}.`, true);
        }
    }

    getDiscoveryImage(discovery) {
        if (discovery.type === 'location') {
            // Chercher dans les données de lieux
            if (typeof locationsData !== 'undefined' && locationsData.locations) {
                const location = locationsData.locations.find(loc => loc.name === discovery.name);
                if (location) {
                    // Support du nouveau format avec array d'images
                    if (location.images && Array.isArray(location.images) && location.images.length > 0) {
                        // Prendre la première image ou l'image par défaut
                        const defaultImg = location.images.find(img => img.isDefault);
                        return defaultImg ? defaultImg.url : location.images[0].url;
                    }
                    // Support de l'ancien format avec imageUrl
                    else if (location.imageUrl) {
                        return location.imageUrl;
                    }
                }
            }
        } else if (discovery.type === 'region') {
            // Chercher dans les données de régions
            if (typeof regionsData !== 'undefined' && regionsData.regions) {
                const region = regionsData.regions.find(reg => reg.name === discovery.name);
                if (region) {
                    // Support du nouveau format avec array d'images
                    if (region.images && Array.isArray(region.images) && region.images.length > 0) {
                        // Prendre la première image ou l'image par défaut
                        const defaultImg = region.images.find(img => img.isDefault);
                        return defaultImg ? defaultImg.url : region.images[0].url;
                    }
                    // Support de l'ancien format avec imageUrl (si applicable)
                    else if (region.imageUrl) {
                        return region.imageUrl;
                    }
                }
            }
        }

        return null;
    }
}


export default VoyageManager;