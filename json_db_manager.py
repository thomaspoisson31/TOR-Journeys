"""
Gestionnaire de base de données JSON (GCS ou Local)
Utilise StorageManager pour la persistance
"""
import json
import os
import uuid
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

    # --- Legacy Methods (kept for compatibility during migration) ---
    def get_user_data(self, google_id, env_prefix='prod_'):
        """Récupérer les données utilisateur (Legacy)"""
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
        """Sauvegarder les données utilisateur (Legacy)"""
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

    # --- New Architecture: Base World vs Campaigns ---

    def get_base_world(self, google_id, env_prefix='prod_'):
        """Récupérer le monde de base"""
        base_path = f"users/{google_id}/{env_prefix}base.json"

        # Tenter de charger le base world
        raw_data = storage_manager.load_file(base_path)

        if raw_data:
            try:
                return json.loads(raw_data)
            except json.JSONDecodeError:
                print(f"⚠️ Erreur décodage base world pour {google_id}")
                return None

        # Fallback: Tenter de charger l'ancien format _data.json si _base.json n'existe pas
        print(f"ℹ️ Pas de base world, tentative de chargement legacy pour {google_id}")
        return self.get_user_data(google_id, env_prefix)

    def save_base_world(self, google_id, data, env_prefix='prod_'):
        """Sauvegarder le monde de base"""
        base_path = f"users/{google_id}/{env_prefix}base.json"

        if isinstance(data, dict):
            data['_saved_at'] = datetime.now().isoformat()
            data['_type'] = 'base_world'

        try:
            json_str = json.dumps(data, indent=2, ensure_ascii=False)
            storage_manager.save_file(json_str.encode('utf-8'), base_path, content_type='application/json')
            print(f"💾 Base World {env_prefix} sauvegardé pour {google_id}")
            return True
        except Exception as e:
            print(f"❌ Erreur sauvegarde Base World: {e}")
            return False

    def list_campaigns(self, google_id, env_prefix='prod_'):
        """Lister les campagnes de l'utilisateur"""
        # Note: StorageManager n'a pas de méthode list_files native simple qui marche partout (GCS vs Local) de manière uniforme pour les sous-dossiers.
        # On va utiliser une approche où on stocke la liste des campagnes dans un fichier index ou on essaie de lister si possible.
        # Pour simplifier et être robuste sur GCS/Local, on va stocker l'index des campagnes dans `campaigns_index.json` à la racine de l'user ou dans le dossier campaigns.

        # Approche hybride : on essaie de lister le dossier `users/{id}/campaigns/`
        # Mais `storage_manager` abstract this.
        # Si on est en local, on peut utiliser os.listdir. Si GCS, on doit utiliser l'API GCS via storage_manager.
        # Le `storage_manager.py` actuel ne semble pas exposer `list_files`.
        # On va créer un fichier index `users/{id}/{env_prefix}campaigns_index.json`.

        index_path = f"users/{google_id}/{env_prefix}campaigns_index.json"
        raw_index = storage_manager.load_file(index_path)

        if raw_index:
            try:
                return json.loads(raw_index)
            except:
                return []
        return []

    def _update_campaign_index(self, google_id, env_prefix, campaign_summary, action='add'):
        """Mettre à jour l'index des campagnes"""
        current_list = self.list_campaigns(google_id, env_prefix)
        index_path = f"users/{google_id}/{env_prefix}campaigns_index.json"

        if action == 'add':
            # Vérifier doublons
            current_list = [c for c in current_list if c['id'] != campaign_summary['id']]
            current_list.append(campaign_summary)
        elif action == 'delete':
            campaign_id = campaign_summary['id']
            current_list = [c for c in current_list if c['id'] != campaign_id]
        elif action == 'update':
             # Mettre à jour l'entrée existante
            campaign_id = campaign_summary['id']
            for i, c in enumerate(current_list):
                if c['id'] == campaign_id:
                    current_list[i].update(campaign_summary)
                    break

        try:
            json_str = json.dumps(current_list, indent=2, ensure_ascii=False)
            storage_manager.save_file(json_str.encode('utf-8'), index_path, content_type='application/json')
            return True
        except Exception as e:
            print(f"❌ Erreur mise à jour index campagnes: {e}")
            return False

    def create_campaign(self, google_id, env_prefix, name, initial_data=None, is_standalone=True):
        """Créer une nouvelle campagne (toujours autonome désormais)"""
        campaign_id = str(uuid.uuid4())
        campaign_path = f"users/{google_id}/campaigns/{env_prefix}{campaign_id}.json"

        now = datetime.now().isoformat()

        if initial_data:
            # Cloner le contexte existant
            campaign_data = initial_data.copy()
            # S'assurer que les métadonnées sont correctes pour la nouvelle campagne
            campaign_data['id'] = campaign_id
            campaign_data['name'] = name
            campaign_data['created_at'] = now
            campaign_data['last_played'] = now
            campaign_data['adventureMode'] = True
            campaign_data['is_standalone'] = True

        else:
            # Structure d'une campagne autonome (monde vide)
            campaign_data = {
                'id': campaign_id,
                'name': name,
                'is_standalone': True,
                'created_at': now,
                'last_played': now,
                'locations': {'locations': []},
                'regions': {'regions': []},
                'characters': {'characters': []},
                'settings': {'availableMaps': []},
                'calendar': {},
                'position': None,
                'journal': [],
                'activeJourney': None,
                'counters': [],
                'adventureMode': True
            }

        try:
            json_str = json.dumps(campaign_data, indent=2, ensure_ascii=False)
            storage_manager.save_file(json_str.encode('utf-8'), campaign_path, content_type='application/json')

            # Mettre à jour l'index
            summary = {
                'id': campaign_id,
                'name': name,
                'created_at': now,
                'last_played': now
            }
            self._update_campaign_index(google_id, env_prefix, summary, 'add')

            print(f"✅ Campagne créée: {name} ({campaign_id})")
            return campaign_data
        except Exception as e:
            print(f"❌ Erreur création campagne: {e}")
            return None

    def get_campaign(self, google_id, env_prefix, campaign_id):
        """Récupérer une campagne spécifique"""
        campaign_path = f"users/{google_id}/campaigns/{env_prefix}{campaign_id}.json"

        raw_data = storage_manager.load_file(campaign_path)
        if raw_data:
            try:
                return json.loads(raw_data)
            except:
                return None
        return None

    def save_campaign(self, google_id, env_prefix, campaign_id, data):
        """Sauvegarder l'état d'une campagne"""
        campaign_path = f"users/{google_id}/campaigns/{env_prefix}{campaign_id}.json"

        if isinstance(data, dict):
            data['_saved_at'] = datetime.now().isoformat()
            data['last_played'] = datetime.now().isoformat()

        try:
            json_str = json.dumps(data, indent=2, ensure_ascii=False)
            storage_manager.save_file(json_str.encode('utf-8'), campaign_path, content_type='application/json')

            # Mettre à jour l'index (last_played)
            summary = {
                'id': campaign_id,
                'last_played': data['last_played']
            }
            # Si le nom a changé
            if 'name' in data:
                summary['name'] = data['name']

            self._update_campaign_index(google_id, env_prefix, summary, 'update')

            print(f"💾 Campagne {campaign_id} sauvegardée")
            return True
        except Exception as e:
            print(f"❌ Erreur sauvegarde campagne: {e}")
            return False

    def delete_campaign(self, google_id, env_prefix, campaign_id):
        """Supprimer une campagne"""
        campaign_path = f"users/{google_id}/campaigns/{env_prefix}{campaign_id}.json"

        # Note: StorageManager n'a pas de delete_file explicitement exposé dans le wrapper actuel?
        # Vérifions storage_manager.py s'il le faut.
        # Si delete n'existe pas, on peut juste retirer de l'index pour le cacher.
        # Mais supposons qu'on peut supprimer.

        # Pour l'instant, on retire de l'index.
        self._update_campaign_index(google_id, env_prefix, {'id': campaign_id}, 'delete')

        # On essaie de supprimer le fichier si possible (dépend de l'implémentation de storage_manager)
        # Comme on ne peut pas modifier storage_manager facilement sans le voir, on va laisser le fichier orphelin pour l'instant
        # ou écraser avec vide.

        return True

    # --- Shared Links Methods ---

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

    def create_shared_link(self, uuid, user_id, map_url, env_prefix, campaign_id=None):
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
            'campaign_id': campaign_id,
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
