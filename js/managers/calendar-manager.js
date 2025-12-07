
import { seasonSymbols, seasonNames } from '../utils/constants.js';

class CalendarManager {
    constructor() {
        this.calendarData = null;
        this.currentCalendarDate = null;
        this.isCalendarMode = false;
        this.currentSeason = 'printemps-debut';
        this.seasonSymbols = seasonSymbols;
        this.seasonNames = seasonNames;
    }

    init() {
        this.loadCalendarFromLocal();
        this.loadSavedSeason();
        this.setupSeasonListeners();
        this.updateSeasonDisplay();
        
        // Exposer les données globalement pour compatibilité
        this.exposeGlobalData();
    }
    
    exposeGlobalData() {
        window.calendarData = this.calendarData;
        window.currentCalendarDate = this.currentCalendarDate;
        window.isCalendarMode = this.isCalendarMode;
        window.currentSeason = this.currentSeason;
        
        console.log("📅 Données calendrier exposées globalement:", {
            calendarData: !!window.calendarData,
            currentCalendarDate: window.currentCalendarDate,
            isCalendarMode: window.isCalendarMode,
            currentSeason: window.currentSeason
        });
    }

    // --- Calendar Functions ---
    loadCalendarFromCSV(csvContent) {
        const lines = csvContent.trim().split('\n');
        const calendar = [];
        let currentMonth = null;

        for (const line of lines) {
            const parts = this.parseCSVLine(line);
            if (parts.length < 3) continue;

            const monthName = parts[0].trim();
            const season = parts[1].trim();
            const detailType = parts[2].trim();

            // Nouveau mois
            if (detailType === 'Jour') {
                const days = parts.slice(3).filter(d => d && d.trim()).map(d => parseInt(d.trim())).filter(d => !isNaN(d));
                
                currentMonth = {
                    name: monthName,
                    season: season,
                    days: [],
                    weather: [],
                    symbols: []
                };

                // Créer la structure pour chaque jour
                days.forEach(day => {
                    currentMonth.days.push({
                        day: day,
                        weather: '',
                        symbol: ''
                    });
                });

                calendar.push(currentMonth);
            }
            // Ligne météo
            else if (detailType === 'Météo' && currentMonth) {
                const weatherData = parts.slice(3).filter(d => d && d.trim());
                weatherData.forEach((weather, index) => {
                    if (currentMonth.days[index]) {
                        currentMonth.days[index].weather = weather.replace(/^"|"$/g, '').trim();
                    }
                });
            }
            // Ligne symboles
            else if (detailType === 'Symbole' && currentMonth) {
                const symbolData = parts.slice(3).filter(d => d && d.trim());
                symbolData.forEach((symbol, index) => {
                    if (currentMonth.days[index]) {
                        currentMonth.days[index].symbol = symbol.replace(/^"|"$/g, '').trim();
                    }
                });
            }
        }

        return calendar;
    }

    parseCSVLine(line) {
        const parts = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current);
        
