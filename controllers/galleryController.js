const Gallery = require('../models/Gallery');
const { cloudinary } = require('../config/cloudinary');
const axios = require('axios');

// @desc    Get all gallery items
// @route   GET /api/gallery
// @access  Public
const getGalleryItems = async (req, res) => {
  try {
    const { type, category, search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    if (type) query.type = type;
    if (category) query.category = category;
    if (search) {
      query.$text = { $search: search };
    }

    const items = await Gallery.find(query)
      .sort({ order: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Gallery.countDocuments(query);

    res.json({
      items,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single gallery item
// @route   GET /api/gallery/:id
// @access  Public
const getGalleryItemById = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Gallery item not found' });
    }

    // Increment views
    item.views += 1;
    await item.save();

    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create gallery item (upload from file)
// @route   POST /api/gallery
// @access  Private/Admin
const createGalleryItem = async (req, res) => {
  try {
    const { title, description, type, category, tags, sourceType = 'upload' } = req.body;
    
    let url = '';
    let cloudinaryId = '';
    let thumbnail = '';

    if (req.file) {
      // File uploaded through multer
      url = req.file.path;
      cloudinaryId = req.file.filename;
      
      // For videos, generate thumbnail (Cloudinary provides it automatically)
      if (type === 'video') {
        thumbnail = cloudinary.url(cloudinaryId, {
          resource_type: 'video',
          format: 'jpg',
          transformation: [{ width: 400, height: 300, crop: 'fill' }]
        });
      }
    } else {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const galleryItem = new Gallery({
      title,
      description,
      type,
      url,
      cloudinaryId,
      thumbnail,
      sourceType,
      category: category || 'general',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      uploadedBy: req.admin._id
    });

    const createdItem = await galleryItem.save();
    res.status(201).json(createdItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create gallery item from URL
// @route   POST /api/gallery/from-url
// @access  Private/Admin
const createGalleryItemFromUrl = async (req, res) => {
  try {
    const { title, description, type, url, category, tags } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid URL format' });
    }

    // For videos, try to extract video ID from YouTube/Vimeo if needed
    let thumbnail = '';
    if (type === 'video') {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = extractYouTubeId(url);
        if (videoId) {
          thumbnail = `https://img.youtube.com/vi/${videoId}/0.jpg`;
        }
      } else if (url.includes('vimeo.com')) {
        // Vimeo thumbnail would need API call, using placeholder for now
        thumbnail = '/api/placeholder/400/300';
      }
    }

    const galleryItem = new Gallery({
      title,
      description,
      type,
      url,
      sourceType: 'url',
      category: category || 'general',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      thumbnail,
      uploadedBy: req.admin._id
    });

    const createdItem = await galleryItem.save();
    res.status(201).json(createdItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to extract YouTube ID
const extractYouTubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// @desc    Update gallery item
// @route   PUT /api/gallery/:id
// @access  Private/Admin
const updateGalleryItem = async (req, res) => {
  try {
    const { title, description, category, tags, isActive, order } = req.body;

    const galleryItem = await Gallery.findById(req.params.id);

    if (!galleryItem) {
      return res.status(404).json({ message: 'Gallery item not found' });
    }

    // Update fields
    galleryItem.title = title || galleryItem.title;
    galleryItem.description = description || galleryItem.description;
    galleryItem.category = category || galleryItem.category;
    galleryItem.isActive = isActive !== undefined ? isActive : galleryItem.isActive;
    galleryItem.order = order !== undefined ? order : galleryItem.order;
    
    if (tags) {
      galleryItem.tags = tags.split(',').map(tag => tag.trim());
    }

    const updatedItem = await galleryItem.save();
    res.json(updatedItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete gallery item
// @route   DELETE /api/gallery/:id
// @access  Private/Admin
const deleteGalleryItem = async (req, res) => {
  try {
    const galleryItem = await Gallery.findById(req.params.id);

    if (!galleryItem) {
      return res.status(404).json({ message: 'Gallery item not found' });
    }

    // Delete from Cloudinary if it was uploaded
    if (galleryItem.cloudinaryId) {
      try {
        const resourceType = galleryItem.type === 'video' ? 'video' : 'image';
        await cloudinary.uploader.destroy(galleryItem.cloudinaryId, { 
          resource_type: resourceType 
        });
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
      }
    }

    await galleryItem.deleteOne();
    res.json({ message: 'Gallery item removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all gallery items (admin)
// @route   GET /api/gallery/admin
// @access  Private/Admin
const getAdminGalleryItems = async (req, res) => {
  try {
    const { type, category, search, page = 1, limit = 20, isActive } = req.query;
    const query = {};

    if (type) query.type = type;
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$text = { $search: search };
    }

    const items = await Gallery.find(query)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Gallery.countDocuments(query);

    res.json({
      items,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get gallery categories
// @route   GET /api/gallery/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Gallery.distinct('category', { isActive: true });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getGalleryItems,
  getGalleryItemById,
  createGalleryItem,
  createGalleryItemFromUrl,
  updateGalleryItem,
  deleteGalleryItem,
  getAdminGalleryItems,
  getCategories
};