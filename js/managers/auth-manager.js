import CampaignManager from './campaign-manager.js';

class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.autoSyncEnabled = false;
        this.autoSyncTimeoutId = null;
        this.autoSyncDelay = 2000;
        this.lastSyncTimestamp = null;
        this.isSyncing = false;
        this.hasUnsavedChanges = false;
        this.isLoadingFromCloud = false;

        this.currentMode = null;
        this.currentCampaignId = null;
        this.campaignManager = new CampaignManager();

        this.authBtn = null;
        this.authModal = null;
        this.envPrefix = null;
        this.isStandaloneCampaign = false;
    }

    init() {
        this.logAuth("🔑 Initialisation AuthManager");
        window.campaignManager = this.campaignManager;
        this.setupDOMReferences();
        this.setupEventListeners();

        const sharedUuid = this.checkSharedViewMode();
        if (sharedUuid) {
            window.isViewerMode = true;
            this.loadSharedData(sharedUuid);
        } else {
            this.checkAuthenticationStatus();
            this.handleAuthCallback();
        }
        this.updateLastSyncDateDisplay();
    }

    checkSharedViewMode() {
        const match = window.location.pathname.match(/^\/share\/([a-zA-Z0-9-]+)$/);
        return match ? match[1] : null;
    }

    async loadSharedData(uuid) {
        try {
            const response = await fetch(`/api/share/data/${uuid}`);
            if (!response.ok) throw new Error("Lien invalide");
            const data = await response.json();
            await this.applyContextData(data);
            if (typeof window.renderLocations === 'function') window.renderLocations();
            if (typeof window.renderRegions === 'function') window.renderRegions();
            this.enableViewerMode(data.forcedActiveMapUrl);
        } catch (error) {
            console.error("Erreur shared data:", error);
            window.location.href = '/';
        }
    }

    enableViewerMode(activeMapUrl) {
        window.isViewerMode = true;
        if (window.positionManager) {
            window.positionManager.setLockedMode(true);
            window.positionManager.adventureMode = 'player';
            window.positionManager.updateAdventureModeIndicator();
            window.positionManager.updateBodyClass();
        }
        // Ajouter campaigns-btn et campaign-name-display à la liste des éléments à masquer
        const elementsToHide = ['settings-btn', 'auth-btn', 'quick-sync-btn', 'map-switch', 'add-location-mode', 'add-region-mode', 'draw-mode', 'random-roll-btn', 'journal-btn', 'quit-save-btn', 'campaigns-btn', 'campaign-name-display'];
        elementsToHide.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        const filterBtn = document.getElementById('filter-btn');
        if (filterBtn) filterBtn.classList.remove('hidden');

        if (activeMapUrl && window.settingsManager) {
            window.settingsManager.activeMapUrl = activeMapUrl;
            const map = window.settingsManager.availableMaps.find(m => m.url === activeMapUrl);
            if (map) window.settingsManager.activeMapName = map.name;
            const mapImage = document.getElementById('map-image');
            if (mapImage) mapImage.src = activeMapUrl;
        }
    }

    setupDOMReferences() {
        this.authBtn = document.getElementById('auth-btn');
        this.authModal = document.getElementById('auth-modal');
        this.authIcon = document.getElementById('auth-icon');
        this.userProfilePic = document.getElementById('user-profile-pic');
        this.authUserName = document.getElementById('auth-user-name');
        this.loggedInPanel = document.getElementById('logged-in-panel');
        this.loggedOutPanel = document.getElementById('logged-out-panel');
        this.authStatusPanel = document.getElementById('auth-status-panel');
        this.authContentPanel = document.getElementById('auth-content-panel');
        this.googleSigninBtn = document.getElementById('google-signin-btn');
        this.closeAuthModalBtn = document.getElementById('close-auth-modal');
        this.unauthenticatedWarning = document.getElementById('unauthenticated-warning');
        this.manualSyncBtn = document.getElementById('manual-sync-btn');
        this.syncStatusIndicator = document.getElementById('sync-status-indicator');
        this.quickSyncBtn = document.getElementById('quick-sync-btn');
        this.modalSyncBtn = document.getElementById('modal-sync-btn');
        this.lastSyncDateDiv = document.getElementById('last-sync-date');
        this.quitSaveBtn = document.getElementById('quit-save-btn');
        this.debugCloudDataBtn = document.getElementById('debug-cloud-data');

        // Nouveaux éléments
        this.campaignsBtn = document.getElementById('campaigns-btn');
        this.campaignNameDisplay = document.getElementById('campaign-name-display');
    }

    setupEventListeners() {
        if (this.authBtn) this.authBtn.addEventListener('click', () => this.showAuthModal());
        if (this.closeAuthModalBtn) this.closeAuthModalBtn.addEventListener('click', () => this.hideAuthModal());
        if (this.googleSigninBtn) this.googleSigninBtn.addEventListener('click', () => this.startGoogleAuth());
        if (this.manualSyncBtn) this.manualSyncBtn.addEventListener('click', () => this.manualSync());
        if (this.modalSyncBtn) this.modalSyncBtn.addEventListener('click', () => this.manualSync());
        if (this.quitSaveBtn) this.quitSaveBtn.addEventListener('click', () => this.handleQuitAndSave());
        if (this.debugCloudDataBtn) this.debugCloudDataBtn.addEventListener('click', () => this.handleDebugCloudData());

        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) logoutLink.addEventListener('click', (e) => this.handleLogout(e));

        // Listeners pour les campagnes
        if (this.campaignsBtn) {
            this.campaignsBtn.addEventListener('click', () => {
                this.campaignManager.showSelector();
            });
        }

        if (this.campaignNameDisplay) {
            this.campaignNameDisplay.addEventListener('click', () => {
                this.campaignManager.showSelector();
            });
        }
    }

    async checkAuthenticationStatus() {
        try {
            const response = await fetch('/api/auth/user');
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated && data.user) {
                    this.currentUser = data.user;
                    this.isAuthenticated = true;
                    this.updateUIForAuthenticatedUser();
                    // Au démarrage, afficher le sélecteur si aucune campagne n'est chargée
                    if (!this.currentCampaignId) {
                        this.campaignManager.showSelector();
                    }
                } else {
                    this.updateUIForUnauthenticatedUser();
                }
            } else {
                console.error("Erreur checkAuthenticationStatus: Réponse non OK");
                this.updateUIForUnauthenticatedUser();
            }
        } catch (error) {
            console.error("Erreur checkAuthenticationStatus:", error);
            this.updateUIForUnauthenticatedUser();
        }
    }

    // ... UI Helpers ...
    showAuthModal() {
        if (this.authModal) {
            this.authModal.classList.remove('hidden');
            if(!this.isAuthenticated) this.checkAuthenticationStatus();
        }
    }
    hideAuthModal() { if (this.authModal) this.authModal.classList.add('hidden'); }
    startGoogleAuth() { window.location.href = '/auth/google'; }

    updateUIForAuthenticatedUser() {
        // Cacher le loader et montrer le contenu
        if (this.authStatusPanel) this.authStatusPanel.classList.add('hidden');
        if (this.authContentPanel) this.authContentPanel.classList.remove('hidden');

        if (this.authIcon) this.authIcon.style.display = 'none';
        if (this.userProfilePic && this.currentUser.picture) {
            this.userProfilePic.src = this.currentUser.picture;
            this.userProfilePic.classList.remove('hidden');
        }
        if (this.loggedInPanel) this.loggedInPanel.classList.remove('hidden');
        if (this.loggedOutPanel) this.loggedOutPanel.classList.add('hidden');
        this.updateUnauthenticatedWarning(false);

        // Afficher le bouton campagnes
        if (this.campaignsBtn) this.campaignsBtn.classList.remove('hidden');
    }

    updateUIForUnauthenticatedUser() {
        // Cacher le loader et montrer le contenu
        if (this.authStatusPanel) this.authStatusPanel.classList.add('hidden');
        if (this.authContentPanel) this.authContentPanel.classList.remove('hidden');

        if (this.authIcon) this.authIcon.style.display = 'block';
        if (this.userProfilePic) this.userProfilePic.classList.add('hidden');
        if (this.loggedInPanel) this.loggedInPanel.classList.add('hidden');
        if (this.loggedOutPanel) this.loggedOutPanel.classList.remove('hidden');
        this.updateUnauthenticatedWarning(true);

        // Masquer le bouton campagnes et le nom
        if (this.campaignsBtn) this.campaignsBtn.classList.add('hidden');
        if (this.campaignNameDisplay) this.campaignNameDisplay.classList.add('hidden');
    }

    updateUnauthenticatedWarning(show) {
        if (this.unauthenticatedWarning) {
            show && !this.isAuthenticated ? this.unauthenticatedWarning.classList.remove('hidden') : this.unauthenticatedWarning.classList.add('hidden');
        }
    }

    async loadGameContext(mode, campaignId = null, campaignName = null) {
        this.isLoadingFromCloud = true;
        this.currentMode = mode;
        this.currentCampaignId = campaignId;

        // Mise à jour de l'affichage du nom de la campagne
        if (this.campaignNameDisplay) {
            if (campaignName) {
                const nameSpan = this.campaignNameDisplay.querySelector('#campaign-name-text') || this.campaignNameDisplay;
                if(nameSpan.tagName === 'SPAN') nameSpan.textContent = campaignName;
                else this.campaignNameDisplay.textContent = campaignName;

                this.campaignNameDisplay.classList.remove('hidden');
            } else {
                this.campaignNameDisplay.classList.add('hidden');
            }
        }

        try {
            let finalData = {};

            if (mode === 'campaign' && campaignId) {
                const campRes = await fetch(`/api/campaigns/${campaignId}`);
                const campaignData = await campRes.json();

                if (campaignData.is_standalone) {
                    this.isStandaloneCampaign = true;
                    finalData = campaignData;
                    // Ensure structures for empty campaign
                    if (!finalData.locations) finalData.locations = { locations: [] };
                    if (!finalData.regions) finalData.regions = { regions: [] };
                    if (!finalData.characters) finalData.characters = { characters: [] };
                    if (!finalData.settings) finalData.settings = { availableMaps: [] };

                    finalData.adventureMode = true;
                } else {
                    this.isStandaloneCampaign = false;
                    const baseRes = await fetch('/api/base_world');
                    let baseData = await baseRes.json();

                    // Legacy fallback
                    if (!baseData || !baseData.locations || baseData.locations.locations.length === 0) {
                        const legacyRes = await fetch('/api/user/data');
                        if (legacyRes.ok) {
                            const legacyData = await legacyRes.json();
                            if (legacyData.locations && legacyData.locations.locations.length > 0) baseData = legacyData;
                        }
                    }

                    finalData = { ...baseData };

                    // Merge Custom Locations from Campaign
                    if (campaignData.custom_locations && Array.isArray(campaignData.custom_locations)) {
                        if (!finalData.locations) finalData.locations = { locations: [] };
                        campaignData.custom_locations.forEach(customLoc => {
                            // Check if not already present (optimization)
                            if (!finalData.locations.locations.some(l => l.id === customLoc.id)) {
                                finalData.locations.locations.push(customLoc);
                            }
                        });
                    }

                    // Merge Custom Regions from Campaign
                    if (campaignData.custom_regions && Array.isArray(campaignData.custom_regions)) {
                        if (!finalData.regions) finalData.regions = { regions: [] };
                        campaignData.custom_regions.forEach(customReg => {
                            // Check if not already present (optimization)
                            if (!finalData.regions.regions.some(r => r.id === customReg.id)) {
                                finalData.regions.regions.push(customReg);
                            }
                        });
                    }

                    // Merge Locations
                    if (finalData.locations && finalData.locations.locations) {
                        finalData.locations.locations = finalData.locations.locations.map(loc => {
                            const state = campaignData.locations_states[loc.id];
                            return state ? { ...loc, ...state } : { ...loc, known: false, visited: false };
                        });
                    }
                    // Merge Regions
                    if (finalData.regions && finalData.regions.regions) {
                        finalData.regions.regions = finalData.regions.regions.map(reg => {
                            const state = campaignData.regions_states[reg.id];
                            return state ? { ...reg, ...state } : { ...reg, known: false, visited: false };
                        });
                    }

                    finalData.calendar = campaignData.calendar || {};
                    finalData.journal = campaignData.journal || [];
                    finalData.position = campaignData.position;
                    finalData.activeJourney = campaignData.activeJourney;
                    finalData.counters = campaignData.counters || [];
                    finalData.adventureMode = true;
                }
            } else {
                // Base World Mode
                this.isStandaloneCampaign = false;
                const baseRes = await fetch('/api/base_world');
                let baseData = await baseRes.json();

                // Legacy fallback
                if (!baseData || !baseData.locations || baseData.locations.locations.length === 0) {
                    const legacyRes = await fetch('/api/user/data');
                    if (legacyRes.ok) {
                        const legacyData = await legacyRes.json();
                        if (legacyData.locations && legacyData.locations.locations.length > 0) baseData = legacyData;
                    }
                }

                finalData = { ...baseData };
                finalData.adventureMode = false;
            }

            await this.applyContextData(finalData);

            // Afficher le bouton Quitter et Enregistrer
            if (this.quitSaveBtn) this.quitSaveBtn.classList.remove('hidden');

        } catch (e) {
            console.error("Erreur loadGameContext:", e);
            alert("Erreur: " + e.message);
            this.campaignManager.showSelector();
        } finally {
            this.isLoadingFromCloud = false;
        }
    }

    async handleQuitAndSave() {
        if (confirm("Voulez-vous enregistrer et quitter la session en cours ?")) {
            await this.manualSync();
            this.campaignManager.showSelector();
            if (this.quitSaveBtn) this.quitSaveBtn.classList.add('hidden');
            // Reset display
            if (this.campaignNameDisplay) this.campaignNameDisplay.classList.add('hidden');
        }
    }

    collectCurrentContextData(forCampaign = false) {
        const globalData = {
            locations: window.locationsData || { locations: [] },
            regions: window.regionsData || { regions: [] },
            characters: window.charactersManager?.charactersData || { characters: [] },
            settings: {
                activeMapUrl: window.settingsManager?.activeMapUrl || null,
                availableMaps: window.settingsManager?.availableMaps || [],
                mapRandomTables: window.settingsManager?.mapRandomTables || {}
            }
        };

        if (this.currentMode === 'base' && !forCampaign) {
            return {
                locations: globalData.locations,
                regions: globalData.regions,
                characters: globalData.characters,
                settings: globalData.settings
            };
        } else if (this.currentMode === 'campaign' || forCampaign) {
            // Common dynamic data
            const dynamicData = {
                calendar: {
                    currentDate: localStorage.getItem('currentDate'),
                    isCalendarMode: localStorage.getItem('isCalendarMode') === 'true',
                    calendarData: window.calendarManager?.calendarData,
                    currentCalendarDate: window.calendarManager?.currentCalendarDate,
                    currentSeason: window.calendarManager?.currentSeason
                },
                position: JSON.parse(localStorage.getItem('adventurers_position') || 'null'),
                journal: window.journalManager ? window.journalManager.getAllData() : [],
                activeJourney: {
                    path: window.journeyPath || [],
                    discoveries: window.journeyDiscoveries || [],
                    dayByDayData: window.voyageManager?.dayByDayData || [],
                    descriptions: window.voyageManager?.journeyDescriptions || {},
                    randomEvents: window.voyageManager?.randomEvents || {},
                    startDate: window.voyageManager?.journeyStartDate || null,
                    totalDays: window.voyageManager?.totalJourneyDays || 0,
                    isDrawingMode: window.pathManager?.isDrawingMode || false
                },
                counters: window.countersManager ? window.countersManager.getCounters() : [],
                adventureMode: window.positionManager ? window.positionManager.adventureMode : true
            };

            if (this.isStandaloneCampaign && !forCampaign) {
                // Pour une campagne autonome, on sauvegarde TOUT (comme le monde de base)
                return {
                    ...dynamicData,
                    locations: globalData.locations,
                    regions: globalData.regions,
                    characters: globalData.characters,
                    settings: globalData.settings,
                    is_standalone: true
                };
            }

            const locations_states = {};
            const custom_locations = [];
            if (globalData.locations.locations) {
                globalData.locations.locations.forEach(loc => {
                    // Collect custom locations
                    if (loc.type === 'custom') {
                        custom_locations.push(loc);
                    }

                    // En mode campagne ou clonage, on sauvegarde l'état
                    // Si forCampaign est vrai (clonage), on sauvegarde tout ce qui est pertinent pour l'état
                    if (loc.known || loc.visited || loc.custom_notes || forCampaign) {
                        locations_states[loc.id] = {
                            known: loc.known,
                            visited: loc.visited,
                            custom_notes: loc.custom_notes,
                            coordinates: loc.coordinates // Sauvegarder les positions modifiées
                        };
                    }
                });
            }
            const regions_states = {};
            const custom_regions = [];
            if (globalData.regions.regions) {
                globalData.regions.regions.forEach(reg => {
                    // Collect custom regions
                    if (reg.type === 'custom') {
                        custom_regions.push(reg);
                    }

                    if (reg.known || reg.visited || forCampaign) {
                        regions_states[reg.id] = { known: reg.known, visited: reg.visited };
                    }
                });
            }
            return {
                ...dynamicData,
                locations_states,
                regions_states,
                custom_locations,
                custom_regions
            };
        }
        return {};
    }

    async syncUserData() {
        if (!this.isAuthenticated || !this.currentMode) return;

        try {
            const dataToSave = this.collectCurrentContextData();
            let url = this.currentMode === 'base' ? '/api/base_world' : `/api/campaigns/${this.currentCampaignId}`;
            let method = this.currentMode === 'base' ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave)
            });

            if (response.ok) {
                this.markAsSaved();
                this.updateSyncStatus('success');
            } else {
                if (response.status === 409) {
                    alert("⚠️ Conflit de version détecté !\n\nLes données sur le serveur sont plus récentes que votre version locale.\nVeuillez recharger la page pour récupérer les dernières modifications avant de pouvoir sauvegarder de nouveau.");
                    this.updateSyncStatus('conflict');
                } else {
                    console.error("Erreur sync:", response.status, response.statusText);
                    this.updateSyncStatus('error');
                }
            }
        } catch (e) {
            console.error("Erreur sync:", e);
            this.updateSyncStatus('error');
        }
    }

    async applyContextData(data) {
        if (data.locations) {
            localStorage.setItem('middleEarthLocations', JSON.stringify(data.locations));
            window.locationsData = data.locations;
            if (window.dataManager) window.dataManager.locationsData = data.locations;
        }
        if (data.regions) {
            localStorage.setItem('middleEarthRegions', JSON.stringify(data.regions));
            window.regionsData = data.regions;
            if (window.dataManager) window.dataManager.regionsData = data.regions;
        }
        if (data.characters && window.charactersManager) window.charactersManager.loadCharacters(data.characters);
        if (data.settings && window.settingsManager) window.settingsManager.loadSettings(data.settings);

        if (data.calendar && window.calendarManager) {
            if (data.calendar.currentCalendarDate) window.calendarManager.currentCalendarDate = data.calendar.currentCalendarDate;
            if (data.calendar.currentSeason) window.calendarManager.currentSeason = data.calendar.currentSeason;
            if (data.calendar.calendarData) window.calendarManager.calendarData = data.calendar.calendarData;
            window.calendarManager.updateSeasonDisplay();
        }

        if (data.journal && window.journalManager) {
            if (Array.isArray(data.journal)) {
                // Format Legacy (Tableau de voyages uniquement)
                localStorage.setItem('travelJournal', JSON.stringify(data.journal));
                window.journalManager.loadJournal();
            } else if (typeof data.journal === 'object') {
                // Nouveau Format (Objet complet)
                if (data.journal.journal) localStorage.setItem('adventureJournal', JSON.stringify(data.journal.journal));
                if (data.journal.travelJournal) localStorage.setItem('travelJournal', JSON.stringify(data.journal.travelJournal));
                if (data.journal.objectives) localStorage.setItem('adventureObjectives', JSON.stringify(data.journal.objectives));
                if (data.journal.rumors) localStorage.setItem('adventureRumors', JSON.stringify(data.journal.rumors));
                if (data.journal.rumorsCheckboxStates) localStorage.setItem('rumorsCheckboxStates', JSON.stringify(data.journal.rumorsCheckboxStates));

                // Forcer le rechargement du journal complet
                window.journalManager.loadJournal();
                if (typeof window.journalManager.loadObjectives === 'function') window.journalManager.loadObjectives();
                if (typeof window.journalManager.loadRumors === 'function') window.journalManager.loadRumors();
            }
        }

        if (data.position) localStorage.setItem('adventurers_position', JSON.stringify(data.position));

        if (data.activeJourney && window.pathManager) {
             if (data.activeJourney.path) {
                 window.pathManager.path = data.activeJourney.path;
                 window.pathManager.redrawAll();
             }
        }

        if (data.counters && window.countersManager) window.countersManager.loadCounters(data.counters);

        if (data.adventureMode !== undefined && window.positionManager) {
            window.positionManager.adventureMode = data.adventureMode;
            window.positionManager.updateAdventureModeIndicator();
            window.updateToolbarButtonsVisibility();
        }
    }

    markAsUnsaved() {
        if (this.isLoadingFromCloud) return;
        this.hasUnsavedChanges = true;
        this.updateCloudIconVisibility();
    }

    markAsSaved() {
        this.hasUnsavedChanges = false;
        this.updateCloudIconVisibility();
    }

    updateCloudIconVisibility() {
        if (!this.quickSyncBtn) return;
        if (this.hasUnsavedChanges && this.isAuthenticated) {
            this.quickSyncBtn.classList.remove('hidden');
        } else {
            this.quickSyncBtn.classList.add('hidden');
        }
    }

    scheduleAutoSync() {
        if (!this.isAuthenticated) return;

        // Annuler le timer précédent s'il existe
        if (this.autoSyncTimeoutId) {
            clearTimeout(this.autoSyncTimeoutId);
        }

        // Marquer comme non sauvegardé immédiatement pour l'interface
        this.markAsUnsaved();

        // Programmer la nouvelle synchronisation
        this.autoSyncTimeoutId = setTimeout(() => {
            console.log("🔄 Exécution de la synchronisation automatique...");
            this.syncUserData();
        }, this.autoSyncDelay);

        console.log(`⏳ Synchronisation automatique programmée dans ${this.autoSyncDelay}ms`);
    }

    async manualSync() {
        if (this.isSyncing) return;
        this.updateSyncStatus('syncing');
        this.isSyncing = true;
        await this.syncUserData();
        this.isSyncing = false;
    }

    updateSyncStatus(status) {
        if (!this.syncStatusIndicator) return;

        if (status === 'syncing') {
            this.syncStatusIndicator.innerHTML = '<span class="text-blue-600"><i class="fas fa-sync fa-spin"></i> Sync...</span>';
        } else if (status === 'success') {
            this.syncStatusIndicator.innerHTML = '<span class="text-green-600"><i class="fas fa-check"></i> Sauvegardé</span>';
        } else if (status === 'error') {
            this.syncStatusIndicator.innerHTML = '<span class="text-red-600"><i class="fas fa-exclamation-triangle"></i> Erreur</span>';
        } else if (status === 'conflict') {
             this.syncStatusIndicator.innerHTML = '<span class="text-red-600"><i class="fas fa-exclamation-circle"></i> Conflit!</span>';
        } else {
             this.syncStatusIndicator.innerHTML = '';
        }
    }

    updateLastSyncDateDisplay() {
        // ... implementation ...
    }

    handleAuthCallback() {
        // ... implementation ...
    }

    async handleLogout(e) {
        e.preventDefault();
        window.location.href = '/auth/logout';
    }

    async handleDebugCloudData() {
        if (!this.isAuthenticated) return;

        try {
            const response = await fetch('/api/user/data/debug');
            if (response.ok) {
                const data = await response.json();
                console.log("☁️ Données Cloud Debug:", data);

                const summary = data.data_summary || {};
                const msg = `Données Cloud récupérées avec succès!\n\n` +
                            `ID: ${data.user_id}\n` +
                            `Taille: ${(data.raw_json_size / 1024).toFixed(2)} KB\n\n` +
                            `Résumé:\n` +
                            `- Lieux: ${summary.locations_count}\n` +
                            `- Régions: ${summary.regions_count}\n` +
                            `- Personnages: ${summary.characters_count}\n` +
                            `- Cartes: ${summary.maps_count}\n\n` +
                            `Le détail complet a été affiché dans la console du navigateur (F12).`;

                alert(msg);
            } else {
                const err = await response.json();
                alert("Erreur debug: " + (err.error || "Erreur inconnue"));
            }
        } catch (e) {
            console.error("Erreur debug cloud:", e);
            alert("Erreur lors de la récupération des données de debug.");
        }
    }

    logAuth(msg, data) { console.log(msg, data); }
}

export default AuthManager;
