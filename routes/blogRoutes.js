const express = require('express');
const router = express.Router();
const {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog
} = require('../controllers/blogController');
const { protect } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary'); // Use uploadImage instead of upload

// Use uploadImage for Cloudinary upload
router.route('/')
  .get(getBlogs)
  .post(protect, uploadImage.single('coverImage'), createBlog);

router.route('/:id')
  .get(getBlogById)
  .put(protect, uploadImage.single('coverImage'), updateBlog)
  .delete(protect, deleteBlog);

module.exports = router;