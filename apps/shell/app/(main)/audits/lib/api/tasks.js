import axios from '../axios';

/**
 * @desc    Create a new task for an inspection
 * @route   POST /api/tasks
 * @access  Private (Inspector/Admin)
 */
export const createTask = async (taskData) => {
  try {
    // THE FIX: Removed the extra '/api' prefix. 
    // The base URL in the main axios instance already includes '/api'.
    const response = await axios.post('/tasks', taskData);
    return response.data;
  } catch (error) {
    console.error('Failed to create task:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create task');
  }
};


/**
 * Fetches the tasks assigned to the currently logged-in manager.
 * The user's token is sent automatically by the axios instance.
 * @param {string} selectedStoreId - Filter tasks by store ID ('all' for all stores)
 * @returns {Promise<Array>} A promise that resolves to an array of task objects.
 */
export const getManagerTasks = async (selectedStoreId) => {
    try {
        const params = selectedStoreId && selectedStoreId !== 'all' 
            ? { storeId: selectedStoreId } 
            : {};
        const { data } = await axios.get('/tasks/mytasks', { params });
        return data;
    } catch (error) {
        // Log the error and re-throw it for the component to handle
        console.error('Error fetching manager tasks:', error.response?.data?.message || error.message);
        throw new Error(error.response?.data?.message || 'Failed to fetch tasks');
    }
};

/**
 * Fetch tasks for a specific inspection
 * @route GET /api/tasks/by-inspection/:inspectionId
 */
export const getTasksByInspection = async (inspectionId) => {
  try {
    const { data } = await axios.get(`/tasks/by-inspection/${inspectionId}`);
    return data;
  } catch (error) {
    console.error('Error fetching tasks by inspection:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch tasks by inspection');
  }
};

/**
 * Fetch previous inspection's tasks for a store+template before a given date
 * @route GET /api/tasks/previous-for?storeId=&templateId=&before=
 */
export const getPreviousInspectionTasks = async ({ storeId, templateId, before }) => {
  try {
    const params = new URLSearchParams({ storeId, templateId, before }).toString();
    const { data } = await axios.get(`/tasks/previous-for?${params}`);
    return data;
  } catch (error) {
    console.error('Error fetching previous inspection tasks:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch previous inspection tasks');
  }
};