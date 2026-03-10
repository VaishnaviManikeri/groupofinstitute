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
<<<<<<< HEAD
const { uploadImage } = require('../config/cloudinary'); // Use uploadImage instead of upload

// Use uploadImage for Cloudinary upload
router.route('/')
  .get(getBlogs)
  .post(protect, uploadImage.single('coverImage'), createBlog);

router.route('/:id')
  .get(getBlogById)
  .put(protect, uploadImage.single('coverImage'), updateBlog)
=======
const { upload } = require('../config/cloudinary');

router.route('/')
  .get(getBlogs)
  .post(protect, upload.single('coverImage'), createBlog);

router.route('/:id')
  .get(getBlogById)
  .put(protect, upload.single('coverImage'), updateBlog)
>>>>>>> f59ff490e5d7912350be636191086c98127b997b
  .delete(protect, deleteBlog);

module.exports = router;