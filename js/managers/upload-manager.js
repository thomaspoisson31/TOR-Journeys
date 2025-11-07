
/**
 * UploadManager - Gestion des uploads d'images
 */
class UploadManager {
    constructor() {
        this.uploadInProgress = false;
    }

    init() {
        console.log("📤 UploadManager initialized");
    }
}

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UploadManager;
}

// Export ES6 par défaut
export default UploadManager;
