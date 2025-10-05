class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.contexts = [];
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
    }

    init() {
        this.logAuth("🔑 Initialisation AuthManager");
        this.setupDOMReferences();
        this.setupEventListeners();
        this.checkAuthenticationStatus();
        this.handleAuthCallback();
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
                    await this.loadUserContexts();
                    await this.loadUserData();
                } else {
                    this.logAuth("ℹ️ Aucun utilisateur authentifié");
                    this.updateUIForUnauthenticatedUser();
                }
            } else {
                this.logAuth("⚠️ Erreur lors de la vérification d'authentification");
                this.updateUIForUnauthenticatedUser();
            }
        } catch (error) {
            this.logAuth(`❌ Erreur lors de la vérification d'authentification: ${error.message}`);
            this.updateUIForUnauthenticatedUser();
        }

        this.hideAuthStatusPanel();
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
        }
    }

    showAuthModal() {
        if (this.authModal) {
            this.authModal.classList.remove('hidden');

            if (!this.isAuthenticated) {
                this.showAuthStatusPanel();
                // Si pas authentifié, vérifier le statut au cas où
                this.checkAuthenticationStatus();
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
    }

    showAuthError(message) {
        alert(`Erreur d'authentification: ${message}`);
    }

    async saveCurrentContext() {
        if (!this.isAuthenticated) {
            alert("Vous devez être connecté pour sauvegarder un contexte.");
            return;
        }

        const contextName = this.contextNameInput?.value?.trim();
        if (!contextName) {
            alert("Veuillez entrer un nom pour le contexte.");
            return;
        }

        this.logAuth(`💾 Sauvegarde du contexte: ${contextName}`);

        try {
            // Collecter toutes les données du contexte actuel
            const contextData = this.collectCurrentContextData();

            const response = await fetch('/api/contexts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: contextName,
                    data: contextData
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.logAuth(`✅ Contexte sauvegardé avec l'ID: ${result.id}`);

                // Vider le champ de nom
                if (this.contextNameInput) {
                    this.contextNameInput.value = '';
                }

                // Recharger la liste des contextes
                await this.loadUserContexts();

                alert("Contexte sauvegardé avec succès !");
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Erreur lors de la sauvegarde');
            }
        } catch (error) {
            this.logAuth(`❌ Erreur lors de la sauvegarde: ${error.message}`);
            alert(`Erreur lors de la sauvegarde: ${error.message}`);
        }
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
                currentDate: window.calendarManager.currentDate,
                calendarData: window.calendarManager.calendarData
            };
        }

        // Collecter les paramètres de l'application
        if (window.settingsManager) {
            data.settings = window.settingsManager.getAllSettings();
        }

        // Collecter le journal de voyage
        const savedJournal = localStorage.getItem('travelJournal');
        if (savedJournal) {
            try {
                data.journal = JSON.parse(savedJournal);
            } catch (e) {
                console.error("Erreur lors de la collecte du journal:", e);
            }
        }

        this.logAuth("📦 Données collectées pour le contexte", Object.keys(data));
        return data;
    }

    async loadUserContexts() {
        if (!this.isAuthenticated) return;

        this.logAuth("📂 Chargement des contextes utilisateur");

        try {
            const response = await fetch('/api/contexts', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                this.contexts = await response.json();
                this.renderContextsList();
                this.logAuth(`✅ ${this.contexts.length} contextes chargés`);
            } else {
                this.logAuth("⚠️ Erreur lors du chargement des contextes");
            }
        } catch (error) {
            this.logAuth(`❌ Erreur lors du chargement des contextes: ${error.message}`);
        }
    }

    renderContextsList() {
        if (!this.savedContextsContainer) return;

        if (this.contexts.length === 0) {
            this.savedContextsContainer.innerHTML = '<p class="text-gray-400 text-sm">Aucun contexte sauvegardé</p>';
            return;
        }

        const contextsHTML = this.contexts.map(context => `
            <div class="flex items-center justify-between p-2 bg-gray-700 rounded">
                <div class="flex-1">
                    <div class="font-medium text-sm">${context.name}</div>
                    <div class="text-xs text-gray-400">${new Date(context.updated_at).toLocaleDateString()}</div>
                </div>
                <div class="flex space-x-2">
                    <button onclick="window.authManager.loadContext(${context.id})" class="text-blue-400 hover:text-blue-300 text-sm" title="Charger">
                        <i class="fas fa-download"></i>
                    </button>
                    <button onclick="window.authManager.deleteContext(${context.id})" class="text-red-400 hover:text-red-300 text-sm" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        this.savedContextsContainer.innerHTML = contextsHTML;
    }

    async loadContext(contextId) {
        this.logAuth(`📥 Chargement du contexte ID: ${contextId}`);

        try {
            const response = await fetch(`/api/contexts/${contextId}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const context = await response.json();
                await this.applyContextData(context.data);
                this.logAuth(`✅ Contexte "${context.name}" chargé avec succès`);
                alert(`Contexte "${context.name}" chargé avec succès !`);
                this.hideAuthModal();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Erreur lors du chargement');
            }
        } catch (error) {
            this.logAuth(`❌ Erreur lors du chargement: ${error.message}`);
            alert(`Erreur lors du chargement: ${error.message}`);
        }
    }

    async applyContextData(data) {
        this.logAuth("🔄 Application des données du contexte");

        // Appliquer les données des lieux
        if (data.locations && window.dataManager) {
            window.dataManager.locationsData = data.locations;
            window.locationsData = data.locations;
            window.dataManager.saveLocationsToLocal();

            // Re-render les lieux
            if (typeof window.renderLocations === 'function') {
                window.renderLocations();
            }
        }

        // Appliquer les données des régions
        if (data.regions && window.dataManager) {
            window.dataManager.regionsData = data.regions;
            window.regionsData = data.regions;
            window.dataManager.saveRegionsToLocal();

            // Re-render les régions
            if (typeof window.renderRegions === 'function') {
                window.renderRegions();
            }
        }

        // Appliquer les données de saison/calendrier
        if (data.calendar && window.calendarManager) {
            if (data.calendar.currentSeason) {
                window.calendarManager.currentSeason = data.calendar.currentSeason;
            }
            if (data.calendar.currentDate) {
                window.calendarManager.currentDate = data.calendar.currentDate;
            }
            if (data.calendar.calendarData) {
                window.calendarManager.calendarData = data.calendar.calendarData;
            }
            window.calendarManager.updateSeasonDisplay();
            window.calendarManager.saveToLocalStorage();
        }

        // Appliquer les paramètres
        if (data.settings && window.settingsManager) {
            window.settingsManager.loadSettings(data.settings);
        }

        // Appliquer le journal de voyage
        if (data.journal) {
            localStorage.setItem('travelJournal', JSON.stringify(data.journal));
            if (window.journalManager) {
                window.journalManager.loadJournal();
            }
        }

        // Programmer une auto-sync
        this.scheduleAutoSync();
    }

    async deleteContext(contextId) {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce contexte ?")) {
            return;
        }

        this.logAuth(`🗑️ Suppression du contexte ID: ${contextId}`);

        try {
            const response = await fetch(`/api/contexts/${contextId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.logAuth("✅ Contexte supprimé avec succès");
                await this.loadUserContexts(); // Recharger la liste
                alert("Contexte supprimé avec succès !");
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Erreur lors de la suppression');
            }
        } catch (error) {
            this.logAuth(`❌ Erreur lors de la suppression: ${error.message}`);
            alert(`Erreur lors de la suppression: ${error.message}`);
        }
    }

    async loadUserData() {
        if (!this.isAuthenticated) return;

        this.logAuth("📥 Chargement des données utilisateur");

        try {
            const response = await fetch('/api/user/data', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                await this.applyContextData(data);
                this.logAuth("✅ Données utilisateur chargées automatiquement");
            } else if (response.status !== 404) {
                this.logAuth("⚠️ Erreur lors du chargement des données utilisateur");
            }
        } catch (error) {
            this.logAuth(`❌ Erreur lors du chargement des données utilisateur: ${error.message}`);
        }
    }

    async syncUserData() {
        if (!this.isAuthenticated) return;

        this.logAuth("🔄 Synchronisation des données utilisateur");

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
                this.logAuth("✅ Données utilisateur synchronisées");
            } else {
                this.logAuth("⚠️ Erreur lors de la synchronisation");
            }
        } catch (error) {
            this.logAuth(`❌ Erreur lors de la synchronisation: ${error.message}`);
        }
    }

    scheduleAutoSync() {
        // Annuler le timeout précédent s'il existe
        if (this.autoSyncTimeoutId) {
            clearTimeout(this.autoSyncTimeoutId);
        }

        // Programmer la synchronisation automatique
        this.autoSyncTimeoutId = setTimeout(() => {
            this.syncUserData();
        }, this.autoSyncDelay);
    }

    logAuth(message, data = null) {
        if (data) {
            console.log(message, data);
        } else {
            console.log(message);
        }
    }
}

export default AuthManager;