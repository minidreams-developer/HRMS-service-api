const express = require('express');
const organizationController = require('../../controllers/organization.controller');
const validate = require('../../middlewares/validate');
const { organizationValidation } = require('../../validations');

const router = express.Router();

router
  .route('/')
  .post(validate(organizationValidation.createOrganization), organizationController.createOrganization)
  .get(validate(organizationValidation.getOrganizations), organizationController.getOrganizations);

router
  .route('/:organizationId')
  .get(validate(organizationValidation.getOrganization), organizationController.getOrganization)
  .patch(validate(organizationValidation.updateOrganization), organizationController.updateOrganization)
  .delete(validate(organizationValidation.deleteOrganization), organizationController.deleteOrganization);

module.exports = router;
