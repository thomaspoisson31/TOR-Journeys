from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
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
from replit_db_manager import ReplitDBManager
import base64

# Object Storage désactivé - utilisation du système de fichiers local persistant
storage_client = None
bucket_name = None
STORAGE_AVAILABLE = False

print("📁 Stockage local persistant activé (pas d'initialisation Object Storage)")

app = Flask(__name__)

# Initialiser le gestionnaire de base de données Replit
db_manager = ReplitDBManager()

# Utiliser une clé secrète fixe en développement pour la persistance
if os.environ.get('REPLIT_DEV_DOMAIN'):
    app.secret_key = 'dev-secret-key-for-replit-sessions'
else:
    app.secret_key = secrets.token_hex(16)

# Configuration ProxyFix pour Replit (gestion des headers X-Forwarded)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configuration de session pour Replit - utiliser les sessions Flask par défaut

# Configuration Google OAuth
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')

# Configuration Google Gemini API
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')

# Configuration pour l'upload d'images
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

# Configuration OAuth pour Replit
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'  # Permet OAuth en développement

@app.before_request
def force_https():
    """Force HTTPS pour toutes les requêtes sur Replit"""
    # Sur Replit, toujours forcer HTTPS car l'accès externe est en HTTPS
    if request.headers.get('X-Forwarded-Proto') == 'https':
        request.environ['wsgi.url_scheme'] = 'https'
        request.environ['REQUEST_SCHEME'] = 'https'
        request.environ['SERVER_PORT'] = '443'
        request.environ['HTTPS'] = 'on'

# Note: Nous utilisons maintenant Replit Database au lieu de SQLite
# Les fonctions d'accès à la base de données sont gérées par ReplitDBManager

def allowed_file(filename):
    """Vérifier si le fichier a une extension autorisée"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

def resize_map_image(image_file, target_width=5000):
    """
    Redimensionne une image de carte à une largeur cible en conservant les proportions
    """
    # Ouvrir l'image
    img = Image.open(image_file)

    # Obtenir les dimensions originales
    original_width, original_height = img.size

    # Calculer la nouvelle hauteur en conservant le ratio
    ratio = target_width / original_width
    target_height = int(original_height * ratio)

    # Redimensionner l'image
    resized_img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

    # Sauvegarder dans un buffer
    buffer = io.BytesIO()

    # Déterminer le format de sortie
    image_format = img.format if img.format else 'JPEG'
    if image_format == 'JPEG':
        resized_img.save(buffer, format='JPEG', quality=95, optimize=True)
    elif image_format == 'PNG':
        resized_img.save(buffer, format='PNG', optimize=True)
    elif image_format in ['WEBP', 'WebP']:
        resized_img.save(buffer, format='WEBP', quality=95)
    else:
        # Par défaut, sauver en JPEG
        resized_img = resized_img.convert('RGB')
        resized_img.save(buffer, format='JPEG', quality=95, optimize=True)
        image_format = 'JPEG'

    buffer.seek(0)

    return buffer, target_width, target_height, image_format

def get_file_extension(filename):
    """Obtenir l'extension du fichier"""
    return filename.rsplit('.', 1)[1].lower() if '.' in filename else ''

def generate_unique_filename(original_filename, category='general'):
    """Générer un nom de fichier unique"""
    ext = get_file_extension(original_filename)
    unique_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    return f"{category}/{timestamp}_{unique_id}.{ext}"

def get_or_create_user(google_id, name=None, email=None):
    """Obtenir ou créer un utilisateur basé sur l'ID Google"""
    return db_manager.get_or_create_user(google_id, name, email)

@app.route('/login')
def login_page():
    """Page de connexion"""
    return send_from_directory('.', 'login.html')

@app.route('/')
def index():
    """Page principale - nécessite authentification"""
    if 'user_id' not in session or 'google_id' not in session:
        return redirect('/login')
    return send_from_directory('.', 'index.html')

@app.route('/api/auth/user')
def get_current_user():
    """Obtenir les informations de l'utilisateur actuel via session Google"""
    if 'user_id' in session and 'google_id' in session:
        # Récupérer les informations utilisateur depuis la session
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

    # Utilisateur non authentifié
    return jsonify({
        'authenticated': False,
        'user': None
    })

@app.route('/api/contexts', methods=['GET'])
def get_contexts():
    """Obtenir les contextes de voyage de l'utilisateur"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    # Cette fonctionnalité n'est plus utilisée car nous utilisons Replit Database
    # pour stocker les données utilisateur directement
    return jsonify([])

@app.route('/api/contexts', methods=['POST'])
def save_context():
    """Sauvegarder un nouveau contexte de voyage (obsolète)"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401
    return jsonify({'message': 'Cette fonctionnalité n\'est plus utilisée'}), 200

