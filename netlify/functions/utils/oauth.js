const { OAuth2Client } = require('google-auth-library');

function getClient(redirectUri) {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

async function verifyIdToken(token) {
  const client = getClient();
  const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

function getAuthorizationUrl(redirectUri, state) {
  const client = getClient(redirectUri);
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid'
    ],
    include_granted_scopes: true,
    prompt: 'select_account',
    state: state
  });
}

async function getToken(code, redirectUri) {
  const client = getClient(redirectUri);
  const { tokens } = await client.getToken(code);
  return tokens;
}

module.exports = { verifyIdToken, getAuthorizationUrl, getToken };
