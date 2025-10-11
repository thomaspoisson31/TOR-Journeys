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
                calendarData: window.calendarManager.calendarData,
                isCalendarMode: window.calendarManager.isCalendarMode
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
                
                // Fermer la modal avant le reload
                this.hideAuthModal();
                
                // Recharger la page complètement pour garantir l'affichage correct
                this.logAuth("🔄 Rechargement de la page pour afficher le contexte");
                window.location.reload();
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
        this.logAuth("🔄 Application des données du contexte", Object.keys(data));

        // 1. SAUVEGARDER D'ABORD dans localStorage
        if (data.locations) {
            localStorage.setItem('middleEarthLocations', JSON.stringify(data.locations));
            this.logAuth(`💾 ${data.locations.locations?.length || 0} lieux sauvegardés`);
        }

        if (data.regions) {
            localStorage.setItem('middleEarthRegions', JSON.stringify(data.regions));
            this.logAuth(`💾 ${data.regions.regions?.length || 0} régions sauvegardées`);
        }

        // 2. FORCER la synchronisation IMMEDIATE de DataManager
        if (window.dataManager) {
            if (data.locations) {
                window.dataManager.locationsData = data.locations;
            }
            if (data.regions) {
                window.dataManager.regionsData = data.regions;
            }
            this.logAuth("✅ DataManager synchronisé");
        }

        // 3. FORCER la synchronisation des références globales
        if (data.locations) {
            window.locationsData = data.locations;
        }
        if (data.regions) {
            window.regionsData = data.regions;
        }
        this.logAuth("✅ Références globales synchronisées");

        // 4. Autres données (calendrier, paramètres, journal)
        if (data.calendar && window.calendarManager) {
            this.logAuth("📅 Application des données de calendrier");
            
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
            this.logAuth("✅ Calendrier mis à jour");
        }

        if (data.settings && window.settingsManager) {
            this.logAuth("⚙️ Application des paramètres");
            window.settingsManager.loadSettings(data.settings);
            this.logAuth("✅ Paramètres appliqués");
        }

        if (data.journal) {
            this.logAuth(`📖 Application de ${data.journal.length} entrées de journal`);
            localStorage.setItem('travelJournal', JSON.stringify(data.journal));
            if (window.journalManager) {
                window.journalManager.loadJournal();
                this.logAuth("✅ Journal chargé");
            }
        }

        // Restaurer la position du marqueur
        if (data.position && window.positionManager) {
            this.logAuth("📍 Restauration de la position du marqueur");
            window.positionManager.setPosition(data.position.x, data.position.y);
            this.logAuth("✅ Position restaurée:", data.position);
        }

        // Restaurer l'état des filtres
        if (data.filters && window.filterManager) {
            this.logAuth("🔍 Restauration des filtres");
            window.filterManager.activeFilters = { ...data.filters };
            this.logAuth("✅ Filtres restaurés:", data.filters);
        }

        // 5. RE-RENDER avec double appel pour forcer la mise à jour
        this.logAuth("🎨 Re-render des lieux et régions");
        
        // Premier rendu immédiat
        if (typeof window.renderLocations === 'function') {
            window.renderLocations();
            this.logAuth(`✅ ${window.locationsData?.locations?.length || 0} lieux rendus (1er appel)`);
        }
        
        if (typeof window.renderRegions === 'function') {
            window.renderRegions();
            this.logAuth(`✅ ${window.regionsData?.regions?.length || 0} régions rendues (1er appel)`);
        }

        // Second rendu avec délai pour s'assurer de la synchronisation complète
        setTimeout(() => {
            this.logAuth("🔄 Re-render forcé après synchronisation");
            
            if (typeof window.renderLocations === 'function') {
                window.renderLocations();
                this.logAuth(`✅ ${window.locationsData?.locations?.length || 0} lieux rendus (2ème appel)`);
            }
            
            if (typeof window.renderRegions === 'function') {
                window.renderRegions();
                this.logAuth(`✅ ${window.regionsData?.regions?.length || 0} régions rendues (2ème appel)`);
            }

            // Réappliquer les filtres pour s'assurer de la cohérence
            if (window.filterManager) {
                window.filterManager.applyFilters();
                this.logAuth("✅ Filtres réappliqués");
            }
        }, 100);

        this.logAuth("✅ Contexte appliqué avec succès");
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

        this.logAuth("📥 Chargement des données utilisateur depuis le cloud");

        try {
            const response = await fetch('/api/user/data', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const cloudData = await response.json();
                
                // Vérifier s'il y a des données locales
                const hasLocalData = this.hasLocalData();
                
                if (hasLocalData) {
                    // Gérer le conflit entre local et cloud
                    const localData = this.collectCurrentContextData();
                    const mergedData = await this.resolveConflict(localData, cloudData);
                    await this.applyContextData(mergedData);
                    
                    // Sauvegarder les données mergées dans le cloud
                    await this.syncUserData();
                } else {
                    // Pas de conflit, charger simplement les données cloud
                    await this.applyContextData(cloudData);
                }
                
                this.logAuth("✅ Données utilisateur chargées et synchronisées");
            } else if (response.status === 404) {
                // Pas de données cloud, sauvegarder les données locales si elles existent
                if (this.hasLocalData()) {
                    this.logAuth("📤 Première sync : envoi des données locales vers le cloud");
                    await this.syncUserData();
                }
            } else {
                this.logAuth("⚠️ Erreur lors du chargement des données utilisateur");
            }
        } catch (error) {
            this.logAuth(`❌ Erreur lors du chargement des données utilisateur: ${error.message}`);
        }
    }

    hasLocalData() {
        // Vérifier si des données locales existent
        const hasLocations = localStorage.getItem('middleEarthLocations') !== null;
        const hasRegions = localStorage.getItem('middleEarthRegions') !== null;
        const hasSettings = localStorage.getItem('availableMaps') !== null;
        
        return hasLocations || hasRegions || hasSettings;
    }

    async resolveConflict(localData, cloudData) {
        this.logAuth("⚙️ Résolution de conflit local ↔ cloud");

        // Stratégie : merger en priorisant les modifications les plus récentes
        const mergedData = { ...cloudData };

        // Merger les lieux (garder les IDs uniques)
        if (localData.locations && cloudData.locations) {
            const localLocations = localData.locations.locations || [];
            const cloudLocations = cloudData.locations.locations || [];
            
            // Créer une map par ID
            const locationMap = new Map();
            
            // Ajouter d'abord les lieux cloud
            cloudLocations.forEach(loc => locationMap.set(loc.id, loc));
            
            // Ajouter/merger les lieux locaux
            localLocations.forEach(loc => {
                if (!locationMap.has(loc.id)) {
                    locationMap.set(loc.id, loc);
                } else {
                    // Garder celui qui a le timestamp le plus récent
                    const cloudLoc = locationMap.get(loc.id);
                    if (loc.updated_at && cloudLoc.updated_at) {
                        if (new Date(loc.updated_at) > new Date(cloudLoc.updated_at)) {
                            locationMap.set(loc.id, loc);
                        }
                    }
                }
            });
            
            mergedData.locations = {
                locations: Array.from(locationMap.values())
            };
        } else if (localData.locations) {
            mergedData.locations = localData.locations;
        }

        // Même logique pour les régions
        if (localData.regions && cloudData.regions) {
            const localRegions = localData.regions.regions || [];
            const cloudRegions = cloudData.regions.regions || [];
            
            const regionMap = new Map();
            cloudRegions.forEach(reg => regionMap.set(reg.id, reg));
            localRegions.forEach(reg => {
                if (!regionMap.has(reg.id)) {
                    regionMap.set(reg.id, reg);
                }
            });
            
            mergedData.regions = {
                regions: Array.from(regionMap.values())
            };
        } else if (localData.regions) {
            mergedData.regions = localData.regions;
        }

        // Pour les paramètres, prioriser le local (plus récent)
        if (localData.settings) {
            mergedData.settings = localData.settings;
        }

        // Pour le calendrier et saison, prioriser le local
        if (localData.calendar) {
            mergedData.calendar = localData.calendar;
        }

        // Pour le journal, merger les entrées
        if (localData.journal && cloudData.journal) {
            const journalMap = new Map();
            
            cloudData.journal.forEach(entry => {
                journalMap.set(entry.pathSignature || entry.generatedAt, entry);
            });
            
            localData.journal.forEach(entry => {
                const key = entry.pathSignature || entry.generatedAt;
                if (!journalMap.has(key)) {
                    journalMap.set(key, entry);
                }
            });
            
            mergedData.journal = Array.from(journalMap.values());
        } else if (localData.journal) {
            mergedData.journal = localData.journal;
        }

        this.logAuth("✅ Conflit résolu - données mergées");
        return mergedData;
    }

    async syncUserData() {
        if (!this.isAuthenticated) return;

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
                this.logAuth("✅ Données utilisateur synchronisées dans le cloud");
                
                // Sauvegarder aussi en local pour cohérence
                this.saveToLocalStorage(contextData);
            } else {
                this.logAuth("⚠️ Erreur lors de la synchronisation cloud");
            }
        } catch (error) {
            this.logAuth(`❌ Erreur lors de la synchronisation: ${error.message}`);
        }
    }

    saveToLocalStorage(data) {
        // Sauvegarder les données en local aussi
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
        }
        if (data.calendar) {
            if (data.calendar.currentSeason) {
                localStorage.setItem('currentSeason', data.calendar.currentSeason);
            }
            if (data.calendar.currentDate) {
                localStorage.setItem('currentCalendarDate', JSON.stringify(data.calendar.currentDate));
            }
        }
        if (data.journal) {
            localStorage.setItem('travelJournal', JSON.stringify(data.journal));
        }
        if (data.position) {
            localStorage.setItem('adventurers_position', JSON.stringify(data.position));
        }
        // Les filtres ne sont pas sauvegardés en localStorage car ils sont restaurés depuis le contexte
    }

    scheduleAutoSync() {
        // Ne synchroniser que si l'utilisateur est authentifié
        if (!this.isAuthenticated) return;

        // Annuler le timeout précédent s'il existe
        if (this.autoSyncTimeoutId) {
            clearTimeout(this.autoSyncTimeoutId);
        }

        // Programmer la synchronisation automatique
        this.autoSyncTimeoutId = setTimeout(async () => {
            await this.syncUserData();
        }, this.autoSyncDelay);
        
        this.logAuth(`⏱️ Auto-sync programmée dans ${this.autoSyncDelay}ms`);
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