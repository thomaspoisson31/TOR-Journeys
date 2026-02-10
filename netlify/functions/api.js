const { getSession } = require('./utils/session');
const { getUserStore, getUploadsStore } = require('./utils/blobs');
const { parseMultipart } = require('./utils/multipart');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

exports.handler = async (event, context) => {
  const path = event.path;
  const method = event.httpMethod;

  console.log(`[API] Request: ${method} ${path}`);

  if (path.endsWith('/api/auth/user')) {
    return handleGetCurrentUser(event);
  } else if (path.endsWith('/api/environment')) {
    return handleGetEnvironment(event);
  } else if (path.endsWith('/api/gemini/config')) {
    return handleGeminiConfig(event);
  } else if (path.endsWith('/api/gemini/generate') && method === 'POST') {
    return handleGeminiGenerate(event);
  } else if (path.endsWith('/api/gemini/test')) {
    return handleGeminiTest(event);
  } else if (path.endsWith('/api/storage/status')) {
    return handleStorageStatus(event);
  } else if (path.endsWith('/api/image/create-thumbnail') && method === 'POST') {
    return handleCreateThumbnail(event);
  } else if (path.endsWith('/api/images/library')) {
    return handleImageLibrary(event);
  } else if (path.endsWith('/api/upload/image') && method === 'POST') {
    return handleUploadImage(event);
  } else if (path.includes('/api/contexts')) {
    return handleContexts(event);
  }

  return { statusCode: 404, body: 'Not Found' };
};

async function handleGetCurrentUser(event) {
  const session = await getSession(event);
  if (session && session.authenticated) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        authenticated: true,
        user: {
          id: session.user_id,
          google_id: session.google_id,
          name: session.user_name,
          email: session.user_email,
          picture: session.user_picture
        },
        auth_method: 'google'
      })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ authenticated: false, user: null })
  };
}

async function handleGetEnvironment(event) {
  const envOverride = process.env.ENV?.toLowerCase();

  let environment = 'development';
  let prefix = 'dev_';
  let isDeployment = false;

  if (envOverride === 'production' || envOverride === 'prod') {
    environment = 'production';
    prefix = 'prod_';
    isDeployment = true;
  } else if (process.env.CONTEXT === 'production') {
    environment = 'production';
    prefix = 'prod_';
    isDeployment = true;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      environment,
      prefix,
      is_deployment: isDeployment,
      detection_method: {
        source: 'Netlify CONTEXT or ENV',
        value: process.env.CONTEXT || envOverride
      }
    })
  };
}

async function handleGeminiConfig(event) {
  const apiKey = process.env.GOOGLE_API_KEY;
  return {
    statusCode: 200,
    body: JSON.stringify({
      api_key_configured: !!apiKey,
      api_key: apiKey || null
    })
  };
}

async function handleGeminiGenerate(event) {
  if (!process.env.GOOGLE_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Clé API Gemini non configurée' }) };
  }

  try {
    const data = JSON.parse(event.body);
    const { prompt, type } = data;

    if (!prompt) return { statusCode: 400, body: JSON.stringify({ error: 'Prompt manquant' }) };

    const apiModel = 'gemini-2.0-flash-exp';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${process.env.GOOGLE_API_KEY}`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Erreur API Gemini: ${response.status}`, details: errorText })
      };
    }

    const result = await response.json();

    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          content: result.candidates[0].content.parts[0].text,
          type: type || 'description'
        })
      };
    } else {
      return { statusCode: 500, body: JSON.stringify({ error: 'Réponse invalide de l\'API Gemini', details: result }) };
    }

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: `Erreur serveur: ${e.message}` }) };
  }
}

