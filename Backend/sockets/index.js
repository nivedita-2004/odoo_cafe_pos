const orderSocket = require("./orderSocket");
const kitchenSocket = require("./kitchenSocket");


function initSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

   
    socket.on("join", (roomName) => {
      socket.join(roomName);
      console.log(`[SOCKET] Client ${socket.id} joined room: ${roomName}`);
    });

   
    orderSocket(io, socket);
    kitchenSocket(io, socket);

    socket.on("disconnect", () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSocketHandlers };
