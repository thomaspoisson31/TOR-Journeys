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

# --- New Architecture Routes ---

@app.route('/api/base_world', methods=['GET'])
def get_base_world():
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']

    data = db_manager.get_base_world(google_id, env_prefix)

    if data is None:
        # Initialiser avec un monde vide si nécessaire
        return jsonify({
            'locations': {'locations': []},
            'regions': {'regions': []},
            'characters': {'characters': []},
            'settings': {'availableMaps': []}
        })

    return jsonify(data)

@app.route('/api/base_world', methods=['POST'])
def save_base_world():
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    data = request.json
    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']

    if db_manager.save_base_world(google_id, data, env_prefix):
        return jsonify({'success': True})
    return jsonify({'error': 'Erreur sauvegarde'}), 500

@app.route('/api/campaigns', methods=['GET'])
def list_campaigns():
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']

    campaigns = db_manager.list_campaigns(google_id, env_prefix)
    return jsonify({'campaigns': campaigns})

@app.route('/api/campaigns', methods=['POST'])
def create_campaign():
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    data = request.json
    name = data.get('name', 'Nouvelle Campagne')
    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']

    campaign = db_manager.create_campaign(google_id, env_prefix, name)
    if campaign:
        return jsonify({'success': True, 'campaign': campaign})
    return jsonify({'error': 'Erreur création'}), 500

@app.route('/api/campaigns/<campaign_id>', methods=['GET'])
def get_campaign(campaign_id):
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']

    campaign = db_manager.get_campaign(google_id, env_prefix, campaign_id)
    if campaign:
        return jsonify(campaign)
    return jsonify({'error': 'Campagne introuvable'}), 404

@app.route('/api/campaigns/<campaign_id>', methods=['PUT'])
def save_campaign(campaign_id):
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    data = request.json
    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']

    if db_manager.save_campaign(google_id, env_prefix, campaign_id, data):
        return jsonify({'success': True})
    return jsonify({'error': 'Erreur sauvegarde'}), 500

@app.route('/api/campaigns/<campaign_id>', methods=['DELETE'])
def delete_campaign(campaign_id):
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']

    if db_manager.delete_campaign(google_id, env_prefix, campaign_id):
        return jsonify({'success': True})
    return jsonify({'error': 'Erreur suppression'}), 500

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

@app.route('/api/user/data/debug', methods=['GET'])
def debug_user_data():
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']

    # Récupérer les données
    user_data = db_manager.get_user_data(google_id, env_prefix)

    if user_data is None:
        return jsonify({'error': 'Aucune donnée trouvée'}), 404

    # Calculer la taille du JSON et préparer les stats
    try:
        raw_json_text = json.dumps(user_data, indent=2, ensure_ascii=False)
        raw_json_size = len(raw_json_text.encode('utf-8'))

        # Résumé des données pour le frontend
        summary = {
            'locations_count': len(user_data.get('locations', {}).get('locations', [])),
            'regions_count': len(user_data.get('regions', {}).get('regions', [])),
            'characters_count': len(user_data.get('characters', {}).get('characters', [])),
            'has_calendar': bool(user_data.get('calendar')),
            'maps_count': len(user_data.get('settings', {}).get('availableMaps', []))
        }

        return jsonify({
            'status': 'success',
            'user_id': google_id,
            'record_id': f"users/{google_id}/{env_prefix}data.json",
            'created_at': user_data.get('_saved_at', 'Inconnu'),
            'updated_at': user_data.get('_saved_at', 'Inconnu'),
            'data_summary': summary,
            'full_data': user_data,
            'raw_json_size': raw_json_size,
            'raw_json_text': raw_json_text
        })
    except Exception as e:
        print(f"❌ Erreur lors du debug: {e}")
        return jsonify({'error': str(e)}), 500

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

