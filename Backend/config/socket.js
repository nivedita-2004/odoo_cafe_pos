const { Server } = require("socket.io");

let io;


function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true
    }
  });

  return io;
}

function getSocketIO() {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
}

module.exports = {
  initSocket,
  getSocketIO
};
