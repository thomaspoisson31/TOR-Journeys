class VoyageManager {
    constructor(domElements) {
        this.dom = domElements;
        this.currentDayIndex = 0;
        this.totalJourneyDays = 0;
        this.dayByDayData = [];
        this.journeyDescriptions = {}; // Pour stocker les descriptions générées
        this.currentDescriptionDay = 1; // Pour suivre le jour affiché dans la modal de description
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
        console.log('🔧 [DEBUG] === DÉBUT updateDisplay() ===');
        console.log('🔧 [DEBUG] journeyPath défini?', typeof journeyPath !== 'undefined');
        console.log('🔧 [DEBUG] journeyPath.length:', typeof journeyPath !== 'undefined' ? journeyPath.length : 'undefined');

        const noVoyageMessage = this.dom.getElementById('no-voyage-message');
        const currentSegmentDisplay = this.dom.getElementById('current-segment-display');

        // Utiliser les variables globales existantes
        if (typeof journeyPath === 'undefined' || journeyPath.length === 0) {
            console.log('🔧 [DEBUG] ❌ Pas de trajet - affichage du message "no voyage"');
            noVoyageMessage.classList.remove('hidden');
            currentSegmentDisplay.classList.add('hidden');
        } else {
            console.log('🔧 [DEBUG] ✅ Trajet détecté - génération des données de voyage');
            noVoyageMessage.classList.add('hidden');
            currentSegmentDisplay.classList.remove('hidden');
            this.generateJourneyData();
            this.renderCurrentDay();
        }
        console.log('🔧 [DEBUG] === FIN updateDisplay() ===');
    }

    generateJourneyData() {
        if (typeof journeyPath === 'undefined' || journeyPath.length === 0) {
            this.totalJourneyDays = 0;
            this.dayByDayData = [];
            return;
        }

        // Calculer la distance totale et les jours
        const totalPixels = typeof totalPathPixels !== 'undefined' ? totalPathPixels : 0;
        const totalMiles = totalPixels * (MAP_DISTANCE_MILES / MAP_WIDTH);
        this.totalJourneyDays = Math.ceil(totalMiles / 20); // 20 miles par jour

        console.log(`🗓️ Voyage de ${this.totalJourneyDays} jours calculé`);

        // Calculer les découvertes jour par jour
        const dailyDiscoveries = this.calculateDailyDiscoveries();

        // Générer les données pour chaque jour
        this.dayByDayData = [];
        for (let day = 1; day <= this.totalJourneyDays; day++) {
            const calendarDate = this.getCalendarDateForDay(day);

            this.dayByDayData.push({
                day: day,
                calendarDate: calendarDate,
                discoveries: dailyDiscoveries[day] || []
            });
        }

        console.log(`📅 Données journalières générées avec découvertes:`, this.dayByDayData);
    }

    buildAbsoluteTimeline() {
        console.log('🔧 [DEBUG] Construction de la timeline absolue - début');

        // Utiliser les variables globales journeyDiscoveries
        const discoveries = journeyDiscoveries.sort((a, b) => a.discoveryIndex - b.discoveryIndex);
        const totalMiles = totalPathPixels * (MAP_DISTANCE_MILES / MAP_WIDTH);
        const totalPathPoints = journeyPath.length;

        console.log(`🔧 [DEBUG] Découvertes brutes:`, discoveries);
        console.log(`🔧 [DEBUG] Points de trajet total: ${totalPathPoints}, voyage total: ${this.totalJourneyDays} jours`);
        console.log(`🔧 [DEBUG] Segments de région disponibles:`, window.regionSegments);

        // Forcer la mise à jour des segments de région si ils sont vides
        if (!window.regionSegments || Object.keys(window.regionSegments).size === 0) {
            console.log(`🔧 [DEBUG] ⚠️ Segments de région vides, tentative de reconstruction...`);
            if (typeof updateDiscoveriesChronologically === 'function') {
                console.log(`🔧 [DEBUG] Appel de updateDiscoveriesChronologically()...`);
                updateDiscoveriesChronologically();
                console.log(`🔧 [DEBUG] Segments de région après reconstruction:`, window.regionSegments);
            } else {
                console.log(`🔧 [DEBUG] updateDiscoveriesChronologically non disponible, reconstruction manuelle...`);
                this.rebuildRegionSegments();
            }
        }

        const absoluteTimeline = [];
        let currentAbsoluteDay = 1;

        console.log(`🔧 [DEBUG] DÉBUT BOUCLE - Total découvertes à traiter: ${discoveries.length}`);
        discoveries.forEach((discovery, index) => {
            console.log(`🔧 [DEBUG] === Traitement découverte ${index}: ${discovery.name} (${discovery.type}) ===`);
            console.log(`🔧 [DEBUG] Objet découverte complet:`, discovery);
            console.log(`🔧 [DEBUG] Type exact: "${discovery.type}", Longueur: ${discovery.type?.length}`);

            if (discovery.type === 'location') {
                console.log(`🔧 [DEBUG] 🎯 LOCATION DÉTECTÉE: ${discovery.name}`);
                // Calculer le jour où le lieu est atteint
                const discoveryRatio = discovery.discoveryIndex / totalPathPoints;
                const discoveryDay = Math.max(1, Math.ceil(discoveryRatio * this.totalJourneyDays));

                console.log(`🔧 [DEBUG] Lieu ${discovery.name}: index ${discovery.discoveryIndex}, ratio ${discoveryRatio.toFixed(3)}, jour ${discoveryDay}`);

                absoluteTimeline.push({
                    discovery: discovery,
                    absoluteDay: discoveryDay,
                    type: 'location'
                });
            } else if (discovery.type === 'region') {
                console.log(`🔧 [DEBUG] 🎯 RÉGION DÉTECTÉE: ${discovery.name}`);
                console.log(`🔧 [DEBUG] Région ${discovery.name}: index découverte ${discovery.discoveryIndex}`);
                console.log(`🔧 [DEBUG] window.regionSegments existe:`, !!window.regionSegments);
                console.log(`🔧 [DEBUG] regionSegments contient ${discovery.name}:`, window.regionSegments ? window.regionSegments.has(discovery.name) : 'N/A');

                // Utiliser les segments de région s'ils existent
                if (window.regionSegments && window.regionSegments.has(discovery.name)) {
                    const regionSegment = window.regionSegments.get(discovery.name);
                    console.log(`🔧 [DEBUG] Segment trouvé pour ${discovery.name}:`, regionSegment);

                    // Calculer les jours basés sur les indices
                    const startRatio = regionSegment.entryIndex / totalPathPoints;
                    const endRatio = regionSegment.exitIndex / totalPathPoints;

                    const regionStartDay = Math.max(1, Math.ceil(startRatio * this.totalJourneyDays));
                    // Utiliser Math.ceil pour endRatio aussi, mais s'assurer que ce soit au moins startDay + durée minimale si la région est traversée
                    const regionEndDay = Math.max(regionStartDay, Math.ceil(endRatio * this.totalJourneyDays));

                    // Si les indices d'entrée et de sortie sont significativement différents, 
                    // s'assurer que la région apparaît sur plusieurs jours
                    const indexDifference = regionSegment.exitIndex - regionSegment.entryIndex;
                    const pathPointsPerDay = totalPathPoints / this.totalJourneyDays;

                    console.log(`🔧 [DEBUG] Région ${discovery.name}: entrée index ${regionSegment.entryIndex} (ratio ${startRatio.toFixed(3)}, jour ${regionStartDay}), sortie index ${regionSegment.exitIndex} (ratio ${endRatio.toFixed(3)}, jour ${regionEndDay})`);
                    console.log(`🔧 [DEBUG] Région ${discovery.name}: différence d'indices ${indexDifference}, points par jour ${pathPointsPerDay.toFixed(2)}`);

                    // Calculer une durée minimale basée sur la différence d'indices et le ratio de traversée
                    let finalRegionEndDay = regionEndDay;

                    // Calculer le pourcentage du trajet que représente cette région
                    const regionTraversalRatio = indexDifference / totalPathPoints;
                    console.log(`🔧 [DEBUG] Région ${discovery.name}: ratio de traversée ${(regionTraversalRatio * 100).toFixed(1)}% (${indexDifference} points sur ${totalPathPoints})`);

                    // Forcer une durée minimale basée sur le ratio de traversée
                    if (regionTraversalRatio > 0.05) { // Si plus de 5% du trajet
                        // Calculer une durée proportionnelle au trajet total
                        const proportionalDays = Math.max(2, Math.ceil(regionTraversalRatio * this.totalJourneyDays));
                        finalRegionEndDay = Math.max(regionEndDay, regionStartDay + proportionalDays - 1);

                        // S'assurer que ça ne dépasse pas la durée totale du voyage
                        finalRegionEndDay = Math.min(finalRegionEndDay, this.totalJourneyDays);

                        console.log(`🔧 [DEBUG] Région ${discovery.name}: traversée significative (${(regionTraversalRatio * 100).toFixed(1)}%), durée proportionnelle ${proportionalDays} jours, jour fin ajusté à ${finalRegionEndDay}`);
                    }

                    // Règle spéciale pour les très longues traversées (plus de 20% du trajet)
                    if (regionTraversalRatio > 0.2) {
                        const longTraversalDays = Math.max(4, Math.ceil(regionTraversalRatio * this.totalJourneyDays * 1.2));
                        finalRegionEndDay = Math.max(finalRegionEndDay, regionStartDay + longTraversalDays - 1);
                        finalRegionEndDay = Math.min(finalRegionEndDay, this.totalJourneyDays);
                        console.log(`🔧 [DEBUG] Région ${discovery.name}: très longue traversée (${(regionTraversalRatio * 100).toFixed(1)}%), durée étendue à ${longTraversalDays} jours, jour fin final ${finalRegionEndDay}`);
                    }

                    // Assurer une durée minimale de 2 jours pour toute région traversée (sauf si voyage très court)
                    if (this.totalJourneyDays > 3 && finalRegionEndDay === regionStartDay) {
                        finalRegionEndDay = Math.min(regionStartDay + 1, this.totalJourneyDays);
                        console.log(`🔧 [DEBUG] Région ${discovery.name}: durée minimale forcée à 2 jours (${regionStartDay}-${finalRegionEndDay})`);
                    }

                    const timelineItem = {
                        discovery: discovery,
                        absoluteStartDay: regionStartDay,
                        absoluteEndDay: finalRegionEndDay,
                        type: 'region'
                    };

                    absoluteTimeline.push(timelineItem);
                    console.log(`🔧 [DEBUG] ✅ AJOUTÉ À LA TIMELINE - Région ${discovery.name}: période réelle ${timelineItem.absoluteStartDay}-${timelineItem.absoluteEndDay}`);
                } else {
                    console.log(`🔧 [DEBUG] Pas de segment pour ${discovery.name}, utilisation fallback`);

                    // Fallback si pas de segment
                    const discoveryRatio = discovery.discoveryIndex / totalPathPoints;
                    const discoveryDay = Math.max(1, Math.ceil(discoveryRatio * this.totalJourneyDays));

                    console.log(`🔧 [DEBUG] Région ${discovery.name} (fallback): ratio ${discoveryRatio.toFixed(3)}, jour ${discoveryDay}`);

                    absoluteTimeline.push({
                        discovery: discovery,
                        absoluteStartDay: discoveryDay,
                        absoluteEndDay: discoveryDay,
                        type: 'region'
                    });
                }
            } else {
                console.log(`🔧 [DEBUG] ⚠️ TYPE NON RECONNU: "${discovery.type}" pour ${discovery.name} - discovery:`, discovery);
            }
        });

        console.log('🔧 [DEBUG] Timeline absolue construite:', absoluteTimeline);
        console.log('🔧 [DEBUG] Construction de la timeline absolue - terminée');
        return absoluteTimeline;
    }

    rebuildRegionSegments() {
        console.log(`🔧 [DEBUG] === DÉBUT rebuildRegionSegments ===`);

        if (!window.regionsData || !window.regionsData.regions) {
            console.log(`🔧 [DEBUG] ❌ regionsData non disponible`);
            return;
        }

        // Initialiser regionSegments si nécessaire
        if (!window.regionSegments) {
            window.regionSegments = new Map();
        }

        // Fonction pour vérifier si un point est dans un polygone
        const isPointInPolygon = (point, polygon) => {
            let inside = false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                const xi = polygon[i].x, yi = polygon[i].y;
                const xj = polygon[j].x, yj = polygon[j].y;

                if (((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                    inside = !inside;
                }
            }
            return inside;
        };

        const currentRegions = new Set();
        let regionSegments = new Map();

        console.log(`🔧 [DEBUG] Traitement de ${journeyPath.length} points du trajet...`);

        // Parcourir tous les points du trajet
        for (let i = 0; i < journeyPath.length; i++) {
            const currentPoint = journeyPath[i];
            let pointRegions = new Set();

            // Vérifier dans quelles régions se trouve ce point
            window.regionsData.regions.forEach(region => {
                if (region.points && region.points.length >= 3) {
                    if (isPointInPolygon(currentPoint, region.points)) {
                        pointRegions.add(region.name);

                        // Si cette région n'était pas encore traversée
                        if (!currentRegions.has(region.name)) {
                            currentRegions.add(region.name);
                            // Marquer le point d'entrée
                            if (!regionSegments.has(region.name)) {
                                regionSegments.set(region.name, {
                                    entryIndex: i,
                                    exitIndex: i // sera mis à jour
                                });
                                console.log(`🔧 [DEBUG] Région ${region.name} - entrée à l'index ${i}`);
                            }
                        }
                    }
                }
            });

            // Mettre à jour les points de sortie pour les régions qui ne sont plus traversées
            for (let regionName of currentRegions) {
                if (!pointRegions.has(regionName)) {
                    // Cette région n'est plus traversée, marquer le point de sortie
                    if (regionSegments.has(regionName)) {
                        regionSegments.get(regionName).exitIndex = i - 1;
                        console.log(`🔧 [DEBUG] Région ${regionName} - sortie à l'index ${i - 1}`);
                    }
                    currentRegions.delete(regionName);
                }
            }

            // Mettre à jour les index de sortie pour toutes les régions encore traversées
            for (let regionName of pointRegions) {
                if (regionSegments.has(regionName)) {
                    regionSegments.get(regionName).exitIndex = i;
                }
            }
        }

        // Finaliser les régions qui sont encore traversées à la fin
        for (let regionName of currentRegions) {
            if (regionSegments.has(regionName)) {
                regionSegments.get(regionName).exitIndex = journeyPath.length - 1;
                console.log(`🔧 [DEBUG] Région ${regionName} - sortie finale à l'index ${journeyPath.length - 1}`);
            }
        }

        // Mettre à jour window.regionSegments
        window.regionSegments = regionSegments;

        console.log(`🔧 [DEBUG] Segments de région reconstruits:`, regionSegments);
        console.log(`🔧 [DEBUG] === FIN rebuildRegionSegments ===`);
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

        // Fallback générique
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

                // Vérifier s'il y a des tables aléatoires pour ce lieu/région
                const hasTables = this.discoveryHasTables(discovery);
                const diceIcon = hasTables ? ' <span class="dice-icon cursor-pointer hover:scale-110 transition-transform" data-discovery-name="' + discovery.name + '" data-discovery-type="' + discovery.type + '" title="Voir les tables aléatoires">🎲</span>' : '';

                return `
                    <div class="inline-block m-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors discovery-item text-center" data-discovery-name="${discovery.name}" data-discovery-type="${discovery.type}" style="width: 180px; vertical-align: top;">
                        <div class="w-[150px] h-[150px] mx-auto mb-2 bg-gray-600 rounded-lg overflow-hidden">
                            ${imageUrl ? `<img src="${imageUrl}" alt="${discovery.name}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">Aucune image</div>'}
                        </div>
                        <div class="font-medium text-white text-sm mb-1">${discovery.name}${diceIcon}</div>
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

        // Ajouter les boutons en bas
        let buttonsHtml = `
            <div class="mt-3 pt-3 border-t border-gray-600 space-y-3">
                <div id="current-day-description" class="hidden bg-gray-800 rounded-lg p-4 mb-3">
                    <div class="text-sm text-gray-400 mb-2">Description de la journée :</div>
                    <div id="current-day-description-text" class="text-gray-200 leading-relaxed text-sm"></div>
                </div>
                <button id="describe-journey-btn" class="w-full py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors" style="background-color: white; color: #940000; border: 1px solid #940000;">
                    <span class="gemini-icon">✨</span>
                    <span>Décrire le voyage (Points clés)</span>
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
            item.addEventListener('click', (e) => {
                // Vérifier si le clic provient de l'icône dé
                if (e.target.classList.contains('dice-icon')) {
                    e.stopPropagation();
                    this.openDiscoveryModalOnTablesTab(discoveryName, discoveryType);
                } else {
                    this.openDiscoveryModal(discoveryName, discoveryType);
                }
            });
        });

        // Event listeners spécifiques pour les icônes dé
        const diceIcons = document.querySelectorAll('.dice-icon');
        diceIcons.forEach(icon => {
            const discoveryName = icon.dataset.discoveryName;
            const discoveryType = icon.dataset.discoveryType;

            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openDiscoveryModalOnTablesTab(discoveryName, discoveryType);
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

    openDiscoveryModalOnTablesTab(discoveryName, discoveryType) {
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

                        // Forcer l'expansion de la info box et activer l'onglet Tables
                        setTimeout(() => {
                            const infoBox = document.getElementById('info-box');
                            if (infoBox && !infoBox.classList.contains('expanded')) {
                                if (typeof toggleInfoBoxExpand === 'function') {
                                    toggleInfoBoxExpand();
                                }
                            }

                            // Activer l'onglet Tables aléatoires
                            if (typeof activateTab === 'function') {
                                activateTab('tables');
                            }
                        }, 100);
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

                        // Forcer l'expansion de la info box et activer l'onglet Tables
                        setTimeout(() => {
                            const infoBox = document.getElementById('info-box');
                            if (infoBox && !infoBox.classList.contains('expanded')) {
                                if (typeof toggleInfoBoxExpand === 'function') {
                                    toggleInfoBoxExpand();
                                }
                            }

                            // Activer l'onglet Tables aléatoires
                            if (typeof activateTab === 'function') {
                                activateTab('tables');
                            }
                        }, 100);
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

    async generateJourneyDescription() {
        if (this.dayByDayData.length === 0) {
            alert('Aucune journée de voyage à décrire.');
            return;
        }

        // Collecter les données pour toutes les journées
        const allJourneyData = this.collectAllJourneyDataForPrompt();

        // Créer le prompt pour Gemini
        const prompt = this.createAllJourneyDescriptionPrompt(allJourneyData);

        // Appeler Gemini via la fonction globale callGemini
        const button = this.dom.getElementById('describe-journey-btn');
        if (typeof callGemini === 'function') {
            try {
                const response = await callGemini(prompt, button);
                this.parseAndDisplayAllJourneyDescriptions(response);
            } catch (error) {
                console.error('Erreur lors de la génération de la description:', error);
                alert('Erreur lors de la génération de la description de voyage.');
            }
        } else {
            alert('La fonction de génération de texte n\'est pas disponible.');
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
            allDays: allDaysData
        };
    }

    createAllJourneyDescriptionPrompt(journeyData) {
        console.log('📖 Génération du prompt pour voyage complet en mode points clés');

        let prompt = `Génère des points clés évocateurs pour toutes les journées d'un voyage en Terre du Milieu dont le détail est présenté ci-après. 

Ces points clés sont destinés à un meneur de jeu pour l'inspirer lors de l'improvisation en jeu.

**Contexte du groupe :**
${journeyData.adventurersGroup || 'Groupe d\'aventuriers non défini'}

**Nature de la quête :**
${journeyData.adventurersQuest || 'Quête non définie'}

**Saison actuelle :** ${journeyData.season}
**Durée totale du voyage :** ${journeyData.totalDays} jours

**Détail des journées :**
`;

        journeyData.allDays.forEach(dayData => {
            prompt += `\n**Jour ${dayData.dayNumber} (${dayData.calendarDate}) :**`;

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

**STYLE DE NARRATION : POINTS CLÉS**
- Organisez l'information sous forme de listes structurées de mots-clés thématiques
- Ne faites pas de phrases complètes, mais des listes de mots-clés et expressions évocatrices
- Utilisez des puces et des catégories claires (Paysage, Météo, Ambiance, Événements, etc.)
- Présentez les informations de manière synthétique et facilement exploitable
- Optimisé pour une consultation rapide et une improvisation en jeu
- Format : utilisez des tirets et des catégories courtes pour structurer l'information

**Règles générales :**
- Variez les descriptions selon les jours en mettant en avant :
  • Tantôt des descriptions de paysages
  • Tantôt le temps qu'il fait
  • Tantôt les impressions de voyage
  • Tantôt l'accumulation de la fatigue
  • Tantôt l'attitude de certains membres du groupe

- Adaptez l'ambiance à la saison
- Optimisé pour une improvisation en jeu de rôle
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

                    <!-- Modal content and navigation -->
                    <div class="mb-4 flex-grow overflow-y-auto">
                        <div class="bg-gray-800 rounded-lg p-4 mb-3">
                            <div class="text-sm text-gray-400 mb-2">Description du jour :</div>
                            <div id="journey-description-content" class="text-gray-200 leading-relaxed text-sm"></div>
                        </div>
                    </div>

                    <div class="mt-4 pt-4 border-t border-gray-600 flex justify-center items-center">
                        <div class="flex items-center justify-between w-full">
                            <button id="prev-day-desc" class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm transition-colors opacity-50 cursor-not-allowed" style="background-color: #940000; border: 2px solid #940000;" disabled>
                                <i class="fas fa-chevron-left"></i>
                            </button>

                            <div class="flex-1 mx-4">
                                <div class="bg-gray-300 h-2 rounded-full relative">
                                    <div id="journey-progress-fill" class="h-2 rounded-full transition-all duration-300" style="background-color: #940000; width: 0%;"></div>
                                    <div id="journey-progress-marker" class="absolute top-0 w-4 h-4 rounded-full border-2 border-white transform -translate-y-1" style="background-color: #940000; left: calc(0% - 8px);"></div>
                                </div>
                            </div>

                            <button id="next-day-desc" class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm transition-colors opacity-50 cursor-not-allowed" style="background-color: #940000; border: 2px solid #940000;" disabled>
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        <div class="text-center mt-2 w-full">
                            <span id="current-day-indicator" class="text-sm font-medium" style="color: #940000;">Jour 1</span>
                        </div>
                    </div>

                    <div class="mt-4 pt-4 border-t border-gray-600 flex justify-end">
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
            this.setupDescriptionNavigation();
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
            prevBtn.style.cursor = 'pointer';
        } else {
            prevBtn.style.opacity = '0.5';
            prevBtn.style.backgroundColor = '#940000';
            prevBtn.disabled = true;
            prevBtn.style.cursor = 'not-allowed';
        }

        if (this.currentDescriptionDay < this.totalJourneyDays) {
            nextBtn.style.opacity = '1';
            nextBtn.style.backgroundColor = '#940000';
            nextBtn.disabled = false;
            nextBtn.style.cursor = 'pointer';
        } else {
            nextBtn.style.opacity = '0.5';
            nextBtn.style.backgroundColor = '#940000';
            nextBtn.disabled = true;
            nextBtn.style.cursor = 'not-allowed';
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

    discoveryHasTables(discovery) {
        if (discovery.type === 'location') {
            // Chercher dans les données de lieux
            if (typeof locationsData !== 'undefined' && locationsData.locations) {
                const location = locationsData.locations.find(loc => loc.name === discovery.name);
                if (location && location.tables && Array.isArray(location.tables)) {
                    // Vérifier s'il y a au moins une table avec une URL valide
                    return location.tables.some(table => table.url && table.url.trim() !== '');
                }
            }
        } else if (discovery.type === 'region') {
            // Chercher dans les données de régions
            if (typeof regionsData !== 'undefined' && regionsData.regions) {
                const region = regionsData.regions.find(reg => reg.name === discovery.name);
                if (region && region.tables && Array.isArray(region.tables)) {
                    // Vérifier s'il y a au moins une table avec une URL valide
                    return region.tables.some(table => table.url && table.url.trim() !== '');
                }
            }
        }

        return false;
    }

    calculateDailyDiscoveries() {
        const dailyDiscoveries = {}; // jour -> array de découvertes
        const milesPerDay = 20;
        const pixelsPerDay = milesPerDay * (MAP_WIDTH / MAP_DISTANCE_MILES);

        // Variables pour suivre l'état de traversée des régions
        let currentRegionsActive = new Set();
        let regionsDiscoveredToday = new Set();
        let currentDay = 1;
        let currentDayDistance = 0;

        console.log("🔧 [DAILY DISCOVERIES] Début du calcul jour par jour");

        // Parcourir séquentiellement chaque point du tracé
        for (let pointIndex = 0; pointIndex < journeyPath.length; pointIndex++) {
            const currentPoint = journeyPath[pointIndex];

            // Calculer la distance depuis le point précédent
            let segmentDistance = 0;
            if (pointIndex > 0) {
                const previousPoint = journeyPath[pointIndex - 1];
                segmentDistance = Math.sqrt(
                    Math.pow(currentPoint.x - previousPoint.x, 2) + 
                    Math.pow(currentPoint.y - previousPoint.y, 2)
                );
            }

            currentDayDistance += segmentDistance;

            // Vérifier si on change de jour
            if (currentDayDistance >= pixelsPerDay && currentDay < this.totalJourneyDays) {
                // Finaliser le jour actuel
                if (!dailyDiscoveries[currentDay]) {
                    dailyDiscoveries[currentDay] = [];
                }

                // Passer au jour suivant
                currentDay++;
                currentDayDistance = currentDayDistance - pixelsPerDay;
                regionsDiscoveredToday.clear();
            }

            // Initialiser le jour si nécessaire
            if (!dailyDiscoveries[currentDay]) {
                dailyDiscoveries[currentDay] = [];
            }

            // Identifier les régions au point actuel
            const currentRegions = new Set();
            if (typeof regionsData !== 'undefined' && regionsData.regions) {
                regionsData.regions.forEach(region => {
                    if (region.points && region.points.length >= 3) {
                        if (this.isPointInPolygon(currentPoint, region.points)) {
                            currentRegions.add(region.name);
                        }
                    }
                });
            }

            // Détecter les nouvelles régions découvertes ce jour
            currentRegions.forEach(regionName => {
                if (!currentRegionsActive.has(regionName) && !regionsDiscoveredToday.has(regionName)) {
                    // Nouvelle région découverte
                    regionsDiscoveredToday.add(regionName);
                    dailyDiscoveries[currentDay].push({
                        name: regionName,
                        type: 'region',
                        status: 'discovered'
                    });
                    console.log(`🔧 [DAILY DISCOVERIES] Jour ${currentDay}: Découverte région ${regionName}`);
                }
            });

            // Mettre à jour les régions actives
            currentRegionsActive = new Set(currentRegions);

            // Vérifier les lieux à proximité
            if (typeof locationsData !== 'undefined' && locationsData.locations) {
                locationsData.locations.forEach(location => {
                    if (!location.coordinates || typeof location.coordinates.x === 'undefined' || typeof location.coordinates.y === 'undefined') {
                        return;
                    }

                    const distance = Math.sqrt(
                        Math.pow(location.coordinates.x - currentPoint.x, 2) +
                        Math.pow(location.coordinates.y - currentPoint.y, 2)
                    );

                    if (distance <= 50) { // PROXIMITY_DISTANCE
                        // Vérifier si le lieu n'est pas déjà dans les découvertes du jour
                        const alreadyDiscovered = dailyDiscoveries[currentDay].some(d => 
                            d.name === location.name && d.type === 'location'
                        );

                        if (!alreadyDiscovered) {
                            const proximityType = distance <= 10 ? 'traversed' : 'nearby';
                            dailyDiscoveries[currentDay].push({
                                name: location.name,
                                type: 'location',
                                status: proximityType
                            });
                            console.log(`🔧 [DAILY DISCOVERIES] Jour ${currentDay}: ${proximityType} lieu ${location.name}`);
                        }
                    }
                });
            }
        }

        // Ajouter les régions en cours de traversée pour chaque jour
        Object.keys(dailyDiscoveries).forEach(day => {
            const dayNum = parseInt(day);
            const discoveries = dailyDiscoveries[dayNum];

            // Calculer quelles régions sont traversées ce jour-là
            const dayStartDistance = (dayNum - 1) * pixelsPerDay;
            const dayEndDistance = dayNum * pixelsPerDay;

            // Trouver les points correspondant à ce jour
            let currentDistance = 0;
            let dayStartPointIndex = 0;
            let dayEndPointIndex = journeyPath.length - 1;

            for (let i = 1; i < journeyPath.length; i++) {
                const prevPoint = journeyPath[i - 1];
                const currPoint = journeyPath[i];
                const segmentDist = Math.sqrt(
                    Math.pow(currPoint.x - prevPoint.x, 2) + 
                    Math.pow(currPoint.y - prevPoint.y, 2)
                );

                if (currentDistance <= dayStartDistance && currentDistance + segmentDist > dayStartDistance) {
                    dayStartPointIndex = i;
                }
                if (currentDistance <= dayEndDistance && currentDistance + segmentDist > dayEndDistance) {
                    dayEndPointIndex = i;
                    break;
                }

                currentDistance += segmentDist;
            }

            // Identifier les régions traversées pendant ce jour
            const regionsInDay = new Set();
            for (let i = dayStartPointIndex; i <= dayEndPointIndex && i < journeyPath.length; i++) {
                const point = journeyPath[i];
                if (typeof regionsData !== 'undefined' && regionsData.regions) {
                    regionsData.regions.forEach(region => {
                        if (region.points && region.points.length >= 3) {
                            if (this.isPointInPolygon(point, region.points)) {
                                regionsInDay.add(region.name);
                            }
                        }
                    });
                }
            }

            // Ajouter les régions en cours de traversée (qui ne sont pas des découvertes du jour)
            regionsInDay.forEach(regionName => {
                const alreadyDiscovered = discoveries.some(d => 
                    d.name === regionName && d.type === 'region' && d.status === 'discovered'
                );

                if (!alreadyDiscovered) {
                    discoveries.push({
                        name: regionName,
                        type: 'region',
                        status: 'traversing'
                    });
                }
            });
        });

        console.log("🔧 [DAILY DISCOVERIES] Résultats finaux:", dailyDiscoveries);
        return dailyDiscoveries;
    }

    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
                (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }

    setupDiscoveryClickHandlers() {
        const clickableDiscoveries = document.querySelectorAll('.clickable-discovery');
        clickableDiscoveries.forEach(item => {
            item.addEventListener('click', (e) => {
                const discoveryName = e.currentTarget.dataset.discoveryName;
                const discoveryType = e.currentTarget.dataset.discoveryType;
                this.openDiscoveryModal(discoveryName, discoveryType);
            });
        });
    }
}