@app.route('/api/contexts/<int:context_id>', methods=['GET'])
def get_context(context_id):
    """Obtenir un contexte de voyage spécifique (obsolète)"""
    return jsonify({'error': 'Cette fonctionnalité n\'est plus utilisée'}), 404

@app.route('/api/contexts/<int:context_id>', methods=['PUT'])
def update_context(context_id):
    """Mettre à jour un contexte de voyage (obsolète)"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401
    return jsonify({'message': 'Cette fonctionnalité n\'est plus utilisée'}), 200

@app.route('/api/contexts/<int:context_id>', methods=['DELETE'])
def delete_context(context_id):
    """Supprimer un contexte de voyage (obsolète)"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401
    return jsonify({'message': 'Cette fonctionnalité n\'est plus utilisée'}), 200

@app.route('/api/contexts/<int:context_id>/share', methods=['POST'])
def share_context(context_id):
    """Partager un contexte de voyage (obsolète)"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401
    return jsonify({'message': 'Cette fonctionnalité n\'est plus utilisée'}), 200

@app.route('/shared/<share_token>')
def view_shared_context(share_token):
    """Voir un contexte partagé (obsolète)"""
    return "Cette fonctionnalité n'est plus disponible", 404

@app.route('/api/user/data', methods=['GET'])
def get_user_data():
    """Obtenir les données personnelles de l'utilisateur (lieux, régions, etc.)"""
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    # Récupérer le préfixe d'environnement
    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']
    
    user_data = db_manager.get_user_data(google_id, env_prefix)
    
    # Si aucune donnée n'existe, créer un jeu de données vide
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

@app.route('/api/user/data/debug', methods=['GET'])
def debug_user_data():
    """Endpoint de debug pour visualiser les données cloud brutes"""
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    # Récupérer le préfixe d'environnement
    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']
    
    user_data = db_manager.get_user_data(google_id, env_prefix)

    if user_data is None:
        return jsonify({
            'status': 'empty',
            'message': 'Aucune donnée cloud trouvée pour cet utilisateur',
            'google_id': google_id
        })

    # Formater en texte lisible
    raw_json_text = json.dumps(user_data, indent=2, ensure_ascii=False)

    return jsonify({
        'status': 'ok',
        'google_id': google_id,
        'created_at': user_data.get('_saved_at', 'unknown'),
        'updated_at': user_data.get('_saved_at', 'unknown'),
        'data_summary': {
            'locations_count': len(user_data.get('locations', {}).get('locations', [])),
            'regions_count': len(user_data.get('regions', {}).get('regions', [])),
            'maps_count': len(user_data.get('settings', {}).get('availableMaps', [])),
            'has_calendar': 'calendar' in user_data,
            'has_settings': 'settings' in user_data,
            'has_journal': 'journal' in user_data,
            'has_position': 'position' in user_data,
            'has_filtersByMap': 'filtersByMap' in user_data,
            'filtersByMap_count': len(user_data.get('filtersByMap', {}))
        },
        'full_data': user_data,
        'raw_json_text': raw_json_text,
        'raw_json_size': len(json.dumps(user_data))
    })

@app.route('/api/user/data', methods=['PUT'])
def update_user_data():
    """Mettre à jour les données personnelles de l'utilisateur"""
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    data = request.json
    if not data:
        return jsonify({'error': 'Données manquantes'}), 400

    # Récupérer le préfixe d'environnement
    env_prefix = request.args.get('env', 'prod_')
    google_id = session['google_id']
    
    # Gérer les conflits de synchronisation
    force_overwrite = data.get('_force_overwrite', False)
    
    if not force_overwrite:
        # Vérifier les données existantes
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
    
    # Sauvegarder les données
    db_manager.save_user_data(google_id, data, env_prefix)
    
    print(f"✅ Données sauvegardées pour {google_id} ({env_prefix})")
    return jsonify({'success': True, 'conflict_detected': False}), 200

# Routes pour servir les fichiers statiques existants
@app.route('/<path:filename>')
def serve_static(filename):
    """Servir les fichiers statiques (images, JSON, etc.)"""
    # Pour les uploads, on utilise serve_uploaded_file
    if filename.startswith('uploads/'):
        return send_from_directory('.', filename)
    
    # S'assurer que les fichiers JavaScript sont servis avec le bon Content-Type
    if filename.endswith('.js'):
        return send_from_directory('.', filename, mimetype='application/javascript')
    
    return send_from_directory('.', filename)

