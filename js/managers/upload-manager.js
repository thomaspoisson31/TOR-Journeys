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
                resolve(e.target.result);
            };

            reader.onerror = () => {
                reject(new Error("Erreur lors de la lecture du fichier"));
            };

            reader.readAsDataURL(file);
        });
    }

    /**
     * Upload un fichier vers le serveur
     */
    async uploadFile(file, category = 'general') {
        // Valider le fichier
        const errors = this.validateFile(file);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Créer le FormData
        const formData = new FormData();
        formData.append('image', file);
        formData.append('category', category);

        try {
            const response = await fetch(this.uploadEndpoint, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de l\'upload');
            }

            const result = await response.json();
            console.log("✅ Upload successful:", result);
            return result;

        } catch (error) {
            console.error("❌ Upload error:", error);
            throw error;
        }
    }
}

// Export ES6 par défaut
export default UploadManager;