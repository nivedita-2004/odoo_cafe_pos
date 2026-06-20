
const socketService = require("./socketService");

module.exports = (io, socket) => {

  socket.on("pos:orderPlaced", (data) => {
    console.log(`[SOCKET] POS Order Placed:`, data);
    socketService.notifyNewOrderToKitchen(data);
  });

  socket.on("pos:cartUpdated", (data) => {
    const { tableId } = data;
    if (tableId) {
      console.log(`[SOCKET] POS Cart Updated for Table ${tableId}`);
      socketService.notifyCartUpdated(tableId, data);
    }
  });

  socket.on("pos:proceedToPayment", (data) => {
    const { tableId } = data;
    if (tableId) {
      console.log(`[SOCKET] POS Proceed To Payment for Table ${tableId}`);
      socketService.notifyProceedToPayment(tableId, data);
    }
  });

  socket.on("pos:paymentCompleted", (data) => {
    const { tableId } = data;
    if (tableId) {
      console.log(`[SOCKET] POS Payment Completed for Table ${tableId}`);
      socketService.notifyPaymentCompleted(tableId, data);
    }
  });
};
