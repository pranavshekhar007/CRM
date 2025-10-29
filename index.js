// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const path = require("path");
// const routes = require("./src/route");
// const { createServer } = require("http");
// const { Server } = require("socket.io");
// const mongoose = require("mongoose");

// const app = express();
// const server = createServer(app);

// // ✅ CORS config — sabko allow
// app.use(cors());  // <-- sab origin allow
// app.options("*", cors());  // preflight requests ke liye

// // ✅ Body parser
// app.use(express.urlencoded({ extended: false }));
// app.use(express.json());

// // ✅ Static files (like image uploads)
// app.use('/uploads', express.static('uploads'));

// // ✅ Socket.IO setup — sabko allow
// const io = new Server(server, {
//   cors: {
//     origin: "*",               // <-- sab origin allow
//     methods: ["GET", "POST", "PUT", "DELETE"],  // allowed methods
//     credentials: false         // credentials off for wildcard
//   },
//   transports: ['websocket'],
// });

// // ✅ Socket.IO event listeners
// io.on("connection", (socket) => {
//   console.log("A user connected:", socket.id);

//   socket.on("sendMessage", (data) => {
//     console.log("Message from client:", data);
//     io.emit("receiveMessage", data);
//   });

//   socket.on("disconnect", () => {
//     console.log("User disconnected:", socket.id);
//   });
// });

// // ✅ Database connection
// mongoose.connect(process.env.DB_STRING).then(() => {
//   console.warn("DB connection done again");
// });

// // ✅ Attach Socket.IO instance to requests
// app.use((req, res, next) => {
//   req.io = io;
//   next();
// });

// // ✅ Routes
// app.get("/", (req, res) => res.send(`Server listing on port ${process.env.PORT}`));
// app.use("/api", routes);
// app.all("*", (req, res) => res.status(404).json({ error: "404 Not Found" }));

// // ✅ Start Server
// const PORT = process.env.PORT || 8000;
// server.listen(PORT, () => {
//   console.log(`Server running on ${process.env.BACKEND_URL}`);
// });




// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const path = require("path");
// const routes = require("./src/route");
// const mongoose = require("mongoose");

// const app = express();

// app.use(cors());
// app.use(express.urlencoded({ extended: false }));
// app.use(express.json());
// app.use("/uploads", express.static("uploads"));

// mongoose.connect(process.env.DB_STRING).then(() => {
//   console.log("DB connected successfully");
// });

// app.get("/", (req, res) => res.send("API Running Successfully"));
// app.use("/api", routes);
// app.all("*", (req, res) => res.status(404).json({ error: "404 Not Found" }));

// module.exports = app;



require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const routes = require("./src/route");
const {createServer} = require('http');
const {Server} = require("socket.io")

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://hrm-backend-one.vercel.app/api/",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['websocket'],
});




io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Example: listening to an event from client
  socket.on("sendMessage", (data) => {
    console.log("Message from client:", data);
    
    // Broadcasting to all clients
    io.emit("receiveMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});





app.use('/uploads', express.static('uploads'))
const PORT = process.env.PORT || 8000;


app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());




// connecting with database
const mongoose = require("mongoose");
mongoose.connect(process.env.DB_STRING
).then(()=>{
    console.warn("db connection done again")
})

// Pass the `io` instance to routes
app.use((req, res, next) => {
  req.io = io; // Attach the `io` object to the request
  next();
});

app.get("/", (req, res) => res.send(`Server listing on port ${PORT}`));
app.use("/api", routes);
app.all("*", (req, res) => res.status(404).json({ error: "404 Not Found" })); 



server.listen(PORT, () =>
  console.log(`Server running on ${process.env.BACKEND_URL}`)
);