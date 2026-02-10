const { jwtDecrypt, EncryptJWT } = require('jose');
const cookie = require('cookie');

const secret = process.env.SESSION_SECRET || 'development_secret_key_must_be_at_least_32_characters_long';
const key = new TextEncoder().encode(secret);

const COOKIE_NAME = 'tor_journey_session';

async function getSession(event) {
  const cookies = cookie.parse(event.headers.cookie || '');
  const sessionCookie = cookies[COOKIE_NAME];

  if (!sessionCookie) {
    // console.log('[Session] No session cookie found');
    return null;
  }

  try {
    const { payload } = await jwtDecrypt(sessionCookie, key);
    return payload;
  } catch (e) {
    console.error('[Session] Decryption failed:', e.message);
    return null;
  }
}

async function createSessionCookie(data, options = {}) {
  // Ensure data is an object
  const payload = { ...data };

  const jwt = await new EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .encrypt(key);

  // Use secure cookies only in production or if served over HTTPS, unless forced via options
  const isSecure = options.secure !== undefined ? options.secure : (
    process.env.CONTEXT === 'production' || (process.env.URL && process.env.URL.startsWith('https'))
  );

  return cookie.serialize(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: isSecure,
    sameSite: options.sameSite || 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 hours
  });
}

function clearSessionCookie() {
   return cookie.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true, // Clearing secure cookie requires secure flag usually? Or lax?
    // It's safer to match creation flags, but for clearing, secure usually doesn't matter much if path/domain match.
    // However, if the cookie was set as Secure, browser might ignore clear request if not Secure.
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0)
  });
}

module.exports = { getSession, createSessionCookie, clearSessionCookie };
