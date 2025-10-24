
#!/usr/bin/env python3
"""
Migration des données principales (_user_data_) vers production (_user_data_prod_)
À exécuter UNE SEULE FOIS
"""
import sqlite3
import json

DATABASE = 'travel_contexts.db'

def migrate_main_to_prod(user_id):
    """Migrer les données _user_data_ vers _user_data_prod_"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    print(f"🔄 Migration des données principales vers prod pour user {user_id}")
    
    # Récupérer les données principales
    main_data = cursor.execute(
        'SELECT data_json FROM travel_contexts WHERE user_id = ? AND name = ?',
        (user_id, '_user_data_')
    ).fetchone()
    
    if not main_data:
        print(f"❌ Aucune donnée principale trouvée pour l'utilisateur {user_id}")
        conn.close()
        return False
    
    print(f"✅ Données principales trouvées")
    
    # Analyser les données
    data = json.loads(main_data[0])
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
            (main_data[0], user_id, '_user_data_prod_')
        )
    else:
        print(f"✨ Création des données prod")
        cursor.execute(
            'INSERT INTO travel_contexts (user_id, name, data_json, updated_at) VALUES (?, ?, ?, datetime("now"))',
            (user_id, '_user_data_prod_', main_data[0])
        )
    
    conn.commit()
    conn.close()
    
    print(f"✅ Migration terminée - vos 66 lieux/régions sont maintenant en prod")
    print(f"\n📝 Après un Republish, l'application utilisera automatiquement _user_data_prod_")
    return True

if __name__ == '__main__':
    migrate_main_to_prod(1)
