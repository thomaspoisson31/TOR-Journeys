
# Checklist de Non-Régression - Voyages en Terre du Milieu

*Version: 1.0 - Dernière mise à jour: 29 novembre 2024*

---

## 🗺️ Gestion des Cartes

### Affichage et Navigation
- [ ] La carte se charge correctement au démarrage
- [ ] Le zoom fonctionne (molette, boutons +/-, slider)
- [ ] Le pan (déplacement de la carte) fonctionne correctement
- [ ] Le bouton "Reset View" recentre la carte
- [ ] Les dimensions de la carte sont correctes (pas de déformation)
- [ ] Le basculement entre plusieurs cartes fonctionne
- [ ] Les filtres sont conservés par carte lors du changement

### Multi-Cartes
- [ ] Chaque carte conserve ses propres filtres
- [ ] Le changement de carte active met à jour l'affichage
- [ ] L'import/export fonctionne avec plusieurs cartes
- [ ] Les lieux/régions sans mapId s'affichent sur toutes les cartes
- [ ] Les lieux/régions avec mapId s'affichent uniquement sur leur carte

---

## 📍 Gestion des Lieux

### Création et Édition
- [ ] Création d'un lieu par clic sur la carte
- [ ] Modification des coordonnées d'un lieu (drag & drop)
- [ ] Édition des informations (nom, description, type, couleur)
- [ ] Ajout/suppression d'images pour un lieu
- [ ] Génération de description par IA (Gemini)
- [ ] Association de personnages à un lieu
- [ ] Association de tables aléatoires à un lieu
- [ ] Sauvegarde automatique des modifications

### Affichage et Filtres
- [ ] Affichage/masquage des lieux (toggle)
- [ ] Filtre par type de lieu
- [ ] Filtre par couleur
- [ ] Filtre par statut "connu/inconnu"
- [ ] Filtre par statut "visité/non visité"
- [ ] Opacité des lieux inconnus réduite
- [ ] Navigation vers un lieu depuis l'InfoBox d'un personnage

### Rumeurs et Traditions
- [ ] Ajout de rumeurs à un lieu
- [ ] Ajout de traditions anciennes à un lieu
- [ ] Affichage conditionnel selon statut "connu"
- [ ] Modification et suppression de rumeurs/traditions
- [ ] Marquage des rumeurs comme découvertes

---

## 🗺️ Gestion des Régions

### Création et Édition
- [ ] Création d'une région par dessin de polygone
- [ ] Modification des coordonnées d'une région
- [ ] Édition des informations (nom, description, couleur)
- [ ] Suppression d'une région
- [ ] Association de personnages à une région
- [ ] Association de tables aléatoires à une région

### Affichage et Filtres
- [ ] Affichage/masquage des régions (toggle)
- [ ] Réglage de l'opacité des régions (slider)
- [ ] Filtre par couleur de région
- [ ] Filtre par statut "connu/inconnu"
- [ ] Opacité des régions inconnues réduite
- [ ] Superposition correcte des régions (z-index)

### Rumeurs et Traditions
- [ ] Ajout de rumeurs à une région
- [ ] Ajout de traditions anciennes à une région
- [ ] Affichage conditionnel selon statut "connu"
- [ ] Modification et suppression de rumeurs/traditions

---

## 👥 Gestion des Personnages

### CRUD de Base
- [ ] Création d'un personnage
- [ ] Édition d'un personnage (nom, description, image)
- [ ] Suppression d'un personnage
- [ ] Liste complète des personnages accessible

### Associations Bidirectionnelles
- [ ] Association d'un personnage à un lieu (depuis InfoBox lieu)
- [ ] Association d'un personnage à une région (depuis InfoBox région)
- [ ] Association d'un lieu à un personnage (depuis InfoBox personnage)
- [ ] Association d'une région à un personnage (depuis InfoBox personnage)
- [ ] Mise à jour automatique bidirectionnelle des associations
- [ ] Navigation lieu → personnage fonctionne
- [ ] Navigation personnage → lieu fonctionne
- [ ] Navigation région → personnage fonctionne
- [ ] Navigation personnage → région fonctionne

