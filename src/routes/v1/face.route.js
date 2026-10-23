const express = require('express');
const { faceController } = require('../../controllers');
const auth = require('../../middlewares/auth');

const router = express.Router();
// Raw client-supplied embeddings are not an attendance proof. Keep the legacy
// route behind authentication and let the controller return an explicit
// unavailable response until an approved liveness-capable provider is wired in.
router.post('/embedding', auth(), faceController.matchEmbedding);

module.exports = router;
