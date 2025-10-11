class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.contexts = []; // Cette ligne sera supprimée
        this.autoSyncTimeoutId = null;
        this.autoSyncDelay = 2000; // 2 secondes de debounce

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
    }

    init() {
        this.logAuth("🔑 Initialisation AuthManager");
        this.setupDOMReferences();
        this.setupEventListeners();
        this.checkAuthenticationStatus();
        this.handleAuthCallback();
        this.setupLocalStorageListener(); // Écouter les changements de localStorage
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
        this.unauthenticatedWarning = document.getElementById('unauthenticated-warning'); // Récupérer le nouvel élément
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
        window.addEventListener('storage', (event) => {
            if (event.key === 'middleEarthData') {
                this.logAuth("🔄 Changement détecté dans localStorage, synchronisation locale");
                this.loadUserDataFromLocalStorage();
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
                    this.logAuth("ℹ️ Aucun utilisateur authentifié");
                    this.currentUser = null;
                    this.isAuthenticated = false;
                    this.updateUIForUnauthenticatedUser();
                    // Charger les données locales si non authentifié
                    await this.loadUserDataFromLocalStorage();
                }
            } else {
                this.logAuth("⚠️ Erreur lors de la vérification d'authentification");
                this.currentUser = null;
                this.isAuthenticated = false;
                this.updateUIForUnauthenticatedUser();
                // Charger les données locales si erreur d'authentification
                await this.loadUserDataFromLocalStorage();
            }
        } catch (error) {
            this.logAuth(`❌ Erreur lors de la vérification d'authentification: ${error.message}`);
            this.currentUser = null;
            this.isAuthenticated = false;
            this.updateUIForUnauthenticatedUser();
            // Charger les données locales en cas d'erreur réseau
            await this.loadUserDataFromLocalStorage();
        }

        this.hideAuthStatusPanel();
        this.updateUnauthenticatedWarning(); // Mettre à jour l'avertissement
    }

    handleAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.has('auth_success')) {
            this.logAuth("✅ Authentification réussie détectée dans l'URL");
            // Nettoyer l'URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Recharger le statut d'authentification
            setTimeout(() => this.checkAuthenticationStatus(), 500);
        } else if (urlParams.has('auth_error')) {
            const errorType = urlParams.get('auth_error');
            const errorDesc = urlParams.get('desc') || 'Erreur inconnue';
            this.logAuth(`❌ Erreur d'authentification détectée: ${errorType} - ${errorDesc}`);
            this.showAuthError(errorDesc);
            // Nettoyer l'URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Mettre à jour l'état non authentifié
            this.isAuthenticated = false;
            this.currentUser = null;
            this.updateUIForUnauthenticatedUser();
            this.updateUnauthenticatedWarning();
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

        // Cacher l'avertissement si on est authentifié
        this.updateUnauthenticatedWarning(false);
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
        if (window.calendarManager) {
            data.calendar = {
                currentSeason: window.calendarManager.currentSeason,
                currentCalendarDate: window.calendarManager.currentCalendarDate,
                calendarData: window.calendarManager.calendarData,
                isCalendarMode: window.calendarManager.isCalendarMode
            };
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

        // Collecter l'état des filtres
        if (window.filterManager) {
            data.filters = window.filterManager.getActiveFilters();
            this.logAuth("🔍 Filtres collectés:", data.filters);
        }

        this.logAuth("📦 Données collectées pour le contexte", Object.keys(data));
        return data;
    }


    // Supprimé : loadUserContexts, renderContextsList, loadContext, deleteContext
    // Ces fonctions géraient la liste des contextes sauvegardés, ce qui n'est plus nécessaire.

    async applyContextData(data) {
        this.logAuth("🔄 Application des données du contexte", Object.keys(data));

        // Désactiver temporairement l'auto-sync pendant l'application du contexte
        // Note : L'auto-sync est maintenant pilotée par isAuthenticated, donc on la désactive logiquement.
        const wasAuthenticated = this.isAuthenticated;
        this.isAuthenticated = false; // Empêche syncUserData d'être appelée par scheduleAutoSync
        this.logAuth("🚫 Auto-sync temporairement désactivée pendant l'application du contexte");

        // 1. SAUVEGARDER D'ABORD dans localStorage
        if (data.locations) {
            localStorage.setItem('middleEarthLocations', JSON.stringify(data.locations));
            this.logAuth(`💾 ${data.locations.locations?.length || 0} lieux sauvegardés dans localStorage`);
        }

        if (data.regions) {
            localStorage.setItem('middleEarthRegions', JSON.stringify(data.regions));
            this.logAuth(`💾 ${data.regions.regions?.length || 0} régions sauvegardées dans localStorage`);
        }

        // 2. FORCER la synchronisation IMMÉDIATE des données globales
        if (data.locations) {
            window.locationsData = data.locations;
            this.logAuth("✅ Référence globale 'locationsData' mise à jour");
        }
        if (data.regions) {
            window.regionsData = data.regions;
            this.logAuth("✅ Référence globale 'regionsData' mise à jour");
        }

        // 3. Synchroniser DataManager si présent
        if (window.dataManager) {
            if (data.locations) {
                window.dataManager.locationsData = data.locations;
            }
            if (data.regions) {
                window.dataManager.regionsData = data.regions;
            }
            this.logAuth("✅ DataManager synchronisé avec les nouvelles données");
        }


        // 4. Autres données (calendrier, paramètres, journal)
        if (data.calendar && window.calendarManager) {
            this.logAuth("📅 Application des données de calendrier depuis le cloud");
            
            // Sauvegarder directement dans localStorage avec le flag cloud
            if (data.calendar.currentSeason) {
                localStorage.setItem('currentSeason', data.calendar.currentSeason);
                this.logAuth(`  - Saison: ${data.calendar.currentSeason}`);
            }
            
            if (data.calendar.currentCalendarDate) {
                localStorage.setItem('currentCalendarDate', JSON.stringify(data.calendar.currentCalendarDate));
                this.logAuth(`  - Date: ${JSON.stringify(data.calendar.currentCalendarDate)}`);
            }
            
            if (data.calendar.calendarData) {
                localStorage.setItem('calendarData', JSON.stringify(data.calendar.calendarData));
                this.logAuth(`  - Données calendrier: ${data.calendar.calendarData.length} mois`);
            }
            
            if (data.calendar.isCalendarMode !== undefined) {
                localStorage.setItem('isCalendarMode', data.calendar.isCalendarMode.toString());
                this.logAuth(`  - Mode calendrier: ${data.calendar.isCalendarMode}`);
            }
            
            // Marquer que ces données viennent du cloud
            localStorage.setItem('calendar_from_cloud', 'true');
            
            // Recharger les données du CalendarManager depuis localStorage
            window.calendarManager.loadCalendarFromLocal();
            
            // Forcer la mise à jour complète de l'interface
            window.calendarManager.updateCalendarUI();
            window.calendarManager.updateSeasonDisplay();
            window.calendarManager.exposeGlobalData();
            
            this.logAuth("✅ Calendrier restauré depuis le cloud et sauvegardé localement (avec flag)");
        }

        if (data.settings && window.settingsManager) {
            this.logAuth("⚙️ Application des paramètres");
            window.settingsManager.loadSettings(data.settings);
            this.logAuth("✅ Paramètres appliqués");
        }

        if (data.journal) {
            this.logAuth(`📖 Application de ${data.journal.length} entrées de journal depuis le contexte`);
            localStorage.setItem('travelJournal', JSON.stringify(data.journal));
            if (window.journalManager) {
                window.journalManager.loadJournal();
                this.logAuth("✅ Journal chargé depuis le contexte");
            }
        }

        // Restaurer la position du marqueur - PRIORITÉ CLOUD/CONTEXTE
        if (data.position) {
            this.logAuth("📍 [applyContextData] Restauration de la position du marqueur depuis le contexte:", data.position);

            // FORCER la sauvegarde dans localStorage immédiatement avec le flag
            console.log("📍 [applyContextData] AVANT setItem - position à sauver:", data.position);
            localStorage.setItem('adventurers_position', JSON.stringify(data.position));
            localStorage.setItem('adventurers_position_from_cloud', 'true'); // Marqueur qu'elle vient du cloud/contexte

            const verif = localStorage.getItem('adventurers_position');
            const verifFlag = localStorage.getItem('adventurers_position_from_cloud');
            console.log("📍 [applyContextData] APRÈS setItem - position vérif:", verif);
            console.log("📍 [applyContextData] APRÈS setItem - flag vérif:", verifFlag);

            this.logAuth("✅ Position du contexte forcée dans localStorage avec flag:", data.position);

            // Si PositionManager existe déjà, mettre à jour visuellement
            if (window.positionManager) {
                console.log("📍 [applyContextData] Mise à jour visuelle du PositionManager");
                // Assurer que currentPosition est bien mis à jour avant updateMarkerPosition
                window.positionManager.currentPosition = JSON.parse(verif); // Utiliser la valeur vérifiée
                window.positionManager.updateMarkerPosition();
            }
        }

        // Restaurer l'état des filtres APRÈS le rendu initial
        if (data.filters && window.filterManager) {
            this.logAuth("🔍 Restauration des filtres depuis le contexte");
            // Utiliser un délai pour s'assurer que le FilterManager a terminé son initialisation
            setTimeout(() => {
                // Appliquer directement les filtres restaurés
                if (typeof window.filterManager.loadFiltersFromContext === 'function') {
                    window.filterManager.loadFiltersFromContext(data.filters);
                    this.logAuth("✅ Filtres restaurés via loadFiltersFromContext:", data.filters);
                } else {
                    // Fallback si la méthode spécifique n'existe pas
                    window.filterManager.activeFilters = { ...data.filters };
                    this.updateFilterUI(data.filters); // Mettre à jour l'UI des checkboxes etc.
                    window.filterManager.applyFilters(); // Appliquer les filtres
                    this.logAuth("✅ Filtres restaurés via propriétés directes:", data.filters);
                }
            }, 150); // Délai suffisant pour les initialisations
        }

        // 5. RE-RENDER pour appliquer les changements de données
        this.logAuth("🎨 Re-render des lieux et régions pour refléter les données du contexte");

        // Premier rendu immédiat
        if (typeof window.renderLocations === 'function') {
            window.renderLocations();
            this.logAuth(`✅ ${window.locationsData?.locations?.length || 0} lieux rendus (1er appel)`);
        }
        if (typeof window.renderRegions === 'function') {
            window.renderRegions();
            this.logAuth(`✅ ${window.regionsData?.regions?.length || 0} régions rendues (1er appel)`);
        }

        // Second rendu avec délai pour assurer la synchronisation complète
        setTimeout(() => {
            this.logAuth("🔄 Re-render forcé après synchronisation des données du contexte");
            if (typeof window.renderLocations === 'function') {
                window.renderLocations();
                this.logAuth(`✅ ${window.locationsData?.locations?.length || 0} lieux rendus (2ème appel)`);
            }
            if (typeof window.renderRegions === 'function') {
                window.renderRegions();
                this.logAuth(`✅ ${window.regionsData?.regions?.length || 0} régions rendues (2ème appel)`);
            }

            // Réappliquer les filtres pour s'assurer de la cohérence visuelle
            if (window.filterManager && typeof window.filterManager.applyFilters === 'function') {
                window.filterManager.applyFilters();
                this.logAuth("✅ Filtres réappliqués après re-render");
            }
        }, 100); // Petit délai pour le second rendu

        // RÉACTIVER l'auto-sync après l'application complète du contexte
        this.isAuthenticated = wasAuthenticated;
        this.logAuth("✅ Contexte appliqué avec succès - auto-sync réactivée");

        // Si l'utilisateur était authentifié AVANT l'application du contexte,
        // on peut déclencher une synchronisation cloud maintenant.
        if (wasAuthenticated) {
            this.logAuth("🔄 Déclenchement d'une synchronisation cloud suite à l'application du contexte");
            this.scheduleAutoSync(); // Déclenche la synchro après un délai
        }
    }


    // Suppression des fonctions liées à la gestion multiple de contextes:
    // loadUserContexts, renderContextsList, loadContext, deleteContext


    async loadUserData() {
        if (!this.isAuthenticated) {
            this.logAuth("ℹ️ Utilisateur non authentifié, chargement des données depuis localStorage.");
            await this.loadUserDataFromLocalStorage();
            return;
        }

        this.logAuth("📥 Chargement des données utilisateur depuis le cloud");

        try {
            const response = await fetch('/api/user/data', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const cloudData = await response.json();
                this.logAuth("✅ Données cloud récupérées.");

                // Vérifier s'il y a des données locales
                const hasLocalData = this.hasLocalData();

                if (hasLocalData) {
                    // Gérer le conflit entre local et cloud
                    this.logAuth("⚠️ Conflit détecté : données locales et cloud disponibles.");
                    const localData = this.collectCurrentContextData(); // Collecte depuis les références globales et localStorage
                    const mergedData = await this.resolveConflict(localData, cloudData);

                    // Appliquer les données mergées
                    await this.applyContextData(mergedData);

                    // Sauvegarder les données mergées dans le localStorage pour référence future
                    this.saveToLocalStorage(mergedData);

                    // Laisser le flag 'adventurers_position_from_cloud' être mis à jour par applyContextData
                    // La synchronisation cloud se fera via scheduleAutoSync() après applyContextData

                } else {
                    // Pas de données locales, charger simplement les données cloud
                    this.logAuth("ℹ️ Aucune donnée locale trouvée, application des données cloud.");
                    await this.applyContextData(cloudData);
                    // Sauvegarder les données cloud dans le localStorage
                    this.saveToLocalStorage(cloudData);
                }
                // Le flag 'adventurers_position_from_cloud' est géré dans applyContextData et resolveConflict

            } else if (response.status === 404) {
                // Pas de données cloud pour cet utilisateur, sauvegarder les données locales si elles existent
                if (this.hasLocalData()) {
                    this.logAuth("📤 Première synchronisation : envoi des données locales vers le cloud.");
                    await this.syncUserData(); // Envoie les données locales au backend
                } else {
                    this.logAuth("ℹ️ Aucune donnée cloud ni locale trouvée.");
                }
            } else {
                this.logAuth(`⚠️ Erreur lors du chargement des données utilisateur (statut: ${response.status})`);
                // En cas d'erreur, essayer de charger depuis le localStorage
                await this.loadUserDataFromLocalStorage();
            }
        } catch (error) {
            this.logAuth(`❌ Erreur réseau lors du chargement des données utilisateur: ${error.message}`);
            // En cas d'erreur réseau, essayer de charger depuis le localStorage
            await this.loadUserDataFromLocalStorage();
        }
    }

    // Nouvelle méthode pour charger les données depuis localStorage
    async loadUserDataFromLocalStorage() {
        this.logAuth("📥 Chargement des données depuis localStorage");
        
        // Ne rien faire - les données locales sont déjà chargées par le DataManager et les autres managers
        // Cette méthode sert juste à indiquer que le chargement est terminé sans bloquer
        this.logAuth("ℹ️ Mode non authentifié - utilisation des données déjà chargées localement");
    }


    hasLocalData() {
        // Vérifier si des données locales significatives existent
        const hasLocations = localStorage.getItem('middleEarthLocations') !== null;
        const hasRegions = localStorage.getItem('middleEarthRegions') !== null;
        const hasJournal = localStorage.getItem('travelJournal') !== null;
        const hasPosition = localStorage.getItem('adventurers_position') !== null;
        // Ajouter d'autres vérifications si nécessaire
        const hasSettings = localStorage.getItem('activeMapUrl') !== null || localStorage.getItem('availableMaps') !== null;

        // On considère qu'il y a des données locales si au moins un élément clé est présent.
        const hasAnyData = hasLocations || hasRegions || hasJournal || hasPosition || hasSettings;

        if (hasAnyData) {
            this.logAuth("✅ Des données locales existent.");
        } else {
            this.logAuth("ℹ️ Aucune donnée locale significative trouvée.");
        }
        return hasAnyData;
    }

    async resolveConflict(localData, cloudData) {
        this.logAuth("⚙️ Résolution de conflit local ↔ cloud");

        // Stratégie : merger en priorisant les modifications les plus récentes
        // Utiliser une copie profonde pour éviter les effets de bord
        const mergedData = JSON.parse(JSON.stringify(cloudData));

        // Merger les lieux (garder les IDs uniques, prioriser le plus récent)
        if (localData.locations && cloudData.locations) {
            const localLocations = localData.locations.locations || [];
            const cloudLocations = cloudData.locations.locations || [];
            const locationMap = new Map();

            cloudLocations.forEach(loc => {
                if (loc && loc.id) locationMap.set(loc.id, loc);
            });
            localLocations.forEach(loc => {
                if (loc && loc.id) {
                    if (!locationMap.has(loc.id) || (loc.updated_at && locationMap.get(loc.id).updated_at && new Date(loc.updated_at) > new Date(locationMap.get(loc.id).updated_at))) {
                        locationMap.set(loc.id, loc);
                    }
                }
            });
            mergedData.locations = { locations: Array.from(locationMap.values()) };
            this.logAuth(`  - Lieux mergés: ${mergedData.locations.locations.length} entrées.`);
        } else if (localData.locations) {
            mergedData.locations = localData.locations;
            this.logAuth(`  - Lieux locaux utilisés car pas de lieux cloud.`);
        }

        // Même logique pour les régions
        if (localData.regions && cloudData.regions) {
            const localRegions = localData.regions.regions || [];
            const cloudRegions = cloudData.regions.regions || [];
            const regionMap = new Map();

            cloudRegions.forEach(reg => {
                if (reg && reg.id) regionMap.set(reg.id, reg);
            });
            localRegions.forEach(reg => {
                if (reg && reg.id) {
                    if (!regionMap.has(reg.id)) { // Pour les régions, on peut juste ajouter les nouvelles
                        regionMap.set(reg.id, reg);
                    }
                    // Si besoin de prioriser par date, ajouter la logique ici
                }
            });
            mergedData.regions = { regions: Array.from(regionMap.values()) };
            this.logAuth(`  - Régions mergées: ${mergedData.regions.regions.length} entrées.`);
        } else if (localData.regions) {
            mergedData.regions = localData.regions;
            this.logAuth(`  - Régions locales utilisées.`);
        }

        // Pour les paramètres, prioriser le local (plus récent)
        if (localData.settings) {
            // Fusion simple, les paramètres locaux écrasent les cloud si présents
            mergedData.settings = { ...(cloudData.settings || {}), ...localData.settings };
            this.logAuth(`  - Paramètres locaux appliqués.`);
        }

        // Pour le calendrier, prioriser le local
        if (localData.calendar) {
            mergedData.calendar = localData.calendar;
            this.logAuth(`  - Calendrier local appliqué.`);
        }

        // Pour le journal, merger les entrées
        if (localData.journal && cloudData.journal) {
            const journalMap = new Map();
            cloudData.journal.forEach(entry => {
                const key = entry.pathSignature || entry.generatedAt || JSON.stringify(entry); // Clé unique
                if (key) journalMap.set(key, entry);
            });
            localData.journal.forEach(entry => {
                const key = entry.pathSignature || entry.generatedAt || JSON.stringify(entry);
                if (key && !journalMap.has(key)) {
                    journalMap.set(key, entry);
                }
            });
            mergedData.journal = Array.from(journalMap.values());
            this.logAuth(`  - Journal mergé: ${mergedData.journal.length} entrées.`);
        } else if (localData.journal) {
            mergedData.journal = localData.journal;
            this.logAuth(`  - Journal local utilisé.`);
        }

        // Pour la position : prioriser le cloud lors d'une restauration, MAIS forcer le flag local
        // C'est applyContextData qui gérera la mise à jour de localStorage avec le flag.
        if (cloudData.position) {
            mergedData.position = cloudData.position;
            this.logAuth("📍 Position cloud prioritaire.");
        } else if (localData.position) {
            mergedData.position = localData.position;
            this.logAuth("📍 Position locale utilisée.");
        }

        // Pour les filtres : prioriser le local
        if (localData.filters) {
            mergedData.filters = localData.filters;
            this.logAuth(`  - Filtres locaux appliqués.`);
        }


        this.logAuth("✅ Résolution de conflit terminée.");
        return mergedData;
    }

    async syncUserData() {
        if (!this.isAuthenticated) {
            this.logAuth("🚫 Impossible de synchroniser : utilisateur non authentifié.");
            return;
        }

        this.logAuth("🔄 Synchronisation des données utilisateur vers le cloud");

        try {
            const contextData = this.collectCurrentContextData();

            const response = await fetch('/api/user/data', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(contextData)
            });

            if (response.ok) {
                this.logAuth("✅ Données utilisateur synchronisées dans le cloud.");
                // Sauvegarder aussi en local pour cohérence immédiate
                this.saveToLocalStorage(contextData);
            } else {
                const error = await response.json();
                this.logAuth(`⚠️ Erreur lors de la synchronisation cloud: ${error.error || response.statusText}`);
                alert(`Erreur lors de la synchronisation: ${error.error || response.statusText}`);
            }
        } catch (error) {
            this.logAuth(`❌ Erreur réseau lors de la synchronisation: ${error.message}`);
            alert(`Erreur réseau lors de la synchronisation: ${error.message}`);
        }
    }

    saveToLocalStorage(data) {
        // Sauvegarder les données en local pour la persistance
        this.logAuth("💾 Sauvegarde des données actuelles dans localStorage.");

        if (data.locations) {
            localStorage.setItem('middleEarthLocations', JSON.stringify(data.locations));
        }
        if (data.regions) {
            localStorage.setItem('middleEarthRegions', JSON.stringify(data.regions));
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

        // IMPORTANT : Déclencher un événement 'storage' pour que les autres onglets/fenêtres soient notifiés
        // Cela permet la synchronisation entre onglets ouverts
        const event = new StorageEvent('storage', {
            key: 'middleEarthData', // Clé générique pour indiquer un changement global
            newValue: JSON.stringify(data),
            oldValue: null, // Non pertinent ici
            url: window.location.href,
            storageArea: localStorage
        });
        window.dispatchEvent(event);
        this.logAuth("  - Événement 'storage' déclenché pour notification.");
    }

    scheduleAutoSync() {
        // Ne synchroniser que si l'utilisateur est authentifié
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

    logAuth(message, data = null) {
        // Afficher les logs dans la console, potentiellement avec des conditions pour débugger
        console.log(`[AuthManager] ${message}`, data);
    }
}

export default AuthManager;