import { initAuth0 } from '@auth0/nextjs-auth0';

export default initAuth0({
  session: {
    cookie: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
});
