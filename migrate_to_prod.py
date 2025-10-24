
```python
import sqlite3
import json

DATABASE = 'travel_contexts.db'

def migrate_dev_to_prod(user_id):
    """Migrer les données dev_ vers prod_ pour un utilisateur"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Récupérer les données dev
    dev_data = cursor.execute(
        'SELECT data_json FROM travel_contexts WHERE user_id = ? AND name = ?',
        (user_id, '_user_data_dev_')
    ).fetchone()
    
    if not dev_data:
        print(f"Aucune donnée dev trouvée pour l'utilisateur {user_id}")
        conn.close()
        return
    
    # Vérifier si prod existe déjà
    prod_exists = cursor.execute(
        'SELECT id FROM travel_contexts WHERE user_id = ? AND name = ?',
        (user_id, '_user_data_prod_')
    ).fetchone()
    
    if prod_exists:
        # Mettre à jour
        cursor.execute(
            'UPDATE travel_contexts SET data_json = ?, updated_at = datetime("now") WHERE user_id = ? AND name = ?',
            (dev_data[0], user_id, '_user_data_prod_')
        )
        print(f"Données prod mises à jour pour l'utilisateur {user_id}")
    else:
        # Créer
        cursor.execute(
            'INSERT INTO travel_contexts (user_id, name, data_json, updated_at) VALUES (?, ?, ?, datetime("now"))',
            (user_id, '_user_data_prod_', dev_data[0])
        )
        print(f"Données prod créées pour l'utilisateur {user_id}")
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    # Remplacez 1 par votre user_id si différent
    migrate_dev_to_prod(1)
    print("Migration terminée !")
```
