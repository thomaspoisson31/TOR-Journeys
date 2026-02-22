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

    async createCampaign(name) {
        try {
            const response = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
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

    async deleteCampaign(id) {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette campagne ? Cette action est irréversible.")) {
            return false;
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
            <div class="bg-gray-800 rounded-lg p-8 max-w-4xl w-full mx-4 shadow-2xl border border-gray-700">
                <div class="flex justify-between items-center mb-8">
                    <h2 class="text-3xl font-bold text-white font-serif">
                        <i class="fas fa-dungeon mr-3 text-yellow-500"></i>Vos Aventures
                    </h2>
                    <div class="text-sm text-gray-400">
                        <i class="fas fa-user-circle mr-1"></i> <span id="campaign-user-name">Joueur</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <!-- Colonne Gauche: Campagnes -->
                    <div class="bg-gray-900 rounded-lg p-6 border border-gray-700">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold text-white">Campagnes en cours</h3>
                            <button id="new-campaign-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                <i class="fas fa-plus mr-1"></i>Nouvelle
                            </button>
                        </div>

                        <div id="campaigns-list" class="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            <!-- Liste générée dynamiquement -->
                            <div class="text-center py-8 text-gray-500">Chargement...</div>
                        </div>
                    </div>

                    <!-- Colonne Droite: Options Avancées -->
                    <div class="flex flex-col space-y-6">
                        <div class="bg-gray-900 rounded-lg p-6 border border-gray-700">
                            <h3 class="text-xl font-bold text-white mb-4">
                                <i class="fas fa-edit mr-2 text-purple-400"></i>Mode Gardien
                            </h3>
                            <p class="text-gray-400 text-sm mb-4">
                                Modifiez le "Monde de Base". Les changements ici affecteront toutes les nouvelles campagnes, mais pas celles déjà créées.
                            </p>
                            <button id="edit-base-world-btn" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center">
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
                                <p>• Les lieux découverts dans une campagne restent cachés dans les autres.</p>
                            </div>
                        </div>

                        <div class="mt-auto">
                             <button id="logout-campaign-btn" class="w-full bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 py-2 px-4 rounded transition-colors text-sm">
                                <i class="fas fa-sign-out-alt mr-2"></i>Déconnexion
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal de création -->
            <div id="new-campaign-modal" class="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center hidden z-[110]">
                <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-600">
                    <h3 class="text-xl font-bold text-white mb-4">Nouvelle Campagne</h3>
                    <input type="text" id="new-campaign-name" placeholder="Nom de la campagne" class="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white mb-4 focus:ring-2 focus:ring-blue-500 outline-none">
                    <div class="flex justify-end space-x-3">
                        <button id="cancel-new-campaign" class="px-4 py-2 text-gray-400 hover:text-white">Annuler</button>
                        <button id="confirm-new-campaign" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Créer</button>
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
        document.getElementById('new-campaign-btn').addEventListener('click', () => {
            document.getElementById('new-campaign-modal').classList.remove('hidden');
            document.getElementById('new-campaign-name').focus();
        });

        document.getElementById('cancel-new-campaign').addEventListener('click', () => {
            document.getElementById('new-campaign-modal').classList.add('hidden');
        });

        document.getElementById('confirm-new-campaign').addEventListener('click', async () => {
            const name = document.getElementById('new-campaign-name').value;
            if (name) {
                await this.createCampaign(name);
                document.getElementById('new-campaign-modal').classList.add('hidden');
                document.getElementById('new-campaign-name').value = '';
                this.renderSelector();
            }
        });

        document.getElementById('edit-base-world-btn').addEventListener('click', () => {
            this.enterBaseEditor();
        });

        document.getElementById('logout-campaign-btn').addEventListener('click', () => {
             window.location.href = '/auth/logout';
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
                <div class="text-center py-8 text-gray-500 italic">
                    Aucune campagne active.<br>Commencez une nouvelle aventure !
                </div>
            `;
            return;
        }

        this.container.innerHTML = this.campaigns.map(campaign => `
            <div class="bg-gray-800 hover:bg-gray-750 p-4 rounded-lg border border-gray-700 flex justify-between items-center group transition-colors">
                <div class="cursor-pointer flex-grow" onclick="window.campaignManager.selectCampaign('${campaign.id}')">
                    <h4 class="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">${campaign.name}</h4>
                    <div class="text-xs text-gray-500 mt-1">
                        <i class="far fa-clock mr-1"></i>Dernière partie : ${new Date(campaign.last_played).toLocaleDateString()}
                    </div>
                </div>
                <button class="text-gray-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onclick="window.campaignManager.deleteCampaign('${campaign.id}')" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
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

    async enterBaseEditor() {
        if (this.modal) this.modal.classList.add('hidden');

        if (window.authManager) {
            await window.authManager.loadGameContext('base', null, 'Monde de Base (Édition)');
        }
    }
}

// Export pour utilisation module
export default CampaignManager;
