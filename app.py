from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from werkzeug.middleware.proxy_fix import ProxyFix
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google_auth_oauthlib.flow import Flow
import sqlite3
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

app = Flask(__name__)

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
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

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

# Configuration de la base de données
DATABASE = 'travel_contexts.db'

def init_db():
    """Initialiser la base de données avec les tables nécessaires"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # Table des utilisateurs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            google_id TEXT UNIQUE,
            email TEXT,
            name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Migration : Vérifier et corriger le schéma de la table users
    try:
        # Vérifier si la colonne google_id existe
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'google_id' not in columns:
            print("🔧 Migration nécessaire : recréation de la table users avec google_id")
            
            # Sauvegarder les données existantes
            cursor.execute("SELECT * FROM users")
            existing_users = cursor.fetchall()
            
            # Supprimer l'ancienne table
            cursor.execute("DROP TABLE IF EXISTS users")
            
            # Recréer la table avec le bon schéma
            cursor.execute('''
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    google_id TEXT UNIQUE,
                    email TEXT,
                    name TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Restaurer les données existantes (sans google_id pour l'instant)
            for user in existing_users:
                if len(user) >= 5:  # Ancien format avec replit_user_id
                    cursor.execute(
                        'INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)',
                        (user[0], user[3] if len(user) > 3 else None, user[4] if len(user) > 4 else None, user[5] if len(user) > 5 else datetime.now())
                    )
                else:  # Format simple
                    cursor.execute(
                        'INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)',
                        (user[0], user[2] if len(user) > 2 else None, user[3] if len(user) > 3 else None, user[4] if len(user) > 4 else datetime.now())
                    )
            
            print("✅ Table users recréée avec succès avec la colonne google_id")
        else:
            print("ℹ️  Colonne google_id existe déjà")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Erreur lors de la migration de la table users: {e}")

    # Table des contextes de voyage
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS travel_contexts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            data_json TEXT NOT NULL,
            shared BOOLEAN DEFAULT 0,
            share_token TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # Table de l'usage API
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            endpoint TEXT,
            tokens_used INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    conn.commit()
    conn.close()

def get_db_connection():
    """Obtenir une connexion à la base de données"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def allowed_file(filename):
    """Vérifier si le fichier a une extension autorisée"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

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
    conn = get_db_connection()

    user = conn.execute(
        'SELECT * FROM users WHERE google_id = ?', 
        (google_id,)
    ).fetchone()

    if user is None:
        # Créer un nouvel utilisateur
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO users (google_id, name, email) VALUES (?, ?, ?)',
            (google_id, name, email)
        )
        user_id = cursor.lastrowid
        conn.commit()

        user = conn.execute(
            'SELECT * FROM users WHERE id = ?', 
            (user_id,)
        ).fetchone()

    conn.close()
    return dict(user)

@app.route('/')
def index():
    """Page principale - servir l'interface existante"""
    return send_from_directory('.', 'index.html')

@app.route('/api/auth/user')
def get_current_user():
    """Obtenir les informations de l'utilisateur actuel via session Google"""
    if 'user_id' in session and 'google_id' in session:
        conn = get_db_connection()
        user = conn.execute(
            'SELECT * FROM users WHERE id = ?', 
            (session['user_id'],)
        ).fetchone()
        conn.close()

        if user:
            user_data = dict(user)
            # Ajouter la photo de profil stockée en session si disponible
            if 'user_picture' in session:
                user_data['picture'] = session['user_picture']
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

    conn = get_db_connection()
    contexts = conn.execute(
        'SELECT id, name, created_at, updated_at, shared FROM travel_contexts WHERE user_id = ? ORDER BY updated_at DESC',
        (session['user_id'],)
    ).fetchall()
    conn.close()

    return jsonify([dict(ctx) for ctx in contexts])

