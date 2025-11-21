import { MAP_DISTANCE_MILES } from '../utils/constants.js';
import GeminiManager from './gemini-manager.js';

class VoyageManager {
    constructor(domElements, constants = {}) {
        this.dom = domElements;
        this.currentDayIndex = 0;
        this.totalJourneyDays = 0;
        this.dayByDayData = [];
        this.journeyDescriptions = {}; // Pour stocker les descriptions générées
        this.currentDescriptionDay = 1; // Pour suivre le jour affiché dans la modale de description
        this.randomEvents = {}; // Pour stocker les événements aléatoires générés par jour
        this.currentPathSignature = null; // Signature unique du voyage actuel

        // Stocker les constantes passées en paramètre
        this.MAP_DISTANCE_MILES = constants.MAP_DISTANCE_MILES || MAP_DISTANCE_MILES;
        this.MAP_WIDTH = constants.MAP_WIDTH || window.MAP_WIDTH || 5103;

        // Initialiser le gestionnaire Gemini
        this.geminiManager = new GeminiManager();
    }

    init() {
        this.setupEventListeners();
    }

    updateMapScale() {
        // Mettre à jour l'échelle de la carte depuis la carte active
        const activeMap = window.settingsManager?.availableMaps?.find(m => m.url === window.settingsManager.activeMapUrl);
        if (activeMap && activeMap.scale) {
            this.MAP_DISTANCE_MILES = activeMap.scale;
            console.log(`🗺️ VoyageManager: échelle mise à jour à ${this.MAP_DISTANCE_MILES} miles`);
        }
    }

