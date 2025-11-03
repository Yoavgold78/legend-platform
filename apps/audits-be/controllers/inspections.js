import Inspection from '../models/Inspection.js';
import Template from '../models/Template.js';
import Store from '../models/Store.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js'; // --- הוספנו את המודל החדש ---
import { createAndSendNotification } from './notifications.js'; // --- הוספנו עבור push notifications ---
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import crypto from 'crypto';

// --- הוספנו פונקציית עזר ליצירת התראות ---
const createNotification = async (user, type, message, relatedItem) => {
    try {
        await Notification.create({
            user,
            type,
            message,
            relatedItem
        });
    } catch (error) {
        console.error(`Failed to create notification for user ${user}:`, error);
    }
};
// ------------------------------------------

// === MODIFIED: The main scoring function now supports section weights ===
const computeScores = (template, answers) => {
  const sectionScoresMap = new Map();

  for (const section of template.sections) {
    if (section.title) {
      // NEW: Store the weight of the section along with its scores. Default to 1.
      sectionScoresMap.set(section.title, { 
        score: 0, 
        maxScore: 0, 
        weight: typeof section.weight === 'number' ? section.weight : 1 
      });
    }
  }

  const getNormalized = (question, answer) => {
    if (!question) return null;
    if (question.type === 'yes_no') {
      const valueStr = String(answer.value).toLowerCase();
      if (valueStr === 'yes' || valueStr === 'כן') return 1;
      if (valueStr === 'no' || valueStr === 'לא') return 0;
      return null;
    }
    if (question.type === 'multiple_choice' && Array.isArray(question.options)) {
      const option = question.options.find(o => o.text === answer.value);
      if (!option) return null;
      const weights = question.options.map(o => (typeof o.weight === 'number' ? o.weight : (o.scoreWeight || 0)));
      const maxW = weights.length > 0 ? Math.max(...weights) : 0;
      const selectedW = typeof option.weight === 'number' ? option.weight : (option.scoreWeight || 0);
      if (maxW <= 0) {
        // Handle case where max weight is 0 or negative. If selected is positive, score is 1, else 0.
        return selectedW > 0 ? 1 : 0;
      }
      return selectedW / maxW;
    }
    if (question.type === 'slider' && Array.isArray(question.sliderRange)) {
      const [min, max] = question.sliderRange;
      if (typeof answer.value === 'number' && max > min) {
        return (answer.value - min) / (max - min);
      }
      return null;
    }
    return null;
  };

  for (const answer of answers) {
    let foundSection = null;
    let foundQuestion = null;

    for (const sec of template.sections) {
      const q = sec.questions.find(q => q._id.toString() === answer.questionId);
      if (q) { foundSection = sec; foundQuestion = q; break; }
    }

    let weightToUse = 1;
    let scoringQuestion = null;

    if (foundQuestion) {
      scoringQuestion = foundQuestion;
      weightToUse = typeof foundQuestion.weight === 'number' ? foundQuestion.weight : 1;
    } else if (typeof answer.questionId === 'string' && answer.questionId.includes('_followup_')) {
      const [parentId, idxStr] = answer.questionId.split('_followup_');
      const idx = Number(idxStr);
      for (const sec of template.sections) {
        const parent = sec.questions.find(q => q._id.toString() === parentId);
        if (!parent) continue;
        const fu = parent.conditionalTrigger && Array.isArray(parent.conditionalTrigger.followUpQuestions)
          ? parent.conditionalTrigger.followUpQuestions[idx]
          : null;
        if (fu) {
          foundSection = sec;
          scoringQuestion = {
            type: fu.type,
            options: fu.options || [],
            sliderRange: fu.sliderRange || [1, 10],
          };
          // Use weight from follow-up question if it exists, otherwise default to 1
          weightToUse = typeof fu.weight === 'number' ? fu.weight : 1;
          break;
        }
      }
    }

    if (!foundSection || !scoringQuestion || weightToUse <= 0) continue;

    // Skip scoring only for main questions that are filter questions
    // Follow-up questions should ALWAYS be scored, regardless of whether their parent is a filter question
    // Example: "Does the shop have toilets?" (filter question, not scored)
    //         -> "Are the toilets clean?" (follow-up question, IS scored)
    if (foundQuestion && foundQuestion.isFilterQuestion === true) {
      // This is a main question marked as filter question - skip scoring
      continue;
    }

    const normalized = getNormalized(scoringQuestion, answer);
    if (normalized === null) continue;

    const currentSection = sectionScoresMap.get(foundSection.title);
    if (currentSection) {
      currentSection.score += normalized * weightToUse;
      currentSection.maxScore += weightToUse;
    }
  }

  const sectionScores = Array.from(sectionScoresMap, ([sectionName, data]) => ({
    sectionName,
    score: data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0,
  }));

  // --- NEW: Weighted average calculation for the final score ---
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const sectionResult of sectionScores) {
      const sectionData = sectionScoresMap.get(sectionResult.sectionName);
      // Ensure the section has a valid score and a weight > 0
      if (sectionData && Number.isFinite(sectionResult.score) && sectionData.weight > 0) {
          totalWeightedScore += sectionResult.score * sectionData.weight;
          totalWeight += sectionData.weight;
      }
  }

  const finalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

  return { sectionScores, finalScore };
};


