import { handleAuth } from '@auth0/nextjs-auth0';

export const GET = handleAuth({
  login: {
    authorizationParams: {
      audience: process.env.AUTH0_AUDIENCE || 'https://api.legend-platform.com',
      scope: 'openid profile email'
    }
  }
});