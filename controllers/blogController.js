const Blog = require('../models/Blog');
const { cloudinary } = require('../config/cloudinary');

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single blog
// @route   GET /api/blogs/:id
// @access  Public
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (blog) {
      blog.views += 1;
      await blog.save();
      res.json(blog);
    } else {
      res.status(404).json({ message: 'Blog not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create blog
// @route   POST /api/blogs
// @access  Private/Admin
const createBlog = async (req, res) => {
  try {
    const { title, content, excerpt, author, tags } = req.body;

    let coverImage, cloudinaryId;
    
    // Log the file for debugging
    console.log('Uploaded file:', req.file);
    
    if (req.file) {
      // For Cloudinary storage, the path is the secure URL
      coverImage = req.file.path; // This should be the Cloudinary URL
      cloudinaryId = req.file.filename; // This is the public_id
      
      // Log the URLs for debugging
      console.log('Cover Image URL:', coverImage);
      console.log('Cloudinary ID:', cloudinaryId);
    }

    const blog = await Blog.create({
      title,
      content,
      excerpt,
      author,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
      coverImage,
      cloudinaryId
    });

    res.status(201).json(blog);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    blog.title = req.body.title || blog.title;
    blog.content = req.body.content || blog.content;
    blog.excerpt = req.body.excerpt || blog.excerpt;
    blog.author = req.body.author || blog.author;
    blog.tags = req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',').map(tag => tag.trim())) : blog.tags;

    if (req.file) {
      // Delete old image from cloudinary
      if (blog.cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(blog.cloudinaryId);
          console.log('Deleted old image:', blog.cloudinaryId);
        } catch (deleteError) {
          console.error('Error deleting old image:', deleteError);
        }
      }
      
      blog.coverImage = req.file.path;
      blog.cloudinaryId = req.file.filename;
      
      console.log('Updated Cover Image URL:', blog.coverImage);
    }

    const updatedBlog = await blog.save();
    res.json(updatedBlog);
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Delete image from cloudinary
    if (blog.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(blog.cloudinaryId);
        console.log('Deleted image:', blog.cloudinaryId);
      } catch (deleteError) {
        console.error('Error deleting image:', deleteError);
      }
    }

    await blog.deleteOne();
    res.json({ message: 'Blog removed' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog
};