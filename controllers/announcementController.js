const Announcement = require('../models/Announcement');

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Public
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .sort({ priority: -1, createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single announcement
// @route   GET /api/announcements/:id
// @access  Public
const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (announcement) {
      res.json(announcement);
    } else {
      res.status(404).json({ message: 'Announcement not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private/Admin
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, expiresAt } = req.body;

    const announcement = await Announcement.create({
      title,
      content,
      priority,
      expiresAt
    });

    res.status(201).json(announcement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private/Admin
const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    announcement.title = req.body.title || announcement.title;
    announcement.content = req.body.content || announcement.content;
    announcement.priority = req.body.priority || announcement.priority;
    announcement.isActive = req.body.isActive !== undefined ? req.body.isActive : announcement.isActive;
    announcement.expiresAt = req.body.expiresAt || announcement.expiresAt;

    const updatedAnnouncement = await announcement.save();
    res.json(updatedAnnouncement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    await announcement.deleteOne();
    res.json({ message: 'Announcement removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};