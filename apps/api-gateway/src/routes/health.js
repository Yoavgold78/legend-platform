const express = require('express');
const router = express.Router();
const packageJson = require('../../package.json');

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: packageJson.version
  });
});

module.exports = router;
