/**
 * UploadManager - Gestion des uploads d'images
 */
class UploadManager {
    constructor() {
        this.maxFileSize = 20 * 1024 * 1024; // 20MB
        this.allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
        this.uploadEndpoint = '/api/upload/image';

        console.log("📤 UploadManager initialized");
    }

    /**
     * Valider un fichier avant upload
     */
    validateFile(file) {
        const errors = [];

        // Vérifier que le fichier existe
        if (!file) {
            errors.push("Aucun fichier sélectionné");
            return errors;
        }

        // Vérifier le type MIME
        if (!this.allowedTypes.includes(file.type)) {
            errors.push(`Type de fichier non supporté. Types autorisés: ${this.allowedTypes.join(', ')}`);
        }

        // Vérifier la taille
        if (file.size > this.maxFileSize) {
            const maxSizeMB = this.maxFileSize / (1024 * 1024);
            errors.push(`Fichier trop volumineux. Taille maximale: ${maxSizeMB}MB`);
        }

        // Vérifier que c'est bien une image
        if (!file.type.startsWith('image/')) {
            errors.push("Le fichier doit être une image");
        }

        return errors;
    }

    /**
     * Créer un élément de prévisualisation
     */
    createPreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const preview = document.createElement('div');
                preview.className = 'upload-preview';
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Prévisualisation" class="w-24 h-24 object-cover rounded border">
                    <div class="text-sm text-gray-600">
                        <div>${file.name}</div>
                        <div>${(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                `;
                resolve(preview);
            };

            reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier"));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Uploader un fichier
     */
    async uploadFile(file, category = 'general', onProgress = null) {
        console.log("📤 Starting file upload:", file.name);

        // Valider le fichier
        const validationErrors = this.validateFile(file);
        if (validationErrors.length > 0) {
            throw new Error(validationErrors.join(', '));
        }

        // Créer le FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        
        // Option pour stocker en Base64 (pour contourner Object Storage)
        // Activer uniquement pour les images < 100KB
        if (file.size < 100 * 1024) {
            formData.append('use_base64', 'true');
            console.log("💾 Upload en mode Base64 (image < 100KB)");
        }

        try {
            // Créer la requête avec suivi de progression
            const xhr = new XMLHttpRequest();

            return new Promise((resolve, reject) => {
                // Gestion de la progression
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable && onProgress) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete);
                    }
                });

                // Gestion de la réponse
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            if (response.success) {
                                console.log("✅ File uploaded successfully:", response.url);
                                resolve(response);
                            } else {
                                reject(new Error(response.error || 'Erreur inconnue'));
                            }
                        } catch (e) {
                            reject(new Error('Réponse serveur invalide'));
                        }
                    } else {
                        try {
                            const errorResponse = JSON.parse(xhr.responseText);
                            reject(new Error(errorResponse.error || `Erreur HTTP ${xhr.status}`));
                        } catch (e) {
                            reject(new Error(`Erreur HTTP ${xhr.status}`));
                        }
                    }
                });

                // Gestion des erreurs réseau
                xhr.addEventListener('error', () => {
                    reject(new Error('Erreur réseau lors de l\'upload'));
                });

                xhr.addEventListener('timeout', () => {
                    reject(new Error('Timeout lors de l\'upload'));
                });

                // Configurer et envoyer la requête
                xhr.open('POST', this.uploadEndpoint);
                xhr.timeout = 60000; // 60 secondes
                xhr.send(formData);
            });

        } catch (error) {
            console.error("❌ Upload error:", error);
            throw error;
        }
    }

    /**
     * Créer un composant d'upload avec drag & drop
     */
    createUploadComponent(container, category = 'general', onUploadComplete = null) {
        const uploadComponent = document.createElement('div');
        uploadComponent.className = 'upload-component border-2 border-dashed border-gray-300 rounded-lg p-6 text-center';

        uploadComponent.innerHTML = `
            <div class="upload-area">
                <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-600 mb-2">Glissez-déposez une image ici ou</p>
                <button type="button" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                    Sélectionner un fichier
                </button>
                <input type="file" class="hidden" accept="image/*">
                <p class="text-xs text-gray-500 mt-2">PNG, JPG, WEBP jusqu'à 20MB</p>
            </div>
            <div class="upload-progress hidden">
                <div class="bg-gray-200 rounded-full h-2 mb-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
                <p class="text-sm text-gray-600">Upload en cours...</p>
            </div>
            <div class="upload-result hidden"></div>
        `;

        const fileInput = uploadComponent.querySelector('input[type="file"]');
        const selectButton = uploadComponent.querySelector('button');
        const uploadArea = uploadComponent.querySelector('.upload-area');
        const progressArea = uploadComponent.querySelector('.upload-progress');
        const progressBar = uploadComponent.querySelector('.bg-blue-600');
        const resultArea = uploadComponent.querySelector('.upload-result');

        // Gérer le clic sur le bouton
        selectButton.addEventListener('click', () => {
            fileInput.click();
        });

        // Gérer la sélection de fichier
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0], category, uploadArea, progressArea, progressBar, resultArea, onUploadComplete);
            }
        });

        // Gérer le drag & drop
        uploadComponent.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadComponent.classList.add('border-blue-400', 'bg-blue-50');
        });

        uploadComponent.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadComponent.classList.remove('border-blue-400', 'bg-blue-50');
        });

        uploadComponent.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadComponent.classList.remove('border-blue-400', 'bg-blue-50');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0], category, uploadArea, progressArea, progressBar, resultArea, onUploadComplete);
            }
        });

        container.appendChild(uploadComponent);
        return uploadComponent;
    }

    /**
     * Gérer l'upload d'un fichier
     */
    async handleFileUpload(file, category, uploadArea, progressArea, progressBar, resultArea, onUploadComplete) {
        try {
            // Afficher la progression
            uploadArea.classList.add('hidden');
            progressArea.classList.remove('hidden');
            resultArea.classList.add('hidden');

            // Upload avec progression
            const result = await this.uploadFile(file, category, (progress) => {
                progressBar.style.width = `${progress}%`;
            });

            // Afficher le résultat
            progressArea.classList.add('hidden');
            resultArea.classList.remove('hidden');
            resultArea.innerHTML = `
                <div class="text-green-600 mb-2">
                    <i class="fas fa-check-circle mr-2"></i>
                    Upload réussi !
                </div>
                <img src="${result.url}" alt="Image uploadée" class="w-24 h-24 object-cover rounded mx-auto mb-2">
                <p class="text-xs text-gray-600">${result.filename}</p>
            `;

            // Appeler le callback
            if (onUploadComplete) {
                onUploadComplete(result);
            }

        } catch (error) {
            console.error("❌ Upload failed:", error);

            // Afficher l'erreur
            progressArea.classList.add('hidden');
            resultArea.classList.remove('hidden');
            resultArea.innerHTML = `
                <div class="text-red-600">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    Erreur: ${error.message}
                </div>
                <button type="button" class="mt-2 text-blue-600 hover:text-blue-800" onclick="this.parentElement.parentElement.querySelector('.upload-area').classList.remove('hidden'); this.parentElement.classList.add('hidden');">
                    Réessayer
                </button>
            `;
        }
    }

    /**
     * Créer un sélecteur d'image simple (bouton + prévisualisation)
     */
    createImageSelector(container, category = 'general', onImageSelected = null) {
        const selector = document.createElement('div');
        selector.className = 'image-selector';

        selector.innerHTML = `
            <div class="flex items-center space-x-3">
                <button type="button" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm">
                    <i class="fas fa-image mr-2"></i>Sélectionner une image
                </button>
                <input type="file" class="hidden" accept="image/*">
                <div class="image-preview hidden flex items-center space-x-2">
                    <img class="w-12 h-12 object-cover rounded border">
                    <span class="text-sm text-gray-600"></span>
                    <button type="button" class="text-red-600 hover:text-red-800" title="Supprimer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        const button = selector.querySelector('button');
        const input = selector.querySelector('input[type="file"]');
        const preview = selector.querySelector('.image-preview');
        const previewImg = selector.querySelector('img');
        const previewText = selector.querySelector('span');
        const removeBtn = selector.querySelector('.image-preview button');

        button.addEventListener('click', () => input.click());

        input.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];

                try {
                    button.disabled = true;
                    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Upload...';

                    const result = await this.uploadFile(file, category);

                    // Afficher la prévisualisation
                    previewImg.src = result.url;
                    previewText.textContent = result.filename;
                    preview.classList.remove('hidden');
                    button.classList.add('hidden');

                    if (onImageSelected) {
                        onImageSelected(result);
                    }

                } catch (error) {
                    alert(`Erreur d'upload: ${error.message}`);
                } finally {
                    button.disabled = false;
                    button.innerHTML = '<i class="fas fa-image mr-2"></i>Sélectionner une image';
                }
            }
        });

        removeBtn.addEventListener('click', () => {
            preview.classList.add('hidden');
            button.classList.remove('hidden');
            input.value = '';

            if (onImageSelected) {
                onImageSelected(null);
            }
        });

        container.appendChild(selector);
        return selector;
    }
}

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UploadManager;
}

// Export ES6 par défaut
export default UploadManager;

console.log("📤 UploadManager module loaded");