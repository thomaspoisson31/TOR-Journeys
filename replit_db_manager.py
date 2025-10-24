
"""
Gestionnaire de base de données Replit
Remplace SQLite pour la persistance en production
"""
import json
from datetime import datetime
from replit import db

class ReplitDBManager:
    def __init__(self):
        self.db = db
        self.init_database()
    
    def init_database(self):
        """Initialiser les clés de base si nécessaire"""
        if "users" not in self.db.keys():
            self.db["users"] = {}
        if "travel_contexts" not in self.db.keys():
            self.db["travel_contexts"] = {}
        print("✅ Replit Database initialisée")
    
    def get_or_create_user(self, google_id, name=None, email=None):
        """Obtenir ou créer un utilisateur"""
        users = dict(self.db["users"])
        
        if google_id in users:
            return users[google_id]
        
        # Créer un nouvel utilisateur
        user = {
            "google_id": google_id,
            "name": name,
            "email": email,
            "created_at": datetime.now().isoformat()
        }
        users[google_id] = user
        self.db["users"] = users
        return user
    
    def get_user_data(self, google_id, env_prefix="prod_"):
        """Récupérer les données utilisateur pour un environnement"""
        contexts = dict(self.db["travel_contexts"])
        key = f"{google_id}_{env_prefix}"
        
        if key in contexts:
            return json.loads(contexts[key])
        return None
    
    def save_user_data(self, google_id, data, env_prefix="prod_"):
        """Sauvegarder les données utilisateur"""
        contexts = dict(self.db["travel_contexts"])
        key = f"{google_id}_{env_prefix}"
        
        # Ajouter les métadonnées
        data["_environment"] = env_prefix
        data["_saved_at"] = datetime.now().isoformat()
        data["_sync_timestamp"] = int(datetime.now().timestamp() * 1000)
        
        contexts[key] = json.dumps(data)
        self.db["travel_contexts"] = contexts
        
        print(f"✅ Données sauvegardées pour {google_id} ({env_prefix})")
        return True
    
    def delete_user_data(self, google_id, env_prefix="prod_"):
        """Supprimer les données utilisateur"""
        contexts = dict(self.db["travel_contexts"])
        key = f"{google_id}_{env_prefix}"
        
        if key in contexts:
            del contexts[key]
            self.db["travel_contexts"] = contexts
            return True
        return False
