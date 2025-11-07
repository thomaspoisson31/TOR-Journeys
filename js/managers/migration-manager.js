
```javascript
/**
 * MigrationManager - Gère la migration des données vers les IDs logiques
 */
class MigrationManager {
    constructor() {
        this.migrationVersion = 'v2_logical_ids';
        console.log("🔄 MigrationManager initialized");
    }

    /**
     * Vérifie si la migration a déjà été effectuée
     */
    isMigrationDone() {
        const flag = localStorage.getItem('_migration_v2_done');
        return flag === 'true';
    }

    /**
     * Marque la migration comme terminée
     */
    markMigrationDone() {
        localStorage.setItem('_migration_v2_done', 'true');
        console.log("✅ Migration marquée comme terminée");
    }

    /**
     * Crée un backup complet avant migration
     */
    createBackup() {
        const backup = {
            timestamp: Date.now(),
            locations: localStorage.getItem('middleEarthLocations'),
            regions: localStorage.getItem('middleEarthRegions'),
            characters: localStorage.getItem('middleEarthCharacters'),
            filtersByMap: localStorage.getItem('filtersByMap'),
            position: localStorage.getItem('adventurers_position'),
            availableMaps: localStorage.getItem('availableMaps'),
            activeMapUrl: localStorage.getItem('activeMapUrl')
        };
        
        localStorage.setItem('_migration_backup_v2', JSON.stringify(backup));
        console.log("💾 [Migration] Backup créé avec succès");
        return backup;
    }

    /**
     * Restaure depuis le backup en cas d'échec
     */
    restoreFromBackup() {
        try {
            const backup = JSON.parse(localStorage.getItem('_migration_backup_v2'));
            if (!backup) {
                console.error("❌ [Migration] Aucun backup trouvé");
                return false;
            }

            Object.keys(backup).forEach(key => {
                if (key !== 'timestamp' && backup[key]) {
                    localStorage.setItem(key.replace('_backup', ''), backup[key]);
                }
            });

            console.log("✅ [Migration] Restauration depuis backup réussie");
            return true;
        } catch (error) {
            console.error("❌ [Migration] Erreur lors de la restauration:", error);
            return false;
        }
    }

    /**
     * Effectue la migration complète
     */
    async performMigration() {
        if (this.isMigrationDone()) {
            console.log("ℹ️ [Migration] Migration déjà effectuée, passage");
            return true;
        }

        console.log("🚀 [Migration] Début de la migration vers IDs logiques");

        try {
            // 1. Créer un backup
            this.createBackup();

            // 2. Construire la table de correspondance URL -> logicalId
            const urlToLogicalId = this.buildUrlToLogicalIdMap();
            console.log("🗺️ [Migration] Table de correspondance:", urlToLogicalId);

            // 3. Migrer les lieux
            const locationsResult = this.migrateLocations(urlToLogicalId);
            console.log(`✅ [Migration] Lieux migrés: ${locationsResult.migrated}/${locationsResult.total}`);

            // 4. Migrer les régions
            const regionsResult = this.migrateRegions(urlToLogicalId);
            console.log(`✅ [Migration] Régions migrées: ${regionsResult.migrated}/${regionsResult.total}`);

            // 5. Migrer les personnages
            const charactersResult = this.migrateCharacters(urlToLogicalId);
            console.log(`✅ [Migration] Personnages migrés: ${charactersResult.migrated}/${charactersResult.total}`);

            // 6. Migrer les filtres
            const filtersResult = this.migrateFilters(urlToLogicalId);
            console.log(`✅ [Migration] Filtres migrés: ${filtersResult.migrated} carte(s)`);

            // 7. Migrer la position
            const positionResult = this.migratePosition(urlToLogicalId);
            console.log(`✅ [Migration] Position migrée: ${positionResult}`);

            // 8. Valider la migration
            if (!this.validateMigration()) {
                throw new Error("Validation de la migration échouée");
            }

            // 9. Marquer comme terminée
            this.markMigrationDone();

            console.log("🎉 [Migration] Migration terminée avec succès!");
            return true;

        } catch (error) {
            console.error("❌ [Migration] Erreur critique:", error);
            console.log("🔄 [Migration] Tentative de restauration...");
            this.restoreFromBackup();
            return false;
        }
    }

    /**
     * Construit la table URL -> logicalId depuis availableMaps
     */
    buildUrlToLogicalIdMap() {
        const maps = JSON.parse(localStorage.getItem('availableMaps') || '[]');
        const urlToLogicalId = {};

        maps.forEach(map => {
            if (map.url && map.logicalId) {
                urlToLogicalId[map.url] = map.logicalId;
                console.log(`🔗 [Migration] Mapping: ${map.url} -> ${map.logicalId}`);
            }
        });

        return urlToLogicalId;
    }

    /**
     * Migre les lieux
     */
    migrateLocations(urlToLogicalId) {
        const data = JSON.parse(localStorage.getItem('middleEarthLocations') || '{"locations":[]}');
        let migrated = 0;

        data.locations.forEach(location => {
            if (location.mapId && urlToLogicalId[location.mapId]) {
                const oldMapId = location.mapId;
                location.mapId = urlToLogicalId[oldMapId];
                migrated++;
                console.log(`📍 [Migration] Lieu "${location.name}": ${oldMapId} -> ${location.mapId}`);
            } else if (location.mapId) {
                console.warn(`⚠️ [Migration] Lieu "${location.name}": mapId "${location.mapId}" non trouvé dans la table`);
            }
        });

        localStorage.setItem('middleEarthLocations', JSON.stringify(data));
        return { migrated, total: data.locations.length };
    }

    /**
     * Migre les régions
     */
    migrateRegions(urlToLogicalId) {
        const data = JSON.parse(localStorage.getItem('middleEarthRegions') || '{"regions":[]}');
        let migrated = 0;

        data.regions.forEach(region => {
            if (region.mapId && urlToLogicalId[region.mapId]) {
                const oldMapId = region.mapId;
                region.mapId = urlToLogicalId[oldMapId];
                migrated++;
                console.log(`🌍 [Migration] Région "${region.name}": ${oldMapId} -> ${region.mapId}`);
            } else if (region.mapId) {
                console.warn(`⚠️ [Migration] Région "${region.name}": mapId "${region.mapId}" non trouvé dans la table`);
            }
        });

        localStorage.setItem('middleEarthRegions', JSON.stringify(data));
        return { migrated, total: data.regions.length };
    }

    /**
     * Migre les personnages
     */
    migrateCharacters(urlToLogicalId) {
        const data = JSON.parse(localStorage.getItem('middleEarthCharacters') || '{"characters":[]}');
        let migrated = 0;

        data.characters.forEach(character => {
            if (character.mapId && urlToLogicalId[character.mapId]) {
                const oldMapId = character.mapId;
                character.mapId = urlToLogicalId[oldMapId];
                migrated++;
                console.log(`👤 [Migration] Personnage "${character.name}": ${oldMapId} -> ${character.mapId}`);
            } else if (character.mapId) {
                console.warn(`⚠️ [Migration] Personnage "${character.name}": mapId "${character.mapId}" non trouvé dans la table`);
            }
        });

        localStorage.setItem('middleEarthCharacters', JSON.stringify(data));
        return { migrated, total: data.characters.length };
    }

    /**
     * Migre les filtres
     */
    migrateFilters(urlToLogicalId) {
        const filtersByMap = JSON.parse(localStorage.getItem('filtersByMap') || '{}');
        const migratedFilters = {};
        let migrated = 0;

        Object.keys(filtersByMap).forEach(oldMapId => {
            if (urlToLogicalId[oldMapId]) {
                const newMapId = urlToLogicalId[oldMapId];
                migratedFilters[newMapId] = filtersByMap[oldMapId];
                migrated++;
                console.log(`🔍 [Migration] Filtres: ${oldMapId} -> ${newMapId}`);
            } else {
                console.warn(`⚠️ [Migration] Filtres: mapId "${oldMapId}" non trouvé dans la table`);
                // Conserver quand même pour compatibilité
                migratedFilters[oldMapId] = filtersByMap[oldMapId];
            }
        });

        localStorage.setItem('filtersByMap', JSON.stringify(migratedFilters));
        return { migrated };
    }

    /**
     * Migre la position
     */
    migratePosition(urlToLogicalId) {
        const positionStr = localStorage.getItem('adventurers_position');
        if (!positionStr) return "Aucune position à migrer";

        try {
            const position = JSON.parse(positionStr);
            if (position.mapId && urlToLogicalId[position.mapId]) {
                const oldMapId = position.mapId;
                position.mapId = urlToLogicalId[oldMapId];
                localStorage.setItem('adventurers_position', JSON.stringify(position));
                console.log(`📍 [Migration] Position: ${oldMapId} -> ${position.mapId}`);
                return `Migrée: ${oldMapId} -> ${position.mapId}`;
            } else if (position.mapId) {
                console.warn(`⚠️ [Migration] Position: mapId "${position.mapId}" non trouvé dans la table`);
                return `Non migrée: mapId inconnu`;
            }
            return "Position sans mapId";
        } catch (error) {
            console.error("❌ [Migration] Erreur migration position:", error);
            return "Erreur";
        }
    }

    /**
     * Valide que la migration s'est bien déroulée
     */
    validateMigration() {
        console.log("🔍 [Migration] Validation de la migration...");

        // Vérifier qu'aucun objet n'a encore une URL comme mapId
        const locations = JSON.parse(localStorage.getItem('middleEarthLocations') || '{"locations":[]}');
        const regions = JSON.parse(localStorage.getItem('middleEarthRegions') || '{"regions":[]}');
        const characters = JSON.parse(localStorage.getItem('middleEarthCharacters') || '{"characters":[]}');

        const invalidLocations = locations.locations.filter(loc => 
            loc.mapId && (loc.mapId.includes('.webp') || loc.mapId.includes('.jpg') || loc.mapId.includes('.png'))
        );

        const invalidRegions = regions.regions.filter(reg => 
            reg.mapId && (reg.mapId.includes('.webp') || reg.mapId.includes('.jpg') || reg.mapId.includes('.png'))
        );

        const invalidCharacters = characters.characters.filter(char => 
            char.mapId && (char.mapId.includes('.webp') || char.mapId.includes('.jpg') || char.mapId.includes('.png'))
        );

        if (invalidLocations.length > 0) {
            console.error("❌ [Migration] Validation échouée: URLs encore présentes dans les lieux:", invalidLocations.map(l => l.name));
            return false;
        }

        if (invalidRegions.length > 0) {
            console.error("❌ [Migration] Validation échouée: URLs encore présentes dans les régions:", invalidRegions.map(r => r.name));
            return false;
        }

        if (invalidCharacters.length > 0) {
            console.error("❌ [Migration] Validation échouée: URLs encore présentes dans les personnages:", invalidCharacters.map(c => c.name));
            return false;
        }

        console.log("✅ [Migration] Validation réussie");
        return true;
    }
}

export default MigrationManager;
```
