import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

const audience = process.env.AUTH0_AUDIENCE || 'https://audits-api.legenda.co.il';
const scope = 'openid profile email';

// Next.js 15 compatible way
export async function GET(request, context) {
	// Await the params to satisfy Next.js 15
	const params = await context.params;
	
	// CRITICAL: Prevent Auth0 redirects when running in iframe context
	// Check if request is coming from an iframe (Referer will be shell domain or sec-fetch-dest header)
	const referer = request.headers.get('referer') || '';
	const secFetchDest = request.headers.get('sec-fetch-dest');
	
	// If referer is from shell staging/prod OR sec-fetch-dest is iframe, block Auth0 flows
	const isFromShell = referer.includes('legend-shell-staging.onrender.com') || 
	                    referer.includes('localhost:3000'); // add prod domain here when known
	const isIframeRequest = secFetchDest === 'iframe';
	
	if (isFromShell || isIframeRequest) {
		console.warn('[audits-fe] Blocked Auth0 route in iframe context:', request.url);
		return NextResponse.json(
			{ 
				error: 'Auth0 login/logout not available in iframe. Use parent shell authentication.',
				hint: 'Ensure shell is sending token via postMessage'
			}, 
			{ status: 403 }
		);
	}
	
	return handleAuth({
		login: handleLogin({
			authorizationParams: { audience, scope },
		}),
	})(request, { params });
}