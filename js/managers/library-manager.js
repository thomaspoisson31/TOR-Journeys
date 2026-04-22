import UploadManager from './upload-manager.js';

class LibraryManager {
    constructor() {
        this.currentPath = '';
        this.onSelectCallback = null;
        this.modal = null;
        this.uploadManager = new UploadManager();
        this.selectedFiles = []; // For future multi-select support if needed
        console.log("📚 LibraryManager initialized (Unified)");
    }

    init() {
        // Nothing specific to init on load, modal is created on demand
    }

    /**
     * Ouvrir la bibliothèque
     * @param {Object} options Configuration
     * @param {Function} options.onSelect Callback (file) => {}
     * @param {String} options.startPath Dossier de départ (optionnel)
     * @param {String} options.title Titre de la modale (optionnel)
     */
    open(options = {}) {
        this.onSelectCallback = options.onSelect || null;
        this.currentPath = options.startPath || '';
        const title = options.title || "Bibliothèque d'images";

        this.createModal(title);
        this.loadLibraryContent();
    }

    createModal(title) {
        // Supprimer l'ancienne modale si elle existe
        if (this.modal) {
            this.modal.remove();
        }

        this.modal = document.createElement('div');
        this.modal.id = 'unified-library-modal';
        this.modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]';

        this.modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg w-[90vw] max-w-5xl mx-4 h-[80vh] flex flex-col shadow-2xl">
                <!-- Header -->
                <div class="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 class="text-2xl font-bold text-white flex items-center">
                        <i class="fas fa-images mr-3 text-blue-500"></i>${title}
                    </h2>
                    <button id="library-close-btn" class="text-gray-400 hover:text-white transition-colors">
                        <i class="fas fa-times fa-lg"></i>
                    </button>
                </div>

                <!-- Toolbar -->
                <div class="bg-gray-750 p-3 border-b border-gray-700 flex flex-wrap gap-3 justify-between items-center bg-gray-900">
                    <div id="library-breadcrumbs" class="flex items-center text-sm text-gray-300 overflow-x-auto whitespace-nowrap">
                        <!-- Breadcrumbs injected here -->
                    </div>

                    <div class="flex gap-2">
                         <button id="library-refresh-btn" class="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-white text-sm transition-colors" title="Rafraîchir">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button id="library-new-folder-btn" class="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-white text-sm transition-colors flex items-center">
                            <i class="fas fa-folder-plus mr-2"></i>Dossier
                        </button>
                        <div class="relative">
                            <input type="file" id="library-upload-input" multiple class="hidden" accept="image/*">
                            <button id="library-upload-btn" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm transition-colors shadow-sm flex items-center">
                                <i class="fas fa-cloud-upload-alt mr-2"></i>Uploader
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div id="library-content" class="flex-1 overflow-y-auto p-4 bg-gray-900">
                    <!-- Content injected here -->
                </div>

                <!-- Footer / Status -->
                <div class="p-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
                    <span id="library-status-text">Prêt</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Event Listeners
        document.getElementById('library-close-btn').addEventListener('click', () => this.close());
        document.getElementById('library-refresh-btn').addEventListener('click', () => this.refresh());
        document.getElementById('library-new-folder-btn').addEventListener('click', () => this.createNewFolder());

        const uploadBtn = document.getElementById('library-upload-btn');
        const uploadInput = document.getElementById('library-upload-input');

        uploadBtn.addEventListener('click', () => uploadInput.click());
        uploadInput.addEventListener('change', (e) => this.handleUpload(e.target.files));

