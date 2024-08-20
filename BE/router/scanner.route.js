const express = require('express');
const router = express.Router();

const MiddlewareController = require('../controllers/middleware');
const scannerController = require('../controllers/scanner');

router.post('/getAllConfigScanner', MiddlewareController.verifyToken, scannerController.getAllConfigScanner);

router.post('/createConfigScanner', MiddlewareController.verifyToken, scannerController.createConfigScanner)
router.post('/updateStrategiesMultipleScanner', MiddlewareController.verifyToken, scannerController.updateStrategiesMultipleScanner)

router.post('/deleteStrategiesMultipleScanner', MiddlewareController.verifyToken, scannerController.deleteStrategiesMultipleScanner)
router.get('/syncSymbolScanner', MiddlewareController.verifyToken, scannerController.syncSymbolScanner)



module.exports = router;