    setupEventListeners() {
        // Bouton principal des paramètres
        const voyageBtn = this.dom.getElementById('voyage-segments-btn');
        const closeBtn = this.dom.getElementById('close-voyage-segments');
        const describeBtn = this.dom.getElementById('describe-journey-header-btn');
        const finishBtn = this.dom.getElementById('finish-journey-header-btn');
        const randomEventBtn = this.dom.getElementById('random-event-btn');

        if (voyageBtn) {
            voyageBtn.addEventListener('click', () => {
                const modal = this.dom.getElementById('voyage-segments-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                    this.updateDisplay();
                    // Centrer la carte sur le voyage après un court délai pour que la modale soit affichée
                    setTimeout(() => {
                        this.centerMapOnJourney();
                    }, 100);
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const modal = this.dom.getElementById('voyage-segments-modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
                // Restaurer l'opacité normale de la carte
                const viewport = document.getElementById('viewport');
                if (viewport) {
                    viewport.style.opacity = '1';
                }
            });
        }

        if (describeBtn) {
            describeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎨 Bouton Descriptions cliqué');
                this.generateJourneyDescription();
            });
        }

        if (finishBtn) {
            finishBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🏁 Bouton Terminer cliqué');
                this.finishJourney();
            });
        }

        if (randomEventBtn) {
            randomEventBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎲 Bouton Événement aléatoire cliqué');
                // Trouver le jour actuellement affiché
                const allCards = document.querySelectorAll('.day-card');
                let currentDayIndex = 0;
                allCards.forEach((card, index) => {
                    if (card.classList.contains('ring-2')) {
                        currentDayIndex = index;
                    }
                });

                if (this.dayByDayData && this.dayByDayData[currentDayIndex]) {
                    this.triggerRandomEvent(this.dayByDayData[currentDayIndex]);
                }
            });
        }
    }

    centerMapOnJourney() {
        // Vérifier qu'il y a un tracé
        if (!window.journeyPath || window.journeyPath.length === 0) {
            console.log("⚠️ Pas de tracé de voyage à centrer");
            return;
        }

        const viewport = document.getElementById('viewport');
        const mapContainer = document.getElementById('map-container');
        if (!viewport || !mapContainer) return;

        // Calculer les limites du tracé
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        window.journeyPath.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        });

        // Ajouter une marge de 10%
        const marginX = (maxX - minX) * 0.1;
        const marginY = (maxY - minY) * 0.1;
        minX -= marginX;
        maxX += marginX;
        minY -= marginY;
        maxY += marginY;

        // Calculer le centre du tracé
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Calculer le zoom nécessaire pour faire rentrer le tracé
        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;
        const pathWidth = maxX - minX;
        const pathHeight = maxY - minY;

        const scaleX = viewportWidth / pathWidth;
        const scaleY = viewportHeight / pathHeight;
        const newScale = Math.min(scaleX, scaleY) * 0.9; // 90% pour laisser de la marge

        // Appliquer le zoom et le centrage
        window.scale = Math.max(0.1, Math.min(4.0, newScale));
        window.panX = viewportWidth / 2 - centerX * window.scale;
        window.panY = viewportHeight / 2 - centerY * window.scale;

        // Mettre à jour la transformation
        mapContainer.style.transform = `translate(${window.panX}px, ${window.panY}px) scale(${window.scale})`;

        // Mettre à jour le ZoomManager
        if (window.zoomManager) {
            window.zoomManager.updateDisplay();
        }

        // Mettre à jour la taille du marqueur de position
        if (window.positionManager) {
            window.positionManager.updateMarkerSize();
        }

        console.log(`🗺️ Carte centrée sur le voyage - zoom: ${(window.scale * 100).toFixed(0)}%`);
    }

    setupDrawingListeners() {
        // Méthode appelée par main.js pour configurer les écouteurs de dessin
        // Pour l'instant, cette méthode est vide car la gestion du dessin
        // est principalement gérée par PathManager
        console.log("🎨 VoyageManager drawing listeners configured");
    }

    updateDisplay() {
        // Utiliser les variables globales existantes
        if (typeof journeyPath === 'undefined' || journeyPath.length === 0) {
            // Pas de voyage à afficher
            const voyageDaysContent = this.dom.getElementById('voyage-days-content');
            if (voyageDaysContent) {
                voyageDaysContent.innerHTML = '<p class="text-center text-gray-500 py-12">Aucun voyage tracé</p>';
            }
        } else {
            this.updateMapScale();
            this.generateJourneyData();
            this.loadDescriptionsForMap();
            this.renderAllDays();
        }
    }

    generateJourneyData() {
        // Créer une signature unique pour ce voyage
        if (typeof journeyPath !== 'undefined' && journeyPath.length > 0) {
            this.currentPathSignature = this.createPathSignature(journeyPath);
            console.log(`🔑 Signature du voyage actuel: ${this.currentPathSignature}`);

            // Charger les événements spécifiques à ce voyage
            this.loadRandomEventsForJourney();
        }

        // Récupérer les dimensions réelles de la carte active
        const mapImage = document.getElementById('map-image');
        const actualMapWidth = mapImage?.naturalWidth || window.MAP_WIDTH || 5103;

        // Mettre à jour l'échelle depuis la carte active
        this.updateMapScale();

        // Récupérer milesPerDay depuis la carte active
        let milesPerDay = 20; // Valeur par défaut
        const activeMap = window.settingsManager?.availableMaps?.find(m => m.url === window.settingsManager.activeMapUrl);
        if (activeMap && activeMap.milesPerDay) {
            milesPerDay = activeMap.milesPerDay;
            console.log(`🗺️ VoyageManager: vitesse mise à jour à ${milesPerDay} miles/jour`);
        }

        // Calculate total journey duration using global variables
        const miles = totalPathPixels * (this.MAP_DISTANCE_MILES / actualMapWidth);
        const days = Math.ceil(miles / milesPerDay);
        this.totalJourneyDays = Math.max(1, days);

        console.log(`🗺️ VoyageManager calcul: ${totalPathPixels.toFixed(0)}px × (${this.MAP_DISTANCE_MILES} miles / ${actualMapWidth}px) = ${miles.toFixed(0)} miles ÷ ${milesPerDay} mi/j = ${days} jours`);

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
        // Récupérer le mapId de la carte active
        const activeMapUrl = window.settingsManager?.activeMapUrl;

        console.log(`🗺️ [buildAbsoluteTimeline] Carte active: ${activeMapUrl}`);
        console.log(`🗺️ [buildAbsoluteTimeline] journeyDiscoveries total: ${journeyDiscoveries?.length || 0}`);

        // Utiliser les variables globales journeyDiscoveries et filtrer par mapId
        const discoveries = journeyDiscoveries
            .filter(discovery => {
                // Si pas de carte active, afficher toutes les découvertes
                if (!activeMapUrl) return true;

                // Vérifier le mapId pour les lieux
                if (discovery.type === 'location' && typeof locationsData !== 'undefined') {
                    const location = locationsData.locations.find(loc => loc.name === discovery.name);

                    // Si le lieu n'a pas de mapId, l'afficher (compatible avec toutes les cartes)
                    if (!location || !location.mapId || location.mapId === null || location.mapId === undefined) {
                        console.log(`✅ [buildAbsoluteTimeline] Lieu "${discovery.name}" sans mapId - affiché sur toutes les cartes`);
                        return true;
                    }

                    // Si le lieu a un mapId correspondant à la carte active, l'afficher
                    if (String(location.mapId) === String(activeMapUrl)) {
                        console.log(`✅ [buildAbsoluteTimeline] Lieu "${discovery.name}" avec mapId correspondant - affiché`);
                        return true;
                    }

                    // Sinon, le filtrer
                    console.log(`⏭️ [buildAbsoluteTimeline] Lieu "${discovery.name}" ignoré (mapId: ${location.mapId} ≠ ${activeMapUrl})`);
                    return false;
                }

                // Vérifier le mapId pour les régions
                if (discovery.type === 'region' && typeof regionsData !== 'undefined') {
                    const region = regionsData.regions.find(reg => reg.name === discovery.name);

                    // Si la région n'a pas de mapId, l'afficher (compatible avec toutes les cartes)
                    if (!region || !region.mapId || region.mapId === null || region.mapId === undefined) {
                        console.log(`✅ [buildAbsoluteTimeline] Région "${discovery.name}" sans mapId - affichée sur toutes les cartes`);
                        return true;
                    }

                    // Si la région a un mapId correspondant à la carte active, l'afficher
                    if (String(region.mapId) === String(activeMapUrl)) {
                        console.log(`✅ [buildAbsoluteTimeline] Région "${discovery.name}" avec mapId correspondant - affichée`);
                        return true;
                    }

                    // Sinon, la filtrer
                    console.log(`⏭️ [buildAbsoluteTimeline] Région "${discovery.name}" ignorée (mapId: ${region.mapId} ≠ ${activeMapUrl})`);
                    return false;
                }

                return true;
            })
            .sort((a, b) => a.discoveryIndex - b.discoveryIndex);

        console.log(`🗺️ [buildAbsoluteTimeline] Découvertes après filtrage: ${discoveries.length}`);

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
            // day peut être ajusté par les raccourcis (valeur déjà décalée)
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

    renderAllDays() {
        const voyageDaysContent = this.dom.getElementById('voyage-days-content');
        if (!voyageDaysContent) return;

        // Mettre à jour le titre et la durée pour le voyage en cours
        this.updateJourneyHeaderForCurrentPath();

        let allDaysHtml = '';

        // Générer le HTML pour chaque jour
        for (let i = 0; i < this.dayByDayData.length; i++) {
            const dayData = this.dayByDayData[i];
            const dayNumber = dayData.day;
            const calendarDate = dayData.calendarDate;
            const isShortened = dayData.isShortened || false;

            // Récupérer météo et saison (sauf si jour raccourci)
            const weatherData = !isShortened ? this.getWeatherForDay(dayNumber) : null;
            let weatherSymbol = '';
            let weatherTooltip = '';

            if (weatherData && weatherData.symbol) {
                weatherSymbol = weatherData.symbol;
                weatherTooltip = weatherData.weather || '';
            }

            // Collecter toutes les tables aléatoires disponibles pour ce jour
            let randomTablesForDay = [];
            if (dayData.discoveries && dayData.discoveries.length > 0) {
                dayData.discoveries.forEach(discovery => {
                    if (discovery.type === 'location' && typeof locationsData !== 'undefined') {
                        const location = locationsData.locations.find(loc => loc.name === discovery.name);
                        if (location && location.RandomTables && Array.isArray(location.RandomTables) && location.RandomTables.length > 0) {
                            location.RandomTables.forEach(table => {
                                randomTablesForDay.push({
                                    tableName: table.name || 'Table sans nom',
                                    discoveryName: discovery.name,
                                    discoveryType: discovery.type
                                });
                            });
                        }
                    } else if (discovery.type === 'region' && typeof regionsData !== 'undefined') {
                        const region = regionsData.regions.find(reg => reg.name === discovery.name);
                        if (region && region.RandomTables && Array.isArray(region.RandomTables) && region.RandomTables.length > 0) {
                            region.RandomTables.forEach(table => {
                                randomTablesForDay.push({
                                    tableName: table.name || 'Table sans nom',
                                    discoveryName: discovery.name,
                                    discoveryType: discovery.type
                                });
                            });
                        }
                    }
                });
            }
            const hasRandomEvents = randomTablesForDay.length > 0;

            // Préparer les découvertes pour le header (max 2)
            const headerDiscoveries = dayData.discoveries.slice(0, 2);
            const discoveriesHtml = headerDiscoveries.map(discovery => {
                const name = discovery.name.length > 15 ? discovery.name.substring(0, 12) + '...' : discovery.name;
                return `<span class="discovery-badge text-xs px-2 py-1 bg-gray-200 rounded text-gray-700" title="${discovery.name}" data-discovery-name="${discovery.name}" data-discovery-type="${discovery.type}" onclick="event.stopPropagation(); window.voyageManager.openDiscoveryFromHeader('${discovery.name}', '${discovery.type}')">${name}</span>`;
            }).join('');

            // Carte du jour avec en-tête cliquable
            // Ne pas afficher "Jour X" et météo si le jour est raccourci
            allDaysHtml += `
                <div class="day-card mb-4 border border-gray-300 rounded-lg overflow-hidden ${isShortened ? 'opacity-75' : ''}" data-day-index="${i}">
                    <div class="day-header bg-gray-50 p-3 cursor-pointer hover:bg-gray-100 transition-colors">
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 flex-wrap">
                                ${!isShortened ? `<span class="text-base font-bold whitespace-nowrap" style="color: #940000;">Jour ${dayNumber}</span>` : ''}
                                <span class="text-xs ${isShortened ? 'italic' : ''} text-gray-600 whitespace-nowrap">${calendarDate}${isShortened ? ' (raccourci)' : ''}</span>
                                ${!isShortened && weatherSymbol ? `<span class="text-xl" title="${weatherTooltip}">${weatherSymbol}</span>` : ''}
                                ${discoveriesHtml}
                            </div>
                            <div class="flex items-center gap-2 flex-shrink-0">
                                ${randomTablesForDay.length > 0 ? `
                                    <div class="relative">
                                        <button class="day-random-tables-menu-btn w-7 h-7 rounded-full flex items-center justify-center transition-colors" style="background-color: #940000;" title="Événements aléatoires" data-day-index="${i}">
                                            <i class="fas fa-dice text-xs" style="color: white !important;"></i>
                                        </button>
                                        <div data-day-index="${i}" class="day-random-tables-dropdown hidden absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-20">
                                            <div class="py-1">
                                                ${randomTablesForDay.map((tableInfo, tableIdx) => `
                                                    <button class="day-random-table-item block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                                                            data-day-index="${i}"
                                                            data-table-index="${tableIdx}"
                                                            data-discovery-name="${tableInfo.discoveryName}"
                                                            data-discovery-type="${tableInfo.discoveryType}"
                                                            data-table-name="${tableInfo.tableName}">
                                                        ${tableInfo.tableName}
                                                    </button>
                                                `).join('')}
                                            </div>
                                        </div>
                                    </div>
                                ` : ''}
                                <button class="shorten-day-btn w-8 h-8 rounded-full flex items-center justify-center transition-colors" style="background-color: #666666;" title="${isShortened ? 'Annuler raccourci' : 'Raccourcir (durée 0)'}" data-day-index="${i}">
                                    <i class="fas fa-${isShortened ? 'undo' : 'minus-circle'} text-lg" style="color: white !important;"></i>
                                </button>
                                <button class="extend-day-btn w-8 h-8 rounded-full flex items-center justify-center transition-colors" style="background-color: #666666;" title="Prolonger d\'une journée" data-day-index="${i}">
                                    <i class="fas fa-plus-circle text-lg" style="color: white !important;"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="day-content p-4 bg-white">
                        ${this.renderDayContent(dayData, weatherData)}
                    </div>
                </div>
            `;
        }

        voyageDaysContent.innerHTML = allDaysHtml;

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

            console.log(`📅 Clic sur en-tête du jour ${dayIndex + 1} (event delegation)`);
            this.highlightDay(dayIndex);
        };

        // Attacher le listener au conteneur
        voyageDaysContent.addEventListener('click', dayHeaderClickListener);
        voyageDaysContent._dayHeaderClickListener = dayHeaderClickListener;

        console.log('✅ Event delegation configurée pour les en-têtes de jour');

        // Setup event listeners pour les découvertes
        this.setupDiscoveryInteractions();

        // Setup event listeners pour les boutons de menu de tables aléatoires et les items de table
        // Event delegation pour les items de table aléatoire (PRIORITÉ MAXIMALE)
        voyageDaysContent.addEventListener('click', (e) => {
            console.log(`🎲 [EVENT CAPTURE] Clic capturé sur:`, {
                target: e.target.className,
                currentTarget: e.currentTarget.id,
                eventPhase: e.eventPhase, // 1=CAPTURING, 2=AT_TARGET, 3=BUBBLING
                bubbles: e.bubbles,
                cancelable: e.cancelable,
                defaultPrevented: e.defaultPrevented,
                propagationStopped: e.cancelBubble
            });

            const tableItem = e.target.closest('.day-random-table-item');
            console.log(`🎲 [EVENT CAPTURE] tableItem trouvé:`, !!tableItem);
            
            if (tableItem) {
                console.log(`🎲 [CLICK ITEM] ========== DÉBUT TRAITEMENT ITEM ==========`);
                console.log(`🎲 [CLICK ITEM] Event phase avant stopPropagation:`, e.eventPhase);
                
                e.stopPropagation();
                e.preventDefault();
                e.stopImmediatePropagation(); // Empêcher TOUS les autres handlers

                console.log(`🎲 [CLICK ITEM] stopPropagation/preventDefault/stopImmediatePropagation appelés`);

                const dayIndex = parseInt(tableItem.dataset.dayIndex);
                const tableIndex = parseInt(tableItem.dataset.tableIndex);
                const discoveryName = tableItem.dataset.discoveryName;
                const discoveryType = tableItem.dataset.discoveryType;
                const tableName = tableItem.dataset.tableName;

                console.log(`🎲 [CLICK ITEM] Clic détecté sur table "${tableName}"`);
                console.log(`🎲 [CLICK ITEM] Données - Jour ${dayIndex}, Table ${tableIndex}, Découverte: ${discoveryName} (${discoveryType})`);

                // Fermer le dropdown et l'overlay APRÈS avoir récupéré les données
                const dropdown = tableItem.closest('.day-random-tables-dropdown');
                if (dropdown) {
                    console.log(`🎲 [CLICK ITEM] Fermeture du dropdown`);
                    dropdown.classList.add('hidden');
                }

                const overlay = document.getElementById('dropdown-overlay');
                if (overlay) {
                    console.log(`🎲 [CLICK ITEM] Suppression de l'overlay`);
                    overlay.remove();
                }

                console.log(`🎲 [CLICK ITEM] Appel de rollRandomEventForDay avec dayIndex=${dayIndex}, tableIndex=${tableIndex}`);
                this.rollRandomEventForDay(dayIndex, tableIndex, discoveryName, discoveryType);
                console.log(`🎲 [CLICK ITEM] ========== FIN TRAITEMENT ITEM ==========`);
                return;
            }
        }, true); // Utiliser la capture pour intercepter AVANT les autres handlers

        // Event delegation pour les boutons de menu (toggle)
        voyageDaysContent.addEventListener('click', (e) => {
            // Ne pas traiter si c'est un item de table
            if (e.target.closest('.day-random-table-item')) {
                return;
            }

            const menuBtn = e.target.closest('.day-random-tables-menu-btn');
            if (menuBtn) {
                e.stopPropagation();
                const dayIndex = menuBtn.dataset.dayIndex;
                const dropdown = document.querySelector(`.day-random-tables-dropdown[data-day-index="${dayIndex}"]`);

                console.log(`🎲 [TOGGLE MENU] Bouton menu cliqué pour jour ${dayIndex}`);

                // Fermer tous les autres dropdowns et retirer l'overlay
                document.querySelectorAll('.day-random-tables-dropdown').forEach(dd => {
                    if (dd !== dropdown) {
                        dd.classList.add('hidden');
                    }
                });

                // Retirer l'overlay existant
                const existingOverlay = document.getElementById('dropdown-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }

                // Toggle le dropdown actuel
                if (dropdown) {
                    const wasHidden = dropdown.classList.contains('hidden');
                    dropdown.classList.toggle('hidden');

                    console.log(`🎲 [TOGGLE MENU] Dropdown ${wasHidden ? 'ouvert' : 'fermé'}`);

                    // Positionner le dropdown en fixed par rapport au bouton
                    if (wasHidden) {
                        const btnRect = menuBtn.getBoundingClientRect();
                        dropdown.style.position = 'fixed';
                        dropdown.style.top = (btnRect.bottom + 8) + 'px';
                        dropdown.style.left = (btnRect.right - 192) + 'px'; // 192px = w-48
                        dropdown.style.right = 'auto';

                        const overlay = document.createElement('div');
                        overlay.id = 'dropdown-overlay';
                        document.body.appendChild(overlay);

                        console.log(`🎲 [TOGGLE MENU] Overlay créé`);

                        // Fermer le dropdown en cliquant sur l'overlay
                        overlay.addEventListener('click', (overlayEvent) => {
                            console.log(`🎲 [OVERLAY] ========== ÉVÉNEMENT OVERLAY ==========`);
                            console.log(`🎲 [OVERLAY] Event phase:`, overlayEvent.eventPhase);
                            console.log(`🎲 [OVERLAY] Target:`, overlayEvent.target.className || overlayEvent.target.id);
                            console.log(`🎲 [OVERLAY] CurrentTarget:`, overlayEvent.currentTarget.id);
                            
                            // Ignorer si le clic provient du dropdown ou de ses enfants
                            if (overlayEvent.target.closest('.day-random-tables-dropdown')) {
                                console.log(`🎲 [OVERLAY] ❌ Clic dans le dropdown - IGNORÉ`);
                                console.log(`🎲 [OVERLAY] ========== FIN (IGNORÉ) ==========`);
                                return;
                            }
                            
                            // Ne fermer que si on clique directement sur l'overlay
                            if (overlayEvent.target === overlay) {
                                overlayEvent.stopPropagation();
                                console.log(`🎲 [OVERLAY] ✅ Clic sur overlay - fermeture du dropdown`);
                                dropdown.classList.add('hidden');
                                overlay.remove();
                                console.log(`🎲 [OVERLAY] ========== FIN (FERMÉ) ==========`);
                            }
                        });
                    }
                }
                return;
            }
        });

        // Fermer les dropdowns en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.day-random-tables-menu-btn') &&
                !e.target.closest('.day-random-tables-dropdown') &&
                !e.target.closest('.day-random-table-item')) {
                document.querySelectorAll('.day-random-tables-dropdown').forEach(dd => {
                    dd.classList.add('hidden');
                });

                const overlay = document.getElementById('dropdown-overlay');
                if (overlay) {
                    overlay.remove();
                }
            }
        });


        // Setup event listeners pour les boutons de prolongation
        this.setupExtendDayButtons();

        // Setup event listeners pour les boutons de raccourci
        this.setupShortenDayButtons();
    }

    renderDayContent(dayData, weatherData) {
        let contentHtml = '';

        // Description du jour si elle existe
        const dayDescription = this.journeyDescriptions[dayData.day];
        if (dayDescription) {
            contentHtml += `
                <div class="bg-gray-50 rounded-lg p-3 mb-3">
                    <div class="text-xs text-gray-500 mb-1">📖 Description :</div>
                    <div class="text-sm text-gray-800 leading-relaxed">${dayDescription.replace(/\n/g, '<br>')}</div>
                </div>
            `;
        }

        // Événement aléatoire s'il existe pour ce jour
        const randomEvent = this.randomEvents[dayData.day];
        if (randomEvent) {
            contentHtml += `
                <div class="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-3">
                    <div class="flex items-center text-xs text-yellow-700 mb-2">
                        <i class="fas fa-dice mr-1"></i>
                        <span class="font-semibold">Événement aléatoire</span>
                    </div>
                    <div class="text-sm text-gray-800">${randomEvent}</div>
                </div>
            `;
        }

        // Message si pas de contenu
        if (!dayDescription && !randomEvent) {
            contentHtml += '<p class="text-gray-400 text-sm italic text-center py-2">Voyage tranquille...</p>';
        }

        return contentHtml;
    }

    highlightDay(dayIndex) {
        console.log(`🎯 highlightDay appelé avec index: ${dayIndex}`);

        // Validation de l'index
        if (typeof dayIndex !== 'number' || isNaN(dayIndex) || dayIndex < 0) {
            console.error(`❌ Index de jour invalide: ${dayIndex}`);
            return;
        }

        // Retirer la surbrillance précédente
        const allCards = document.querySelectorAll('.day-card');
        allCards.forEach(card => {
            card.classList.remove('ring-2', 'ring-blue-500');
        });

        // Ajouter la surbrillance au jour cliqué
        const clickedCard = document.querySelector(`.day-card[data-day-index="${dayIndex}"]`);
        if (clickedCard) {
            clickedCard.classList.add('ring-2', 'ring-blue-500');

            // Scroller vers la carte du jour si elle n'est pas visible
            clickedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            console.warn(`⚠️ Carte du jour avec index ${dayIndex} non trouvée dans le DOM`);
        }

        // Vérifier que les données du jour existent
        if (!this.dayByDayData || !Array.isArray(this.dayByDayData)) {
            console.error(`❌ dayByDayData non disponible ou invalide`);
            return;
        }

        if (dayIndex >= this.dayByDayData.length) {
            console.warn(`⚠️ Index ${dayIndex} hors limites (total: ${this.dayByDayData.length} jours)`);
            return;
        }

        const dayData = this.dayByDayData[dayIndex];

        if (!dayData) {
            console.error(`❌ Données du jour ${dayIndex} sont null ou undefined`);
            return;
        }

        console.log(`✅ Données du jour ${dayData.day} trouvées:`, {
            calendarDate: dayData.calendarDate,
            hasStartCoordinates: !!dayData.startCoordinates,
            startCoordinates: dayData.startCoordinates
        });

        // Mettre à jour la date du calendrier si elle existe
        if (dayData.calendarDate && window.calendarManager) {
            console.log(`📅 Mise à jour de la date du calendrier depuis highlightDay: ${dayData.calendarDate}`);

            // Parser la date du calendrier (format "15 Nórui")
            const dateParts = dayData.calendarDate.split(' ');
            if (dateParts.length >= 2) {
                const dayNumber = dateParts[0];
                const monthName = dateParts[1];
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
                        console.log(`✅ Date du calendrier mise à jour: ${parsedDay} ${monthName}`);
                    } else {
                        console.warn(`⚠️ Mois "${monthName}" non trouvé dans calendarData`);
                    }
                }
            } else {
                console.warn(`⚠️ Format de date invalide: "${dayData.calendarDate}"`);
            }
        }

        // Validation robuste des coordonnées
        if (!dayData.startCoordinates) {
            console.warn(`⚠️ Pas de coordonnées de départ pour le jour ${dayData.day}`);
            return;
        }

        if (typeof dayData.startCoordinates.x !== 'number' ||
            typeof dayData.startCoordinates.y !== 'number' ||
            isNaN(dayData.startCoordinates.x) ||
            isNaN(dayData.startCoordinates.y)) {
            console.error(`❌ Coordonnées invalides pour le jour ${dayData.day}:`, dayData.startCoordinates);
            return;
        }

        // Vérifier que PositionManager est disponible
        if (!window.positionManager) {
            console.error(`❌ PositionManager non disponible`);
            return;
        }

        // Déplacer le marqueur de position au début de cette journée
        console.log(`📍 Déplacement du marqueur vers le jour ${dayData.day}:`, dayData.startCoordinates);

        try {
            window.positionManager.animateToPosition(
                dayData.startCoordinates.x,
                dayData.startCoordinates.y,
                800
            );
            console.log(`✅ Animation du marqueur lancée avec succès`);
        } catch (error) {
            console.error(`❌ Erreur lors de l'animation du marqueur:`, error);
        }
    }

    updateDayTitle(dayData) {
        const segmentTitle = this.dom.getElementById('segment-title');
        const dayCounter = this.dom.getElementById('day-counter');

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

                // Vérifier si cette découverte a des événements aléatoires
                let hasRandomEvents = false;
                if (discovery.type === 'location' && typeof locationsData !== 'undefined') {
                    const location = locationsData.locations.find(loc => loc.name === discovery.name);
                    hasRandomEvents = location && location.RandomTables && Array.isArray(location.RandomTables) && location.RandomTables.length > 0;
                } else if (discovery.type === 'region' && typeof regionsData !== 'undefined') {
                    const region = regionsData.regions.find(reg => reg.name === discovery.name);
                    hasRandomEvents = region && region.RandomTables && Array.isArray(region.RandomTables) && region.RandomTables.length > 0;
                }

                // Obtenir l'image pour la miniature
                const imageUrl = this._getDiscoveryImageForDisplay(discovery);

                return `
                    <div class="inline-block m-2 p-3 rounded-lg cursor-pointer transition-colors discovery-item text-center" data-discovery-name="${discovery.name}" data-discovery-type="${discovery.type}" style="width: 180px; vertical-align: top; background-color: white;">
                        <div class="w-[150px] h-[150px] mx-auto mb-2 rounded-lg overflow-hidden" style="background-color: white;">
                            ${imageUrl ? `<img src="${imageUrl}" alt="${discovery.name}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">Aucune image</div>'}
                        </div>
                        <div class="font-medium text-sm mb-1 flex items-center justify-center gap-1" style="color: black;">
                            ${discovery.name}
                            ${hasRandomEvents ? '<button class="random-event-icon-btn w-6 h-6 rounded-full flex items-center justify-center transition-colors" style="background-color: #940000;" title="Événement aléatoire disponible" data-discovery-name="' + discovery.name + '" data-discovery-type="' + discovery.type + '"><i class="fas fa-dice text-xs" style="color: white !important;"></i></button>' : ''}
                        </div>
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

        segmentContent.innerHTML = contentHtml;

        // Setup event listeners for discoveries
        this.setupDiscoveryInteractions();

        // Gérer les boutons dans l'en-tête
        this.updateHeaderButtons();
    }

    updateJourneyHeaderForCurrentPath() {
        // Cette méthode met à jour le titre et la durée de la modale
        // pour le voyage EN COURS (non sauvegardé)

        if (!window.journeyPath || window.journeyPath.length === 0) {
            return;
        }

        const voyageTitle = document.querySelector('#voyage-segments-modal h3');
        const voyageSubtitle = document.querySelector('#voyage-segments-modal p.text-sm');

        if (voyageTitle && this.totalJourneyDays > 0) {
            // Détecter les points de départ et d'arrivée
            let startLocation = "Point de départ";
            let endLocation = "Point d'arrivée";

            // Trouver le premier et dernier lieu découvert
            if (window.journeyDiscoveries && window.journeyDiscoveries.length > 0) {
                const discoveries = window.journeyDiscoveries.filter(d => d.type === 'location');
                if (discoveries.length > 0) {
                    startLocation = discoveries[0].name;
                    if (discoveries.length > 1) {
                        endLocation = discoveries[discoveries.length - 1].name;
                    }
                }
            }

            voyageTitle.textContent = `Voyage de ${startLocation} à ${endLocation}`;
        }

        if (voyageSubtitle && this.journeyStartDate) {
            const startDateStr = `${this.journeyStartDate.day} ${window.calendarData[this.journeyStartDate.monthIndex].name}`;
            voyageSubtitle.innerHTML = `${startDateStr} • <span id="voyage-total-days">${this.totalJourneyDays}</span> jour${this.totalJourneyDays > 1 ? 's' : ''}`;
        }
    }

    updateHeaderButtons() {
        const describeBtn = this.dom.getElementById('describe-journey-header-btn');
        const finishBtn = this.dom.getElementById('finish-journey-header-btn');

        // Afficher le bouton de description
        if (describeBtn) {
            describeBtn.classList.remove('hidden');
            describeBtn.onclick = () => this.generateJourneyDescription();

            // Mettre à jour le tooltip
            const hasDescriptions = Object.keys(this.journeyDescriptions).length > 0;
            describeBtn.title = hasDescriptions ? 'Régénérer les descriptions' : 'Générer les descriptions';
        }

        // Afficher le bouton "Terminer le voyage" seulement au dernier jour
        const isLastDay = this.currentDayIndex === (this.totalJourneyDays - 1);
        if (finishBtn) {
            if (isLastDay) {
                finishBtn.classList.remove('hidden');
                finishBtn.onclick = () => this.finishJourney();
            } else {
                finishBtn.classList.add('hidden');
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
                // Marquer comme non sauvegardé lors du déplacement manuel du marqueur
                if (typeof window.markAsUnsaved === 'function') {
                    window.markAsUnsaved();
                }
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
            // Marquer comme non sauvegardé lors du changement manuel de date
            if (typeof window.markAsUnsaved === 'function') {
                window.markAsUnsaved();
            }
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

        // Masquer les boutons de l'en-tête
        const describeBtn = this.dom.getElementById('describe-journey-header-btn');
        const finishBtn = this.dom.getElementById('finish-journey-header-btn');
        if (describeBtn) describeBtn.classList.add('hidden');
        if (finishBtn) finishBtn.classList.add('hidden');
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
                // Ne pas ouvrir la modal si on clique sur l'icône de dé
                if (e.target.closest('.random-event-icon-btn')) {
                    return;
                }
                this.openDiscoveryModal(discoveryName, discoveryType);
            });
        });

        // Gestionnaire pour les icônes de dé individuelles
        const randomEventIconBtns = document.querySelectorAll('.random-event-icon-btn');
        randomEventIconBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const discoveryName = btn.dataset.discoveryName;
                const discoveryType = btn.dataset.discoveryType;

                // Créer un objet dayData avec cette découverte spécifique
                const dayData = this.dayByDayData[this.currentDayIndex];
                const specificDiscovery = dayData.discoveries.find(d => d.name === discoveryName && d.type === discoveryType);

                if (specificDiscovery) {
                    // Créer un dayData temporaire avec uniquement cette découverte
                    const tempDayData = {
                        ...dayData,
                        discoveries: [specificDiscovery]
                    };
                    this.triggerRandomEvent(tempDayData);
                }
            });
        });
    }

    setupDayRandomEventButtons() {
        const dayRandomEventBtns = document.querySelectorAll('.day-random-event-btn');
        console.log(`🎲 Configuration de ${dayRandomEventBtns.length} boutons d\'événements aléatoires`);

        dayRandomEventBtns.forEach(btn => {
            // Retirer les anciens listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎲 Bouton événement aléatoire du jour cliqué');

                const dayIndex = parseInt(newBtn.dataset.dayIndex);
                const discoveryName = newBtn.dataset.discoveryName;
                const discoveryType = newBtn.dataset.discoveryType;

                console.log(`🎲 Index du jour: ${dayIndex}, Découverte: ${discoveryName} (${discoveryType})`);

                if (this.dayByDayData && this.dayByDayData[dayIndex]) {
                    const dayData = this.dayByDayData[dayIndex];

                    // Trouver la découverte spécifique
                    const specificDiscovery = dayData.discoveries.find(d =>
                        d.name === discoveryName && d.type === discoveryType
                    );

                    if (specificDiscovery) {
                        // Créer un dayData temporaire avec uniquement cette découverte
                        const tempDayData = {
                            ...dayData,
                            discoveries: [specificDiscovery]
                        };
                        this.triggerRandomEvent(tempDayData);
                    } else {
                        console.warn(`⚠️ Découverte ${discoveryName} non trouvée`);
                    }
                } else {
                    console.warn(`⚠️ Données du jour ${dayIndex} non disponibles`);
                }
            });
        });
    }

    setupExtendDayButtons() {
        const extendBtns = document.querySelectorAll('.extend-day-btn');
        console.log(`⏱️ Configuration de ${extendBtns.length} boutons de prolongation`);

        extendBtns.forEach(btn => {
            // Retirer les anciens listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('⏱️ Bouton prolongation du jour cliqué');

                const dayIndex = parseInt(newBtn.dataset.dayIndex);
                console.log(`⏱️ Index du jour à prolonger: ${dayIndex}`);

                if (this.dayByDayData && this.dayByDayData[dayIndex]) {
                    this.extendDay(dayIndex);
                } else {
                    console.warn(`⚠️ Données du jour ${dayIndex} non disponibles`);
                }
            });
        });
    }

    setupShortenDayButtons() {
        const shortenDayBtns = document.querySelectorAll('.shorten-day-btn');
        console.log(`⚡ Configuration de ${shortenDayBtns.length} boutons de raccourci`);

        shortenDayBtns.forEach(btn => {
            // Retirer les anciens listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('⚡ Bouton raccourci du jour cliqué');

                const dayIndex = parseInt(newBtn.dataset.dayIndex);
                console.log(`⚡ Index du jour à raccourcir: ${dayIndex}`);

                if (this.dayByDayData && this.dayByDayData[dayIndex]) {
                    this.shortenDay(dayIndex);
                } else {
                    console.warn(`⚠️ Données du jour ${dayIndex} non disponibles`);
                }
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

    extendDay(dayIndex) {
        console.log(`⏱️ Prolongation du jour ${dayIndex + 1}`);

        if (!this.dayByDayData || dayIndex < 0 || dayIndex >= this.dayByDayData.length) {
            console.error(`❌ Index invalide: ${dayIndex}`);
            return;
        }

        const sourceDayData = this.dayByDayData[dayIndex];

        // Créer une nouvelle journée à J+1 (SANS événement)
        const newDayData = {
            day: sourceDayData.day + 1,
            discoveries: [...sourceDayData.discoveries],
            calendarDate: this.getCalendarDateForDay(sourceDayData.day + 1),
            startCoordinates: sourceDayData.startCoordinates ? { ...sourceDayData.startCoordinates } : null,
            endCoordinates: sourceDayData.endCoordinates ? { ...sourceDayData.endCoordinates } : null,
            isExtended: true // Marquer comme jour prolongé
        };

        // Recalculer la météo pour la nouvelle journée
        const newWeatherData = this.getWeatherForDay(newDayData.day);

        // Insérer la nouvelle journée à dayIndex + 1
        this.dayByDayData.splice(dayIndex + 1, 0, newDayData);

        // Incrémenter le nombre total de jours
        this.totalJourneyDays += 1;

        // Recalculer AVEC raccourcis ET prolongations
        this.recalculateDaysFromIndexWithShortcuts(0);

        // Décaler les descriptions et événements SEULEMENT pour les jours APRÈS la nouvelle journée
        // Important: dayIndex + 2 car la journée dayIndex garde sa description/événement
        this.shiftDescriptionsFromIndex(dayIndex + 2);
        this.shiftRandomEventsFromIndex(dayIndex + 2);

        // Sauvegarder les descriptions mises à jour
        this.saveDescriptionsForMap();

        // Sauvegarder automatiquement dans le journal
        this.saveJourneyToJournal();

        // Rafraîchir l'affichage
        this.renderAllDays();

        // Activer la nouvelle journée
        this.highlightDay(dayIndex + 1);

        console.log(`✅ Journée prolongée avec succès. Nouveau total: ${this.totalJourneyDays} jours`);
    }

    shortenDay(dayIndex) {
        console.log(`⚡ Raccourci du jour ${dayIndex + 1} (durée 0)`);

        if (!this.dayByDayData || dayIndex < 0 || dayIndex >= this.dayByDayData.length) {
            console.error(`❌ Index invalide: ${dayIndex}`);
            return;
        }

        // Si déjà raccourci, annuler le raccourci
        if (this.dayByDayData[dayIndex].isShortened) {
            console.log(`🔄 Annulation du raccourci pour le jour ${dayIndex + 1}`);
            this.dayByDayData[dayIndex].isShortened = false;
        } else {
            // Marquer cette journée comme ayant une durée de 0
            this.dayByDayData[dayIndex].isShortened = true;
        }

        // Recalculer les numéros de jours et les dates pour tous les jours
        this.recalculateDaysFromIndexWithShortcuts(0);

        // Sauvegarder les descriptions et événements mis à jour
        this.saveDescriptionsForMap();

        // Sauvegarder automatiquement dans le journal
        this.saveJourneyToJournal();

        // Rafraîchir l'affichage
        this.renderAllDays();

        // Activer la journée raccourcie
        this.highlightDay(dayIndex);

        console.log(`✅ Journée ${this.dayByDayData[dayIndex].isShortened ? 'raccourcie' : 'restaurée'} avec succès`);
    }

    recalculateDaysFromIndexWithShortcuts(startIndex) {
        console.log(`🔄 Recalcul des jours avec raccourcis à partir de l'index ${startIndex}`);

        // Parcourir tous les jours et recalculer les numéros en tenant compte des raccourcis
        for (let i = 0; i < this.dayByDayData.length; i++) {
            // Compter TOUS les raccourcis jusqu'à ce jour (inclus)
            let shortenedCountBeforeAndIncluding = 0;
            for (let j = 0; j <= i; j++) {
                if (this.dayByDayData[j].isShortened) {
                    shortenedCountBeforeAndIncluding++;
                }
            }

            // Le numéro de jour réel = index + 1 - nombre de raccourcis jusqu'ici
            const actualDayNumber = (i + 1) - shortenedCountBeforeAndIncluding;
            this.dayByDayData[i].day = actualDayNumber;

            // La date calendrier est calculée avec le numéro de jour réel
            // SAUF si le jour est raccourci (durée 0), on garde quand même une date pour l'affichage
            this.dayByDayData[i].calendarDate = this.getCalendarDateForDay(actualDayNumber);

            // IMPORTANT: Recalculer les coordonnées pour ce jour
            // Si le jour est raccourci, garder les mêmes coordonnées que le jour précédent (non raccourci)
            if (this.dayByDayData[i].isShortened) {
                // Trouver le dernier jour non raccourci
                let previousNonShortenedIndex = i - 1;
                while (previousNonShortenedIndex >= 0 && this.dayByDayData[previousNonShortenedIndex].isShortened) {
                    previousNonShortenedIndex--;
                }

                if (previousNonShortenedIndex >= 0) {
                    // Copier les coordonnées du jour précédent non raccourci
                    this.dayByDayData[i].startCoordinates = { ...this.dayByDayData[previousNonShortenedIndex].startCoordinates };
                    this.dayByDayData[i].endCoordinates = { ...this.dayByDayData[previousNonShortenedIndex].endCoordinates };
                    console.log(`📍 Jour ${i} raccourci: coordonnées copiées du jour ${previousNonShortenedIndex}`);
                } else {
                    // Si c'est le premier jour et qu'il est raccourci, utiliser les coordonnées du tracé
                    const dayCoordinates = this.calculateDayCoordinates(actualDayNumber);
                    this.dayByDayData[i].startCoordinates = dayCoordinates.start;
                    this.dayByDayData[i].endCoordinates = dayCoordinates.end;
                }
            } else {
                // Pour les jours non raccourcis, recalculer normalement
                const dayCoordinates = this.calculateDayCoordinates(actualDayNumber);
                this.dayByDayData[i].startCoordinates = dayCoordinates.start;
                this.dayByDayData[i].endCoordinates = dayCoordinates.end;
            }

            const flags = [];
            if (this.dayByDayData[i].isShortened) flags.push('raccourci');
            if (this.dayByDayData[i].isExtended) flags.push('prolongé');
            const flagsStr = flags.length > 0 ? ` (${flags.join(', ')})` : '';

            console.log(`📅 Index ${i}: Jour ${actualDayNumber}${flagsStr}: ${this.dayByDayData[i].calendarDate}`);
        }

        // Recalculer le total en soustrayant les jours raccourcis
        const shortenedCount = this.dayByDayData.filter(d => d.isShortened).length;
        const originalTotal = this.dayByDayData.length;
        this.totalJourneyDays = originalTotal - shortenedCount;

        console.log(`📊 Total actualisé: ${this.totalJourneyDays} jours (${originalTotal} entrées - ${shortenedCount} raccourcis)`);
    }

    recalculateDaysFromIndex(startIndex) {
        console.log(`🔄 Recalcul des jours à partir de l'index ${startIndex}`);

        for (let i = startIndex; i < this.dayByDayData.length; i++) {
            const dayNumber = i + 1;
            this.dayByDayData[i].day = dayNumber;
            this.dayByDayData[i].calendarDate = this.getCalendarDateForDay(dayNumber);

            console.log(`📅 Jour ${dayNumber}: ${this.dayByDayData[i].calendarDate}`);
        }
    }

    shiftDescriptionsFromIndex(startIndex) {
        console.log(`📝 Décalage des descriptions à partir de l'index ${startIndex}`);

        const newDescriptions = {};

        // Copier les descriptions avant le point d'insertion
        for (let day = 1; day < startIndex; day++) {
            if (this.journeyDescriptions[day]) {
                newDescriptions[day] = this.journeyDescriptions[day];
            }
        }

        // Décaler les descriptions après le point d'insertion
        Object.keys(this.journeyDescriptions).forEach(day => {
            const dayNum = parseInt(day);
            if (dayNum >= startIndex) {
                newDescriptions[dayNum + 1] = this.journeyDescriptions[dayNum];
            }
        });

        this.journeyDescriptions = newDescriptions;
        console.log(`✅ Descriptions décalées`);
    }

    shiftRandomEventsFromIndex(startIndex) {
        console.log(`🎲 Décalage des événements aléatoires à partir de l'index ${startIndex}`);

        const newRandomEvents = {};

        // Copier les événements avant le point d'insertion
        for (let day = 1; day < startIndex; day++) {
            if (this.randomEvents[day]) {
                newRandomEvents[day] = this.randomEvents[day];
            }
        }

        // Décaler les événements après le point d'insertion
        Object.keys(this.randomEvents).forEach(day => {
            const dayNum = parseInt(day);
            if (dayNum >= startIndex) {
                newRandomEvents[dayNum + 1] = this.randomEvents[dayNum];
            }
        });

        this.randomEvents = newRandomEvents;
        console.log(`✅ Événements aléatoires décalés`);
    }

    openDiscoveryFromHeader(discoveryName, discoveryType) {
        console.log(`📍 Ouverture de la découverte depuis le header: ${discoveryName} (${discoveryType})`);

        // Récupérer les données de la découverte
        let discoveryData = null;

        if (discoveryType === 'location' && typeof locationsData !== 'undefined') {
            discoveryData = locationsData.locations.find(loc => loc.name === discoveryName);
        } else if (discoveryType === 'region' && typeof regionsData !== 'undefined') {
            discoveryData = regionsData.regions.find(reg => reg.name === discoveryName);
        }

        if (!discoveryData) {
            console.warn(`⚠️ Découverte non trouvée: ${discoveryName} (${discoveryType})`);
            return;
        }

        // Ouvrir l'infobox avec ces données
        if (window.infoBoxManager) {
            // Créer un événement factice pour l'infobox
            const fakeEvent = {
                stopPropagation: () => {},
                preventDefault: () => {}
            };

            window.infoBoxManager.showInfoBox(fakeEvent, discoveryData, discoveryType);
            console.log(`✅ Infobox ouverte pour ${discoveryName}`);
        } else {
            console.warn(`⚠️ InfoBoxManager non disponible`);
        }
    }

    openDiscoveryModal(discoveryName, discoveryType) {
        console.log(`🗺️ [VoyageManager] Ouverture modale pour ${discoveryType}: ${discoveryName}`);

        // Ne PAS fermer la modale de voyage - laisser l'utilisateur naviguer
        // this.dom.hideModal(this.dom.voyageSegmentsModal);

        if (discoveryType === 'location') {
            // Trouver le lieu et ouvrir sa modal
            if (typeof window.locationsData !== 'undefined' && window.locationsData.locations) {
                const location = window.locationsData.locations.find(loc => loc.name === discoveryName);
                if (location) {
                    console.log(`📍 [VoyageManager] Lieu trouvé:`, location);

                    // Utiliser InfoBoxManager pour afficher le lieu
                    if (window.infoBoxManager) {
                        const fakeEvent = {
                            stopPropagation: () => {},
                            preventDefault: () => {}
                        };

                        window.infoBoxManager.showInfoBox(fakeEvent, location, 'location');
                        console.log(`✅ [VoyageManager] InfoBox affichée pour le lieu`);
                    } else {
                        console.error(`❌ [VoyageManager] InfoBoxManager non disponible`);
                    }
                }
            }
        } else if (discoveryType === 'region') {
            // Trouver la région et ouvrir sa modal
            if (typeof window.regionsData !== 'undefined' && window.regionsData.regions) {
                const region = window.regionsData.regions.find(reg => reg.name === discoveryName);
                if (region) {
                    console.log(`🗺️ [VoyageManager] Région trouvée:`, region);

                    // Utiliser InfoBoxManager pour afficher la région
                    if (window.infoBoxManager) {
                        const fakeEvent = {
                            stopPropagation: () => {},
                            preventDefault: () => {}
                        };

                        window.infoBoxManager.showInfoBox(fakeEvent, region, 'region');
                        console.log(`✅ [VoyageManager] InfoBox affichée pour la région`);
                    } else {
                        console.error(`❌ [VoyageManager] InfoBoxManager non disponible`);
                    }
                }
            }
        }
    }

    finishJourney() {
        console.log('🏁 Fin du voyage - Génération du journal');

        if (!this.dayByDayData || this.dayByDayData.length === 0) {
            console.warn('⚠️ Pas de données de voyage à enregistrer');
            return;
        }

        // Sauvegarder le voyage dans le journal
        this.saveJourneyToJournal();

        // Déplacer le marqueur de position à la destination (dernier point du tracé)
        if (window.journeyPath && window.journeyPath.length > 0 && window.positionManager) {
            const lastPoint = window.journeyPath[window.journeyPath.length - 1];
            window.positionManager.animateToPosition(lastPoint.x, lastPoint.y, 1000);
            console.log(`📍 Marqueur déplacé à la destination du voyage: (${Math.round(lastPoint.x)}, ${Math.round(lastPoint.y)})`);
        }

        // Notification de succès
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        notification.innerHTML = '<i class="fas fa-check mr-2"></i>Voyage enregistré dans le journal';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);

        // Fermer la modale
        const modal = this.dom.getElementById('voyage-segments-modal');
        if (modal) {
            modal.classList.add('hidden');
        }

        console.log('✅ Voyage enregistré avec succès');
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

        // Récupérer le bouton et sauvegarder son contenu original
        const button = this.dom.getElementById('describe-journey-header-btn');
        if (!button) return;

        const originalContent = button.innerHTML;

        // Afficher le loader
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin text-white"></i>';
        button.style.cursor = 'not-allowed';

        try {
            // Collecter les données pour toutes les journées
            const allJourneyData = this.collectAllJourneyDataForPrompt();

            // Créer le prompt pour Gemini
            const prompt = this.createAllJourneyDescriptionPrompt(allJourneyData);

            // Appeler Gemini
            const response = await this.geminiManager.generateContent(prompt, button, 'journey');
            this.parseAndDisplayAllJourneyDescriptions(response);
        } catch (error) {
            console.error('Erreur lors de la génération de la description:', error);
            alert(`Erreur lors de la génération de la description de voyage: ${error.message}`);
        } finally {
            // Restaurer le bouton à son état original
            button.disabled = false;
            button.innerHTML = originalContent;
            button.style.cursor = 'pointer';
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

        let prompt = `Tu es un narrateur pour un jeu de rôle dans l'univers du Seigneur des Anneaux.
Génère des descriptions courtes (2-3 phrases max) pour chaque jour d'un voyage de ${journeyData.totalDays} jours.

Le voyage commence à "${journeyData.adventurersGroup}" et se termine à "${journeyData.adventurersQuest}".
Distance totale: ${journeyData.totalDays} miles.

${journeyData.allDays && journeyData.allDays.length > 0 ?
`Détail des journées:
${journeyData.allDays.map(d => `- Jour ${d.dayNumber} (${d.calendarDate}) - Saison: ${d.season} - Météo: ${d.weatherSymbol || ''} ${d.weather || 'Non spécifiée'}`).join('\n')}` : ''}

INSTRUCTIONS CRITIQUES - RESPECTE CE FORMAT STRICTEMENT:
1. Retourne UNIQUEMENT un objet JSON valide
2. Ne mets AUCUN texte avant ou après le JSON
3. N'utilise PAS de balises markdown comme \`\`\`json
4. Le JSON doit être directement parsable
5. Génère exactement ${journeyData.totalDays} descriptions

Format EXACT à respecter:
{
  "descriptions": [
    {
      "day": 1,
      "description": "Description du jour 1..."
    },
    {
      "day": 2,
      "description": "Description du jour 2..."
    }
  ]
}

Ta réponse doit commencer par { et se terminer par } sans rien d'autre.`;

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
- Assure-toi que chaque description intègre subtilement la météo et la saison, en les traduisant en sensations et détails atmosphériques.
- Ne répète pas littéralement le texte météo fourni.
- Adapte la description des paysages selon la saison (couleurs, végétation, ambiance).
- Montre l'impact de la météo sur le voyage sans la mentionner explicitement.
- Le ton doit être immersif et narratif, adapté à une lecture en jeu de rôle.
- Évite les redondances entre les descriptions des différentes journées.
- Assure-toi que chaque description soit unique et apporte sa propre atmosphère.

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

Répondez UNIQUEMENT avec le JSON, sans texte d'introduction ni de conclusion.`;

        return prompt;
    }

    parseAndDisplayAllJourneyDescriptions(response) {
        console.log('📖 Parsing de la réponse Gemini pour toutes les journées');
        console.log('📥 Réponse brute reçue:', response);

        try {
            // Nettoyer la réponse pour extraire le JSON
            let cleanedResponse = response.trim();

            // Supprimer les blocs markdown si présents (```json ... ```)
            const jsonBlockMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonBlockMatch) {
                cleanedResponse = jsonBlockMatch[1].trim();
                console.log('📋 JSON extrait du bloc markdown');
            }

            // Supprimer les blocs de code génériques si présents (``` ... ```)
            const codeBlockMatch = cleanedResponse.match(/```\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                cleanedResponse = codeBlockMatch[1].trim();
                console.log('📋 Texte extrait du bloc de code');
            }

            console.log('🧹 Réponse nettoyée:', cleanedResponse);

            // Parser la réponse JSON
            const journeyData = JSON.parse(cleanedResponse);

            // Vérifier le format de la réponse
            if (journeyData && typeof journeyData === 'object') {
                // La structure attendue est un objet avec une clé "descriptions" contenant un tableau d'objets {"day": N, "description": "..."}
                let descriptionsArray = [];

                if (Array.isArray(journeyData.descriptions)) {
                    // Cas où la réponse est {"descriptions": [{"day": 1, "description": "..."}]}
                    descriptionsArray = journeyData.descriptions;
                    console.log('📖 Format détecté: Objet avec clé "descriptions" contenant un tableau.');
                } else {
                    console.error("❌ Format de réponse JSON inattendu:", journeyData);
                    alert("Erreur: Le format de la réponse de Gemini n'est pas celui attendu (objet avec clé 'descriptions').");
                    return;
                }

                // Réinitialiser les descriptions actuelles
                this.journeyDescriptions = {};

                // Parser et stocker chaque description
                descriptionsArray.forEach(item => {
                    if (item.day && item.description) {
                        this.journeyDescriptions[item.day] = item.description;
                        console.log(`📖 Description du jour ${item.day} ajoutée`);
                    }
                });

                // Sauvegarder les descriptions pour cette carte/tracé
                this.saveDescriptionsForMap();

                // Sauvegarder le voyage dans le journal
                this.saveJourneyToJournal();

                console.log('✅ Toutes les descriptions ont été parsées et sauvegardées');

                // Rafraîchir l'affichage de la modale pour montrer les nouvelles descriptions
                this.renderAllDays();
            } else {
                console.error("❌ Format de réponse JSON inattendu:", journeyData);
                alert("Erreur: Le format de la réponse de Gemini n'est pas celui attendu (objet avec clé 'descriptions').");
                return;
            }

        } catch (e) {
            console.error('❌ Erreur lors du parsing de la réponse:', e);
            alert('Erreur lors de la génération des descriptions. La réponse de Gemini n\'est pas au format JSON attendu.');
        }
    }

    saveJourneyToJournal() {
        // Créer l'objet voyage pour le journal
        const journeyData = {
            title: `Voyage de ${this.totalJourneyDays} jours`,
            generatedAt: new Date().toISOString(),
            totalDays: this.totalJourneyDays,
            days: this.dayByDayData.map((dayData, index) => {
                const dayNumber = index + 1;
                const weatherData = this.getWeatherForDay(dayNumber);

                return {
                    dayNumber: dayNumber,
                    calendarDate: dayData.calendarDate,
                    weatherSymbol: weatherData?.symbol || null,
                    discoveries: dayData.discoveries || [],
                    description: this.journeyDescriptions[dayNumber] || null,
                    eventResult: this.randomEvents[dayNumber] || null
                };
            })
        };

        // Charger le journal existant
        let journal = [];
        const savedJournal = localStorage.getItem('travelJournal');
        if (savedJournal && savedJournal !== 'null' && savedJournal !== 'undefined') {
            try {
                const parsed = JSON.parse(savedJournal);
                journal = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.error("Erreur lors du chargement du journal:", e);
            }
        }

        // Ajouter le nouveau voyage
        journal.push(journeyData);

        // Sauvegarder dans localStorage
        localStorage.setItem('travelJournal', JSON.stringify(journal));
        console.log(`📖 Voyage ajouté au journal (${journal.length} voyage(s) au total)`);

        // Marquer comme non sauvegardé pour sync cloud
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }

        // Synchroniser avec le cloud
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }

        // Rafraîchir le JournalManager si disponible
        if (window.journalManager) {
            window.journalManager.loadJournal();
        }
    }


    saveDescriptionsForMap() {
        // Obtenir l'URL de la carte active
        const activeMapUrl = window.settingsManager?.activeMapUrl;
        if (!activeMapUrl) {
            console.warn("⚠️ Impossible de sauvegarder les descriptions: URL de carte active non trouvée.");
            return;
        }

        // Créer une clé unique pour cette carte et ce tracé
        const pathSignature = this.createPathSignature(journeyPath);
        const mapStorageKey = `journeyDescriptions_${activeMapUrl}_${pathSignature}`;

        // Sauvegarder les descriptions (une copie pour éviter les modifications ultérieures)
        const dataToSave = {
            descriptions: { ...this.journeyDescriptions },
            generatedAt: new Date().toISOString()
        };

        try {
            localStorage.setItem(mapStorageKey, JSON.stringify(dataToSave));
            console.log(`💾 Descriptions de voyage sauvegardées pour la carte: ${activeMapUrl} (signature: ${pathSignature})`);
        } catch (error) {
            console.error("❌ Erreur lors de la sauvegarde des descriptions:", error);
        }
    }

    loadDescriptionsForMap() {
        const activeMapUrl = window.settingsManager?.activeMapUrl;
        if (!activeMapUrl) {
            console.warn("⚠️ Impossible de charger les descriptions: URL de carte active non trouvée.");
            // Réinitialiser les descriptions si pas de carte active
            this.journeyDescriptions = {};
            return null;
        }

        // Vérifier s'il y a un tracé
        if (!journeyPath || journeyPath.length === 0) {
            console.log("⚠️ Pas de tracé, réinitialisation des descriptions");
            this.journeyDescriptions = {};
            return null;
        }

        const pathSignature = this.createPathSignature(journeyPath);
        const mapStorageKey = `journeyDescriptions_${activeMapUrl}_${pathSignature}`;

        try {
            const savedData = localStorage.getItem(mapStorageKey);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                console.log(`💾 Descriptions de voyage chargées pour la carte: ${activeMapUrl} (signature: ${pathSignature})`);
                // Mettre à jour les descriptions actuelles du voyageur
                this.journeyDescriptions = { ...parsedData.descriptions };
                return parsedData.descriptions;
            } else {
                console.log(`📭 Aucune description sauvegardée pour cette carte/tracé`);
                this.journeyDescriptions = {};
            }
        } catch (error) {
            console.error("❌ Erreur lors du chargement des descriptions:", error);
            this.journeyDescriptions = {};
        }
        return null;
    }

    clearDescriptions() {
        // Nettoyer les descriptions lors d'un changement de carte ou de tracé
        this.journeyDescriptions = {};
        console.log("🧹 Descriptions de voyage nettoyées");
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
            journeyType: 'journey', // Identifier comme voyage tracé
            days: []
        };

        // Ajouter chaque jour
            this.dayByDayData.forEach((dayData, index) => {
                const dayNumber = index + 1;
                const weatherData = this.getWeatherForDay(dayNumber);

                // Récupérer l'événement aléatoire depuis le stockage
                const eventResult = this.randomEvents[dayNumber] || null;

                // Extraire les découvertes avec leur nom et type
                const discoveries = dayData.discoveries ? dayData.discoveries.map(d => ({
                    name: d.name,
                    type: d.type
                })) : [];

                journeyEntry.days.push({
                    dayNumber: dayNumber,
                    calendarDate: dayData.calendarDate,
                    weatherSymbol: weatherData ? weatherData.symbol : null,
                    weatherText: weatherData ? weatherData.weather : null,
                    eventResult: eventResult,
                    description: this.journeyDescriptions[dayNumber] || null,
                    discoveries: discoveries
                });
            });

        // Récupérer le journal existant
        let journal = [];
        const savedJournal = localStorage.getItem('travelJournal');
        if (savedJournal) {
            try {
                const parsed = JSON.parse(savedJournal);
                // S'assurer que c'est bien un tableau
                journal = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.error("Erreur lors du parsing du journal:", e);
                journal = [];
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

        // Marquer comme non sauvegardé lors de la génération d'une nouvelle entrée dans le journal
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }

        // Synchroniser avec le cloud
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }

        // Rafraîchir le JournalManager si disponible
        if (window.journalManager) {
            window.journalManager.loadJournal();
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
            // Assurez-vous que le conteneur de navigation est visible
            const navContainer = document.querySelector('.mb-4'); // Cible le conteneur de navigation
            if (navContainer) navContainer.style.display = 'block';

            this.setupDescriptionNavigation();
        } else {
            // Cacher le conteneur de navigation si non requis
            const navContainer = document.querySelector('.mb-4');
            if (navContainer) navContainer.style.display = 'none';
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

    centerMapOnJourney() {
        // Vérifier qu'il y a un tracé de voyage
        if (typeof journeyPath === 'undefined' || journeyPath.length === 0) {
            console.log("⚠️ Pas de tracé de voyage à centrer");
            return;
        }

        // Calculer le centre du tracé (bounding box)
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        journeyPath.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        });

        // Dimensions du tracé
        const pathWidth = maxX - minX;
        const pathHeight = maxY - minY;

        // Centre du tracé
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        console.log(`🎯 Centrage de la carte sur le voyage - Centre: (${centerX.toFixed(0)}, ${centerY.toFixed(0)}), Dimensions: ${pathWidth.toFixed(0)}x${pathHeight.toFixed(0)}`);

        // Accéder aux variables globales de pan et scale
        const viewport = document.getElementById('viewport');
        const mapContainer = document.getElementById('map-container');
        const toolbar = document.getElementById('toolbar');

        if (!viewport || !mapContainer) {
            console.error("❌ Viewport ou map-container introuvable");
            return;
        }

        // Calculer la largeur du menu de gauche
        const toolbarWidth = toolbar ? toolbar.offsetWidth : 80; // Fallback à 80px si non trouvé

        // Calculer la largeur de la modale de voyage (50% de l'écran)
        const modalWidth = viewport.clientWidth * 0.5;

        // La zone disponible pour la carte est entre le menu de gauche et la modale
        const availableWidth = viewport.clientWidth - toolbarWidth - modalWidth;
        const viewportHeight = viewport.clientHeight;

        console.log(`📏 Dimensions - Toolbar: ${toolbarWidth}px, Modal: ${modalWidth}px, Disponible pour carte: ${availableWidth}px`);

        // Calculer le zoom optimal pour faire rentrer tout le tracé dans la zone disponible
        // avec une marge de 10% pour que le tracé ne soit pas collé aux bords
        const scaleX = (availableWidth * 0.9) / pathWidth;
        const scaleY = (viewportHeight * 0.9) / pathHeight;
        const targetScale = Math.min(scaleX, scaleY);

        // Contraindre le scale dans les limites autorisées
        const minScale = window.zoomManager?.mapConstants?.minScale || 0.1;
        const maxScale = window.zoomManager?.mapConstants?.maxScale || 4.0;
        const constrainedScale = Math.max(minScale, Math.min(maxScale, targetScale));

        window.scale = constrainedScale;

        console.log(`🔍 Zoom calculé: scaleX=${scaleX.toFixed(3)}, scaleY=${scaleY.toFixed(3)}, targetScale=${targetScale.toFixed(3)}, constrainedScale=${constrainedScale.toFixed(3)}`);

        // Calculer le nouveau pan pour centrer le tracé dans la zone disponible
        // Le centre de la zone disponible est à: toolbarWidth + (availableWidth / 2)
        const centerAvailableZoneX = toolbarWidth + (availableWidth / 2);
        const newPanX = centerAvailableZoneX - (centerX * constrainedScale);
        const newPanY = (viewportHeight / 2) - (centerY * constrainedScale);

        // Activer la transition CSS pour un effet fluide
        mapContainer.style.transition = 'transform 0.8s ease-in-out';

        // Appliquer la transformation
        mapContainer.style.transform = `translate(${newPanX}px, ${newPanY}px) scale(${constrainedScale})`;

        // Mettre à jour les variables globales
        if (typeof window.panX !== 'undefined') {
            window.panX = newPanX;
        }
        if (typeof window.panY !== 'undefined') {
            window.panY = newPanY;
        }

        // Synchroniser le ZoomManager après la transition
        if (window.zoomManager) {
            setTimeout(() => {
                window.zoomManager.updateDisplay();
            }, 100);
        }

        // Réinitialiser la transition après l'animation pour ne pas affecter les autres interactions
        setTimeout(() => {
            mapContainer.style.transition = 'transform 0.1s ease-out';
        }, 800);

        console.log(`✅ Carte centrée sur le voyage avec zoom ${(constrainedScale * 100).toFixed(0)}%`);
    }

    getDiscoveryImage(discovery) {
        if (discovery.type === 'location') {
            // Chercher dans les données de lieux
            if (typeof window.locationsData !== 'undefined' && window.locationsData.locations) {
                const location = locationsData.locations.find(loc => loc.name === discovery.name);
                if (location && location.images && Array.isArray(location.images) && location.images.length > 0) {
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
                else if (location && location.imageUrl) {
                    return location.imageUrl;
                }
            }
        } else if (discovery.type === 'region') {
            // Chercher dans les données de régions
            if (typeof window.regionsData !== 'undefined' && window.regionsData.regions) {
                const region = regionsData.regions.find(reg => reg.name === discovery.name);
                if (region && region.images && Array.isArray(region.images) && region.images.length > 0) {
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
                else if (region && region.imageUrl) {
                    return region.imageUrl;
                }
            }
        }

        return null;
    }

    _getDiscoveryImageForDisplay(discovery) {
        // Obtenir l'image pour la miniature
        const imageUrl = this.getDiscoveryImage(discovery);
        return imageUrl;
    }


    checkForRandomEvents(dayData) {
        // Vérifier si les découvertes du jour ont des tables d'événements de voyage
        return dayData.discoveries.some(discovery => {
            if (discovery.type === 'location' && typeof locationsData !== 'undefined') {
                const location = locationsData.locations.find(loc => loc.name === discovery.name);
                return location && location.RandomTables && Array.isArray(location.RandomTables) && location.RandomTables.length > 0;
            } else if (discovery.type === 'region' && typeof regionsData !== 'undefined') {
                const region = regionsData.regions.find(reg => reg.name === discovery.name);
                return region && region.RandomTables && Array.isArray(region.RandomTables) && region.RandomTables.length > 0;
            }
            return false;
        });
    }

    loadRandomEventsForJourney() {
        // Charger les événements aléatoires spécifiques à ce voyage
        if (!this.currentPathSignature) return;

        const storageKey = `randomEvents_${this.currentPathSignature}`;
        const savedEvents = localStorage.getItem(storageKey);

        if (savedEvents) {
            try {
                this.randomEvents = JSON.parse(savedEvents);
                console.log(`📖 Événements aléatoires chargés pour le voyage ${this.currentPathSignature}:`, Object.keys(this.randomEvents).length, 'événement(s)');
            } catch (e) {
                console.error('❌ Erreur lors du chargement des événements aléatoires:', e);
                this.randomEvents = {};
            }
        } else {
            this.randomEvents = {};
            console.log(`📖 Nouveau voyage - aucun événement aléatoire préexistant`);
        }
    }

    saveRandomEventsForJourney() {
        // Sauvegarder les événements aléatoires spécifiques à ce voyage
        if (!this.currentPathSignature) return;

        const storageKey = `randomEvents_${this.currentPathSignature}`;
        localStorage.setItem(storageKey, JSON.stringify(this.randomEvents));
        console.log(`💾 Événements aléatoires sauvegardés pour le voyage ${this.currentPathSignature}`);
    }

    triggerRandomEvent(dayData) {
        console.log('🎲 triggerRandomEvent appelé avec dayData:', dayData);

        // Filter discoveries that have random tables in the original data
        const possibleEventLocations = dayData.discoveries.filter(discovery => {
            if (discovery.type === 'location' && typeof locationsData !== 'undefined') {
                const location = locationsData.locations.find(loc => loc.name === discovery.name);
                const hasTables = location && location.RandomTables && Array.isArray(location.RandomTables) && location.RandomTables.length > 0;
                console.log(`🔍 Lieu "${discovery.name}" - a des tables:`, hasTables);
                return hasTables;
            } else if (discovery.type === 'region' && typeof regionsData !== 'undefined') {
                const region = regionsData.regions.find(reg => reg.name === discovery.name);
                const hasTables = region && region.RandomTables && Array.isArray(region.RandomTables) && region.RandomTables.length > 0;
                console.log(`🔍 Région "${discovery.name}" - a des tables:`, hasTables);
                return hasTables;
            }
            return false;
        });

        if (possibleEventLocations.length === 0) {
            console.warn("Aucune table aléatoire disponible pour ce jour.");
            alert("Aucune table aléatoire disponible pour ce jour.");
            return;
        }

        // Choose a random location/region that has tables
        const selectedDiscovery = possibleEventLocations[Math.floor(Math.random() * possibleEventLocations.length)];
        console.log(`🎯 Découverte sélectionnée:`, selectedDiscovery);

        // Get the actual location/region data with tables
        let randomTables = [];
        if (selectedDiscovery.type === 'location' && typeof locationsData !== 'undefined') {
            const location = locationsData.locations.find(loc => loc.name === selectedDiscovery.name);
            randomTables = location.RandomTables || [];
        } else if (selectedDiscovery.type === 'region' && typeof regionsData !== 'undefined') {
            const region = regionsData.regions.find(reg => reg.name === selectedDiscovery.name);
            randomTables = region.RandomTables || [];
        }

        console.log(`📋 Nombre de tables disponibles:`, randomTables.length);

        // Choose a random table
        const selectedTable = randomTables[Math.floor(Math.random() * randomTables.length)];
        console.log(`🎲 Table sélectionnée:`, selectedTable);

        // Choose a random entry from the table
        if (!selectedTable.entries || selectedTable.entries.length === 0) {
            console.warn("La table sélectionnée n'a pas d'entrées.");
            alert("La table sélectionnée n'a pas d'entrées.");
            return;
        }

        const randomEntry = selectedTable.entries[Math.floor(Math.random() * selectedTable.entries.length)];
        console.log(`📖 Entrée sélectionnée:`, randomEntry);

        // Déterminer le numéro du jour concerné
        const dayNumber = dayData.day;

        // Stocker l'événement complet pour ce jour
        const eventText = `
            <div class="mb-2"><strong>Table :</strong> ${selectedTable.name || 'Table sans nom'}</div>
            <div class="mb-2"><strong>Dé du destin :</strong> ${randomEntry['Dé du destin'] || randomEntry.dice || '-'}</div>
            <div class="mb-2"><strong>Résultat :</strong> ${randomEntry['Résultat'] || randomEntry.result || '-'}</div>
            ${randomEntry['Description'] || randomEntry.description ? `<div><strong>Description :</strong> ${randomEntry['Description'] || randomEntry.description}</div>` : ''}
        `;

        this.randomEvents[dayNumber] = eventText;
        console.log(`✅ Événement aléatoire généré pour le jour ${dayNumber}:`, this.randomEvents[dayNumber]);

        // Sauvegarder les événements pour ce voyage spécifique
        this.saveRandomEventsForJourney();

        // Rafraîchir l'affichage de la modale pour montrer le nouvel événement
        this.renderAllDays();

        // Faire défiler jusqu'à la carte du jour concerné
        setTimeout(() => {
            const dayCard = document.querySelector(`.day-card[data-day-index="${dayNumber - 1}"]`);
            if (dayCard) {
                dayCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    }

    rollRandomEventForDay(dayIndex, tableIndex, discoveryName, discoveryType) {
        console.log(`🎲 [rollRandomEventForDay] ========== DÉBUT ==========`);
        console.log(`🎲 [rollRandomEventForDay] Paramètres:`, { dayIndex, tableIndex, discoveryName, discoveryType });
        console.log(`🎲 [rollRandomEventForDay] this.dayByDayData disponible:`, !!this.dayByDayData);
        console.log(`🎲 [rollRandomEventForDay] Longueur dayByDayData:`, this.dayByDayData?.length);

        // Vérification des données globales
        console.log(`🎲 [rollRandomEventForDay] Vérification des données globales...`);
        console.log(`🎲 [rollRandomEventForDay] - typeof window.locationsData:`, typeof window.locationsData);
        console.log(`🎲 [rollRandomEventForDay] - typeof window.regionsData:`, typeof window.regionsData);
        console.log(`🎲 [rollRandomEventForDay] - typeof locationsData:`, typeof locationsData);
        console.log(`🎲 [rollRandomEventForDay] - typeof regionsData:`, typeof regionsData);

        // Récupérer les données de la découverte
        let discoveryData = null;

        try {
            if (discoveryType === 'location') {
                console.log(`🎲 [rollRandomEventForDay] Recherche lieu "${discoveryName}"...`);

                // Essayer window.locationsData en premier
                if (window.locationsData && window.locationsData.locations) {
                    console.log(`🎲 [rollRandomEventForDay] Utilisation de window.locationsData (${window.locationsData.locations.length} lieux)`);
                    discoveryData = window.locationsData.locations.find(loc => loc.name === discoveryName);
                }
                // Fallback sur locationsData global
                else if (typeof locationsData !== 'undefined' && locationsData.locations) {
                    console.log(`🎲 [rollRandomEventForDay] Utilisation de locationsData global (${locationsData.locations.length} lieux)`);
                    discoveryData = locationsData.locations.find(loc => loc.name === discoveryName);
                } else {
                    console.error(`❌ [rollRandomEventForDay] Aucune source de données pour les lieux disponible`);
                    return;
                }
            }
            else if (discoveryType === 'region') {
                console.log(`🎲 [rollRandomEventForDay] Recherche région "${discoveryName}"...`);

                // Essayer window.regionsData en premier
                if (window.regionsData && window.regionsData.regions) {
                    console.log(`🎲 [rollRandomEventForDay] Utilisation de window.regionsData (${window.regionsData.regions.length} régions)`);
                    discoveryData = window.regionsData.regions.find(reg => reg.name === discoveryName);
                }
                // Fallback sur regionsData global
                else if (typeof regionsData !== 'undefined' && regionsData.regions) {
                    console.log(`🎲 [rollRandomEventForDay] Utilisation de regionsData global (${regionsData.regions.length} régions)`);
                    discoveryData = regionsData.regions.find(reg => reg.name === discoveryName);
                } else {
                    console.error(`❌ [rollRandomEventForDay] Aucune source de données pour les régions disponible`);
                    return;
                }
            }

            console.log(`🎲 [rollRandomEventForDay] Découverte trouvée:`, discoveryData ? 'OUI' : 'NON');
            if (discoveryData) {
                console.log(`🎲 [rollRandomEventForDay] Découverte:`, { name: discoveryData.name, hasRandomTables: !!discoveryData.RandomTables });
            }

            if (!discoveryData) {
                console.error(`❌ [rollRandomEventForDay] Découverte "${discoveryName}" non trouvée`);
                alert(`Erreur: La découverte "${discoveryName}" n'a pas été trouvée dans les données.`);
                return;
            }

            console.log(`🎲 [rollRandomEventForDay] Vérification RandomTables...`);
            console.log(`🎲 [rollRandomEventForDay] - RandomTables existe:`, !!discoveryData.RandomTables);
            console.log(`🎲 [rollRandomEventForDay] - Est un tableau:`, Array.isArray(discoveryData.RandomTables));
            console.log(`🎲 [rollRandomEventForDay] - Longueur:`, discoveryData.RandomTables?.length);

            if (!discoveryData.RandomTables || !Array.isArray(discoveryData.RandomTables) || discoveryData.RandomTables.length === 0) {
                console.error(`❌ [rollRandomEventForDay] Pas de tables aléatoires pour "${discoveryName}"`);
                alert(`Erreur: Aucune table aléatoire disponible pour "${discoveryName}".`);
                return;
            }

            console.log(`🎲 [rollRandomEventForDay] Récupération table à l'index ${tableIndex}...`);
            const randomTable = discoveryData.RandomTables[tableIndex];

            console.log(`🎲 [rollRandomEventForDay] Table trouvée:`, randomTable ? 'OUI' : 'NON');
            if (randomTable) {
                console.log(`🎲 [rollRandomEventForDay] Table:`, { name: randomTable.name, hasEntries: !!randomTable.entries });
            }

            if (!randomTable) {
                console.error(`❌ [rollRandomEventForDay] Table ${tableIndex} non trouvée (${discoveryData.RandomTables.length} tables disponibles)`);
                alert(`Erreur: Table d'index ${tableIndex} introuvable pour "${discoveryName}".`);
                return;
            }

            // Lancer le tirage
            console.log(`🎲 [rollRandomEventForDay] Appel de performRandomRoll avec le jour ${dayIndex + 1}...`);
            this.performRandomRoll(randomTable, dayIndex + 1);
            console.log(`🎲 [rollRandomEventForDay] ========== FIN ==========`);

        } catch (error) {
            console.error(`❌ [rollRandomEventForDay] ERREUR:`, error);
            console.error(`❌ [rollRandomEventForDay] Stack:`, error.stack);
            alert(`Erreur lors du tirage aléatoire: ${error.message}`);
        }
    }


    performRandomRoll(table, dayNumber) {
        console.log(`🎲 [DEBUG] ========== performRandomRoll DÉBUT ==========`);
        console.log(`🎲 [DEBUG] Table:`, table?.name);
        console.log(`🎲 [DEBUG] Jour:`, dayNumber);
        console.log(`🎲 [DEBUG] Table complète:`, table);

        if (!table) {
            console.error(`❌ [DEBUG] Table est null ou undefined`);
            return;
        }

        if (!table.entries) {
            console.error(`❌ [DEBUG] table.entries est null ou undefined`);
            return;
        }

        if (!Array.isArray(table.entries)) {
            console.error(`❌ [DEBUG] table.entries n'est pas un array:`, typeof table.entries);
            return;
        }

        if (table.entries.length === 0) {
            console.error(`❌ [DEBUG] table.entries est vide`);
            return;
        }

        console.log(`✅ [DEBUG] Table valide avec ${table.entries.length} entrées`);
        console.log(`🎲 [DEBUG] Entrées:`, table.entries);

        // Tirer aléatoirement une entrée
        const randomIndex = Math.floor(Math.random() * table.entries.length);
        console.log(`🎲 [DEBUG] Index tiré:`, randomIndex);

        const result = table.entries[randomIndex];
        console.log(`🎲 [DEBUG] Résultat tiré:`, result);

        // Stocker le résultat pour ce jour
        console.log(`🎲 [DEBUG] Stockage dans randomEvents[${dayNumber}]`);
        this.randomEvents[dayNumber] = result;
        console.log(`🎲 [DEBUG] randomEvents après stockage:`, this.randomEvents);

        // Sauvegarder dans localStorage spécifique au voyage
        console.log(`🎲 [DEBUG] Sauvegarde dans localStorage...`);
        this.saveRandomEventsForJourney();

        // Mettre à jour l'affichage
        console.log(`🎲 [DEBUG] Appel de renderAllDays...`);
        this.renderAllDays();
        console.log(`🎲 [DEBUG] ========== performRandomRoll FIN ==========`);
    }
}


export default VoyageManager;