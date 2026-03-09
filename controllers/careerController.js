const Career = require('../models/Career');

// @desc    Get all career positions
// @route   GET /api/careers
// @access  Public
const getCareers = async (req, res) => {
  try {
    const careers = await Career.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(careers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single career position
// @route   GET /api/careers/:id
// @access  Public
const getCareerById = async (req, res) => {
  try {
    const career = await Career.findById(req.params.id);
    if (career) {
      res.json(career);
    } else {
      res.status(404).json({ message: 'Career position not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create career position
// @route   POST /api/careers
// @access  Private/Admin
const createCareer = async (req, res) => {
  try {
    const {
      title,
      department,
      location,
      type,
      description,
      requirements,
      responsibilities,
      salary,
      applicationDeadline
    } = req.body;

    const career = await Career.create({
      title,
      department,
      location,
      type,
      description,
      requirements: requirements ? requirements.split('\n') : [],
      responsibilities: responsibilities ? responsibilities.split('\n') : [],
      salary,
      applicationDeadline
    });

    res.status(201).json(career);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update career position
// @route   PUT /api/careers/:id
// @access  Private/Admin
const updateCareer = async (req, res) => {
  try {
    const career = await Career.findById(req.params.id);

    if (!career) {
      return res.status(404).json({ message: 'Career position not found' });
    }

    career.title = req.body.title || career.title;
    career.department = req.body.department || career.department;
    career.location = req.body.location || career.location;
    career.type = req.body.type || career.type;
    career.description = req.body.description || career.description;
    career.requirements = req.body.requirements ? req.body.requirements.split('\n') : career.requirements;
    career.responsibilities = req.body.responsibilities ? req.body.responsibilities.split('\n') : career.responsibilities;
    career.salary = req.body.salary || career.salary;
    career.applicationDeadline = req.body.applicationDeadline || career.applicationDeadline;
    career.isActive = req.body.isActive !== undefined ? req.body.isActive : career.isActive;

    const updatedCareer = await career.save();
    res.json(updatedCareer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete career position
// @route   DELETE /api/careers/:id
// @access  Private/Admin
const deleteCareer = async (req, res) => {
  try {
    const career = await Career.findById(req.params.id);

    if (!career) {
      return res.status(404).json({ message: 'Career position not found' });
    }

    await career.deleteOne();
    res.json({ message: 'Career position removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCareers,
  getCareerById,
  createCareer,
  updateCareer,
  deleteCareer
};