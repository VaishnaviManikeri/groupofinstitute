const Gallery = require('../models/Gallery');
const { cloudinary } = require('../config/cloudinary');
const axios = require('axios');
const urlValidator = require('validator');

// Helper function to validate URL
const isValidUrl = (url) => {
  try {
    return urlValidator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true
    });
  } catch (error) {
    return false;
  }
};

// Helper function to detect media type from URL
const detectMediaTypeFromUrl = (url) => {
  if (!url) return 'image';
  
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.ogg', '.m4v', '.3gp'];
  const videoPlatforms = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'player.vimeo.com'];
  const lowerUrl = url.toLowerCase();
  
  // Check for video platforms
  if (videoPlatforms.some(platform => lowerUrl.includes(platform))) {
    return 'video';
  }
  
  // Check for direct video file extensions
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
  if (!url) return url;
  
  const lowerUrl = url.toLowerCase();
  
  // YouTube
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    const videoId = extractYoutubeId(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }
  
  // Vimeo
  if (lowerUrl.includes('vimeo.com')) {
    // Handle different Vimeo URL formats
    let vimeoId = url.split('vimeo.com/')[1];
    if (vimeoId) {
      // Remove any query parameters
      vimeoId = vimeoId.split('?')[0];
      return `https://player.vimeo.com/video/${vimeoId}`;
    }
  }
  
  // Direct video URL - ensure it's properly encoded
  return url;
};

// Helper function to validate if URL is accessible
const validateMediaUrl = async (url) => {
  if (!url) return false;
  
  try {
    const response = await axios.head(url, { timeout: 5000 });
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.log('URL validation failed:', url, error.message);
    return false;
  }
};

