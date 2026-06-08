const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadImage, uploadVideo } = require('../config/cloudinary');
const {
  getGalleryItems,
  getGalleryItemById,
  createGalleryItem,
  createGalleryItemFromUrl,
  updateGalleryItem,
  deleteGalleryItem,
  getAdminGalleryItems,
  getCategories,
  getGalleryCount  // ADD THIS LINE - IMPORT THE FUNCTION
} = require('../controllers/galleryController');

// =============================
// PUBLIC ROUTES (No authentication required)
// =============================
router.get('/', getGalleryItems);
router.get('/categories', getCategories);
router.get('/:id', getGalleryItemById);

// =============================
// DEBUG ROUTES (Admin only)
// =============================
router.get('/debug/count', protect, getGalleryCount);  // NOW getGalleryCount IS DEFINED

// =============================
// ADMIN ROUTES (Authentication required)
// =============================

// Get all gallery items for admin (with filters)
router.get('/admin/all', protect, getAdminGalleryItems);

// Create gallery item from URL
router.post('/from-url', protect, createGalleryItemFromUrl);

// Create gallery item from file upload - specific endpoints
router.post('/image', protect, uploadImage.single('file'), createGalleryItem);
router.post('/video', protect, uploadVideo.single('file'), createGalleryItem);

// Generic POST route for backward compatibility
router.post('/', protect, async (req, res, next) => {
  try {
    // Check if it's a URL upload
    if (req.body.mediaUrl || req.body.url) {
      req.body.url = req.body.mediaUrl || req.body.url;
      req.body.type = req.body.mediaType || req.body.type;
      return createGalleryItemFromUrl(req, res);
    } 
    // Check if it's a file upload
    else if (req.files || req.file || (req.body.media && req.body.media !== 'null')) {
      const mediaType = req.body.mediaType || req.body.type || 'image';
      const uploader = mediaType === 'video' ? uploadVideo : uploadImage;
      
      return uploader.single('media')(req, res, (err) => {
        if (err) {
          console.error('Upload error:', err);
          return res.status(400).json({ message: 'File upload failed: ' + err.message });
        }
        return createGalleryItem(req, res);
      });
    }
    
    return res.status(400).json({ 
      message: 'Invalid request. Please provide either a file upload or a URL.',
      receivedBody: req.body,
      receivedFiles: req.file ? 'File present' : 'No file',
      expectedFormat: {
        fileUpload: {
          method: 'POST',
          contentType: 'multipart/form-data',
          fields: ['title', 'description', 'category', 'mediaType', 'media (file)']
        },
        urlUpload: {
          method: 'POST',
          contentType: 'application/json',
          fields: ['title', 'description', 'category', 'mediaType', 'mediaUrl']
        }
      }
    });
  } catch (error) {
    console.error('Error in generic gallery route:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update gallery item
router.put('/:id', protect, async (req, res, next) => {
  try {
    if (req.body.mediaType) {
      req.body.type = req.body.mediaType;
      delete req.body.mediaType;
    }
    if (req.body.mediaUrl) {
      req.body.url = req.body.mediaUrl;
      delete req.body.mediaUrl;
    }
    
    return updateGalleryItem(req, res);
  } catch (error) {
    console.error('Error in update route:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Delete gallery item
router.delete('/:id', protect, deleteGalleryItem);

// =============================
// HEALTH CHECK FOR GALLERY ROUTES
// =============================
router.get('/health/check', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Gallery routes are working',
    endpoints: {
      public: [
        'GET /',
        'GET /categories',
        'GET /:id'
      ],
      admin: [
        'GET /admin/all',
        'GET /debug/count',
        'POST /',
        'POST /image',
        'POST /video',
        'POST /from-url',
        'PUT /:id',
        'DELETE /:id'
      ]
    }
  });
});

module.exports = router;
