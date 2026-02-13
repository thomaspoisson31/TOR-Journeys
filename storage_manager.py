import os
import json
from google.cloud import storage
from google.oauth2 import service_account
from datetime import timedelta
import io

class StorageManager:
    def __init__(self):
        self.client = None
        self.bucket = None
        self.bucket_name = os.environ.get('GOOGLE_CLOUD_BUCKET')
        self.project_id = os.environ.get('GOOGLE_CLOUD_PROJECT')
        self.credentials_json = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS_JSON')

        # Initialisation de GCS si les variables d'environnement sont présentes
        if self.credentials_json and self.bucket_name:
            try:
                # Parse JSON credentials from env var
                creds_dict = json.loads(self.credentials_json)
                self.credentials = service_account.Credentials.from_service_account_info(creds_dict)
                self.client = storage.Client(credentials=self.credentials, project=self.project_id)
                self.bucket = self.client.bucket(self.bucket_name)
                print(f"✅ [StorageManager] Google Cloud Storage initialisé: Bucket '{self.bucket_name}'")
            except Exception as e:
                print(f"❌ [StorageManager] Erreur d'initialisation GCS: {e}")
                self.client = None
        else:
            print("⚠️ [StorageManager] GCS non configuré. Mode stockage local (éphémère sur Render).")

    def is_gcs_enabled(self):
        return self.client is not None

    def save_file(self, file_data, destination_blob_name, content_type=None, is_public=False):
        """Sauvegarde un fichier (bytes) vers GCS ou localement"""
        if self.client:
            blob = self.bucket.blob(destination_blob_name)
            blob.upload_from_string(file_data, content_type=content_type)
            # Sur GCS, on ne rend pas public par défaut (ACL privé)
            # is_public est ignoré car on sert via le backend
            return destination_blob_name
        else:
            # Local fallback
            if '..' in destination_blob_name:
                 raise ValueError("Chemin invalide")

            path = destination_blob_name  # Relatif à la racine du projet
            os.makedirs(os.path.dirname(path), exist_ok=True)

            with open(path, 'wb') as f:
                f.write(file_data)

            return destination_blob_name

    def load_file(self, source_blob_name):
        """Charge un fichier (bytes) depuis GCS ou localement"""
        if self.client:
            blob = self.bucket.blob(source_blob_name)
            if not blob.exists():
                return None
            return blob.download_as_bytes()
        else:
            # Local fallback
            path = source_blob_name
            if os.path.exists(path):
                with open(path, 'rb') as f:
                    return f.read()
            return None

    def open_file(self, source_blob_name):
        """Ouvre un fichier en lecture (stream)"""
        if self.client:
            blob = self.bucket.blob(source_blob_name)
            if not blob.exists():
                return None
            # Retourne un file-like object
            return blob.open("rb")
        else:
            # Local fallback
            path = source_blob_name
            if os.path.exists(path):
                return open(path, 'rb')
            return None

    def list_files(self, prefix=None):
        """Liste les fichiers (blobs) avec un préfixe donné"""
        if self.client:
            blobs = self.client.list_blobs(self.bucket_name, prefix=prefix)
            return [blob.name for blob in blobs]
        else:
            # Local fallback
            files = []
            if prefix and os.path.exists(prefix):
                start_dir = prefix
            elif prefix:
                 return []
            else:
                start_dir = '.'

            if os.path.isdir(start_dir):
                for root, _, filenames in os.walk(start_dir):
                    for filename in filenames:
                        full_path = os.path.join(root, filename)
                        rel_path = full_path.replace('\\', '/')
                        if rel_path.startswith('./'):
                            rel_path = rel_path[2:]
                        files.append(rel_path)
            return files

    def delete_file(self, blob_name):
        """Supprime un fichier"""
        if self.client:
            blob = self.bucket.blob(blob_name)
            if blob.exists():
                blob.delete()
                return True
            return False
        else:
            if os.path.exists(blob_name):
                os.remove(blob_name)
                return True
            return False

# Instance globale
storage_manager = StorageManager()