@app.route('/auth')
def auth_panel():
    """Panneau d'authentification"""
    return render_template('auth_panel.html')

@app.route('/auth/google')
def google_auth():
    """Initier l'authentification Google"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return redirect('/?error=oauth_not_configured')

    # Utiliser url_for avec _external=True pour générer l'URL complète en HTTPS
    redirect_uri = url_for('google_auth_callback', _external=True, _scheme='https')

    print(f"🔑 OAuth Init - Host: {request.host}")
    print(f"🔑 Redirect URI: {redirect_uri}")

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri]
            }
        },
        scopes=[
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile', 
            'openid'
        ]
    )
    flow.redirect_uri = redirect_uri

    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='select_account'
    )

    session['state'] = state
    session.permanent = True

    print(f"🔑 Authorization URL: {authorization_url}")
    print(f"🔑 State: {state}")
    return redirect(authorization_url)

@app.route('/auth/test')
def test_oauth():
    """Test du processus OAuth étape par étape"""
    try:
        # Test 1: Configuration
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
            return jsonify({
                'step': 'configuration',
                'status': 'error',
                'message': 'Google Client ID ou Secret manquant'
            })

        # Test 2: Construction de l'URI de redirection
        redirect_uri = url_for('google_auth_callback', _external=True, _scheme='https')

        # Test 3: Création du flow OAuth
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=[
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile', 
                'openid'
            ]
        )
        flow.redirect_uri = redirect_uri

        # Test 4: Génération de l'URL d'autorisation
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='select_account'
        )

        return jsonify({
            'step': 'oauth_flow_creation',
            'status': 'success',
            'redirect_uri': redirect_uri,
            'authorization_url': authorization_url,
            'state': state,
            'flow_configured': True
        })

    except Exception as e:
        return jsonify({
            'step': 'error',
            'status': 'error',
            'message': str(e),
            'error_type': type(e).__name__
        })

@app.route('/auth/google/callback')
def google_auth_callback():
    """Callback Google OAuth"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        print("❌ Configuration OAuth manquante")
        return redirect('/?error=oauth_not_configured')

    try:
        # Vérifier si l'utilisateur est déjà authentifié
        if 'user_id' in session and 'google_id' in session:
            print(f"✅ Utilisateur déjà authentifié (user_id: {session['user_id']}), redirection vers /")
            return redirect('/')

        # Utiliser url_for avec _external=True pour générer l'URL complète en HTTPS
        redirect_uri = url_for('google_auth_callback', _external=True, _scheme='https')

        # Construire l'URL de réponse complète avec HTTPS
        auth_response = request.url.replace('http://', 'https://')

        print(f"🔑 OAuth Callback - Host: {request.host}")
        print(f"🔑 Redirect URI: {redirect_uri}")
        print(f"🔑 Auth Response: {auth_response}")
        print(f"🔑 Session state: {session.get('state')}")
        print(f"🔑 Request args: {dict(request.args)}")
        print(f"🔑 Session cookies: {request.cookies}")

        # Vérifier s'il y a une erreur dans les paramètres de retour
        if 'error' in request.args:
            error_desc = request.args.get('error_description', 'Erreur inconnue')
            print(f"❌ Erreur OAuth reçue: {request.args.get('error')} - {error_desc}")
            return redirect(f'/?auth_error=google_error&desc={error_desc}')

        # Vérifier l'état de la session
        if 'state' not in session:
            print("❌ Erreur: Aucun état dans la session")
            print(f"❌ Session disponible: {dict(session)}")
            return redirect('/?auth_error=no_session_state')

        if request.args.get('state') != session['state']:
            print(f"❌ Erreur: État de session invalide. Session: {session.get('state')}, Request: {request.args.get('state')}")
            return redirect('/?auth_error=invalid_state')

        # Vérifier qu'on a bien le code d'autorisation
        if 'code' not in request.args:
            print("❌ Erreur: Code d'autorisation manquant")
            return redirect('/?auth_error=no_auth_code')

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=[
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile', 
                'openid'
            ],
            state=session['state']
        )
        flow.redirect_uri = redirect_uri

        print(f"🔑 Tentative fetch_token avec auth_response: {auth_response}")

        # Obtenir les tokens
        flow.fetch_token(authorization_response=auth_response)

        print(f"🔑 Token obtenu, vérification ID token...")

        # Vérifier l'ID token
        idinfo = id_token.verify_oauth2_token(
            flow.credentials.id_token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )

        print(f"🔑 ID Token vérifié: {idinfo}")

        # Créer ou récupérer l'utilisateur
        user = get_or_create_user(
            google_id=idinfo['sub'],
            name=idinfo.get('name'),
            email=idinfo.get('email')
        )

        # Nettoyer et configurer la session utilisateur
        session.clear()  # Nettoyer l'ancienne session
        session.permanent = True
        session['user_id'] = user['id']
        session['google_id'] = idinfo['sub']
        session['user_picture'] = idinfo.get('picture')
        session['authenticated'] = True
        session['user_name'] = idinfo.get('name')
        session['user_email'] = idinfo.get('email')

        print(f"✅ Utilisateur authentifié: {user['name']} ({user['email']})")
        print(f"✅ Session configurée pour user_id: {session['user_id']}")
        print(f"✅ Session complète: {dict(session)}")

        return redirect('/')

    except Exception as e:
        print(f"❌ Erreur OAuth Google: {e}")
        print(f"❌ Type d'erreur: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return redirect(f'/?auth_error=exception&msg={str(e)[:100]}')

@app.route('/auth/logout')
def logout():
    """Déconnexion"""
    session.clear()
    return redirect('/login')

@app.route('/auth/debug')
def auth_debug():
    """Debug des variables d'environnement OAuth"""
    # Reproduire exactement la même logique que dans les routes auth
    redirect_uri = url_for('google_auth_callback', _external=True, _scheme='https')

    return jsonify({
        'host': request.host,
        'url_root': request.url_root,
        'google_client_id_set': bool(GOOGLE_CLIENT_ID),
        'google_client_secret_set': bool(GOOGLE_CLIENT_SECRET),
        'google_client_id_prefix': GOOGLE_CLIENT_ID[:20] + '...' if GOOGLE_CLIENT_ID else 'Not set',
        'x_forwarded_proto': request.headers.get('X-Forwarded-Proto'),
        'redirect_uri': redirect_uri,
        'session_keys': list(session.keys()),
        'session_content': {k: str(v)[:100] + '...' if len(str(v)) > 100 else str(v) for k, v in session.items()},
        'scheme': request.scheme,
        'is_secure': request.is_secure,
        'environ_server_name': os.environ.get('SERVER_NAME'),
        'environ_server_port': os.environ.get('SERVER_PORT'),
        'wsgi_url_scheme': request.environ.get('wsgi.url_scheme'),
        'request_scheme': request.environ.get('REQUEST_SCHEME'),
        'server_port': request.environ.get('SERVER_PORT'),
        'flask_config': {
            'PREFERRED_URL_SCHEME': app.config.get('PREFERRED_URL_SCHEME'),
            'SESSION_COOKIE_SECURE': app.config.get('SESSION_COOKIE_SECURE')
        },
        'all_headers': dict(request.headers),
        'url_components': {
            'scheme': request.scheme,
            'netloc': request.host,
            'full_url': request.url
        },
        'google_oauth_config': {
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret_present': bool(GOOGLE_CLIENT_SECRET),
            'expected_redirect_uri': redirect_uri,
            'oauth_insecure_transport': os.environ.get('OAUTHLIB_INSECURE_TRANSPORT')
        }
    })

@app.route('/auth/session-test')
def session_test():
    """Test de persistance de session"""
    if 'test_counter' not in session:
        session['test_counter'] = 0
    session['test_counter'] += 1
    session.permanent = True

    return jsonify({
        'session_works': True,
        'counter': session['test_counter'],
        'session_id': request.cookies.get('session'),
        'all_session_data': dict(session),
        'cookie_domain': app.config.get('SESSION_COOKIE_DOMAIN'),
        'cookie_secure': app.config.get('SESSION_COOKIE_SECURE')
    })

@app.route('/api/environment')
def get_environment():
    """Déterminer l'environnement actuel (dev ou prod)"""
    # PRIORITÉ 1 : Variable d'environnement ENV explicite (à configurer dans Secrets)
    env_override = os.environ.get('ENV', '').lower()
    if env_override in ['production', 'prod']:
        print("🌍 Environnement forcé à PRODUCTION via ENV")
        return jsonify({
            'environment': 'production',
            'prefix': 'prod_',
            'is_deployment': True,
            'detection_method': {
                'source': 'ENV variable',
                'value': env_override
            }
        })
    elif env_override in ['development', 'dev']:
        print("🌍 Environnement forcé à DEVELOPMENT via ENV")
        return jsonify({
            'environment': 'development',
            'prefix': 'dev_',
            'is_deployment': False,
            'detection_method': {
                'source': 'ENV variable',
                'value': env_override
            }
        })
    
    # PRIORITÉ 2 : Détection automatique basée sur plusieurs facteurs
    # Méthode 1 : REPLIT_DEPLOYMENT est défini à "1" lors d'un déploiement Replit
    is_deployment_var = os.environ.get('REPLIT_DEPLOYMENT') == '1'
    
    # Méthode 2 : Vérifier le hostname - les déploiements utilisent .replit.app
    hostname = request.host
    is_production_domain = '.replit.app' in hostname
    
    # Méthode 3 : Vérifier la présence de REPLIT_DEV_DOMAIN (seulement en dev)
    is_dev_domain = os.environ.get('REPLIT_DEV_DOMAIN') is not None
    
    # On est en production si :
    # - REPLIT_DEPLOYMENT=1 OU
    # - hostname contient .replit.app ET pas de REPLIT_DEV_DOMAIN
    is_deployment = is_deployment_var or (is_production_domain and not is_dev_domain)
    
    env_prefix = 'prod_' if is_deployment else 'dev_'
    
    print(f"🌍 Détection automatique : {'PRODUCTION' if is_deployment else 'DEVELOPMENT'}")
    
    return jsonify({
        'environment': 'production' if is_deployment else 'development',
        'prefix': env_prefix,
        'is_deployment': is_deployment,
        'detection_method': {
            'deployment_var': is_deployment_var,
            'production_domain': is_production_domain,
            'dev_domain': is_dev_domain,
            'hostname': hostname
        }
    })

@app.route('/api/gemini/config')
def get_gemini_config():
    """Obtenir la configuration Gemini API"""
    return jsonify({
        'api_key_configured': bool(GOOGLE_API_KEY),
        'api_key': GOOGLE_API_KEY if GOOGLE_API_KEY else None
    })

@app.route('/api/gemini/generate', methods=['POST'])
def generate_with_gemini():
    """Générer du contenu avec l'API Gemini"""
    if not GOOGLE_API_KEY:
        return jsonify({'error': 'Clé API Gemini non configurée'}), 500

    try:
        data = request.json
        if not data or 'prompt' not in data:
            return jsonify({'error': 'Prompt manquant'}), 400

        prompt = data['prompt']
        generation_type = data.get('type', 'description')

        # Construire la requête pour l'API Gemini
        api_model = 'gemini-2.0-flash-exp'
        api_url = f'https://generativelanguage.googleapis.com/v1beta/models/{api_model}:generateContent?key={GOOGLE_API_KEY}'

        # Payload pour l'API Gemini
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}]
                }
            ]
        }

        # Appel à l'API Gemini
        import requests as http_requests

        response = http_requests.post(
            api_url,
            headers={'Content-Type': 'application/json'},
            json=payload,
            timeout=30
        )

        if not response.ok:
            error_details = response.text
            print(f"❌ Erreur API Gemini {response.status_code}: {error_details}")
            return jsonify({
                'error': f'Erreur API Gemini: {response.status_code}',
                'details': error_details
            }), 500

        result = response.json()

        # Extraire le contenu généré
        if (result.get('candidates') and 
            len(result['candidates']) > 0 and 
            result['candidates'][0].get('content') and
            result['candidates'][0]['content'].get('parts') and
            len(result['candidates'][0]['content']['parts']) > 0):

            generated_content = result['candidates'][0]['content']['parts'][0]['text']

            # Enregistrer l'usage API si l'utilisateur est connecté
            if 'user_id' in session:
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO api_usage (user_id, endpoint, tokens_used) VALUES (?, ?, ?)',
                    (session['user_id'], 'gemini/generate', len(prompt))
                )
                conn.commit()
                conn.close()

            return jsonify({
                'success': True,
                'content': generated_content,
                'type': generation_type
            })
        else:
            return jsonify({
                'error': 'Réponse invalide de l\'API Gemini',
                'details': result
            }), 500

    except Exception as e:
        print(f"❌ Erreur lors de la génération Gemini: {e}")
        return jsonify({
            'error': f'Erreur serveur: {str(e)}'
        }), 500