        return parts;
    }

    saveCalendarToLocal(skipAutoSync = false) {
        console.log("📅 [saveCalendarToLocal] Début sauvegarde, skipAutoSync:", skipAutoSync);
        
        // VÉRIFIER LE FLAG IMMÉDIATEMENT
        const fromCloud = localStorage.getItem('calendar_from_cloud');
        if (fromCloud === 'true') {
            console.log("📅 [saveCalendarToLocal] FLAG CLOUD DÉTECTÉ - Sauvegarde SANS auto-sync");
            
            // Sauvegarder quand même les données localement
            if (this.calendarData) {
                localStorage.setItem('calendarData', JSON.stringify(this.calendarData));
            }
            if (this.currentCalendarDate) {
                localStorage.setItem('currentCalendarDate', JSON.stringify(this.currentCalendarDate));
            }
            localStorage.setItem('isCalendarMode', this.isCalendarMode.toString());
            localStorage.setItem('currentSeason', this.currentSeason);
            
            // Synchroniser les variables globales
            this.exposeGlobalData();
            
            // NE PAS NETTOYER LE FLAG ICI - il sera nettoyé par AuthManager
            return; // SORTIR IMMÉDIATEMENT sans auto-sync
        }
        
        console.log("📅 [saveCalendarToLocal] Données à sauvegarder:", {
            calendarData: this.calendarData ? `${this.calendarData.length} mois` : "null",
            currentCalendarDate: this.currentCalendarDate,
            isCalendarMode: this.isCalendarMode,
            currentSeason: this.currentSeason
        });
        
        if (this.calendarData) {
            localStorage.setItem('calendarData', JSON.stringify(this.calendarData));
        }
        if (this.currentCalendarDate) {
            localStorage.setItem('currentCalendarDate', JSON.stringify(this.currentCalendarDate));
        }
        localStorage.setItem('isCalendarMode', this.isCalendarMode.toString());
        localStorage.setItem('currentSeason', this.currentSeason);
        
        // Synchroniser les variables globales
        this.exposeGlobalData();
        
        // Marquer comme non sauvegardé et déclencher la synchronisation cloud si authentifié
        if (!skipAutoSync) {
            if (typeof window.markAsUnsaved === 'function') {
                window.markAsUnsaved();
            }
            if (typeof scheduleAutoSync === 'function') {
                console.log("📅 [saveCalendarToLocal] Déclenchement auto-sync");
                scheduleAutoSync();
            }
        }
    }

    loadCalendarFromLocal() {
        console.log("📅 [loadCalendarFromLocal] Début du chargement depuis localStorage");
        
        const savedCalendarData = localStorage.getItem('calendarData');
        const savedCurrentCalendarDate = localStorage.getItem('currentCalendarDate');
        const savedIsCalendarMode = localStorage.getItem('isCalendarMode');
        const fromCloud = localStorage.getItem('calendar_from_cloud');

        console.log("📅 [loadCalendarFromLocal] Valeurs brutes localStorage:", {
            savedCalendarData: savedCalendarData ? "présent" : "absent",
            savedCurrentCalendarDate: savedCurrentCalendarDate,
            savedIsCalendarMode: savedIsCalendarMode,
            fromCloud: fromCloud
        });

        if (savedCalendarData) {
            try {
                this.calendarData = JSON.parse(savedCalendarData);
                console.log("📅 [loadCalendarFromLocal] calendarData chargé:", this.calendarData ? `${this.calendarData.length} mois` : "null");
            } catch (e) {
                console.error('Error loading calendar data:', e);
            }
        }

        if (savedCurrentCalendarDate) {
            try {
                this.currentCalendarDate = JSON.parse(savedCurrentCalendarDate);
                console.log("📅 [loadCalendarFromLocal] currentCalendarDate chargé:", this.currentCalendarDate);
            } catch (e) {
                console.error('Error loading calendar date:', e);
            }
        }

        if (savedIsCalendarMode) {
            this.isCalendarMode = savedIsCalendarMode === 'true';
            console.log("📅 [loadCalendarFromLocal] isCalendarMode chargé:", this.isCalendarMode);
        }

        console.log("📅 [loadCalendarFromLocal] État final CalendarManager:", {
            calendarData: this.calendarData ? `${this.calendarData.length} mois` : "null",
            currentCalendarDate: this.currentCalendarDate,
            isCalendarMode: this.isCalendarMode,
            currentSeason: this.currentSeason
        });
    }

    loadSavedSeason() {
        const saved = localStorage.getItem('currentSeason');
        if (saved && this.seasonNames[saved]) {
            this.currentSeason = saved;
        }
        this.updateSeasonDisplay();
    }

    updateSeasonDisplay() {
        const seasonIndicator = document.getElementById('season-indicator');
        const calendarDateIndicator = document.getElementById('calendar-date-indicator');

        if (!seasonIndicator) return;

        // Déterminer la saison principale (printemps, été, automne, hiver)
        const seasonMainName = this.currentSeason.split('-')[0];
        let symbol = this.seasonSymbols[seasonMainName] || '🌱';
        const fullName = this.seasonNames[this.currentSeason] || 'Printemps-début';

        // Si on a un calendrier avec météo, utiliser le symbole du jour
        let weatherTooltip = fullName;
        if (this.isCalendarMode && this.currentCalendarDate && this.calendarData) {
            const dayData = this.getDayData(this.currentCalendarDate.month, this.currentCalendarDate.day);
            console.log("🌤️ Données météo du jour récupérées:", dayData);
            if (dayData && dayData.symbol) {
                symbol = dayData.symbol;
                if (dayData.weather) {
                    weatherTooltip = `${fullName} - ${dayData.weather}`;
                }
            }
        }

        console.log("🌱 Affichage saison:", {
            currentSeason: this.currentSeason,
            seasonMainName: seasonMainName,
            symbol: symbol,
            fullName: fullName,
            isCalendarMode: this.isCalendarMode,
            currentDate: this.currentCalendarDate
        });

        seasonIndicator.innerHTML = symbol;
        seasonIndicator.title = weatherTooltip;

        // Afficher la date du calendrier avec météo si elle existe
        if (calendarDateIndicator) {
            if (this.isCalendarMode && this.currentCalendarDate) {
                const dayData = this.getDayData(this.currentCalendarDate.month, this.currentCalendarDate.day);
                calendarDateIndicator.innerHTML = `${this.currentCalendarDate.day} ${this.currentCalendarDate.month}`;
                if (dayData && dayData.weather) {
                    calendarDateIndicator.title = `Météo : ${dayData.weather}`;
                }
                calendarDateIndicator.classList.remove('hidden');
            } else {
                calendarDateIndicator.classList.add('hidden');
            }
        }

        // Update settings display
        const currentSeasonSymbol = document.getElementById('current-season-symbol');
        const currentSeasonText = document.getElementById('current-season-text');
        const currentCalendarDateElement = document.getElementById('current-calendar-date');

        if (currentSeasonSymbol) currentSeasonSymbol.textContent = symbol;
        if (currentSeasonText) currentSeasonText.textContent = fullName;

        if (currentCalendarDateElement && this.currentCalendarDate && this.isCalendarMode) {
            currentCalendarDateElement.textContent = `${this.currentCalendarDate.day} ${this.currentCalendarDate.month}`;
            currentCalendarDateElement.classList.remove('hidden');
        } else if (currentCalendarDateElement) {
            currentCalendarDateElement.classList.add('hidden');
        }
    }

    getDayData(monthName, day) {
        if (!this.calendarData) return null;
        
        const month = this.calendarData.find(m => m.name === monthName);
        if (!month || !month.days) return null;
        
        // Gérer à la fois l'ancien format (nombres) et le nouveau format (objets)
        const dayData = month.days.find(d => {
            if (typeof d === 'object') {
                return d.day === day;
            }
            return d === day;
        });
        
        // Si c'est un nombre simple, retourner un objet avec juste le numéro du jour
        if (typeof dayData === 'number') {
            return { day: dayData, weather: null, symbol: null };
        }
        
        return dayData || null;
    }

    setupSeasonListeners() {
        // Cette méthode sera appelée pour configurer les listeners dans les paramètres
        console.log("📅 Configuration des listeners de saison via CalendarManager");
    }

    reinitializeListeners() {
        // Réinitialiser les listeners si nécessaire
        console.log("📅 Réinitialisation des listeners CalendarManager");
        this.setupSeasonListeners();
    }

    // Getters et setters pour compatibilité
    getCurrentSeason() {
        return this.currentSeason;
    }

    setCurrentSeason(season) {
        if (this.seasonNames[season]) {
            this.currentSeason = season;
            localStorage.setItem('currentSeason', this.currentSeason);
            this.updateSeasonDisplay();
        }
    }

    getCalendarData() {
        return this.calendarData;
    }

    setCalendarData(data) {
        this.calendarData = data;
        this.saveCalendarToLocal();
    }

    getCurrentCalendarDate() {
        return this.currentCalendarDate;
    }

    setCurrentCalendarDate(date) {
        this.currentCalendarDate = date;
        this.saveCalendarToLocal();
    }

    getIsCalendarMode() {
        return this.isCalendarMode;
    }

    setIsCalendarMode(mode) {
        this.isCalendarMode = mode;
        this.saveCalendarToLocal();
        this.updateSeasonDisplay();
    }

    updateCalendarUI() {
        const calendarStatus = document.getElementById('calendar-status-text');
        const dateSelector = document.getElementById('calendar-date-selector');
        const monthSelect = document.getElementById('calendar-month-select');
        const daySelect = document.getElementById('calendar-day-select');
        const manualSeasons = document.getElementById('manual-seasons-section');
        const seasonModeInfo = document.getElementById('season-mode-info');

        if (this.calendarData && this.calendarData.length > 0) {
            this.isCalendarMode = true;
            calendarStatus.textContent = `Calendrier chargé (${this.calendarData.length} mois)`;
            calendarStatus.className = 'text-green-400';
            dateSelector.classList.remove('hidden');

            // Populate month selector with season icons
            monthSelect.innerHTML = '<option value="">Sélectionner un mois</option>';
            this.calendarData.forEach((month, index) => {
                const option = document.createElement('option');
                option.value = index;
                // Get season icon
                const seasonMainName = month.season.toLowerCase().split('-')[0];
                const seasonIcon = this.seasonSymbols[seasonMainName] || '🌿';
                option.textContent = `${seasonIcon} ${month.name}`;
                monthSelect.appendChild(option);
            });

            // Set current selections
            if (this.currentCalendarDate) {
                const monthIndex = this.calendarData.findIndex(m => m.name === this.currentCalendarDate.month);
                if (monthIndex >= 0) {
                    monthSelect.value = monthIndex;
                    this.updateDaySelector();
                    daySelect.value = this.currentCalendarDate.day;
                }
            }

            // Hide manual seasons completely
            manualSeasons.style.display = 'none';
            seasonModeInfo.textContent = 'Mode calendrier : la saison est déterminée automatiquement par la date sélectionnée.';
        } else {
            this.isCalendarMode = false;
            calendarStatus.textContent = 'Aucun calendrier chargé';
            calendarStatus.className = 'text-gray-400';
            dateSelector.classList.add('hidden');

            // Show manual seasons
            manualSeasons.style.display = 'block';
            seasonModeInfo.textContent = 'Mode manuel : sélectionnez une saison. Importez un calendrier CSV pour synchroniser automatiquement les saisons avec les dates.';
        }
    }

    updateDaySelector() {
        const monthSelect = document.getElementById('calendar-month-select');
        const daySelect = document.getElementById('calendar-day-select');
        const monthIndex = parseInt(monthSelect.value);

        daySelect.innerHTML = '<option value="">Sélectionner un jour</option>';

        if (monthIndex >= 0 && this.calendarData[monthIndex]) {
            const month = this.calendarData[monthIndex];
            month.days.forEach(dayData => {
                const option = document.createElement('option');
                // Gérer à la fois l'ancien format (nombres) et le nouveau format (objets)
                const dayNumber = typeof dayData === 'object' ? dayData.day : dayData;
                option.value = dayNumber;
                option.textContent = dayNumber;
                daySelect.appendChild(option);
            });
        }
    }

    updateCalendarDate() {
        console.log("📅 [updateCalendarDate] Début mise à jour date");
        
        const fromCloud = localStorage.getItem('calendar_from_cloud');
        console.log("📅 [updateCalendarDate] Flag calendar_from_cloud:", fromCloud);
        
        const monthSelect = document.getElementById('calendar-month-select');
        const daySelect = document.getElementById('calendar-day-select');
        const monthIndex = parseInt(monthSelect.value);
        const day = parseInt(daySelect.value);

        console.log("📅 [updateCalendarDate] Valeurs sélectionnées:", {
            monthIndex: monthIndex,
            day: day
        });

        if (monthIndex >= 0 && !isNaN(day) && this.calendarData[monthIndex]) {
            const month = this.calendarData[monthIndex];
            
            console.log("📅 [updateCalendarDate] AVANT modification:", {
                currentCalendarDate: this.currentCalendarDate,
                currentSeason: this.currentSeason
            });
            
            this.currentCalendarDate = {
                month: month.name,
                day: day
            };

            // Update season based on exact calendar season - use the season directly from CSV
            // Convertir en minuscules et normaliser les caractères accentués pour matcher les clés de seasonNames
            const calendarSeason = month.season.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, ''); // Retire les accents
            console.log("📅 [updateCalendarDate] Saison du calendrier CSV:", month.season, "→ normalisée:", calendarSeason, "pour le mois:", month.name);

            // Use the exact season from the CSV as-is
            this.currentSeason = calendarSeason;

            console.log("📅 [updateCalendarDate] APRÈS modification:", {
                currentCalendarDate: this.currentCalendarDate,
                currentSeason: this.currentSeason
            });

            // Save the season for consistency
            localStorage.setItem('currentSeason', this.currentSeason);

            this.updateSeasonDisplay();
            this.saveCalendarToLocal();
            
            // Marquer comme non sauvegardé et synchroniser avec la fonction globale si elle existe
            if (typeof window.markAsUnsaved === 'function') {
                window.markAsUnsaved();
            }
            if (typeof scheduleAutoSync === 'function') {
                console.log("📅 [updateCalendarDate] Appel scheduleAutoSync");
                scheduleAutoSync();
            }
        } else {
            console.log("📅 [updateCalendarDate] Conditions non remplies pour mise à jour");
        }
    }

    exportCalendarToCSV() {
        if (!this.calendarData || this.calendarData.length === 0) {
            alert('Aucun calendrier à exporter');
            return;
        }

        const csvLines = this.calendarData.map(month => {
            const daysStr = month.days.join(',');
            return `${month.name},${month.season},${daysStr}`;
        });

        const csvContent = csvLines.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'calendrier.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- Season Functions (méthode updateSeasonDisplay déjà définie plus haut) ---

    setupSeasonListeners() {
        // Season radio buttons (manual mode)
        document.querySelectorAll('input[name="season"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked && !this.isCalendarMode) {
                    this.currentSeason = e.target.value;
                    localStorage.setItem('currentSeason', this.currentSeason);
                    this.updateSeasonDisplay();
                    
                    // Synchroniser avec la fonction globale si elle existe
                    if (typeof scheduleAutoSync === 'function') {
                        scheduleAutoSync();
                    }
                }
            });
        });

        // Calendar upload button
        const uploadBtn = document.getElementById('upload-calendar-btn');
        const fileInput = document.getElementById('calendar-file-input');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type === 'text/csv') {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            this.calendarData = this.loadCalendarFromCSV(event.target.result);
                            if (this.calendarData.length > 0) {
                                // Set default date (first day of first month)
                                this.currentCalendarDate = {
                                    month: this.calendarData[0].name,
                                    day: this.calendarData[0].days[0]
                                };
                                this.isCalendarMode = true;
                                this.updateCalendarUI();
                                this.updateCalendarDate();
                                this.exposeGlobalData();
                                alert(`Calendrier importé avec succès (${this.calendarData.length} mois)`);
                            } else {
                                alert('Fichier CSV invalide ou vide');
                            }
                        } catch (error) {
                            console.error('Error importing calendar:', error);
                            alert('Erreur lors de l\'importation du calendrier');
                        }
                    };
                    reader.readAsText(file);
                } else {
                    alert('Veuillez sélectionner un fichier CSV valide');
                }
                fileInput.value = ''; // Reset input
            });
        }

        // Calendar export button
        const exportBtn = document.getElementById('export-calendar-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCalendarToCSV());
        }

        // Calendar month selector
        const monthSelect = document.getElementById('calendar-month-select');
        if (monthSelect) {
            monthSelect.addEventListener('change', () => {
                this.updateDaySelector();
                this.updateCalendarDate();
            });
        }

        // Calendar day selector
        const daySelect = document.getElementById('calendar-day-select');
        if (daySelect) {
            daySelect.addEventListener('change', () => this.updateCalendarDate());
        }
    }

    loadSavedSeason() {
        // Load calendar data first
        this.loadCalendarFromLocal();

        const saved = localStorage.getItem('currentSeason');
        if (saved && this.seasonNames[saved]) {
            this.currentSeason = saved;
        }

        // Update UI based on calendar mode
        if (this.isCalendarMode && this.calendarData) {
            this.updateCalendarUI();
        } else {
            // Update radio button for manual mode
            const radioButton = document.querySelector(`input[name="season"][value="${this.currentSeason}"]`);
            if (radioButton) {
                radioButton.checked = true;
            }
            this.updateCalendarUI();
        }

        this.updateSeasonDisplay();
    }

    // --- Méthode pour réinitialiser les listeners (utile lors de l'ouverture des paramètres) ---
    reinitializeListeners() {
        this.setupSeasonListeners();
    }

    // --- Getters pour exposer les données (compatibilité avec le code existant) ---
    getCurrentSeason() {
        return this.currentSeason;
    }

    getCurrentCalendarDate() {
        return this.currentCalendarDate;
    }

    getCalendarData() {
        return this.calendarData;
    }

    getIsCalendarMode() {
        return this.isCalendarMode;
    }

    getSeasonNames() {
        return this.seasonNames;
    }

    getSeasonSymbols() {
        return this.seasonSymbols;
    }

    // --- Setters pour la compatibilité avec le code existant ---
    setCalendarData(data) {
        this.calendarData = data;
        this.saveCalendarToLocal();
    }

    setCurrentCalendarDate(date) {
        this.currentCalendarDate = date;
        this.saveCalendarToLocal();
    }

    setIsCalendarMode(mode) {
        this.isCalendarMode = mode;
        this.saveCalendarToLocal();
    }
}

// Exporter la classe pour utilisation dans d'autres modules
window.CalendarManager = CalendarManager;
