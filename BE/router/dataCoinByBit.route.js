const express = require('express');
const router = express.Router();

const MiddlewareController = require('../controllers/middleware');
const dataCoinByBitController = require('../controllers/dataCoinByBit');

router.get('/', MiddlewareController.verifyToken, dataCoinByBitController.getAllStrategies);
router.get('/getAllSymbol', MiddlewareController.verifyToken, dataCoinByBitController.getAllSymbol);
router.get('/syncSymbol', MiddlewareController.verifyToken, dataCoinByBitController.syncSymbol)
router.post('/createStrategies', MiddlewareController.verifyToken, dataCoinByBitController.createStrategies)
router.put('/updateStrategies/:id', MiddlewareController.verifyToken, dataCoinByBitController.updateStrategiesByID)
router.post('/updateStrategiesMultiple', MiddlewareController.verifyToken, dataCoinByBitController.updateStrategiesMultiple)
router.post('/deleteStrategiesItem', MiddlewareController.verifyToken, dataCoinByBitController.deleteStrategiesItem)
router.delete('/deleteStrategies/:id', MiddlewareController.verifyToken, dataCoinByBitController.deleteStrategies)
router.post('/deleteStrategiesMultiple', MiddlewareController.verifyToken, dataCoinByBitController.deleteStrategiesMultiple)

module.exports = router;