// @desc    Get all gallery items
// @route   GET /api/gallery
// @access  Public
const getGalleryItems = async (req, res) => {
  try {
    const items = await Gallery.find().sort({ createdAt: -1 });
    
    // Add embed URLs for videos and ensure media URLs are properly formatted
    const itemsWithEmbed = items.map(item => {
      const itemObj = item.toObject();
      
      // Ensure mediaUrl is properly formatted
      if (itemObj.mediaUrl && !itemObj.mediaUrl.startsWith('http')) {
        // If it's a relative path, prepend the appropriate base URL
        if (process.env.BACKEND_URL) {
          itemObj.mediaUrl = `${process.env.BACKEND_URL}${itemObj.mediaUrl}`;
        }
      }
      
      if (item.mediaType === 'video') {
        itemObj.embedUrl = getVideoEmbedUrl(item.mediaUrl);
      }
      
      return itemObj;
    });
    
    res.json(itemsWithEmbed);
  } catch (error) {
    console.error('Error fetching gallery items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
    
    // Ensure mediaUrl is properly formatted
    if (responseItem.mediaUrl && !responseItem.mediaUrl.startsWith('http')) {
      if (process.env.BACKEND_URL) {
        responseItem.mediaUrl = `${process.env.BACKEND_URL}${responseItem.mediaUrl}`;
      }
    }
    
    if (item.mediaType === 'video') {
      responseItem.embedUrl = getVideoEmbedUrl(item.mediaUrl);
    }
    
    res.json(responseItem);
  } catch (error) {
    console.error('Error fetching gallery item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create gallery item (image or video)
// @route   POST /api/gallery
// @access  Private/Admin
const createGalleryItem = async (req, res) => {
  try {
    const { title, description, category, mediaType, mediaUrl } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    let finalMediaUrl = '';
    let finalMediaType = mediaType || 'image';
    let cloudinaryId = null;
    let thumbnailUrl = null;

    // Case 1: URL provided
    if (mediaUrl && isValidUrl(mediaUrl)) {
      finalMediaUrl = mediaUrl;
      finalMediaType = mediaType || detectMediaTypeFromUrl(mediaUrl);
      
      // For YouTube/Vimeo URLs, generate thumbnail
      if (finalMediaType === 'video') {
        if (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be')) {
          const videoId = extractYoutubeId(mediaUrl);
          if (videoId) {
            thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          }
        } else if (mediaUrl.includes('vimeo.com')) {
          // For Vimeo, we'll use a placeholder or try to fetch thumbnail
          thumbnailUrl = 'https://via.placeholder.com/640x360?text=Vimeo+Video';
        }
      }
    }
    // Case 2: File upload
    else if (req.file) {
      // Check if we have Cloudinary response
      if (req.file.path) {
        finalMediaUrl = req.file.path;
        cloudinaryId = req.file.filename || req.file.public_id;
        
        // Determine media type from mimetype
        if (req.file.mimetype) {
          finalMediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
        }
        
        // Generate thumbnail for videos
        if (finalMediaType === 'video') {
          // Try to get thumbnail from Cloudinary video
          thumbnailUrl = req.file.path.replace('/upload/', '/upload/w_400,h_300,c_fill/');
        }
      } else {
        return res.status(400).json({ message: 'File upload failed' });
      }
    }
    else {
      return res.status(400).json({ message: 'Please provide a file or valid URL' });
    }

    // Validate that the media URL is accessible (optional, can be commented out for performance)
    // const isValid = await validateMediaUrl(finalMediaUrl);
    // if (!isValid) {
    //   return res.status(400).json({ message: 'Media URL is not accessible' });
    // }

    const galleryItem = await Gallery.create({
      title,
      description: description || '',
      category: category || 'general',
      mediaUrl: finalMediaUrl,
      mediaType: finalMediaType,
      cloudinaryId,
      thumbnailUrl
    });

    // Add embedUrl for video response
    const responseItem = galleryItem.toObject();
    if (galleryItem.mediaType === 'video') {
      responseItem.embedUrl = getVideoEmbedUrl(galleryItem.mediaUrl);
    }

    res.status(201).json(responseItem);
  } catch (error) {
    console.error('Error creating gallery item:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
      
      // Update thumbnail if it's a video URL
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
    if (req.file && req.file.path) {
      // Delete old file from cloudinary if exists
      if (item.cloudinaryId) {
        try {
          const resourceType = item.mediaType === 'video' ? 'video' : 'image';
          await cloudinary.uploader.destroy(item.cloudinaryId, { resource_type: resourceType });
        } catch (cloudinaryError) {
          console.error('Error deleting old file from Cloudinary:', cloudinaryError);
          // Continue even if deletion fails
        }
      }
      
      item.mediaUrl = req.file.path;
      item.cloudinaryId = req.file.filename || req.file.public_id;
      item.mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      
      // Generate thumbnail for videos
      if (item.mediaType === 'video') {
        item.thumbnailUrl = req.file.path.replace('/upload/', '/upload/w_400,h_300,c_fill/');
      }
    }

    const updatedItem = await item.save();
    
    // Add embedUrl for video response
    const responseItem = updatedItem.toObject();
    if (updatedItem.mediaType === 'video') {
      responseItem.embedUrl = getVideoEmbedUrl(updatedItem.mediaUrl);
    }

    res.json(responseItem);
  } catch (error) {
    console.error('Error updating gallery item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
        console.error('Error deleting file from Cloudinary:', cloudinaryError);
        // Continue even if deletion fails
      }
    }

    await item.deleteOne();
    res.json({ message: 'Item removed successfully' });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Validate gallery item URL
// @route   POST /api/gallery/validate
// @access  Private/Admin
const validateGalleryUrl = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }
    
    const isValid = await validateMediaUrl(url);
    const mediaType = detectMediaTypeFromUrl(url);
    
    res.json({
      valid: isValid,
      mediaType,
      url
    });
  } catch (error) {
    console.error('Error validating URL:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getGalleryItems,
  getGalleryItemById,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  validateGalleryUrl
};