const express = require('express');
const router = express.Router();
const {
  getApplications,
  submitApplication,
  updateApplication,
  deleteApplication,
} = require('../controllers/opportunityApplicationController');

router.get('/', getApplications);
router.post('/', submitApplication);
router.put('/:id', updateApplication);
router.delete('/:id', deleteApplication);

module.exports = router;
