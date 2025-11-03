import Template from '../models/Template.js';

// @desc    Create a template
// @route   POST /api/templates
// @access  Private/Admin
export const createTemplate = async (req, res) => {
  try {
    // אין צורך בשינוי כאן. השיוך יתבצע בעדכון התבנית לאחר היצירה.
    const template = await Template.create({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get all templates
// @route   GET /api/templates
// @access  Private
export const getTemplates = async (req, res) => {
  try {
    // שינינו את הלוגיקה כאן כדי להתמודד עם שיוך לחנויות
    const { storeId } = req.query;
    let query = {};

    if (storeId) {
      // אם בקר ביקש תבניות לחנות ספציפית
      query = {
        $or: [
          { associatedStores: storeId }, // החזר תבניות שמשויכות ספציפית לחנות זו
          { associatedStores: { $exists: true, $size: 0 } }, // וגם תבניות שלא משויכות לאף חנות (תבניות ישנות)
          { associatedStores: { $exists: false } } // וגם תבניות שנוצרו לפני שהוספנו את השדה
        ]
      };
    }
    // אם לא סופק storeId (מנהל במערכת), השאילתה תישאר ריקה ותחזיר את כל התבניות

    const templates = await Template.find(query);
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get a single template
// @route   GET /api/templates/:id
// @access  Private
export const getTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update a template
// @route   PUT /api/templates/:id
// @access  Private/Admin
export const updateTemplate = async (req, res) => {
  try {
    // אין צורך בשינוי כאן. הפונקציה הזו תדע לעדכן גם את שיוך החנויות
    const template = await Template.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete a template
// @route   DELETE /api/templates/:id
// @access  Private/Admin
export const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};