async function handleGeminiTest(event) {
    if (!process.env.GOOGLE_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'GOOGLE_API_KEY not configured' }) };
    }

    try {
        const apiModel = 'gemini-2.0-flash-exp';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${process.env.GOOGLE_API_KEY}`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: "Dis juste 'Hello' en réponse." }] }]
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({
                status_code: response.status,
                response_text: text.substring(0, 500),
                api_key_prefix: process.env.GOOGLE_API_KEY.substring(0, 10) + '...',
                success: response.ok
            })
        };
    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
}

async function handleStorageStatus(event) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      storage_available: true,
      using_netlify_blobs: true,
      message: 'Netlify Blobs storage active'
    })
  };
}

async function handleCreateThumbnail(event) {
  try {
    const data = JSON.parse(event.body);
    const { image_url, category } = data;

    if (!image_url) return { statusCode: 400, body: JSON.stringify({ error: 'URL d\'image manquante' }) };

    // In the new system, we just return the original URL as thumbnail
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        thumbnail_url: image_url,
        message: 'Image originale utilisée comme vignette'
      })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}

async function handleImageLibrary(event) {
  const session = await getSession(event);
  if (!session || !session.user_id) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Non authentifié' }) };
  }

  const googleId = session.google_id;
  const store = getUploadsStore();

  try {
    // List all blobs
    // keys are like: uploads/{google_id}/{category}/{filename}
    // But Netlify Blobs list has prefixes.
    // We want all files for this user.
    const { blobs } = await store.list({ prefix: `uploads/${googleId}/` });

    const folders = {};
    let total = 0;

    for (const blob of blobs) {
      // Key format: uploads/google_id/category/filename
      const parts = blob.key.split('/');
      if (parts.length < 4) continue;

      const category = parts[2];
      const filename = parts[3];

      // Get metadata if available (requires extra call per blob or list with metadata if supported)
      // Netlify Blobs list returns { key, etag, size, lastModified }
      // Metadata is stored separately if we used setMetadata or inside the blob?
      // Netlify Blobs store.set(key, data, { metadata: ... })
      // list() returns metadata if requested?
      // Current client: list({ prefix }) returns array of { key, etag, size, lastModified }
      // It DOES NOT return custom metadata by default or easily in one call.
      // So we might need to fetch metadata or just use what we have.
      // The frontend expects: filename, url, category, size, width, height.
      // Width/Height is important for layout.
      // If we can't get it cheaply, we might need to store an index in User Data store.
      // OR we fetch metadata for each blob (slow).

      // OPTIMIZATION: Store image index in user-data store?
      // Replit implementation scanned the file system.
      // Here we can use the size from list. Width/Height is harder.
      // Let's assume for now we return 0/0 or fetch metadata if we can.
      // Wait, `getWithMetadata` exists but for individual items.

      // Let's try to fetch metadata for each item. It might be slow if many images.
      // Alternatively, we just return what we have.

      // For now, I'll return null width/height. The frontend might handle it or fetch the image.

      if (!folders[category]) folders[category] = [];

      folders[category].push({
        filename,
        url: `/${blob.key}`, // Served via redirects
        category,
        size: blob.size,
        width: null, // We don't have this efficiently
        height: null
      });
      total++;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, folders, total })
    };

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}

async function handleUploadImage(event) {
  const session = await getSession(event);
  if (!session || !session.user_id) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Non authentifié' }) };
  }

  try {
    const { fields, files } = await parseMultipart(event);

    if (files.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Aucun fichier fourni' }) };
    }

    const file = files[0]; // Assume one file
    const category = fields.category || 'general';
    const useBase64 = fields.use_base64 === 'true';

    const googleId = session.google_id;
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15); // YYYYMMDD_HHMMSS approx
    const uniqueId = uuidv4();

    // Determine extension
    let ext = mime.extension(file.mimeType) || 'bin';
    if (file.filename && file.filename.includes('.')) {
      ext = file.filename.split('.').pop();
    }

    let finalFilename = `${timestamp}_${uniqueId}.${ext}`;
    let buffer = file.content;
    let width = null;
    let height = null;

    // Resize if maps
    if (category === 'maps') {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Resize to width 5000 preserving aspect ratio
      if (metadata.width > 5000) {
         buffer = await image.resize({ width: 5000 }).toBuffer();
         const newMeta = await sharp(buffer).metadata();
         width = newMeta.width;
         height = newMeta.height;
      } else {
         width = metadata.width;
         height = metadata.height;
      }
    } else {
        try {
            const meta = await sharp(buffer).metadata();
            width = meta.width;
            height = meta.height;
        } catch (e) {
            // Not an image or sharp failed
        }
    }

    const store = getUploadsStore();
    const key = `uploads/${googleId}/${category}/${finalFilename}`;

    // Metadata to store
    const metadata = {
        contentType: file.mimeType,
        width: width ? String(width) : undefined,
        height: height ? String(height) : undefined,
        originalName: file.filename
    };

    await store.set(key, buffer, { metadata });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        url: `/${key}`,
        filename: finalFilename,
        size: buffer.length,
        width,
        height,
        category,
        storage: 'netlify_blobs'
      })
    };

  } catch (e) {
    console.error('Upload Error:', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}

async function handleContexts(event) {
   // Stubs
   const method = event.httpMethod;
   const path = event.path;

   if (method === 'GET' && path.endsWith('/api/contexts')) {
       return { statusCode: 200, body: JSON.stringify([]) };
   }

   if (path.includes('/share')) {
       return { statusCode: 200, body: JSON.stringify({ message: "Cette fonctionnalité n'est plus utilisée" }) };
   }

   if (method === 'GET') {
       return { statusCode: 404, body: JSON.stringify({ error: "Cette fonctionnalité n'est plus utilisée" }) };
   }

   return { statusCode: 200, body: JSON.stringify({ message: "Cette fonctionnalité n'est plus utilisée" }) };
}
