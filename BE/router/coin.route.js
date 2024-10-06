const express = require('express');
const router = express.Router();

const MiddlewareController = require('../controllers/middleware');
const coinController = require('../controllers/coin');

router.get('/getAllCoin', MiddlewareController.verifyToken, coinController.getAllCoin);

router.get('/syncCoin', MiddlewareController.verifyToken, coinController.syncCoin)

module.exports = router;
