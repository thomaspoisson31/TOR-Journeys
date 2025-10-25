

class LibraryManager {
    constructor() {
        this.libraryBtn = null;
        this.libraryModal = null;
        this.closeLibraryBtn = null;
        this.libraryContent = null;
        this.libraryEmpty = null;
        this.libraryLoading = null;
        this.folders = {};
        this.selectedFolder = null;
    }

    init() {
        console.log("📚 Initialisation LibraryManager");
        this.setupDOMReferences();
        this.setupEventListeners();
    }

    setupDOMReferences() {
        this.libraryBtn = document.getElementById('library-btn');
        this.libraryModal = document.getElementById('library-modal');
        this.closeLibraryBtn = document.getElementById('close-library-btn');
        this.libraryContent = document.getElementById('library-content');
        this.libraryEmpty = document.getElementById('library-empty');
        this.libraryLoading = document.getElementById('library-loading');
    }

    setupEventListeners() {
        if (this.libraryBtn) {
            this.libraryBtn.addEventListener('click', () => this.openLibrary());
        }

        if (this.closeLibraryBtn) {
            this.closeLibraryBtn.addEventListener('click', () => this.closeLibrary());
        }

        // Fermer en cliquant à l'extérieur
        if (this.libraryModal) {
            this.libraryModal.addEventListener('click', (e) => {
                if (e.target === this.libraryModal) {
                    this.closeLibrary();
                }
            });
        }
    }

    async openLibrary() {
        if (!this.libraryModal) return;

        this.libraryModal.classList.remove('hidden');
        await this.loadImages();
    }

    closeLibrary() {
        if (this.libraryModal) {
            this.libraryModal.classList.add('hidden');
        }
    }

    async loadImages() {
        console.log("📚 Chargement des images de la bibliothèque");

        // Afficher le loading
        this.libraryLoading.classList.remove('hidden');
        this.libraryContent.classList.add('hidden');
        this.libraryEmpty.classList.add('hidden');

        try {
            const response = await fetch('/api/images/library', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.folders && Object.keys(data.folders).length > 0) {
                this.folders = data.folders;
                this.renderFolders();
                this.libraryContent.classList.remove('hidden');
            } else {
                this.libraryEmpty.classList.remove('hidden');
            }

        } catch (error) {
            console.error("❌ Erreur lors du chargement de la bibliothèque:", error);
            alert(`Erreur lors du chargement de la bibliothèque: ${error.message}`);
            this.libraryEmpty.classList.remove('hidden');
        } finally {
            this.libraryLoading.classList.add('hidden');
        }
    }

    renderFolders() {
        if (!this.libraryContent) return;

        const folderNames = Object.keys(this.folders);
        
        this.libraryContent.innerHTML = `
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-300 mb-2">Dossier :</label>
                <select id="folder-select" class="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2">
                    <option value="">-- Sélectionner un dossier --</option>
                    ${folderNames.map(folder => `
                        <option value="${folder}">${folder} (${this.folders[folder].length})</option>
                    `).join('')}
                </select>
            </div>
            <div id="folder-images" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                <p class="text-gray-400 col-span-full text-center py-8">Sélectionnez un dossier pour voir les images</p>
            </div>
        `;

        const folderSelect = document.getElementById('folder-select');
        folderSelect.addEventListener('change', (e) => {
            this.selectedFolder = e.target.value;
            if (this.selectedFolder) {
                this.renderFolderImages(this.selectedFolder);
            }
        });

        console.log(`✅ ${folderNames.length} dossier(s) affichés dans la bibliothèque`);
    }

    renderFolderImages(folderName) {
        const folderImagesDiv = document.getElementById('folder-images');
        if (!folderImagesDiv) return;

        const images = this.folders[folderName] || [];

        if (images.length === 0) {
            folderImagesDiv.innerHTML = '<p class="text-gray-400 col-span-full text-center py-8">Aucune image dans ce dossier</p>';
            return;
        }

        folderImagesDiv.innerHTML = images.map(image => `
            <div class="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-700 hover:ring-2 hover:ring-blue-500 transition-all" data-url="${image.url}" data-filename="${image.filename}">
                <img src="${image.url}" alt="${image.filename}" class="w-full h-24 object-cover">
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity flex items-center justify-center">
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity text-white text-center p-2">
                        <p class="text-xs truncate">${image.filename}</p>
                        <p class="text-xs text-gray-300">${this.formatFileSize(image.size)}</p>
                    </div>
                </div>
            </div>
        `).join('');

        // Ajouter les événements de clic
        folderImagesDiv.querySelectorAll('[data-url]').forEach(card => {
            card.addEventListener('click', () => {
                this.selectImage({
                    url: card.dataset.url,
                    filename: card.dataset.filename
                });
            });
        });

        console.log(`✅ ${images.length} image(s) affichée(s) pour le dossier "${folderName}"`);
    }

    selectImage(image) {
        console.log("📷 Image sélectionnée:", image);
        
        // Copier l'URL dans le presse-papiers
        navigator.clipboard.writeText(image.url).then(() => {
            // Afficher une notification temporaire
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-[70]';
            notification.innerHTML = `
                <i class="fas fa-check mr-2"></i>
                URL copiée dans le presse-papiers
            `;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 2000);
        }).catch(err => {
            console.error("❌ Erreur lors de la copie:", err);
        });
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LibraryManager;
}

export default LibraryManager;

console.log("📚 LibraryManager module loaded");