@app.route('/api/image/create-thumbnail', methods=['POST'])
def create_thumbnail():
    """Crée une vignette pour une image existante"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Données manquantes'}), 400

        image_url = data.get('image_url')

        if not image_url:
            return jsonify({'error': 'URL de l\'image manquante'}), 400

        clean_url = image_url
        if clean_url.startswith('/'):
            clean_url = clean_url[1:]

        # Vérifier si c'est bien une image uploadée
        if not clean_url.startswith('uploads/'):
             return jsonify({'error': 'Image invalide (doit être dans uploads/)'}), 400

        print(f"🖼️ Création vignette pour: {clean_url}")

        # Ouvrir l'image originale
        file_obj = storage_manager.open_file(clean_url)
        if not file_obj:
            print(f"❌ Image introuvable: {clean_url}")
            return jsonify({'error': 'Image introuvable'}), 404

        try:
            with file_obj:
                img = Image.open(file_obj)
                original_format = img.format

                # Déterminer le format de sortie
                output_format = original_format
                ext = get_file_extension(clean_url) or 'jpg'

                if original_format not in ['JPEG', 'PNG', 'WEBP']:
                    # Convertir en JPEG par défaut pour les autres formats
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                    output_format = 'JPEG'
                    ext = 'jpg'

                # Déterminer le MIME type
                if output_format == 'JPEG':
                    mime_type = 'image/jpeg'
                elif output_format == 'PNG':
                    mime_type = 'image/png'
                elif output_format == 'WEBP':
                    mime_type = 'image/webp'
                else:
                    mime_type = 'application/octet-stream'

                # Redimensionner (max 300x300)
                img.thumbnail((300, 300))

                # Sauvegarder en mémoire
                buffer = io.BytesIO()

                save_args = {'format': output_format}
                if output_format == 'JPEG':
                    save_args['quality'] = 85
                    save_args['optimize'] = True
                elif output_format == 'WEBP':
                    save_args['quality'] = 85
                elif output_format == 'PNG':
                    save_args['optimize'] = True

                img.save(buffer, **save_args)
                buffer.seek(0)

            # Générer le nom de fichier de la vignette
            if '.' in clean_url:
                base_path = clean_url.rsplit('.', 1)[0]
                thumb_path = f"{base_path}_thumb.{ext}"
            else:
                thumb_path = f"{clean_url}_thumb.{ext}"

            print(f"💾 Sauvegarde vignette vers: {thumb_path}")

            # Sauvegarder la vignette
            storage_manager.save_file(
                buffer.read(),
                thumb_path,
                content_type=mime_type
            )

            return jsonify({
                'success': True,
                'thumbnail_url': f"/{thumb_path}"
            })

        except Exception as e:
            print(f"❌ Erreur traitement image: {e}")
            return jsonify({'error': f'Erreur lors du traitement de l\'image: {str(e)}'}), 500

    except Exception as e:
        print(f"❌ Erreur create_thumbnail: {e}")
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

@app.route('/share/<link_uuid>')
def view_shared_map(link_uuid):
    """Sert la page principale pour le mode visualiseur"""
    return send_from_directory('.', 'index.html')

@app.route('/api/share/generate', methods=['POST'])
def generate_shared_link():
    """Génère un lien de partage pour la carte active"""
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    data = request.json
    map_url = data.get('map_url')
    if not map_url:
        return jsonify({'error': 'URL de carte manquante'}), 400

    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']

    # Générer un UUID court
    link_uuid = str(uuid.uuid4())[:8]

    if db_manager.create_shared_link(link_uuid, google_id, map_url, env_prefix):
        return jsonify({
            'success': True,
            'link_uuid': link_uuid,
            'url': f"/share/{link_uuid}"
        })
    return jsonify({'error': 'Erreur lors de la création du lien'}), 500

@app.route('/api/share/revoke', methods=['DELETE'])
def revoke_shared_link():
    """Révoque un lien de partage"""
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    data = request.json
    link_uuid = data.get('link_uuid')

    # Vérification que le lien appartient bien à l'utilisateur
    link_data = db_manager.get_shared_link(link_uuid)
    if not link_data or link_data['user_id'] != session['google_id']:
        return jsonify({'error': 'Lien invalide ou non autorisé'}), 403

    if db_manager.revoke_shared_link(link_uuid):
        return jsonify({'success': True})
    return jsonify({'error': 'Erreur lors de la suppression'}), 500

@app.route('/api/share/status', methods=['GET'])
def get_shared_link_status():
    """Récupère le statut du lien partagé pour une carte donnée"""
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    map_url = request.args.get('map_url')
    if not map_url:
        return jsonify({'error': 'URL de carte manquante'}), 400

    google_id = session['google_id']
    link_data = db_manager.get_link_by_user_map(google_id, map_url)

    if link_data:
        return jsonify({
            'has_link': True,
            'link_uuid': link_data['uuid'],
            'url': f"/share/{link_data['uuid']}",
            'created_at': link_data['created_at']
        })
    return jsonify({'has_link': False})

@app.route('/api/share/data/<link_uuid>', methods=['GET'])
def get_shared_data(link_uuid):
    """Récupère les données pour le mode visualiseur (public)"""
    link_data = db_manager.get_shared_link(link_uuid)
    if not link_data:
        return jsonify({'error': 'Lien invalide ou expiré'}), 404

    user_id = link_data['user_id']
    env_prefix = link_data['env_prefix']

    # Récupérer les données de l'utilisateur créateur
    user_data = db_manager.get_user_data(user_id, env_prefix)
    if not user_data:
        return jsonify({'error': 'Données non trouvées'}), 404

    # Filtrage minimal pour la sécurité
    safe_data = {
        'locations': user_data.get('locations', {}),
        'regions': user_data.get('regions', {}),
        'characters': user_data.get('characters', {}),
        'settings': user_data.get('settings', {}),
        'calendar': user_data.get('calendar', {}),
        'journal': user_data.get('journal', {}),
        'position': user_data.get('position', {}),
        'adventureMode': 'player',
        'forcedActiveMapUrl': link_data['map_url']
    }

    return jsonify(safe_data)

if __name__ == '__main__':
    print("🚀 Serveur Flask démarré")
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('REPLIT_DEV_DOMAIN') is not None
    app.run(host='0.0.0.0', port=port, debug=debug)
