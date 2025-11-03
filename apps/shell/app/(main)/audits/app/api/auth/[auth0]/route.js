import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';

const audience = process.env.AUTH0_AUDIENCE || 'https://audits-api.legenda.co.il';
const scope = 'openid profile email';

// Next.js 15 compatible way
export async function GET(request, context) {
	// Await the params to satisfy Next.js 15
	const params = await context.params;
	
	return handleAuth({
		login: handleLogin({
			authorizationParams: { audience, scope },
		}),
	})(request, { params });
}