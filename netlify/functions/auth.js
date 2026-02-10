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
    console.error('[Auth] OAuth not configured');
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

  console.log(`[Auth] Starting OAuth flow. State: ${state}, RedirectURI: ${redirectUri}, Protocol: ${protocol}`);

  // Get existing session or create new object
  let session = await getSession(event) || {};
  session.state = state;

  const isSecure = protocol === 'https';
  // Use options to force secure flag based on protocol
  const sessionCookie = await createSessionCookie(session, { secure: isSecure });

  const authUrl = getAuthorizationUrl(redirectUri, state);
  console.log(`[Auth] Redirecting to Google: ${authUrl}`);

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

  console.log(`[Auth] Callback received. Code: ${code ? 'Yes' : 'No'}, State: ${state}, Error: ${error}`);

  if (error) {
    console.error(`[Auth] Google Error: ${error} - ${error_description}`);
    return {
      statusCode: 302,
      headers: { Location: `/?auth_error=google_error&desc=${error_description || error}` }
    };
  }

  if (!code) {
     console.error('[Auth] No code in callback');
     return {
      statusCode: 302,
      headers: { Location: '/?auth_error=no_auth_code' }
    };
  }

  const session = await getSession(event);

  if (!session) {
     console.error('[Auth] No session found in callback (cookie missing or invalid)');
     return {
      statusCode: 302,
      headers: { Location: '/?auth_error=no_session_state' }
    };
  }

  if (!session.state) {
     console.error('[Auth] No state in session');
     return {
      statusCode: 302,
      headers: { Location: '/?auth_error=no_session_state' }
    };
  }

  if (session.state !== state) {
     console.error(`[Auth] Invalid state mismatch. Session=${session.state}, Query=${state}`);
     return {
      statusCode: 302,
      headers: { Location: '/?auth_error=invalid_state' }
    };
  }

  console.log('[Auth] State verified. Exchanging code for tokens...');

  try {
    const protocol = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host;
    const redirectUri = `${protocol}://${host}/auth/google/callback`;

    // Exchange code for tokens
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
    console.log(`[Auth] User authenticated: ${googleId} (${payload.email})`);

    const userStore = getUserStore();
    const userKey = `user:${googleId}`;

    // Check if user exists
    let user;
    try {
      const userData = await userStore.get(userKey, { type: 'json' });
      user = userData;
    } catch (err) {
      console.log('[Auth] User lookup error or not found:', err.message);
    }

    if (!user) {
      console.log('[Auth] Creating new user record');
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

    const isSecure = protocol === 'https';
    const newSessionCookie = await createSessionCookie(newSession, { secure: isSecure });

    console.log('[Auth] Authentication successful. Redirecting to app.');

    return {
      statusCode: 302,
      headers: {
        Location: '/',
        'Set-Cookie': newSessionCookie
      }
    };

  } catch (e) {
    console.error('[Auth] OAuth Exception:', e);
    return {
      statusCode: 302,
      headers: { Location: `/?auth_error=exception&msg=${encodeURIComponent(e.message)}` }
    };
  }
}

async function handleLogout(event) {
  console.log('[Auth] Logging out');
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
      session_exists: !!session,
      protocol
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

  const protocol = event.headers['x-forwarded-proto'] || 'https';
  const isSecure = protocol === 'https';
  const cookieVal = await createSessionCookie(session, { secure: isSecure });

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
      all_session_data: session,
      secure_cookie: isSecure
    })
  };
}
