const Gallery = require('../models/Gallery');
const { cloudinary } = require('../config/cloudinary');
const axios = require('axios');
const urlValidator = require('validator');

// Helper function to validate URL
const isValidUrl = (url) => {
  return urlValidator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true
  });
};

// Helper function to detect media type from URL
const detectMediaTypeFromUrl = (url) => {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.youtube', '.youtu.be', 'vimeo'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext)) ? 'video' : 'image';
};

// @desc    Get all gallery items
// @route   GET /api/gallery
// @access  Public
const getGalleryItems = async (req, res) => {
  try {
    const items = await Gallery.find().sort({ createdAt: -1 });
    res.json(items);
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
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create gallery item (image or video)
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
      
      // For YouTube/Vimeo URLs, you might want to generate a thumbnail
      if (finalMediaType === 'video') {
        if (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be')) {
          const videoId = extractYoutubeId(mediaUrl);
          thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        } else if (mediaUrl.includes('vimeo.com')) {
          // You would need Vimeo API for thumbnail
          thumbnailUrl = ''; // Placeholder
        }
      }
    }
    // Case 2: File upload
    else if (req.file) {
      finalMediaUrl = req.file.path;
      cloudinaryId = req.file.filename;
      
      // Determine if it's video based on file type
      if (req.file.mimetype.startsWith('video/')) {
        finalMediaType = 'video';
        // Generate thumbnail for video (you might need additional processing)
        thumbnailUrl = ''; // Placeholder for video thumbnail
      } else {
        finalMediaType = 'image';
      }
    }
    else {
      return res.status(400).json({ message: 'Please provide a file or valid URL' });
    }

    const galleryItem = await Gallery.create({
      title,
      description,
      category,
      mediaUrl: finalMediaUrl,
      mediaType: finalMediaType,
      cloudinaryId,
      thumbnailUrl
    });

    res.status(201).json(galleryItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to extract YouTube ID
const extractYoutubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
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
    item.description = req.body.description || item.description;
    item.category = req.body.category || item.category;

    // Handle URL update
    if (req.body.mediaUrl && isValidUrl(req.body.mediaUrl)) {
      item.mediaUrl = req.body.mediaUrl;
      item.mediaType = req.body.mediaType || detectMediaTypeFromUrl(req.body.mediaUrl);
      
      // Update thumbnail if it's a video URL
      if (item.mediaType === 'video') {
        if (item.mediaUrl.includes('youtube.com') || item.mediaUrl.includes('youtu.be')) {
          const videoId = extractYoutubeId(item.mediaUrl);
          item.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      }
    }

    // Handle file update
    if (req.file) {
      // Delete old file from cloudinary if exists
      if (item.cloudinaryId) {
        const resourceType = item.mediaType === 'video' ? 'video' : 'image';
        await cloudinary.uploader.destroy(item.cloudinaryId, { resource_type: resourceType });
      }
      
      item.mediaUrl = req.file.path;
      item.cloudinaryId = req.file.filename;
      item.mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    }

    const updatedItem = await item.save();
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
    const item = await Gallery.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Delete from cloudinary if exists
    if (item.cloudinaryId) {
      const resourceType = item.mediaType === 'video' ? 'video' : 'image';
      await cloudinary.uploader.destroy(item.cloudinaryId, { resource_type: resourceType });
    }

    await item.deleteOne();
    res.json({ message: 'Item removed' });
  } catch (error) {
    console.error(error);
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