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

        // Bouton de debug des données cloud
        const debugBtn = document.getElementById('debug-cloud-data');
        if (debugBtn) {
            debugBtn.addEventListener('click', () => this.debugCloudData());
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

        // Collecter l'état des filtres
        if (window.filterManager) {
            data.filters = window.filterManager.getActiveFilters();
            this.logAuth("🔍 Filtres collectés:", data.filters);
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


    // Supprimé : loadUserContexts, renderContextsList, loadContext, deleteContext


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

        // 5. Le rendu sera fait dans loadUserData() après l'application complète
        this.logAuth("✅ Données du contexte synchronisées (rendu différé)");

        // Nettoyer le flag calendar MAINTENANT, après toutes les opérations UI
        const calendarFlag = localStorage.getItem('calendar_from_cloud');
        if (calendarFlag === 'true') {
            localStorage.removeItem('calendar_from_cloud');
            this.logAuth("🧹 Flag calendar_from_cloud nettoyé");
        }

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

            // RÉCUPÉRER les données locales AVANT de les nettoyer
            const localLocations = localStorage.getItem('middleEarthLocations');
            const localRegions = localStorage.getItem('middleEarthRegions');
            
            let hasLocalData = false;
            if (localLocations || localRegions) {
                this.logAuth("📦 Données locales détectées - fusion avec le cloud");
                hasLocalData = true;
                
                // Fusionner les lieux locaux
                if (localLocations) {
                    try {
                        const parsedLocal = JSON.parse(localLocations);
                        if (parsedLocal?.locations?.length > 0) {
                            if (!cloudData.locations) cloudData.locations = { locations: [] };
                            if (!cloudData.locations.locations) cloudData.locations.locations = [];
                            
                            // Ajouter uniquement les lieux locaux qui n'existent pas dans le cloud
                            parsedLocal.locations.forEach(localLoc => {
                                const exists = cloudData.locations.locations.some(cloudLoc => cloudLoc.id === localLoc.id);
                                if (!exists) {
                                    cloudData.locations.locations.push(localLoc);
                                    this.logAuth(`➕ Lieu local ajouté: ${localLoc.name}`);
                                }
                            });
                        }
                    } catch (e) {
                        this.logAuth(`⚠️ Erreur fusion lieux locaux: ${e.message}`);
                    }
                }
                
                // Fusionner les régions locales
                if (localRegions) {
                    try {
                        const parsedLocal = JSON.parse(localRegions);
                        if (parsedLocal?.regions?.length > 0) {
                            if (!cloudData.regions) cloudData.regions = { regions: [] };
                            if (!cloudData.regions.regions) cloudData.regions.regions = [];
                            
                            // Ajouter uniquement les régions locales qui n'existent pas dans le cloud
                            parsedLocal.regions.forEach(localReg => {
                                const exists = cloudData.regions.regions.some(cloudReg => cloudReg.id === localReg.id);
                                if (!exists) {
                                    cloudData.regions.regions.push(localReg);
                                    this.logAuth(`➕ Région locale ajoutée: ${localReg.name}`);
                                }
                            });
                        }
                    } catch (e) {
                        this.logAuth(`⚠️ Erreur fusion régions locales: ${e.message}`);
                    }
                }
            }

            // Nettoyer le localStorage
            localStorage.removeItem('middleEarthLocations');
            localStorage.removeItem('middleEarthRegions');
            localStorage.removeItem('middleEarthData');
            this.logAuth("🧹 localStorage nettoyé");

            // Appliquer les données fusionnées
            await this.applyContextData(cloudData);

            // Sauvegarder dans localStorage (comme cache uniquement)
            this.saveToLocalStorage(cloudData);

            // Si on a fusionné des données locales, synchroniser immédiatement avec le cloud
            if (hasLocalData) {
                this.logAuth("🔄 Synchronisation immédiate des données fusionnées");
                await this.syncUserData();
            }

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

            this.logAuth("✅ Données cloud chargées et appliquées avec succès");

        } catch (error) {
            this.logAuth(`❌ Erreur lors du chargement des données cloud: ${error.message}`);
            alert(`Impossible de charger les données du cloud: ${error.message}\n\nVeuillez rafraîchir la page.`);
        }
    }

    async syncUserData() {
        if (!this.isAuthenticated) {
            this.logAuth("❌ Non authentifié - redirection login");
            window.location.href = '/login';
            return;
        }

        this.logAuth("🔄 Synchronisation systématique vers cloud");

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
                this.logAuth("✅ Données synchronisées dans le cloud");
                // Mise à jour locale pour cohérence UI
                this.saveToLocalStorage(contextData);
            } else {
                const error = await response.json();
                this.logAuth(`⚠️ Erreur sync: ${error.error || response.statusText}`);

                if (response.status === 401) {
                    alert('Session expirée. Reconnexion requise.');
                    window.location.href = '/login';
                } else {
                    alert(`Erreur synchronisation: ${error.error || response.statusText}`);
                }
            }
        } catch (error) {
            this.logAuth(`❌ Erreur réseau sync: ${error.message}`);
            alert(`Erreur réseau. Vos modifications seront sauvegardées à la prochaine connexion.`);
        }
    }

    saveToLocalStorage(data) {
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

        // Note : L'événement 'storage' n'est pas nécessaire dans le même onglet
        // et pourrait causer des boucles infinies. Il est automatiquement déclenché
        // par le navigateur pour les AUTRES onglets lors de modifications du localStorage.
        this.logAuth("  - Données sauvegardées dans localStorage.");
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

    logAuth(message, data = null) {
        // Afficher les logs dans la console, potentiellement avec des conditions pour débugger
        console.log(`[AuthManager] ${message}`, data);
    }
}

export default AuthManager;