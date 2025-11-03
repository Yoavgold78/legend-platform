import axios from '../axios';

/**
 * @desc    Create a new checklist template or task
 * @route   POST /api/checklists
 * @access  Private
 */
export const createChecklistTemplate = async (data) => {
  try {
    const response = await axios.post('/checklists', data);
    return response.data;
  } catch (error) {
    console.error('Failed to create checklist item:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create checklist item');
  }
};

/**
 * @desc    Get all templates and tasks for a specific store (includes universal tasks)
 * @route   GET /api/checklists/templates
 * @access  Private
 */
export const getChecklistTemplates = async (storeId, allItems = false) => {
  try {
    const params = new URLSearchParams({ 
      storeId, 
      allItems: allItems.toString() 
    }).toString();
    const response = await axios.get(`/checklists/templates?${params}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch checklist templates:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch checklist templates');
  }
};

/**
 * @desc    Get all universal tasks (admin only)
 * @route   GET /api/checklists/universal
 * @access  Private (Admin)
 */
export const getUniversalTasks = async () => {
  try {
    const response = await axios.get('/checklists/universal');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch universal tasks:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch universal tasks');
  }
};

/**
 * @desc    Get available universal task templates for managers to schedule
 * @route   GET /api/checklists/universal-templates
 * @access  Private
 */
export const getUniversalTemplates = async () => {
  try {
    const response = await axios.get('/checklists/universal-templates');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch universal templates:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch universal templates');
  }
};

/**
 * @desc    Get a single checklist item by ID
 * @route   GET /api/checklists/:id
 * @access  Private
 */
export const getChecklistTemplateById = async (id) => {
  try {
    const response = await axios.get(`/checklists/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch checklist item:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch checklist item');
  }
};

/**
 * @desc    Update a checklist item by ID
 * @route   PUT /api/checklists/:id
 * @access  Private
 */
export const updateChecklistTemplate = async (id, data) => {
  try {
    const response = await axios.put(`/checklists/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Failed to update checklist item:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to update checklist item');
  }
};

/**
 * @desc    Delete a checklist item by ID
 * @route   DELETE /api/checklists/:id
 * @access  Private
 */
export const deleteChecklistTemplate = async (id) => {
  try {
    await axios.delete(`/checklists/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete checklist item:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to delete checklist item');
  }
};

/**
 * @desc    Get the currently active checklist templates for a specific store
 * @route   GET /api/checklists/store/:storeId/active
 * @access  Private
 */
export const getActiveChecklist = async (storeId) => {
  try {
    const response = await axios.get(`/checklists/store/${storeId}/active`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch active checklist:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch active checklist');
  }
};

/**
 * @desc    Submit a completed checklist instance
 * @route   POST /api/checklist-instances
 * @access  Private
 */
export const submitChecklistInstance = async (data) => {
  try {
    const response = await axios.post('/checklist-instances', data);
    return response.data;
  } catch (error) {
    console.error('Failed to submit checklist instance:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to submit checklist instance');
  }
};