        // Close on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
    }

    close() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }

    async loadLibraryContent() {
        const contentDiv = document.getElementById('library-content');
        const breadcrumbsDiv = document.getElementById('library-breadcrumbs');
        const statusText = document.getElementById('library-status-text');

        if(!contentDiv) return;

        // Loading state
        contentDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-400">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                <p>Chargement...</p>
            </div>
        `;
        if (statusText) statusText.textContent = 'Chargement...';

        try {
            const url = `/api/images/library?path=${encodeURIComponent(this.currentPath)}`;
            const response = await fetch(url, { credentials: 'include' });

            if (!response.ok) throw new Error(`Erreur ${response.status}`);

            const data = await response.json();

            if (data.success) {
                this.renderBreadcrumbs(breadcrumbsDiv);
                this.renderGrid(contentDiv, data.folders, data.files);
                if (statusText) statusText.textContent = `${data.folders.length} dossiers, ${data.files.length} fichiers`;
            } else {
                throw new Error(data.error || 'Erreur inconnue');
            }
        } catch (error) {
            console.error('Library Load Error:', error);
            contentDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-red-400">
                    <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                    <p>Erreur: ${error.message}</p>
                    <button onclick="window.libraryManager.refresh()" class="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm">Réessayer</button>
                </div>
            `;
            if (statusText) statusText.textContent = 'Erreur';
        }
    }

    renderBreadcrumbs(container) {
        if (!container) return;

        const parts = this.currentPath.split('/').filter(p => p);

        let html = `
            <button class="hover:text-white flex items-center ${parts.length === 0 ? 'font-bold text-white' : ''}" onclick="window.libraryManager.navigateTo('')">
                <i class="fas fa-home mr-1"></i> Racine
            </button>
        `;

        let currentPathAcc = '';
        parts.forEach((part, index) => {
            currentPathAcc += (index > 0 ? '/' : '') + part;
            const isLast = index === parts.length - 1;
            const pathForClick = currentPathAcc;

            html += `
                <span class="mx-2 text-gray-500">/</span>
                <button class="hover:text-white ${isLast ? 'font-bold text-white' : ''}"
                        onclick="window.libraryManager.navigateTo('${pathForClick}')">
                    ${part}
                </button>
            `;
        });

        container.innerHTML = html;
    }

    getUsedImageUrls() {
        const urls = new Set();

        // 1. Locations
        const locations = window.locationsData?.locations || [];
        locations.forEach(loc => {
            if (loc.images) {
                loc.images.forEach(img => {
                    if (img.url) urls.add(img.url);
                });
            }
        });

        // 2. Regions
        const regions = window.regionsData?.regions || [];
        regions.forEach(reg => {
            if (reg.images) {
                reg.images.forEach(img => {
                    if (img.url) urls.add(img.url);
                });
            }
        });

        // 3. Characters
        const characters = window.charactersManager?.characters || [];
        characters.forEach(char => {
            if (char.images) {
                char.images.forEach(img => {
                    if (img.url) urls.add(img.url);
                });
            }
        });

        // 4. Maps
        const maps = window.settingsManager?.availableMaps || [];
        maps.forEach(map => {
            if (map.url) urls.add(map.url);
        });

        return urls;
    }

    renderGrid(container, folders, files) {
        if (folders.length === 0 && files.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-500">
                    <i class="fas fa-folder-open text-4xl mb-3 opacity-50"></i>
                    <p>Dossier vide</p>
                </div>
            `;
            return;
        }

        const usedUrls = this.getUsedImageUrls();

        let html = '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4">';

        // Render Folders
        folders.sort().forEach(folder => {
            const folderPath = this.currentPath ? `${this.currentPath}/${folder}` : folder;
            html += `
                <div class="group relative bg-gray-800 hover:bg-gray-700 rounded-lg p-3 cursor-pointer transition-all border border-transparent hover:border-blue-500/50 flex flex-col items-center"
                     onclick="window.libraryManager.navigateTo('${folderPath}')">
                    <div class="w-16 h-16 mb-2 flex items-center justify-center text-yellow-500 group-hover:text-yellow-400 transition-colors">
                        <i class="fas fa-folder text-4xl"></i>
                    </div>
                    <div class="text-center w-full">
                        <p class="text-sm text-gray-200 truncate font-medium group-hover:text-white">${folder}</p>
                        <p class="text-xs text-gray-500">Dossier</p>
                    </div>
                </div>
            `;
        });

        // Render Files
        files.forEach(file => {
            // file = { filename, display_name, url, path, type }
            const isUsed = usedUrls.has(file.url);
            const displayName = file.display_name || file.filename;

            // Encode names for onclick
            const safeDisplayName = displayName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeFilename = file.filename.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeUrl = file.url.replace(/'/g, "\\'").replace(/"/g, '&quot;');

            html += `
                <div class="group relative bg-gray-800 hover:bg-gray-700 rounded-lg overflow-hidden cursor-pointer transition-all border border-transparent hover:border-green-500/50 flex flex-col h-full shadow-md"
                     onclick="window.libraryManager.selectFile('${safeUrl}', '${safeDisplayName}')">
                    <div class="aspect-square w-full bg-gray-900 relative flex-shrink-0">
                        <img src="${file.url}" alt="${displayName}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">

                        <!-- Overlay Sélectionner -->
                        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity pointer-events-none">
                            <span class="bg-green-600 text-white text-xs px-2 py-1 rounded shadow font-bold">Sélectionner</span>
                        </div>

                        <!-- Badge Utilisé (Point Rouge) -->
                        ${isUsed ? `
                            <div class="absolute top-2 left-2 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-800 shadow-sm" title="Cette image est utilisée"></div>
                        ` : ''}

                        <!-- Actions Hover -->
                        <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="event.stopPropagation(); window.libraryManager.renameFile('${safeUrl}', '${safeDisplayName}')"
                                    class="w-7 h-7 bg-gray-800/80 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors shadow"
                                    title="Renommer">
                                <i class="fas fa-pencil-alt text-[10px]"></i>
                            </button>
                            <button onclick="event.stopPropagation(); window.libraryManager.deleteFile('${safeUrl}', '${safeFilename}')"
                                    class="w-7 h-7 bg-gray-800/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow"
                                    title="Supprimer">
                                <i class="fas fa-trash-alt text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                    <div class="p-2 flex-grow flex items-center bg-gray-800 group-hover:bg-gray-700 transition-colors">
                        <p class="text-[11px] text-gray-300 truncate w-full text-center group-hover:text-white" title="${displayName}">${displayName}</p>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    async renameFile(url, currentName) {
        const newName = prompt("Nouveau nom de l'image :", currentName);
        if (newName === null || newName === currentName) return;

        try {
            const response = await fetch('/api/images/metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ url, name: newName })
            });

            if (!response.ok) throw new Error("Erreur serveur");
            this.refresh();
        } catch (e) {
            alert("Erreur: " + e.message);
        }
    }

    async deleteFile(url, filename) {
        const usedUrls = this.getUsedImageUrls();
        const isUsed = usedUrls.has(url);

        let confirmMsg = `Êtes-vous sûr de vouloir supprimer l'image "${filename}" ?`;
        if (isUsed) {
            confirmMsg = `⚠️ ATTENTION : Cette image est actuellement UTILISÉE dans votre aventure.\n\n` +
                         `Si vous la supprimez, elle disparaîtra des personnages/lieux/régions associés.\n\n` +
                         `Voulez-vous vraiment continuer la suppression ?`;
        }

        if (!confirm(confirmMsg)) return;

        try {
            const response = await fetch(`/api/images/delete?url=${encodeURIComponent(url)}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Erreur lors de la suppression");
            }

            this.refresh();
        } catch (e) {
            alert("Erreur: " + e.message);
        }
    }

    navigateTo(path) {
        this.currentPath = path;
        this.loadLibraryContent();
    }

    refresh() {
        this.loadLibraryContent();
    }

    async createNewFolder() {
        const name = prompt("Nom du nouveau dossier :");
        if (!name) return;

        // Basic validation
        if (!/^[a-zA-Z0-9_\-\.]+$/.test(name)) {
            alert("Le nom contient des caractères invalides.");
            return;
        }

        try {
            await this.uploadManager.createFolder(name, this.currentPath);
            this.refresh();
        } catch (e) {
            alert("Erreur: " + e.message);
        }
    }

    async handleUpload(files) {
        if (!files || files.length === 0) return;

        const statusText = document.getElementById('library-status-text');
        let errors = [];

        // Show uploading state
        if (statusText) statusText.innerHTML = `<span class="text-blue-400"><i class="fas fa-spinner fa-spin mr-1"></i> Upload en cours (${files.length} fichiers)...</span>`;

        for (let i = 0; i < files.length; i++) {
            try {
                // Pass true for isPath to indicate we are sending a path, not just a category
                await this.uploadManager.uploadFile(files[i], this.currentPath, null, true);
            } catch (e) {
                console.error(`Erreur upload ${files[i].name}:`, e);
                errors.push(`${files[i].name}: ${e.message}`);
            }
        }

        this.refresh();

        if (errors.length > 0) {
            alert(`Upload terminé avec ${errors.length} erreurs:\n${errors.join('\n')}`);
        }
    }

    selectFile(url, filename) {
        if (this.onSelectCallback) {
            this.onSelectCallback({ url, filename, path: this.currentPath });
        }
        this.close();
    }
}

export default LibraryManager;
