'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import axios from '../lib/axios';

export const useAuth0Api = () => {
  const { user } = useUser();

  const makeAuthenticatedRequest = async (method: string, url: string, data: any = null) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Try to get the access token from the API route
      const tokenResponse = await fetch('/api/auth/token');
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }
      
      const { accessToken } = await tokenResponse.json();
      
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const tokenHeader = accessToken.startsWith('Bearer ')
        ? accessToken
        : `Bearer ${accessToken}`;

      const config = {
        headers: { 
          'Authorization': tokenHeader,
          'Content-Type': 'application/json'
        }
      };

      console.log('Making authenticated request:', { method, url, hasToken: !!accessToken });

      if (method === 'GET') {
        return await axios.get(url, config);
      } else if (method === 'POST') {
        return await axios.post(url, data, config);
      } else if (method === 'PUT') {
        return await axios.put(url, data, config);
      } else if (method === 'DELETE') {
        return await axios.delete(url, config);
      }
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };

  return { makeAuthenticatedRequest, user };
};