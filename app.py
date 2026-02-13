from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory, send_file
from werkzeug.middleware.proxy_fix import ProxyFix
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google_auth_oauthlib.flow import Flow
import json
import os
from datetime import datetime
import secrets
import requests
import uuid
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
import mimetypes
from PIL import Image
import io
from json_db_manager import JsonDBManager
from storage_manager import storage_manager
import base64

app = Flask(__name__)

# Initialiser le gestionnaire de base de données JSON (Local ou GCS)
db_manager = JsonDBManager()

# Utiliser une clé secrète fixe en développement
if os.environ.get('FLASK_ENV') == 'development':
    app.secret_key = 'dev-secret-key-for-sessions'
else:
    app.secret_key = secrets.token_hex(16)

# Configuration ProxyFix pour Replit/Render
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configuration Google OAuth
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')

# Configuration Google Gemini API
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')

# Configuration pour l'upload d'images
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

@app.before_request
def force_https():
    """Force HTTPS pour toutes les requêtes derrière un proxy"""
    if request.headers.get('X-Forwarded-Proto') == 'https':
        request.environ['wsgi.url_scheme'] = 'https'
        request.environ['REQUEST_SCHEME'] = 'https'
        request.environ['SERVER_PORT'] = '443'
        request.environ['HTTPS'] = 'on'

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

def resize_map_image(image_file, target_width=5000):
    """
    Redimensionne une image de carte à une largeur cible en conservant les proportions
    """
    img = Image.open(image_file)
    original_width, original_height = img.size
    ratio = target_width / original_width
    target_height = int(original_height * ratio)

    resized_img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()

    image_format = img.format if img.format else 'JPEG'
    if image_format == 'JPEG':
        resized_img.save(buffer, format='JPEG', quality=95, optimize=True)
    elif image_format == 'PNG':
        resized_img.save(buffer, format='PNG', optimize=True)
    elif image_format in ['WEBP', 'WebP']:
        resized_img.save(buffer, format='WEBP', quality=95)
    else:
        resized_img = resized_img.convert('RGB')
        resized_img.save(buffer, format='JPEG', quality=95, optimize=True)
        image_format = 'JPEG'

    buffer.seek(0)
    return buffer, target_width, target_height, image_format

def get_file_extension(filename):
    return filename.rsplit('.', 1)[1].lower() if '.' in filename else ''

def get_or_create_user(google_id, name=None, email=None):
    return db_manager.get_or_create_user(google_id, name, email)

@app.route('/login')
def login_page():
    return send_from_directory('.', 'login.html')

@app.route('/')
def index():
    if 'user_id' not in session or 'google_id' not in session:
        return redirect('/login')
    return send_from_directory('.', 'index.html')

@app.route('/api/auth/user')
def get_current_user():
    if 'user_id' in session and 'google_id' in session:
        user_data = {
            'id': session['user_id'],
            'google_id': session['google_id'],
            'name': session.get('user_name'),
            'email': session.get('user_email'),
            'picture': session.get('user_picture')
        }
        return jsonify({
            'authenticated': True,
            'user': user_data,
            'auth_method': 'google'
        })
    return jsonify({'authenticated': False, 'user': None})

# ... (Routes contexts supprimées car obsolètes, comme dans le code original) ...

@app.route('/api/user/data', methods=['GET'])
def get_user_data():
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']
    
    user_data = db_manager.get_user_data(google_id, env_prefix)
    
    if user_data is None:
        print(f"🆕 Création automatique des données {env_prefix} pour {google_id}")
        empty_data = {
            'locations': {'locations': []},
            'regions': {'regions': []},
            'calendar': {},
            'settings': {},
            'journal': {},
            'position': {},
            'filtersByMap': {},
            '_environment': env_prefix
        }
        db_manager.save_user_data(google_id, empty_data, env_prefix)
        return jsonify(empty_data)
    
    return jsonify(user_data)

