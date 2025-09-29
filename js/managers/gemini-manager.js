
// Gemini API Manager pour la génération de contenu IA
export default class GeminiManager {
    constructor() {
        this.isConfigured = false;
        this.apiKey = null;
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
    }

    async init() {
        await this.checkConfiguration();
    }

    async checkConfiguration() {
        try {
            const response = await fetch('/api/gemini/config');
            const config = await response.json();
            
            this.isConfigured = config.api_key_configured;
            this.apiKey = config.api_key;
            
            console.log("🤖 Configuration Gemini:", this.isConfigured ? "✅ Configurée" : "❌ Non configurée");
            
            return this.isConfigured;
        } catch (error) {
            console.error("❌ Erreur lors de la vérification de la configuration Gemini:", error);
            return false;
        }
    }

    async generateContent(prompt, button = null) {
        if (!this.isConfigured || !this.apiKey) {
            const errorMsg = "Erreur: Clé API Gemini non configurée sur le serveur.";
            console.error(errorMsg);
            
            if (button) {
                this.resetButton(button);
            }
            
            throw new Error(errorMsg);
        }

        // Animation du bouton pendant la génération
        if (button) {
            this.setButtonLoading(button);
        }

        const payload = {
            contents: [{ 
                role: "user", 
                parts: [{ text: prompt }] 
            }]
        };

        try {
            console.log("🤖 [GEMINI API] Envoi du prompt:");
            console.log("📝", prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''));
            
            const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log("🤖 [GEMINI API] Statut de réponse:", response.status);

            if (!response.ok) {
                let errorMsg = `API request failed with status ${response.status}`;
                try {
                    const errorData = await response.json();
                    console.error("🤖 [GEMINI API] Erreur détaillée:", errorData);
                    errorMsg += `: ${errorData.error?.message || JSON.stringify(errorData)}`;
                } catch (jsonError) {
                    console.error("🤖 [GEMINI API] Impossible de parser l'erreur JSON");
                }
                throw new Error(errorMsg);
            }

            const result = await response.json();
            console.log("🤖 [GEMINI API] Réponse reçue:", result);

            if (result.candidates && result.candidates.length > 0 && 
                result.candidates[0].content && result.candidates[0].content.parts && 
                result.candidates[0].content.parts.length > 0) {
                
                const responseText = result.candidates[0].content.parts[0].text;
                console.log("✅ [GEMINI API] Texte généré (longueur: " + responseText.length + ")");
                
                if (button) {
                    this.resetButton(button);
                }
                
                return responseText;
            } else {
                throw new Error("Réponse API invalide ou vide");
            }

        } catch (error) {
            console.error("❌ [GEMINI API] Erreur:", error);
            
            if (button) {
                this.resetButton(button);
            }
            
            throw error;
        }
    }

    setButtonLoading(button) {
        const icon = button.querySelector('.gemini-icon') || button;
        
        // Sauvegarder le contenu original
        if (!button.dataset.originalContent) {
            button.dataset.originalContent = icon.innerHTML;
        }
        
        icon.innerHTML = `<i class="fas fa-spinner gemini-btn-spinner"></i>`;
        button.disabled = true;
    }

    resetButton(button) {
        const icon = button.querySelector('.gemini-icon') || button;
        
        if (button.dataset.originalContent) {
            icon.innerHTML = button.dataset.originalContent;
        }
        
        button.disabled = false;
    }

    // Méthodes spécialisées pour différents types de contenu

    async generateLocationDescription(locationName, existingDescription = '') {
        const prompt = `Rédige une courte description évocatrice pour un lieu de la Terre du Milieu nommé '${locationName}'. ${existingDescription ? `Description actuelle: "${existingDescription}". Améliore ou réécris cette description.` : ''} Décris son apparence, son atmosphère et son histoire possible, dans le style de J.R.R. Tolkien. Sois concis et évocateur (2-3 phrases maximum).`;
        
        return await this.generateContent(prompt);
    }

    async generateRegionDescription(regionName, existingDescription = '') {
        const prompt = `Rédige une courte description évocatrice pour une région de la Terre du Milieu nommée '${regionName}'. ${existingDescription ? `Description actuelle: "${existingDescription}". Améliore ou réécris cette description.` : ''} Décris son apparence, son climat, sa géographie et son histoire possible, dans le style de J.R.R. Tolkien. Sois concis et évocateur.`;
        
        return await this.generateContent(prompt);
    }

    async generateAdventuringGroup() {
        const prompt = `Crée un groupe d'aventuriers pour les Terres du Milieu dans l'Eriador de la fin du Troisième Âge.

Voici la procédure à suivre :

a- Choisis aléatoirement un nombre d'aventurier entre 2 et 5
b- Pour chaque individu du nombre d'aventurier fais les choses suivantes dans l'ordre :
- Choisis un peuple aléatoirement (parmi : "Hobbits de la Comté", "Hommes de Bree", "Rôdeur du Nord", "Elfes du Lindon", "Nains des Montagnes Bleues"). Il faut que cette sélection soit réellement aléatoire.
- Choisis un Nom (dans le style des noms utilisés parmi les races de Tolkien, mais sans utiliser de noms trop connus comme Aragorn, Legolas, Frodo, etc)
- Choisis Occupation/rôle (garde-forestier, marchand, érudit, guerrier, etc.)
- Choisis un lien cohérent (famille, ami, collègue, redevable, etc) entre les aventuriers, en faisant en sorte que les aventuriers de races différentes ne soient pas de la même famille.

Puis décris leur quête ou objectif commun qui les unit dans cette aventure, sans préciser ce qu'ils devront faire pour l'atteindre. Explique pourquoi ce sont eux et pas d'autres aventuriers qui poursuivent cette quête.

Format de réponse en Markdown:
## Groupe d'aventuriers
[Description de la composition du groupe et de leurs liens]

## Quête
[Description de leur objectif commun et pourquoi eux spécifiquement]

## Membres du groupe
[Pour chaque aventurier : **Nom** - *Peuple* - *Occupation* - [Description courte]]`;
        
        return await this.generateContent(prompt);
    }

    getNarrationPromptAddition() {
        const narrationStyle = localStorage.getItem('narrationStyle') || 'brief';
        
        switch (narrationStyle) {
            case 'detailed':
                return '\n\nRédige une narration détaillée avec plusieurs paragraphes, dans un style littéraire évocateur digne des grands récits de fantasy.';
            case 'brief':
                return '\n\nSois concis, un seul paragraphe par jour de voyage.';
            case 'keywords':
                return '\n\nFournis seulement des mots-clés évocateurs séparés par des virgules, pour inspiration du Meneur de Jeu.';
            default:
                return '\n\nSois concis, un seul paragraphe par jour de voyage.';
        }
    }

    async generateJourneyDescription(journeyData) {
        let prompt = `Tu es un narrateur spécialisé dans les récits de voyage en Terre du Milieu. Rédige une description narrative d'un voyage à travers l'Eriador.

Informations du voyage :
- Distance totale : ${journeyData.totalMiles} miles
- Durée estimée : ${journeyData.totalDays} jours
- Saison : ${journeyData.season}

Lieux découverts lors du voyage :
${journeyData.discoveries.map(d => `- ${d.name} (${d.type})`).join('\n')}

${journeyData.adventurersGroup ? `Groupe d'aventuriers :
${journeyData.adventurersGroup}

` : ''}${journeyData.quest ? `Contexte de la quête :
${journeyData.quest}

` : ''}Rédige une description immersive de ce voyage, en mentionnant les lieux découverts et en tenant compte de la saison. Adopte le style narratif de Tolkien avec des références à la géographie de l'Eriador.`;

        prompt += this.getNarrationPromptAddition();

        return await this.generateContent(prompt);
    }
}
