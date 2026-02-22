# Modèle de Données - Voyages en Terre du Milieu

Ce document décrit l'architecture des données de l'application, incluant la stratégie de stockage hybride et la structure détaillée des objets métier.

## 1. Architecture Globale

L'application utilise une architecture de données **hybride** conçue pour fonctionner à la fois avec un backend Python (Flask) et en mode "semi-statique".

*   **Source de Vérité (Backend)** : Le backend stocke les données sous forme de fichiers JSON (Blob Storage). Il n'y a pas de base de données relationnelle traditionnelle (SQL) pour les données de jeu.
*   **Cache Local (Frontend)** : Le navigateur conserve une copie complète de l'état du jeu dans le `localStorage` pour permettre une expérience fluide et une résilience hors ligne.
*   **Synchronisation** : Le `AuthManager` (Frontend) orchestre la synchronisation.
    *   Au chargement : Les données du Cloud écrasent le cache local (Source of Truth).
    *   À la sauvegarde : Le blob JSON complet est envoyé au backend pour écraser la version précédente.

---

## 2. Modèle Backend (Stockage Physique)

Le backend (`json_db_manager.py`) gère trois types de fichiers JSON, stockés soit sur le système de fichiers local (dev), soit sur Google Cloud Storage (prod).

### 2.1. Profil Utilisateur
**Chemin** : `users/{google_id}/profile.json`
Contient les métadonnées de l'identité de l'utilisateur.

```json
{
  "id": "123456789",
  "google_id": "123456789",
  "name": "Gandalf le Gris",
  "email": "gandalf@istari.me",
  "created_at": "2023-10-27T10:00:00.000Z"
}
```

### 2.2. Données de Jeu (Le "Blob")
**Chemin** : `users/{google_id}/{env}_data.json`
*   `{env}` est soit `dev_` soit `prod_`.
*   C'est un fichier monolithique contenant **tout** l'état de la partie de l'utilisateur.

**Méta-champs ajoutés par le backend :**
*   `_saved_at` : Timestamp ISO de la dernière sauvegarde.
*   `_sync_timestamp` : Timestamp UNIX pour la résolution de conflits.
*   `_environment` : L'environnement d'origine (`dev_` ou `prod_`).

### 2.3. Liens de Partage (Viewer Mode)
**Chemin** : `shared_links.json` (Racine du stockage)
Mappe des UUIDs uniques vers des configurations de vue restreinte.

```json
{
  "uuid-v4-string": {
    "user_id": "123456789",
    "map_url": "url_de_la_carte.webp",
    "env_prefix": "prod_",
    "created_at": "2023-10-27T12:00:00.000Z"
  }
}
```

---

## 3. Modèle Frontend (Objets Sémantiques)

Les données sont manipulées par différents Managers (`AuthManager`, `VoyageManager`, etc.) mais sont agrégées dans un objet unique lors de la synchronisation (`AuthManager.collectCurrentContextData`).

### 3.1. Structure du Contexte Global

```json
{
  "locations": { "locations": [Location] },
  "regions": { "regions": [Region] },
  "characters": { "characters": [Character] },
  "calendar": {
    "currentDate": "15 Narbeleth",
    "isCalendarMode": true,
    "calendarData": [Mois...],
    "currentSeason": "automne-milieu"
  },
  "settings": {
    "activeMapUrl": "eriador.webp",
    "availableMaps": [MapConfig],
    "mapRandomTables": { "map_url": "table_id" }
  },
  "journal": {
    "travelJournal": [Journey],
    "journal": { "content": "Texte libre..." },
    "objectives": [],
    "rumors": []
  },
  "position": { "x": 100, "y": 200, "mapId": "eriador.webp" },
  "activeJourney": { "path": [], "dayByDayData": [] },
  "filtersByMap": { "mapId": {Filters} },
  "adventureMode": false,
  "counters": [Counter]
}
```

### 3.2. Entités Détaillées

#### **Lieu (Location)**
Un point d'intérêt sur la carte.
*   `id` (string/number) : Identifiant unique.
*   `name` (string) : Nom du lieu.
*   `description` (string) : Description HTML/Markdown.
*   `type` (string) : Catégorie (ville, ruine, camp, etc.).
*   `coordinates` (object) : `{ x: number, y: number }`.
*   `mapId` (string) : URL de la carte d'appartenance (ou `null` si global).
*   `known` (boolean) : Si le lieu est visible par les joueurs (Brouillard de guerre).
*   `visited` (boolean) : Si le lieu a été visité.
*   `associatedCharacters` (array) : Liste d'IDs de personnages liés.
*   `images` (array) : `{ url: string, type: 'principale'|'vignette'|null }`.

#### **Région (Region)**
Une zone géographique définie par un polygone.
*   Structure similaire à **Lieu**, mais `coordinates` est un tableau de points `[{x,y}, ...]`.
*   `regionType` (string) : Type de terrain (forêt, montagne, etc.) influençant la couleur.

#### **Personnage (Character)**
Un PNJ, PJ ou Monstre.
*   `id` (string) : Identifiant unique.
*   `name` (string) : Nom.
*   `description` (string) : Biographie/Notes.
*   `type` (string) : `'PJ'`, `'PNJ'`, ou `'Monstre'`.
*   `associatedLocations` (array) : IDs des lieux où il se trouve.
*   `associatedRegions` (array) : IDs des régions où il se trouve.
*   `images` (array) : Liste d'images (portrait, token).
*   *Note : La propriété `mapId` a été supprimée au profit des associations.*

#### **Voyage (Journey)**
Une entrée structurée dans le journal de voyage (`travelJournal`).
*   `id` (number) : Timestamp de création.
*   `title` (string) : Titre généré (ex: "Voyage de Bree à Fondcombe").
*   `startDate` (string) : Date de début (ex: "10 Octobre").
*   `endDate` (string) : Date de fin.
*   `path` (array) : Liste complète des coordonnées `{x,y}` du tracé.
*   `pathSignature` (string) : Hash unique du tracé pour lier les descriptions.
*   `mapId` (string) : Carte sur laquelle le voyage a eu lieu.
*   `days` (array) : Liste de détails jour par jour.
    *   `dayNumber` (number)
    *   `calendarDate` (string)
    *   `weatherSymbol` (string)
    *   `description` (string) : Récit généré ou écrit.
    *   `discoveries` (array) : `{ name: string, type: 'location'|'region' }`.
    *   `eventResult` (string) : Résultat d'une table aléatoire (si applicable).

#### **Compteur (Counter)**
Un tracker personnalisé (PV, Rations, etc.).
*   `id` (string)
*   `name` (string)
*   `value` (number)
*   `icon` (string) : URL de l'icône.
*   `visible` (boolean)

#### **Paramètres (Settings)**
Configuration de la session.
*   `activeMapUrl` (string) : Carte actuellement affichée.
*   `availableMaps` (array) : Liste des cartes configurées (`url`, `name`, `scale`, `milesPerDay`).
*   `mapRandomTables` (object) : Association `{ mapUrl: tableId }` pour les tables aléatoires régionales.
