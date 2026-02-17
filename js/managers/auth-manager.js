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
        this.isLoadingFromCloud = false; // Flag pour éviter de marquer comme non sauvegardé pendant le chargement initial

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

        // Nouvelle propriété pour stocker le préfixe d'environnement
        this.envPrefix = null;
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
        this.logAuth("📦 Collecte des données du contexte actuel...");

        // Collecter les personnages avec leurs relations
        const charactersData = window.charactersManager?.charactersData ||
                              JSON.parse(localStorage.getItem('middleEarthCharacters') || '{"characters":[]}');

        const data = {
            locations: window.locationsData || { locations: [] },
            regions: window.regionsData || { regions: [] },
            characters: charactersData,
            calendar: {
                currentDate: localStorage.getItem('currentDate') || null,
                isCalendarMode: localStorage.getItem('isCalendarMode') === 'true',
                // ✅ AJOUT : Calendrier complet avec météo
                calendarData: window.calendarManager?.calendarData || null,
                currentCalendarDate: window.calendarManager?.currentCalendarDate || null,
                currentSeason: window.calendarManager?.currentSeason || 'printemps-debut'
            },
            settings: {
                activeMapUrl: window.settingsManager?.activeMapUrl || null,
                availableMaps: window.settingsManager?.availableMaps || [],
                // ✅ AJOUT : mapRandomTables pour les associations
                mapRandomTables: window.settingsManager?.mapRandomTables || {}
            },
            // Journal de voyage, objectifs et rumeurs avec états des cases
            journal: window.journalManager ? window.journalManager.getAllData() : { journal: [], objectives: [], rumors: [], rumorsCheckboxStates: {} },
            position: JSON.parse(localStorage.getItem('adventurers_position') || 'null'),
            filtersByMap: JSON.parse(localStorage.getItem('filtersByMap') || '{}'),
            // Ajouter l'état actuel du mode aventure
            adventureMode: window.positionManager?.adventureMode || JSON.parse(localStorage.getItem('adventurers_adventure_mode') || 'false'),
            // ✅ CORRECTION : Tables aléatoires depuis adventureData ou localStorage
            randomTables: window.adventureManager?.adventureData?.randomTables ||
                         (function() {
                             const saved = localStorage.getItem('adventureData');
                             if (saved) {
                                 try {
                                     const data = JSON.parse(saved);
                                     return data.randomTables || [];
                                 } catch (e) {
                                     return [];
                                 }
                             }
                             return [];
                         })(),
            // Ajouter les états des cases à cocher des tirages aléatoires
            randomTablesCheckedResults: JSON.parse(localStorage.getItem('randomTablesCheckedResults') || '{}'),
            // AJOUT: Compteurs
            counters: window.countersManager ? window.countersManager.getCounters() : []
        };

        this.logAuth(`📦 Données collectées pour le contexte`, Object.keys(data));
        this.logAuth(`📅 [collectCurrentContextData] Calendar dans les données collectées:`, data.calendar ? {
            currentDate: data.calendar.currentDate,
            isCalendarMode: data.calendar.isCalendarMode
        } : "NON PRÉSENT");

        // Locations
        if (window.locationsData && window.locationsData.locations) {
            data.locations = window.locationsData;
            console.log(`📦 [collectCurrentContextData] Locations collectées:`, {
                total: window.locationsData.locations.length,
                activeMapUrl: window.settingsManager?.activeMapUrl,
                onActiveMap: window.locationsData.locations.filter(loc =>
                    !loc.mapId || (window.settingsManager?.activeMapUrl && loc.mapId === window.settingsManager.activeMapUrl)
                ).length,
                sampleMapIds: window.locationsData.locations.slice(0, 5).map(l => ({
                    name: l.name,
                    mapId: l.mapId
                }))
            });
        }
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
            // MIGRATION AUTOMATIQUE: régions sans regionType → 'wild'
            let migratedCount = 0;
            if (data.regions.regions && Array.isArray(data.regions.regions)) {
                data.regions.regions = data.regions.regions.map(region => {
                    if (!region.regionType) {
                        migratedCount++;
                        return {
                            ...region,
                            regionType: 'wild',
                            color: 'yellow' // Synchroniser la couleur
                        };
                    }
                    // Synchroniser la couleur selon le type pour toutes les régions
                    const colorFromType = window.constants?.getColorFromRegionType?.(region.regionType) || 'yellow';
                    return {
                        ...region,
                        color: colorFromType
                    };
                });
            }
            if (migratedCount > 0) {
                this.logAuth(`🔄 Migration automatique: ${migratedCount} région(s) sans type → 'wild' (Terres Sauvages)`);
            }

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

            // ✅ AJOUT : Restaurer calendarData complet
            if (data.calendar.calendarData) {
                window.calendarManager.calendarData = data.calendar.calendarData;
                localStorage.setItem('calendarData', JSON.stringify(data.calendar.calendarData));
                this.logAuth(`📅 [applyContextData] CalendarData restauré: ${data.calendar.calendarData.length} mois`);
            }

            // Appliquer directement au CalendarManager
            if (data.calendar.currentCalendarDate) {
                window.calendarManager.currentCalendarDate = data.calendar.currentCalendarDate;
                localStorage.setItem('currentCalendarDate', JSON.stringify(data.calendar.currentCalendarDate));
                this.logAuth(`📅 [applyContextData] Date appliquée:`, data.calendar.currentCalendarDate);
            }

            if (data.calendar.currentSeason) {
                window.calendarManager.currentSeason = data.calendar.currentSeason;
                localStorage.setItem('currentSeason', data.calendar.currentSeason);
                this.logAuth(`📅 [applyContextData] Saison appliquée: ${data.calendar.currentSeason}`);
            }

            if (data.calendar.isCalendarMode !== undefined) {
                window.calendarManager.isCalendarMode = data.calendar.isCalendarMode;
                localStorage.setItem('isCalendarMode', data.calendar.isCalendarMode.toString());
                this.logAuth(`📅 [applyContextData] Mode calendrier appliqué: ${data.calendar.isCalendarMode}`);
            }

            // Forcer la mise à jour complète de l'interface
            window.calendarManager.updateSeasonDisplay();
            window.calendarManager.exposeGlobalData();

            this.logAuth("✅ [applyContextData] Calendrier restauré depuis le cloud (flag actif)");
        }

        // ✅ AJOUT : Restaurer les tables aléatoires depuis le cloud
        if (data.randomTables) {
            this.logAuth("🎲 [applyContextData] Restauration des tables aléatoires depuis le cloud");
            this.logAuth(`🎲 [applyContextData] Données reçues: ${data.randomTables.length} table(s)`);

            // Charger les données d'aventure existantes ou créer une structure vide
            let adventureData = null;
            const savedAdventure = localStorage.getItem('adventureData');
            if (savedAdventure) {
                try {
                    adventureData = JSON.parse(savedAdventure);
                } catch (e) {
                    this.logAuth("⚠️ [applyContextData] Erreur parsing adventureData, création nouvelle structure");
                }
            }

            if (!adventureData) {
                adventureData = {
                    quest: '',
                    rumors: [],
                    threats: [],
                    randomTables: [],
                    compositeTables: []
                };
            }

            // Restaurer les tables aléatoires
            adventureData.randomTables = data.randomTables;

            // Sauvegarder dans localStorage IMMÉDIATEMENT
            localStorage.setItem('adventureData', JSON.stringify(adventureData));

            this.logAuth(`✅ ${data.randomTables.length} table(s) aléatoire(s) restaurée(s) dans localStorage`);

            // Si adventureManager existe déjà, mettre à jour aussi sa référence
            if (window.adventureManager) {
                window.adventureManager.adventureData.randomTables = data.randomTables;
                this.logAuth(`🎲 [applyContextData] AdventureManager mis à jour: ${window.adventureManager.adventureData.randomTables.length} table(s)`);
            }
        } else {
            this.logAuth(`⚠️ [applyContextData] Pas de tables aléatoires dans les données cloud`);
        }

        if (data.settings && window.settingsManager) {
            this.logAuth("⚙️ Application des paramètres depuis le cloud");

            // Restaurer TOUTES les données de settings
            window.settingsManager.loadSettings(data.settings);

            // S'assurer que les cartes sont bien restaurées
            if (data.settings.availableMaps) {
                window.settingsManager.availableMaps = data.settings.availableMaps;
                localStorage.setItem('availableMaps', JSON.stringify(data.settings.availableMaps));
                this.logAuth(`🗺️ ${data.settings.availableMaps.length} carte(s) restaurée(s) depuis le cloud`);
            }

            if (data.settings.activeMapUrl) {
                window.settingsManager.activeMapUrl = data.settings.activeMapUrl;
                localStorage.setItem('activeMapUrl', data.settings.activeMapUrl);
                this.logAuth(`🗺️ Carte active restaurée: ${data.settings.activeMapUrl}`);
            }

            if (data.settings.activeMapName) {
                window.settingsManager.activeMapName = data.settings.activeMapName;
                localStorage.setItem('activeMapName', data.settings.activeMapName);
            }

            // ✅ AJOUT : Restaurer mapRandomTables
            if (data.settings.mapRandomTables) {
                window.settingsManager.mapRandomTables = data.settings.mapRandomTables;
                localStorage.setItem('mapRandomTables', JSON.stringify(data.settings.mapRandomTables));
                this.logAuth(`🎲 ${Object.keys(data.settings.mapRandomTables).length} associations carte-table aléatoire restaurées.`);
            }

            this.logAuth("✅ Paramètres et cartes appliqués depuis le cloud");
        }

        // Journal de voyage et objectifs
        if (data.journal) {
            // Nouveau format V2 (avec séparation Text/Entries)
            if (data.journal.travelJournal !== undefined) {
                localStorage.setItem('travelJournal', JSON.stringify(data.journal.travelJournal));
                localStorage.setItem('adventureJournal', JSON.stringify(data.journal.journal || { content: '', metadata: { wordCount: 0 } }));
                localStorage.setItem('adventureObjectives', JSON.stringify(data.journal.objectives || []));
                localStorage.setItem('adventureRumors', JSON.stringify(data.journal.rumors || []));
                localStorage.setItem('rumorsCheckboxStates', JSON.stringify(data.journal.rumorsCheckboxStates || {}));
                console.log('[AuthManager] ✅ Journal complet (V2) chargé depuis le cloud');
            }
            // Format intermédiaire (Objet global mais journal était encore travelJournal)
            else if (data.journal.journal) {
                // On migre l'ancien journal texte vers adventureJournal
                localStorage.setItem('adventureJournal', JSON.stringify(data.journal.journal));
                localStorage.setItem('adventureObjectives', JSON.stringify(data.journal.objectives || []));
                localStorage.setItem('adventureRumors', JSON.stringify(data.journal.rumors || []));
                localStorage.setItem('rumorsCheckboxStates', JSON.stringify(data.journal.rumorsCheckboxStates || {}));
                // Si on a des entrées structurées, on les restaure, sinon vide
                localStorage.setItem('travelJournal', JSON.stringify(data.journal.travelJournal || []));
                console.log('[AuthManager] ✅ Journal chargé et migré vers V2');
            } else {
                // Ancien format legacy (juste l'objet journal ou array)
                // On suppose que c'est le journal texte
                localStorage.setItem('adventureJournal', JSON.stringify(data.journal));
                localStorage.setItem('travelJournal', '[]'); // Initialiser vide
                console.log('[AuthManager] ✅ Journal chargé depuis le cloud (Legacy -> Migré)');
            }
        }

        // Restaurer les personnages
        if (data.characters) {
            this.logAuth(`👥 Application de ${data.characters.characters?.length || 0} personnages depuis le contexte`);
            localStorage.setItem('middleEarthCharacters', JSON.stringify(data.characters));
            if (window.charactersManager) {
                // Assurez-vous que la méthode de chargement correspond à la structure de data.characters
                window.charactersManager.loadCharacters(data.characters); // Appel supposé de la méthode
                this.logAuth("✅ Personnages chargés depuis le contexte");
            }
        }

        // Restaurer les données d'aventure
        if (data.adventure) {
            this.logAuth("🎲 Application des données d'aventure depuis le contexte");
            localStorage.setItem('adventureData', JSON.stringify(data.adventure));
            if (window.adventureManager) {
                window.adventureManager.loadFromLocalStorage();
                this.logAuth("✅ Aventure chargée depuis le contexte");
            }
        }

        // Restaurer la position du marqueur - PRIORITÉ CLOUD/CONTEXTE
        if (data.position) {
            const activeMapId = window.settingsManager?.activeMapUrl || localStorage.getItem('activeMapUrl');
            const positionMapId = data.position.mapId;

            console.log("📍 [applyContextData] Position reçue du cloud:", data.position);
            console.log("📍 [applyContextData] Carte active:", activeMapId);
            console.log("📍 [applyContextData] Carte de la position:", positionMapId);

            // Restaurer la position uniquement si elle correspond à la carte active
            // ou si elle n'a pas de mapId (ancienne version)
            if (!positionMapId || positionMapId === activeMapId) {
                console.log("📍 [applyContextData] AVANT setItem - position à sauver:", data.position);

                localStorage.setItem('adventurers_position', JSON.stringify(data.position));

                // Vérification immédiate
                const verif = localStorage.getItem('adventurers_position');
                console.log("📍 [applyContextData] APRÈS setItem - position vérif:", verif);

                // Ajouter le flag pour signaler que la position vient du cloud
                localStorage.setItem('adventurers_position_from_cloud', 'true');
                const flagVerif = localStorage.getItem('adventurers_position_from_cloud');
                console.log("📍 [applyContextData] APRÈS setItem - flag vérif:", flagVerif);

                console.log("[AuthManager] ✅ Position du contexte forcée dans localStorage avec flag:", data.position);
            } else {
                console.log("[AuthManager] ⚠️ Position ignorée car elle correspond à une autre carte");
            }
        } else {
            console.log("[AuthManager] ⚠️ [applyContextData] Aucune position dans le contexte");
        }

        // Restaurer le mode aventure
        if (data.adventureMode !== undefined && window.positionManager) {
            const wasAdventureMode = window.positionManager.adventureMode;
            window.positionManager.adventureMode = data.adventureMode;
            localStorage.setItem('adventurers_adventure_mode', data.adventureMode.toString());
            this.logAuth(`🎲 Mode Aventure restauré depuis le cloud: ${data.adventureMode ? 'Actif' : 'Inactif'}`);

            // Mettre à jour l'indicateur visuel
            if (window.positionManager.updateAdventureModeIndicator) {
                window.positionManager.updateAdventureModeIndicator();
            }

            // Mettre à jour la visibilité des boutons
            if (window.updateToolbarButtonsVisibility) {
                window.updateToolbarButtonsVisibility();
            }
        }

        // Restaurer les états des cases à cocher des tirages aléatoires
        if (data.randomTablesCheckedResults) {
            localStorage.setItem('randomTablesCheckedResults', JSON.stringify(data.randomTablesCheckedResults));
            if (window.randomTablesManager) {
                window.randomTablesManager.checkedResults = data.randomTablesCheckedResults;
                this.logAuth(`✅ ${Object.keys(data.randomTablesCheckedResults).length} état(s) de cases à cocher restauré(s)`);
            }
        }

        // Restaurer les compteurs
        if (data.counters && window.countersManager) {
            window.countersManager.loadCounters(data.counters);
            this.logAuth(`✅ ${data.counters.length} compteurs restaurés`);
        }

        // Sauvegarder les filtres pour restauration après initialisation complète
        // IMPORTANT: Toujours traiter filtersByMap, même s'il est vide ou undefined
        const filtersByMap = data.filtersByMap || {};
        this.logAuth("🔍 [applyContextData] Sauvegarde des filtres pour restauration différée");
        this.logAuth("🔍 [applyContextData] Données filtersByMap reçues:", filtersByMap);
        this.logAuth(`🔍 [applyContextData] Nombre de cartes avec filtres: ${Object.keys(filtersByMap).length}`);

        // Sauvegarder dans localStorage pour que FilterManager les charge à son init
        localStorage.setItem('filtersByMap', JSON.stringify(filtersByMap));
        this.logAuth("💾 [applyContextData] Filtres sauvegardés dans localStorage pour init FilterManager");

        // Appeler setAllFiltersByMap sur le FilterManager s'il existe
        if (window.filterManager) {
            this.logAuth("📤 [applyContextData] Application des filtres via FilterManager.setAllFiltersByMap");
            window.filterManager.setAllFiltersByMap(filtersByMap);
        } else {
            this.logAuth("⚠️ [applyContextData] FilterManager pas encore initialisé, les filtres seront chargés à son init");
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


    async getEnvironmentPrefix() {
        // Cache pour éviter les appels répétés
        if (this.envPrefix) { // Utiliser la propriété de classe mise en cache
            return this.envPrefix;
        }

        try {
            // Interroger le backend pour obtenir l'environnement
            const response = await fetch('/api/environment', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.envPrefix = data.prefix; // Stocker dans la propriété de classe
                this.logAuth(`🌍 Environnement détecté: ${data.environment} (préfixe: ${data.prefix})`);
                return this.envPrefix;
            }
        } catch (error) {
            this.logAuth(`⚠️ Erreur lors de la détection d'environnement: ${error.message}`);
        }

        // Fallback sur la détection côté client si l'API échoue
        const hostname = window.location.hostname;
        const fallbackPrefix = hostname.includes('replit.dev') ? 'dev_' : 'prod_';
        this.envPrefix = fallbackPrefix; // Stocker dans la propriété de classe
        this.logAuth(`⚠️ Utilisation du fallback pour l'environnement: ${fallbackPrefix}`);
        return this.envPrefix;
    }

    async loadUserData() {
        if (!this.isAuthenticated) {
            this.logAuth("❌ Tentative de chargement sans authentification");
            return;
        }

        // Activer le flag pour ignorer les appels à markAsUnsaved pendant le chargement
        this.isLoadingFromCloud = true;
        
        this.envPrefix = await this.getEnvironmentPrefix(); // Assurer que envPrefix est chargé
        this.logAuth(`📥 Chargement des données depuis le cloud (environnement: ${this.envPrefix})`);

        try {
            const response = await fetch(`/api/user/data?env=${this.envPrefix}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.status === 404) {
                // Pas de données cloud encore - vérifier si on a des données dans l'autre environnement
                const otherEnv = this.envPrefix === 'dev_' ? 'prod_' : 'dev_';
                this.logAuth(`ℹ️ Aucune donnée trouvée pour ${this.envPrefix}, vérification de ${otherEnv}...`);

                const otherResponse = await fetch(`/api/user/data?env=${otherEnv}`, {
                    method: 'GET',
                    credentials: 'include'
                });

                if (otherResponse.ok) {
                    const otherData = await otherResponse.json();
                    const hasData = (otherData.locations?.locations?.length || 0) > 0 ||
                                  (otherData.regions?.regions?.length || 0) > 0;

                    if (hasData) {
                        const shouldMigrate = confirm(
                            `⚠️ INCOHÉRENCE DÉTECTÉE\n\n` +
                            `Environnement actuel: ${this.envPrefix === 'dev_' ? 'DEVELOPMENT' : 'PRODUCTION'}\n` +
                            `Données trouvées dans: ${otherEnv === 'dev_' ? 'DEVELOPMENT' : 'PRODUCTION'}\n\n` +
                            `Vous avez ${otherData.locations?.locations?.length || 0} lieux et ${otherData.regions?.regions?.length || 0} régions dans l'autre environnement.\n\n` +
                            `Voulez-vous copier ces données vers l'environnement ${this.envPrefix === 'dev_' ? 'DEVELOPMENT' : 'PRODUCTION'} actuel ?\n\n` +
                            `✅ OK = Copier les données\n` +
                            `❌ ANNULER = Démarrer avec des données vides`
                        );

                        if (shouldMigrate) {
                            this.logAuth(`🔄 Migration des données de ${otherEnv} vers ${this.envPrefix}`);
                            // Marquer les données avec le nouvel environnement
                            otherData._environment = this.envPrefix;
                            otherData._migrated_from = otherEnv;
                            otherData._migrated_at = new Date().toISOString();

                            await this.applyContextData(otherData);
                            this.saveToLocalStorage(otherData, true);

                            // Sauvegarder immédiatement dans le nouvel environnement
                            await this.syncUserData();

                            if (typeof window.renderLocations === 'function') {
                                window.renderLocations();
                            }
                            if (typeof window.renderRegions === 'function') {
                                window.renderRegions();
                            }

                            this.markAsSaved();
                            this.logAuth("✅ Migration terminée avec succès");
                            return;
                        }
                    }
                }

                // Pas de données cloud encore - initialiser avec des données vides
                this.logAuth("ℹ️ Aucune donnée cloud trouvée - initialisation avec données vides");

                const emptyData = {
                    locations: { locations: [] },
                    regions: { regions: [] },
                    characters: { characters: [] }, // Initialiser les personnages
                    calendar: {},
                    settings: {},
                    journal: [],
                    adventure: {
                        quest: '',
                        rumors: [],
                        threats: []
                    },
                    position: null,
                    filtersByMap: {},
                    adventureMode: false // Initialiser adventureMode à false
                };

                await this.applyContextData(emptyData);
                this.saveToLocalStorage(emptyData, true);

                if (typeof window.renderLocations === 'function') {
                    window.renderLocations();
                }
                if (typeof window.renderRegions === 'function') {
                    window.renderRegions();
                }

                this.markAsSaved();
                this.logAuth("✅ Initialisation terminée - prêt à créer du contenu");
                return;
            }

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const cloudData = await response.json();
            this.logAuth("✅ Données cloud récupérées", cloudData);

            // Vérifier la cohérence de l'environnement
            if (cloudData._environment && cloudData._environment !== this.envPrefix) {
                this.logAuth(`⚠️ ATTENTION: Incohérence environnement détectée!`);
                this.logAuth(`   Données stockées avec: ${cloudData._environment}`);
                this.logAuth(`   Environnement actuel: ${this.envPrefix}`);

                const shouldContinue = confirm(
                    `⚠️ INCOHÉRENCE D'ENVIRONNEMENT\n\n` +
                    `Les données ont été sauvegardées dans: ${cloudData._environment === 'dev_' ? 'DEVELOPMENT' : 'PRODUCTION'}\n` +
                    `Environnement actuel: ${this.envPrefix === 'dev_' ? 'DEVELOPMENT' : 'PRODUCTION'}\n\n` +
                    `Voulez-vous quand même charger ces données ?\n` +
                    `(Elles seront automatiquement réenregistrées dans l'environnement actuel)\n\n` +
                    `✅ OK = Charger et migrer\n` +
                    `❌ ANNULER = Démarrer avec des données vides`
                );

                if (!shouldContinue) {
                    this.logAuth("❌ Chargement annulé par l'utilisateur");
                    const emptyData = {
                        locations: { locations: [] },
                        regions: { regions: [] },
                        characters: { characters: [] }, // Initialiser les personnages
                        calendar: {},
                        settings: {},
                        journal: [],
                        adventure: { quest: '', rumors: [], threats: [] },
                        position: null,
                        filtersByMap: {},
                        _environment: this.envPrefix,
                        adventureMode: false // Initialiser adventureMode à false
                    };
                    await this.applyContextData(emptyData);
                    this.saveToLocalStorage(emptyData, true);
                    if (typeof window.renderLocations === 'function') {
                        window.renderLocations();
                    }
                    if (typeof window.renderRegions === 'function') {
                        window.renderRegions();
                    }
                    this.markAsSaved();
                    return;
                }

                // Mettre à jour l'environnement dans les données
                cloudData._environment = this.envPrefix;
                cloudData._migrated_from = cloudData._environment; // Correction: doit pointer vers l'ancien environnement cloud
                cloudData._migrated_at = new Date().toISOString();
            }

            // NETTOYER IMMÉDIATEMENT le localStorage - le cloud est la source unique
            localStorage.removeItem('middleEarthLocations');
            localStorage.removeItem('middleEarthRegions');
            localStorage.removeItem('middleEarthData');
            this.logAuth("🧹 localStorage nettoyé - cloud est la source unique de vérité");

            // Appliquer les données du cloud UNIQUEMENT (pas de fusion)
            await this.applyContextData(cloudData);

            // Sauvegarder dans localStorage (comme cache uniquement)
            this.saveToLocalStorage(cloudData, true); // true = depuis le cloud

            // Forcer un rendu immédiat après chargement cloud
            this.logAuth("🎨 Rendu forcé après chargement cloud");
            if (typeof window.renderLocations === 'function') {
                window.renderLocations();
                this.logAuth(`✅ ${window.locationsData?.locations?.length || 0} lieux rendus depuis le cloud`);
            }
            if (typeof window.renderRegions === 'function') {
                window.renderRegions();
                this.logAuth(`✅ ${window.regionsData?.regions?.length || 0} régions rendues depuis le cloud`);
            }

            // Rafraîchir l'onglet Rumeurs après chargement des données
            if (window.journalManager && typeof window.journalManager.renderRumors === 'function') {
                console.log('[AuthManager] 📖 Rafraîchissement de l\'onglet Rumeurs après chargement cloud', null);
                window.journalManager.renderRumors();
            }

            // Rafraîchir le MapSwitcherManager après chargement des cartes depuis le cloud
            if (window.mapSwitcherManager && typeof window.mapSwitcherManager.refresh === 'function') {
                console.log('[AuthManager] 🗺️ Rafraîchissement du MapSwitcherManager après chargement cloud');
                window.mapSwitcherManager.refresh();
            }

            // Marquer comme sauvegardé après chargement cloud
            this.markAsSaved();

            this.logAuth("✅ Données cloud chargées et appliquées avec succès");

        } catch (error) {
            this.logAuth(`❌ Erreur lors du chargement des données cloud: ${error.message}`);
            alert(`Impossible de charger les données du cloud: ${error.message}\n\nVeuillez rafraîchir la page.`);
        } finally {
            // Désactiver le flag après le chargement (réussi ou échoué)
            this.isLoadingFromCloud = false;
            this.logAuth("🏁 Fin du chargement cloud, isLoadingFromCloud = false");
        }
    }

    markAsUnsaved() {
        // Ne pas marquer comme non sauvegardé pendant le chargement initial depuis le cloud
        if (this.isLoadingFromCloud) {
            this.logAuth("⏳ markAsUnsaved ignoré pendant le chargement cloud");
            return;
        }
        
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

        // Afficher le loader immédiatement
        this.showSyncLoader();

        this.updateSyncStatus('syncing');
        this.isSyncing = true;

        try {
            await this.syncUserData();
            this.updateSyncStatus('success');

            // Marquer comme sauvegardé et masquer l'icône
            this.markAsSaved();

            // Masquer le loader
            this.hideSyncLoader();

            // Afficher message de confirmation
            this.showSyncSuccessMessage();

            setTimeout(() => this.updateSyncStatus('idle'), 2000);
        } catch (error) {
            // Masquer le loader en cas d'erreur
            this.hideSyncLoader();

            this.updateSyncStatus('error');
            setTimeout(() => this.updateSyncStatus('idle'), 3000);
        } finally {
            this.isSyncing = false;
        }
    }

    showSyncLoader() {
        // Créer un loader si non existant
        let loader = document.getElementById('sync-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'sync-loader';
            loader.className = 'fixed top-20 left-4 z-[100] bg-blue-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center space-x-3';
            loader.innerHTML = `
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="font-medium">Synchronisation en cours...</span>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
        loader.style.opacity = '0';

        // Animation d'apparition
        setTimeout(() => {
            loader.style.transition = 'opacity 0.3s ease';
            loader.style.opacity = '1';
        }, 10);
    }

    hideSyncLoader() {
        const loader = document.getElementById('sync-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);
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

        this.envPrefix = await this.getEnvironmentPrefix(); // Assurer que envPrefix est chargé
        this.logAuth(`🔄 Synchronisation manuelle vers cloud (environnement: ${this.envPrefix})`);

        try {
            // 1. Collecter les données locales (ce sont les données à sauvegarder)
            const localData = this.collectCurrentContextData();
            this.logAuth("📦 Données locales collectées");

            // 2. NOUVEAU: Vérifier s'il y a des suppressions de lieux
            const deletionWarning = await this.checkForLocationDeletions(localData, this.envPrefix); // Passer envPrefix
            if (deletionWarning.hasDeleted) {
                const userConfirmed = await this.showDeletionWarning(deletionWarning);
                if (!userConfirmed) {
                    this.logAuth("❌ Synchronisation annulée par l'utilisateur suite à détection de suppressions");
                    this.updateSyncStatus('idle');
                    this.isSyncing = false;
                    return;
                }
            }

            // 2. Attribuer le mapId de la carte active aux lieux/régions sans mapId
            const activeMapId = localData.settings?.activeMapUrl || window.settingsManager?.activeMapUrl || localStorage.getItem('activeMapUrl');
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

            // 3. PAS DE FUSION - Les données locales ÉCRASENT le cloud
            // La fusion ne doit se faire qu'au chargement, pas à la sauvegarde
            console.log("📤 [CLOUD] Envoi des données locales (écrasement cloud):", {
                locations_count: localData.locations?.locations?.length || 0,
                regions_count: localData.regions?.regions?.length || 0,
                characters_count: localData.characters?.characters?.length || 0, // Ajout pour les personnages
                taille_json: JSON.stringify(localData).length
            });

            // 4. Envoyer vers le cloud
            console.log("📤 [CLOUD] Envoi vers serveur...");
            console.log("📤 [CLOUD] PAYLOAD COMPLET:", JSON.stringify(localData, null, 2));

            const response = await fetch(`/api/user/data?env=${this.envPrefix}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(localData)
            });

            console.log("📥 [CLOUD] Réponse serveur - Status:", response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ [CLOUD] Erreur serveur:", errorText);
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const result = await response.json();
            console.log("📥 [CLOUD] Résultat serveur:", result);

            if (result.conflict_detected) {
                console.warn("⚠️ [CLOUD] Conflit détecté");
                await this.handleSyncConflict(localData, result.cloud_data);
            } else {
                this.lastSyncTimestamp = Date.now();
                localStorage.setItem('lastCloudSyncTimestamp', this.lastSyncTimestamp);
                this.updateLastSyncDateDisplay();
                console.log("✅ [CLOUD] === SYNCHRONISATION RÉUSSIE ===");
            }

        } catch (error) {
            console.error("❌ [CLOUD] Erreur:", error);
            this.updateSyncStatus('error');
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

        // Fusion des personnages - PRIORITÉ AUX DONNÉES LOCALES
        const cloudCharacters = cloudData.characters?.characters || [];
        const localCharacters = localData.characters?.characters || [];

        const mergedCharacters = [...localCharacters]; // Commencer par les locales
        cloudCharacters.forEach(cloudChar => {
            const localExists = mergedCharacters.find(lc => lc.id === cloudChar.id);
            if (!localExists) {
                // Personnage uniquement dans le cloud, l'ajouter
                mergedCharacters.push(cloudChar);
                this.logAuth(`➕ Ajout personnage cloud: ${cloudChar.name}`);
            } else {
                // Le personnage existe localement, on garde la version locale
                // Ici, on pourrait envisager une fusion plus poussée si nécessaire,
                // mais pour l'instant, on garde la version locale par défaut.
                this.logAuth(`🔄 Personnage existe localement: ${cloudChar.name}, conservation version locale`);
            }
        });

        merged.characters = { characters: mergedCharacters };
        this.logAuth(`🔀 Fusion personnages: ${cloudCharacters.length} cloud + ${localCharacters.length} local = ${mergedCharacters.length} total`);

        return merged;
    }

    async handleSyncConflict(localData, cloudData) {
        this.logAuth("🔄 Gestion du conflit de synchronisation");

        // NOUVEAU: Vérifier les suppressions avant de proposer le conflit
        const deletionWarning = await this.checkForLocationDeletions(localData, this.envPrefix); // Passer envPrefix
        let conflictMessage = "⚠️ CONFLIT DE SYNCHRONISATION DÉTECTÉ\n\n" +
            "Des modifications ont été effectuées sur un autre appareil.\n\n";

        if (deletionWarning.hasDeleted) {
            conflictMessage += `⚠️ ATTENTION: ${deletionWarning.deletedLocations.length} lieu(x) de la carte "${deletionWarning.activeMapId}" seraient supprimé(s) si vous gardez vos données locales:\n`;
            deletionWarning.deletedLocations.slice(0, 5).forEach(loc => {
                conflictMessage += `  - ${loc.name}\n`;
            });
            if (deletionWarning.deletedLocations.length > 5) {
                conflictMessage += `  ... et ${deletionWarning.deletedLocations.length - 5} autres\n`;
            }
            conflictMessage += "\n";
        }

        conflictMessage += "Que souhaitez-vous faire ?\n\n" +
            "✅ OK = Garder mes modifications locales (écraser le cloud)\n" +
            "❌ ANNULER = Charger les données du cloud (perdre mes modifications locales)";

        const userChoice = confirm(conflictMessage);

        if (userChoice) {
            // L'utilisateur veut garder ses modifications locales
            this.logAuth("👤 Utilisateur choisit: garder local, écraser cloud");

            // Forcer la synchronisation avec un flag
            localData._force_overwrite = true;

            const response = await fetch(`/api/user/data?env=${this.envPrefix}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(localData)
            });

            if (response.ok) {
                this.lastSyncTimestamp = Date.now();
                localStorage.setItem('lastCloudSyncTimestamp', this.lastSyncTimestamp);
                this.updateLastSyncDateDisplay();
                this.saveToLocalStorage(localData); // Sauvegarder aussi localement
                this.updateSyncStatus('success');
                setTimeout(() => this.updateSyncStatus('idle'), 2000);
            } else {
                const errorText = await response.text();
                console.error("❌ [CLOUD CONFLICT] Erreur lors de l'écrasement du cloud:", errorText);
                this.updateSyncStatus('error');
                alert("Une erreur s'est produite lors de l'écrasement des données cloud. Vos modifications locales n'ont pas été sauvegardées.");
            }
        } else {
            // L'utilisateur veut charger les données du cloud
            this.logAuth("☁️ Utilisateur choisit: charger cloud, abandonner local");

            await this.applyContextData(cloudData);
            this.saveToLocalStorage(cloudData); // Sauvegarder les données cloud chargées localement

            // Forcer le rendu
            if (typeof window.renderLocations === 'function') {
                window.renderLocations();
            }
            if (typeof window.renderRegions === 'function') {
                window.renderRegions();
            }
            // Afficher les personnages chargés
            if (typeof window.renderCharacters === 'function') { // Assumant qu'une telle fonction existe
                 window.renderCharacters();
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

    async checkForLocationDeletions(localData, envPrefix) { // Ajouter envPrefix en paramètre
        this.logAuth("🔍 Vérification des suppressions de lieux...");

        try {
            // Récupérer les données actuelles du cloud
            const response = await fetch(`/api/user/data?env=${envPrefix}`, { // Utiliser envPrefix
                method: 'GET',
                credentials: 'include'
            });

            if (response.status === 404) {
                // Pas de données cloud, donc pas de suppression
                this.logAuth("ℹ️ Aucune donnée cloud existante, pas de vérification de suppression");
                return { hasDeleted: false, deletedLocations: [] };
            }

            if (!response.ok) {
                this.logAuth("⚠️ Impossible de vérifier les suppressions (erreur cloud)");
                return { hasDeleted: false, deletedLocations: [] };
            }

            const cloudData = await response.json();

            // Récupérer l'ID de la carte active
            const activeMapId = localData.settings?.activeMapUrl || window.settingsManager?.activeMapUrl || localStorage.getItem('activeMapUrl');
            this.logAuth(`🗺️ Carte active pour comparaison: ${activeMapId}`);
            this.logAuth(`🌍 Environnement de synchronisation: ${envPrefix}`); // Log de l'environnement

            // IMPORTANT: Filtrer les lieux par carte active uniquement - CLOUD ET LOCAL
            const cloudLocations = (cloudData.locations?.locations || []).filter(loc =>
                loc.mapId === activeMapId
            );
            const localLocations = (localData.locations?.locations || []).filter(loc =>
                loc.mapId === activeMapId
            );

            this.logAuth(`📊 Comparaison pour carte active: Cloud=${cloudLocations.length} lieux, Local=${localLocations.length} lieux`);
            this.logAuth(`🔍 Détail - Cloud IDs: ${cloudLocations.map(l => l.id).join(', ')}`);
            this.logAuth(`🔍 Détail - Local IDs: ${localLocations.map(l => l.id).join(', ')}`);

            const cloudLocationIds = new Set(cloudLocations.map(loc => loc.id));
            const localLocationIds = new Set(localLocations.map(loc => loc.id));

            // Trouver les lieux présents dans le cloud mais absents localement (pour la carte active uniquement)
            const deletedLocations = cloudLocations.filter(cloudLoc => !localLocationIds.has(cloudLoc.id));

            if (deletedLocations.length > 0) {
                this.logAuth(`⚠️ ALERTE: ${deletedLocations.length} lieu(x) de la carte active seraient supprimé(s) par cette synchronisation!`);
                deletedLocations.forEach(loc => {
                    this.logAuth(`   - ${loc.name} (ID: ${loc.id}, Carte: ${loc.mapId || 'global'})`);
                });

                const shouldContinue = await this.showDeletionWarning({ // Utilisation de showDeletionWarning
                    hasDeleted: true,
                    deletedLocations: deletedLocations,
                    cloudTotal: cloudLocations.length,
                    localTotal: localLocations.length,
                    activeMapId: activeMapId
                });

                if (!shouldContinue) {
                    this.logAuth("❌ Synchronisation annulée par l'utilisateur suite à détection de suppressions");
                    return { hasDeleted: true, deletedLocations: deletedLocations, activeMapId: activeMapId, cancelled: true }; // Indiquer annulation
                }
            } else {
                this.logAuth(`✅ Aucune suppression détectée pour la carte active (Cloud: ${cloudLocations.length}, Local: ${localLocations.length})`);
                return { hasDeleted: false, deletedLocations: [] };
            }
            return { hasDeleted: true, deletedLocations: deletedLocations, activeMapId: activeMapId }; // Retourner les infos si non annulé

        } catch (error) {
            this.logAuth(`⚠️ Erreur lors de la vérification des suppressions: ${error.message}`);
            return { hasDeleted: false, deletedLocations: [] };
        }
    }

    async showDeletionWarning(deletionInfo) {
        return new Promise((resolve) => {
            // Log détaillé pour expliquer pourquoi l'alerte s'affiche
            console.log("⚠️ [SUPPRESSION] ALERTE DE SUPPRESSION AFFICHÉE - Raisons:");
            console.log(`🌍 [SUPPRESSION] Environnement actuel: ${this.envPrefix || 'NON DÉFINI'}`);
            console.log(`📊 [SUPPRESSION] Cloud actuel: ${deletionInfo.cloudTotal} lieu(x) pour la carte "${deletionInfo.activeMapId}"`);
            console.log(`📊 [SUPPRESSION] Local actuel: ${deletionInfo.localTotal} lieu(x) pour la carte "${deletionInfo.activeMapId}"`);
            console.log(`🗑️ [SUPPRESSION] Différence détectée: ${deletionInfo.deletedLocations.length} lieu(x) seraient SUPPRIMÉS du cloud`);
            console.log(`📝 [SUPPRESSION] Liste des lieux qui seraient supprimés:`);
            deletionInfo.deletedLocations.forEach((loc, index) => {
                console.log(`   ${index + 1}. "${loc.name}" (ID: ${loc.id}, mapId: ${loc.mapId})`);
            });
            console.log(`💡 [SUPPRESSION] Explication: Ces lieux existent dans le cloud ${this.envPrefix || ''} mais PAS dans vos données locales.`);
            console.log(`💡 [SUPPRESSION] Si cette suppression est INATTENDUE, cliquez sur ANNULER et vérifiez vos données avant de synchroniser.`);
            console.log(`⚠️ [SUPPRESSION] ATTENTION: Vérifiez que vous synchronisez le bon environnement (dev_ ou prod_)!`);

            // Récupérer le nom de la carte active pour l'affichage
            const activeMapName = window.settingsManager?.activeMapName || 'la carte active';

            // Créer une modale d'avertissement visible et bloquante
            const warningModal = document.createElement('div');
            warningModal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[200]';
            warningModal.innerHTML = `
                <div class="bg-red-900 border-4 border-red-500 rounded-lg p-8 max-w-2xl mx-4 shadow-2xl">
                    <div class="flex items-center mb-6">
                        <i class="fas fa-exclamation-triangle text-yellow-400 text-5xl mr-4 animate-pulse"></i>
                        <h2 class="text-3xl font-bold text-white">⚠️ ALERTE DE SUPPRESSION ⚠️</h2>
                    </div>

                    <div class="bg-red-800 border-2 border-red-600 rounded p-4 mb-6">
                        <p class="text-white text-lg mb-4">
                            <strong class="text-yellow-300">ATTENTION:</strong> Cette synchronisation va <strong class="underline">SUPPRIMER ${deletionInfo.deletedLocations.length} lieu(x)</strong> de "${activeMapName}" dans votre sauvegarde cloud !
                        </p>
                        <p class="text-gray-200 text-sm mb-2">
                            <strong>Environnement:</strong> ${this.envPrefix === 'dev_' ? 'DEVELOPMENT' : this.envPrefix === 'prod_' ? 'PRODUCTION' : 'INCONNU'} (${this.envPrefix})
                        </p>
                        <p class="text-gray-200 text-sm mb-2">
                            <strong>Carte:</strong> ${activeMapName}
                        </p>
                        <p class="text-gray-200 text-sm mb-2">
                            Cloud actuel: <strong>${deletionInfo.cloudTotal} lieux</strong> → Après sync: <strong>${deletionInfo.localTotal} lieux</strong>
                        </p>
                    </div>

                    <div class="bg-gray-800 rounded p-4 mb-6 max-h-60 overflow-y-auto">
                        <p class="text-white font-bold mb-2">Lieux qui seront supprimés :</p>
                        <ul class="text-gray-300 space-y-1">
                            ${deletionInfo.deletedLocations.map(loc => `
                                <li class="flex items-center">
                                    <i class="fas fa-times-circle text-red-400 mr-2"></i>
                                    <strong>${loc.name}</strong>
                                    <span class="text-xs text-gray-400 ml-2">(ID: ${loc.id})</span>
                                    ${loc.mapId ? `<span class="text-xs text-gray-500 ml-2">Carte: ${loc.mapId.split('/').pop()}</span>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <div class="bg-yellow-900 border-2 border-yellow-600 rounded p-4 mb-6">
                        <p class="text-yellow-200 text-sm">
                            <i class="fas fa-info-circle mr-2"></i>
                            Si ces suppressions sont inattendues, cliquez sur <strong>ANNULER</strong> et vérifiez vos données avant de synchroniser. Assurez-vous que vous synchronisez le bon environnement (Dev/Prod).
                        </p>
                    </div>

                    <div class="flex justify-end space-x-4">
                        <button id="deletion-cancel-btn" class="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors text-lg">
                            <i class="fas fa-ban mr-2"></i>ANNULER
                        </button>
                        <button id="deletion-confirm-btn" class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-lg">
                            <i class="fas fa-trash mr-2"></i>CONFIRMER LA SUPPRESSION
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(warningModal);

            const cancelBtn = warningModal.querySelector('#deletion-cancel-btn');
            const confirmBtn = warningModal.querySelector('#deletion-confirm-btn');

            cancelBtn.addEventListener('click', () => {
                this.logAuth("❌ Utilisateur a annulé la synchronisation (suppressions détectées)");
                document.body.removeChild(warningModal);
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                this.logAuth("✅ Utilisateur a confirmé la synchronisation malgré les suppressions");
                document.body.removeChild(warningModal);
                resolve(true);
            });

            // Empêcher la fermeture en cliquant à l'extérieur
            warningModal.addEventListener('click', (e) => {
                if (e.target === warningModal) {
                    e.stopPropagation();
                }
            });
        });
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
            // Sauvegarder TOUTES les données de settings
            if (data.settings.availableMaps) {
                localStorage.setItem('availableMaps', JSON.stringify(data.settings.availableMaps));
                this.logAuth(`💾 ${data.settings.availableMaps.length} carte(s) sauvegardée(s) dans localStorage`);
            }
            if (data.settings.activeMapUrl) {
                localStorage.setItem('activeMapUrl', data.settings.activeMapUrl);
                this.logAuth(`💾 Carte active sauvegardée: ${data.settings.activeMapUrl}`);
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
            // ✅ AJOUT : Sauvegarder mapRandomTables
            if (data.settings.mapRandomTables) {
                localStorage.setItem('mapRandomTables', JSON.stringify(data.settings.mapRandomTables));
                this.logAuth(`💾 ${Object.keys(data.settings.mapRandomTables).length} associations carte-table aléatoire sauvegardées.`);
            }
        }
        if (data.calendar) {
            if (data.calendar.currentDate) {
                localStorage.setItem('currentCalendarDate', JSON.stringify(data.calendar.currentDate)); // Utiliser currentCalendarDate
            }
            if (data.calendar.isCalendarMode !== undefined) {
                localStorage.setItem('isCalendarMode', data.calendar.isCalendarMode.toString());
            }
            // Si calendarData est fourni dans data.calendar
            if (data.calendar.calendarData) {
                localStorage.setItem('calendarData', JSON.stringify(data.calendar.calendarData));
            }
        }
        if (data.journal) {
            // Journal de voyage et objectifs
            if (data.journal.travelJournal !== undefined) {
                localStorage.setItem('travelJournal', JSON.stringify(data.journal.travelJournal));
                localStorage.setItem('adventureJournal', JSON.stringify(data.journal.journal));
                localStorage.setItem('adventureObjectives', JSON.stringify(data.journal.objectives || []));
                localStorage.setItem('adventureRumors', JSON.stringify(data.journal.rumors || []));
                localStorage.setItem('rumorsCheckboxStates', JSON.stringify(data.journal.rumorsCheckboxStates || {}));
                this.logAuth(`  - Journal V2 sauvegardé: ${data.journal.travelJournal.length} voyages`);
            } else if (data.journal.journal) {
                localStorage.setItem('adventureJournal', JSON.stringify(data.journal.journal));
                localStorage.setItem('adventureObjectives', JSON.stringify(data.journal.objectives || []));
                localStorage.setItem('adventureRumors', JSON.stringify(data.journal.rumors || []));
                localStorage.setItem('rumorsCheckboxStates', JSON.stringify(data.journal.rumorsCheckboxStates || {}));
                this.logAuth(`  - Journal sauvegardé (texte seul)`);
            } else {
                localStorage.setItem('adventureJournal', JSON.stringify(data.journal));
                this.logAuth(`  - Journal Legacy sauvegardé`);
            }
        }
        if (data.position) {
            localStorage.setItem('adventurers_position', JSON.stringify(data.position));
            // Le flag 'adventurers_position_from_cloud' est géré par applyContextData et handleSyncConflict
        }
        if (data.filters) {
            // Sauvegarder les filtres actuels dans localStorage
            localStorage.setItem('activeFilters', JSON.stringify(data.filters));
            this.logAuth("  - Filtres sauvegardés dans localStorage.");
        }

        // Ajout pour la nouvelle fonctionnalité Personnages
        if (data.characters) {
            localStorage.setItem('middleEarthCharacters', JSON.stringify(data.characters));
            this.logAuth(`  - ${data.characters.characters?.length || 0} personnages sauvegardés dans localStorage.`);
            // Synchroniser immédiatement avec les variables globales si CharactersManager existe
            if (window.charactersManager) {
                // Assurez-vous que la structure correspond à ce que CharactersManager attend
                window.charactersManager.charactersData = data.characters;
                this.logAuth("✅ CharactersManager.charactersData mis à jour.");
            }
        }

        // Sauvegarder le mode aventure
        if (data.adventureMode !== undefined) {
            localStorage.setItem('adventurers_adventure_mode', data.adventureMode.toString());
            this.logAuth(`  - Mode aventure (${data.adventureMode}) sauvegardé dans localStorage.`);
        }

        // Sauvegarder les compteurs
        if (data.counters) {
            localStorage.setItem('customCounters', JSON.stringify(data.counters));
            this.logAuth(`  - ${data.counters.length} compteurs sauvegardés dans localStorage.`);
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
        this.logAuth("🔍 Ouverture du debug des données cloud");

        const envPrefix = await this.getEnvironmentPrefix(); // Assurer que envPrefix est chargé
        try {
            // Récupérer les données de debug
            const response = await fetch(`/api/user/data/debug?env=${envPrefix}`, { // Utiliser envPrefix
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const debugData = await response.json();

            // Récupérer le statut d'Object Storage
            const storageResponse = await fetch('/api/storage/status', {
                method: 'GET',
                credentials: 'include'
            });

            let storageStatus = null;
            if (storageResponse.ok) {
                storageStatus = await storageResponse.json();
            }

            // Analyser les doublons
            const duplicatesAnalysis = this.analyzeDuplicates(debugData.full_data);

            // Afficher dans la console
            console.log("=== DEBUG DONNÉES CLOUD ===");
            console.log("Environnement actuel:", envPrefix === 'dev_' ? 'DEVELOPMENT' : 'PRODUCTION', `(${envPrefix})`);
            console.log("Environnement des données:", debugData.full_data?._environment || 'non spécifié');
            console.log("Status:", debugData.status);
            console.log("User ID:", debugData.user_id);
            console.log("Record ID:", debugData.record_id);
            console.log("Created:", debugData.created_at);
            console.log("Updated:", debugData.updated_at);
            console.log("Summary:", debugData.data_summary);
            console.log("Duplicates:", duplicatesAnalysis);
            console.log("Full Data:", debugData.full_data);
            console.log("Raw JSON Size:", debugData.raw_json_size, "bytes");
            console.log("=========================");

            // Créer une modale pour afficher les données brutes
            const currentEnv = envPrefix === 'dev_' ? 'DEVELOPMENT' : 'PRODUCTION';
            const dataEnv = debugData.full_data?._environment;
            const dataEnvLabel = dataEnv === 'dev_' ? 'DEVELOPMENT' : dataEnv === 'prod_' ? 'PRODUCTION' : 'non spécifié';
            const envMatch = !dataEnv || dataEnv === envPrefix;

            // Préparer les infos Object Storage
            const storageInfo = storageStatus ? `
                <div class="mb-4 p-3 rounded ${storageStatus.using_object_storage ? 'bg-blue-900/20 border border-blue-500' : 'bg-yellow-900/20 border border-yellow-500'}">
                    <div class="font-bold ${storageStatus.using_object_storage ? 'text-blue-400' : 'text-yellow-400'} mb-2">
                        ${storageStatus.using_object_storage ? '☁️ Object Storage ACTIF' : '📁 Stockage local ACTIF'}
                    </div>
                    <div class="text-sm text-gray-300 grid grid-cols-2 gap-2">
                        <div>📦 Bucket: ${storageStatus.bucket_name || 'N/A'}</div>
                        <div>🔌 Statut: ${storageStatus.message}</div>
                    </div>
                </div>
            ` : '';

            // Compter le nombre de cartes
            const mapsCount = debugData.data_summary?.maps_count ||
                            debugData.full_data?.settings?.availableMaps?.length || 0;

            // Préparer les infos de doublons
            const hasDuplicates = duplicatesAnalysis.locations.duplicates > 0 || duplicatesAnalysis.regions.duplicates > 0;
            const duplicatesInfo = hasDuplicates ? `
                <div class="mb-4 p-3 rounded bg-red-900/20 border border-red-500">
                    <div class="font-bold text-red-400 mb-2">
                        ⚠️ DOUBLONS DÉTECTÉS
                    </div>
                    <div class="text-sm text-gray-300 grid grid-cols-2 gap-2 mb-2">
                        <div>🗺️ Lieux dupliqués: ${duplicatesAnalysis.locations.duplicates}</div>
                        <div>🌍 Régions dupliquées: ${duplicatesAnalysis.regions.duplicates}</div>
                    </div>
                    <button id="view-duplicates-btn" class="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm">
                        <i class="fas fa-eye mr-1"></i>Voir les doublons
                    </button>
                </div>
            ` : `
                <div class="mb-4 p-3 rounded bg-green-900/20 border border-green-500">
                    <div class="font-bold text-green-400 mb-2">
                        ✅ Aucun doublon détecté
                    </div>
                </div>
            `;

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]';
            modal.innerHTML = `
                <div class="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-white">📊 Données Cloud Brutes</h3>
                        <button class="text-gray-400 hover:text-white text-2xl" onclick="this.closest('.fixed').remove()">×</button>
                    </div>

                    ${storageInfo}

                    ${duplicatesInfo}

                    <div class="mb-4 p-3 rounded ${envMatch ? 'bg-green-900/20 border border-green-500' : 'bg-red-900/20 border border-red-500'}">
                        <div class="font-bold ${envMatch ? 'text-green-400' : 'text-red-400'} mb-2">
                            ${envMatch ? '✅ Environnements cohérents' : '⚠️ INCOHÉRENCE DÉTECTÉE'}
                        </div>
                        <div class="text-sm text-gray-300 grid grid-cols-2 gap-2">
                            <div>🌍 Environnement actuel: <span class="font-bold">${currentEnv}</span> (${envPrefix})</div>
                            <div>💾 Environnement des données: <span class="font-bold">${dataEnvLabel}</span> ${dataEnv ? `(${dataEnv})` : ''}</div>
                        </div>
                        ${debugData.full_data?._saved_at ? `<div class="text-xs text-gray-400 mt-2">Sauvegardé le: ${new Date(debugData.full_data._saved_at).toLocaleString()}</div>` : ''}
                        ${debugData.full_data?._migrated_from ? `<div class="text-xs text-yellow-400 mt-1">⚠️ Migré depuis: ${debugData.full_data._migrated_from === 'dev_' ? 'DEVELOPMENT' : 'PRODUCTION'} le ${new Date(debugData.full_data._migrated_at).toLocaleString()}</div>` : ''}
                    </div>

                    <div class="mb-4 text-sm text-gray-300 grid grid-cols-2 gap-2">
                        <div>📍 Lieux: ${debugData.data_summary.locations_count}</div>
                        <div>🗺️ Régions: ${debugData.data_summary.regions_count}</div>
                        <div>👥 Personnages: ${debugData.data_summary.characters_count || 0}</div>
                        <div>🗾 Cartes: ${mapsCount}</div>
                        <div>📅 Calendrier: ${debugData.data_summary.has_calendar ? 'Oui' : 'Non'}</div>
                        <div>💾 Taille: ${(debugData.raw_json_size / 1024).toFixed(2)} KB</div>
                    </div>

                    <div class="flex-1 overflow-auto bg-gray-900 rounded p-4" id="cloud-json-display">
                        <pre class="text-xs text-green-400 whitespace-pre-wrap font-mono">${this.escapeHtml(debugData.raw_json_text || JSON.stringify(debugData.full_data, null, 2))}</pre>
                    </div>

                    <div class="mt-4 flex gap-2">
                        <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onclick="(function(btn) { const preEl = document.querySelector('#cloud-json-display pre'); const jsonText = preEl.textContent; navigator.clipboard.writeText(jsonText).then(() => alert('✅ JSON complet copié (' + Math.round(jsonText.length / 1024) + ' KB)'), () => alert('❌ Erreur lors de la copie')); })(this);">
                            📋 Copier
                        </button>
                        <button class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700" onclick="this.closest('.fixed').remove()">
                            Fermer
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Ajouter l'événement pour le bouton de visualisation des doublons
            const viewDuplicatesBtn = modal.querySelector('#view-duplicates-btn');
            if (viewDuplicatesBtn) {
                viewDuplicatesBtn.addEventListener('click', () => {
                    this.showDuplicatesModal(duplicatesAnalysis);
                });
            }

        } catch (error) {
            this.logAuth(`❌ Erreur debug cloud: ${error.message}`);
            alert(`Erreur lors du debug: ${error.message}`);
        }
    }

    showDuplicatesModal(duplicatesAnalysis) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[110]';

        let duplicatesContent = '<div class="space-y-4">';

        // Section Lieux
        if (duplicatesAnalysis.locations.duplicatedItems.length > 0) {
            duplicatesContent += `
                <div class="bg-red-900/20 border border-red-500 rounded p-4">
                    <h4 class="text-red-400 font-bold mb-3">
                        🗺️ Lieux dupliqués (${duplicatesAnalysis.locations.duplicates} doublons)
                    </h4>
                    <div class="space-y-3">
            `;

            duplicatesAnalysis.locations.duplicatedItems.forEach(dup => {
                duplicatesContent += `
                    <div class="bg-gray-900 rounded p-3">
                        <div class="flex items-center justify-between mb-2">
                            <span class="font-bold text-white">${this.escapeHtml(dup.name)}</span>
                            <span class="text-xs bg-red-600 px-2 py-1 rounded">${dup.count}x</span>
                        </div>
                        <div class="text-xs text-gray-400 mb-2">ID: ${dup.id}</div>
                        <details class="text-sm">
                            <summary class="cursor-pointer text-blue-400 hover:text-blue-300">Voir les ${dup.count} occurrences</summary>
                            <div class="mt-2 space-y-2 pl-4">
                `;

                dup.items.forEach((item, index) => {
                    duplicatesContent += `
                        <div class="bg-gray-800 rounded p-2 border-l-2 ${index === 0 ? 'border-green-500' : 'border-red-500'}">
                            <div class="text-xs text-gray-500 mb-1">${index === 0 ? '✓ Original' : '⚠️ Doublon #' + index}</div>
                            <div class="text-xs">MapId: ${item.mapId || 'non défini'}</div>
                            <div class="text-xs">Coords: (${item.coordinates?.x || 'N/A'}, ${item.coordinates?.y || 'N/A'})</div>
                            <div class="text-xs">Connu: ${item.known ? 'Oui' : 'Non'} | Visité: ${item.visited ? 'Oui' : 'Non'}</div>
                        </div>
                    `;
                });

                duplicatesContent += `
                            </div>
                        </details>
                    </div>
                `;
            });

            duplicatesContent += '</div></div>';
        }

        // Section Régions
        if (duplicatesAnalysis.regions.duplicatedItems.length > 0) {
            duplicatesContent += `
                <div class="bg-orange-900/20 border border-orange-500 rounded p-4">
                    <h4 class="text-orange-400 font-bold mb-3">
                        🌍 Régions dupliquées (${duplicatesAnalysis.regions.duplicates} doublons)
                    </h4>
                    <div class="space-y-3">
            `;

            duplicatesAnalysis.regions.duplicatedItems.forEach(dup => {
                duplicatesContent += `
                    <div class="bg-gray-900 rounded p-3">
                        <div class="flex items-center justify-between mb-2">
                            <span class="font-bold text-white">${this.escapeHtml(dup.name)}</span>
                            <span class="text-xs bg-orange-600 px-2 py-1 rounded">${dup.count}x</span>
                        </div>
                        <div class="text-xs text-gray-400 mb-2">ID: ${dup.id}</div>
                        <details class="text-sm">
                            <summary class="cursor-pointer text-blue-400 hover:text-blue-300">Voir les ${dup.count} occurrences</summary>
                            <div class="mt-2 space-y-2 pl-4">
                `;

                dup.items.forEach((item, index) => {
                    duplicatesContent += `
                        <div class="bg-gray-800 rounded p-2 border-l-2 ${index === 0 ? 'border-green-500' : 'border-orange-500'}">
                            <div class="text-xs text-gray-500 mb-1">${index === 0 ? '✓ Original' : '⚠️ Doublon #' + index}</div>
                            <div class="text-xs">MapId: ${item.mapId || 'non défini'}</div>
                            <div class="text-xs">Points: ${item.points?.length || 0}</div>
                        </div>
                    `;
                });

                duplicatesContent += `
                            </div>
                        </details>
                    </div>
                `;
            });

            duplicatesContent += '</div></div>';
        }

        duplicatesContent += '</div>';

        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-white">🔍 Analyse des Doublons</h3>
                    <button class="close-duplicates-modal text-gray-400 hover:text-white text-2xl">×</button>
                </div>

                <div class="flex-1 overflow-auto">
                    ${duplicatesContent}
                </div>

                <div class="mt-4 pt-4 border-t border-gray-700 flex justify-end">
                    <button class="close-duplicates-modal px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg">
                        Fermer
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Ajouter les événements de fermeture
        modal.querySelectorAll('.close-duplicates-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    analyzeDuplicates(data) {
        const result = {
            locations: {
                total: 0,
                duplicates: 0,
                duplicatedItems: []
            },
            regions: {
                total: 0,
                duplicates: 0,
                duplicatedItems: []
            }
        };

        // Analyser les lieux
        if (data?.locations?.locations) {
            const locations = data.locations.locations;
            result.locations.total = locations.length;

            const idCount = {};
            locations.forEach(loc => {
                if (loc.id) {
                    idCount[loc.id] = (idCount[loc.id] || 0) + 1;
                }
            });

            Object.entries(idCount).forEach(([id, count]) => {
                if (count > 1) {
                    result.locations.duplicates += count - 1;
                    const duplicatedLocs = locations.filter(loc => loc.id === id);
                    result.locations.duplicatedItems.push({
                        id: id,
                        name: duplicatedLocs[0]?.name || 'Inconnu',
                        count: count,
                        items: duplicatedLocs
                    });
                }
            });
        }

        // Analyser les régions
        if (data?.regions?.regions) {
            const regions = data.regions.regions;
            result.regions.total = regions.length;

            const idCount = {};
            regions.forEach(reg => {
                if (reg.id) {
                    idCount[reg.id] = (idCount[reg.id] || 0) + 1;
                }
            });

            Object.entries(idCount).forEach(([id, count]) => {
                if (count > 1) {
                    result.regions.duplicates += count - 1;
                    const duplicatedRegs = regions.filter(reg => reg.id === id);
                    result.regions.duplicatedItems.push({
                        id: id,
                        name: duplicatedRegs[0]?.name || 'Inconnu',
                        count: count,
                        items: duplicatedRegs
                    });
                }
            });
        }

        return result;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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