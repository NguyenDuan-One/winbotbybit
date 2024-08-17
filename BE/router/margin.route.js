const express = require('express');
const router = express.Router();

const MiddlewareController = require('../controllers/middleware');
const marginController = require('../controllers/margin');

router.post('/getAllStrategiesSpot', MiddlewareController.verifyToken, marginController.getAllStrategiesSpot);
router.get('/getAllSymbolSpot', MiddlewareController.verifyToken, marginController.getAllSymbolSpot);
router.get('/getAllSymbolWith24', MiddlewareController.verifyToken, marginController.getAllSymbolWith24);
router.get('/getFutureAvailable/:id', MiddlewareController.verifyToken, marginController.getFutureAvailable)
router.get('/getTotalFutureByBot/:id', MiddlewareController.verifyToken, marginController.getTotalFutureByBot)
router.get('/getSpotTotal/:id', MiddlewareController.verifyToken, marginController.getSpotTotal)

router.post('/createStrategiesSpot', MiddlewareController.verifyToken, marginController.createStrategiesSpot)

router.put('/updateStrategiesSpotByID/:id', MiddlewareController.verifyToken, marginController.updateStrategiesSpotByID)
router.post('/updateStrategiesMultipleSpot', MiddlewareController.verifyToken, marginController.updateStrategiesMultipleSpot)
router.put('/addToBookmarkSpot/:id', MiddlewareController.verifyToken, marginController.addToBookmarkSpot)
router.put('/removeToBookmarkSpot/:id', MiddlewareController.verifyToken, marginController.removeToBookmarkSpot)

router.post('/deleteStrategiesItemSpot', MiddlewareController.verifyToken, marginController.deleteStrategiesItemSpot)
router.delete('/deleteStrategiesSpot/:id', MiddlewareController.verifyToken, marginController.deleteStrategiesSpot)
router.post('/deleteStrategiesMultipleSpot', MiddlewareController.verifyToken, marginController.deleteStrategiesMultipleSpot)

router.get('/syncSymbolSpot', MiddlewareController.verifyToken, marginController.syncSymbolSpot)
router.post('/copyMultipleStrategiesToSymbolSpot', MiddlewareController.verifyToken, marginController.copyMultipleStrategiesToSymbolSpot)
router.post('/copyMultipleStrategiesToBotSpot', MiddlewareController.verifyToken, marginController.copyMultipleStrategiesToBotSpot)
router.post('/balanceWallet', MiddlewareController.verifyToken, marginController.balanceWallet)
router.get('/getAllStrategiesActive', MiddlewareController.verifyToken, marginController.getAllStrategiesActive)


module.exports = router;