@app.route('/api/gemini/test')
def test_gemini_api():
    """Test direct de l'API Gemini avec informations de debug"""
    if not GOOGLE_API_KEY:
        return jsonify({'error': 'GOOGLE_API_KEY not configured'}), 500

    try:
        api_model = 'gemini-2.0-flash-exp'
        api_url = f'https://generativelanguage.googleapis.com/v1beta/models/{api_model}:generateContent?key={GOOGLE_API_KEY}'

        payload = {
            "contents": [
                {
                    "role": "user", 
                    "parts": [{"text": "Dis juste 'Hello' en réponse."}]
                }
            ]
        }

        response = requests.post(
            api_url,
            headers={'Content-Type': 'application/json'},
            json=payload,
            timeout=10
        )

        return jsonify({
            'status_code': response.status_code,
            'response_text': response.text[:500],
            'api_key_prefix': GOOGLE_API_KEY[:10] + '...',
            'request_url': api_url.replace(GOOGLE_API_KEY, '[API_KEY]'),
            'success': response.ok
        })

    except Exception as e:
        return jsonify({'error': str(e), 'error_type': type(e).__name__}), 500

@app.route('/api/upload/image', methods=['POST'])
def upload_image():
    """Upload d'une image vers Replit Object Storage avec association au user"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    try:
        # Vérifier qu'un fichier a été envoyé
        if 'file' not in request.files:
            return jsonify({'error': 'Aucun fichier fourni'}), 400

        file = request.files['file']

        # Vérifier qu'un fichier a été sélectionné
        if file.filename == '':
            return jsonify({'error': 'Aucun fichier sélectionné'}), 400

        # Vérifier l'extension du fichier
        if not allowed_file(file.filename):
            return jsonify({
                'error': f'Type de fichier non autorisé. Extensions autorisées: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}'
            }), 400

        # Vérifier la taille du fichier
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'error': f'Fichier trop volumineux. Taille maximale: {MAX_FILE_SIZE // (1024*1024)}MB'
            }), 400

        # Obtenir la catégorie depuis les paramètres
        category = request.form.get('category', 'general')
        if category not in ['locations', 'regions', 'general', 'maps']:
            category = 'general'

        # Générer un nom de fichier unique avec google_id
        google_id = session['google_id']
        filename_base = secure_filename(file.filename)
        
        # Déterminer le format et l'extension
        img_format = Image.open(file).format
        file.seek(0)
        
        ext = get_file_extension(filename_base)
        if not ext:
            ext = mimetypes.guess_extension(file.content_type) or 'bin'

        # Générer le nom de fichier unique
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())
        final_filename = f"{timestamp}_{unique_id}.{ext}"
        
        # Chemin dans Object Storage: google_id/category/filename
        object_path = f"{google_id}/{category}/{final_filename}"

        # Redimensionner si la catégorie est 'maps'
        width, height = None, None
        image_data = None
        content_type = file.content_type
        
        if category == 'maps':
            print(f"🗺️ Redimensionnement de la carte '{filename_base}' à 5000px de largeur...")
            try:
                resized_buffer, target_width, target_height, saved_format = resize_map_image(file, target_width=5000)
                
                # Déterminer l'extension basée sur le format de sauvegarde
                if saved_format == 'JPEG': 
                    ext = 'jpg'
                    content_type = 'image/jpeg'
                elif saved_format == 'PNG': 
                    ext = 'png'
                    content_type = 'image/png'
                elif saved_format in ['WEBP', 'WebP']: 
                    ext = 'webp'
                    content_type = 'image/webp'
                
                final_filename = f"{timestamp}_{unique_id}.{ext}"
                object_path = f"{google_id}/{category}/{final_filename}"
                image_data = resized_buffer.read()
                
                width, height = target_width, target_height
                print(f"✅ Carte redimensionnée: {final_filename} ({width}x{height}px)")

            except Exception as resize_e:
                print(f"❌ Erreur lors du redimensionnement de la carte: {resize_e}")
                return jsonify({
                    'error': f"Erreur lors du redimensionnement de la carte: {str(resize_e)}"
                }), 500
        else:
            # Pour les autres types d'images
            image_data = file.read()
            with Image.open(io.BytesIO(image_data)) as img:
                width, height = img.size

        # Option d'upload Base64 pour petites images seulement
        use_base64 = request.form.get('use_base64', 'false').lower() == 'true'
        
        if use_base64 and len(image_data) < 100 * 1024:
            # Encoder l'image en Base64 et stocker dans Replit Database
            import base64
            base64_data = base64.b64encode(image_data).decode('utf-8')
            data_uri = f"data:{content_type};base64,{base64_data}"
            
            # Stocker dans Replit Database avec un ID unique
            image_id = f"img_{google_id}_{category}_{timestamp}_{unique_id}"
            db_manager.db[image_id] = {
                'data_uri': data_uri,
                'filename': final_filename,
                'category': category,
                'width': width,
                'height': height,
                'size': len(image_data),
                'user_id': session['user_id'],
                'created_at': datetime.now().isoformat()
            }
            
            public_url = data_uri
            print(f"💾 Image stockée en Base64 dans Replit Database: {image_id}")
            
            return jsonify({
                'success': True,
                'url': public_url,
                'filename': final_filename,
                'size': len(image_data),
                'user_id': session['user_id'],
                'category': category,
                'width': width,
                'height': height,
                'storage': 'replit_database_base64',
                'message': 'Image stockée en Base64 (< 100KB)'
            })
        
        # Stockage dans le système de fichiers local persistant
        upload_dir = f'uploads/{google_id}/{category}'
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, final_filename)
        
        with open(file_path, 'wb') as f:
            f.write(image_data)
        
        public_url = f'/uploads/{google_id}/{category}/{final_filename}'
        print(f"📁 Image sauvegardée: {file_path}")
        print(f"✅ Stockage local persistant (accessible en dev et prod)")

        return jsonify({
            'success': True,
            'url': public_url,
            'filename': final_filename,
            'size': len(image_data),
            'user_id': session['user_id'],
            'category': category,
            'width': width,
            'height': height,
            'storage': 'local_persistent',
            'message': 'Image uploadée avec succès (stockage local persistant)'
        })

    except Exception as e:
        print(f"❌ Erreur lors de l'upload: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Erreur serveur: {str(e)}'
        }), 500

@app.route('/uploads/<path:filepath>')
def serve_uploaded_file(filepath):
    """Servir les images depuis le système de fichiers local persistant"""
    if os.path.exists(os.path.join('uploads', filepath)):
        return send_from_directory('uploads', filepath)
    else:
        return jsonify({'error': 'Image non trouvée'}), 404

# Endpoint /api/image/create-thumbnail supprimé - Plus besoin de créer des vignettes séparées
# Les images sont désormais utilisées directement comme vignettes via le marquage de type

@app.route('/api/images/library', methods=['GET'])
def get_image_library():
    """Récupérer toutes les images de l'utilisateur authentifié, organisées par dossiers"""
    if 'user_id' not in session or 'google_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    try:
        user_id = session['user_id']
        google_id = session['google_id']

        # Chercher le répertoire basé sur le google_id
        user_dir = f'uploads/{google_id}'

        print(f"📂 [LIBRARY DEBUG] Lecture du répertoire: {user_dir}")
        
        if not os.path.exists(user_dir):
            print(f"⚠️ [LIBRARY DEBUG] Le répertoire {user_dir} n'existe pas")
            return jsonify({
                'success': True,
                'folders': {},
                'total': 0,
                'message': 'Aucune image trouvée'
            })

        print(f"✅ [LIBRARY DEBUG] Le répertoire {user_dir} existe")

        # Fonction récursive pour parcourir l'arborescence
        def scan_directory(base_path, relative_path=''):
            """Parcourt récursivement un répertoire et retourne la structure"""
            structure = {}
            full_path = os.path.join(base_path, relative_path) if relative_path else base_path
            
            print(f"🔍 [LIBRARY DEBUG] Scan de: {full_path}")
            
            try:
                items = os.listdir(full_path)
                print(f"📋 [LIBRARY DEBUG] Contenu de {full_path}: {items}")
                
                for item in items:
                    item_path = os.path.join(full_path, item)
                    relative_item_path = os.path.join(relative_path, item) if relative_path else item
                    
                    if os.path.isdir(item_path):
                        print(f"📁 [LIBRARY DEBUG] Dossier trouvé: {relative_item_path}")
                        # Récursivement scanner les sous-dossiers
                        sub_structure = scan_directory(base_path, relative_item_path)
                        if sub_structure:
                            structure.update(sub_structure)
                    elif os.path.isfile(item_path):
                        # Vérifier si c'est une image
                        if any(item.lower().endswith(ext) for ext in ALLOWED_IMAGE_EXTENSIONS):
                            print(f"🖼️ [LIBRARY DEBUG] Image trouvée: {relative_item_path}")
                            
                            # Ajouter l'image au dossier approprié
                            folder_key = relative_path if relative_path else 'root'
                            
                            if folder_key not in structure:
                                structure[folder_key] = []
                            
                            # Construire l'URL publique
                            public_url = f'/uploads/{google_id}/{relative_item_path}'
                            
                            # Récupérer la taille du fichier
                            file_size = os.path.getsize(item_path)
                            
                            # Obtenir les dimensions de l'image
                            width, height = None, None
                            try:
                                with Image.open(item_path) as img:
                                    width, height = img.size
                            except Exception as img_e:
                                print(f"⚠️ [LIBRARY DEBUG] Impossible de lire les dimensions de {item_path}: {img_e}")
                            
                            structure[folder_key].append({
                                'filename': item,
                                'url': public_url,
                                'category': relative_path,
                                'size': file_size,
                                'width': width,
                                'height': height
                            })
                        else:
                            print(f"⏭️ [LIBRARY DEBUG] Fichier ignoré (non-image): {relative_item_path}")
                
            except Exception as scan_e:
                print(f"❌ [LIBRARY DEBUG] Erreur lors du scan de {full_path}: {scan_e}")
            
            return structure

        # Scanner l'arborescence complète
        folders = scan_directory(user_dir)
        
        print(f"📊 [LIBRARY DEBUG] Structure complète des dossiers:")
        for folder_path, images in folders.items():
            print(f"  📁 {folder_path}: {len(images)} image(s)")

        total_images = sum(len(images) for images in folders.values())
        print(f"📚 [LIBRARY DEBUG] Total: {total_images} image(s) dans {len(folders)} dossier(s) pour {google_id}")

        return jsonify({
            'success': True,
            'folders': folders,
            'total': total_images
        })

    except Exception as e:
        print(f"❌ Erreur lors de la récupération de la bibliothèque: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Erreur serveur: {str(e)}'
        }), 500

