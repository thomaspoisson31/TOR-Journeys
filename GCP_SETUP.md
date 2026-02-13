# Configuration de Google Cloud Storage pour la Persistance des Données

Ce guide explique comment configurer Google Cloud Storage pour stocker vos données et images de manière permanente et sécurisée, même lorsque l'application redémarre sur Render.com.

## 1. Créer un projet Google Cloud
1.  Allez sur la [Console Google Cloud](https://console.cloud.google.com/).
2.  Créez un **Nouveau Projet** (ex: `tor-journeys-storage`).
3.  Notez l'ID du projet (ex: `tor-journeys-storage-12345`).

## 2. Activer l'API Cloud Storage
1.  Dans la barre de recherche en haut, tapez "Cloud Storage API".
2.  Cliquez sur le résultat correspondant.
3.  Cliquez sur **Activer**.

## 3. Créer un Bucket (Espace de Stockage)
1.  Allez dans **Cloud Storage > Buckets** via le menu de gauche.
2.  Cliquez sur **Créer**.
3.  **Nommez votre bucket** (ex: `tor-journeys-uploads`). Ce nom doit être unique au monde.
4.  Laissez les autres options par défaut (Standard, Multi-region ou Region proche de vous).
5.  **Contrôle d'accès** : Assurez-vous que l'option "Appliquer la prévention de l'accès public pour ce bucket" est cochée (c'est le défaut).
6.  Cliquez sur **Créer**.
7.  **Sécurité** : Votre bucket doit rester **PRIVÉ**. L'application servira elle-même les images de manière sécurisée sans exposer vos données publiquement.

## 4. Créer un Compte de Service (Identifiants)
1.  Allez dans **IAM et administration > Comptes de service**.
2.  Cliquez sur **Créer un compte de service**.
3.  Nommez-le (ex: `render-app`).
4.  Cliquez sur **Créer et continuer**.
5.  **Rôle** : Sélectionnez `Cloud Storage > Administrateur des objets de l'espace de stockage` (Storage Object Admin). C'est important pour pouvoir écrire des fichiers.
6.  Cliquez sur **Continuer** puis **Terminé**.

## 5. Créer une Clé JSON
1.  Cliquez sur l'email du compte de service que vous venez de créer.
2.  Allez dans l'onglet **Clés**.
3.  Cliquez sur **Ajouter une clé > Créer une nouvelle clé**.
4.  Choisissez le format **JSON**.
5.  Le fichier se télécharge automatiquement sur votre ordinateur. **Gardez-le précieusement et ne le partagez jamais.**

## 6. Configurer Render.com
1.  Allez sur votre tableau de bord Render, sélectionnez votre service.
2.  Allez dans l'onglet **Environment**.
3.  Ajoutez les variables d'environnement suivantes :

    *   `GOOGLE_CLOUD_PROJECT` : L'ID de votre projet (étape 1).
    *   `GOOGLE_CLOUD_BUCKET` : Le nom de votre bucket (étape 3).
    *   `GOOGLE_APPLICATION_CREDENTIALS_JSON` : **Ouvrez le fichier JSON téléchargé avec un éditeur de texte (Bloc-notes), copiez TOUT son contenu, et collez-le ici.** (Assurez-vous de tout copier, accolades incluses).

4.  Sauvegardez les changements. Render va redémarrer votre application.

Une fois redémarrée, l'application détectera ces variables et basculera automatiquement en mode "Stockage Cloud". Vos données et images seront désormais sauvegardées chez Google de manière sécurisée et ne seront plus perdues !
