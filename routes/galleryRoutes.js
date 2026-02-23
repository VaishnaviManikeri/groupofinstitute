const express = require('express');
const router = express.Router();
const {
  getGalleryImages,
  getGalleryImageById,
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage
} = require('../controllers/galleryController');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

router.route('/')
  .get(getGalleryImages)
  .post(protect, upload.single('image'), createGalleryImage);

router.route('/:id')
  .get(getGalleryImageById)
  .put(protect, upload.single('image'), updateGalleryImage)
  .delete(protect, deleteGalleryImage);

module.exports = router;