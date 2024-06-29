const express = require('express');
const router = express.Router();

const MiddlewareController = require('../controllers/middleware');
const PositionController = require('../controllers/position');

router.post('/getAllPosition', MiddlewareController.verifyToken, PositionController.getAllPosition);
router.post('/createPosition', MiddlewareController.verifyToken, PositionController.createPosition);
router.post('/updatePosition', MiddlewareController.verifyToken, PositionController.updatePosition);
router.delete('/deletePosition/:orderID', MiddlewareController.verifyToken, PositionController.deletePosition);

module.exports = router;