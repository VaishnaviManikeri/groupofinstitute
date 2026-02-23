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
const { upload } = require('../config/cloudinary');

router.route('/')
  .get(getBlogs)
  .post(protect, upload.single('coverImage'), createBlog);

router.route('/:id')
  .get(getBlogById)
  .put(protect, upload.single('coverImage'), updateBlog)
  .delete(protect, deleteBlog);

module.exports = router;