const Gallery = require('../models/Gallery');
const { cloudinary } = require('../config/cloudinary');

// @desc    Get all gallery items (UNLIMITED)
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

    // Get ALL items with NO LIMITS
    const items = await Gallery.find(query).sort({ order: -1, createdAt: -1 });

    console.log(`📸 Fetching gallery items: ${items.length} items found`);

    res.json({
      success: true,
      items: items,
      total: items.length,
      message: `Successfully fetched ${items.length} gallery items`
    });
  } catch (error) {
    console.error('Error in getGalleryItems:', error);
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
    
    const { title, description, category, tags, mediaType } = req.body;
    
    // Validate required fields
    if (!title || title.trim() === '') {
      return res.status(400).json({ 
        success: false,
        message: 'Title is required'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded. Please select a file to upload.'
      });
    }
    
    // Determine media type
    let type = 'image';
    if (req.originalUrl && req.originalUrl.includes('/video')) {
      type = 'video';
    } else if (mediaType) {
      type = mediaType;
    }
    
    console.log(`📹 Media type: ${type}`);
    
    let url = '';
    let cloudinaryId = '';
    let thumbnail = '';
    
    // Process file
    if (req.file) {
      if (req.file.path && (req.file.path.includes('cloudinary') || req.file.path.startsWith('http'))) {
        url = req.file.path;
        cloudinaryId = req.file.filename || req.file.public_id;
        console.log('✅ File uploaded to Cloudinary:', url);
        
        if (type === 'video' && cloudinaryId) {
          try {
            thumbnail = cloudinary.url(cloudinaryId, {
              resource_type: 'video',
              format: 'jpg',
              transformation: [{ width: 400, height: 300, crop: 'fill', quality: 'auto' }]
            });
          } catch (thumbError) {
            thumbnail = 'https://via.placeholder.com/400x300?text=Video+Thumbnail';
          }
        }
      } else {
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5015}`;
        url = `${baseUrl}/uploads/${type}s/${req.file.filename}`;
        cloudinaryId = req.file.filename;
        console.log('✅ File saved locally:', url);
        
        if (type === 'video') {
          thumbnail = 'https://via.placeholder.com/400x300?text=Video+Thumbnail';
        }
      }
    }
    
    // Parse tags
    let tagsArray = [];
    if (tags) {
      tagsArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
    }
    
    // Create gallery item
    const galleryItem = new Gallery({
      title: title.trim(),
      description: description ? description.trim() : '',
      type: type,
      url: url,
      cloudinaryId: cloudinaryId,
      thumbnail: thumbnail,
      category: category || 'general',
      tags: tagsArray,
      uploadedBy: req.admin?._id || req.admin?.id || null,
      isActive: true,
      views: 0,
      order: Date.now() // Use timestamp for ordering
    });
    
    const createdItem = await galleryItem.save();
    console.log('✅ Gallery item created successfully, Total items now:', await Gallery.countDocuments());
    
    res.status(201).json({
      success: true,
      message: 'Gallery item created successfully',
      data: createdItem
    });
    
  } catch (error) {
    console.error('❌ Error in createGalleryItem:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating gallery item',
      error: error.message 
    });
  }
};

// @desc    Create gallery item from URL
// @route   POST /api/gallery/from-url
// @access  Private/Admin
const createGalleryItemFromUrl = async (req, res) => {
  try {
    console.log('🔗 Creating gallery item from URL...');
    
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

    let mediaType = type || 'image';
    let thumbnail = '';
    
    if (mediaType === 'video') {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = extractYouTubeId(url);
        if (videoId) {
          thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      } else {
        thumbnail = 'https://via.placeholder.com/400x300?text=Video+Thumbnail';
      }
    }

    let tagsArray = [];
    if (tags) {
      tagsArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
    }

    const galleryItem = new Gallery({
      title: title.trim(),
      description: description ? description.trim() : '',
      type: mediaType,
      url: url,
      category: category || 'general',
      tags: tagsArray,
      thumbnail: thumbnail,
      uploadedBy: req.admin?._id || req.admin?.id || null,
      isActive: true,
      views: 0,
      order: Date.now()
    });

    const createdItem = await galleryItem.save();
    console.log('✅ Gallery item created from URL successfully, Total items:', await Gallery.countDocuments());
    
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
    
    const { title, description, category, tags, isActive, order, type, url } = req.body;

    const galleryItem = await Gallery.findById(req.params.id);

    if (!galleryItem) {
      return res.status(404).json({ 
        success: false,
        message: 'Gallery item not found' 
      });
    }

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
    console.log('✅ Gallery item updated successfully');
    
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

    if (galleryItem.cloudinaryId && cloudinary) {
      try {
        const resourceType = galleryItem.type === 'video' ? 'video' : 'image';
        await cloudinary.uploader.destroy(galleryItem.cloudinaryId, { 
          resource_type: resourceType 
        });
        console.log('✅ Deleted from Cloudinary');
      } catch (cloudinaryError) {
        console.error('⚠️ Error deleting from Cloudinary:', cloudinaryError);
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

// @desc    Get all gallery items for admin (UNLIMITED)
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

    // Get ALL items with NO LIMITS
    const items = await Gallery.find(query)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email');

    console.log(`📸 Admin fetching gallery items: ${items.length} items found`);

    res.json({
      success: true,
      items: items,
      total: items.length,
      message: `Successfully fetched ${items.length} gallery items`
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
      categories: categories,
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
// At the END of your galleryController.js file, add this function:

// @desc    Get gallery statistics and count (for debugging)
// @route   GET /api/gallery/debug/count
// @access  Private/Admin
const getGalleryCount = async (req, res) => {
  try {
    console.log('🔍 Debug: Fetching gallery statistics...');
    
    // Get total counts
    const totalCount = await Gallery.countDocuments();
    const activeCount = await Gallery.countDocuments({ isActive: true });
    const inactiveCount = await Gallery.countDocuments({ isActive: false });
    
    // Get counts by type
    const imageCount = await Gallery.countDocuments({ type: 'image', isActive: true });
    const videoCount = await Gallery.countDocuments({ type: 'video', isActive: true });
    
    // Get counts by category
    const categories = await Gallery.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get the 5 most recent items
    const recentItems = await Gallery.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title type category createdAt');
    
    // Get the 5 oldest items
    const oldestItems = await Gallery.find({ isActive: true })
      .sort({ createdAt: 1 })
      .limit(5)
      .select('title type category createdAt');
    
    // Check database stats (if MongoDB allows)
    let dbStats = null;
    try {
      const db = Gallery.db;
      const stats = await db.stats();
      dbStats = {
        dataSize: stats.dataSize,
        indexSize: stats.indexSize,
        totalSize: stats.totalSize,
        objectCount: stats.objects,
        collections: stats.collections
      };
    } catch (err) {
      dbStats = { error: 'Could not fetch DB stats' };
    }
    
    console.log(`📊 Gallery Stats: Total=${totalCount}, Active=${activeCount}, Inactive=${inactiveCount}`);
    
    res.json({
      success: true,
      statistics: {
        total: {
          all: totalCount,
          active: activeCount,
          inactive: inactiveCount
        },
        byType: {
          images: imageCount,
          videos: videoCount
        },
        byCategory: categories,
        recentItems: recentItems,
        oldestItems: oldestItems,
        databaseStats: dbStats,
        message: `Successfully fetched gallery statistics. Total ${totalCount} items in database.`
      }
    });
  } catch (error) {
    console.error('❌ Error in getGalleryCount:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching gallery statistics',
      error: error.message 
    });
  }
};

// Make sure module.exports includes getGalleryCount
module.exports = {
  getGalleryItems,
  getGalleryItemById,
  createGalleryItem,
  createGalleryItemFromUrl,
  updateGalleryItem,
  deleteGalleryItem,
  getAdminGalleryItems,
  getCategories,
  getGalleryCount  // MAKE SURE THIS LINE EXISTS
};