### Import/Export
- [ ] Import de personnages depuis JSON
- [ ] Export des personnages en JSON
- [ ] Conservation des associations lors de l'import/export
- [ ] Normalisation des IDs lors de l'import

---

## 🛤️ Mode Voyage et Traçage de Chemins

### Traçage de Chemin
- [ ] Activation du mode voyage
- [ ] Traçage d'un chemin point par point
- [ ] Affichage du chemin en cours de traçage
- [ ] Validation du chemin (double-clic)
- [ ] Annulation du traçage (Echap)
- [ ] Canvas de traçage superposé correctement

### Détection Automatique
- [ ] Détection des lieux proches du chemin
- [ ] Détection des régions traversées
- [ ] Calcul correct des distances (proximityType)
- [ ] Respect du seuil de proximité pour les lieux
- [ ] Détection des intersections pour les régions
- [ ] Filtrage par mapId actif

### Configuration du Voyage
- [ ] Saisie du nombre de jours de voyage
- [ ] Saisie de la date de début (si calendrier actif)
- [ ] Calcul automatique des dates par jour
- [ ] Association des découvertes aux jours corrects

### Timeline et Segments
- [ ] Construction de la timeline absolue
- [ ] Calcul correct des segments de régions (entry/exit)
- [ ] Attribution des découvertes aux jours appropriés
- [ ] Gestion du chevauchement de régions

---

## 📖 Journal d'Aventure

### Génération de Journal
- [ ] Génération automatique du journal après validation du chemin
- [ ] Création d'une entrée par jour de voyage
- [ ] Intégration des découvertes de lieux
- [ ] Intégration des découvertes de régions
- [ ] Génération de descriptions narratives par IA
- [ ] Respect de la chronologie (dates du calendrier)

### Gestion des Entrées
- [ ] Affichage du journal par voyage
- [ ] Édition manuelle d'une entrée de journal
- [ ] Suppression d'un voyage complet
- [ ] Navigation vers les lieux/régions depuis le journal
- [ ] Mise en surbrillance des éléments cliquables

### Objectifs et Rumeurs
- [ ] Ajout d'objectifs globaux
- [ ] Marquage d'objectifs comme complétés
- [ ] Association de rumeurs aux voyages
- [ ] Suivi de la progression des rumeurs
- [ ] Affichage des rumeurs dans le journal (si implémenté)

---

## 🎲 Tables Aléatoires

### Gestion des Tables
- [ ] Création d'une table aléatoire
- [ ] Édition d'une table (nom, entrées)
- [ ] Suppression d'une table
- [ ] Ajout d'entrées à une table
- [ ] Suppression d'entrées d'une table
- [ ] Marquage d'une table comme "par défaut"

### Tables Composites
- [ ] Création d'une table composite (fusion de plusieurs tables)
- [ ] Sélection des tables sources
- [ ] Génération correcte des entrées fusionnées
- [ ] Sauvegarde des tables composites

### Utilisation des Tables
- [ ] Tirage aléatoire sur une table
- [ ] Génération de description narrative par IA pour le résultat
- [ ] Insertion du résultat dans le journal
- [ ] Marquage des résultats comme "cochés"
- [ ] Persistance des états cochés (localStorage + cloud)
- [ ] Affichage des tables associées à un lieu/région

---

## 📍 Marqueur de Position

### Gestion du Marqueur
- [ ] Création du marqueur de position
- [ ] Déplacement du marqueur (drag & drop)
- [ ] Sauvegarde de la position
- [ ] Chargement de la position au démarrage
- [ ] Affichage de la modale de position au survol
- [ ] Calcul correct des coordonnées réelles

### Détection de Proximité
- [ ] Détection des lieux proches du marqueur
- [ ] Détection des régions contenant le marqueur
- [ ] Affichage dans la modale de position
- [ ] Mise à jour temps réel lors du déplacement

