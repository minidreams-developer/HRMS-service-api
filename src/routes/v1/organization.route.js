const express = require('express');
const organizationController = require('../../controllers/organization.controller');
const validate = require('../../middlewares/validate');
const { organizationValidation } = require('../../validations');
const auth = require('../../middlewares/auth');
const settingsAdmin = require('../../middlewares/settingsAdmin');

const router = express.Router();

router
  .route('/')
  .post(auth(), settingsAdmin, validate(organizationValidation.createOrganization), organizationController.createOrganization)
  .get(auth(), settingsAdmin, validate(organizationValidation.getOrganizations), organizationController.getOrganizations);

router
  .route('/:organizationId')
  .get(auth(), settingsAdmin, validate(organizationValidation.getOrganization), organizationController.getOrganization)
  .patch(auth(), settingsAdmin, validate(organizationValidation.updateOrganization), organizationController.updateOrganization)
  .delete(auth(), settingsAdmin, validate(organizationValidation.deleteOrganization), organizationController.deleteOrganization);

module.exports = router;
