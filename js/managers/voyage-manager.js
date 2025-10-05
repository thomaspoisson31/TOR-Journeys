import { MAP_DISTANCE_MILES } from '../utils/constants.js';
import GeminiManager from './gemini-manager.js';

class VoyageManager {
    constructor(domElements, constants = {}) {
        this.dom = domElements;
        this.currentDayIndex = 0;
        this.totalJourneyDays = 0;
        this.dayByDayData = [];
        this.journeyDescriptions = {}; // Pour stocker les descriptions générées
        this.currentDescriptionDay = 1; // Pour suivre le jour affiché dans la modal de description
        this.randomEvents = {}; // Pour stocker les événements aléatoires générés par jour

        // Stocker les constantes passées en paramètre
        this.MAP_DISTANCE_MILES = constants.MAP_DISTANCE_MILES || MAP_DISTANCE_MILES;
        this.MAP_WIDTH = constants.MAP_WIDTH || window.MAP_WIDTH || 5103;

        // Initialiser le gestionnaire Gemini
        this.geminiManager = new GeminiManager();
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

    setupDrawingListeners() {
        // Méthode appelée par main.js pour configurer les écouteurs de dessin
        // Pour l'instant, cette méthode est vide car la gestion du dessin
        // est principalement gérée par PathManager
        console.log("🎨 VoyageManager drawing listeners configured");
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
            const calendarDate = this.getCalendarDateForDay(day);
            console.log(`📅 Jour ${day}: date calendrier = "${calendarDate}"`);
            
            // Calculer les coordonnées de début et fin de journée
            const dayCoordinates = this.calculateDayCoordinates(day);
            
            const dayData = {
                day: day,
                discoveries: [],
                calendarDate: calendarDate,
                startCoordinates: dayCoordinates.start,
                endCoordinates: dayCoordinates.end
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

    calculateDayCoordinates(day) {
        // Si pas de tracé, retourner null
        if (!journeyPath || journeyPath.length === 0) {
            return { start: null, end: null };
        }

        const totalPathPoints = journeyPath.length;

        // Calculer les indices dans le tracé pour ce jour
        const startRatio = (day - 1) / this.totalJourneyDays;
        const endRatio = day / this.totalJourneyDays;

        const startIndex = Math.floor(startRatio * (totalPathPoints - 1));
        const endIndex = Math.min(
            Math.floor(endRatio * (totalPathPoints - 1)),
            totalPathPoints - 1
        );

        // Récupérer les coordonnées
        const startCoordinates = journeyPath[startIndex] ? {
            x: Math.round(journeyPath[startIndex].x),
            y: Math.round(journeyPath[startIndex].y)
        } : null;

        const endCoordinates = journeyPath[endIndex] ? {
            x: Math.round(journeyPath[endIndex].x),
            y: Math.round(journeyPath[endIndex].y)
        } : null;

        return {
            start: startCoordinates,
            end: endCoordinates
        };
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

        // Accéder aux variables globales via window
        const isCalendarMode = window.isCalendarMode;
        const currentCalendarDate = window.currentCalendarDate;
        const calendarData = window.calendarData;

        // Si pas de date sauvée, utiliser la date courante et l'enregistrer
        if (isCalendarMode && currentCalendarDate && calendarData && calendarData.length > 0) {
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
        // Accéder aux variables globales via window
        const calendarData = window.calendarData;
        const isCalendarMode = window.isCalendarMode;

        console.log(`📅 DEBUG getCalendarDateForDay(${day}):`, {
            hasJourneyStartDate: !!this.journeyStartDate,
            journeyStartDate: this.journeyStartDate,
            hasCalendarData: !!calendarData,
            calendarDataLength: calendarData?.length || 0,
            isCalendarMode: isCalendarMode
        });

        // Utiliser la date de début fixe du voyage plutôt que la date courante
        if (this.journeyStartDate && calendarData && calendarData.length > 0) {
            let monthIndex = this.journeyStartDate.monthIndex;
            let calendarDay = this.journeyStartDate.day + day - 1;

            console.log(`📅 Calcul initial: monthIndex=${monthIndex}, calendarDay=${calendarDay}`);

            // Navigate through months if necessary
            while (calendarDay > calendarData[monthIndex].days.length) {
                calendarDay -= calendarData[monthIndex].days.length;
                monthIndex = (monthIndex + 1) % calendarData.length;
                console.log(`📅 Navigation mois: nouveau monthIndex=${monthIndex}, nouveau calendarDay=${calendarDay}`);
            }

            const result = `${calendarDay} ${calendarData[monthIndex].name}`;
            console.log(`📅 Résultat final: "${result}"`);
            return result;
        }

        console.log(`📅 Pas de calendrier, retour: "Jour ${day}"`);
        return `Jour ${day}`;
    }

    getWeatherForDay(day) {
        // Accéder aux variables globales via window
        const calendarData = window.calendarData;

        if (!this.journeyStartDate || !calendarData || calendarData.length === 0) {
            return null;
        }

        let monthIndex = this.journeyStartDate.monthIndex;
        let calendarDay = this.journeyStartDate.day + day - 1;

        // Navigate through months if necessary
        while (calendarDay > calendarData[monthIndex].days.length) {
            calendarDay -= calendarData[monthIndex].days.length;
            monthIndex = (monthIndex + 1) % calendarData.length;
        }

        const month = calendarData[monthIndex];
        if (!month || !month.days) return null;

        // Gérer à la fois l'ancien format (nombres) et le nouveau format (objets)
        const dayData = month.days.find(d => {
            if (typeof d === 'object') {
                return d.day === calendarDay;
            }
            return d === calendarDay;
        });

        // Si c'est un nombre simple, retourner null (pas de données météo)
        if (typeof dayData === 'number') {
            return null;
        }

        return dayData || null;
    }

    renderCurrentDay() {
        const segmentTitle = document.getElementById('segment-title');
        const dayCounter = document.getElementById('day-counter');
        const segmentContent = document.getElementById('segment-content');
        const progressBar = document.getElementById('voyage-progress-bar');
        const voyageEndMessage = document.getElementById('voyage-end-message');
        const randomEventBtn = document.getElementById('random-event-btn');

        if (this.currentDayIndex >= this.totalJourneyDays) {
            voyageEndMessage.classList.remove('hidden');
            segmentContent.innerHTML = '';
            progressBar.classList.add('hidden');
            if (randomEventBtn) randomEventBtn.classList.add('hidden');
            return;
        }

        voyageEndMessage.classList.add('hidden');
        progressBar.classList.remove('hidden');

        const dayData = this.dayByDayData[this.currentDayIndex];
        if (!dayData) return;

        // Update header avec la méthode dédiée qui gère la saison
        this.updateDayTitle(dayData);

        // Vérifier s'il y a des événements aléatoires disponibles
        const hasRandomEvents = this.checkForRandomEvents(dayData);
        if (randomEventBtn) {
            if (hasRandomEvents) {
                randomEventBtn.classList.remove('hidden');
                // Add click listener for random event button
                randomEventBtn.addEventListener('click', () => this.triggerRandomEvent(dayData));
            } else {
                randomEventBtn.classList.add('hidden');
            }
        }

        // Update content
        this.updateDayContent(dayData);

        // Update navigation buttons
        this.updateNavigationButtons();

        // Update progress bar
        this.updateProgressBar();
    }

    updateDayTitle(dayData) {
        const segmentTitle = document.getElementById('segment-title');
        const dayCounter = document.getElementById('day-counter');

        if (segmentTitle) {
            // Utiliser le numéro de jour depuis dayData pour garantir la cohérence
            const dayNumber = dayData.day;
            
            // Récupérer la date calendrier pour ce jour spécifique
            const realCalendarDate = this.getCalendarDateForDay(dayNumber);

            console.log(`📅 updateDayTitle pour le jour ${dayNumber}: date="${realCalendarDate}"`);

            // Format: "Jour X : Date Mois Symbole de saison"
            let titleText = `Jour ${dayNumber} : ${realCalendarDate}`;
            let seasonTooltip = '';

            // Ajouter le symbole de la saison pour ce jour spécifique
            if (window.calendarManager && window.calendarData && this.journeyStartDate) {
                let monthIndex = this.journeyStartDate.monthIndex;
                let calendarDay = this.journeyStartDate.day + dayNumber - 1;

                // Naviguer à travers les mois si nécessaire
                while (calendarDay > window.calendarData[monthIndex].days.length) {
                    calendarDay -= window.calendarData[monthIndex].days.length;
                    monthIndex = (monthIndex + 1) % window.calendarData.length;
                }

                // Récupérer la saison du mois correspondant
                const monthSeason = window.calendarData[monthIndex].season.toLowerCase();
                const seasonMainName = monthSeason ? monthSeason.split('-')[0] : 'printemps';
                const seasonSymbol = window.calendarManager.seasonSymbols[seasonMainName] || '🌱';

                // Ajouter le symbole au titre
                titleText += ` ${seasonSymbol}`;

                // Tooltip avec le nom de la saison
                seasonTooltip = window.calendarManager.seasonNames[monthSeason] || '';
            }

            segmentTitle.textContent = titleText;
            segmentTitle.title = seasonTooltip;
            segmentTitle.style.color = '#940000';
            segmentTitle.style.cursor = seasonTooltip ? 'help' : 'default';
        }

        if (dayCounter) {
            dayCounter.textContent = `(sur ${this.totalJourneyDays} jours de voyage)`;
            dayCounter.style.color = '#9CA3AF'; // Couleur grise (gray-400)
        }
    }

    updateDayContent(dayData) {
        const segmentContent = this.dom.getElementById('segment-content');
        if (!segmentContent) return;

        // Vérifier si une description existe pour ce jour
        const currentDayNumber = this.currentDayIndex + 1;
        const dayDescription = this.journeyDescriptions[currentDayNumber];

        // Ajouter la météo du jour en haut
        const weatherData = this.getWeatherForDay(this.currentDayIndex + 1);
        let weatherHtml = '';
        if (weatherData && (weatherData.weather || weatherData.symbol)) {
            weatherHtml = `
                <div class="bg-blue-900 bg-opacity-30 rounded-lg p-4 mb-4">
                    <div class="flex items-center space-x-3">
                        ${weatherData.symbol ? `<div class="text-4xl">${weatherData.symbol}</div>` : ''}
                        <div class="flex-1">
                            <div class="text-xs text-blue-300 font-semibold mb-1">MÉTÉO DU JOUR</div>
                            ${weatherData.weather ? `<div class="text-base text-white font-medium">${weatherData.weather}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        // Ajouter la description du jour si elle existe
        let descriptionHtml = '';
        if (dayDescription) {
            descriptionHtml = `
                <div class="bg-gray-800 rounded-lg p-4 mb-4">
                    <div class="text-sm text-gray-400 mb-2">📖 Description de la journée :</div>
                    <div class="text-gray-200 leading-relaxed text-base">${dayDescription.replace(/\n/g, '<br>')}</div>
                </div>
            `;
        }

        let contentHtml = weatherHtml + descriptionHtml;

        if (dayData.discoveries.length === 0) {
            contentHtml += '<p class="text-gray-500 text-sm italic text-center p-4">Voyage tranquille...</p>';
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
                    <div class="inline-block m-2 p-3 rounded-lg cursor-pointer transition-colors discovery-item text-center" data-discovery-name="${discovery.name}" data-discovery-type="${discovery.type}" style="width: 180px; vertical-align: top; background-color: white;">
                        <div class="w-[150px] h-[150px] mx-auto mb-2 rounded-lg overflow-hidden" style="background-color: white;">
                            ${imageUrl ? `<img src="${imageUrl}" alt="${discovery.name}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">Aucune image</div>'}
                        </div>
                        <div class="font-medium text-sm mb-1" style="color: black;">${discovery.name}</div>
                        <div class="text-xs" style="color: #666666;">${typeText} - ${actionText}</div>
                    </div>
                `;
            }).join('');

            contentHtml += `
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
                <button id="describe-journey-btn" class="w-full py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors" style="background-color: white; color: #940000; border: 1px solid #940000;">
                    <span class="gemini-icon">✨</span>
                    <span>${dayDescription ? 'Régénérer les descriptions' : 'Décrire le voyage'}${styleText}</span>
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
                this.generateJourneyDescription();
            });
        }

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
        
        // Afficher les coordonnées de la journée dans la console
        const dayData = this.dayByDayData[this.currentDayIndex];
        if (dayData && dayData.startCoordinates && dayData.endCoordinates) {
            console.log(`📍 Jour ${dayData.day} - Coordonnées de début:`, dayData.startCoordinates);
            console.log(`📍 Jour ${dayData.day} - Coordonnées de fin:`, dayData.endCoordinates);
            
            // Déplacer le marqueur de position au début de la nouvelle journée
            if (window.positionManager) {
                window.positionManager.animateToPosition(
                    dayData.startCoordinates.x,
                    dayData.startCoordinates.y,
                    800 // Durée de l'animation en ms
                );
            }
        }
        
        this.renderCurrentDay();

        // Mettre à jour la date principale du calendrier
        this.updateMainCalendarDate();
    }

    updateMainCalendarDate() {
        // Accéder aux variables globales via window
        const isCalendarMode = window.isCalendarMode;
        const calendarData = window.calendarData;

        console.log(`📅 updateMainCalendarDate appelée - index: ${this.currentDayIndex}, isCalendarMode: ${isCalendarMode}`);

        if (!isCalendarMode || !this.journeyStartDate || !calendarData || calendarData.length === 0) {
            console.log(`📅 updateMainCalendarDate ignorée - conditions non remplies`);
            return;
        }

        // Calculer la date du jour actuel basée sur la date de début du voyage
        const currentDay = this.currentDayIndex + 1;
        let monthIndex = this.journeyStartDate.monthIndex;
        let newDay = this.journeyStartDate.day + currentDay - 1;

        console.log(`📅 Calcul: jour ${currentDay}, monthIndex initial: ${monthIndex}, newDay initial: ${newDay}`);

        // Naviguer à travers les mois si nécessaire
        while (newDay > calendarData[monthIndex].days.length) {
            newDay -= calendarData[monthIndex].days.length;
            monthIndex = (monthIndex + 1) % calendarData.length;
        }

        console.log(`📅 Après navigation: monthIndex: ${monthIndex}, newDay: ${newDay}, mois: ${calendarData[monthIndex].name}`);

        // Mettre à jour la date courante globale
        window.currentCalendarDate = {
            month: calendarData[monthIndex].name,
            day: newDay
        };

        // Mettre à jour la saison basée sur le mois du calendrier
        const monthSeason = calendarData[monthIndex].season.toLowerCase();
        window.currentSeason = monthSeason;
        
        // Sauvegarder dans localStorage
        localStorage.setItem('currentSeason', monthSeason);
        localStorage.setItem('currentCalendarDate', JSON.stringify(window.currentCalendarDate));

        // Mettre à jour le CalendarManager si disponible
        if (window.calendarManager) {
            window.calendarManager.currentSeason = monthSeason;
            window.calendarManager.currentCalendarDate = window.currentCalendarDate;
            window.calendarManager.isCalendarMode = true;
            window.calendarManager.saveCalendarToLocal();
        }

        // Mise à jour DIRECTE du DOM du header
        this.updateHeaderDisplay(calendarData[monthIndex].name, newDay, monthSeason);

        console.log(`📅 Date principale mise à jour : ${newDay} ${calendarData[monthIndex].name} (${monthSeason})`);
    }

    updateHeaderDisplay(monthName, day, season) {
        // Mettre à jour directement les éléments du DOM du header
        const calendarDateIndicator = document.getElementById('calendar-date-indicator');
        const seasonIndicator = document.getElementById('season-indicator');

        // Mettre à jour la date
        if (calendarDateIndicator) {
            calendarDateIndicator.textContent = `${day} ${monthName}`;
            calendarDateIndicator.classList.remove('hidden');
            console.log(`📅 Header date mise à jour: ${day} ${monthName}`);
        }

        // Mettre à jour le symbole de saison
        if (seasonIndicator && window.calendarManager) {
            const seasonMainName = season.split('-')[0];
            const symbol = window.calendarManager.seasonSymbols[seasonMainName] || '🌱';
            const fullName = window.calendarManager.seasonNames[season] || season;
            
            seasonIndicator.innerHTML = symbol;
            seasonIndicator.title = fullName;
            console.log(`📅 Header saison mise à jour: ${symbol} (${fullName})`);
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

        // Accéder aux variables globales via window
        const isCalendarMode = window.isCalendarMode;
        const calendarData = window.calendarData;

        // Mettre à jour la date du calendrier principal si on est en mode calendrier
        if (isCalendarMode && this.journeyStartDate && calendarData && calendarData.length > 0) {

            // Calculer la nouvelle date basée sur la date de début fixe du voyage
            let monthIndex = this.journeyStartDate.monthIndex;
            let newDay = this.journeyStartDate.day + this.totalJourneyDays - 1;

            // Naviguer à travers les mois si nécessaire
            while (newDay > calendarData[monthIndex].days.length) {
                newDay -= calendarData[monthIndex].days.length;
                monthIndex = (monthIndex + 1) % calendarData.length;
            }

            // Mettre à jour la date courante globale
            window.currentCalendarDate = {
                month: calendarData[monthIndex].name,
                day: newDay
            };

            // Sauvegarder la nouvelle date
            if (typeof window.saveCalendarToLocal === 'function') {
                window.saveCalendarToLocal();
            }

            // Mettre à jour l'affichage de la saison
            if (typeof window.updateSeasonDisplay === 'function') {
                window.updateSeasonDisplay();
            }

            // Programmer une synchronisation
            if (typeof window.scheduleAutoSync === 'function') {
                window.scheduleAutoSync();
            }
        }

        // Fermer la modal des segments de voyage
        this.dom.hideModal(this.dom.voyageSegmentsModal);

        // Afficher un message de confirmation (optionnel)
        console.log(`🏁 Voyage terminé ! Date finale : ${lastDayData.calendarDate}`);
    }

    async generateJourneyDescription() {
        if (this.dayByDayData.length === 0) {
            alert('Aucune journée de voyage à décrire.');
            return;
        }

        if (!this.geminiManager.isAvailable()) {
            alert('La fonction de génération de texte n\'est pas disponible. Vérifiez la configuration de l\'API Gemini.');
            return;
        }

        // Collecter les données pour toutes les journées
        const allJourneyData = this.collectAllJourneyDataForPrompt();

        // Créer le prompt pour Gemini
        const prompt = this.createAllJourneyDescriptionPrompt(allJourneyData);

        // Appeler Gemini
        const button = this.dom.getElementById('describe-journey-btn');
        try {
            const response = await this.geminiManager.generateContent(prompt, button, 'journey');
            this.parseAndDisplayAllJourneyDescriptions(response);
        } catch (error) {
            console.error('Erreur lors de la génération de la description:', error);
            alert(`Erreur lors de la génération de la description de voyage: ${error.message}`);
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

    collectAllJourneyDataForPrompt() {
        // Récupérer les données du groupe d'aventuriers et de la quête
        const adventurersGroup = localStorage.getItem('adventurersGroup') || '';
        const adventurersQuest = localStorage.getItem('adventurersQuest') || '';

        // Collecter les données pour toutes les journées avec saison dynamique
        const allDaysData = this.dayByDayData.map((dayData, index) => {
            // Calculer la saison spécifique de ce jour
            let daySeason = 'printemps-debut';
            if (window.calendarData && this.journeyStartDate) {
                let monthIndex = this.journeyStartDate.monthIndex;
                let calendarDay = this.journeyStartDate.day + (index + 1) - 1;

                // Naviguer à travers les mois si nécessaire
                while (calendarDay > window.calendarData[monthIndex].days.length) {
                    calendarDay -= window.calendarData[monthIndex].days.length;
                    monthIndex = (monthIndex + 1) % window.calendarData.length;
                }

                daySeason = window.calendarData[monthIndex].season.toLowerCase();
            }

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

            // Ajouter les données météo du jour
            const weatherData = this.getWeatherForDay(index + 1);

            return {
                dayNumber: index + 1,
                calendarDate: dayData.calendarDate,
                season: seasonNames[daySeason] || daySeason,
                weather: weatherData ? weatherData.weather : null,
                weatherSymbol: weatherData ? weatherData.symbol : null,
                discoveries: discoveriesWithDescriptions
            };
        });

        return {
            adventurersGroup,
            adventurersQuest,
            totalDays: this.totalJourneyDays,
            allDays: allDaysData
        };
    }

    createAllJourneyDescriptionPrompt(journeyData) {
        // Récupérer le style de narration
        const narrationStyle = localStorage.getItem('narrationStyle') || 'brief';
        console.log('📖 Style de narration pour le voyage complet:', narrationStyle);

        let prompt = `Rédige des descriptions évocatrices pour toutes les journées d'un voyage en Terre du Milieu dont le détail est présenté ci-après. 

Ces descriptions sont destinées à un meneur de jeu qui va les lire à ses joueurs pour les immerger dans l'ambiance du voyage.

**Contexte du groupe :**
${journeyData.adventurersGroup || 'Groupe d\'aventuriers non défini'}

**Nature de la quête :**
${journeyData.adventurersQuest || 'Quête non définie'}

**Durée totale du voyage :** ${journeyData.totalDays} jours

**Détail des journées :**
`;

        journeyData.allDays.forEach(dayData => {
            prompt += `\n**Jour ${dayData.dayNumber} (${dayData.calendarDate}) :**`;
            
            // Ajouter la saison spécifique du jour
            if (dayData.season) {
                prompt += `\n- Saison : ${dayData.season}`;
            }

            // Ajouter la météo si disponible
            if (dayData.weather) {
                prompt += `\n- Météo : ${dayData.weatherSymbol || ''} ${dayData.weather}`;
            }

            if (dayData.discoveries.length > 0) {
                prompt += `\n- Lieux et régions (dans l'ordre) :`;
                dayData.discoveries.forEach(discovery => {
                    prompt += `\n  • ${discovery.type} : ${discovery.name} (${discovery.action})`;
                    if (discovery.description) {
                        prompt += `\n    Description : ${discovery.description}`;
                    }
                });
            } else {
                prompt += `\n- Voyage tranquille sans découverte particulière`;
            }
            prompt += '\n';
        });

        // Ajouter les instructions spécifiques selon le style de narration
        let styleInstructions = '';
        switch (narrationStyle) {
            case 'detailed':
                styleInstructions = `

**STYLE DE NARRATION : DÉTAILLÉE**
- Rédigez des descriptions riches et immersives de plusieurs paragraphes par journée
- Rédigez au présent de la deuxième personne du pluriel ("Vous traversez...")
- Développez l'atmosphère avec des détails sensoriels précis
- Explorez les émotions et réflexions intimes des personnages
- Utilisez un style littéraire évocateur et poétique
- Chaque description doit faire 3-4 paragraphes pour une immersion maximale
- Variez les tons : contemplatif, aventureux, mélancolique selon les découvertes`;
                break;
            case 'brief':
                styleInstructions = `

**STYLE DE NARRATION : BRÈVE**
- Rédigez des descriptions concises mais évocatrices (1-2 paragraphes par journée)
- Rédigez au présent de la deuxième personne du pluriel ("Vous traversez...")
- Concentrez-vous sur l'essentiel : ambiance, découvertes importantes, ressenti général
- Style narratif fluide et accessible, idéal pour une lecture rapide en jeu
- Capturez l'essence de chaque journée sans s'attarder sur les détails`;
                break;
            case 'keywords':
                styleInstructions = `

**STYLE DE NARRATION : POINTS CLÉS**
- Organisez l'information sous forme de listes structurées de mots-clés thématiques
- Ne faites pas de phrases complètes, mais des listes de mots-clés et expressions évocatrices
- Utilisez des puces et des catégories claires (Paysage, Météo, Ambiance, Événements, etc.)
- Présentez les informations de manière synthétique et facilement exploitable
- Optimisé pour une consultation rapide et une improvisation en jeu
- Format : utilisez des tirets et des catégories courtes pour structurer l'information`;
                break;
        }

        prompt += `
**Instructions importantes :**
- Répondez UNIQUEMENT avec un objet JSON valide de cette structure :
{
  "descriptions": [
    {
      "day": 1,
      "description": "Description de la journée 1..."
    },
    {
      "day": 2,
      "description": "Description de la journée 2..."
    }
  ]
}

${styleInstructions}

**Règles générales :**
- Variez les descriptions selon les jours en mettant en avant :
  • Tantôt des descriptions de paysages
  • Tantôt le temps qu'il fait
  • Tantôt les impressions de voyage
  • Tantôt l'accumulation de la fatigue
  • Tantôt l'attitude de certains membres du groupe

- Rédigez au présent de la 2ème personne du pluriel ("Vous traversez...")
- Faites appel à plusieurs sens (vue, ouïe, odorat, toucher) pour une immersion totale
- Évoquez l'état physique et mental des personnages en tenant compte du nombre de jours de voyage accumulés
- **INTÉGREZ SUBTILEMENT la météo et la saison dans vos descriptions** :
  • Ne répétez pas littéralement le texte météo fourni
  • Traduisez la météo en sensations et détails atmosphériques (vent sur le visage, boue sous les pieds, etc.)
  • Adaptez la description des paysages selon la saison (couleurs, végétation, ambiance)
  • Montrez l'impact de la météo sur le voyage sans la mentionner explicitement
- Le ton doit être immersif et narratif, adapté à une lecture en jeu de rôle
- Évitez les redondances entre les descriptions des différentes journées
- Assurez-vous que chaque description soit unique et apporte sa propre atmosphère

Répondez UNIQUEMENT avec le JSON, sans texte d'introduction ni de conclusion.`;

        return prompt;
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

            // Sauvegarder le voyage dans le journal
            this.saveJourneyToJournal();

            // Rafraîchir l'affichage du jour courant pour montrer la description
            this.renderCurrentDay();

        } catch (error) {
            console.error('Erreur lors du parsing JSON:', error);
            console.log('Réponse reçue:', response);

            // Fallback : afficher la réponse brute
            this.displayJourneyDescription(response, false);
        }
    }

    saveJourneyToJournal() {
        if (!this.dayByDayData || this.dayByDayData.length === 0) {
            console.log("⚠️ Pas de données de voyage à sauvegarder");
            return;
        }

        // Vérifier que journeyPath existe et n'est pas vide
        if (typeof journeyPath === 'undefined' || !journeyPath || journeyPath.length === 0) {
            console.log("⚠️ Pas de tracé de voyage disponible");
            return;
        }

        // Créer une signature unique pour ce tracé
        const pathSignature = this.createPathSignature(journeyPath);
        console.log("🔑 Signature du tracé:", pathSignature);

        // Trouver le lieu/région de départ
        const firstDay = this.dayByDayData[0];
        let startLocation = "Point de départ";
        if (firstDay.discoveries && firstDay.discoveries.length > 0) {
            startLocation = firstDay.discoveries[0].name;
        }

        // Trouver le lieu/région d'arrivée
        const lastDay = this.dayByDayData[this.dayByDayData.length - 1];
        let endLocation = "Point d'arrivée";
        if (lastDay.discoveries && lastDay.discoveries.length > 0) {
            const lastDiscoveries = lastDay.discoveries;
            endLocation = lastDiscoveries[lastDiscoveries.length - 1].name;
        }

        // Construire le voyage pour le journal
        const journeyEntry = {
            title: `Voyage de ${startLocation} à ${endLocation}`,
            generatedAt: new Date().toISOString(),
            totalDays: this.totalJourneyDays,
            pathSignature: pathSignature, // Ajouter la signature pour identifier le tracé
            days: []
        };

        // Ajouter chaque jour
        this.dayByDayData.forEach((dayData, index) => {
            const dayNumber = index + 1;
            const weatherData = this.getWeatherForDay(dayNumber);
            
            // Récupérer l'événement aléatoire depuis le stockage
            const eventResult = this.randomEvents[dayNumber] || null;

            journeyEntry.days.push({
                dayNumber: dayNumber,
                calendarDate: dayData.calendarDate,
                weatherSymbol: weatherData ? weatherData.symbol : null,
                weatherText: weatherData ? weatherData.weather : null,
                eventResult: eventResult,
                description: this.journeyDescriptions[dayNumber] || null
            });
        });

        // Récupérer le journal existant
        let journal = [];
        const savedJournal = localStorage.getItem('travelJournal');
        if (savedJournal) {
            try {
                journal = JSON.parse(savedJournal);
            } catch (e) {
                console.error("Erreur lors du parsing du journal:", e);
            }
        }

        // Vérifier si ce tracé existe déjà dans le journal
        console.log("🔍 Recherche de voyage existant avec signature:", pathSignature);
        console.log("📚 Voyages existants dans le journal:", journal.length);
        journal.forEach((entry, idx) => {
            console.log(`  ${idx}: ${entry.title} (signature: ${entry.pathSignature})`);
        });
        
        const existingIndex = journal.findIndex(entry => entry.pathSignature === pathSignature);
        console.log("🔍 Index trouvé:", existingIndex);
        
        if (existingIndex !== -1) {
            // Mettre à jour l'entrée existante (régénération des descriptions)
            journal[existingIndex] = journeyEntry;
            console.log("📖 Voyage mis à jour dans le journal:", journeyEntry.title);
        } else {
            // Ajouter le nouveau voyage
            journal.unshift(journeyEntry); // Ajouter au début (plus récent)
            console.log("📖 Nouveau voyage ajouté au journal:", journeyEntry.title);
        }

        // Sauvegarder
        localStorage.setItem('travelJournal', JSON.stringify(journal));
        console.log("💾 Journal sauvegardé avec", journal.length, "voyage(s)");

        // Synchroniser avec le cloud si authentifié
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
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
                        // Prioriser l'image de type "vignette"
                        const thumbnailImg = location.images.find(img => img.type === 'vignette');
                        if (thumbnailImg) {
                            return thumbnailImg.url;
                        }
                        // Sinon, prendre l'image par défaut
                        const defaultImg = location.images.find(img => img.isDefault);
                        if (defaultImg) {
                            return defaultImg.url;
                        }
                        // En dernier recours, la première image
                        return location.images[0].url;
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
                        // Prioriser l'image de type "vignette"
                        const thumbnailImg = region.images.find(img => img.type === 'vignette');
                        if (thumbnailImg) {
                            return thumbnailImg.url;
                        }
                        // Sinon, prendre l'image par défaut
                        const defaultImg = region.images.find(img => img.isDefault);
                        if (defaultImg) {
                            return defaultImg.url;
                        }
                        // En dernier recours, la première image
                        return region.images[0].url;
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

    checkForRandomEvents(dayData) {
        // Check if any discovery has random events in the original data
        return dayData.discoveries.some(discovery => {
            if (discovery.type === 'location' && typeof locationsData !== 'undefined') {
                const location = locationsData.locations.find(loc => loc.name === discovery.name);
                return location && location.Evenements_Voyage && location.Evenements_Voyage.length > 0;
            } else if (discovery.type === 'region' && typeof regionsData !== 'undefined') {
                const region = regionsData.regions.find(reg => reg.name === discovery.name);
                return region && region.Evenements_Voyage && region.Evenements_Voyage.length > 0;
            }
            return false;
        });
    }

    triggerRandomEvent(dayData) {
        // Filter discoveries that have random events in the original data
        const possibleEventLocations = dayData.discoveries.filter(discovery => {
            if (discovery.type === 'location' && typeof locationsData !== 'undefined') {
                const location = locationsData.locations.find(loc => loc.name === discovery.name);
                return location && location.Evenements_Voyage && location.Evenements_Voyage.length > 0;
            } else if (discovery.type === 'region' && typeof regionsData !== 'undefined') {
                const region = regionsData.regions.find(reg => reg.name === discovery.name);
                return region && region.Evenements_Voyage && region.Evenements_Voyage.length > 0;
            }
            return false;
        });

        if (possibleEventLocations.length === 0) {
            console.warn("Aucun événement aléatoire disponible pour ce jour.");
            return;
        }

        // Choose a random location/region that has events
        const selectedDiscovery = possibleEventLocations[Math.floor(Math.random() * possibleEventLocations.length)];
        
        // Get the actual location/region data with events
        let eventsList = [];
        if (selectedDiscovery.type === 'location' && typeof locationsData !== 'undefined') {
            const location = locationsData.locations.find(loc => loc.name === selectedDiscovery.name);
            eventsList = location.Evenements_Voyage || [];
        } else if (selectedDiscovery.type === 'region' && typeof regionsData !== 'undefined') {
            const region = regionsData.regions.find(reg => reg.name === selectedDiscovery.name);
            eventsList = region.Evenements_Voyage || [];
        }

        // Choose a random event from the selected location's events
        const randomEvent = eventsList[Math.floor(Math.random() * eventsList.length)];

        // Stocker l'événement pour ce jour (index + 1 car les jours commencent à 1)
        const currentDayNumber = this.currentDayIndex + 1;
        this.randomEvents[currentDayNumber] = randomEvent['Résultat'] || '';
        console.log(`📖 Événement aléatoire sauvegardé pour le jour ${currentDayNumber}:`, this.randomEvents[currentDayNumber]);

        // Format the event display similar to "Événement de voyage" in infobox
        const eventHtml = `
            <div id="random-event-display" class="bg-yellow-800 bg-opacity-30 rounded-lg p-4 mb-4" style="font-family: 'Merriweather', serif;">
                <h4 class="text-lg font-bold mb-3 text-yellow-300" style="font-family: 'Merriweather', serif; font-size: 1.25rem;">
                    <i class="fas fa-dice mr-2"></i>Événement aléatoire
                </h4>
                <div class="mb-2" style="font-family: 'Merriweather', serif; font-size: 1rem;">
                    <span class="font-semibold text-yellow-200">Dé du destin :</span>
                    <span class="ml-2 text-white">${randomEvent['Dé du destin'] || '-'}</span>
                </div>
                <div class="mb-2" style="font-family: 'Merriweather', serif; font-size: 1rem;">
                    <span class="font-semibold text-yellow-200">Résultat :</span>
                    <span class="ml-2 text-white">${randomEvent['Résultat'] || '-'}</span>
                </div>
                <div style="font-family: 'Merriweather', serif; font-size: 1rem;">
                    <span class="font-semibold text-yellow-200">Description :</span>
                    <p class="mt-1 text-gray-200 leading-relaxed">${randomEvent['Description'] || '-'}</p>
                </div>
            </div>
        `;

        // Check if there's already a random event displayed
        const segmentContent = document.getElementById('segment-content');
        const existingEvent = segmentContent.querySelector('#random-event-display');
        
        if (existingEvent) {
            // Replace the existing event
            existingEvent.outerHTML = eventHtml;
        } else {
            // Insert the event display below the weather info
            const weatherDiv = segmentContent.querySelector('.bg-blue-900');

            if (weatherDiv) {
                // Insert after the weather div
                weatherDiv.insertAdjacentHTML('afterend', eventHtml);
            } else {
                // If no weather div, insert at the beginning of the content (after description if any)
                const descriptionDiv = segmentContent.querySelector('.bg-gray-800');
                if (descriptionDiv) {
                    descriptionDiv.insertAdjacentHTML('afterend', eventHtml);
                } else {
                    // If no description either, insert at the very beginning
                    segmentContent.insertAdjacentHTML('afterbegin', eventHtml);
                }
            }
        }
    }
}


export default VoyageManager;