@app.route('/api/contexts', methods=['POST'])
def save_context():
    """Sauvegarder un nouveau contexte de voyage"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    data = request.json
    name = data.get('name', 'Contexte sans nom')
    context_data = data.get('data', {})

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO travel_contexts (user_id, name, data_json, updated_at) VALUES (?, ?, ?, ?)',
        (session['user_id'], name, json.dumps(context_data), datetime.now())
    )
    context_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({'id': context_id, 'message': 'Contexte sauvegardé avec succès'})

@app.route('/api/contexts/<int:context_id>', methods=['GET'])
def get_context(context_id):
    """Obtenir un contexte de voyage spécifique"""
    conn = get_db_connection()

    # Vérifier si c'est un contexte partagé ou appartenant à l'utilisateur
    if 'user_id' in session:
        context = conn.execute(
            'SELECT * FROM travel_contexts WHERE id = ? AND (user_id = ? OR shared = 1)',
            (context_id, session['user_id'])
        ).fetchone()
    else:
        # Contexte partagé seulement
        context = conn.execute(
            'SELECT * FROM travel_contexts WHERE id = ? AND shared = 1',
            (context_id,)
        ).fetchone()

    conn.close()

    if context is None:
        return jsonify({'error': 'Contexte non trouvé'}), 404

    context_dict = dict(context)
    context_dict['data'] = json.loads(context_dict['data_json'])
    del context_dict['data_json']

    return jsonify(context_dict)

@app.route('/api/contexts/<int:context_id>', methods=['PUT'])
def update_context(context_id):
    """Mettre à jour un contexte de voyage"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    data = request.json
    name = data.get('name')
    context_data = data.get('data')

    conn = get_db_connection()

    # Vérifier que le contexte appartient à l'utilisateur
    context = conn.execute(
        'SELECT * FROM travel_contexts WHERE id = ? AND user_id = ?',
        (context_id, session['user_id'])
    ).fetchone()

    if context is None:
        conn.close()
        return jsonify({'error': 'Contexte non trouvé ou accès refusé'}), 403

    # Mettre à jour
    cursor = conn.cursor()
    if name and context_data:
        cursor.execute(
            'UPDATE travel_contexts SET name = ?, data_json = ?, updated_at = ? WHERE id = ?',
            (name, json.dumps(context_data), datetime.now(), context_id)
        )
    elif name:
        cursor.execute(
            'UPDATE travel_contexts SET name = ?, updated_at = ? WHERE id = ?',
            (name, datetime.now(), context_id)
        )
    elif context_data:
        cursor.execute(
            'UPDATE travel_contexts SET data_json = ?, updated_at = ? WHERE id = ?',
            (json.dumps(context_data), datetime.now(), context_id)
        )

    conn.commit()
    conn.close()

    return jsonify({'message': 'Contexte mis à jour avec succès'})

@app.route('/api/contexts/<int:context_id>', methods=['DELETE'])
def delete_context(context_id):
    """Supprimer un contexte de voyage"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    conn = get_db_connection()

    # Vérifier que le contexte appartient à l'utilisateur
    context = conn.execute(
        'SELECT * FROM travel_contexts WHERE id = ? AND user_id = ?',
        (context_id, session['user_id'])
    ).fetchone()

    if context is None:
        conn.close()
        return jsonify({'error': 'Contexte non trouvé ou accès refusé'}), 403

    # Supprimer le contexte
    cursor = conn.cursor()
    cursor.execute('DELETE FROM travel_contexts WHERE id = ?', (context_id,))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Contexte supprimé avec succès'})

@app.route('/api/contexts/<int:context_id>/share', methods=['POST'])
def share_context(context_id):
    """Partager un contexte de voyage"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    conn = get_db_connection()

    # Vérifier que le contexte appartient à l'utilisateur
    context = conn.execute(
        'SELECT * FROM travel_contexts WHERE id = ? AND user_id = ?',
        (context_id, session['user_id'])
    ).fetchone()

    if context is None:
        conn.close()
        return jsonify({'error': 'Contexte non trouvé ou accès refusé'}), 403

    # Générer un token de partage et activer le partage
    share_token = secrets.token_urlsafe(32)
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE travel_contexts SET shared = 1, share_token = ? WHERE id = ?',
        (share_token, context_id)
    )
    conn.commit()
    conn.close()

    return jsonify({
        'message': 'Contexte partagé avec succès',
        'share_token': share_token,
        'share_url': f'/shared/{share_token}'
    })

@app.route('/shared/<share_token>')
def view_shared_context(share_token):
    """Voir un contexte partagé"""
    conn = get_db_connection()
    context = conn.execute(
        'SELECT * FROM travel_contexts WHERE share_token = ? AND shared = 1',
        (share_token,)
    ).fetchone()
    conn.close()

    if context is None:
        return "Contexte partagé non trouvé", 404

    # Servir l'interface en mode lecture seule
    return send_from_directory('.', 'index.html')

