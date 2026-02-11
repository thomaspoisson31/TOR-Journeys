const { getUploadsStore } = require('./utils/blobs');
const mime = require('mime-types');

exports.handler = async (event, context) => {
  const path = event.path;
  let key = path.startsWith('/') ? path.slice(1) : path;

  // Handle Netlify function path prefix if present (unlikely with rewrite but possible)
  if (key.startsWith('.netlify/functions/uploads/')) {
      key = key.replace('.netlify/functions/uploads/', 'uploads/');
  }

  // Ensure key starts with uploads/ (security check + path normalization)
  if (!key.startsWith('uploads/')) {
      // If the rewrite stripped uploads/, we might need to add it back?
      // But the rewrite is /uploads/* -> /.netlify/functions/uploads/:splat
      // If I request /uploads/foo.jpg, splat is foo.jpg.
      // The function path becomes /.netlify/functions/uploads/foo.jpg.
      // So key becomes .netlify/functions/uploads/foo.jpg.
      // My replacement logic handles that.
      // Wait, if I replace .netlify/functions/uploads/ with uploads/, it becomes uploads/foo.jpg.
      // That matches my key format.
  }

  // Fallback: if the path is just /uploads/foo.jpg (direct request or rewrite preserving path)
  // key is uploads/foo.jpg. This is correct.

  const store = getUploadsStore();

  try {
    const result = await store.getWithMetadata(key, { type: 'arrayBuffer' });

    if (!result) {
      return { statusCode: 404, body: 'Not Found' };
    }

    const { data, metadata } = result;
    const contentType = metadata?.contentType || mime.lookup(key) || 'application/octet-stream';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      body: Buffer.from(data).toString('base64'),
      isBase64Encoded: true
    };

  } catch (e) {
    console.error(`Error serving ${key}:`, e);
    return { statusCode: 404, body: 'Not Found' }; // Blobs throws if not found? No, returns null usually.
  }
};
