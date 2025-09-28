
class CalendarManager {
    constructor() {
        this.calendarData = null;
        this.currentCalendarDate = null;
        this.isCalendarMode = false;
        this.currentSeason = 'printemps-debut';
        
        this.seasonSymbols = {
            'printemps': '🌱',
            'ete': '☀️',
            'automne': '🍂',
            'hiver': '❄️'
        };

        this.seasonNames = {
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
    }

    init() {
        this.loadCalendarFromLocal();
        this.loadSavedSeason();
        this.setupSeasonListeners();
        this.updateSeasonDisplay();
    }

    // --- Calendar Functions ---
    loadCalendarFromCSV(csvContent) {
        const lines = csvContent.trim().split('\n');
        const calendar = [];

        for (const line of lines) {
            const parts = line.split(',');
            if (parts.length >= 3) {
                const monthName = parts[0].trim();
                const season = parts[1].trim();
                const days = parts.slice(2).map(d => parseInt(d.trim())).filter(d => !isNaN(d));

                calendar.push({
                    name: monthName,
                    season: season,
                    days: days
                });
            }
        }

        return calendar;
    }

    saveCalendarToLocal() {
        if (this.calendarData) {
            localStorage.setItem('calendarData', JSON.stringify(this.calendarData));
        }
        if (this.currentCalendarDate) {
            localStorage.setItem('currentCalendarDate', JSON.stringify(this.currentCalendarDate));
        }
        localStorage.setItem('isCalendarMode', this.isCalendarMode.toString());
    }

    loadCalendarFromLocal() {
        const savedCalendar = localStorage.getItem('calendarData');
        const savedDate = localStorage.getItem('currentCalendarDate');
        const savedMode = localStorage.getItem('isCalendarMode');

        if (savedCalendar) {
            try {
                this.calendarData = JSON.parse(savedCalendar);
            } catch (e) {
                console.error('Error loading calendar:', e);
            }
        }

        if (savedDate) {
            try {
                this.currentCalendarDate = JSON.parse(savedDate);
            } catch (e) {
                console.error('Error loading calendar date:', e);
            }
        }

        this.isCalendarMode = savedMode === 'true';
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
            month.days.forEach(day => {
                const option = document.createElement('option');
                option.value = day;
                option.textContent = day;
                daySelect.appendChild(option);
            });
        }
    }

    updateCalendarDate() {
        const monthSelect = document.getElementById('calendar-month-select');
        const daySelect = document.getElementById('calendar-day-select');
        const monthIndex = parseInt(monthSelect.value);
        const day = parseInt(daySelect.value);

        if (monthIndex >= 0 && !isNaN(day) && this.calendarData[monthIndex]) {
            const month = this.calendarData[monthIndex];
            this.currentCalendarDate = {
                month: month.name,
                day: day
            };

            // Update season based on exact calendar season - use the season directly from CSV
            const calendarSeason = month.season.toLowerCase();
            console.log("📅 Saison du calendrier CSV:", calendarSeason, "pour le mois:", month.name);

            // Use the exact season from the CSV as-is
            this.currentSeason = calendarSeason;

            // Save the season for consistency
            localStorage.setItem('currentSeason', this.currentSeason);

            this.updateSeasonDisplay();
            this.saveCalendarToLocal();
            
            // Synchroniser avec la fonction globale si elle existe
            if (typeof scheduleAutoSync === 'function') {
                scheduleAutoSync();
            }
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

    // --- Season Functions ---
    updateSeasonDisplay() {
        const seasonMainName = this.currentSeason.split('-')[0]; // 'printemps', 'ete', etc.
        const symbol = this.seasonSymbols[seasonMainName] || '🌿'; // fallback symbol

        // Use the season name from seasonNames if available, otherwise use currentSeason directly
        const fullName = this.seasonNames[this.currentSeason] || this.currentSeason.charAt(0).toUpperCase() + this.currentSeason.slice(1);

        console.log("🌱 Affichage saison:", {
            currentSeason: this.currentSeason,
            seasonMainName: seasonMainName,
            symbol: symbol,
            fullName: fullName,
            isCalendarMode: this.isCalendarMode
        });

        // Update header indicator
        const seasonIndicator = document.getElementById('season-indicator');
        if (seasonIndicator) {
            seasonIndicator.textContent = symbol;
            seasonIndicator.title = `Saison actuelle: ${fullName}`;
        }

        // Update calendar date indicator in header
        const calendarDateIndicator = document.getElementById('calendar-date-indicator');
        if (calendarDateIndicator && this.currentCalendarDate && this.isCalendarMode) {
            calendarDateIndicator.textContent = `${this.currentCalendarDate.day} ${this.currentCalendarDate.month}`;
            calendarDateIndicator.classList.remove('hidden');
        } else if (calendarDateIndicator) {
            calendarDateIndicator.classList.add('hidden');
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
                                this.updateCalendarUI();
                                this.updateCalendarDate();
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
