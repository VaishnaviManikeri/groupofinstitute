const express = require('express');
const router = express.Router();
const {
  getGalleryItems,
  getGalleryItemById,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem
} = require('../controllers/galleryController');
const { protect } = require('../middleware/auth');
const { uploadToCloudinary } = require('../config/cloudinary');

// Debug middleware to log requests
router.use((req, res, next) => {
  console.log(`Gallery Route: ${req.method} ${req.originalUrl}`);
  next();
});

router.route('/')
  .get(getGalleryItems)
  .post(protect, uploadToCloudinary, createGalleryItem);

router.route('/:id')
  .get(getGalleryItemById)
  .put(protect, uploadToCloudinary, updateGalleryItem)
  .delete(protect, deleteGalleryItem);

module.exports = router;