@app.route('/api/storage/status')
def storage_status():
    """Vérifier le statut du système de stockage"""
    return jsonify({
        'storage_available': False,
        'storage_client_initialized': False,
        'bucket_name': None,
        'bucket_configured': False,
        'using_object_storage': False,
        'using_local_storage': True,
        'message': 'Stockage local persistant actif (pas d\'Object Storage)'
    })

@app.route('/auth/verify-config')
def verify_oauth_config():
    """Vérifier la configuration OAuth avec Google"""
    try:
        redirect_uri = url_for('google_auth_callback', _external=True, _scheme='https')

        # Test de base de la configuration
        if not GOOGLE_CLIENT_ID:
            return jsonify({'error': 'GOOGLE_CLIENT_ID manquant', 'status': 'error'}), 400

        if not GOOGLE_CLIENT_SECRET:
            return jsonify({'error': 'GOOGLE_CLIENT_SECRET manquant', 'status': 'error'}), 400

        # Test de création du flow OAuth
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=[
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile', 
                'openid'
            ]
        )

        return jsonify({
            'status': 'success',
            'message': 'Configuration OAuth valide',
            'redirect_uri': redirect_uri,
            'client_id': GOOGLE_CLIENT_ID,
            'scopes': [
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile', 
                'openid'
            ]
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Erreur de configuration OAuth: {str(e)}',
            'error_type': type(e).__name__
        }), 500

