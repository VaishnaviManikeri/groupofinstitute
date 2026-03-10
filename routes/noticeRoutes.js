// backend/routes/noticeRoutes.js
const express = require('express');
const router = express.Router();
const {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice
} = require('../controllers/noticeController');
const { protect } = require('../middleware/auth');
const { uploadImage, uploadVideo } = require('../config/cloudinary'); // Change this line

// Use uploadImage for notices (assuming notices typically have images)
// Or create a separate upload middleware for notices if needed
router.route('/')
  .get(getNotices)
  .post(protect, uploadImage.single('file'), createNotice); // Changed from 'upload' to 'uploadImage'

router.route('/:id')
  .get(getNoticeById)
  .put(protect, uploadImage.single('file'), updateNotice) // Changed from 'upload' to 'uploadImage'
  .delete(protect, deleteNotice);

module.exports = router;