@app.route('/api/user/data', methods=['PUT'])
def update_user_data():
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    data = request.json
    if not data:
        return jsonify({'error': 'Données manquantes'}), 400

    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']
    
    force_overwrite = data.get('_force_overwrite', False)
    
    if not force_overwrite:
        existing_data = db_manager.get_user_data(google_id, env_prefix)
        if existing_data:
            client_timestamp = data.get('_sync_timestamp')
            cloud_timestamp = existing_data.get('_sync_timestamp')
            
            if client_timestamp and cloud_timestamp and cloud_timestamp > client_timestamp:
                print(f"⚠️ Conflit détecté pour {google_id}")
                return jsonify({
                    'conflict_detected': True,
                    'cloud_data': existing_data,
                    'cloud_timestamp': cloud_timestamp
                }), 200
    
    db_manager.save_user_data(google_id, data, env_prefix)
    print(f"✅ Données sauvegardées pour {google_id} ({env_prefix})")
    return jsonify({'success': True, 'conflict_detected': False}), 200

@app.route('/<path:filename>')
def serve_static(filename):
    if filename.startswith('uploads/'):
        # Utiliser la route dédiée aux uploads
        return serve_uploaded_file(filename.replace('uploads/', '', 1))
    
    if filename.endswith('.js'):
        return send_from_directory('.', filename, mimetype='application/javascript')
    
    return send_from_directory('.', filename)

@app.route('/uploads/<path:filepath>')
def serve_uploaded_file(filepath):
    """Servir les images depuis GCS ou le système de fichiers local via Proxy"""
    full_path = f'uploads/{filepath}'

    # Utiliser open_file qui gère GCS et local
    file_obj = storage_manager.open_file(full_path)

    if file_obj:
        mimetype = mimetypes.guess_type(filepath)[0]
        return send_file(file_obj, mimetype=mimetype)
    else:
        return jsonify({'error': 'Image non trouvée'}), 404

@app.route('/auth')
def auth_panel():
    return render_template('auth_panel.html')

