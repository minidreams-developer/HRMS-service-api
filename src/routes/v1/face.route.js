const express = require('express');
const { faceController } = require('../../controllers');

const router = express.Router();
router.post('/embedding', faceController.matchEmbedding);

module.exports = router;
