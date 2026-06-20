const { getSocketIO } = require("../config/socket");

class SocketService {
  /**
   * Notify kitchen of a new order to cook
   */
  notifyNewOrderToKitchen(orderData) {
    try {
      const io = getSocketIO();
      io.to("kitchen").emit("kitchen:newOrder", orderData);
      console.log(`[SOCKET SERVICE] Broadcasted kitchen:newOrder for order ID: ${orderData.id || orderData.orderId}`);
    } catch (error) {
      console.error("[SOCKET SERVICE] Failed to notify kitchen of new order:", error.message);
    }
  }

  /**
   * Notify kitchen that an existing order has updated items/details
   */
  notifyOrderUpdatedToKitchen(orderData) {
    try {
      const io = getSocketIO();
      io.to("kitchen").emit("kitchen:orderUpdated", orderData);
      console.log(`[SOCKET SERVICE] Broadcasted kitchen:orderUpdated for order ID: ${orderData.id || orderData.orderId}`);
    } catch (error) {
      console.error("[SOCKET SERVICE] Failed to notify kitchen of order update:", error.message);
    }
  }

  /**
   * Notify POS terminals of order status transitions (e.g. TO_COOK, PREPARING, COMPLETED)
   */
  notifyOrderStatusToPOS(orderData) {
    try {
      const io = getSocketIO();
      io.to("posTerminal").emit("pos:orderStatusUpdated", orderData);
      console.log(`[SOCKET SERVICE] Broadcasted pos:orderStatusUpdated for order ID: ${orderData.orderId || orderData.id}`);
    } catch (error) {
      console.error("[SOCKET SERVICE] Failed to notify POS of order status update:", error.message);
    }
  }

  /**
   * Notify POS terminals of single item status transitions in KDS
   */
  notifyItemStatusToPOS(itemData) {
    try {
      const io = getSocketIO();
      io.to("posTerminal").emit("pos:itemStatusUpdated", itemData);
      console.log(`[SOCKET SERVICE] Broadcasted pos:itemStatusUpdated for item ID: ${itemData.itemId || itemData.id}`);
    } catch (error) {
      console.error("[SOCKET SERVICE] Failed to notify POS of item status update:", error.message);
    }
  }

  /**
   * Notify customer display of table cart updates
   */
  notifyCartUpdated(tableId, cartData) {
    try {
      const io = getSocketIO();
      io.to(`customer-display:${tableId}`).emit("customer-display:cartUpdated", cartData);
      console.log(`[SOCKET SERVICE] Broadcasted customer-display:cartUpdated for table ${tableId}`);
    } catch (error) {
      console.error("[SOCKET SERVICE] Failed to notify customer display of cart update:", error.message);
    }
  }

  /**
   * Notify customer display to show payment prompt/UPI QR
   */
  notifyProceedToPayment(tableId, paymentData) {
    try {
      const io = getSocketIO();
      io.to(`customer-display:${tableId}`).emit("customer-display:payment", paymentData);
      console.log(`[SOCKET SERVICE] Broadcasted customer-display:payment for table ${tableId}`);
    } catch (error) {
      console.error("[SOCKET SERVICE] Failed to notify customer display of payment prompt:", error.message);
    }
  }

  /**
   * Notify customer display of payment checkout completion
   */
  notifyPaymentCompleted(tableId, completionData) {
    try {
      const io = getSocketIO();
      io.to(`customer-display:${tableId}`).emit("customer-display:completed", completionData);
      console.log(`[SOCKET SERVICE] Broadcasted customer-display:completed for table ${tableId}`);
    } catch (error) {
      console.error("[SOCKET SERVICE] Failed to notify customer display of checkout completion:", error.message);
    }
  }
}

module.exports = new SocketService();