# ... (Routes OAuth conservées, elles fonctionnent déjà) ...
# Je copie-colle les routes OAuth standard du code original pour assurer la continuité
@app.route('/auth/google')
def google_auth():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return redirect('/?error=oauth_not_configured')
    redirect_uri = url_for('google_auth_callback', _external=True, _scheme='https')
    flow = Flow.from_client_config(
        {"web": {"client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET, "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token", "redirect_uris": [redirect_uri]}},
        scopes=['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile', 'openid']
    )
    flow.redirect_uri = redirect_uri
    authorization_url, state = flow.authorization_url(access_type='offline', include_granted_scopes='true', prompt='select_account')
    session['state'] = state
    session.permanent = True
    return redirect(authorization_url)

@app.route('/auth/google/callback')
def google_auth_callback():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return redirect('/?error=oauth_not_configured')
    try:
        if 'user_id' in session and 'google_id' in session:
            return redirect('/')
        redirect_uri = url_for('google_auth_callback', _external=True, _scheme='https')
        auth_response = request.url.replace('http://', 'https://')

        if 'state' not in session or request.args.get('state') != session['state']:
            return redirect('/?auth_error=invalid_state')

        flow = Flow.from_client_config(
            {"web": {"client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET, "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token", "redirect_uris": [redirect_uri]}},
            scopes=['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile', 'openid'],
            state=session['state']
        )
        flow.redirect_uri = redirect_uri
        flow.fetch_token(authorization_response=auth_response)
        idinfo = id_token.verify_oauth2_token(flow.credentials.id_token, google_requests.Request(), GOOGLE_CLIENT_ID)

        user = get_or_create_user(google_id=idinfo['sub'], name=idinfo.get('name'), email=idinfo.get('email'))
        session.clear()
        session.permanent = True
        session['user_id'] = user['id']
        session['google_id'] = idinfo['sub']
        session['user_picture'] = idinfo.get('picture')
        session['authenticated'] = True
        session['user_name'] = idinfo.get('name')
        session['user_email'] = idinfo.get('email')

        return redirect('/')
    except Exception as e:
        print(f"❌ Erreur OAuth: {e}")
        return redirect(f'/?auth_error=exception&msg={str(e)[:100]}')

@app.route('/auth/logout')
def logout():
    session.clear()
    return redirect('/login')

@app.route('/api/create_folder', methods=['POST'])
def create_folder():
    """Crée un dossier dans le stockage utilisateur"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    try:
        data = request.json
        folder_name = data.get('name')
        parent_path = data.get('path', '') # Relatif au dossier utilisateur

        if not folder_name:
            return jsonify({'error': 'Nom du dossier manquant'}), 400

        # Nettoyage du nom de dossier
        folder_name = secure_filename(folder_name)

        google_id = session['google_id']

        # Construction du chemin complet
        # uploads/{google_id}/{parent_path}/{folder_name}

        full_path = f'uploads/{google_id}'
        if parent_path:
            # Sécurité: empêcher ..
            if '..' in parent_path:
                return jsonify({'error': 'Chemin invalide'}), 400
            full_path = f'{full_path}/{parent_path}'

        final_path = f'{full_path}/{folder_name}/'

        if storage_manager.create_folder(final_path):
            return jsonify({'success': True, 'path': f'{parent_path}/{folder_name}' if parent_path else folder_name})
        else:
            return jsonify({'error': 'Erreur lors de la création du dossier'}), 500

    except Exception as e:
        print(f"❌ Erreur create_folder: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload/image', methods=['POST'])
def upload_image():
    """Upload d'une ou plusieurs images vers StorageManager (GCS ou Local)"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    try:
        files = request.files.getlist('files')

        # Support single file upload (legacy)
        if not files and 'file' in request.files:
            files = [request.files['file']]

        if not files:
            return jsonify({'error': 'Aucun fichier fourni'}), 400

        # Récupérer le chemin cible (path) ou la catégorie (legacy)
        target_path = request.form.get('path', '')
        category = request.form.get('category', 'general')

        # Si path n'est pas fourni mais category oui, utiliser category comme path racine
        if not target_path and category and category != 'general':
            target_path = category

        # Sécurité path
        if '..' in target_path:
             return jsonify({'error': 'Chemin invalide'}), 400

        google_id = session['google_id']
        base_upload_path = f'uploads/{google_id}'
        if target_path:
            base_upload_path = f'{base_upload_path}/{target_path}'

        results = []
        
        for file in files:
            if file.filename == '' or not allowed_file(file.filename):
                continue

            # Lire le fichier en mémoire
            file_data = file.read()
            file_size = len(file_data)

            if file_size > MAX_FILE_SIZE:
                continue # Skip trop gros

            filename_base = secure_filename(file.filename)

            # Déterminer format et extension
            width, height = 0, 0
            try:
                img = Image.open(io.BytesIO(file_data))
                width, height = img.size
                img_format = img.format
                file.seek(0)
            except Exception:
                img_format = None

            ext = get_file_extension(filename_base)
            if not ext:
                ext = mimetypes.guess_extension(file.content_type) or 'bin'

            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_id = str(uuid.uuid4())
            final_filename = f"{timestamp}_{unique_id}.{ext}"

            # Traitement spécifique pour les cartes (uniquement si path='maps' ou category='maps')
            is_map = target_path == 'maps' or category == 'maps'

            if is_map:
                print(f"🗺️ Redimensionnement de la carte...")
                try:
                    resized_buffer, width, height, saved_format = resize_map_image(io.BytesIO(file_data), target_width=5000)
                    file_data = resized_buffer.read()

                    if saved_format == 'JPEG': ext = 'jpg'
                    elif saved_format == 'PNG': ext = 'png'
                    elif saved_format == 'WEBP': ext = 'webp'

                    final_filename = f"{timestamp}_{unique_id}.{ext}"
                except Exception as e:
                    print(f"❌ Erreur resize: {e}")
                    continue

            # Upload
            final_file_path = f'{base_upload_path}/{final_filename}'
            saved_path = storage_manager.save_file(
                file_data,
                final_file_path,
                content_type=file.content_type,
                is_public=False
            )

            results.append({
                'url': f"/{saved_path}",
                'filename': final_filename,
                'width': width,
                'height': height
            })

        if not results:
            return jsonify({'error': 'Aucun fichier uploadé avec succès'}), 400

        # Retourner le premier résultat comme avant si un seul fichier, ou une liste
        response = {
            'success': True,
            'files': results,
            'storage': 'gcs' if storage_manager.is_gcs_enabled() else 'local',
            'message': f'{len(results)} image(s) uploadée(s)'
        }

        # Compatibilité pour le frontend actuel (qui attend url, filename, etc au premier niveau)
        if len(results) == 1:
            response.update(results[0])

        return jsonify(response)

    except Exception as e:
        print(f"❌ Erreur upload: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/images/library', methods=['GET'])
def get_image_library():
    """Récupérer les images (et dossiers) pour un chemin donné"""
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    try:
        google_id = session['google_id']
        current_path = request.args.get('path', '')
        
        # Sécurité
        if '..' in current_path:
            return jsonify({'error': 'Chemin invalide'}), 400
            
        # Prefix pour storage_manager (root de l'utilisateur)
        base_prefix = f'uploads/{google_id}/'

        # Liste tous les fichiers récursivement
        all_files = storage_manager.list_files(prefix=base_prefix)

        folders = set()
        files = []

        # Path relatif qu'on cherche à explorer (ex: "maps/")
        target_dir = current_path
        if target_dir and not target_dir.endswith('/'):
            target_dir += '/'

        for file_path in all_files:
            # file_path est ex: "uploads/google_id/maps/image.png"

            # Enlever le prefixe base
            if not file_path.startswith(base_prefix):
                continue
                
            rel_path = file_path[len(base_prefix):]
            # rel_path est ex: "maps/image.png" ou "general/sub/img.jpg"

            # Si on est à la racine (path vide), on veut voir "maps", "general" (dossiers) et les fichiers directs
            # Si on est dans "maps/", on veut voir les fichiers dans "maps/" et les sous-dossiers

            if not rel_path.startswith(target_dir):
                continue

            # Reste du chemin après le dossier cible
            rest = rel_path[len(target_dir):]
            if not rest: # C'est le dossier lui-même (ex: objet vide "maps/")
                continue

            parts = rest.split('/')

            if len(parts) > 1:
                # C'est un sous-dossier ou fichier dans un sous-dossier
                # ex: "sub/image.png" -> parts=['sub', 'image.png']
                # On ajoute 'sub' aux dossiers
                folders.add(parts[0])
            else:
                # C'est un fichier direct
                # ex: "image.png" -> parts=['image.png']
                filename = parts[0]
                if not filename: continue # Cas dossier trailing slash
                
                public_url = f"/{file_path}"
                files.append({
                    'filename': filename,
                    'url': public_url,
                    'path': f"{target_dir}{filename}" if target_dir else filename,
                    'type': 'file'
                })

        # Structure compatible avec le frontend actuel (mais améliorée)
        return jsonify({
            'success': True,
            'current_path': current_path,
            'folders': list(sorted(folders)), # Liste simple de noms de dossiers
            'files': sorted(files, key=lambda x: x['filename']),
            'legacy_folders': {} # Pour compatibilité si besoin, mais on va changer le frontend
        })

    except Exception as e:
        print(f"❌ Erreur library: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/storage/status')
def storage_status():
    return jsonify({
        'storage_available': storage_manager.is_gcs_enabled(),
        'bucket_name': storage_manager.bucket_name,
        'using_object_storage': storage_manager.is_gcs_enabled(),
        'message': 'Stockage GCS actif' if storage_manager.is_gcs_enabled() else 'Stockage local (éphémère)'
    })

# ... (Autres routes conservées: /api/gemini/*) ...
# Je copie les routes Gemini telles quelles
@app.route('/api/gemini/config')
def get_gemini_config():
    return jsonify({'api_key_configured': bool(GOOGLE_API_KEY)})

@app.route('/api/gemini/generate', methods=['POST'])
def generate_with_gemini():
    if not GOOGLE_API_KEY:
        return jsonify({'error': 'Clé API Gemini non configurée'}), 500
    try:
        data = request.json
        if not data or 'prompt' not in data: return jsonify({'error': 'Prompt manquant'}), 400
        prompt = data['prompt']
        api_model = 'gemini-2.0-flash-exp'
        api_url = f'https://generativelanguage.googleapis.com/v1beta/models/{api_model}:generateContent?key={GOOGLE_API_KEY}'
        payload = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
        response = requests.post(api_url, headers={'Content-Type': 'application/json'}, json=payload, timeout=30)
        if not response.ok: return jsonify({'error': f'Erreur API: {response.status_code}'}), 500
        result = response.json()
        if result.get('candidates') and len(result['candidates']) > 0:
            return jsonify({'success': True, 'content': result['candidates'][0]['content']['parts'][0]['text']})
        return jsonify({'error': 'Réponse invalide'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Serveur Flask démarré")
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('REPLIT_DEV_DOMAIN') is not None
    app.run(host='0.0.0.0', port=port, debug=debug)