---

## 📅 Calendrier Customisé

### Configuration
- [ ] Import du calendrier depuis CSV
- [ ] Affichage du calendrier dans les paramètres
- [ ] Modification des saisons
- [ ] Ajout de jours spéciaux avec symboles
- [ ] Sauvegarde de la configuration du calendrier

### Utilisation
- [ ] Activation/désactivation du mode calendrier
- [ ] Affichage de la saison actuelle
- [ ] Affichage de la date actuelle (jour + mois)
- [ ] Calcul automatique des dates dans les voyages
- [ ] Respect de la structure du calendrier (mois/jours)

---

## 💾 Import/Export

### Lieux et Régions
- [ ] Export des lieux en JSON
- [ ] Export des régions en JSON
- [ ] Import de lieux (mode Fusionner uniquement)
- [ ] Import de régions (mode Fusionner uniquement)
- [ ] Import avec mapId correct
- [ ] Import sans mapId (compatible toutes cartes)
- [ ] Conservation des associations lors de l'import

### Personnages
- [ ] Export des personnages en JSON
- [ ] Import de personnages
- [ ] Mode Fusionner fonctionne
- [ ] Mode Remplacer fonctionne (si personnages)
- [ ] Conservation des associations bidirectionnelles

### Tables Aléatoires
- [ ] Export des tables en JSON
- [ ] Import de tables
- [ ] Mode Fusionner fonctionne
- [ ] Mode Remplacer fonctionne

---

## ☁️ Synchronisation Cloud

### Authentification
- [ ] Connexion Google OAuth fonctionne
- [ ] Déconnexion fonctionne
- [ ] Affichage du nom/photo utilisateur
- [ ] Gestion des tokens d'authentification

### Sauvegarde/Chargement
- [ ] Sauvegarde automatique après modifications
- [ ] Sauvegarde manuelle (bouton)
- [ ] Chargement des données au login
- [ ] Indicateur de synchronisation (icône nuage)
- [ ] Gestion des conflits dev/prod

### Gestion des Environnements
- [ ] Bascule dev/prod fonctionne
- [ ] Sauvegarde dans le bon environnement
- [ ] Chargement depuis le bon environnement
- [ ] Migration dev → prod fonctionne
- [ ] Pas de perte de données lors de la migration

---

## 🤖 Génération IA (Google Gemini)

### Configuration
- [ ] Clé API correctement configurée
- [ ] Indicateur d'activation IA visible
- [ ] Paramètres de génération modifiables

### Fonctionnalités
- [ ] Génération de description de lieu
- [ ] Génération de description de région
- [ ] Génération de rumeur
- [ ] Génération de tradition ancienne
- [ ] Génération de description narrative pour le journal
- [ ] Génération de description pour un tirage aléatoire
- [ ] Gestion des erreurs API
- [ ] Respect du contexte (univers Tolkien)

---

## 🎨 Interface Utilisateur

### Modales et Panels
- [ ] Ouverture/fermeture des modales
- [ ] Overlay d'arrière-plan fonctionne
- [ ] Fermeture par clic en dehors (selon configuration)
- [ ] Boutons de fermeture (X) fonctionnent
- [ ] Défilement dans les modales avec contenu long

### Paramètres
- [ ] Onglet Général accessible
- [ ] Onglet Cartes accessible
- [ ] Onglet Tables accessible
- [ ] Onglet Calendrier accessible
- [ ] Onglet Import/Export accessible
- [ ] Sauvegarde des paramètres

### Responsive
- [ ] Interface utilisable sur mobile (styles-mobile.css)
- [ ] Boutons accessibles sur petit écran
- [ ] Modales adaptées aux petits écrans
- [ ] Pas de débordement horizontal

---

## 🐛 Gestion des Erreurs

