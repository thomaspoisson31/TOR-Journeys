export default class AuthManager {
    constructor(domElements) {
        this.dom = domElements;
        this.currentUser = null;
        this.savedContexts = [];
        this.autoSyncEnabled = false;
        this.lastSyncTime = 0;
    }

    // --- Auth Debug Logs ---
    logAuth(message, data = null) {
        console.log(`🔐 [AUTH] ${message}`, data || '');
    }

    // --- Check Google Authentication Status ---
    async checkAuthStatus() {
        this.logAuth("Vérification du statut d'authentification...");
        try {
            const response = await fetch('/api/auth/user');
            this.logAuth("Réponse reçue:", response.status);

            if (response.ok) {
                const data = await response.json();
                this.logAuth("Données d'authentification reçues:", data);

                if (data.authenticated && data.user) {
                    this.currentUser = data.user;
                    this.logAuth("Utilisateur authentifié:", this.currentUser.name);
                    this.updateAuthUI(true);
                    await this.loadSavedContexts();
                    this.enableAutoSync();
                } else {
                    this.currentUser = null;
                    this.logAuth("Utilisateur non authentifié", "");
                    this.updateAuthUI(false);
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.logAuth("Erreur lors de la vérification d'authentification:", error.message || error);
            this.currentUser = null;
            this.updateAuthUI(false);
        }
    }

    updateAuthUI(isAuthenticated) {
        this.logAuth("Mise à jour de l'interface utilisateur d'authentification");
        const authStatusPanel = document.getElementById('auth-status-panel');
        const authContentPanel = document.getElementById('auth-content-panel');
        const loggedInPanel = document.getElementById('logged-in-panel');
        const loggedOutPanel = document.getElementById('logged-out-panel');
        const authUserName = document.getElementById('auth-user-name');

        authStatusPanel.classList.add('hidden');
        authContentPanel.classList.remove('hidden');

        const authIcon = document.getElementById('auth-icon');
        const userProfilePic = document.getElementById('user-profile-pic');
        const authBtn = document.getElementById('auth-btn');

        if (isAuthenticated) {
            this.logAuth("Affichage du panneau utilisateur connecté");
            loggedInPanel.classList.remove('hidden');
            loggedOutPanel.classList.add('hidden');
            authUserName.textContent = this.currentUser.name || this.currentUser.email || 'Utilisateur';

            // Afficher la photo de profil si disponible
            if (this.currentUser.picture) {
                userProfilePic.src = this.currentUser.picture;
                userProfilePic.classList.remove('hidden');
                authIcon.classList.add('hidden');
                authBtn.title = `Connecté en tant que ${this.currentUser.name || this.currentUser.email}`;
            } else {
                // Pas de photo, garder l'icône mais changer le style
                userProfilePic.classList.add('hidden');
                authIcon.classList.remove('hidden');
                authIcon.className = 'fas fa-user-check text-green-400';
                authBtn.title = `Connecté en tant que ${this.currentUser.name || this.currentUser.email}`;
            }
        } else {
            this.logAuth("Affichage du panneau utilisateur non connecté");
            loggedInPanel.classList.add('hidden');
            loggedOutPanel.classList.remove('hidden');

            // Remettre l'icône par défaut
            userProfilePic.classList.add('hidden');
            authIcon.classList.remove('hidden');
            authIcon.className = 'fas fa-user';
            authBtn.title = 'Authentification et sauvegarde';

            this.disableAutoSync(); // Désactiver la synchronisation
        }
    }

    handleGoogleSignIn() {
        this.logAuth("Redirection vers Google OAuth...");
        // Redirect to Google OAuth flow on the server
        window.location.href = '/auth/google';
    }

    async saveCurrentContext() {
        const contextNameInput = document.getElementById('context-name-input');
        const contextName = contextNameInput.value.trim();
        if (!contextName) {
            alert("Veuillez entrer un nom pour le contexte.");
            return;
        }
        if (!this.currentUser) {
            alert("Vous devez être connecté pour sauvegarder des contextes.");
            return;
        }

        // Récupérer les données depuis le contexte global
        const currentData = {
            locations: window.locationsData,
            regions: window.regionsData,
            scale: window.scale,
            panX: window.panX,
            panY: window.panY,
            activeFilters: window.activeFilters,
            filters: window.activeFilters, // Ajout explicite des filtres pour compatibilité
            journeyPath: window.journeyPath,
            totalPathPixels: window.totalPathPixels,
            startPoint: window.startPoint,
            lastPoint: window.lastPoint,
            journeyDiscoveries: window.journeyDiscoveries, // Included journey discoveries
            currentSeason: window.currentSeason // Included season data
        };

        try {
            const response = await fetch('/api/contexts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: contextName, data: currentData })
            });

            if (response.ok) {
                alert(`Contexte "${contextName}" sauvegardé avec succès !`);
                contextNameInput.value = ''; // Clear input
                this.loadSavedContexts(); // Refresh list
            } else {
                const errorData = await response.json();
                alert(`Erreur lors de la sauvegarde du contexte: ${errorData.error}`);
            }
        } catch (error) {
            console.error("Error saving context:", error);
            alert("Erreur réseau lors de la sauvegarde du contexte.");
        }
    }

    async loadSavedContexts() {
        if (!this.currentUser) return;

        const savedContextsDiv = document.getElementById('saved-contexts');
        savedContextsDiv.innerHTML = '<p class="text-gray-500 italic">Chargement des contextes...</p>';
        if (!this.currentUser) {
            savedContextsDiv.innerHTML = '<p class="text-gray-500 italic">Connectez-vous pour voir vos contextes.</p>';
            return;
        }

        try {
            const response = await fetch('/api/contexts');
            if (response.ok) {
                const contexts = await response.json();
                this.savedContexts = contexts; // Store fetched contexts
                this.displaySavedContexts(contexts);
            } else {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des contextes:', error.message || error);
            savedContextsDiv.innerHTML = '<p class="text-red-500">Impossible de charger les contextes.</p>';
        }
    }

    displaySavedContexts(contexts) {
        const savedContextsDiv = document.getElementById('saved-contexts');
        savedContextsDiv.innerHTML = ''; // Clear previous content
        if (!contexts || contexts.length === 0) {
            savedContextsDiv.innerHTML = '<p class="text-gray-500 italic">Aucun contexte sauvegardé.</p>';
            return;
        }

        contexts.forEach(context => {
            const contextEl = document.createElement('div');
            contextEl.className = 'flex justify-between items-center bg-gray-700 p-2 rounded mb-1';
            contextEl.innerHTML = `
                <span class="text-sm">${context.name}</span>
                <div class="flex space-x-2">
                    <button class="load-context-btn text-blue-400 hover:text-blue-300" data-context-id="${context.id}">Charger</button>
                    <button class="delete-context-btn text-red-400 hover:text-red-300" data-context-id="${context.id}">Supprimer</button>
                </div>
            `;
            savedContextsDiv.appendChild(contextEl);
        });

        // Add event listeners for load and delete buttons
        savedContextsDiv.querySelectorAll('.load-context-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.loadContext(e.target.dataset.contextId));
        });
        savedContextsDiv.querySelectorAll('.delete-context-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteContext(e.target.dataset.contextId));
        });
    }

    async loadContext(contextId) {
        try {
            const response = await fetch(`/api/contexts/${contextId}`);
            if (!response.ok) {
                throw new Error(`Failed to load context: ${response.status}`);
            }

            const context = await response.json();

            // Load data dans le contexte global
            window.locationsData = context.data.locations || { locations: [] };
            window.regionsData = context.data.regions || { regions: [] };
            window.scale = context.data.scale || 1;
            window.panX = context.data.panX || 0;
            window.panY = context.data.panY || 0;
            window.activeFilters = context.data.activeFilters || context.data.filters || { known: false, visited: false, colors: [] };

            // Load journey data
            window.journeyPath = context.data.journeyPath || [];
            window.totalPathPixels = context.data.totalPathPixels || 0;
            window.startPoint = context.data.startPoint || null;
            window.lastPoint = context.data.lastPoint || null;
            window.journeyDiscoveries = context.data.journeyDiscoveries || []; // Load journey discoveries

            // Load season data
            if (context.data.currentSeason && window.seasonNames[context.data.currentSeason]) {
                window.currentSeason = context.data.currentSeason;
                localStorage.setItem('currentSeason', window.currentSeason);
            }

            // Load calendar data
            if (typeof window.calendarManager !== 'undefined') {
                if (context.data.calendarData) {
                    window.calendarManager.setCalendarData(context.data.calendarData);
                }
                if (context.data.currentCalendarDate) {
                    window.calendarManager.setCurrentCalendarDate(context.data.currentCalendarDate);
                }
                if (context.data.isCalendarMode !== undefined) {
                    window.calendarManager.setIsCalendarMode(context.data.isCalendarMode);
                }
                window.calendarManager.updateSeasonDisplay(); // Update season display based on loaded calendar data
            }

            // Redraw journey path if it exists
            if (window.journeyPath.length > 0) {
                window.ctx.clearRect(0, 0, window.drawingCanvas.width, window.drawingCanvas.height);
                window.ctx.beginPath();
                window.ctx.moveTo(window.journeyPath[0].x, window.journeyPath[0].y);

                for (let i = 1; i < window.journeyPath.length; i++) {
                    window.ctx.lineTo(window.journeyPath[i].x, window.journeyPath[i].y);
                }
                window.ctx.stroke();

                // Update distance display
                window.updateDistanceDisplay();
                window.updateJourneyInfo();
            } else {
                // Clear canvas if no journey path
                window.ctx.clearRect(0, 0, window.drawingCanvas.width, window.drawingCanvas.height);
                window.distanceContainer.classList.add('hidden');
            }

            // Re-render everything
            window.renderLocations();
            window.renderRegions();
            window.applyTransform();
            window.updateFilters(); // Apply loaded filters

            // Update UI elements
            document.getElementById('filter-known').checked = window.activeFilters.known;
            document.getElementById('filter-visited').checked = window.activeFilters.visited;
            document.getElementById('filter-show-regions').checked = true;
            document.querySelectorAll('.filter-color-checkbox').forEach(cb => {
                cb.checked = window.activeFilters.colors.includes(cb.dataset.color);
            });

            alert(`Contexte "${context.name}" chargé.`);
            document.getElementById('auth-modal').classList.add('hidden'); // Close modal after loading
        } catch (error) {
            console.error("Error loading context:", error);
            alert("Error loading context.");
        }
    }

    async deleteContext(contextId) {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce contexte ?")) return;

        try {
            const response = await fetch(`/api/contexts/${contextId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.savedContexts = this.savedContexts.filter(c => c.id !== contextId);
                this.displaySavedContexts(this.savedContexts);
                alert("Contexte supprimé.");
            } else {
                throw new Error(`Failed to delete context: ${response.status}`);
            }
        } catch (error) {
            console.error("Error deleting context:", error);
            alert("Erreur lors de la suppression du contexte.");
        }
    }

    // --- Auto-sync Functions ---
    enableAutoSync() {
        if (this.currentUser) {
            this.autoSyncEnabled = true;
            this.loadUserData();
            console.log("✅ Auto-sync activé");
            this.updateSyncStatus("Synchronisation automatique activée.");
        }
    }

    disableAutoSync() {
        this.autoSyncEnabled = false;
        console.log("❌ Auto-sync désactivé");
        this.updateSyncStatus("Synchronisation automatique désactivée.");
    }

    scheduleAutoSync() {
        if (!this.autoSyncEnabled || !this.currentUser) return;

        // Debounce: attendre 2 secondes après la dernière modification
        clearTimeout(window.autoSyncTimeout);
        window.autoSyncTimeout = setTimeout(() => {
            this.autoSyncUserData();
        }, window.SYNC_DELAY);
    }

    async autoSyncUserData() {
        if (!this.currentUser || !this.autoSyncEnabled) return;

        const userData = {
            locations: window.locationsData,
            regions: window.regionsData,
            scale: window.scale,
            panX: window.panX,
            panY: window.panY,
            activeFilters: window.activeFilters,
            filters: window.activeFilters, // Ajout explicite des filtres pour compatibilité
            journeyPath: window.journeyPath,
            totalPathPixels: window.totalPathPixels,
            startPoint: window.startPoint,
            lastPoint: window.lastPoint,
            journeyDiscoveries: window.journeyDiscoveries, // Included journey discoveries
            currentSeason: window.currentSeason, // Include season data
        };

        // Include calendar data from CalendarManager if it exists
        if (typeof window.calendarManager !== 'undefined') {
            userData.calendarData = window.calendarManager.getCalendarData();
            userData.currentCalendarDate = window.calendarManager.getCurrentCalendarDate();
            userData.isCalendarMode = window.calendarManager.getIsCalendarMode();
        }

        console.log("🔄 Synchronisation des données:", {
            journeyPathLength: window.journeyPath.length,
            totalPathPixels: window.totalPathPixels,
            hasStartPoint: !!window.startPoint,
            hasLastPoint: !!window.lastPoint,
            currentSeason: window.currentSeason,
            isCalendarMode: typeof window.calendarManager !== 'undefined' ? window.calendarManager.getIsCalendarMode() : 'N/A'
        });

        try {
            const response = await fetch('/api/user/data', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                this.lastSyncTime = Date.now();
                console.log("✅ Données utilisateur synchronisées automatiquement (tracé et saison inclus)");
            } else {
                console.error("❌ Erreur lors de la synchronisation automatique");
            }
        } catch (error) {
            console.error("❌ Erreur réseau lors de la synchronisation:", error);
        }
    }

    async loadUserData() {
        if (!this.currentUser) return;

        try {
            const response = await fetch('/api/user/data');
            if (response.ok) {
                const userData = await response.json();

                // Charger les données utilisateur
                if (userData.locations) {
                    window.locationsData = userData.locations;
                    console.log("📍 Lieux utilisateur chargés");
                }
                if (userData.regions) {
                    window.regionsData = userData.regions;
                    console.log("🗺️ Régions utilisateur chargées");
                }
                if (userData.scale) {
                    window.scale = userData.scale;
                    window.panX = userData.panX || 0;
                    window.panY = userData.panY || 0;
                    console.log("🔍 Vue utilisateur restaurée");
                }
                if (userData.activeFilters) {
                    window.activeFilters = userData.activeFilters;
                    console.log("🔍 Filtres utilisateur restaurés");
                }

                // Charger les tracés de voyage
                if (userData.journeyPath && Array.isArray(userData.journeyPath)) {
                    window.journeyPath = userData.journeyPath;
                    window.totalPathPixels = userData.totalPathPixels || 0;
                    window.startPoint = userData.startPoint || null;
                    window.lastPoint = userData.lastPoint || null;

                    // Charger les découvertes de voyage
                    if (userData.journeyDiscoveries && Array.isArray(userData.journeyDiscoveries)) {
                        window.journeyDiscoveries = userData.journeyDiscoveries;
                        console.log("🌟 Découvertes de voyage chargées");
                    }

                    // Redessiner le tracé sur le canvas
                    if (window.journeyPath.length > 0) {
                        window.ctx.clearRect(0, 0, window.drawingCanvas.width, window.drawingCanvas.height);
                        window.ctx.beginPath();
                        window.ctx.moveTo(window.journeyPath[0].x, window.journeyPath[0].y);

                        for (let i = 1; i < window.journeyPath.length; i++) {
                            window.ctx.lineTo(window.journeyPath[i].x, window.journeyPath[i].y);
                        }
                        window.ctx.stroke();

                        // Mettre à jour l'affichage des distances
                        window.updateDistanceDisplay();
                        // Réinitialiser les régions traversées et lieux proches
                        window.updateJourneyInfo();
                    }

                    console.log("🎨 Tracé de voyage restauré");
                }

                // Charger les filtres depuis le cloud
                if (userData.filters) {
                    window.activeFilters = userData.filters;
                    console.log("🔍 Filtres utilisateur chargés depuis le cloud");
                    // Sauvegarder localement pour synchronisation
                    window.saveFiltersToLocal();
                }

                // Charger la saison depuis le cloud
                if (userData.currentSeason && window.seasonNames[userData.currentSeason]) {
                    window.currentSeason = userData.currentSeason;
                    localStorage.setItem('currentSeason', window.currentSeason);
                    console.log("🌱 Saison utilisateur chargée depuis le cloud:", window.currentSeason);
                }

                // Charger le calendrier depuis le cloud (via CalendarManager)
                if (typeof window.calendarManager !== 'undefined') {
                    if (userData.calendarData) {
                        window.calendarManager.setCalendarData(userData.calendarData);
                        console.log("📅 Calendrier utilisateur chargé depuis le cloud");
                    }
                    if (userData.currentCalendarDate) {
                        window.calendarManager.setCurrentCalendarDate(userData.currentCalendarDate);
                        console.log("📅 Date calendrier utilisateur chargée depuis le cloud");
                    }
                    if (userData.isCalendarMode !== undefined) {
                        window.calendarManager.setIsCalendarMode(userData.isCalendarMode);
                        console.log("📅 Mode calendrier utilisateur chargé depuis le cloud:", userData.isCalendarMode);
                    }
                }

                // Re-render everything
                window.renderLocations();
                window.renderRegions();
                window.applyTransform();
                window.updateFiltersUI();
                window.updateSeasonDisplay();

                console.log("✅ Données utilisateur complètement chargées");
            } else if (response.status === 404) {
                console.log("ℹ️ Aucune donnée utilisateur trouvée, utilisation des données par défaut");
            }
        } catch (error) {
            console.error("Erreur lors du chargement des données utilisateur:", error);
        }
    }

    // --- Sync Status Display Function ---
    updateSyncStatus(message) {
        console.log(`🔄 Sync Status: ${message}`);
        // You can also display this message in the UI if there's a status element
        const statusElement = document.getElementById('sync-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.style.opacity = '1';
            setTimeout(() => {
                statusElement.style.opacity = '0';
            }, 3000); // Hide after 3 seconds
        }
    }

    // --- Check for authentication errors in URL ---
    checkAuthError() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('auth_error') === '1') {
            this.logAuth("ERREUR: Échec de l'authentification Google détecté dans l'URL");
            alert("Erreur lors de l'authentification Google. Veuillez réessayer.");
            // Nettoyer l'URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('auth_success') === '1') {
            this.logAuth("SUCCÈS: Authentification Google réussie détectée dans l'URL");
            // Nettoyer l'URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Forcer une nouvelle vérification de l'authentification
            setTimeout(() => {
                this.checkGoogleAuth();
            }, 1000);
        }
    }

    // --- Toggle Authentication Modal ---
    toggleAuthModal() {
        this.logAuth("Basculement de la modal d'authentification");
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            if (authModal.classList.contains('hidden')) {
                authModal.classList.remove('hidden');
                this.logAuth("Modal d'authentification ouverte");
            } else {
                authModal.classList.add('hidden');
                this.logAuth("Modal d'authentification fermée");
            }
        } else {
            this.logAuth("Erreur: Modal d'authentification non trouvée!");
        }
    }

    checkGoogleAuth() {
        this.logAuth("Vérification du statut d'authentification...");
        this.checkAuthStatus();
    }

    // --- Setup authentication event listeners ---
    setupAuthEventListeners() {
        this.logAuth("Configuration des event listeners d'authentification...");

        this.waitForElement('#auth-btn', (authBtn) => {
            this.logAuth("Bouton d'authentification trouvé et configuré");
            authBtn.addEventListener('click', (event) => {
                this.logAuth("Clic sur le bouton d'authentification détecté!");
                event.preventDefault();
                event.stopPropagation();
                this.toggleAuthModal();
            });
        });

        this.waitForElement('#close-auth-modal', (closeAuthModalBtn) => {
            this.logAuth("Bouton de fermeture modal trouvé et configuré");
            closeAuthModalBtn.addEventListener('click', (event) => {
                this.logAuth("Clic sur le bouton de fermeture modal détecté!");
                event.preventDefault();
                event.stopPropagation();
                const authModal = document.getElementById('auth-modal');
                if (authModal) {
                    authModal.classList.add('hidden');
                }
            });
        });

        this.waitForElement('#save-context-btn', (saveContextBtn) => {
            this.logAuth("Bouton de sauvegarde contexte trouvé et configuré");
            saveContextBtn.addEventListener('click', () => this.saveCurrentContext());
        });

        this.waitForElement('#google-signin-btn', (googleSigninBtn) => {
            this.logAuth("Bouton Google Sign-In trouvé et configuré");
            googleSigninBtn.addEventListener('click', () => this.handleGoogleSignIn());
        });
    }

    // Helper function to wait for an element and then execute a callback
    waitForElement(selector, callback, maxWait = 5000) {
        const startTime = Date.now();

        const check = () => {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
            } else if (Date.now() - startTime < maxWait) {
                setTimeout(check, 100);
            } else {
                this.logAuth("TIMEOUT: Élément non trouvé:", selector);
            }
        };

        check();
    }

    // Méthode pour exposer scheduleAutoSync à l'extérieur
    getScheduleAutoSync() {
        return () => this.scheduleAutoSync();
    }

    // Getters pour l'état d'authentification
    getCurrentUser() {
        return this.currentUser;
    }

    isAutoSyncEnabled() {
        return this.autoSyncEnabled;
    }
}