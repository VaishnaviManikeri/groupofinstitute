const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(getAnnouncements)
  .post(protect, createAnnouncement);

router.route('/:id')
  .get(getAnnouncementById)
  .put(protect, updateAnnouncement)
  .delete(protect, deleteAnnouncement);

module.exports = router;