@app.route('/api/user/data', methods=['GET'])
def get_user_data():
    """Obtenir les données personnelles de l'utilisateur (lieux, régions, etc.)"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    conn = get_db_connection()
    
    # Chercher les données utilisateur dans un contexte spécial "user_data"
    user_data = conn.execute(
        'SELECT data_json FROM travel_contexts WHERE user_id = ? AND name = "_user_data_"',
        (session['user_id'],)
    ).fetchone()
    
    conn.close()

    if user_data is None:
        return jsonify({'error': 'Aucune donnée utilisateur trouvée'}), 404

    return jsonify(json.loads(user_data['data_json']))

@app.route('/api/user/data', methods=['PUT'])
def update_user_data():
    """Mettre à jour les données personnelles de l'utilisateur"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    data = request.json
    if not data:
        return jsonify({'error': 'Données manquantes'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Vérifier si un enregistrement de données utilisateur existe déjà
    existing = conn.execute(
        'SELECT id FROM travel_contexts WHERE user_id = ? AND name = "_user_data_"',
        (session['user_id'],)
    ).fetchone()

    if existing:
        # Mettre à jour l'enregistrement existant
        cursor.execute(
            'UPDATE travel_contexts SET data_json = ?, updated_at = ? WHERE user_id = ? AND name = "_user_data_"',
            (json.dumps(data), datetime.now(), session['user_id'])
        )
    else:
        # Créer un nouvel enregistrement
        cursor.execute(
            'INSERT INTO travel_contexts (user_id, name, data_json, updated_at) VALUES (?, ?, ?, ?)',
            (session['user_id'], '_user_data_', json.dumps(data), datetime.now())
        )

    conn.commit()
    conn.close()

    return jsonify({'message': 'Données utilisateur sauvegardées avec succès'})

# Routes pour servir les fichiers statiques existants
@app.route('/<path:filename>')
def serve_static(filename):
    """Servir les fichiers statiques (images, JSON, etc.)"""
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

        return redirect('/?auth_success=1')

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
    return redirect('/')

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
    """Upload d'une image vers Replit Object Storage"""
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
        if category not in ['locations', 'regions', 'general']:
            category = 'general'

        # Générer un nom de fichier unique
        filename = generate_unique_filename(file.filename, category)
        
        # Pour Replit Object Storage, nous utiliserons d'abord le stockage local
        # puis nous pourrons migrer vers Object Storage
        upload_dir = f'uploads/{category}'
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, os.path.basename(filename))
        file.save(file_path)

        # Générer l'URL publique
        public_url = f'/uploads/{category}/{os.path.basename(filename)}'

        # Log de l'upload
        print(f"📸 Image uploadée: {filename} par user {session['user_id']}")

        return jsonify({
            'success': True,
            'url': public_url,
            'filename': os.path.basename(filename),
            'size': file_size,
            'message': 'Image uploadée avec succès'
        })

    except Exception as e:
        print(f"❌ Erreur lors de l'upload: {e}")
        return jsonify({
            'error': f'Erreur serveur: {str(e)}'
        }), 500

@app.route('/uploads/<category>/<filename>')
def serve_uploaded_file(category, filename):
    """Servir les fichiers uploadés"""
    upload_dir = f'uploads/{category}'
    return send_from_directory(upload_dir, filename)

@app.route('/api/image/create-thumbnail', methods=['POST'])
def create_thumbnail():
    """Créer une vignette 100x100 à partir d'une image existante"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non authentifié'}), 401

    try:
        data = request.json
        if not data or 'image_url' not in data or 'category' not in data:
            return jsonify({'error': 'Paramètres manquants'}), 400

        image_url = data['image_url']
        category = data['category']
        
        # Extraire le chemin du fichier depuis l'URL
        # Format attendu: /uploads/category/filename
        if not image_url.startswith('/uploads/'):
            return jsonify({'error': 'URL d\'image invalide'}), 400
        
        parts = image_url.split('/')
        if len(parts) < 4:
            return jsonify({'error': 'Format d\'URL invalide'}), 400
        
        original_category = parts[2]
        original_filename = parts[3]
        original_path = f'uploads/{original_category}/{original_filename}'
        
        if not os.path.exists(original_path):
            return jsonify({'error': 'Fichier source introuvable'}), 404

        # Ouvrir l'image et créer une vignette 100x100
        with Image.open(original_path) as img:
            # Convertir en RGB si nécessaire
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Redimensionner en conservant les proportions puis cropper au centre
            img.thumbnail((100, 100), Image.Resampling.LANCZOS)
            
            # Créer une image carrée de 100x100
            thumbnail = Image.new('RGB', (100, 100), (255, 255, 255))
            offset = ((100 - img.size[0]) // 2, (100 - img.size[1]) // 2)
            thumbnail.paste(img, offset)
            
            # Générer un nom de fichier unique pour la vignette
            thumbnail_filename = f'thumb_{original_filename.rsplit(".", 1)[0]}.png'
            thumbnail_dir = f'uploads/{category}'
            os.makedirs(thumbnail_dir, exist_ok=True)
            thumbnail_path = os.path.join(thumbnail_dir, thumbnail_filename)
            
            # Sauvegarder en PNG
            thumbnail.save(thumbnail_path, 'PNG', optimize=True)
            
            thumbnail_url = f'/uploads/{category}/{thumbnail_filename}'
            
            print(f"📸 Vignette créée: {thumbnail_url}")
            
            return jsonify({
                'success': True,
                'thumbnail_url': thumbnail_url,
                'original_url': image_url,
                'message': 'Vignette créée avec succès'
            })

    except Exception as e:
        print(f"❌ Erreur lors de la création de la vignette: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Erreur serveur: {str(e)}'
        }), 500

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
    init_db()
    print("🚀 Serveur Flask démarré avec base de données SQLite")
    print("📊 Base de données initialisée avec les tables users, travel_contexts, api_usage")
    print("🔑 Prêt pour l'authentification Google et la gestion des contextes de voyage")

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
    print(f"🔧 Configuration OAuth: CLIENT_ID={GOOGLE_CLIENT_ID[:20]}..., SECRET_SET={bool(GOOGLE_CLIENT_SECRET)}")
    app.run(host='0.0.0.0', port=port, debug=debug)