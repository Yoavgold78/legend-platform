import axios from '../axios'; // Import the centralized Axios instance

/**
 * @desc    Fetch all available stores
 * @route   GET /api/stores
 * @access  Private (Inspector)
 */
export const getAllStores = async () => {
  try {
    // Retrieve API access token and attach Authorization header
    const tokenResponse = await fetch('/api/auth/token');
    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token');
    }
    const { accessToken } = await tokenResponse.json();
    const tokenHeader = accessToken?.startsWith('Bearer ')
      ? accessToken
      : `Bearer ${accessToken}`;

    const response = await axios.get('/stores', {
      headers: {
        Authorization: tokenHeader,
      },
    });
    return response.data.data; // Return the array of stores
  } catch (error) {
    console.error('Failed to fetch stores:', error);
    // Re-throw the error to be handled by the UI
    throw error;
  }
};