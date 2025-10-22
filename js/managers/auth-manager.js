class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.contexts = []; // Cette ligne sera supprimée
        this.autoSyncEnabled = false; // DÉSACTIVÉE par défaut
        this.autoSyncTimeoutId = null;
        this.autoSyncDelay = 2000; // 2 secondes de debounce
        this.lastSyncTimestamp = null; // Timestamp de dernière sync
        this.isSyncing = false; // Flag pour éviter les syncs multiples
        this.hasUnsavedChanges = false; // Flag pour détecter les modifications non sauvegardées

        // Références DOM
        this.authBtn = null;
        this.authModal = null;
        this.authIcon = null;
        this.userProfilePic = null;
        this.authUserName = null;
        this.loggedInPanel = null;
        this.loggedOutPanel = null;
        this.authStatusPanel = null;
        this.authContentPanel = null;
        this.googleSigninBtn = null;
        this.contextNameInput = null;
        this.saveContextBtn = null;
        this.savedContextsContainer = null;
        this.closeAuthModalBtn = null;
        this.unauthenticatedWarning = null; // Nouveau pour l'avertissement
        this.manualSyncBtn = null; // Bouton de sync manuelle
        this.syncStatusIndicator = null; // Indicateur de statut
        this.quickSyncBtn = null; // Bouton de sync rapide
        this.modalSyncBtn = null; // Bouton de sync dans la modale
        this.lastSyncDateDiv = null; // Div pour la date de dernière sync
    }

    init() {
        this.logAuth("🔑 Initialisation AuthManager");
        this.setupDOMReferences();
        this.setupEventListeners();
        this.checkAuthenticationStatus();
        this.handleAuthCallback();
        this.setupLocalStorageListener(); // Écouter les changements de localStorage
        this.updateLastSyncDateDisplay(); // Afficher la date de dernière sync au chargement
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
        this.contextNameInput = document.getElementById('context-name-input');
        this.saveContextBtn = document.getElementById('save-context-btn');
        this.savedContextsContainer = document.getElementById('saved-contexts');
        this.closeAuthModalBtn = document.getElementById('close-auth-modal');
        this.unauthenticatedWarning = document.getElementById('unauthenticated-warning');
        this.manualSyncBtn = document.getElementById('manual-sync-btn');
        this.syncStatusIndicator = document.getElementById('sync-status-indicator');
        this.quickSyncBtn = document.getElementById('quick-sync-btn');
        this.modalSyncBtn = document.getElementById('modal-sync-btn'); // Récupérer le nouveau bouton
        this.lastSyncDateDiv = document.getElementById('last-sync-date'); // Récupérer la div pour la date
    }

    setupEventListeners() {
        if (this.authBtn) {
            this.authBtn.addEventListener('click', () => this.showAuthModal());
        }

        if (this.closeAuthModalBtn) {
            this.closeAuthModalBtn.addEventListener('click', () => this.hideAuthModal());
        }

        if (this.googleSigninBtn) {
            this.googleSigninBtn.addEventListener('click', () => this.startGoogleAuth());
        }

        // Bouton de debug des données cloud
        const debugBtn = document.getElementById('debug-cloud-data');
        if (debugBtn) {
            debugBtn.addEventListener('click', () => this.debugCloudData());
        }

        // Bouton de synchronisation manuelle (celui dans la barre principale)
        if (this.manualSyncBtn) {
            this.manualSyncBtn.addEventListener('click', () => this.manualSync());
        }

        // Bouton de synchronisation dans la modale d'authentification
        if (this.modalSyncBtn) {
            this.modalSyncBtn.addEventListener('click', () => this.manualSync());
        }

        // Gestion de la déconnexion avec invitation à sauvegarder
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => this.handleLogout(e));
        }

        if (this.saveContextBtn) {
            this.saveContextBtn.addEventListener('click', () => this.saveCurrentContext());
        }

        if (this.contextNameInput) {
            this.contextNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveCurrentContext();
                }
            });
        }

        // Fermer modal en cliquant à l'extérieur
        if (this.authModal) {
            this.authModal.addEventListener('click', (e) => {
                if (e.target === this.authModal) {
                    this.hideAuthModal();
                }
            });
        }

        // Écouter les changements dans le localStorage pour la synchronisation
        // Note : L'événement 'storage' n'est déclenché que dans les AUTRES onglets
        // Pour le même onglet, la synchronisation est gérée par saveToLocalStorage
        window.addEventListener('storage', (event) => {
            if (event.key === 'middleEarthData') {
                this.logAuth("🔄 Changement détecté depuis un autre onglet");
                // Recharger les données si l'utilisateur est authentifié
                if (this.isAuthenticated) {
                    this.loadUserData();
                }
            } else if (event.key === 'lastCloudSyncTimestamp') {
                // Mettre à jour l'affichage de la date de dernière synchronisation
                const newTimestamp = parseInt(localStorage.getItem('lastCloudSyncTimestamp'), 10);
                if (!isNaN(newTimestamp)) {
                    this.lastSyncTimestamp = newTimestamp;
                    this.updateLastSyncDateDisplay();
                }
            }
        });
    }

    // Nouvelle méthode pour écouter les changements de localStorage
    setupLocalStorageListener() {
        // Ceci est déjà géré par window.addEventListener('storage', ...)
        // Mais on peut ajouter une initialisation ici si nécessaire
        this.logAuth("👂 Écoute des changements de localStorage activée.");
    }

    async checkAuthenticationStatus() {
        this.logAuth("🔍 Vérification du statut d'authentification");

        try {
            const response = await fetch('/api/auth/user', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();

                if (data.authenticated && data.user) {
                    this.logAuth("✅ Utilisateur authentifié trouvé");
                    this.currentUser = data.user;
                    this.isAuthenticated = true;
                    this.updateUIForAuthenticatedUser();
                    // Charger les données utilisateur (qui utilisera localStorage)
                    await this.loadUserData();
                } else {
                    this.logAuth("❌ Non authentifié - redirection login");
                    window.location.href = '/login';
                    return;
                }
            } else {
                this.logAuth("❌ Erreur vérification auth - redirection login");
                window.location.href = '/login';
                return;
            }
        } catch (error) {
            this.logAuth(`❌ Erreur vérification auth: ${error.message} - redirection login`);
            window.location.href = '/login';
            return;
        }

        this.hideAuthStatusPanel();
        this.updateUnauthenticatedWarning(); // Mettre à jour l'avertissement
    }

    handleAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.has('auth_error')) {
            const errorDesc = urlParams.get('desc') || 'Erreur inconnue';
            this.logAuth(`❌ Erreur auth: ${errorDesc} - redirection login`);
            window.location.href = `/login?auth_error=1&desc=${encodeURIComponent(errorDesc)}`;
        }
    }

    showAuthModal() {
        if (this.authModal) {
            this.authModal.classList.remove('hidden');

            if (!this.isAuthenticated) {
                this.showAuthStatusPanel();
                // Si pas authentifié, vérifier le statut au cas où
                this.checkAuthenticationStatus();
            } else {
                // Si authentifié, masquer le panneau de statut et afficher le contenu
                this.hideAuthStatusPanel();
                this.updateLastSyncDateDisplay(); // Assurer l'affichage de la date au cas où
            }
        }
    }

    hideAuthModal() {
        if (this.authModal) {
            this.authModal.classList.add('hidden');
        }
    }

    showAuthStatusPanel() {
        if (this.authStatusPanel) {
            this.authStatusPanel.classList.remove('hidden');
        }
        if (this.authContentPanel) {
            this.authContentPanel.classList.add('hidden');
        }
    }

    hideAuthStatusPanel() {
        if (this.authStatusPanel) {
            this.authStatusPanel.classList.add('hidden');
        }
        if (this.authContentPanel) {
            this.authContentPanel.classList.remove('hidden');
        }
    }

    startGoogleAuth() {
        this.logAuth("🔑 Redirection vers l'authentification Google");
        window.location.href = '/auth/google';
    }

    updateUIForAuthenticatedUser() {
        this.logAuth("🎨 Mise à jour UI pour utilisateur authentifié");

        // Mettre à jour le bouton d'authentification
        if (this.authIcon) {
            this.authIcon.style.display = 'none';
        }

        if (this.userProfilePic && this.currentUser.picture) {
            this.userProfilePic.src = this.currentUser.picture;
            this.userProfilePic.classList.remove('hidden');
        }

        // Mettre à jour le nom dans la modal
        if (this.authUserName && this.currentUser.name) {
            this.authUserName.textContent = this.currentUser.name;
        }

        // Afficher le bon panel
        if (this.loggedInPanel) {
            this.loggedInPanel.classList.remove('hidden');
        }
        if (this.loggedOutPanel) {
            this.loggedOutPanel.classList.add('hidden');
        }

        // Masquer le bouton de sync rapide au départ (il apparaîtra si modifications)
        if (this.quickSyncBtn) {
            this.quickSyncBtn.classList.add('hidden');
        }

        // Cacher l'avertissement si on est authentifié
        this.updateUnauthenticatedWarning(false);

        // Initialiser le statut de sync
        this.updateSyncStatus('idle');

        // Mettre à jour l'affichage de la date de dernière synchronisation
        this.updateLastSyncDateDisplay();
    }

    updateUIForUnauthenticatedUser() {
        this.logAuth("🎨 Mise à jour UI pour utilisateur non authentifié");

        // Restaurer l'icône d'authentification
        if (this.authIcon) {
            this.authIcon.style.display = 'block';
        }

        if (this.userProfilePic) {
            this.userProfilePic.classList.add('hidden');
        }

        // Afficher le bon panel
        if (this.loggedInPanel) {
            this.loggedInPanel.classList.add('hidden');
        }
        if (this.loggedOutPanel) {
            this.loggedOutPanel.classList.remove('hidden');
        }

        // Afficher l'avertissement si on est non authentifié
        this.updateUnauthenticatedWarning(true);
    }

    showAuthError(message) {
        alert(`Erreur d'authentification: ${message}`);
    }

    // Nouvelle méthode pour afficher/masquer l'avertissement
    updateUnauthenticatedWarning(show) {
        if (this.unauthenticatedWarning) {
            if (show && !this.isAuthenticated) {
                this.unauthenticatedWarning.classList.remove('hidden');
                this.unauthenticatedWarning.innerHTML = `
                    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <strong class="font-bold">Alerte!</strong>
                        <span class="block sm:inline"> Utilisateur non authentifié, modifications non sauvegardées.</span>
                        <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
                            <svg class="fill-current h-6 w-6 text-red-500 cursor-pointer" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.031a1.2 1.2 0 1 1-1.697-1.697l2.651-3.03-2.651-3.031a1.2 1.2 0 1 1 1.697-1.697l2.651 3.03 2.651-3.031a1.2 1.2 0 1 1 1.697 1.697L11.819 10l3.031 2.651a1.2 1.2 0 0 1 0 1.697z"/></svg>
                        </span>
                    </div>
                `;
                // Ajouter l'écouteur pour le bouton de fermeture
                this.unauthenticatedWarning.querySelector('.fill-current').addEventListener('click', () => {
                    this.unauthenticatedWarning.classList.add('hidden');
                });
            } else {
                this.unauthenticatedWarning.classList.add('hidden');
            }
        }
    }


    async saveCurrentContext() {
        // La sauvegarde manuelle est supprimée, cette fonction n'est plus nécessaire pour cet usage
        this.logAuth("🚫 saveCurrentContext() appelée mais la sauvegarde manuelle est supprimée.");
        alert("La sauvegarde manuelle des contextes a été remplacée par une synchronisation automatique.");
    }

    collectCurrentContextData() {
        const data = {};

        // Collecter les données des lieux
        if (window.locationsData) {
            data.locations = window.locationsData;
        }

        // Collecter les données des régions
        if (window.regionsData) {
            data.regions = window.regionsData;
        }

        // Collecter les données de saison/calendrier
        this.logAuth("📅 [collectCurrentContextData] CalendarManager existe:", !!window.calendarManager);
        if (window.calendarManager) {
            this.logAuth("📅 [collectCurrentContextData] Données calendar AVANT collecte:", {
                currentSeason: window.calendarManager.currentSeason,
                currentCalendarDate: window.calendarManager.currentCalendarDate,
                calendarData: window.calendarManager.calendarData ? `${window.calendarManager.calendarData.length} mois` : null,
                isCalendarMode: window.calendarManager.isCalendarMode
            });

            data.calendar = {
                currentSeason: window.calendarManager.currentSeason,
                currentCalendarDate: window.calendarManager.currentCalendarDate,
                calendarData: window.calendarManager.calendarData,
                isCalendarMode: window.calendarManager.isCalendarMode
            };

            this.logAuth("📅 [collectCurrentContextData] Données calendar APRÈS collecte:", data.calendar);
        } else {
            this.logAuth("⚠️ [collectCurrentContextData] CalendarManager n'existe PAS encore !");
        }

        // Collecter les paramètres de l'application
        if (window.settingsManager) {
            data.settings = window.settingsManager.getAllSettings();
        }

        // Collecter le journal de voyage depuis localStorage
        const savedJournal = localStorage.getItem('travelJournal');
        if (savedJournal) {
            try {
                data.journal = JSON.parse(savedJournal);
            } catch (e) {
                console.error("Erreur lors de la collecte du journal:", e);
            }
        }

        // Collecter la position du marqueur
        if (window.positionManager) {
            data.position = window.positionManager.getPosition();
            this.logAuth("📍 Position du marqueur collectée:", data.position);
        }

        // Collecter l'état des filtres par carte
        if (window.filterManager) {
            data.filtersByMap = window.filterManager.getAllFiltersByMap();
            this.logAuth("🔍 [collectCurrentContextData] Filtres par carte collectés:", data.filtersByMap);
            this.logAuth(`🔍 [collectCurrentContextData] Nombre de cartes avec filtres: ${Object.keys(data.filtersByMap || {}).length}`);
            this.logAuth(`🔍 [collectCurrentContextData] Cartes avec filtres:`, Object.keys(data.filtersByMap || {}));
            // Vérifier que filtersByMap est bien un objet non vide
            if (!data.filtersByMap || Object.keys(data.filtersByMap).length === 0) {
                this.logAuth("⚠️ [collectCurrentContextData] ATTENTION: filtersByMap est vide !");
            }
        } else {
            this.logAuth("⚠️ [collectCurrentContextData] FilterManager non disponible");
        }

        this.logAuth("📦 Données collectées pour le contexte", Object.keys(data));
        this.logAuth("📅 [collectCurrentContextData] Calendar dans les données collectées:", data.calendar ? {
            currentSeason: data.calendar.currentSeason,
            currentCalendarDate: data.calendar.currentCalendarDate,
            calendarDataLength: data.calendar.calendarData?.length,
            isCalendarMode: data.calendar.isCalendarMode
        } : "NON PRÉSENT");
        return data;
    }


    // Suppression des fonctions liées à la gestion multiple de contextes:
    // loadUserContexts, renderContextsList, loadContext, deleteContext


    async applyContextData(data) {
        this.logAuth("🔄 Application des données du contexte", Object.keys(data));

        // Désactiver temporairement l'auto-sync pendant l'application du contexte
        const wasAuthenticated = this.isAuthenticated;
        this.isAuthenticated = false;
        this.logAuth("🚫 Auto-sync temporairement désactivée pendant l'application du contexte");

        // NE PAS MIGRER automatiquement les mapId
        // Les lieux sans mapId doivent rester identifiables et s'affichent sur toutes les cartes
        // (voir logique de filtrage dans renderLocations et renderRegions)

        // 1. SAUVEGARDER D'ABORD dans localStorage
        if (data.locations) {
            localStorage.setItem('middleEarthLocations', JSON.stringify(data.locations));
            this.logAuth(`💾 ${data.locations.locations?.length || 0} lieux sauvegardés dans localStorage`);
        }

        if (data.regions) {
            localStorage.setItem('middleEarthRegions', JSON.stringify(data.regions));
            this.logAuth(`💾 ${data.regions.regions?.length || 0} régions sauvegardées dans localStorage`);
        }

        // 2. FORCER la synchronisation IMMÉDIATE des données globales ET locales
        if (data.locations) {
            window.locationsData = data.locations;
            // IMPORTANT: Synchroniser aussi la variable locale dans main.js
            if (typeof locationsData !== 'undefined') {
                locationsData = data.locations;
            }
            this.logAuth(`✅ Référence globale 'locationsData' mise à jour avec ${data.locations.locations?.length || 0} lieux`);
            this.logAuth(`📊 Structure locationsData:`, data.locations);
        }
        if (data.regions) {
            window.regionsData = data.regions;
            // IMPORTANT: Synchroniser aussi la variable locale dans main.js
            if (typeof regionsData !== 'undefined') {
                regionsData = data.regions;
            }
            this.logAuth(`✅ Référence globale 'regionsData' mise à jour avec ${data.regions.regions?.length || 0} régions`);
            this.logAuth(`📊 Structure regionsData:`, data.regions);
        }

        // 3. Synchroniser DataManager si présent
        if (window.dataManager) {
            if (data.locations) {
                window.dataManager.locationsData = data.locations;
                this.logAuth(`✅ DataManager.locationsData synchronisé: ${data.locations.locations?.length || 0} lieux`);
            }
            if (data.regions) {
                window.dataManager.regionsData = data.regions;
                this.logAuth(`✅ DataManager.regionsData synchronisé: ${data.regions.regions?.length || 0} régions`);
            }
            this.logAuth("✅ DataManager synchronisé avec les nouvelles données");
        }


        // 4. Autres données (calendrier, paramètres, journal)
        if (data.calendar && window.calendarManager) {
            this.logAuth("📅 [applyContextData] Application des données de calendrier depuis le cloud");

            this.logAuth("📅 [applyContextData] Données calendar reçues:", data.calendar);

            // IMPORTANT: Poser le flag AVANT toute opération
            localStorage.setItem('calendar_from_cloud', 'true');

            // Appliquer directement au CalendarManager d'abord
            if (data.calendar.currentSeason) {
                window.calendarManager.currentSeason = data.calendar.currentSeason;
                localStorage.setItem('currentSeason', data.calendar.currentSeason);
                this.logAuth(`📅 [applyContextData] Saison appliquée: ${data.calendar.currentSeason}`);
            }

            if (data.calendar.currentCalendarDate) {
                window.calendarManager.currentCalendarDate = data.calendar.currentCalendarDate;
                localStorage.setItem('currentCalendarDate', JSON.stringify(data.calendar.currentCalendarDate));
                this.logAuth(`📅 [applyContextData] Date appliquée:`, data.calendar.currentCalendarDate);
            }

            if (data.calendar.calendarData) {
                window.calendarManager.calendarData = data.calendar.calendarData;
                localStorage.setItem('calendarData', JSON.stringify(data.calendar.calendarData));
                this.logAuth(`📅 [applyContextData] Données calendrier appliquées: ${data.calendar.calendarData.length} mois`);
            }

            if (data.calendar.isCalendarMode !== undefined) {
                window.calendarManager.isCalendarMode = data.calendar.isCalendarMode;
                localStorage.setItem('isCalendarMode', data.calendar.isCalendarMode.toString());
                this.logAuth(`📅 [applyContextData] Mode calendrier appliqué: ${data.calendar.isCalendarMode}`);
            }

            // Forcer la mise à jour complète de l'interface avec les nouvelles données
            this.logAuth("📅 [applyContextData] Mise à jour UI du calendrier");
            window.calendarManager.updateSeasonDisplay();
            window.calendarManager.exposeGlobalData();

            this.logAuth("✅ [applyContextData] Calendrier restauré depuis le cloud (updateUI différé)");
        }

        if (data.settings && window.settingsManager) {
            this.logAuth("⚙️ Chargement des paramètres...");
            window.settingsManager.loadSettings(data.settings);
        }

        // 5.5. IMPORTANT: Appliquer l'échelle de la carte active AVANT le rendu
        if (window.settingsManager && window.settingsManager.availableMaps && window.pathManager) {
            const activeMapUrl = window.settingsManager.activeMapUrl;
            const activeMap = window.settingsManager.availableMaps.find(m => m.url === activeMapUrl);
            if (activeMap && activeMap.scale) {
                window.pathManager.mapConstants.MAP_DISTANCE_MILES = activeMap.scale;
                this.logAuth(`🗺️ [AuthManager] Échelle de carte appliquée: ${activeMap.scale} miles pour ${activeMapUrl}`);
            }
        }

        // 6. Charger les filtres sauvegardés pour la carte active
        if (window.filterManager && window.settingsManager) {
            const activeMapUrl = window.settingsManager.activeMapUrl;
            this.logAuth(`🔍 Chargement des filtres pour la carte active: ${activeMapUrl}`);
            window.filterManager.loadFiltersForMap(activeMapUrl);
        }

        // 7. Re-render les lieux et régions
        this.logAuth("🎨 Rendu des lieux et régions");
        if (typeof window.renderLocations === 'function') {
            window.renderLocations();
        }
        if (typeof window.renderRegions === 'function') {
            window.renderRegions();
        }
        if (window.positionManager) {
            window.positionManager.updateMarkerPosition();
        }


        // 5. Le rendu sera fait dans loadUserData() après l'application complète
        this.logAuth("✅ Données du contexte synchronisées (rendu différé)");

        // Nettoyer le flag calendar MAINTENANT, après toutes les opérations UI
        const calendarFlag = localStorage.getItem('calendar_from_cloud');
        if (calendarFlag === 'true') {
            localStorage.removeItem('calendar_from_cloud');
            this.logAuth("🧹 Flag calendar_from_cloud nettoyé");
        }

        // RÉACTIVER l'authentification après l'application complète du contexte
        this.isAuthenticated = wasAuthenticated;
        this.logAuth("✅ Contexte appliqué avec succès");
        this.updateSyncStatus('idle');
    }


    // Suppression des fonctions liées à la gestion multiple de contextes:
    // loadUserContexts, renderContextsList, loadContext, deleteContext


    async loadUserData() {
        if (!this.isAuthenticated) {
            this.logAuth("❌ Tentative de chargement sans authentification");
            return;
        }

        this.logAuth("📥 Chargement des données depuis le cloud");

        try {
            const response = await fetch('/api/user/data', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const cloudData = await response.json();
            this.logAuth("✅ Données cloud récupérées", cloudData);

            // NETTOYER IMMÉDIATEMENT le localStorage - le cloud est la source unique
            localStorage.removeItem('middleEarthLocations');
            localStorage.removeItem('middleEarthRegions');
            localStorage.removeItem('middleEarthData');
            this.logAuth("🧹 localStorage nettoyé - cloud est la source unique de vérité");

            // Appliquer les données du cloud UNIQUEMENT (pas de fusion)
            await this.applyContextData(cloudData);

            // Sauvegarder dans localStorage (comme cache uniquement)
            this.saveToLocalStorage(cloudData, true); // true = depuis le cloud

            // FORCER un rendu immédiat après chargement cloud
            this.logAuth("🎨 Rendu forcé après chargement cloud");
            if (typeof window.renderLocations === 'function') {
                window.renderLocations();
                this.logAuth(`✅ ${window.locationsData?.locations?.length || 0} lieux rendus depuis le cloud`);
            }
            if (typeof window.renderRegions === 'function') {
                window.renderRegions();
                this.logAuth(`✅ ${window.regionsData?.regions?.length || 0} régions rendues depuis le cloud`);
            }

            // Marquer comme sauvegardé après chargement cloud
            this.markAsSaved();

            this.logAuth("✅ Données cloud chargées et appliquées avec succès");

        } catch (error) {
            this.logAuth(`❌ Erreur lors du chargement des données cloud: ${error.message}`);
            alert(`Impossible de charger les données du cloud: ${error.message}\n\nVeuillez rafraîchir la page.`);
        }
    }

    markAsUnsaved() {
        if (!this.hasUnsavedChanges) {
            this.hasUnsavedChanges = true;
            this.updateCloudIconVisibility();
            this.logAuth("🔔 Modifications non sauvegardées détectées");
        }
    }

    markAsSaved() {
        this.hasUnsavedChanges = false;
        this.updateCloudIconVisibility();
        this.logAuth("✅ Toutes les modifications sont sauvegardées");
    }

    updateCloudIconVisibility() {
        // Met à jour la visibilité de l'icône de synchronisation rapide (bouton quickSyncBtn)
        // Cette icône indique s'il y a des modifications non synchronisées.
        if (!this.quickSyncBtn) return;

        // Si des modifications non sauvegardées existent ET que l'utilisateur est authentifié,
        // afficher l'icône de synchronisation rapide. Sinon, la cacher.
        if (this.hasUnsavedChanges && this.isAuthenticated) {
            this.quickSyncBtn.classList.remove('hidden');
            this.quickSyncBtn.title = 'Modifications non sauvegardées - Cliquer pour synchroniser';
        } else {
            this.quickSyncBtn.classList.add('hidden');
        }
    }

    async manualSync() {
        if (this.isSyncing) {
            this.logAuth("⏱️ Synchronisation déjà en cours, veuillez patienter");
            return;
        }

        this.updateSyncStatus('syncing');
        this.isSyncing = true;

        try {
            await this.syncUserData();
            this.updateSyncStatus('success');

            // Marquer comme sauvegardé et masquer l'icône
            this.markAsSaved();

            // Afficher message de confirmation
            this.showSyncSuccessMessage();

            setTimeout(() => this.updateSyncStatus('idle'), 2000);
        } catch (error) {
            this.updateSyncStatus('error');
            setTimeout(() => this.updateSyncStatus('idle'), 3000);
        } finally {
            this.isSyncing = false;
        }
    }

    showSyncSuccessMessage() {
        // Créer un message de confirmation temporaire
        const message = document.createElement('div');
        message.className = 'fixed top-20 left-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300';
        message.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Synchronisation effectuée';
        document.body.appendChild(message);

        // Faire disparaître après 2 secondes
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => message.remove(), 300);
        }, 2000);
    }

    updateSyncStatus(status) {
        if (!this.syncStatusIndicator) return;

        const statusConfig = {
            idle: { icon: 'fa-cloud', text: 'Synchroniser', class: 'text-gray-400' },
            syncing: { icon: 'fa-spinner fa-spin', text: 'Synchronisation...', class: 'text-blue-400' },
            success: { icon: 'fa-check-circle', text: 'Synchronisé !', class: 'text-green-400' },
            error: { icon: 'fa-exclamation-triangle', text: 'Erreur sync', class: 'text-red-400' }
        };

        const config = statusConfig[status] || statusConfig.idle;

        if (this.manualSyncBtn) {
            const icon = this.manualSyncBtn.querySelector('i');
            const text = this.manualSyncBtn.querySelector('span');
            if (icon) {
                icon.className = `fas ${config.icon}`;
            }
            if (text) {
                text.textContent = config.text;
            }
            this.manualSyncBtn.disabled = status === 'syncing';
        }

        // Mise à jour du bouton de synchronisation dans la modale
        if (this.modalSyncBtn) {
            const icon = this.modalSyncBtn.querySelector('i');
            const text = this.modalSyncBtn.querySelector('span');
            if (icon) {
                icon.className = `fas ${config.icon}`;
            }
            if (text) {
                text.textContent = config.text;
            }
            this.modalSyncBtn.disabled = status === 'syncing';
        }


        if (this.syncStatusIndicator) {
            this.syncStatusIndicator.className = `text-sm ${config.class}`;
            this.syncStatusIndicator.innerHTML = `
                <i class="fas ${config.icon} mr-1"></i>
                ${this.lastSyncTimestamp ? `Dernière sync: ${new Date(this.lastSyncTimestamp).toLocaleTimeString()}` : ''}
            `;
        }
    }

    async syncUserData() {
        if (!this.isAuthenticated) {
            this.logAuth("❌ Non authentifié - redirection login");
            window.location.href = '/login';
            return;
        }

        this.logAuth("🔄 Synchronisation manuelle vers cloud");

        try {
            // 1. D'abord récupérer les données cloud actuelles
            const cloudResponse = await fetch('/api/user/data', {
                method: 'GET',
                credentials: 'include'
            });

            let cloudData = null;
            if (cloudResponse.ok) {
                cloudData = await cloudResponse.json();
                this.logAuth("📥 Données cloud récupérées pour fusion");
            }

            // 2. Collecter les données locales
            const localData = this.collectCurrentContextData();
            this.logAuth("📦 Données locales collectées");

            // 3. Attribuer le mapId de la carte active aux lieux/régions sans mapId
            const activeMapId = localData.settings?.activeMapUrl || window.settingsManager?.activeMapUrl;
            this.logAuth(`🔍 [syncUserData] activeMapId: ${activeMapId}`);

            if (activeMapId) {
                let locationsUpdated = 0;
                let regionsUpdated = 0;

                // Mise à jour des lieux sans mapId
                if (localData.locations?.locations) {
                    localData.locations.locations = localData.locations.locations.map((loc) => {
                        if (!loc.mapId) {
                            this.logAuth(`🔍 [syncUserData] Location "${loc.name}" sans mapId, attribution de ${activeMapId}`);
                            locationsUpdated++;
                            return { ...loc, mapId: activeMapId };
                        }
                        return loc;
                    });
                }

                // Mise à jour des régions sans mapId
                if (localData.regions?.regions) {
                    localData.regions.regions = localData.regions.regions.map((reg) => {
                        if (!reg.mapId) {
                            this.logAuth(`🔍 [syncUserData] Region "${reg.name}" sans mapId, attribution de ${activeMapId}`);
                            regionsUpdated++;
                            return { ...reg, mapId: activeMapId };
                        }
                        return reg;
                    });
                }

                if (locationsUpdated > 0 || regionsUpdated > 0) {
                    this.logAuth(`🗺️ Attribution mapId actif (${activeMapId}): ${locationsUpdated} lieux, ${regionsUpdated} régions`);

                    // IMPORTANT: Synchroniser IMMÉDIATEMENT avec les variables globales et localStorage
                    // AVANT la fusion, pour garantir la persistance
                    if (localData.locations?.locations) {
                        window.locationsData = { ...localData.locations };
                        if (window.dataManager) {
                            window.dataManager.locationsData = { ...localData.locations };
                        }
                        localStorage.setItem('middleEarthLocations', JSON.stringify(localData.locations));
                        this.logAuth(`✅ Variables globales locationsData mises à jour avec les nouveaux mapId`);
                    }

                    if (localData.regions?.regions) {
                        window.regionsData = { ...localData.regions };
                        if (window.dataManager) {
                            window.dataManager.regionsData = { ...localData.regions };
                        }
                        localStorage.setItem('middleEarthRegions', JSON.stringify(localData.regions));
                        this.logAuth(`✅ Variables globales regionsData mises à jour avec les nouveaux mapId`);
                    }

                    // Forcer le re-render immédiat pour afficher les changements
                    if (typeof window.renderLocations === 'function') {
                        window.renderLocations();
                    }
                    if (typeof window.renderRegions === 'function') {
                        window.renderRegions();
                    }
                } else {
                    this.logAuth(`ℹ️ Aucun lieu/région sans mapId à mettre à jour`);
                }
            }

            // 4. Fusionner intelligemment les données (utilise localData déjà modifié)
            const mergedData = this.mergeContextData(cloudData, localData);
            this.logAuth("🔀 Données fusionnées pour sauvegarde");

            // 4. Ajouter un timestamp pour détecter les conflits
            mergedData._sync_timestamp = Date.now();

            const response = await fetch('/api/user/data', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(mergedData)
            });

            if (response.ok) {
                const result = await response.json();

                // Vérifier s'il y a un conflit détecté par le serveur
                if (result.conflict_detected) {
                    this.logAuth("⚠️ Conflit de synchronisation détecté");
                    await this.handleSyncConflict(mergedData, result.cloud_data);
                    return;
                }

                this.lastSyncTimestamp = Date.now();
                localStorage.setItem('lastCloudSyncTimestamp', this.lastSyncTimestamp);
                this.updateLastSyncDateDisplay();

                this.logAuth("✅ Données fusionnées synchronisées dans le cloud");
                // Mise à jour locale pour cohérence UI
                this.saveToLocalStorage(mergedData, true);
            } else {
                const error = await response.json();
                this.logAuth(`⚠️ Erreur sync: ${error.error || response.statusText}`);

                if (response.status === 401) {
                    alert('Session expirée. Reconnexion requise.');
                    window.location.href = '/login';
                } else {
                    alert(`Erreur synchronisation: ${error.error || response.statusText}`);
                }
                throw new Error(error.error || response.statusText);
            }
        } catch (error) {
            this.logAuth(`❌ Erreur réseau sync: ${error.message}`);
            alert(`Erreur réseau. Vos modifications seront sauvegardées à la prochaine synchronisation.`);
            throw error;
        }
    }

    mergeContextData(cloudData, localData) {
        // Si pas de données cloud, utiliser les locales
        if (!cloudData) {
            this.logAuth("🆕 Pas de données cloud - utilisation des données locales");
            return localData;
        }

        const merged = { ...localData };

        // Fusionner les lieux - PRIORITÉ AUX DONNÉES LOCALES pour les mapId
        const cloudLocations = cloudData.locations?.locations || [];
        const localLocations = localData.locations?.locations || [];

        const mergedLocations = [...localLocations]; // Commencer par les locales
        cloudLocations.forEach(cloudLoc => {
            const localExists = mergedLocations.find(ll => ll.id === cloudLoc.id);
            if (!localExists) {
                // Lieu uniquement dans le cloud, l'ajouter
                mergedLocations.push(cloudLoc);
                this.logAuth(`➕ Ajout lieu cloud: ${cloudLoc.name}`);
            } else {
                // Le lieu existe localement, on garde la version locale (avec mapId potentiellement mis à jour)
                this.logAuth(`🔄 Lieu existe localement: ${cloudLoc.name}, conservation version locale`);
            }
        });

        merged.locations = { locations: mergedLocations };
        this.logAuth(`🔀 Fusion lieux: ${cloudLocations.length} cloud + ${localLocations.length} local = ${mergedLocations.length} total`);

        // Fusionner les régions - PRIORITÉ AUX DONNÉES LOCALES pour les mapId
        const cloudRegions = cloudData.regions?.regions || [];
        const localRegions = localData.regions?.regions || [];

        const mergedRegions = [...localRegions]; // Commencer par les locales
        cloudRegions.forEach(cloudReg => {
            const localExists = mergedRegions.find(lr => lr.id === cloudReg.id);
            if (!localExists) {
                // Région uniquement dans le cloud, l'ajouter
                mergedRegions.push(cloudReg);
                this.logAuth(`➕ Ajout région cloud: ${cloudReg.name}`);
            } else {
                // La région existe localement, on garde la version locale (avec mapId potentiellement mis à jour)
                this.logAuth(`🔄 Région existe localement: ${cloudReg.name}, conservation version locale`);
            }
        });

        merged.regions = { regions: mergedRegions };
        this.logAuth(`🔀 Fusion régions: ${cloudRegions.length} cloud + ${localRegions.length} local = ${mergedRegions.length} total`);

        return merged;
    }

    async handleSyncConflict(localData, cloudData) {
        this.logAuth("🔄 Gestion du conflit de synchronisation");

        const userChoice = confirm(
            "⚠️ CONFLIT DE SYNCHRONISATION DÉTECTÉ\n\n" +
            "Des modifications ont été effectuées sur un autre appareil.\n\n" +
            "Que souhaitez-vous faire ?\n\n" +
            "✅ OK = Garder mes modifications locales (écraser le cloud)\n" +
            "❌ ANNULER = Charger les données du cloud (perdre mes modifications locales)"
        );

        if (userChoice) {
            // L'utilisateur veut garder ses modifications locales
            this.logAuth("👤 Utilisateur choisit: garder local, écraser cloud");

            // Forcer la synchronisation avec un flag
            localData._force_overwrite = true;

            const response = await fetch('/api/user/data', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(localData)
            });

            if (response.ok) {
                this.lastSyncTimestamp = Date.now();
                localStorage.setItem('lastCloudSyncTimestamp', this.lastSyncTimestamp); // Sauvegarder le timestamp
                this.updateLastSyncDateDisplay(); // Mettre à jour l'affichage immédiatement

                this.logAuth("✅ Données locales forcées dans le cloud");
                this.saveToLocalStorage(localData);
                this.updateSyncStatus('success');
                setTimeout(() => this.updateSyncStatus('idle'), 2000);
            }
        } else {
            // L'utilisateur veut charger les données du cloud
            this.logAuth("☁️ Utilisateur choisit: charger cloud, abandonner local");

            await this.applyContextData(cloudData);
            this.saveToLocalStorage(cloudData);

            // Forcer le rendu
            if (typeof window.renderLocations === 'function') {
                window.renderLocations();
            }
            if (typeof window.renderRegions === 'function') {
                window.renderRegions();
            }

            this.lastSyncTimestamp = Date.now(); // Mettre à jour le timestamp après chargement cloud
            localStorage.setItem('lastCloudSyncTimestamp', this.lastSyncTimestamp);
            this.updateLastSyncDateDisplay();

            this.updateSyncStatus('success');
            setTimeout(() => this.updateSyncStatus('idle'), 2000);

            alert("✅ Données du cloud chargées avec succès");
        }
    }

    updateLastSyncDateDisplay() {
        // Récupérer le timestamp depuis localStorage ou depuis la propriété de classe
        const timestamp = this.lastSyncTimestamp || parseInt(localStorage.getItem('lastCloudSyncTimestamp'), 10);

        if (this.lastSyncDateDiv) {
            if (timestamp && !isNaN(timestamp)) {
                const date = new Date(timestamp);
                this.lastSyncDateDiv.querySelector('span').textContent = date.toLocaleString(); // Utiliser toLocaleString pour une date complète
            } else {
                this.lastSyncDateDiv.querySelector('span').textContent = 'jamais';
            }
        }
    }

    saveToLocalStorage(data, fromCloud = false) {
        // Sauvegarder les données en local pour la persistance
        this.logAuth("💾 Sauvegarde des données actuelles dans localStorage.");

        if (data.locations) {
            localStorage.setItem('middleEarthLocations', JSON.stringify(data.locations));
            // Synchroniser immédiatement avec les variables globales
            window.locationsData = data.locations;
            if (window.dataManager) {
                window.dataManager.locationsData = data.locations;
            }
        }
        if (data.regions) {
            localStorage.setItem('middleEarthRegions', JSON.stringify(data.regions));
            // Synchroniser immédiatement avec les variables globales
            window.regionsData = data.regions;
            if (window.dataManager) {
                window.dataManager.regionsData = data.regions;
            }
        }
        if (data.settings) {
            if (data.settings.availableMaps) {
                localStorage.setItem('availableMaps', JSON.stringify(data.settings.availableMaps));
            }
            if (data.settings.activeMapUrl) {
                localStorage.setItem('activeMapUrl', data.settings.activeMapUrl);
            }
            if (data.settings.activeMapName) {
                localStorage.setItem('activeMapName', data.settings.activeMapName);
            }
            if (data.settings.partyDescription) {
                localStorage.setItem('partyDescription', data.settings.partyDescription);
            }
            if (data.settings.questDescription) {
                localStorage.setItem('questDescription', data.settings.questDescription);
            }
            if (data.settings.narrationStyle) {
                localStorage.setItem('narrationStyle', data.settings.narrationStyle);
            }
            // Ajouter d'autres paramètres si nécessaire
        }
        if (data.calendar) {
            if (data.calendar.currentSeason) {
                localStorage.setItem('currentSeason', data.calendar.currentSeason);
            }
            if (data.calendar.currentCalendarDate) {
                localStorage.setItem('currentCalendarDate', JSON.stringify(data.calendar.currentCalendarDate));
            }
            if (data.calendar.calendarData) {
                localStorage.setItem('calendarData', JSON.stringify(data.calendar.calendarData));
            }
            if (data.calendar.isCalendarMode !== undefined) {
                localStorage.setItem('isCalendarMode', data.calendar.isCalendarMode.toString());
            }
        }
        if (data.journal) {
            localStorage.setItem('travelJournal', JSON.stringify(data.journal));
        }
        if (data.position) {
            localStorage.setItem('adventurers_position', JSON.stringify(data.position));
            // Le flag 'adventurers_position_from_cloud' est géré par applyContextData et resolveConflict
        }
        if (data.filters) {
            // Sauvegarder les filtres actuels dans localStorage
            localStorage.setItem('activeFilters', JSON.stringify(data.filters));
            this.logAuth("  - Filtres sauvegardés dans localStorage.");
        }

        // Si ce n'est pas depuis le cloud, marquer comme modifications non sauvegardées
        if (!fromCloud && this.isAuthenticated) {
            this.markAsUnsaved();
        }

        // Note : L'événement 'storage' n'est pas nécessaire dans le même onglet
        // et pourrait causer des boucles infinies. Il est automatiquement déclenché
        // par le navigateur pour les AUTRES onglets lors de modifications du localStorage.
        this.logAuth("  - Données sauvegardées dans localStorage.");
    }

    scheduleAutoSync() {
        // Ne synchroniser que si l'auto-sync est activée ET l'utilisateur authentifié
        if (!this.autoSyncEnabled) {
            this.logAuth("⏱️ Auto-sync désactivée - utiliser le bouton de sync manuelle.");
            return;
        }

        if (!this.isAuthenticated) {
            this.logAuth("⏱️ Auto-sync annulée : utilisateur non authentifié.");
            return;
        }

        // Annuler le timeout précédent s'il existe
        if (this.autoSyncTimeoutId) {
            clearTimeout(this.autoSyncTimeoutId);
            this.logAuth("⏱️ Timeout d'auto-sync précédent annulé.");
        }

        // Programmer la synchronisation automatique
        this.autoSyncTimeoutId = setTimeout(async () => {
            await this.syncUserData();
            this.logAuth("⏱️ Auto-sync exécutée.");
        }, this.autoSyncDelay);

        this.logAuth(`⏱️ Auto-sync programmée dans ${this.autoSyncDelay}ms.`);
    }

    updateFilterUI(filters) {
        this.logAuth("🎨 Mise à jour de l'UI des filtres.");
        // Mettre à jour les checkboxes de couleurs
        if (filters.colors && Array.isArray(filters.colors)) {
            filters.colors.forEach(color => {
                const checkbox = document.getElementById(`filter-color-${color}`);
                if (checkbox) checkbox.checked = true;
            });
        }

        // Mettre à jour les checkboxes de statut visité
        if (filters.visited && Array.isArray(filters.visited)) {
            const visitedCheckbox = document.getElementById('visited-checkbox');
            const notVisitedCheckbox = document.getElementById('not-visited-checkbox');
            if (visitedCheckbox) visitedCheckbox.checked = filters.visited.includes('visited');
            if (notVisitedCheckbox) notVisitedCheckbox.checked = filters.visited.includes('not_visited');
        }

        // Mettre à jour les checkboxes de statut connu
        if (filters.known && Array.isArray(filters.known)) {
            const knownCheckbox = document.getElementById('known-checkbox');
            const unknownCheckbox = document.getElementById('unknown-checkbox');
            if (knownCheckbox) knownCheckbox.checked = filters.known.includes('known');
            if (unknownCheckbox) unknownCheckbox.checked = filters.known.includes('unknown');
        }

        // Mettre à jour les checkboxes d'affichage
        const showLocationsFilter = document.getElementById('show-locations');
        const showRegionsFilter = document.getElementById('show-regions');
        // Utiliser '!== false' pour accepter 'undefined' comme 'true' par défaut
        if (showLocationsFilter) showLocationsFilter.checked = filters.showLocations !== false;
        if (showRegionsFilter) showRegionsFilter.checked = filters.showRegions === true; // Strictement 'true'

        // Mettre à jour le slider d'opacité
        if (filters.regionsOpacity !== undefined) {
            const opacitySlider = document.getElementById('regions-opacity-slider');
            const opacityValue = document.getElementById('regions-opacity-value');
            const opacityPercentage = Math.round(filters.regionsOpacity * 100);
            if (opacitySlider) opacitySlider.value = opacityPercentage;
            if (opacityValue) opacityValue.textContent = `${opacityPercentage}%`;
        }
    }



    async debugCloudData() {
        if (!this.isAuthenticated) {
            alert('Vous devez être authentifié pour voir les données cloud');
            return;
        }

        try {
            const response = await fetch('/api/user/data/debug', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const debugData = await response.json();

                console.log('🔍 === DONNÉES CLOUD DEBUG ===', debugData);

                // Afficher dans une alerte formatée
                let message = `📊 DONNÉES CLOUD STOCKÉES\n\n`;
                message += `User ID: ${debugData.user_id}\n`;
                message += `Dernière mise à jour: ${debugData.updated_at}\n\n`;
                message += `📍 Lieux: ${debugData.data_summary.locations_count}\n`;
                message += `🗺️ Régions: ${debugData.data_summary.regions_count}\n`;
                message += `📅 Calendrier: ${debugData.data_summary.has_calendar ? 'Oui' : 'Non'}\n`;
                message += `📖 Journal: ${debugData.data_summary.has_journal ? 'Oui' : 'Non'}\n`;
                message += `📍 Position: ${debugData.data_summary.has_position ? 'Oui' : 'Non'}\n`;
                message += `🔍 Filtres: ${debugData.data_summary.has_filters ? 'Oui' : 'Non'}\n`;
                message += `\n💾 Taille JSON: ${(debugData.raw_json_size / 1024).toFixed(2)} KB\n`;
                message += `\nDétails complets dans la console (F12)`;

                alert(message);
            } else {
                const error = await response.json();
                alert(`Erreur: ${error.message || error.error}`);
            }
        } catch (error) {
            console.error('Erreur debug:', error);
            alert(`Erreur réseau: ${error.message}`);
        }
    }

    async handleLogout(event) {
        event.preventDefault();

        this.logAuth("🚪 Tentative de déconnexion");

        const shouldSync = confirm(
            "💾 SAUVEGARDE AVANT DÉCONNEXION\n\n" +
            "Souhaitez-vous synchroniser vos modifications avec le cloud avant de vous déconnecter ?\n\n" +
            "✅ OK = Sauvegarder puis déconnecter\n" +
            "❌ ANNULER = Déconnecter sans sauvegarder"
        );

        if (shouldSync) {
            this.logAuth("💾 Synchronisation avant déconnexion");
            this.updateSyncStatus('syncing');

            try {
                await this.syncUserData();
                this.logAuth("✅ Synchronisation réussie avant déconnexion");

                // Rediriger vers la déconnexion après succès
                setTimeout(() => {
                    window.location.href = '/auth/logout';
                }, 500);
            } catch (error) {
                this.logAuth(`❌ Erreur sync avant déconnexion: ${error.message}`);

                const forceLogout = confirm(
                    "❌ Erreur de synchronisation\n\n" +
                    "La synchronisation a échoué. Vos modifications locales risquent d'être perdues.\n\n" +
                    "Voulez-vous quand même vous déconnecter ?\n\n" +
                    "✅ OK = Se déconnecter quand même\n" +
                    "❌ ANNULER = Rester connecté"
                );

                if (forceLogout) {
                    window.location.href = '/auth/logout';
                } else {
                    this.updateSyncStatus('error');
                    setTimeout(() => this.updateSyncStatus('idle'), 3000);
                }
            }
        } else {
            this.logAuth("⚠️ Déconnexion sans synchronisation");

            const confirmNoSync = confirm(
                "⚠️ ATTENTION\n\n" +
                "Vous allez vous déconnecter sans sauvegarder.\n" +
                "Toutes vos modifications non synchronisées seront perdues.\n\n" +
                "Confirmer la déconnexion ?"
            );

            if (confirmNoSync) {
                window.location.href = '/auth/logout';
            }
        }
    }

    logAuth(message, data = null) {
        // Afficher les logs dans la console, potentiellement avec des conditions pour débugger
        console.log(`[AuthManager] ${message}`, data);
    }
}

export default AuthManager;