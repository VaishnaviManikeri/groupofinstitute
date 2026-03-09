const Gallery = require('../models/Gallery');
const { cloudinary } = require('../config/cloudinary');
const validator = require('validator');

// Helper function to validate URL
const isValidUrl = (url) => {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true
  });
};

// Helper function to detect media type from URL
const detectMediaTypeFromUrl = (url) => {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.ogg'];
  const videoPlatforms = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com'];
  const lowerUrl = url.toLowerCase();
  
  if (videoPlatforms.some(platform => lowerUrl.includes(platform))) {
    return 'video';
  }
  
  if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
    return 'video';
  }
  
  return 'image';
};

// Helper function to extract YouTube ID
const extractYoutubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Helper function to get video embed URL
const getVideoEmbedUrl = (url) => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    const videoId = extractYoutubeId(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }
  
  if (lowerUrl.includes('vimeo.com')) {
    const vimeoId = url.split('vimeo.com/')[1]?.split('?')[0];
    if (vimeoId) {
      return `https://player.vimeo.com/video/${vimeoId}`;
    }
  }
  
  return url;
};

// @desc    Get all gallery items
// @route   GET /api/gallery
// @access  Public
const getGalleryItems = async (req, res) => {
  try {
    const items = await Gallery.find().sort({ createdAt: -1 });
    
    const itemsWithEmbed = items.map(item => {
      const itemObj = item.toObject();
      if (item.mediaType === 'video') {
        return {
          ...itemObj,
          embedUrl: getVideoEmbedUrl(item.mediaUrl)
        };
      }
      return itemObj;
    });
    
    res.json(itemsWithEmbed);
  } catch (error) {
    console.error('Error fetching gallery items:', error);
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
      return res.status(404).json({ message: 'Item not found' });
    }
    
    const responseItem = item.toObject();
    if (item.mediaType === 'video') {
      responseItem.embedUrl = getVideoEmbedUrl(item.mediaUrl);
    }
    res.json(responseItem);
  } catch (error) {
    console.error('Error fetching gallery item:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create gallery item
// @route   POST /api/gallery
// @access  Private/Admin
const createGalleryItem = async (req, res) => {
  try {
    const { title, description, category, mediaType, mediaUrl } = req.body;
    
    let finalMediaUrl = '';
    let finalMediaType = mediaType || 'image';
    let cloudinaryId = null;
    let thumbnailUrl = null;

    // Case 1: URL provided
    if (mediaUrl && isValidUrl(mediaUrl)) {
      finalMediaUrl = mediaUrl;
      finalMediaType = mediaType || detectMediaTypeFromUrl(mediaUrl);
      
      if (finalMediaType === 'video') {
        if (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be')) {
          const videoId = extractYoutubeId(mediaUrl);
          if (videoId) {
            thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          }
        }
      }
    }
    // Case 2: File upload via Cloudinary
    else if (req.file) {
      // Cloudinary stores the URL in req.file.path and public_id in req.file.filename
      finalMediaUrl = req.file.path;
      cloudinaryId = req.file.filename;
      finalMediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      
      // Generate thumbnail for videos
      if (finalMediaType === 'video') {
        // Cloudinary video thumbnail URL format
        thumbnailUrl = req.file.path.replace('/upload/', '/upload/w_400,h_300,c_fill/');
      }
    }
    else {
      return res.status(400).json({ message: 'Please provide a file or valid URL' });
    }

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const galleryItem = await Gallery.create({
      title,
      description: description || '',
      category: category || 'general',
      mediaUrl: finalMediaUrl,
      mediaType: finalMediaType,
      cloudinaryId,
      thumbnailUrl
    });

    const responseItem = galleryItem.toObject();
    if (galleryItem.mediaType === 'video') {
      responseItem.embedUrl = getVideoEmbedUrl(galleryItem.mediaUrl);
    }

    res.status(201).json(responseItem);
  } catch (error) {
    console.error('Error creating gallery item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update gallery item
// @route   PUT /api/gallery/:id
// @access  Private/Admin
const updateGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Update basic fields
    item.title = req.body.title || item.title;
    item.description = req.body.description !== undefined ? req.body.description : item.description;
    item.category = req.body.category || item.category;

    // Handle URL update
    if (req.body.mediaUrl && isValidUrl(req.body.mediaUrl)) {
      item.mediaUrl = req.body.mediaUrl;
      item.mediaType = req.body.mediaType || detectMediaTypeFromUrl(req.body.mediaUrl);
      
      if (item.mediaType === 'video') {
        if (item.mediaUrl.includes('youtube.com') || item.mediaUrl.includes('youtu.be')) {
          const videoId = extractYoutubeId(item.mediaUrl);
          if (videoId) {
            item.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          }
        }
      }
    }

    // Handle file update
    if (req.file) {
      // Delete old file from cloudinary if exists
      if (item.cloudinaryId) {
        try {
          const resourceType = item.mediaType === 'video' ? 'video' : 'image';
          await cloudinary.uploader.destroy(item.cloudinaryId, { resource_type: resourceType });
        } catch (cloudinaryError) {
          console.error('Error deleting old file from Cloudinary:', cloudinaryError);
        }
      }
      
      item.mediaUrl = req.file.path;
      item.cloudinaryId = req.file.filename;
      item.mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      
      if (item.mediaType === 'video') {
        item.thumbnailUrl = req.file.path.replace('/upload/', '/upload/w_400,h_300,c_fill/');
      }
    }

    const updatedItem = await item.save();
    
    const responseItem = updatedItem.toObject();
    if (updatedItem.mediaType === 'video') {
      responseItem.embedUrl = getVideoEmbedUrl(updatedItem.mediaUrl);
    }

    res.json(responseItem);
  } catch (error) {
    console.error('Error updating gallery item:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete gallery item
// @route   DELETE /api/gallery/:id
// @access  Private/Admin
const deleteGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Delete from cloudinary if exists
    if (item.cloudinaryId) {
      try {
        const resourceType = item.mediaType === 'video' ? 'video' : 'image';
        await cloudinary.uploader.destroy(item.cloudinaryId, { resource_type: resourceType });
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
      }
    }

    await item.deleteOne();
    res.json({ message: 'Item removed successfully' });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getGalleryItems,
  getGalleryItemById,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem
};