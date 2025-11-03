import multer from 'multer';
import sharp from 'sharp';
import cloudinary from 'cloudinary';

// Configure Cloudinary - since dotenv is already loaded in index.js, env vars should be available
console.log('[upload] CLOUDINARY_URL exists:', !!process.env.CLOUDINARY_URL);

if (process.env.CLOUDINARY_URL) {
  // Parse the CLOUDINARY_URL manually to ensure it's configured correctly
  const url = new URL(process.env.CLOUDINARY_URL);
  const cloud_name = url.hostname;
  const api_key = url.username;
  const api_secret = url.password;
  
  console.log('[upload] Parsed cloud_name:', cloud_name);
  console.log('[upload] Parsed api_key exists:', !!api_key);
  
  cloudinary.v2.config({
    cloud_name: cloud_name,
    api_key: api_key,
    api_secret: api_secret,
    secure: true,
  });
  
  console.log('[upload] After manual config, api_key present:', !!cloudinary.v2.config().api_key);
} else {
  console.error('[upload] CLOUDINARY_URL not found in environment variables');
}

// Multer setup for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// @desc    Upload image
// @route   POST /api/upload/image
// @access  Private
export const uploadImage = async (req, res) => {
  try {
    // Configure Cloudinary at runtime to ensure env vars are available
    console.log('[upload] Runtime CLOUDINARY_URL check:', !!process.env.CLOUDINARY_URL);
    
    if (process.env.CLOUDINARY_URL) {
      const url = new URL(process.env.CLOUDINARY_URL);
      cloudinary.v2.config({
        cloud_name: url.hostname,
        api_key: url.username,
        api_secret: url.password,
        secure: true,
      });
      console.log('[upload] Runtime config applied, api_key:', !!cloudinary.v2.config().api_key);
    } else {
      console.error('[upload] CLOUDINARY_URL missing at runtime');
      return res.status(500).json({ success: false, error: 'Cloudinary not configured' });
    }

    const contentType = req.headers['content-type'];
    const bodyKeys = req.body ? Object.keys(req.body) : [];
    const files = req.files;
    const single = req.file;
    console.log('[upload] content-type:', contentType);
    console.log('[upload] body keys:', bodyKeys);
    if (single) console.log('[upload] single file fieldname:', single.fieldname, 'size:', single.size);
    if (files) {
      const map = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]));
      console.log('[upload] files map:', map);
    }

    const incomingFile = single || files?.image?.[0] || files?.file?.[0];
    if (!incomingFile) {
      return res.status(400).json({ success: false, error: 'No image file provided (expected field "image" or "file")' });
    }

    // Resize image using sharp
    const resizedImageBuffer = await sharp(incomingFile.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .toBuffer();

    // Upload to Cloudinary
    cloudinary.v2.uploader.upload_stream(
      { resource_type: 'image' },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ success: false, error: 'Image upload failed' });
        }
        res.status(200).json({ success: true, url: result.secure_url });
      }
    ).end(resizedImageBuffer);

  } catch (error) {
    console.error('Upload controller error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Accept common field names. Multer will expose files under req.files
export const uploadMiddleware = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);