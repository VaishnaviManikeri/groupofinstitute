const Notice = require('../models/Notice');
const { cloudinary } = require('../config/cloudinary');

// @desc    Get all notices
// @route   GET /api/notices
// @access  Public
const getNotices = async (req, res) => {
  try {
    const notices = await Notice.find().sort({ isImportant: -1, createdAt: -1 });
    res.json(notices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single notice
// @route   GET /api/notices/:id
// @access  Public
const getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (notice) {
      res.json(notice);
    } else {
      res.status(404).json({ message: 'Notice not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create notice
// @route   POST /api/notices
// @access  Private/Admin
const createNotice = async (req, res) => {
  try {
    const { title, content, category, isImportant } = req.body;

    let fileUrl, cloudinaryId;
    if (req.file) {
      fileUrl = req.file.path;
      cloudinaryId = req.file.filename;
    }

    const notice = await Notice.create({
      title,
      content,
      category,
      isImportant,
      fileUrl,
      cloudinaryId
    });

    res.status(201).json(notice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update notice
// @route   PUT /api/notices/:id
// @access  Private/Admin
const updateNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    notice.title = req.body.title || notice.title;
    notice.content = req.body.content || notice.content;
    notice.category = req.body.category || notice.category;
    notice.isImportant = req.body.isImportant !== undefined ? req.body.isImportant : notice.isImportant;

    if (req.file) {
      // Delete old file from cloudinary
      if (notice.cloudinaryId) {
        await cloudinary.uploader.destroy(notice.cloudinaryId);
      }
      
      notice.fileUrl = req.file.path;
      notice.cloudinaryId = req.file.filename;
    }

    const updatedNotice = await notice.save();
    res.json(updatedNotice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete notice
// @route   DELETE /api/notices/:id
// @access  Private/Admin
const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Delete file from cloudinary
    if (notice.cloudinaryId) {
      await cloudinary.uploader.destroy(notice.cloudinaryId);
    }

    await notice.deleteOne();
    res.json({ message: 'Notice removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice
};