"""
Gestionnaire de base de données JSON local
Remplace Replit DB pour la persistance générique
"""
import json
import os
from datetime import datetime

class LocalJsonDB:
    def __init__(self, filepath='data/database.json'):
        self.filepath = filepath
        self.data = {}
        self._ensure_dir()
        self.load()

    def _ensure_dir(self):
        directory = os.path.dirname(self.filepath)
        if directory and not os.path.exists(directory):
            try:
                os.makedirs(directory)
            except Exception as e:
                print(f"❌ Erreur lors de la création du dossier {directory}: {e}")

    def load(self):
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
                print(f"✅ Base de données chargée depuis {self.filepath}")
            except Exception as e:
                print(f"⚠️ Erreur lors du chargement de la DB: {e}")
                self.data = {}
        else:
            print(f"ℹ️ Nouvelle base de données créée à {self.filepath}")
            self.data = {}

    def save(self):
        try:
            with open(self.filepath, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"❌ Erreur lors de la sauvegarde de la DB: {e}")

    def __getitem__(self, key):
        return self.data[key]

    def __setitem__(self, key, value):
        self.data[key] = value
        self.save()

    def __contains__(self, key):
        return key in self.data

    def get(self, key, default=None):
        return self.data.get(key, default)

class JsonDBManager:
    def __init__(self, db_path='data/database.json'):
        self.db = LocalJsonDB(db_path)
        print("✅ Json Database Manager initialisé")

    def get_or_create_user(self, google_id, name=None, email=None):
        """Obtenir ou créer un utilisateur basé sur l'ID Google"""
        user_key = f"user:{google_id}"

        # Vérifier si l'utilisateur existe
        if user_key in self.db:
            user_data = self.db[user_key]
            # Si les données sont stockées comme chaîne JSON (héritage), les parser
            if isinstance(user_data, str):
                try:
                    user_data = json.loads(user_data)
                except:
                    pass

            print(f"✅ Utilisateur existant trouvé: {user_data.get('name')}")
            return user_data

        # Créer un nouvel utilisateur
        user_data = {
            'id': google_id,
            'google_id': google_id,
            'name': name,
            'email': email,
            'created_at': datetime.now().isoformat()
        }

        # Stocker directement l'objet, pas une chaîne JSON
        self.db[user_key] = user_data
        print(f"✅ Nouvel utilisateur créé: {name} ({email})")
        return user_data

    def get_user_data(self, google_id, env_prefix='prod_'):
        """Récupérer les données utilisateur"""
        data_key = f"{env_prefix}{google_id}:data"

        if data_key in self.db:
            data = self.db[data_key]
            # Gestion compatibilité si stocké en string
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except:
                    pass

            print(f"📥 Données {env_prefix} chargées pour {google_id}")
            return data

        print(f"⚠️ Aucune donnée {env_prefix} trouvée pour {google_id}")
        return None

    def save_user_data(self, google_id, data, env_prefix='prod_'):
        """Sauvegarder les données utilisateur"""
        data_key = f"{env_prefix}{google_id}:data"

        # Ajouter un timestamp
        if isinstance(data, dict):
            data['_saved_at'] = datetime.now().isoformat()
            data['_sync_timestamp'] = datetime.now().timestamp()

        # Stocker directement l'objet
        self.db[data_key] = data
        print(f"💾 Données {env_prefix} sauvegardées pour {google_id}")
        return True
