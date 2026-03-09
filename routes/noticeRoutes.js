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
const { upload } = require('../config/cloudinary');

router.route('/')
  .get(getNotices)
  .post(protect, upload.single('file'), createNotice);

router.route('/:id')
  .get(getNoticeById)
  .put(protect, upload.single('file'), updateNotice)
  .delete(protect, deleteNotice);

module.exports = router;