"""
Gestionnaire de base de données JSON (GCS ou Local)
Utilise StorageManager pour la persistance
"""
import json
import os
from datetime import datetime
from storage_manager import storage_manager

class JsonDBManager:
    def __init__(self):
        print("✅ Json Database Manager initialisé (via StorageManager)")
        # Legacy: pour éviter que app.py ne crashe avant la mise à jour
        self.db = {}

    def get_or_create_user(self, google_id, name=None, email=None):
        """Obtenir ou créer un utilisateur basé sur l'ID Google"""
        profile_path = f"users/{google_id}/profile.json"

        # Tenter de charger le profil existant
        raw_data = storage_manager.load_file(profile_path)

        if raw_data:
            try:
                user_data = json.loads(raw_data)
                print(f"✅ Utilisateur existant trouvé: {user_data.get('name')}")
                return user_data
            except json.JSONDecodeError:
                print(f"⚠️ Erreur de lecture du profil utilisateur {google_id}")

        # Créer un nouvel utilisateur
        user_data = {
            'id': google_id,
            'google_id': google_id,
            'name': name,
            'email': email,
            'created_at': datetime.now().isoformat()
        }

        # Sauvegarder
        try:
            json_str = json.dumps(user_data, indent=2, ensure_ascii=False)
            storage_manager.save_file(json_str.encode('utf-8'), profile_path, content_type='application/json')
            print(f"✅ Nouvel utilisateur créé: {name} ({email})")
        except Exception as e:
            print(f"❌ Erreur lors de la création de l'utilisateur: {e}")

        return user_data

    def get_user_data(self, google_id, env_prefix='prod_'):
        """Récupérer les données utilisateur"""
        data_path = f"users/{google_id}/{env_prefix}data.json"

        raw_data = storage_manager.load_file(data_path)

        if raw_data:
            try:
                data = json.loads(raw_data)
                print(f"📥 Données {env_prefix} chargées pour {google_id}")
                return data
            except json.JSONDecodeError:
                print(f"⚠️ Erreur de décodage JSON pour {data_path}")

        print(f"⚠️ Aucune donnée {env_prefix} trouvée pour {google_id}")
        return None

    def save_user_data(self, google_id, data, env_prefix='prod_'):
        """Sauvegarder les données utilisateur"""
        data_path = f"users/{google_id}/{env_prefix}data.json"

        # Ajouter un timestamp
        if isinstance(data, dict):
            data['_saved_at'] = datetime.now().isoformat()
            data['_sync_timestamp'] = datetime.now().timestamp()

        try:
            json_str = json.dumps(data, indent=2, ensure_ascii=False)
            storage_manager.save_file(json_str.encode('utf-8'), data_path, content_type='application/json')
            print(f"💾 Données {env_prefix} sauvegardées pour {google_id}")
            return True
        except Exception as e:
            print(f"❌ Erreur lors de la sauvegarde des données utilisateur: {e}")
            return False

    def _load_shared_links(self):
        """Charger les liens partagés"""
        raw_data = storage_manager.load_file('shared_links.json')
        if raw_data:
            try:
                return json.loads(raw_data)
            except json.JSONDecodeError:
                print("⚠️ Erreur de lecture de shared_links.json")
        return {}

    def _save_shared_links(self, links):
        """Sauvegarder les liens partagés"""
        try:
            json_str = json.dumps(links, indent=2, ensure_ascii=False)
            storage_manager.save_file(json_str.encode('utf-8'), 'shared_links.json', content_type='application/json')
            return True
        except Exception as e:
            print(f"❌ Erreur sauvegarde shared_links.json: {e}")
            return False

    def create_shared_link(self, uuid, user_id, map_url, env_prefix):
        links = self._load_shared_links()

        # Supprimer tout lien existant pour cette carte et cet utilisateur
        existing_link = self.get_link_by_user_map(user_id, map_url)
        if existing_link:
            self.revoke_shared_link(existing_link['uuid'])
            links = self._load_shared_links() # Recharger après suppression

        links[uuid] = {
            'user_id': user_id,
            'map_url': map_url,
            'env_prefix': env_prefix,
            'created_at': datetime.now().isoformat()
        }
        print(f"🔗 Lien partagé créé: {uuid} pour {user_id} (Carte: {map_url})")
        return self._save_shared_links(links)

    def get_shared_link(self, uuid):
        links = self._load_shared_links()
        return links.get(uuid)

    def revoke_shared_link(self, uuid):
        links = self._load_shared_links()
        if uuid in links:
            del links[uuid]
            print(f"🔗 Lien partagé révoqué: {uuid}")
            return self._save_shared_links(links)
        return False

    def get_link_by_user_map(self, user_id, map_url):
        links = self._load_shared_links()
        for uuid, data in links.items():
            if data.get('user_id') == user_id and data.get('map_url') == map_url:
                return { 'uuid': uuid, **data }
        return None
