const express = require('express');
const router = express.Router();

const botRouter = require('./bot.route');
const botTypeRouter = require('./botType.route');
const userRouter = require('./user.route');
const authRouter = require('./auth.route');
const dataCoinByBitRouter = require('./dataCoinByBit.route');
const roleRouter = require('./role.route');
const groupRouter = require('./group.route');
const positionRouter = require('./position.route');
const positionV1Router = require('./positionV1.route');
const spotRouter = require('./spot.route');
const marginRouter = require('./margin.route');
const scannerRouter = require('./scanner.route');
const coinRouter = require('./coin.route');

router.use('/auth', authRouter);
router.use('/user', userRouter);
router.use('/bot', botRouter);
router.use('/botType', botTypeRouter);
router.use('/dataCoinByBit', dataCoinByBitRouter);
router.use('/spot', spotRouter);
router.use('/margin', marginRouter);
router.use('/role', roleRouter);
router.use('/group', groupRouter);
router.use('/position', positionRouter);
router.use('/positionV1', positionV1Router);
router.use('/scanner', scannerRouter);
router.use('/coin', coinRouter);

// Sử dụng các route khác tương tự

module.exports = router;
