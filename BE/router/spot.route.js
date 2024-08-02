const express = require('express');
const router = express.Router();

const MiddlewareController = require('../controllers/middleware');
const spotController = require('../controllers/spot');

router.get('/getAllStrategiesSpot', MiddlewareController.verifyToken, spotController.getAllStrategiesSpot);
router.get('/getAllSymbolSpot', MiddlewareController.verifyToken, spotController.getAllSymbolSpot);
router.get('/getAllSymbolWith24', MiddlewareController.verifyToken, spotController.getAllSymbolWith24);
router.get('/getFutureAvailable/:id', MiddlewareController.verifyToken, spotController.getFutureAvailable)
router.get('/getTotalFutureByBot/:id', MiddlewareController.verifyToken, spotController.getTotalFutureByBot)
router.get('/getSpotTotal/:id', MiddlewareController.verifyToken, spotController.getSpotTotal)

router.post('/createStrategiesSpot', MiddlewareController.verifyToken, spotController.createStrategiesSpot)

router.put('/updateStrategiesSpotByID/:id', MiddlewareController.verifyToken, spotController.updateStrategiesSpotByID)
router.post('/updateStrategiesMultiple', MiddlewareController.verifyToken, spotController.updateStrategiesMultiple)

router.post('/deleteStrategiesItem', MiddlewareController.verifyToken, spotController.deleteStrategiesItem)
router.delete('/deleteStrategies/:id', MiddlewareController.verifyToken, spotController.deleteStrategies)
router.post('/deleteStrategiesMultiple', MiddlewareController.verifyToken, spotController.deleteStrategiesMultiple)

router.get('/syncSymbolSpot', MiddlewareController.verifyToken, spotController.syncSymbolSpot)
router.post('/copyMultipleStrategiesToSymbol', MiddlewareController.verifyToken, spotController.copyMultipleStrategiesToSymbol)
router.post('/copyMultipleStrategiesToBot', MiddlewareController.verifyToken, spotController.copyMultipleStrategiesToBot)
router.post('/balanceWallet', MiddlewareController.verifyToken, spotController.balanceWallet)
router.get('/getAllStrategiesActive', MiddlewareController.verifyToken, spotController.getAllStrategiesActive)


module.exports = router;
