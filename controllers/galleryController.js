const Gallery = require('../models/Gallery');
const { cloudinary } = require('../config/cloudinary');

// @desc    Get all gallery images
// @route   GET /api/gallery
// @access  Public
const getGalleryImages = async (req, res) => {
  try {
    const images = await Gallery.find().sort({ createdAt: -1 });
    res.json(images);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single gallery image
// @route   GET /api/gallery/:id
// @access  Public
const getGalleryImageById = async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id);
    if (image) {
      res.json(image);
    } else {
      res.status(404).json({ message: 'Image not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create gallery image
// @route   POST /api/gallery
// @access  Private/Admin
const createGalleryImage = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const image = await Gallery.create({
      title,
      description,
      category,
      imageUrl: req.file.path,
      cloudinaryId: req.file.filename
    });

    res.status(201).json(image);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update gallery image
// @route   PUT /api/gallery/:id
// @access  Private/Admin
const updateGalleryImage = async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id);

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    image.title = req.body.title || image.title;
    image.description = req.body.description || image.description;
    image.category = req.body.category || image.category;

    if (req.file) {
      // Delete old image from cloudinary
      if (image.cloudinaryId) {
        await cloudinary.uploader.destroy(image.cloudinaryId);
      }
      
      image.imageUrl = req.file.path;
      image.cloudinaryId = req.file.filename;
    }

    const updatedImage = await image.save();
    res.json(updatedImage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete gallery image
// @route   DELETE /api/gallery/:id
// @access  Private/Admin
const deleteGalleryImage = async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id);

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Delete from cloudinary
    if (image.cloudinaryId) {
      await cloudinary.uploader.destroy(image.cloudinaryId);
    }

    await image.deleteOne();
    res.json({ message: 'Image removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getGalleryImages,
  getGalleryImageById,
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage
};