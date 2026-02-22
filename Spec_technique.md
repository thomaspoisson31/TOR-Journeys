# Spécifications Techniques - Voyages en Terre du Milieu

Ce document décrit l'architecture technique et les principes d'implémentation de l'application de cartographie narrative "Voyages en Terre du Milieu".

## 1. Architecture Globale

L'application est une **Single Page Application (SPA)** développée en JavaScript Vanilla (sans framework lourd comme React ou Vue), qui communique avec une API REST pour la gestion des données utilisateur et l'authentification.

L'architecture backend est **hybride**, permettant un fonctionnement dans deux environnements distincts :
1.  **Serveur Traditionnel (Python/Flask)** : Utilisé pour le développement (Replit) et les déploiements stateful (Google Cloud Run).
2.  **Serverless (Node.js/Netlify)** : Utilisé pour le déploiement en production statique via Netlify Functions.

## 2. Frontend (Client)

### Stack Technique
*   **Langage** : JavaScript (ES6+ Modules)
*   **Style** : Tailwind CSS
*   **Rendu Carte** : DOM (Marqueurs), SVG (Régions), Canvas (Tracés de voyage)

### Architecture Modulaire
Le code client est organisé selon le pattern "Manager", où chaque fonctionnalité majeure est encapsulée dans une classe dédiée (dans `js/managers/`). Ces managers sont instanciés et orchestrés par `js/main.js`.

*   **`AuthManager`** : Gestion de l'authentification Google OAuth2, synchronisation des données (Cloud <-> Local) et résolution des conflits.
*   **`DataManager`** : Abstraction pour le chargement/sauvegarde des données (LocalStorage vs API).
*   **`PathManager`** : Gestion du tracé des voyages sur un `<canvas>` superposé à la carte.
*   **`VoyageManager`** : Logique métier des voyages (calculs de distance, temps, événements aléatoires).
*   **`RenderManager`** : (En cours de refactoring) Logique d'affichage. Actuellement, le rendu principal est géré directement dans `main.js`.
*   **`SettingsManager`** : Gestion de la configuration utilisateur et du changement de carte.

### Moteur de Rendu (Carte)
L'affichage de la carte utilise une approche hybride pour optimiser les performances et l'interactivité :
1.  **Carte de fond** : Image haute résolution (`<img>`) dans un conteneur zoomable.
2.  **Lieux** : Éléments DOM (`<div>`) positionnés en absolu pour permettre l'interaction CSS (hover, click).
3.  **Régions** : Polygones SVG (`<polygon>`) dans un calque `<svg>` superposé, permettant des formes complexes et une détection précise des clics.
4.  **Voyages** : Tracés vectoriels sur un `<canvas>` HTML5 pour dessiner les chemins parcourus.

## 3. Backend (Double Implémentation)

L'application supporte deux backends qui exposent la même API REST contractuelle.

### Variante A : Python / Flask (Développement & Replit)
Utilisée principalement dans l'environnement Replit.
*   **Serveur** : Flask (`app.py`).
*   **Authentification** : `google-auth-oauthlib` avec gestion de session serveur.
*   **Stockage Données** : `JsonDBManager` qui stocke les profils utilisateurs dans des fichiers JSON (locaux ou sur Google Cloud Storage via `storage_manager.py`).
*   **Stockage Images** : Système de fichiers local ou GCS.

### Variante B : Serverless Node.js (Production & Netlify)
Utilisée pour le déploiement statique haute disponibilité.
*   **Runtime** : Netlify Functions (Node.js).
*   **Logique** : Fichiers dans `netlify/functions/` (`api.js`, `auth.js`, etc.) qui réimplémentent la logique Flask.
*   **Stockage Données** : **Netlify Blobs** (`@netlify/blobs`) pour stocker les profils utilisateurs et les images de manière distribuée.
*   **Images** : Traitement via `sharp` pour le redimensionnement à la volée avant stockage dans les Blobs.

## 4. Modèle de Données & Synchronisation

### Structure des Données
Les données utilisateur sont stockées sous forme d'un **document JSON monolithique** (Profil). Cela simplifie la synchronisation et garantit la cohérence atomique de l'état du monde.
Le document comprend :
*   `locations` : Liste des lieux découverts et créés.
*   `regions` : Zones géographiques et frontières.
*   `journal` : Entrées narratives et historique des voyages.
*   `settings` : Préférences utilisateur et carte active.

### Stratégie de Synchronisation
L'application utilise une stratégie de synchronisation optimiste avec résolution de conflits :
1.  **LocalStorage (Cache)** : Les données sont toujours sauvegardées localement pour la résilience offline.
2.  **Cloud Sync** : `AuthManager` envoie périodiquement (ou sur action utilisateur) le profil complet via `PUT /api/user/data`.
3.  **Détection de Conflit** : Le backend compare le timestamp de la version reçue avec celui stocké. Si le timestamp serveur est plus récent, il rejette la mise à jour (`conflict_detected: true`).
4.  **Résolution** : Le client (`AuthManager`) détecte le conflit et affiche une modale demandant à l'utilisateur de choisir entre "Écraser le serveur" (ses modifications locales gagnent) ou "Recharger du serveur" (ses modifications locales sont perdues).

## 5. Fonctionnalités Techniques Clés

### Authentification
Basée sur **Google OAuth2**.
*   Le flux OAuth est géré côté serveur (callback `/auth/google/callback`).
*   Une session sécurisée est établie (Cookie HttpOnly).
*   L'identité utilisateur (Google ID) sert de clé primaire pour le partitionnement des données (Blobs/Fichiers).

### Proxy AI (Gemini)
Pour sécuriser la clé API Google Gemini, le frontend ne l'appelle jamais directement.
*   Le client envoie le prompt à `/api/gemini/generate`.
*   Le backend (Python ou Node.js) injecte la clé API (variable d'environnement `GOOGLE_API_KEY`) et relaye la requête aux serveurs Google.

### Mode Visualiseur ("Viewer Mode")
Permet de partager une vue en lecture seule de sa carte.
*   Génération d'un lien unique avec UUID (`/share/<uuid>`).
*   Le backend associe cet UUID à un `google_id` et un contexte de données.
*   Le frontend détecte l'URL partagée, passe en `isViewerMode = true`, désactive les contrôles d'édition (Authentification, Ajout de lieux, etc.) et charge les données associées à l'UUID au lieu de celles de l'utilisateur connecté.

### Fog of War (Brouillard de Guerre)
Implémenté via des drapeaux `known` (connu) et `visited` (visité) sur chaque objet (Lieu/Région).
*   Le rendu (`main.js`) applique des filtres CSS (opacité, grayscale) ou masque complètement les éléments selon ces états et les filtres actifs (`FilterManager`).

## 6. Infrastructure

*   **Replit** : Environnement conteneurisé défini par `.replit` et `replit.nix`.
*   **Netlify** : Configuration via `netlify.toml`. Redirections configurées pour router `/api/*` vers les fonctions serverless correspondantes.