// @desc    Create a new inspection
// @route   POST /api/inspections
// @access  Private
export const createInspection = async (req, res) => {
  try {
    const { storeId, templateId, answers, summaryText } = req.body;
    const inspectorId = req.user.id;

    if (!storeId || !templateId || !answers) {
      return res.status(400).json({ success: false, error: 'Please provide all required fields' });
    }

    const template = await Template.findById(templateId).populate({
      path: 'sections.questions',
      model: 'Question',
    });

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const { sectionScores, finalScore } = computeScores(template, answers);

    const inspection = await Inspection.create({
      storeId,
      templateId,
      inspectorId,
      answers,
      summaryText: typeof summaryText === 'string' ? summaryText : '',
      finalScore,
      sectionScores,
    });

    // --- START: NOTIFICATION LOGIC ---
    const store = await Store.findById(storeId);
    const inspector = await User.findById(inspectorId);

    if (store && inspector) {
        const message = `ביקורת חדשה בוצעה בחנות '${store.name}' על ידי ${inspector.fullName} עם ציון ${Math.round(finalScore)}`;
        const relatedItem = { kind: 'Inspection', item: inspection._id };

        // 1. Notify all admins with BOTH dashboard notifications AND push notifications
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
            // Dashboard notification
            await createNotification(admin._id, 'NEW_INSPECTION', message, relatedItem);
            // Push notification
            await createAndSendNotification(admin._id, 'NEW_INSPECTION', message, relatedItem);
        }

        // 2. Notify all assigned managers of the store with BOTH dashboard notifications AND push notifications
        if (store.assignedManagers && store.assignedManagers.length > 0) {
            for (const managerId of store.assignedManagers) {
                // Dashboard notification
                await createNotification(managerId, 'NEW_INSPECTION', message, relatedItem);
                // Push notification
                await createAndSendNotification(managerId, 'NEW_INSPECTION', message, relatedItem);
            }
        }
    }
    // --- END: NOTIFICATION LOGIC ---

    res.status(201).json({ success: true, data: inspection });

  } catch (error) {
    console.error('Error creating inspection:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Preview inspection scores without saving
// @route   POST /api/inspections/preview
// @access  Private
export const previewInspection = async (req, res) => {
  try {
    const { templateId, answers } = req.body;
    if (!templateId || !answers) {
      return res.status(400).json({ success: false, error: 'Please provide templateId and answers' });
    }

    const template = await Template.findById(templateId).populate({
      path: 'sections.questions',
      model: 'Question',
    });

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const { sectionScores, finalScore } = computeScores(template, answers);
    res.status(200).json({ success: true, data: { sectionScores, finalScore } });
  } catch (error) {
    console.error('Error previewing inspection:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// All other functions (getInspections, getInspectionPdf, etc.) remain unchanged...
// ... (rest of the file is identical to the one you provided)

// @desc    Get all inspections
// @route   GET /api/inspections
// @access  Private
export const getInspections = async (req, res) => {
    try {
      let query = {};
      
      // *** START OF CHANGE: Removed inspector filter to show all inspections to all inspectors ***
      // The following 'if' block was commented out to remove the filter.
      // if (req.user.role !== 'admin') {
      //   query.inspectorId = req.user.id;
      // }
      // *** END OF CHANGE ***
  
      if (req.query.storeId) {
        query.storeId = req.query.storeId;
      }
  
      if (req.query.startDate && req.query.endDate) {
        query.performedAt = {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate),
        };
      }
  
      const inspections = await Inspection.find(query)
        .populate('storeId', 'name')
        .populate('templateId', 'name description')
        .sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: inspections });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
  
  // @desc    Get inspection as PDF
  // @route   GET /api/inspections/:id/pdf
  // @access  Private
  export const getInspectionPdf = async (req, res) => {
    try {
      const inspection = await Inspection.findById(req.params.id)
        .populate('storeId')
        .populate('inspectorId');
  
      if (!inspection) {
        return res.status(404).json({ success: false, error: 'Inspection not found' });
      }
  
      const previousInspection = await Inspection.findOne({
        storeId: inspection.storeId._id,
        createdAt: { $lt: inspection.createdAt },
      })
        .sort({ createdAt: -1 })
        .select('createdAt finalScore sectionScores');
  
    if (String(req.query.render || '').toLowerCase() === 'browser') {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({ args: ['--no-sandbox', '--font-render-hinting=none'] });
        const page = await browser.newPage();
    const token = req.header('x-auth-token') || req.query.token || '';
    await page.setExtraHTTPHeaders({ 'x-auth-token': token });
        await page.evaluateOnNewDocument((tkn) => {
          try { window.localStorage.setItem('token', String(tkn)); } catch (_) {}
        }, token);
    try { await page.addInitScript((tkn) => { try { window.localStorage.setItem('token', String(tkn)); } catch (_) {} }, token); } catch (_) {}
    await page.setViewport({ width: 1200, height: 1800, deviceScaleFactor: 1 });
    await page.emulateMediaType('screen');
        const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    const url = `${frontendBase}/inspection/results/${inspection._id}?print=1&token=${encodeURIComponent(token)}`;
        await page.goto(url, { waitUntil: 'networkidle0' });
        const isLogin = page.url().includes('/login');
        if (isLogin) {
          try {
            await page.evaluate((tkn) => { try { localStorage.setItem('token', String(tkn)); } catch(_){} }, token);
            const bust = Date.now();
            await page.goto(`${url}&_=${bust}`, { waitUntil: 'networkidle0' });
          } catch(_) { /* ignore */ }
        }
        try {
          await page.waitForSelector('.print-a4', { visible: true, timeout: 20000 });
        } catch (_) { /* continue anyway */ }
    try { await page.evaluate(() => (document && document.fonts && document.fonts.ready) || null); } catch (_) {}
        try { await page.waitForNetworkIdle({ idleTime: 500, timeout: 3000 }); } catch (_) {}
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' } });
        await browser.close();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=inspection-${inspection._id}.pdf`);
        return res.status(200).send(pdfBuffer);
      }
  
      const doc = new PDFDocument({ margin: 50 });
      try {
        const windir = process.env.WINDIR || (process.platform === 'win32' ? 'C:\\Windows' : null);
        const candidateFonts = [
          process.env.PDF_FONT_HEBREW_PATH,
          path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansHebrew-Regular.ttf'),
          windir ? path.join(windir, 'Fonts', 'NotoSansHebrew-Regular.ttf') : null,
          windir ? path.join(windir, 'Fonts', 'Arial.ttf') : null,
          windir ? path.join(windir, 'Fonts', 'ARIAL.TTF') : null,
          windir ? path.join(windir, 'Fonts', 'Tahoma.ttf') : null,
          windir ? path.join(windir, 'Fonts', 'TAHOMA.TTF') : null,
          '/usr/share/fonts/truetype/noto/NotoSansHebrew-Regular.ttf',
          '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        ].filter(Boolean);
        for (const fontPath of candidateFonts) {
          try {
            if (fontPath && fs.existsSync(fontPath)) {
              doc.font(fontPath);
              break;
            }
          } catch (_) { /* ignore */ }
        }
      } catch (_) {}
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        res.writeHead(200, {
          'Content-Length': Buffer.byteLength(pdfData),
          'Content-Type': 'application/pdf',
          'Content-disposition': `attachment;filename=inspection-${inspection._id}.pdf`,
        }).end(pdfData);
      });
  
      doc.fontSize(24).text('דוח סיכום ביקורת', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(12);
      doc.text(`מספר ביקורת: ${inspection._id}`, { align: 'right' });
      doc.text(`חנות: ${inspection.storeId?.name || ''}`, { align: 'right' });
      doc.text(`בודק: ${inspection.inspectorId?.fullName || ''}`, { align: 'right' });
      doc.text(`תאריך: ${new Date(inspection.createdAt).toLocaleDateString('he-IL')} ${new Date(inspection.createdAt).toLocaleTimeString('he-IL')}`, { align: 'right' });
      doc.moveDown(1.5);
      doc.fontSize(16).text(`ציון סופי: ${Math.round(inspection.finalScore ?? 0)}`, { align: 'right' });
      doc.moveDown(1);
  
      if (Array.isArray(inspection.sectionScores) && inspection.sectionScores.length > 0) {
        doc.fontSize(14).text('ציוני מקטעים', { underline: true, align: 'right' });
        doc.moveDown(0.5);
        doc.fontSize(12);
        inspection.sectionScores.forEach((s) => {
          doc.text(`${s.sectionName}: ${Math.round(s.score)}`, { align: 'right' });
        });
        doc.moveDown(1);
      }
  
      if (previousInspection && Array.isArray(previousInspection.sectionScores)) {
        const prevMap = new Map(previousInspection.sectionScores.map((s) => [s.sectionName, s.score]));
        const rows = (inspection.sectionScores || []).map((cur) => {
          const prev = prevMap.get(cur.sectionName);
          const diff = typeof prev === 'number' ? Math.round((cur.score || 0) - prev) : null;
          return { name: cur.sectionName, current: Math.round(cur.score || 0), previous: typeof prev === 'number' ? Math.round(prev) : null, diff };
        });
  
        doc.fontSize(14).text('עיקרי הממצאים (השוואה לדוח קודם)', { underline: true, align: 'right' });
        doc.moveDown(0.5);
  
        doc.fontSize(12).text(`תאריך דוח קודם: ${new Date(previousInspection.createdAt).toLocaleDateString('he-IL')}`, { align: 'right' });
        doc.moveDown(0.5);
        doc.text('מקטע | קודם | נוכחי | שינוי', { align: 'right' });
        rows.forEach((r) => {
          const prevText = r.previous !== null && r.previous !== undefined ? String(r.previous) : '—';
          const diffText = r.diff !== null && r.diff !== undefined ? (r.diff > 0 ? `+${r.diff}` : String(r.diff)) : '—';
          doc.text(`${r.name} | ${prevText} | ${r.current} | ${diffText}`, { align: 'right' });
        });
        doc.moveDown(1);
      }
  
      if (inspection.summaryText && inspection.summaryText.trim().length > 0) {
        doc.fontSize(14).text('סיכום הדוח', { underline: true, align: 'right' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(inspection.summaryText, { align: 'right' });
        doc.moveDown(0.5);
      }
  
      try {
        const photoUrls = (inspection.answers || []).flatMap((a) => Array.isArray(a.photos) ? a.photos : []);
        if (photoUrls.length > 0) {
          const toAbsoluteUrl = (u) => {
            if (!u) return null;
            if (/^https?:\/\//i.test(u)) return u;
            const base = `${req.protocol}://${req.get('host')}`;
            return `${base}${u.startsWith('/') ? u : `/${u}`}`;
          };
  
          const fetchBuffer = (url) => new Promise((resolve, reject) => {
            const lib = url.startsWith('https') ? https : http;
            lib.get(url, (resp) => {
              if (resp.statusCode && resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
                return resolve(fetchBuffer(resp.headers.location));
              }
              const chunks = [];
              resp.on('data', (d) => chunks.push(d));
              resp.on('end', () => resolve(Buffer.concat(chunks)));
            }).on('error', reject);
          });
  
          const abs = photoUrls.map(toAbsoluteUrl).filter(Boolean);
          const buffers = [];
          for (const u of abs) {
            try {
              const b = await fetchBuffer(u);
              buffers.push(b);
            } catch (_) { /* ignore single image error */ }
          }
  
          if (buffers.length > 0) {
            doc.addPage();
            doc.fontSize(16).text('תמונות מהביקורת', { align: 'right', underline: true });
            doc.moveDown(0.5);
  
            const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
            const gap = 10;
            const columns = 3;
            const imgWidth = Math.floor((pageWidth - gap * (columns - 1)) / columns);
            const imgHeight = imgWidth;
  
            let col = 0;
            let y = doc.y;
            for (const b of buffers) {
              const x = doc.page.margins.left + col * (imgWidth + gap);
              if (y + imgHeight > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
                y = doc.page.margins.top;
              }
              doc.image(b, x, y, { fit: [imgWidth, imgHeight], align: 'center', valign: 'center' });
              col += 1;
              if (col >= columns) {
                col = 0;
                y += imgHeight + gap;
              }
            }
          }
        }
      } catch (_) {}
  
      doc.end();
  
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
  
  // @desc    Get single inspection by ID
  // @route   GET /api/inspections/:id
  // @access  Private
  export const getInspection = async (req, res) => {
    try {
      const inspection = await Inspection.findById(req.params.id)
        .populate('storeId', 'name address')
        .populate('inspectorId', 'fullName')
        .populate({
          path: 'templateId',
          model: 'Template',
          populate: {
            path: 'sections.questions',
            model: 'Question'
          }
        });
  
      if (!inspection) {
        return res.status(404).json({ success: false, error: 'Inspection not found' });
      }
  
      res.status(200).json({ success: true, data: inspection });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Server Error' });
    }
  };
  
  // @desc    Generate or retrieve a shareable link for an inspection
  // @route   POST /api/inspections/:id/share
  // @access  Private
  export const generateShareableLink = async (req, res) => {
      try {
          const inspection = await Inspection.findById(req.params.id);
  
          if (!inspection) {
              return res.status(404).json({ success: false, error: 'Inspection not found' });
          }
  
          if (inspection.shareableToken && inspection.shareableTokenExpires > new Date()) {
              return res.json({ success: true, token: inspection.shareableToken });
          }
  
          const token = crypto.randomBytes(20).toString('hex');
          const expires = new Date();
          expires.setDate(expires.getDate() + 365);
  
          inspection.shareableToken = token;
          inspection.shareableTokenExpires = expires;
          await inspection.save();
  
          res.json({ success: true, token });
  
      } catch (error) {
          console.error('Error generating share link:', error);
          res.status(500).json({ success: false, error: 'Server error' });
      }
  };
  
  // @desc    Get a shared inspection using a token
  // @route   GET /api/inspections/share/:token
  // @access  Public
  export const getSharedInspection = async (req, res) => {
      try {
          const token = req.params.token;
  
          const inspection = await Inspection.findOne({
              shareableToken: token,
              shareableTokenExpires: { $gt: new Date() }
          })
          .populate('storeId', 'name address')
          .populate('inspectorId', 'fullName')
          .populate({
              path: 'templateId',
              model: 'Template',
              populate: {
                  path: 'sections.questions',
                  model: 'Question'
              }
          });
  
          if (!inspection) {
              return res.status(404).json({ success: false, error: 'Shared inspection not found or link has expired' });
          }
          
          const previousInspection = await Inspection.findOne({
            storeId: inspection.storeId,
            createdAt: { $lt: inspection.createdAt }
          }).sort({ createdAt: -1 });
          
          res.status(200).json({
            success: true,
            data: {
              current: inspection,
              previous: previousInspection
            }
          });
  
      } catch (error) {
          console.error('Error fetching shared inspection:', error);
          res.status(500).json({ success: false, error: 'Server error' });
      }
  };

  // @desc    Get answers from the previous inspection for the same store and template
// @route   GET /api/inspections/previous-answers?storeId=...&templateId=...
// @access  Private
export const getPreviousInspectionAnswers = async (req, res) => {
    try {
        const { storeId, templateId } = req.query;

        if (!storeId || !templateId) {
            return res.status(400).json({ success: false, error: 'storeId and templateId are required' });
        }

        // Find the most recent inspection for the given store and template
        const lastInspection = await Inspection.findOne({
            storeId,
            templateId
        })
        .sort({ createdAt: -1 })
        .select('answers'); // Select only the 'answers' field

        if (!lastInspection) {
            // This is likely the first inspection for this store/template combination
            return res.status(200).json({ success: true, data: [] });
        }

        res.status(200).json({ success: true, data: lastInspection.answers || [] });

    } catch (error) {
        console.error('Error fetching previous inspection answers:', error);
        res.status(500).json({ success: false, error: 'Server error while fetching previous answers' });
    }
};