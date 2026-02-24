class CampaignManager {
    constructor() {
        this.campaigns = [];
        this.modal = null;
        this.container = null;
    }

    async fetchCampaigns() {
        try {
            const response = await fetch('/api/campaigns');
            if (response.ok) {
                const data = await response.json();
                this.campaigns = data.campaigns || [];
                return this.campaigns;
            }
        } catch (e) {
            console.error("Erreur récupération campagnes:", e);
        }
        return [];
    }

    async createCampaign(name, initialData = null) {
        try {
            const body = { name };
            if (initialData) {
                body.initial_data = initialData;
            }

            const response = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    await this.fetchCampaigns(); // Rafraîchir la liste
                    return data.campaign;
                }
            }
        } catch (e) {
            console.error("Erreur création campagne:", e);
        }
        return null;
    }

    async renameCampaign(id, newName) {
        try {
            const response = await fetch(`/api/campaigns/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });
            if (response.ok) {
                await this.fetchCampaigns();
                this.renderSelector();

                // Si c'est la campagne active, mettre à jour l'affichage
                if (window.authManager && window.authManager.currentCampaignId === id) {
                     window.authManager.loadGameContext('campaign', id, newName);
                }
                return true;
            }
        } catch (e) {
            console.error("Erreur rename campagne:", e);
        }
        return false;
    }

    async deleteCampaign(id) {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette campagne ? Cette action est irréversible.")) {
            return false;
        }

        // Si c'est la campagne active, avertir ou empêcher (optionnel, mais mieux vaut être prudent)
        if (window.authManager && window.authManager.currentCampaignId === id) {
            if(!confirm("C'est la campagne actuellement chargée. Vous allez être redirigé vers le menu principal.")) {
                return false;
            }
            window.location.reload(); // Simple reload to clear context
            return;
        }

        try {
            const response = await fetch(`/api/campaigns/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await this.fetchCampaigns(); // Rafraîchir la liste
                this.renderSelector(); // Rafraîchir l'interface
                return true;
            }
        } catch (e) {
            console.error("Erreur suppression campagne:", e);
        }
        return false;
    }

    async showSelector() {
        await this.fetchCampaigns();

        // Créer ou afficher la modale
        if (!this.modal) {
            this.injectModal();
        }

        this.renderSelector();
        this.modal.classList.remove('hidden');
    }

    injectModal() {
        const modalHtml = `
        <div id="campaign-modal" class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100] hidden">
            <div class="bg-gray-800 rounded-lg p-8 max-w-5xl w-full mx-4 shadow-2xl border border-gray-700 h-[80vh] flex flex-col">
                <div class="flex justify-between items-center mb-6 flex-shrink-0">
                    <h2 class="text-3xl font-bold text-white font-serif">
                        <i class="fas fa-dungeon mr-3 text-yellow-500"></i>Vos Aventures
                    </h2>
                    <div class="flex items-center space-x-4">
                        <div class="text-sm text-gray-400">
                            <i class="fas fa-user-circle mr-1"></i> <span id="campaign-user-name">Joueur</span>
                        </div>
                        <button id="close-campaign-modal" class="text-gray-400 hover:text-white">
                            <i class="fas fa-times fa-lg"></i>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8 flex-grow overflow-hidden">
                    <!-- Colonne Gauche: Liste des Campagnes -->
                    <div class="md:col-span-2 bg-gray-900 rounded-lg p-6 border border-gray-700 flex flex-col h-full">
                        <div class="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 class="text-xl font-bold text-white">Campagnes en cours</h3>
                            <button id="open-new-campaign-modal-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors font-bold shadow-lg">
                                <i class="fas fa-plus mr-2"></i>Créer une campagne
                            </button>
                        </div>

                        <div id="campaigns-list" class="space-y-3 overflow-y-auto flex-grow pr-2">
                            <!-- Liste générée dynamiquement -->
                            <div class="text-center py-8 text-gray-500">Chargement...</div>
                        </div>
                    </div>

                    <!-- Colonne Droite: Options & Info -->
                    <div class="flex flex-col space-y-6 h-full">
                        <div class="bg-gray-900 rounded-lg p-6 border border-gray-700">
                            <h3 class="text-xl font-bold text-white mb-4">
                                <i class="fas fa-edit mr-2 text-purple-400"></i>Mode Gardien
                            </h3>
                            <p class="text-gray-400 text-sm mb-4">
                                Modifiez le "Monde de Base". Les changements ici affecteront toutes les nouvelles campagnes, mais pas celles déjà créées.
                            </p>
                            <button id="edit-base-world-btn" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center shadow-lg">
                                <i class="fas fa-globe mr-2"></i>Éditer le Monde de Base
                            </button>
                        </div>

                        <div class="bg-gray-900 rounded-lg p-6 border border-gray-700 flex-grow">
                            <h3 class="text-xl font-bold text-white mb-4">
                                <i class="fas fa-info-circle mr-2 text-blue-400"></i>Informations
                            </h3>
                            <div class="text-gray-400 text-sm space-y-2">
                                <p>• Chaque campagne est indépendante.</p>
                                <p>• Le temps, le journal et la position sont sauvegardés par campagne.</p>
                                <p>• Vous pouvez cloner l'état actuel pour démarrer une nouvelle branche narrative ("What If...").</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal de création (Overlay) -->
            <div id="new-campaign-modal" class="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center hidden z-[110]">
                <div class="bg-gray-800 rounded-lg p-8 max-w-lg w-full border border-gray-600 shadow-2xl">
                    <h3 class="text-2xl font-bold text-white mb-6">Nouvelle Campagne</h3>

                    <div class="mb-6">
                        <label class="block text-gray-400 text-sm font-bold mb-2" for="new-campaign-name">Nom de la Campagne</label>
                        <input type="text" id="new-campaign-name" placeholder="Ex: La Communauté de l'Anneau" class="w-full bg-gray-700 border border-gray-600 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none text-lg">
                    </div>

                    <div class="space-y-4 mb-8">
                        <h4 class="text-gray-300 font-semibold mb-2">Point de départ :</h4>

                        <label class="flex items-start p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-650 transition-colors border border-gray-600">
                            <input type="radio" name="campaign-source" value="empty" checked class="mt-1 mr-3 text-blue-600 w-4 h-4">
                            <div>
                                <span class="text-white font-bold block">Nouvelle Campagne</span>
                                <span class="text-gray-400 text-sm">Commencer à zéro (Monde de Base par défaut).</span>
                            </div>
                        </label>

                        <label class="flex items-start p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-650 transition-colors border border-gray-600">
                            <input type="radio" name="campaign-source" value="current" class="mt-1 mr-3 text-blue-600 w-4 h-4">
                            <div>
                                <span class="text-white font-bold block">Utiliser le contexte actuel</span>
                                <span class="text-gray-400 text-sm">Cloner l'état actuel (Position, Journal, Brouillard de guerre...) pour continuer sous un autre nom.</span>
                            </div>
                        </label>
                    </div>

                    <div class="flex justify-end space-x-4">
                        <button id="cancel-new-campaign" class="px-5 py-2 text-gray-400 hover:text-white font-medium">Annuler</button>
                        <button id="confirm-new-campaign" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-lg transform hover:scale-105 transition-all">
                            Créer l'aventure
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;

        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
        this.modal = document.getElementById('campaign-modal');
        this.container = document.getElementById('campaigns-list');

        // Event Listeners
        document.getElementById('close-campaign-modal').addEventListener('click', () => {
            this.modal.classList.add('hidden');
        });

        document.getElementById('open-new-campaign-modal-btn').addEventListener('click', () => {
            document.getElementById('new-campaign-modal').classList.remove('hidden');
            document.getElementById('new-campaign-name').value = '';
            document.querySelector('input[name="campaign-source"][value="empty"]').checked = true;
            document.getElementById('new-campaign-name').focus();
        });

        document.getElementById('cancel-new-campaign').addEventListener('click', () => {
            document.getElementById('new-campaign-modal').classList.add('hidden');
        });

        document.getElementById('confirm-new-campaign').addEventListener('click', async () => {
            const name = document.getElementById('new-campaign-name').value;
            const source = document.querySelector('input[name="campaign-source"]:checked').value;

            if (name) {
                let initialData = null;

                if (source === 'current' && window.authManager) {
                    // Collecter le contexte actuel pour le clonage
                    initialData = window.authManager.collectCurrentContextData();
                    console.log("Clonage du contexte actuel:", initialData);
                }

                await this.createCampaign(name, initialData);
                document.getElementById('new-campaign-modal').classList.add('hidden');
                this.renderSelector();
            } else {
                alert("Veuillez donner un nom à la campagne.");
            }
        });

        document.getElementById('edit-base-world-btn').addEventListener('click', () => {
            this.enterBaseEditor();
        });

        // Set user name if available
        if (window.authManager && window.authManager.currentUser) {
            const nameEl = document.getElementById('campaign-user-name');
            if (nameEl) nameEl.textContent = window.authManager.currentUser.name;
        }
    }

    renderSelector() {
        if (!this.container) return;

        if (this.campaigns.length === 0) {
            this.container.innerHTML = `
                <div class="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700 border-dashed">
                    <i class="fas fa-scroll text-4xl text-gray-600 mb-4"></i>
                    <p class="text-gray-400 italic mb-4">Aucune campagne active.</p>
                    <p class="text-gray-500 text-sm">Commencez une nouvelle aventure ou éditez le monde de base.</p>
                </div>
            `;
            return;
        }

        this.container.innerHTML = this.campaigns.map(campaign => `
            <div class="bg-gray-800 hover:bg-gray-750 p-4 rounded-lg border border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center group transition-colors shadow-sm hover:shadow-md mb-2">
                <div class="flex-grow mb-2 sm:mb-0">
                    <h4 class="font-bold text-lg text-white group-hover:text-blue-400 transition-colors flex items-center">
                        ${campaign.name}
                        ${window.authManager && window.authManager.currentCampaignId === campaign.id ?
                          '<span class="ml-2 px-2 py-0.5 bg-green-900 text-green-300 text-xs rounded-full border border-green-700">Active</span>' : ''}
                    </h4>
                    <div class="text-xs text-gray-500 mt-1 flex items-center">
                        <i class="far fa-clock mr-1"></i>Dernière partie : ${new Date(campaign.last_played).toLocaleDateString()} à ${new Date(campaign.last_played).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>

                <div class="flex space-x-2 w-full sm:w-auto">
                    <button class="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm transition-colors font-medium shadow"
                            onclick="window.campaignManager.selectCampaign('${campaign.id}')">
                        <i class="fas fa-play mr-1"></i>Jouer
                    </button>

                    <button class="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-3 py-1.5 rounded text-sm transition-colors"
                            onclick="window.campaignManager.promptRename('${campaign.id}', '${campaign.name.replace(/'/g, "\\'")}')" title="Renommer">
                        <i class="fas fa-pen"></i>
                    </button>

                    <button class="bg-gray-700 hover:bg-red-900 text-gray-300 hover:text-red-200 px-3 py-1.5 rounded text-sm transition-colors"
                            onclick="window.campaignManager.deleteCampaign('${campaign.id}')" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async selectCampaign(id) {
        if (this.modal) this.modal.classList.add('hidden');

        const campaign = this.campaigns.find(c => c.id === id);
        if (window.authManager) {
            await window.authManager.loadGameContext('campaign', id, campaign ? campaign.name : 'Campagne');
        }
    }

    promptRename(id, currentName) {
        const newName = prompt("Nouveau nom pour la campagne :", currentName);
        if (newName && newName !== currentName) {
            this.renameCampaign(id, newName);
        }
    }

    async enterBaseEditor() {
        if (this.modal) this.modal.classList.add('hidden');

        if (window.authManager) {
            await window.authManager.loadGameContext('base', null, 'Monde de Base (Édition)');
        }
    }
}

// Export pour utilisation module
export default CampaignManager;
