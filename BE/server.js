const { server,socketServer } = require('./serverConfig');

require('dotenv').config();

const PORT = 80

server.listen(PORT, process.env.BASE_URL, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Emit event using io
socketServer.on('connection', (socket) => {
  console.log('Socket connected');

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
});
