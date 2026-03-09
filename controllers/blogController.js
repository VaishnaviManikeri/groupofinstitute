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
    if (req.file) {
      coverImage = req.file.path;
      cloudinaryId = req.file.filename;
    }

    const blog = await Blog.create({
      title,
      content,
      excerpt,
      author,
      tags: tags ? tags.split(',') : [],
      coverImage,
      cloudinaryId
    });

    res.status(201).json(blog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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
    blog.tags = req.body.tags ? req.body.tags.split(',') : blog.tags;

    if (req.file) {
      // Delete old image from cloudinary
      if (blog.cloudinaryId) {
        await cloudinary.uploader.destroy(blog.cloudinaryId);
      }
      
      blog.coverImage = req.file.path;
      blog.cloudinaryId = req.file.filename;
    }

    const updatedBlog = await blog.save();
    res.json(updatedBlog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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
      await cloudinary.uploader.destroy(blog.cloudinaryId);
    }

    await blog.deleteOne();
    res.json({ message: 'Blog removed' });
  } catch (error) {
    console.error(error);
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