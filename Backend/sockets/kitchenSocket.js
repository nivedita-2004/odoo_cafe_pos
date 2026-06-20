
const socketService = require("./socketService");

module.exports = (io, socket) => {
 
  socket.on("kitchen:itemStatusUpdate", (data) => {
    console.log(`[SOCKET] Kitchen Item Status Update:`, data);
    socketService.notifyItemStatusToPOS(data);
  });

  socket.on("kitchen:orderStatusUpdate", (data) => {
    console.log(`[SOCKET] Kitchen Order Status Update:`, data);
    socketService.notifyOrderStatusToPOS(data);
  });
};
