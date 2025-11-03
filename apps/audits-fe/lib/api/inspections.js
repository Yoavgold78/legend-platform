import axios from '../axios'; // Import the centralized Axios instance

/**
 * @desc    Fetch all inspections for all inspectors.
 * @route   GET /api/inspections
 * @access  Private (Inspector)
 */
export const getAllInspections = async () => {
  try {
    const response = await axios.get('/inspections');
    return response.data.data; // Return the array of inspections
  } catch (error) {
    console.error('Failed to fetch inspections:', error);
    // Re-throw the error to be handled by the calling component
    throw error;
  }
};

/**
 * @desc    Create a new inspection
 * @route   POST /api/inspections
 * @access  Private (Inspector)
 */
export const createInspection = async (inspectionData) => {
  try {
    const response = await axios.post('/inspections', inspectionData);
    return response.data.data;
  } catch (error) {
    console.error('Failed to create inspection:', error);
    throw error;
  }
};

/**
 * @desc    Preview an inspection (scores only) without saving
 * @route   POST /api/inspections/preview
 * @access  Private (Inspector)
 */
export const previewInspection = async (payload) => {
  try {
    const response = await axios.post('/inspections/preview', payload);
    return response.data.data; // { sectionScores, finalScore }
  } catch (error) {
    console.error('Failed to preview inspection:', error);
    throw error;
  }
};

/**
 * @desc    Get an inspection PDF download URL with token
 */
export const getInspectionPdfUrl = (id) => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  // Include token in URL as query parameter for new tab opening
  return `${API_BASE}/inspections/${id}/pdf?render=browser&token=${encodeURIComponent(token || '')}`;
};

/**
 * Fetch inspection PDF as a Blob (for sharing/downloading as a real file)
 * @param {string} id
 * @returns {Promise<Blob>}
 */
export const fetchInspectionPdfBlob = async (id) => {
  try {
    // Use axios instance which includes authorization headers
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await axios.get(`/inspections/${id}/pdf`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
      , params: { render: 'browser', token: token || undefined }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch PDF blob:', error);
    throw new Error('שגיאה בהורדת קובץ PDF');
  }
};
/**
 * @desc    Fetch a single inspection by its ID
 * @route   GET /api/inspections/:id
 * @access  Private
 */
export const getInspectionById = async (id) => {
  try {
    const response = await axios.get(`/inspections/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch inspection:', error);
    throw error;
  }
};

/**
 * Fetch inspections with optional filters (e.g., by store and date range)
 * @param {{ storeId?: string, startDate?: string, endDate?: string }} params
 */
export const getInspectionsFiltered = async (params = {}) => {
  try {
    const query = new URLSearchParams();
    if (params.storeId) query.set('storeId', params.storeId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    const response = await axios.get(`/inspections${qs ? `?${qs}` : ''}`);
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch filtered inspections:', error);
    throw error;
  }
};

/**
 * @desc    Fetch a public inspection by its share token
 * @route   GET /api/inspections/share/:token
 * @access  Public
 */
export const getSharedInspectionByToken = async (token) => {
  try {
    // This call does not need an auth header
    const response = await axios.get(`/inspections/share/${token}`);
    return response.data; // Returns { success: true, data: inspection }
  } catch (error) {
    console.error('Error fetching shared inspection:', error);
    throw error;
  }
};


/**
 * @desc    Request the backend to generate a share token for an inspection
 * @route   POST /api/inspections/:id/share
 * @access  Private
 */
export const generateShareLink = async (inspectionId) => {
  try {
    // Manually get the token from localStorage to ensure it's included.
    const token = localStorage.getItem('token');
    
    // Create a config object to explicitly pass the authorization header.
    const config = {
      headers: {
        'x-auth-token': token
      }
    };

    // Pass the config object with the header to the post request.
    // We pass an empty object {} as the second argument because this POST request has no body.
    const response = await axios.post(`/inspections/${inspectionId}/share`, {}, config);
    return response.data; // Returns { success: true, token: '...' }
  } catch (error) {
    console.error('Error generating share link:', error);
    throw error;
  }
};

/**
 * Fetches the answers from the most recent inspection for a given store and template.
 * @param {object} params - The parameters for the query.
 * @param {string} params.storeId - The ID of the store.
 * @param {string} params.templateId - The ID of the template.
 * @returns {Promise<any[]>} A promise that resolves to an array of answers.
 */
export const getPreviousAnswers = async ({ storeId, templateId }) => {
    try {
        const { data } = await axios.get('/inspections/previous-answers', {
            params: { storeId, templateId }
        });
        return data.data || [];
    } catch (error) {
        console.error("Failed to fetch previous answers:", error);
        // Return an empty array on failure so the UI doesn't crash
        return [];
    }
};