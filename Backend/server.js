const http = require("http");
require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./config/db");
const { initSocket } = require("./config/socket");
const { initSocketHandlers } = require("./sockets/index");

const PORT = process.env.PORT || 5000;


const server = http.createServer(app);


const io = initSocket(server);
initSocketHandlers(io);

async function startServer() {
 
  await connectDB();

 
  server.listen(PORT, () => {
   
    console.log(` Server running in ${process.env.NODE_ENV || "development"} mode`);
    console.log(` Listening on PORT: ${PORT}`);
    
    
  });
}

// Global unhandled promise rejection handler
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection! Shutting down server...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

startServer();
