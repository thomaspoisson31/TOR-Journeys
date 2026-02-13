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

@app.route('/api/upload/image', methods=['POST'])
def upload_image():
    """Upload d'une image vers StorageManager (GCS ou Local)"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Aucun fichier fourni'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Aucun fichier sélectionné'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'Type de fichier non autorisé'}), 400

        # Lire le fichier en mémoire
        file_data = file.read()
        file_size = len(file_data)

        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': f'Fichier trop volumineux'}), 400

        category = request.form.get('category', 'general')
        if category not in ['locations', 'regions', 'general', 'maps']:
            category = 'general'

        google_id = session['google_id']
        filename_base = secure_filename(file.filename)
        
        # Déterminer format et extension
        try:
            img = Image.open(io.BytesIO(file_data))
            width, height = img.size
            img_format = img.format
            file.seek(0)
        except Exception:
            width, height = 0, 0
            img_format = None

        ext = get_file_extension(filename_base)
        if not ext:
            ext = mimetypes.guess_extension(file.content_type) or 'bin'

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())
        final_filename = f"{timestamp}_{unique_id}.{ext}"
        
        # Traitement spécifique pour les cartes (redimensionnement)
        if category == 'maps':
            print(f"🗺️ Redimensionnement de la carte...")
            try:
                # On passe un BytesIO à resize_map_image
                resized_buffer, width, height, saved_format = resize_map_image(io.BytesIO(file_data), target_width=5000)
                file_data = resized_buffer.read()
                
                if saved_format == 'JPEG': ext = 'jpg'
                elif saved_format == 'PNG': ext = 'png'
                elif saved_format == 'WEBP': ext = 'webp'
                
                final_filename = f"{timestamp}_{unique_id}.{ext}"
                print(f"✅ Carte redimensionnée: {width}x{height}px")
            except Exception as e:
                print(f"❌ Erreur resize: {e}")
                return jsonify({'error': str(e)}), 500

        # Upload via StorageManager
        final_path = f'uploads/{google_id}/{category}/{final_filename}'
        saved_path = storage_manager.save_file(
            file_data,
            final_path,
            content_type=file.content_type,
            is_public=False # Privé par défaut, servi via proxy
        )
        
        # URL locale (proxy)
        public_url = f"/{saved_path}"

        return jsonify({
            'success': True,
            'url': public_url,
            'filename': final_filename,
            'size': len(file_data),
            'user_id': session['user_id'],
            'category': category,
            'width': width,
            'height': height,
            'storage': 'gcs' if storage_manager.is_gcs_enabled() else 'local',
            'message': 'Image uploadée avec succès'
        })

    except Exception as e:
        print(f"❌ Erreur upload: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/images/library', methods=['GET'])
def get_image_library():
    """Récupérer toutes les images via StorageManager"""
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    try:
        google_id = session['google_id']
        prefix = f'uploads/{google_id}/'
        
        # Lister les fichiers (chemins relatifs complets)
        files = storage_manager.list_files(prefix=prefix)

        folders = {}
        total_images = 0

        for file_path in files:
            # file_path ressemble à "uploads/google_id/category/filename.jpg"
            # On veut extraire la catégorie et le nom
            
            # Retirer le préfixe "uploads/google_id/"
            if not file_path.startswith(prefix):
                continue
                
            relative_path = file_path[len(prefix):]
            parts = relative_path.split('/')

            if len(parts) > 1:
                # Il y a un dossier (ex: category/filename)
                category = '/'.join(parts[:-1])
                filename = parts[-1]
            else:
                # Racine
                category = 'root'
                filename = relative_path

            if category not in folders:
                folders[category] = []
                
            # URL locale (proxy)
            public_url = f"/{file_path}"
            
            folders[category].append({
                'filename': filename,
                'url': public_url,
                'category': category,
                'size': 0,
                'width': None,
                'height': None
            })
            total_images += 1

        return jsonify({
            'success': True,
            'folders': folders,
            'total': total_images
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
