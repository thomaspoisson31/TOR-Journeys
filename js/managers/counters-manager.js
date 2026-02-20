class CountersManager {
    constructor() {
        this.counters = [];
        this.containerId = 'counters-list';
        console.log('🔢 CountersManager initialized');
    }

    init() {
        const saved = localStorage.getItem('customCounters');
        if (saved) {
            try {
                this.counters = JSON.parse(saved);
            } catch (e) {
                console.error('Error parsing counters:', e);
                this.counters = [];
            }
        }
        this.setupEventListeners();
        this.renderVisibleCounters();
    }

    setupEventListeners() {
        // Le bouton d'ajout est dans le DOM, mais peut-être pas encore visible/créé
        // On délègue l'événement au document pour être sûr
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('#add-counter-btn');
            if (btn) {
                console.log("🖱️ Click detected on add-counter-btn");
                this.addCounter();
            }
        });
    }

    render() {
        const container = document.getElementById(this.containerId);
        console.log(`Render called. Container found: ${!!container}, Counters: ${this.counters.length}`);
        if (!container) return;

        if (this.counters.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-list-ol text-4xl mb-3 opacity-50"></i>
                    <p>Aucun compteur créé</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.counters.map(counter => `
            <div class="bg-gray-700 p-4 rounded-lg flex items-center space-x-4 border border-gray-600" data-id="${counter.id}">
                <!-- Visibility Toggle -->
                <button class="w-8 h-8 rounded-full flex items-center justify-center transition-colors ${counter.visible ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-600 text-gray-400 hover:bg-gray-500'}"
                        onclick="window.countersManager.toggleVisibility('${counter.id}')"
                        title="${counter.visible ? 'Masquer' : 'Afficher (Max 3)'}">
                    <i class="fas ${counter.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                </button>

                <!-- Image -->
                <div class="w-16 h-16 bg-gray-800 rounded overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity relative group"
                     onclick="window.countersManager.openImageSelector('${counter.id}')"
                     title="Changer l'image">
                    <img src="${counter.image || ''}"
                         alt="${counter.name}"
                         class="w-full h-full object-cover ${counter.image ? '' : 'hidden'}"
                         onerror="this.style.display='none'">
                    <div class="${counter.image ? 'hidden' : ''} absolute inset-0 flex items-center justify-center text-gray-500">
                        <i class="fas fa-image"></i>
                    </div>
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all">
                        <i class="fas fa-pencil-alt text-white opacity-0 group-hover:opacity-100"></i>
                    </div>
                </div>

                <!-- Content -->
                <div class="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Name -->
                    <div>
                        <label class="block text-xs text-gray-400 mb-1">Nom</label>
                        <input type="text"
                               value="${counter.name.replace(/"/g, '&quot;')}"
                               class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white focus:border-blue-500 focus:outline-none"
                               onchange="window.countersManager.updateCounter('${counter.id}', 'name', this.value)">
                    </div>

                    <!-- Value -->
                    <div>
                        <label class="block text-xs text-gray-400 mb-1">Valeur</label>
                        <div class="flex items-center space-x-2">
                            <button class="w-8 h-8 bg-gray-600 hover:bg-gray-500 rounded text-white flex items-center justify-center"
                                    onclick="window.countersManager.updateCounter('${counter.id}', 'value', ${Number(counter.value) - 1})">
                                <i class="fas fa-minus text-xs"></i>
                            </button>
                            <input type="number"
                                   value="${counter.value}"
                                   class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-center focus:border-blue-500 focus:outline-none"
                                   onchange="window.countersManager.updateCounter('${counter.id}', 'value', parseInt(this.value))">
                            <button class="w-8 h-8 bg-gray-600 hover:bg-gray-500 rounded text-white flex items-center justify-center"
                                    onclick="window.countersManager.updateCounter('${counter.id}', 'value', ${Number(counter.value) + 1})">
                                <i class="fas fa-plus text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <button class="text-red-400 hover:text-red-300 p-2 ml-2"
                        onclick="window.countersManager.deleteCounter('${counter.id}')"
                        title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    renderVisibleCounters() {
        const container = document.getElementById('active-counters-display');
        if (!container) return;

        const visibleCounters = this.counters.filter(c => c.visible);

        if (visibleCounters.length === 0) {
            container.classList.add('hidden');
            container.innerHTML = '';
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = visibleCounters.map(counter => `
            <div class="flex flex-col items-center">
                <!-- Image -->
                <div class="w-12 h-12 bg-gray-800 rounded overflow-hidden flex-shrink-0 mb-1 border border-gray-600" title="${counter.name.replace(/"/g, '&quot;')}">
                    <img src="${counter.image || ''}"
                         alt="${counter.name}"
                         class="w-full h-full object-cover ${counter.image ? '' : 'hidden'}"
                         onerror="this.style.display='none'">
                    <div class="${counter.image ? 'hidden' : ''} w-full h-full flex items-center justify-center text-gray-500 text-xs">
                        <i class="fas fa-image"></i>
                    </div>
                </div>

                <!-- Controls -->
                <div class="flex items-center space-x-1">
                    <button class="text-gray-400 hover:text-white text-xs px-1"
                            onclick="window.countersManager.updateCounter('${counter.id}', 'value', ${Number(counter.value) - 1})">
                        -
                    </button>
                    <span class="text-white font-bold text-sm min-w-[1.5rem] text-center">${counter.value}</span>
                    <button class="text-gray-400 hover:text-white text-xs px-1"
                            onclick="window.countersManager.updateCounter('${counter.id}', 'value', ${Number(counter.value) + 1})">
                        +
                    </button>
                </div>
            </div>
        `).join('');
    }

    toggleVisibility(id) {
        const counter = this.counters.find(c => c.id === id);
        if (!counter) return;

        if (!counter.visible) {
            // Check max limit
            const visibleCount = this.counters.filter(c => c.visible).length;
            if (visibleCount >= 3) {
                alert("Vous ne pouvez afficher que 3 compteurs maximum.");
                return;
            }
        }

        counter.visible = !counter.visible;
        this.save();
        this.render(); // Update settings UI
        this.renderVisibleCounters(); // Update main UI
    }

    addCounter() {
        const newCounter = {
            id: 'counter_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            name: 'Nouveau compteur',
            value: 0,
            image: '',
            visible: false
        };
        this.counters.push(newCounter);
        this.save();
        this.render();
        this.renderVisibleCounters();
        console.log('✅ Compteur ajouté:', newCounter.id);
    }

    updateCounter(id, field, value) {
        const counter = this.counters.find(c => c.id === id);
        if (counter) {
            if (field === 'value') {
                value = isNaN(value) ? 0 : value;
            }
            counter[field] = value;
            this.save();
            // Re-render pour mettre à jour l'UI (notamment si value a changé via bouton)
            this.render();
            this.renderVisibleCounters();
        }
    }

    deleteCounter(id) {
        if (confirm('Voulez-vous vraiment supprimer ce compteur ?')) {
            this.counters = this.counters.filter(c => c.id !== id);
            this.save();
            this.render();
            this.renderVisibleCounters();
            console.log('🗑️ Compteur supprimé:', id);
        }
    }

    openImageSelector(id) {
        if (window.libraryManager) {
            window.libraryManager.open({
                title: "Choisir une image pour le compteur",
                onSelect: (file) => {
                    this.updateCounter(id, 'image', file.url);
                }
            });
        } else {
            alert("Bibliothèque d'images non disponible");
        }
    }

    save() {
        localStorage.setItem('customCounters', JSON.stringify(this.counters));
        if (typeof window.markAsUnsaved === 'function') {
            window.markAsUnsaved();
        }
        if (typeof window.scheduleAutoSync === 'function') {
            window.scheduleAutoSync();
        }
    }

    getCounters() {
        return this.counters;
    }

    loadCounters(data) {
        if (Array.isArray(data)) {
            this.counters = data;
            this.save(); // Save to local storage (will also trigger sync scheduling, but usually called during sync apply)
            // Si l'onglet est visible, re-render
            const container = document.getElementById(this.containerId);
            if (container && container.offsetParent !== null) {
                this.render();
            }
            this.renderVisibleCounters();
            console.log(`✅ ${data.length} compteurs chargés`);
        }
    }
}

export default CountersManager;
