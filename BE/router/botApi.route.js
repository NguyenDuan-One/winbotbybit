const express = require('express');
const router = express.Router();

const MiddlewareController = require('../controllers/middleware');
const BotApiController = require('../controllers/botApi');

router.get('/getBotApiByBotID/:id', MiddlewareController.verifyToken, BotApiController.getBotApiByBotID);
router.post('/create', MiddlewareController.verifyToken, BotApiController.create);
router.put('/update/:id', MiddlewareController.verifyToken, BotApiController.update);

module.exports = router;
