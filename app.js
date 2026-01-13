import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url"; 
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import authRoutes from "./src/server/routes/auth.routes.js";
dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const roomMessages = {};
const MAX_MESSAGES = 50;
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((e) => console.error(e));
app.use(express.static(path.join(__dirname, "src/client")));

app.get("/", (req, res) => {
  res.send("Chat Server....");
});
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; 

    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

// ----------------- HELPERS -----------------

function getUsersInRoom(room) {
  const clients = io.sockets.adapter.rooms.get(room);
  if (!clients) return [];

  const users = [];
  for (const socketId of clients) {
    const s = io.sockets.sockets.get(socketId);
    if (s?.username) users.push({ id: socketId, name: s.username });
  }
  return users;
}

// ----------------- SOCKET -----------------

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.inCallWith = null;
 // ----------------- chat -----------------

  socket.on("user:join", ({  room }) => {
    socket.username = socket.user.name;
    socket.room = room;
    socket.join(room);

    socket.emit("chat:system", { text: `You joined ${room}` });
    socket.to(room).emit("chat:system", { text: `${socket.username} joined` });

    io.to(room).emit("room:users", getUsersInRoom(room));
    socket.emit("chat:history", roomMessages[room] || []);
  });

  socket.on("chat:typing", () => {
    if (!socket.room) return;
    socket.to(socket.room).emit("chat:typing", { user: socket.username });
  });

  socket.on("chat:stop-typing", () => {
    if (!socket.room) return;
    socket.to(socket.room).emit("chat:stop-typing", { user: socket.username });
  });

  socket.on("chat:message", (data) => {
    if (!socket.username || !socket.room) return;

    io.to(socket.room).emit("chat:message", {
      user: socket.username,
      text: data.text,
      time: Date.now(),
    });

    if (!roomMessages[socket.room]) roomMessages[socket.room] = [];
    roomMessages[socket.room].push({
      user: socket.username,
      text: data.text,
      time: Date.now(),
    });

    if (roomMessages[socket.room].length > MAX_MESSAGES)
      roomMessages[socket.room].shift();
  });

  socket.on("user:leave", () => {
    if (!socket.room) return;
      if (socket.inCallWith) {
    io.to(socket.inCallWith).emit("video:end");

    const peer = io.sockets.sockets.get(socket.inCallWith);
    if (peer) peer.inCallWith = null;

    socket.inCallWith = null;
  }
    const room = socket.room;
    socket.leave(room);
    socket.room = null;

    socket.to(room).emit("chat:system", {
      text: `${socket.username} left`,
    });

    io.to(room).emit("room:users", getUsersInRoom(room));
  });

  // ===== VIDEO CALL SIGNALING =====

  socket.on("video:call", ({ to, offer }) => {
    const target = io.sockets.sockets.get(to);

    if (!target) return;

    if (socket.inCallWith || target.inCallWith) {
      socket.emit("video:busy");
      return;
    }

    target.emit("video:incoming", {
      from: socket.id,
      name: socket.username,
      offer,
    });
  });

  socket.on("video:answer", ({ to, answer }) => {
    socket.inCallWith = to;

    const target = io.sockets.sockets.get(to);
    if (target) target.inCallWith = socket.id;

    io.to(to).emit("video:answer", { answer });
  });

  socket.on("video:ice", ({ to, candidate }) => {
    io.to(to).emit("video:ice", { candidate });
  });

  socket.on("video:end", ({ to }) => {
    io.to(to).emit("video:end");

    const target = io.sockets.sockets.get(to);
    if (target) target.inCallWith = null;
    socket.inCallWith = null;
  });
socket.on("video:reject", ({ to }) => {
  io.to(to).emit("video:rejected");
});
  // ===== DISCONNECT =====

  socket.on("disconnect", () => {
    if (socket.room) {
      socket.to(socket.room).emit("chat:system", {
        text: `${socket.username} disconnected`,
      });

      io.to(socket.room).emit("room:users", getUsersInRoom(socket.room));
    }

    if (socket.inCallWith) {
      io.to(socket.inCallWith).emit("video:end");

      const target = io.sockets.sockets.get(socket.inCallWith);
      if (target) target.inCallWith = null;
    }

    console.log("Socket disconnected:", socket.id);
  });
});

// ----------------- START -----------------

const port = 3000;
httpServer.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
