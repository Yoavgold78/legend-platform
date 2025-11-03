import axios from '../axios';

/**
 * יוצר תבנית חדשה.
 * @param {object} templateData - אובייקט התבנית המלא.
 * @returns {Promise<object>} המידע על התבנית החדשה שנוצרה.
 */
export const createTemplate = async (templateData) => {
  const response = await axios.post('/templates', templateData);
  return response.data;
};

/**
 * מביא את כל תבניות הביקורת הזמינות (ללא סינון).
 * @returns {Promise<Array<object>>} מערך של אובייקטי תבניות.
 */
export const getAllTemplates = async () => {
  try {
    const response = await axios.get('/templates');
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    throw error;
  }
};

/**
 * חדש: מביא את כל התבניות המשויכות לחנות ספציפית.
 * @param {string} storeId - ה-ID של החנות.
 * @returns {Promise<Array<object>>} מערך של אובייקטי תבניות מסוננים.
 */
export const getTemplatesByStore = async (storeId) => {
  try {
    const response = await axios.get('/templates', {
      params: { storeId } // כך אנו שולחים את מזהה החנות לשרת
    });
    return response.data.data;
  } catch (error)
 {
    console.error(`Failed to fetch templates for store ${storeId}:`, error);
    throw error;
  }
};


/**
 * מביא תבנית ספציפית לפי ID, כולל כל הסעיפים והשאלות שלה.
 * @param {string} templateId - ה-ID של התבנית.
 * @returns {Promise<object>} אובייקט התבנית המלא.
 */
export const getTemplateById = async (templateId) => {
  try {
    const response = await axios.get(`/templates/${templateId}`);
    return response.data.data;
  } catch (error) {
    console.error(`Failed to fetch template ${templateId}:`, error);
    throw error;
  }
};