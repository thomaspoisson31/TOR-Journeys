
class RandomTablesManager {
    constructor() {
        this.modal = null;
        this.contentDiv = null;
        this.checkedResults = {}; // {hash: boolean}
    }

    init() {
        console.log("🎲 Initializing RandomTablesManager...");
        this.modal = document.getElementById('random-tables-modal');
        this.contentDiv = document.getElementById('random-tables-content');
        this.loadCheckedResults();
        this.setupEventListeners();
        console.log("✅ RandomTablesManager initialized");
    }

    loadCheckedResults() {
        const saved = localStorage.getItem('randomTablesCheckedResults');
        if (saved) {
            try {
                this.checkedResults = JSON.parse(saved);
                console.log("✅ États des cases à cocher chargés:", Object.keys(this.checkedResults).length);
            } catch (e) {
                console.error("❌ Erreur chargement états cases:", e);
                this.checkedResults = {};
            }
        }
    }

    saveCheckedResults() {
        localStorage.setItem('randomTablesCheckedResults', JSON.stringify(this.checkedResults));
        
        // Marquer comme non sauvegardé pour sync cloud
        if (window.authManager && window.authManager.isAuthenticated) {
            window.authManager.markAsUnsaved();
        }
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }
    }

    generateResultHash(tableName, resultContent) {
        // Créer un hash simple basé sur le nom de la table et le contenu
        const str = `${tableName}::${resultContent}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `result_${Math.abs(hash)}`;
    }

    setupEventListeners() {
        // Bouton principal
        const randomRollBtn = document.getElementById('random-roll-btn');
        if (randomRollBtn) {
            randomRollBtn.addEventListener('click', () => this.openModal());
        }

        // Bouton fermer
        const closeBtn = document.getElementById('close-random-tables-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Fermer en cliquant à l'extérieur
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }
    }

    openModal() {
        if (!this.modal || !this.contentDiv) return;

        console.log("🎲 Ouverture de la modale Tables Aléatoires");
        
        // Récupérer toutes les tables disponibles
        const allTables = this.collectAllTables();
        
        // Générer le contenu
        this.renderTables(allTables);
        
        // Afficher la modale
        this.modal.classList.remove('hidden');
    }

    closeModal() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
    }

    collectAllTables() {
        const tables = {
            settings: [],
            position: {
                locations: [],
                regions: []
            }
        };

        // 1. Tables des paramètres
        if (window.adventureManager && window.adventureManager.randomTables) {
            tables.settings = window.adventureManager.randomTables.map(table => ({
                ...table,
                source: 'Paramètres',
                sourceType: 'settings'
            }));
        }

        // 2. Vérifier la position des aventuriers
        if (window.positionManager && window.positionManager.currentPosition) {
            const position = window.positionManager.currentPosition;

            // Trouver les lieux à proximité
            const PROXIMITY_THRESHOLD = 100;
            if (window.locationsData && window.locationsData.locations) {
                const activeMapId = window.settingsManager?.activeMapUrl;

                window.locationsData.locations.forEach(location => {
                    if (location.coordinates && (!location.mapId || location.mapId === activeMapId)) {
                        const dx = location.coordinates.x - position.x;
                        const dy = location.coordinates.y - position.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance <= PROXIMITY_THRESHOLD) {
                            // Ce lieu est à proximité
                            if (location.RandomTables && Array.isArray(location.RandomTables) && location.RandomTables.length > 0) {
                                location.RandomTables.forEach(table => {
                                    tables.position.locations.push({
                                        ...table,
                                        source: location.name,
                                        sourceType: 'location',
                                        locationData: location
                                    });
                                });
                            }
                        }
                    }
                });
            }

            // Trouver les régions traversées
            if (window.regionsData && window.regionsData.regions) {
                const activeMapId = window.settingsManager?.activeMapUrl;

                window.regionsData.regions.forEach(region => {
                    let points = [];
                    if (region.points && Array.isArray(region.points)) {
                        points = region.points;
                    } else if (region.coordinates?.points && Array.isArray(region.coordinates.points)) {
                        points = region.coordinates.points;
                    } else if (Array.isArray(region.coordinates)) {
                        points = region.coordinates;
                    }

                    if (points.length >= 3 && (!region.mapId || region.mapId === activeMapId)) {
                        if (this.isPointInPolygon(position, points)) {
                            // Le marqueur est dans cette région
                            if (region.RandomTables && Array.isArray(region.RandomTables) && region.RandomTables.length > 0) {
                                region.RandomTables.forEach(table => {
                                    tables.position.regions.push({
                                        ...table,
                                        source: region.name,
                                        sourceType: 'region',
                                        regionData: region
                                    });
                                });
                            }
                        }
                    }
                });
            }
        }

        console.log("🎲 Tables collectées:", tables);
        return tables;
    }

    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    renderTables(allTables) {
        if (!this.contentDiv) return;

        let html = '';

        // Section 1: Tables des Paramètres
        if (allTables.settings.length > 0) {
            html += `
                <div class="mb-6">
                    <h4 class="text-lg font-semibold mb-3" style="color: #940000;">
                        <i class="fas fa-cog mr-2"></i>Tables Globales
                    </h4>
                    ${this.renderTablesList(allTables.settings)}
                </div>
            `;
        }

        // Section 2: Tables des Régions
        if (allTables.position.regions.length > 0) {
            html += `
                <div class="mb-6">
                    <h4 class="text-lg font-semibold mb-3" style="color: #940000;">
                        <i class="fas fa-draw-polygon mr-2"></i>Région Actuelle
                    </h4>
                    ${this.renderTablesList(allTables.position.regions)}
                </div>
            `;
        }

        // Section 3: Tables des Lieux
        if (allTables.position.locations.length > 0) {
            html += `
                <div class="mb-6">
                    <h4 class="text-lg font-semibold mb-3" style="color: #940000;">
                        <i class="fas fa-map-marker-alt mr-2"></i>Lieux à Proximité
                    </h4>
                    ${this.renderTablesList(allTables.position.locations)}
                </div>
            `;
        }

        // Message si aucune table
        if (allTables.settings.length === 0 && allTables.position.regions.length === 0 && allTables.position.locations.length === 0) {
            html = `
                <div class="text-center py-12 text-gray-500">
                    <i class="fas fa-dice fa-3x mb-4"></i>
                    <p class="text-lg">Aucune table aléatoire disponible</p>
                    <p class="text-sm mt-2">Ajoutez des tables dans les Paramètres ou associez-les à des lieux/régions</p>
                </div>
            `;
        }

        this.contentDiv.innerHTML = html;

        // Nettoyer les anciens listeners avant d'en ajouter de nouveaux
        if (this.contentDiv._clickListener) {
            this.contentDiv.removeEventListener('click', this.contentDiv._clickListener);
        }

        // Ajouter l'event delegation pour les boutons de tirage
        const clickListener = (e) => {
            const rollBtn = e.target.closest('.roll-table-btn');
            if (rollBtn) {
                const tableData = JSON.parse(rollBtn.dataset.table);
                this.rollOnTable(tableData);
            }
        };

        this.contentDiv._clickListener = clickListener;
        this.contentDiv.addEventListener('click', clickListener);
    }

    renderTablesList(tables) {
        return tables.map((table, index) => {
            const isComposite = table.isComposite || false;
            const tableType = isComposite ? 'Composite' : 'Simple';
            const tableIcon = isComposite ? 'fa-layer-group' : 'fa-list';

            return `
                <div class="mb-4 p-3 rounded-lg border border-gray-300" style="background-color: #f5f5f5;">
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center flex-1">
                            <i class="fas ${tableIcon} mr-2" style="color: #940000;"></i>
                            <span class="font-semibold" style="color: #940000; font-family: 'Merriweather', serif;">${table.name || 'Table sans nom'}</span>
                            <span class="ml-2 text-xs px-2 py-1 rounded" style="background-color: #e8f4f8; color: #1e40af;">${tableType}</span>
                        </div>
                        <button class="roll-table-btn text-blue-600 hover:text-blue-700 transition-colors" title="Tirer sur cette table" data-table='${JSON.stringify(table).replace(/'/g, "&#39;")}'>
                            <i class="fas fa-dice text-xl"></i>
                        </button>
                    </div>
                    <div class="text-xs" style="color: #6b7280;">
                        ${table.source ? `<span><i class="fas fa-tag mr-1"></i>${table.source}</span> • ` : ''}
                        ${isComposite ? `${table.subtables?.length || 0} sous-table(s)` : `${table.entries?.length || 0} entrée(s)`}
                    </div>
                </div>
            `;
        }).join('');
    }

    rollOnTable(tableData) {
        console.log("🎲 Tirage sur la table:", tableData.name);

        let resultHtml = '';
        const isComposite = tableData.isComposite || false;

        if (isComposite) {
            // Table composite
            resultHtml = this.rollCompositeTable(tableData);
        } else {
            // Table simple
            resultHtml = this.rollSimpleTable(tableData);
        }

        // Afficher le résultat dans la modale de résultat
        this.showResult(tableData.name, resultHtml);
    }

    rollSimpleTable(table) {
        if (!table.entries || table.entries.length === 0) {
            return '<p class="text-gray-500 italic">Cette table ne contient aucune entrée.</p>';
        }

        const randomIndex = Math.floor(Math.random() * table.entries.length);
        const result = table.entries[randomIndex];

        // Formater le résultat pour l'affichage
        let formattedResult = '';
        let rawContent = '';
        
        if (typeof result === 'object' && result !== null) {
            // Si c'est un objet avec des propriétés
            const entries = Object.entries(result);

            // Trouver le "Dé du destin" s'il existe
            const fateEntry = entries.find(([key]) => key.toLowerCase().includes('destin') || key.toLowerCase().includes('fate'));
            const otherEntries = entries.filter(([key]) => !key.toLowerCase().includes('destin') && !key.toLowerCase().includes('fate'));

            if (otherEntries.length > 0) {
                const [mainKey, mainValue] = otherEntries[0];
                rawContent = mainValue;

                // Afficher la valeur principale avec le dé du destin entre parenthèses si présent
                if (fateEntry) {
                    formattedResult = `<span style="font-weight: 600;">(${fateEntry[1]}) ${mainValue}</span>`;
                } else {
                    formattedResult = `<span style="font-weight: 600;">${mainValue}</span>`;
                }

                // Ajouter les autres propriétés s'il y en a sur la même ligne
                for (let i = 1; i < otherEntries.length; i++) {
                    const [key, value] = otherEntries[i];
                    formattedResult += ` <span style="font-weight: 500;">${key}:</span> ${value}`;
                }
            } else if (fateEntry) {
                rawContent = fateEntry[1];
                formattedResult = `<span style="font-weight: 600;">${fateEntry[1]}</span>`;
            }
        } else {
            // Si c'est une chaîne simple
            rawContent = result;
            formattedResult = `<span style="font-weight: 600;">${result}</span>`;
        }

        // Générer un hash unique pour ce résultat
        const resultHash = this.generateResultHash(table.name, rawContent);
        const isChecked = this.checkedResults[resultHash] || false;

        return `
            <div class="p-4 rounded-lg" style="background-color: #e8f4f8; border: 1px solid #3b82f6;">
                <div class="text-sm font-semibold mb-2" style="color: #1e40af;">Résultat (${randomIndex + 1}/${table.entries.length}) :</div>
                <div class="flex items-start gap-3" style="color: #1f2937;">
                    <input type="checkbox" 
                           class="random-result-checkbox mt-1 w-4 h-4 cursor-pointer" 
                           data-result-hash="${resultHash}"
                           ${isChecked ? 'checked' : ''}
                           onchange="window.randomTablesManager.toggleResultChecked('${resultHash}', this.checked)">
                    <div class="flex-1">${formattedResult}</div>
                </div>
            </div>
        `;
    }

    rollCompositeTable(table) {
        if (!table.subtables || table.subtables.length === 0) {
            return '<p class="text-gray-500 italic">Cette table composite ne contient aucune sous-table.</p>';
        }

        let html = '';
        table.subtables.forEach((subtable, idx) => {
            if (subtable.entries && subtable.entries.length > 0) {
                const randomIndex = Math.floor(Math.random() * subtable.entries.length);
                const result = subtable.entries[randomIndex];

                // Formater le résultat
                let formattedResult = '';
                let rawContent = '';
                
                if (typeof result === 'object' && result !== null) {
                    const entries = Object.entries(result);
                    const fateEntry = entries.find(([key]) => key.toLowerCase().includes('destin') || key.toLowerCase().includes('fate'));
                    const otherEntries = entries.filter(([key]) => !key.toLowerCase().includes('destin') && !key.toLowerCase().includes('fate'));

                    if (otherEntries.length > 0) {
                        const [mainKey, mainValue] = otherEntries[0];
                        rawContent = mainValue;
                        
                        if (fateEntry) {
                            formattedResult = `<span style="font-weight: 600;">(${fateEntry[1]}) ${mainValue}</span>`;
                        } else {
                            formattedResult = `<span style="font-weight: 600;">${mainValue}</span>`;
                        }
                        for (let i = 1; i < otherEntries.length; i++) {
                            const [key, value] = otherEntries[i];
                            formattedResult += ` <span style="font-weight: 500;">${key}:</span> ${value}`;
                        }
                    } else if (fateEntry) {
                        rawContent = fateEntry[1];
                        formattedResult = `<span style="font-weight: 600;">${fateEntry[1]}</span>`;
                    }
                } else {
                    rawContent = result;
                    formattedResult = `<span style="font-weight: 600;">${result}</span>`;
                }

                // Générer un hash unique pour ce résultat
                const resultHash = this.generateResultHash(`${table.name}::${subtable.name}`, rawContent);
                const isChecked = this.checkedResults[resultHash] || false;

                html += `
                    <div class="mb-4 p-4 rounded-lg" style="background-color: #e8f4f8; border: 1px solid #3b82f6;">
                        <div class="text-sm font-semibold mb-2" style="color: #1e40af;">
                            ${subtable.name || `Sous-table ${idx + 1}`} (${randomIndex + 1}/${subtable.entries.length}) :
                        </div>
                        <div class="flex items-start gap-3" style="color: #1f2937;">
                            <input type="checkbox" 
                                   class="random-result-checkbox mt-1 w-4 h-4 cursor-pointer" 
                                   data-result-hash="${resultHash}"
                                   ${isChecked ? 'checked' : ''}
                                   onchange="window.randomTablesManager.toggleResultChecked('${resultHash}', this.checked)">
                            <div class="flex-1">${formattedResult}</div>
                        </div>
                    </div>
                `;
            }
        });

        return html || '<p class="text-gray-500 italic">Aucun résultat disponible.</p>';
    }

    toggleResultChecked(resultHash, isChecked) {
        this.checkedResults[resultHash] = isChecked;
        this.saveCheckedResults();
        console.log(`✅ Résultat ${resultHash} marqué comme ${isChecked ? 'coché' : 'non coché'}`);
    }

    showResult(tableName, resultHtml) {
        const resultModal = document.getElementById('random-roll-result-modal');
        const resultContent = document.getElementById('random-roll-result-content');

        if (!resultModal || !resultContent) return;

        // Stocker le résultat pour insertion dans le journal
        if (window.settingsManager) {
            window.settingsManager.currentRandomResult = {
                tableName: tableName,
                result: resultHtml
            };
        }

        // Afficher le résultat
        resultContent.innerHTML = `
            <div class="mb-4">
                <h4 class="text-lg font-semibold mb-3" style="color: #940000;">${tableName}</h4>
                ${resultHtml}
            </div>
        `;

        // Afficher la modale de résultat
        resultModal.classList.remove('hidden');
    }
}

export default RandomTablesManager;
