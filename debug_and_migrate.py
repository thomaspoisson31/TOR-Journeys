
#!/usr/bin/env python3
"""
Script de diagnostic et migration pour l'environnement de production
"""
import sqlite3
import json
import sys

DATABASE = 'travel_contexts.db'

def check_environment():
    """Vérifier l'environnement actuel"""
    import os
    
    print("=" * 60)
    print("DIAGNOSTIC ENVIRONNEMENT")
    print("=" * 60)
    
    is_deployment = os.environ.get('REPLIT_DEPLOYMENT') == '1'
    replit_dev = os.environ.get('REPLIT_DEV_DOMAIN')
    
    print(f"REPLIT_DEPLOYMENT: {os.environ.get('REPLIT_DEPLOYMENT')}")
    print(f"REPLIT_DEV_DOMAIN: {replit_dev}")
    print(f"Is Deployment: {is_deployment}")
    print(f"Préfixe attendu: {'prod_' if is_deployment else 'dev_'}")
    print()

def list_all_user_data():
    """Lister toutes les données utilisateur dans la DB"""
    print("=" * 60)
    print("DONNÉES UTILISATEUR DANS LA BASE")
    print("=" * 60)
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Récupérer tous les contextes _user_data_
    cursor.execute("""
        SELECT id, user_id, name, created_at, updated_at, length(data_json) as size
        FROM travel_contexts 
        WHERE name LIKE '_user_data_%'
        ORDER BY user_id, name
    """)
    
    rows = cursor.fetchall()
    
    if not rows:
        print("❌ Aucune donnée utilisateur trouvée dans la base")
        conn.close()
        return
    
    for row in rows:
        id_, user_id, name, created, updated, size = row
        print(f"\nID: {id_}")
        print(f"  User ID: {user_id}")
        print(f"  Nom: {name}")
        print(f"  Créé: {created}")
        print(f"  Mis à jour: {updated}")
        print(f"  Taille: {size} bytes")
        
        # Charger et analyser les données
        cursor.execute("SELECT data_json FROM travel_contexts WHERE id = ?", (id_,))
        data_json = cursor.fetchone()[0]
        data = json.loads(data_json)
        
        print(f"  Contenu:")
        print(f"    - Lieux: {len(data.get('locations', {}).get('locations', []))}")
        print(f"    - Régions: {len(data.get('regions', {}).get('regions', []))}")
        print(f"    - Calendrier: {'✓' if 'calendar' in data else '✗'}")
        print(f"    - Position: {'✓' if 'position' in data else '✗'}")
    
    conn.close()
    print()

def migrate_dev_to_prod(user_id):
    """Migrer les données dev vers prod"""
    print("=" * 60)
    print(f"MIGRATION USER {user_id}: dev_ → prod_")
    print("=" * 60)
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Récupérer les données dev
    dev_data = cursor.execute(
        'SELECT data_json FROM travel_contexts WHERE user_id = ? AND name = ?',
        (user_id, '_user_data_dev_')
    ).fetchone()
    
    if not dev_data:
        print(f"❌ Aucune donnée dev trouvée pour l'utilisateur {user_id}")
        conn.close()
        return False
    
    print(f"✅ Données dev trouvées pour user {user_id}")
    
    # Analyser les données
    data = json.loads(dev_data[0])
    print(f"   - {len(data.get('locations', {}).get('locations', []))} lieux")
    print(f"   - {len(data.get('regions', {}).get('regions', []))} régions")
    
    # Vérifier si prod existe déjà
    prod_exists = cursor.execute(
        'SELECT id FROM travel_contexts WHERE user_id = ? AND name = ?',
        (user_id, '_user_data_prod_')
    ).fetchone()
    
    if prod_exists:
        print(f"⚠️  Données prod existantes - mise à jour")
        cursor.execute(
            'UPDATE travel_contexts SET data_json = ?, updated_at = datetime("now") WHERE user_id = ? AND name = ?',
            (dev_data[0], user_id, '_user_data_prod_')
        )
    else:
        print(f"✨ Création des données prod")
        cursor.execute(
            'INSERT INTO travel_contexts (user_id, name, data_json, updated_at) VALUES (?, ?, ?, datetime("now"))',
            (user_id, '_user_data_prod_', dev_data[0])
        )
    
    conn.commit()
    conn.close()
    
    print(f"✅ Migration terminée pour user {user_id}")
    return True

def main():
    """Fonction principale"""
    print("\n🔍 SCRIPT DE DIAGNOSTIC ET MIGRATION\n")
    
    # 1. Vérifier l'environnement
    check_environment()
    
    # 2. Lister toutes les données
    list_all_user_data()
    
    # 3. Demander si on veut migrer
    print("=" * 60)
    print("MIGRATION")
    print("=" * 60)
    
    if len(sys.argv) > 1 and sys.argv[1] == '--migrate':
        # Migration automatique de tous les utilisateurs ayant des données dev
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT DISTINCT user_id 
            FROM travel_contexts 
            WHERE name = '_user_data_dev_'
        """)
        
        user_ids = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        print(f"🔄 Migration automatique pour {len(user_ids)} utilisateur(s)")
        
        for user_id in user_ids:
            migrate_dev_to_prod(user_id)
            print()
    else:
        print("Pour migrer les données dev vers prod, relancez avec:")
        print("  python debug_and_migrate.py --migrate")
    
    print("\n✅ Script terminé\n")

if __name__ == '__main__':
    main()
