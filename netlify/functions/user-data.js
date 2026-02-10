const { getSession } = require('./utils/session');
const { getUserStore } = require('./utils/blobs');

exports.handler = async (event, context) => {
  const session = await getSession(event);
  if (!session || !session.user_id || !session.google_id) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Non authentifie' })
    };
  }

  const path = event.path;
  const method = event.httpMethod;
  const googleId = session.google_id;
  const envPrefix = event.queryStringParameters?.env || 'prod_';

  console.log(`[UserData] Request: ${method} ${path} for ${googleId} (${envPrefix})`);

  if (path.endsWith('/debug')) {
    return handleDebugUserData(googleId, envPrefix);
  }

  if (method === 'GET') {
    return handleGetUserData(googleId, envPrefix);
  } else if (method === 'PUT') {
    return handleUpdateUserData(event, googleId, envPrefix);
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};

async function handleGetUserData(googleId, envPrefix) {
  const store = getUserStore();
  const key = `${envPrefix}${googleId}:data`;

  try {
    let data = await store.get(key, { type: 'json' });

    if (!data) {
      console.log(`[UserData] Creating new data for ${key}`);
      const emptyData = {
        locations: { locations: [] },
        regions: { regions: [] },
        calendar: {},
        settings: {},
        journal: {},
        position: {},
        filtersByMap: {},
        _environment: envPrefix,
        _saved_at: new Date().toISOString(),
        _sync_timestamp: Date.now() / 1000
      };

      await store.set(key, JSON.stringify(emptyData));
      return {
        statusCode: 200,
        body: JSON.stringify(emptyData)
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error(`[UserData] Error getting data: ${err}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur serveur' })
    };
  }
}

async function handleUpdateUserData(event, googleId, envPrefix) {
  try {
    const data = JSON.parse(event.body);
    if (!data) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Données manquantes' }) };
    }

    const store = getUserStore();
    const key = `${envPrefix}${googleId}:data`;

    const forceOverwrite = data._force_overwrite === true;

    if (!forceOverwrite) {
      const existingData = await store.get(key, { type: 'json' });

      if (existingData) {
        const clientTimestamp = data._sync_timestamp;
        const cloudTimestamp = existingData._sync_timestamp;

        // Note: Python used float timestamp. JS uses ms or s?
        // Python: datetime.now().timestamp() is in seconds (float).
        // JS: Date.now() / 1000 is in seconds (float).
        // We should ensure client sends consistent format.
        // Assuming client sends what server sent previously.

        if (clientTimestamp && cloudTimestamp && cloudTimestamp > clientTimestamp) {
          console.log(`[UserData] Conflict detected for ${key}`);
          return {
            statusCode: 200, // Frontend expects 200 for conflict
            body: JSON.stringify({
              conflict_detected: true,
              cloud_data: existingData,
              cloud_timestamp: cloudTimestamp
            })
          };
        }
      }
    }

    // Save data
    data._saved_at = new Date().toISOString();
    data._sync_timestamp = Date.now() / 1000;
    // Remove temporary flag
    delete data._force_overwrite;

    await store.set(key, JSON.stringify(data));
    console.log(`[UserData] Saved data for ${key}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, conflict_detected: false })
    };
  } catch (err) {
    console.error(`[UserData] Error saving data: ${err}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur serveur' })
    };
  }
}

async function handleDebugUserData(googleId, envPrefix) {
  const store = getUserStore();
  const key = `${envPrefix}${googleId}:data`;

  try {
    const data = await store.get(key, { type: 'json' });

    if (!data) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'empty',
          message: 'Aucune donnée cloud trouvée pour cet utilisateur',
          google_id: googleId
        })
      };
    }

    const summary = {
      locations_count: data.locations?.locations?.length || 0,
      regions_count: data.regions?.regions?.length || 0,
      maps_count: data.settings?.availableMaps?.length || 0,
      has_calendar: !!data.calendar,
      has_settings: !!data.settings,
      has_journal: !!data.journal,
      has_position: !!data.position,
      has_filtersByMap: !!data.filtersByMap,
      filtersByMap_count: Object.keys(data.filtersByMap || {}).length
    };

    const rawJsonText = JSON.stringify(data, null, 2);

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'ok',
        google_id: googleId,
        created_at: data._saved_at || 'unknown',
        updated_at: data._saved_at || 'unknown',
        data_summary: summary,
        full_data: data,
        raw_json_text: rawJsonText,
        raw_json_size: rawJsonText.length
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Debug error: ${err.message}` })
    };
  }
}
