const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require("./src/config/database");
// const {socketHandler} = require('./src/socket/socket');
const {socketHandler} = require('./src/socket/conversationSocket');
const authRoutes = require("./src/routes/AuthRouter");
const groupRouter = require("./src/routes/groupRouter");
const chatRouter = require("./src/routes/chatRouter");
const { setSocketIo } = require('./src/controllers/groupController');
// const groupChatRouter = require("./src/routes/groupChatRouter");
const conversationChatRouter = require("./src/routes/conversationRouter");
const path = require("path");
const webpush = require('web-push');
const app = express();
const saveSubscriptionRoute = require("./src/routes/saveSubscription");
const { callSocketHandler } = require('./src/socket/callSocket');
app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());
connectDB();


app.get("/", async (req, res) => {
    
      console.log(res,"response");
      
      res.status(200).json({
        success: "Hello from the server",
        message: "Server is running perfectly",
      });

});
app.use('/api/auth', authRoutes);
app.use('/api/group', groupRouter);
app.use('/api/chat', chatRouter);
// app.use('/api/chatGroup', groupChatRouter);

app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // serve files statically
app.use('/api/save-subscription', saveSubscriptionRoute);
app.use('/api/chatRouter', conversationChatRouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",  // ✅ Your frontend Vite dev server
    methods: ["GET", "POST"],
    credentials: true                 // ✅ Allow credentials like cookies
  }
});
setSocketIo(io); // 👈 this will set io inside your controller
// 👉 Initialize socket logic
socketHandler(io);
callSocketHandler(io);


server.listen(5000, () => {
  console.log('Server running on port 5000');
});
