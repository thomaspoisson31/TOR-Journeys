
class LibraryManager {
    constructor() {
        this.libraryBtn = null;
        this.libraryModal = null;
        this.closeLibraryBtn = null;
        this.libraryContent = null;
        this.libraryEmpty = null;
        this.libraryLoading = null;
        this.images = [];
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

            if (data.success && data.images && data.images.length > 0) {
                this.images = data.images;
                this.renderImages();
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

    renderImages() {
        if (!this.libraryContent) return;

        this.libraryContent.innerHTML = '';

        this.images.forEach(image => {
            const imageCard = document.createElement('div');
            imageCard.className = 'relative group cursor-pointer rounded-lg overflow-hidden bg-gray-700 hover:ring-2 hover:ring-blue-500 transition-all';
            
            imageCard.innerHTML = `
                <img src="${image.url}" alt="${image.filename}" class="w-full h-24 object-cover">
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity flex items-center justify-center">
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity text-white text-center p-2">
                        <p class="text-xs truncate">${image.filename}</p>
                        <p class="text-xs text-gray-300">${this.formatFileSize(image.size)}</p>
                    </div>
                </div>
            `;

            // Événement de clic pour sélectionner l'image
            imageCard.addEventListener('click', () => {
                this.selectImage(image);
            });

            this.libraryContent.appendChild(imageCard);
        });

        console.log(`✅ ${this.images.length} image(s) affichée(s) dans la bibliothèque`);
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
