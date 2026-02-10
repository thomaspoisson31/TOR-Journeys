const { getAuthorizationUrl, getToken, verifyIdToken } = require('./utils/oauth');
const { getSession, createSessionCookie, clearSessionCookie } = require('./utils/session');
const { getUserStore } = require('./utils/blobs');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');

exports.handler = async (event, context) => {
  const path = event.path;
  const method = event.httpMethod;

  console.log(`[Auth] Request: ${method} ${path}`);

  if (path.endsWith('/auth/google/callback')) {
    return handleGoogleCallback(event);
  } else if (path.endsWith('/auth/google')) {
    return handleGoogleAuth(event);
  } else if (path.endsWith('/auth/logout')) {
    return handleLogout(event);
  } else if (path.endsWith('/auth/verify-config')) {
    return handleVerifyConfig(event);
  } else if (path.endsWith('/auth/debug')) {
    return handleAuthDebug(event);
  } else if (path.endsWith('/auth/test')) {
    return handleTestOAuth(event);
  } else if (path.endsWith('/auth/session-test')) {
    return handleSessionTest(event);
  }

  return { statusCode: 404, body: 'Not Found' };
};

async function handleGoogleAuth(event) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return {
      statusCode: 302,
      headers: { Location: '/?error=oauth_not_configured' }
    };
  }

  const state = uuidv4();

  // Construct redirect URI
  const protocol = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host;
  const redirectUri = `${protocol}://${host}/auth/google/callback`;

  // Get existing session or create new object
  let session = await getSession(event) || {};
  session.state = state;

  const sessionCookie = await createSessionCookie(session);

  const authUrl = getAuthorizationUrl(redirectUri, state);

  return {
    statusCode: 302,
    headers: {
      Location: authUrl,
      'Set-Cookie': sessionCookie
    }
  };
}

async function handleGoogleCallback(event) {
  const { code, state, error, error_description } = event.queryStringParameters || {};

  if (error) {
    return {
      statusCode: 302,
      headers: { Location: `/?auth_error=google_error&desc=${error_description || error}` }
    };
  }

  if (!code) {
     return {
      statusCode: 302,
      headers: { Location: '/?auth_error=no_auth_code' }
    };
  }

  const session = await getSession(event);

  if (!session || !session.state) {
     console.error('No session state found');
     return {
      statusCode: 302,
      headers: { Location: '/?auth_error=no_session_state' }
    };
  }

  if (session.state !== state) {
     console.error(`Invalid state: Session=${session.state}, Query=${state}`);
     return {
      statusCode: 302,
      headers: { Location: '/?auth_error=invalid_state' }
    };
  }

  try {
    const protocol = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host;
    const redirectUri = `${protocol}://${host}/auth/google/callback`;

    // Exchange code for tokens
    // We need to use the OAuth2Client directly here because getToken in utils creates a new client
    // which is fine, but we also want to verify the ID token.
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Verify ID Token
    const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const googleId = payload.sub;
    const userStore = getUserStore();
    const userKey = `user:${googleId}`;

    // Check if user exists
    let user;
    try {
      // Blobs get returns string or blob, we need to parse if json
      const userData = await userStore.get(userKey, { type: 'json' });
      user = userData;
    } catch (err) {
      // Not found or error
      console.log('User lookup error or not found:', err);
    }

    if (!user) {
      user = {
        id: googleId,
        google_id: googleId,
        name: payload.name,
        email: payload.email,
        created_at: new Date().toISOString()
      };
      await userStore.set(userKey, JSON.stringify(user));
    }

    // Update session
    const newSession = {
      user_id: user.id,
      google_id: googleId,
      user_picture: payload.picture,
      authenticated: true,
      user_name: payload.name,
      user_email: payload.email
    };
    // Clear state
    delete newSession.state;

    const newSessionCookie = await createSessionCookie(newSession);

    return {
      statusCode: 302,
      headers: {
        Location: '/',
        'Set-Cookie': newSessionCookie
      }
    };

  } catch (e) {
    console.error('OAuth Error:', e);
    return {
      statusCode: 302,
      headers: { Location: `/?auth_error=exception&msg=${encodeURIComponent(e.message)}` }
    };
  }
}

async function handleLogout(event) {
  return {
    statusCode: 302,
    headers: {
      Location: '/login',
      'Set-Cookie': clearSessionCookie()
    }
  };
}

async function handleVerifyConfig(event) {
  const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: (hasClientId && hasClientSecret) ? 'success' : 'error',
      message: (hasClientId && hasClientSecret) ? 'Configuration OAuth valide' : 'Configuration manquante',
      client_id: process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ? 'Configured' : 'Missing'
    })
  };
}

async function handleAuthDebug(event) {
  const protocol = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host;
  const redirectUri = `${protocol}://${host}/auth/google/callback`;

  const session = await getSession(event);

  return {
    statusCode: 200,
    body: JSON.stringify({
      host,
      redirect_uri: redirectUri,
      google_client_id_set: !!process.env.GOOGLE_CLIENT_ID,
      session_keys: session ? Object.keys(session) : [],
      // Safe to show keys, but mask values if sensitive
      session_exists: !!session
    })
  };
}

async function handleTestOAuth(event) {
   const protocol = event.headers['x-forwarded-proto'] || 'https';
   const host = event.headers.host;
   const redirectUri = `${protocol}://${host}/auth/google/callback`;

   const authUrl = process.env.GOOGLE_CLIENT_ID ? getAuthorizationUrl(redirectUri, 'test-state') : null;

   return {
     statusCode: 200,
     body: JSON.stringify({
       step: 'oauth_flow_creation',
       status: 'success',
       redirect_uri: redirectUri,
       authorization_url: authUrl,
       state: 'test-state',
       flow_configured: !!authUrl
     })
   };
}

async function handleSessionTest(event) {
  let session = await getSession(event) || {};

  session.test_counter = (session.test_counter || 0) + 1;

  const cookieVal = await createSessionCookie(session);

  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': cookieVal,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      session_works: true,
      counter: session.test_counter,
      session_id: 'encrypted-cookie',
      all_session_data: session
    })
  };
}