### Robustesse
- [ ] Pas d'erreur console lors de l'utilisation normale
- [ ] Messages d'erreur clairs pour l'utilisateur
- [ ] Gestion des données corrompues
- [ ] Gestion des erreurs réseau (API)
- [ ] Gestion des erreurs d'authentification
- [ ] Pas de crash en cas de localStorage plein

### Logs et Débogage
- [ ] Logs console clairs et informatifs
- [ ] Préfixes émojis pour faciliter le suivi
- [ ] Pas de logs excessifs en production
- [ ] Traçabilité des opérations critiques

---

## ⚡ Performance

### Chargement
- [ ] Temps de chargement initial acceptable (<3s)
- [ ] Chargement progressif des images
- [ ] Pas de blocage de l'interface pendant le chargement

### Utilisation
- [ ] Affichage fluide des lieux/régions (même avec beaucoup d'éléments)
- [ ] Zoom/pan fluide
- [ ] Pas de ralentissement lors du traçage de chemin
- [ ] Génération de journal rapide (<5s pour 30 jours)

---

## 🔒 Sécurité et Données

### Protection des Données
- [ ] Clés API non exposées côté client
- [ ] Tokens OAuth stockés de manière sécurisée
- [ ] Pas de données sensibles dans les logs
- [ ] Validation des données importées

### Intégrité
- [ ] Sauvegarde automatique pour éviter les pertes
- [ ] Vérification des formats JSON à l'import
- [ ] Gestion des IDs uniques (pas de collisions)
- [ ] Conservation de l'intégrité référentielle (associations)

---

## 📱 Compatibilité Navigateurs

- [ ] Chrome/Chromium (dernière version)
- [ ] Firefox (dernière version)
- [ ] Safari (dernière version)
- [ ] Edge (dernière version)
- [ ] Pas d'utilisation de fonctionnalités non supportées

---

## ✅ Tests de Scénarios Complets

### Scénario 1: Premier Voyage
1. [ ] Utilisateur se connecte pour la première fois
2. [ ] Charge une carte
3. [ ] Ajoute quelques lieux
4. [ ] Trace un chemin
5. [ ] Configure un voyage de 10 jours
6. [ ] Génère le journal
7. [ ] Vérifie que tout est sauvegardé

### Scénario 2: Multi-Cartes
1. [ ] Créer des lieux sur la carte A
2. [ ] Créer des lieux sur la carte B
3. [ ] Basculer entre les cartes
4. [ ] Vérifier que les filtres sont indépendants
5. [ ] Vérifier que les lieux s'affichent sur la bonne carte

### Scénario 3: Import Massif
1. [ ] Importer un gros fichier JSON (>100 lieux)
2. [ ] Vérifier que tous les lieux sont créés
3. [ ] Vérifier que les associations sont conservées
4. [ ] Vérifier les performances d'affichage

### Scénario 4: Associations Complexes
1. [ ] Créer un personnage
2. [ ] L'associer à 5 lieux
3. [ ] L'associer à 3 régions
4. [ ] Vérifier la navigation bidirectionnelle
5. [ ] Supprimer un lieu associé
6. [ ] Vérifier que l'association est retirée du personnage

---

## 📝 Notes pour les Tests

### Données de Test
- Utiliser des données de test variées (Eriador, Moria, etc.)
- Tester avec des noms contenant des caractères spéciaux
- Tester avec des images de grande taille
- Tester avec des JSON mal formatés

### Environnement de Test
- Tester en mode dev ET prod
- Tester avec et sans authentification
- Tester avec localStorage vide
- Tester avec des données legacy (anciennes versions)

### Points d'Attention Particuliers
- **Associations bidirectionnelles** : toujours vérifier les deux sens
- **MapId** : vérifier le comportement avec/sans mapId
- **Normalisation des IDs** : vérifier que les IDs sont cohérents
- **Synchronisation cloud** : vérifier les indicateurs visuels
- **Mode Aventure** : vérifier l'activation/désactivation complète

---

*Cette checklist doit être mise à jour à chaque nouvelle fonctionnalité ou correction de bug majeur.*
