# Voyages en Terre du Milieu - Guide des Fonctionnalités

## Introduction

**Voyages en Terre du Milieu** est un outil cartographique narratif conçu pour accompagner les parties de jeu de rôle dans l'univers de J.R.R. Tolkien. Contrairement aux Virtual TableTops (VTT) classiques orientés combat tactique, cette application se concentre sur l'exploration, la découverte progressive du monde ("Fog of War" narratif) et la tenue d'un journal de voyage immersif.

---

## Modes d'Utilisation

L'application propose trois modes distincts adaptés aux différents rôles autour de la table :

1.  **Mode Gardien (Admin) :**
    *   Accès complet à toutes les fonctionnalités d'édition et de configuration.
    *   Gestion des cartes, lieux, régions, personnages et tables aléatoires.
    *   Contrôle de la visibilité des éléments (Connu/Inconnu).

2.  **Mode Joueur :**
    *   Interface épurée centrée sur l'immersion.
    *   Consultation de la carte et des informations "connues".
    *   Les éléments masqués ou inconnus restent invisibles.
    *   Accès restreint aux outils d'édition.

3.  **Mode Visualiseur (Viewer) :**
    *   Accessible via un lien de partage unique (`/share/<uuid>`).
    *   Lecture seule stricte.
    *   Permet aux joueurs de suivre la progression sur leur propre écran sans compte utilisateur.
    *   Synchronisation des données en temps réel avec les actions du Gardien (selon la sauvegarde).

---

## Cartographie et Navigation

### Interaction avec la Carte
*   **Zoom et Panoramique :** Navigation fluide via la molette de la souris, le glisser-déposer, ou les gestes tactiles (pincement).
*   **Centrage Automatique :** Double-clic pour centrer la vue sur un point.
*   **Couches Dynamiques :** Gestion automatique des calques pour les lieux (marqueurs), les régions (polygones) et le tracé des voyages.

### Gestion Multi-Cartes
*   **Bibliothèque de Cartes :** Possibilité d'uploader et de gérer plusieurs cartes (Eriador, Moria, Comté, etc.).
*   **Changement Rapide :** Basculez d'une carte à l'autre via le menu latéral ou les paramètres.
*   **Échelle Personnalisée :** Définition de l'échelle (miles par pixel) pour chaque carte afin d'assurer des calculs de distance précis.

---

## Gestion du Contenu (Lieux et Régions)

### Lieux (Locations)
*   **Création Intuitive :** Ajout de points d'intérêt par simple clic sur la carte.
*   **Statuts de Découverte :**
    *   *Connu/Inconnu :* Détermine la visibilité pour les joueurs.
    *   *Visité/Non visité :* Indique si le groupe s'y est déjà rendu (change l'apparence du marqueur).
*   **Enrichissement Multimédia :**
    *   Upload d'images (vignettes et images complètes).
    *   Génération automatique de descriptions via **Google Gemini AI**.
    *   Association de couleurs thématiques.

### Régions
*   **Tracé de Polygones :** Outil de dessin vectoriel pour délimiter des zones géographiques (forêts, montagnes, royaumes).
*   **Typologie :** Classification des régions (ex: Collines, Marais, Forêt) influencant automatiquement la couleur d'affichage.
*   **Opacité Variable :** Réglage de la transparence pour superposer les informations sans masquer la carte de fond.

### Personnages
*   **Fiches Complètes :** Gestion des PJ (Personnages Joueurs), PNJ et Monstres.
*   **Association Géographique :** Lien direct entre un personnage et un lieu ou une carte spécifique.
*   **Filtres Avancés :** Tri par type, statut (rencontré/connu), ou présence sur la carte active.
*   **Galerie d'Images :** Upload et gestion des portraits.

---

## Système de Voyage (VoyageManager)

### Planification et Tracé
*   **Mode Tracé :** Dessin libre de l'itinéraire directement sur la carte via un calque "canvas".
*   **Calcul Automatique :** Estimation immédiate de la distance totale (en miles) et de la durée du voyage (en jours) basée sur l'échelle de la carte.

### Journal de Bord Automatisé
*   **Génération Jour par Jour :** Création automatique d'une chronologie détaillée du voyage.
*   **Contexte Temporel :** Intégration du calendrier (Date, Mois) et des Saisons.
*   **Météo et Événements :** Tirages aléatoires contextuels pour chaque journée de marche.
*   **Narration par IA :** Utilisation de **Gemini** pour générer des récits de voyage immersifs et variés pour chaque étape, basés sur les lieux traversés et la saison.

---

## Journal et Narration

### Journal d'Aventure
*   **Historique Complet :** Centralisation de tous les voyages, découvertes et notes.
*   **Éditeur de Texte :** Prise de notes libre avec support du formatage Markdown.
*   **Exportation :** Possibilité d'exporter le journal au format Markdown pour une utilisation externe ou l'archivage.

### Infobox Contextuelle
*   Affichage rapide des détails (Description, Images, Rumeurs) au clic sur un lieu ou une région.
*   Onglets dédiés pour organiser l'information sans surcharger l'interface.

---

## Outils du Meneur de Jeu (Gardien)

### Tables Aléatoires (RandomTablesManager)
*   **Gestionnaire de Tables :** Création et édition de tables de rencontres, d'événements ou de trésors.
*   **Tirages Complexes :** Support des tables composites (sous-tables) et des "Dés du Destin".
*   **Intégration :** Insertion directe des résultats de tirage dans le journal d'aventure.

### Compteurs (CountersManager)
*   **Suivi de Ressources :** Création de compteurs personnalisés (Points de Vie, Espoir, Provisions, Munitions).
*   **Visibilité :** Affichage tête-haute (HUD) des compteurs actifs sur la carte.
*   **Personnalisation :** Association d'images et de noms aux compteurs.

### Bibliothèque d'Images
*   **Gestion Centralisée :** Explorateur de fichiers pour toutes les images uploadées (Lieux, Personnages, Cartes).
*   **Réutilisation :** Sélection facile d'images existantes pour de nouveaux éléments.

### Intelligence Artificielle (Gemini AI)
*   **Assistant de Rédaction :** Génération de descriptions d'ambiance pour les lieux, les régions et les personnages.
*   **Narrateur de Voyage :** Rédaction automatique des péripéties de voyage.
*   **Configuration :** Nécessite une clé API Google Gemini configurée côté serveur.

---

## Système et Données

### Authentification et Sauvegarde
*   **Google Sign-In :** Authentification sécurisée via compte Google.
*   **Synchronisation Cloud :** Sauvegarde automatique des données utilisateur (profil, cartes, journal) sur le cloud (Google Cloud Storage ou Local selon configuration).
*   **Mode Hors Connexion (Avertissement) :** Indication visuelle si l'utilisateur n'est pas connecté, prévenant la perte de données.

### Import / Export
*   **Sauvegarde Locale :** Export complet des données de campagne au format JSON.
*   **Restauration :** Import de fichiers de sauvegarde pour restaurer une campagne ou migrer des données.
