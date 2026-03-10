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
  getCategories
} = require('../controllers/galleryController');

// Public routes
router.get('/', getGalleryItems);
router.get('/categories', getCategories);
router.get('/:id', getGalleryItemById);

// Admin routes
router.get('/admin/all', protect, getAdminGalleryItems);
router.post('/from-url', protect, createGalleryItemFromUrl);
router.post('/image', protect, uploadImage.single('file'), createGalleryItem);
router.post('/video', protect, uploadVideo.single('file'), createGalleryItem);
router.put('/:id', protect, updateGalleryItem);
router.delete('/:id', protect, deleteGalleryItem);

module.exports = router;