
class GeminiManager {
    constructor() {
        this.apiKey = null;
        this.checkApiKey();
    }

    async checkApiKey() {
        try {
            const response = await fetch('/api/gemini/config');
            const config = await response.json();
            this.apiKey = config.api_key_configured;
            console.log('🤖 Gemini API disponible:', this.apiKey);
        } catch (error) {
            console.error('❌ Erreur lors de la vérification de la clé API Gemini:', error);
            this.apiKey = false;
        }
    }

    async generateContent(prompt, buttonElement = null, type = 'description') {
        if (!this.apiKey) {
            throw new Error('API Gemini non configurée');
        }

        // Animation du bouton si fourni
        if (buttonElement) {
            this.setButtonLoading(buttonElement, true);
        }

        try {
            const response = await fetch('/api/gemini/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    type: type
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.content) {
                console.log('✅ Contenu généré avec succès');
                return data.content;
            } else {
                throw new Error(data.error || 'Réponse invalide de l\'API');
            }

        } catch (error) {
            console.error('❌ Erreur lors de la génération:', error);
            throw error;
        } finally {
            // Restaurer le bouton si fourni
            if (buttonElement) {
                this.setButtonLoading(buttonElement, false);
            }
        }
    }

    setButtonLoading(buttonElement, isLoading) {
        if (!buttonElement) return;

        if (isLoading) {
            buttonElement.dataset.originalContent = buttonElement.innerHTML;
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            buttonElement.style.opacity = '0.7';
        } else {
            buttonElement.disabled = false;
            buttonElement.innerHTML = buttonElement.dataset.originalContent || buttonElement.innerHTML;
            buttonElement.style.opacity = '1';
            delete buttonElement.dataset.originalContent;
        }
    }

    isAvailable() {
        return this.apiKey === true;
    }
}

export default GeminiManager;
