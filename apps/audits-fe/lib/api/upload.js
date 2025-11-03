import axios from '../axios';

/**
 * @desc    Uploads an image file to the server and reports progress
 * @param   {File} file - The image file object
 * @param   {function} onProgress - Callback function to report upload progress
 * @returns {Promise<string>} The URL of the uploaded file from Cloudinary
 */
export const uploadImage = async (file, onProgress) => {
  try {
  const formData = new FormData();
  const filename = (file && (file.name || file.filename)) || 'upload.jpg';
  formData.append('image', file, filename); // 'image' must match the key expected by multer

    const response = await axios.post('/upload/image', formData, {
      // Let Axios set the correct multipart boundary header automatically
      onUploadProgress: onProgress,
    });
    
    return response.data.url; // Returns the secure_url from Cloudinary
  } catch (error) {
    const status = error?.response?.status;
    const msg = error?.response?.data?.error || error?.message || 'Image upload failed';
    console.error('Image upload failed:', { status, msg, data: error?.response?.data });
    const e = new Error(msg);
    e.status = status;
    throw e;
  }
};