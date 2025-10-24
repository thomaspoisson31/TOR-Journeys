"""
Gestionnaire de base de données Replit
Remplace SQLite pour la persistance en production
"""
import json
from datetime import datetime
from replit import db as d

class ReplitDBManager:
    def __init__(self):
        self.db = d
        print("✅ Replit Database initialisée")

    def get_or_create_user(self, google_id, name=None, email=None):
        """Obtenir ou créer un utilisateur basé sur l'ID Google"""
        user_key = f"user:{google_id}"

        # Vérifier si l'utilisateur existe
        if user_key in self.db:
            user_data = json.loads(self.db[user_key])
            print(f"✅ Utilisateur existant trouvé: {user_data.get('name')}")
            return user_data

        # Créer un nouvel utilisateur
        user_data = {
            'id': google_id,  # Utiliser google_id comme id
            'google_id': google_id,
            'name': name,
            'email': email,
            'created_at': datetime.now().isoformat()
        }

        self.db[user_key] = json.dumps(user_data)
        print(f"✅ Nouvel utilisateur créé: {name} ({email})")
        return user_data

    def get_user_data(self, google_id, env_prefix='prod_'):
        """Récupérer les données utilisateur depuis Replit DB"""
        data_key = f"{env_prefix}{google_id}:data"

        if data_key in self.db:
            data = json.loads(self.db[data_key])
            print(f"📥 Données {env_prefix} chargées pour {google_id}")
            return data

        print(f"⚠️ Aucune donnée {env_prefix} trouvée pour {google_id}")
        return None

    def save_user_data(self, google_id, data, env_prefix='prod_'):
        """Sauvegarder les données utilisateur dans Replit DB"""
        data_key = f"{env_prefix}{google_id}:data"

        # Ajouter un timestamp
        data['_saved_at'] = datetime.now().isoformat()
        data['_sync_timestamp'] = datetime.now().timestamp()

        self.db[data_key] = json.dumps(data)
        print(f"💾 Données {env_prefix} sauvegardées pour {google_id}")
        return True