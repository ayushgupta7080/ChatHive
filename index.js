// index.js - ChatHiveClean backend

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");

// ----- Basic setup -----
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // serve frontend from /public

// ----- Mongo connection -----
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI missing in environment");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ Mongo error", err);
    process.exit(1);
  });

// ----- Schemas & models -----
const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true },
    passwordHash: String,
  },
  { timestamps: true },
);

const channelSchema = new mongoose.Schema(
  {
    name: String,
  },
  { timestamps: true },
);

const messageSchema = new mongoose.Schema(
  {
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: String,
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
const Channel = mongoose.model("Channel", channelSchema);
const Message = mongoose.model("Message", messageSchema);

// ----- Simple auth (no sessions, just ids) -----

app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "Missing fields" });

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.toLowerCase(),
      passwordHash,
    });

    res.status(201).json({ id: user._id, username: user.username });
  } catch (err) {
    console.error("Register error", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    res.json({ id: user._id, username: user.username });
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----- Channels -----

// create channel
app.post("/api/channels", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    const channel = await Channel.create({ name });
    res.status(201).json(channel);
  } catch (err) {
    console.error("Create channel error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// list channels
app.get("/api/channels", async (_req, res) => {
  try {
    const channels = await Channel.find({}).sort({ createdAt: 1 });
    res.json(channels);
  } catch (err) {
    console.error("Get channels error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----- Messages with simple pagination -----

app.get("/api/channels/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const { before, limit = 30 } = req.query;

    const query = { channelId: id };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate("userId", "username")
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json(messages.reverse()); // newest at bottom
  } catch (err) {
    console.error("Get messages error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----- Online users presence -----
const onlineUsers = new Map(); // userId -> { count, username }

function broadcastOnlineUsers() {
  const list = Array.from(onlineUsers.entries()).map(([id, info]) => ({
    id,
    username: info.username,
  }));
  io.emit("onlineUsers", list);
}

// Track members per channel
const channelMembers = {}; // { channelName: Set(usernames) }

// ----- Socket.io events -----
io.on("connection", (socket) => {
  const { userId, username } = socket.handshake.query;
  socket.username = username; // store for later use
  socket.currentChannel = null;

  if (userId && username) {
    const existing = onlineUsers.get(userId) || { count: 0, username };
    onlineUsers.set(userId, {
      count: existing.count + 1,
      username: existing.username || username,
    });
    broadcastOnlineUsers();
  }

  // ---- JOIN CHANNEL ----
  socket.on("joinChannel", (channelId) => {
    socket.join(channelId);
    socket.currentChannel = channelId;

    if (!channelMembers[channelId]) {
      channelMembers[channelId] = new Set();
    }
    channelMembers[channelId].add(socket.username);

    io.to(channelId).emit("channelMembersUpdated", {
      channel: channelId,
      count: channelMembers[channelId].size,
      members: Array.from(channelMembers[channelId]),
    });
  });

  // ---- LEAVE CHANNEL ----
  socket.on("leaveChannel", (channelId) => {
    socket.leave(channelId);

    if (channelMembers[channelId]) {
      channelMembers[channelId].delete(socket.username);

      io.to(channelId).emit("channelMembersUpdated", {
        channel: channelId,
        count: channelMembers[channelId].size,
        members: Array.from(channelMembers[channelId]),
      });
    }

    socket.currentChannel = null;
  });

  // ---- TYPING ----
  socket.on("typing", ({ channelId, isTyping, username }) => {
    socket.to(channelId).emit("typing", { channelId, isTyping, username });
  });

  // ---- SEND MESSAGE ----
  socket.on("sendMessage", async ({ channelId, userId, content }) => {
    try {
      const msg = await Message.create({ channelId, userId, content });
      const populated = await msg.populate("userId", "username");
      io.to(channelId).emit("message", populated);
    } catch (err) {
      console.error("sendMessage error", err);
    }
  });

  // ---- DISCONNECT ----
  socket.on("disconnect", () => {
    if (userId) {
      const existing = onlineUsers.get(userId);
      if (existing) {
        if (existing.count <= 1) {
          onlineUsers.delete(userId);
        } else {
          onlineUsers.set(userId, {
            count: existing.count - 1,
            username: existing.username,
          });
        }
        broadcastOnlineUsers();
      }
    }

    // Remove from all channels
    for (const [channelId, members] of Object.entries(channelMembers)) {
      if (members.has(socket.username)) {
        members.delete(socket.username);
        io.to(channelId).emit("channelMembersUpdated", {
          channel: channelId,
          count: members.size,
          members: Array.from(members),
        });
      }
    }
  });
});

// ----- Start server -----
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 ChatHiveClean server running on port ${PORT}`);
});
