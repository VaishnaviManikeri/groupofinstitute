const express = require('express');
const router = express.Router();
const {
  getCareers,
  getCareerById,
  createCareer,
  updateCareer,
  deleteCareer
} = require('../controllers/careerController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(getCareers)
  .post(protect, createCareer);

router.route('/:id')
  .get(getCareerById)
  .put(protect, updateCareer)
  .delete(protect, deleteCareer);

module.exports = router;