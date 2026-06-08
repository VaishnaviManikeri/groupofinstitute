const Gallery = require('../models/Gallery');
const { cloudinary } = require('../config/cloudinary');
const axios = require('axios');

// @desc    Get all gallery items (UNLIMITED - No pagination)
// @route   GET /api/gallery
// @access  Public
const getGalleryItems = async (req, res) => {
  try {
    const { type, category, search } = req.query;
    const query = { isActive: true };

    if (type) query.type = type;
    if (category) query.category = category;
    if (search) {
      query.$text = { $search: search };
    }

    // NO LIMIT - Get ALL items
    const items = await Gallery.find(query)
      .sort({ order: -1, createdAt: -1 });

    const total = items.length;

    res.json({
      success: true,
      items,
      total,
      message: "All gallery items fetched successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching gallery items',
      error: error.message 
    });
  }
};

// @desc    Get single gallery item
// @route   GET /api/gallery/:id
// @access  Public
const getGalleryItemById = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Gallery item not found' 
      });
    }

    // Increment views
    item.views += 1;
    await item.save();

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching gallery item',
      error: error.message 
    });
  }
};

// @desc    Create gallery item (upload from file)
// @route   POST /api/gallery/image or /api/gallery/video
// @access  Private/Admin
const createGalleryItem = async (req, res) => {
  try {
    console.log('📸 Creating gallery item...');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      filename: req.file.filename
    } : 'No file');
    console.log('Request URL:', req.originalUrl);
    console.log('Request method:', req.method);
    
    // Extract data from request body
    const { 
      title, 
      description, 
      category, 
      tags, 
      sourceType = 'upload',
      mediaType // For compatibility with frontend
    } = req.body;
    
    // Validate required fields
    if (!title || title.trim() === '') {
      return res.status(400).json({ 
        success: false,
        message: 'Title is required',
        receivedData: req.body 
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded. Please select a file to upload.',
        receivedData: req.body 
      });
    }
    
    // Determine media type from route or body
    let type = 'image'; // Default to image
    
    // Check from URL path
    if (req.originalUrl && req.originalUrl.includes('/video')) {
      type = 'video';
    }
    // Check from body
    else if (mediaType) {
      type = mediaType;
    }
    else if (req.body.type) {
      type = req.body.type;
    }
    
    console.log(`📹 Media type determined: ${type}`);
    
    // Validate file type matches media type
    if (type === 'image' && !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ 
        success: false,
        message: 'File type mismatch. Expected image but received: ' + req.file.mimetype 
      });
    }
    
    if (type === 'video' && !req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({ 
        success: false,
        message: 'File type mismatch. Expected video but received: ' + req.file.mimetype 
      });
    }
    
    let url = '';
    let cloudinaryId = '';
    let thumbnail = '';
    
    // Process file based on upload method
    if (req.file) {
      // Check if file was uploaded to Cloudinary or local storage
      if (req.file.path && (req.file.path.includes('cloudinary') || req.file.path.startsWith('http'))) {
        // Cloudinary upload
        url = req.file.path;
        cloudinaryId = req.file.filename || req.file.public_id;
        
        console.log('✅ File uploaded to Cloudinary:', url);
        
        // For videos, generate thumbnail from Cloudinary
        if (type === 'video' && cloudinaryId) {
          try {
            thumbnail = cloudinary.url(cloudinaryId, {
              resource_type: 'video',
              format: 'jpg',
              transformation: [
                { width: 400, height: 300, crop: 'fill', quality: 'auto' }
              ]
            });
            console.log('🎬 Generated video thumbnail:', thumbnail);
          } catch (thumbError) {
            console.error('Error generating thumbnail from Cloudinary:', thumbError);
            thumbnail = 'https://via.placeholder.com/400x300?text=Video+Thumbnail';
          }
        }
      } 
      else if (req.file.path && !req.file.path.includes('cloudinary')) {
        // Local file upload - generate URL for local access
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5015}`;
        url = `${baseUrl}/uploads/${type}s/${req.file.filename}`;
        cloudinaryId = req.file.filename;
        
        console.log('✅ File saved locally:', url);
        
        // For local videos, use placeholder thumbnail
        if (type === 'video') {
          thumbnail = 'https://via.placeholder.com/400x300?text=Video+Thumbnail';
        }
      }
      else {
        // Unknown file source
        return res.status(400).json({ 
          success: false,
          message: 'File upload source not recognized',
          fileInfo: req.file
        });
      }
    }
    
    // Parse tags (handle both string and array)
    let tagsArray = [];
    if (tags) {
      if (Array.isArray(tags)) {
        tagsArray = tags;
      } else if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }
    
    // Create gallery item
    const galleryItem = new Gallery({
      title: title.trim(),
      description: description ? description.trim() : '',
      type: type,
      url: url,
      cloudinaryId: cloudinaryId,
      thumbnail: thumbnail,
      sourceType: sourceType,
      category: category || 'general',
      tags: tagsArray,
      uploadedBy: req.admin?._id || req.admin?.id || null,
      isActive: true,
      views: 0,
      order: 0
    });
    
    // Validate gallery item before saving
    const validationError = galleryItem.validateSync();
    if (validationError) {
      console.error('Validation error:', validationError);
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed', 
        errors: validationError.errors 
      });
    }
    
    const createdItem = await galleryItem.save();
    console.log('✅ Gallery item created successfully:', {
      id: createdItem._id,
      title: createdItem.title,
      type: createdItem.type,
      url: createdItem.url
    });
    
    res.status(201).json({
      success: true,
      message: 'Gallery item created successfully',
      data: createdItem
    });
    
  } catch (error) {
    console.error('❌ Error in createGalleryItem:', error);
    console.error('Error stack:', error.stack);
    
    // Specific error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: 'Validation Error', 
        errors: Object.values(error.errors).map(e => e.message),
        details: error.message
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Duplicate entry error',
        details: 'An item with this data already exists'
      });
    }
    
    // Send detailed error for debugging
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating gallery item',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      details: {
        body: req.body,
        file: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : null
      }
    });
  }
};

// @desc    Create gallery item from URL
// @route   POST /api/gallery/from-url
// @access  Private/Admin
const createGalleryItemFromUrl = async (req, res) => {
  try {
    console.log('🔗 Creating gallery item from URL...');
    console.log('Request body:', req.body);
    
    const { title, description, type, url, category, tags } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ 
        success: false,
        message: 'Title is required' 
      });
    }

    if (!url || url.trim() === '') {
      return res.status(400).json({ 
        success: false,
        message: 'URL is required' 
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (err) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid URL format. Please enter a valid URL.' 
      });
    }

    let mediaType = type || 'image';
    let thumbnail = '';
    
    // For videos, try to extract thumbnail from YouTube/Vimeo
    if (mediaType === 'video') {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = extractYouTubeId(url);
        if (videoId) {
          thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          console.log('🎬 YouTube thumbnail generated:', thumbnail);
        }
      } else if (url.includes('vimeo.com')) {
        // Vimeo thumbnail would need API call, using placeholder
        thumbnail = 'https://via.placeholder.com/400x300?text=Vimeo+Video';
      } else {
        thumbnail = 'https://via.placeholder.com/400x300?text=Video+Thumbnail';
      }
    }

    // Parse tags
    let tagsArray = [];
    if (tags) {
      tagsArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
    }

    const galleryItem = new Gallery({
      title: title.trim(),
      description: description ? description.trim() : '',
      type: mediaType,
      url: url,
      sourceType: 'url',
      category: category || 'general',
      tags: tagsArray,
      thumbnail: thumbnail,
      uploadedBy: req.admin?._id || req.admin?.id || null,
      isActive: true,
      views: 0,
      order: 0
    });

    const createdItem = await galleryItem.save();
    console.log('✅ Gallery item created from URL successfully:', createdItem._id);
    
    res.status(201).json({
      success: true,
      message: 'Gallery item created successfully',
      data: createdItem
    });
  } catch (error) {
    console.error('❌ Error in createGalleryItemFromUrl:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating gallery item from URL',
      error: error.message 
    });
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
    console.log('✏️ Updating gallery item:', req.params.id);
    console.log('Update data:', req.body);
    
    const { title, description, category, tags, isActive, order, type, url } = req.body;

    const galleryItem = await Gallery.findById(req.params.id);

    if (!galleryItem) {
      return res.status(404).json({ 
        success: false,
        message: 'Gallery item not found' 
      });
    }

    // Update fields if provided
    if (title) galleryItem.title = title.trim();
    if (description !== undefined) galleryItem.description = description ? description.trim() : '';
    if (category) galleryItem.category = category;
    if (isActive !== undefined) galleryItem.isActive = isActive;
    if (order !== undefined) galleryItem.order = order;
    if (type) galleryItem.type = type;
    if (url) galleryItem.url = url;
    
    if (tags) {
      galleryItem.tags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
    }

    const updatedItem = await galleryItem.save();
    console.log('✅ Gallery item updated successfully:', updatedItem._id);
    
    res.json({
      success: true,
      message: 'Gallery item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('❌ Error in updateGalleryItem:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating gallery item',
      error: error.message 
    });
  }
};

// @desc    Delete gallery item
// @route   DELETE /api/gallery/:id
// @access  Private/Admin
const deleteGalleryItem = async (req, res) => {
  try {
    console.log('🗑️ Deleting gallery item:', req.params.id);
    
    const galleryItem = await Gallery.findById(req.params.id);

    if (!galleryItem) {
      return res.status(404).json({ 
        success: false,
        message: 'Gallery item not found' 
      });
    }

    // Delete from Cloudinary if it was uploaded and cloudinaryId exists
    if (galleryItem.cloudinaryId && cloudinary) {
      try {
        const resourceType = galleryItem.type === 'video' ? 'video' : 'image';
        const result = await cloudinary.uploader.destroy(galleryItem.cloudinaryId, { 
          resource_type: resourceType 
        });
        console.log('✅ Deleted from Cloudinary:', result);
      } catch (cloudinaryError) {
        console.error('⚠️ Error deleting from Cloudinary:', cloudinaryError);
        // Continue with deletion even if Cloudinary delete fails
      }
    }

    await galleryItem.deleteOne();
    console.log('✅ Gallery item deleted successfully');
    
    res.json({ 
      success: true,
      message: 'Gallery item removed successfully' 
    });
  } catch (error) {
    console.error('❌ Error in deleteGalleryItem:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while deleting gallery item',
      error: error.message 
    });
  }
};

// @desc    Get all gallery items for admin (UNLIMITED - No pagination)
// @route   GET /api/gallery/admin/all
// @access  Private/Admin
const getAdminGalleryItems = async (req, res) => {
  try {
    const { type, category, search, isActive } = req.query;
    const query = {};

    if (type) query.type = type;
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$text = { $search: search };
    }

    // NO LIMIT - Get ALL items for admin
    const items = await Gallery.find(query)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email');

    const total = items.length;

    res.json({
      success: true,
      items,
      total,
      message: "All gallery items fetched successfully for admin"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching admin gallery items',
      error: error.message 
    });
  }
};

// @desc    Get gallery categories
// @route   GET /api/gallery/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Gallery.distinct('category', { isActive: true });
    res.json({
      success: true,
      categories,
      total: categories.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching categories',
      error: error.message 
    });
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
