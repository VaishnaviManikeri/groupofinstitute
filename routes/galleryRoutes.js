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
const { upload } = require('../config/cloudinary');

router.route('/')
  .get(getGalleryItems)
  .post(protect, upload.single('media'), createGalleryItem);

router.route('/:id')
  .get(getGalleryItemById)
  .put(protect, upload.single('media'), updateGalleryItem)
  .delete(protect, deleteGalleryItem);

module.exports = router;