if __name__ == '__main__':
    print("🚀 Serveur Flask démarré avec Replit Database")
    print("🔑 Prêt pour l'authentification Google et la gestion des données utilisateur")

    # Configuration HTTPS pour Replit
    app.config['PREFERRED_URL_SCHEME'] = 'https'

    # Configuration des cookies de session pour Replit
    if os.environ.get('REPLIT_DEV_DOMAIN'):
        # En développement, cookies moins stricts
        app.config['SESSION_COOKIE_SECURE'] = False
        app.config['SESSION_COOKIE_HTTPONLY'] = True
        app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    else:
        # En production, cookies sécurisés
        app.config['SESSION_COOKIE_SECURE'] = True
        app.config['SESSION_COOKIE_HTTPONLY'] = True
        app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

    # Configuration pour éviter les cookies dupliqués
    app.config['SESSION_COOKIE_PATH'] = '/'
    app.config['SESSION_COOKIE_NAME'] = 'tor_journey_session'
    app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 heures

    # Configuration pour production et développement
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('REPLIT_DEV_DOMAIN') is not None

    print(f"🌐 Démarrage sur le port {port} (debug: {debug})")
    print(f"🔧 Variables d'environnement: PORT={os.environ.get('PORT')}, REPLIT_DEV_DOMAIN={os.environ.get('REPLIT_DEV_DOMAIN')}")
    print(f"🔧 Configuration OAuth: CLIENT_ID={GOOGLE_CLIENT_ID[:20] if GOOGLE_CLIENT_ID else 'Not Set'}..., SECRET_SET={bool(GOOGLE_CLIENT_SECRET)}")
    app.run(host='0.0.0.0', port=port, debug=debug)