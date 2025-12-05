// main.js - frontend logic

let currentUser = null;
let socket = null;
let currentChannel = null;
let oldestMessageTime = null;

const authSection = document.getElementById("auth-section");
const chatSection = document.getElementById("chat-section");
const authError = document.getElementById("auth-error");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const channelsDiv = document.getElementById("channels");
const newChannelInput = document.getElementById("new-channel-name");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const typingIndicator = document.getElementById("typing-indicator");
const loadOlderBtn = document.getElementById("load-older-btn");
const onlineUsersList = document.getElementById("online-users");
const currentChannelName = document.getElementById("current-channel-name");

// ----- auth -----
async function register() {
  authError.textContent = "";
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) {
    authError.textContent = "Please fill both fields";
    return;
  }
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    authError.textContent = data.message || "Register failed";
    return;
  }
  await login(); // auto-login
}

async function login() {
  authError.textContent = "";
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) {
    authError.textContent = "Please fill both fields";
    return;
  }
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    authError.textContent = data.message || "Login failed";
    return;
  }
  const user = await res.json();
  currentUser = user;

  // 👉 NEW: remember user across refresh
  localStorage.setItem("chathive_user", JSON.stringify(user));

  initChat();
}

function logout() {
  currentUser = null;
  localStorage.removeItem("chathive_user"); // 👉 NEW

  if (socket) {
    socket.disconnect();
    socket = null;
  }
  authSection.classList.remove("hidden");
  chatSection.classList.add("hidden");
  messagesDiv.innerHTML = "";
  channelsDiv.innerHTML = "";
  onlineUsersList.innerHTML = "";
}

// ----- chat init -----
function initChat() {
  authSection.classList.add("hidden");
  chatSection.classList.remove("hidden");

  connectSocket();
  loadChannels();
}

// ----- socket -----
function connectSocket() {
  if (socket) socket.disconnect();

  socket = io({
    query: { userId: currentUser.id, username: currentUser.username },
  });

  socket.on("onlineUsers", (users) => {
    onlineUsersList.innerHTML = users
      .map(
        (u) =>
          `<li>${u.username}${u.id === currentUser.id ? " (You)" : ""}</li>`,
      )
      .join("");
  });

  socket.on("message", (msg) => {
    if (!currentChannel || msg.channelId !== currentChannel._id) return;
    appendMessage(msg);
  });

  socket.on("typing", ({ channelId, isTyping, username }) => {
    if (!currentChannel || channelId !== currentChannel._id) return;
    typingIndicator.textContent = isTyping ? `${username} is typing...` : "";
  });

  // NEW: update member count when backend broadcasts
  socket.on("channelMembersUpdated", ({ channel, count }) => {
    if (!currentChannel || currentChannel._id !== channel) return;
    const memberCountEl = document.getElementById("member-count");
    if (memberCountEl) {
      memberCountEl.textContent = `${count} members`;
    }
  });
}

// ----- channels -----
async function loadChannels() {
  const res = await fetch("/api/channels");
  const channels = await res.json();
  channelsDiv.innerHTML = "";
  channels.forEach((ch) => {
    const div = document.createElement("div");
    div.className = "channel";
    div.textContent = ch.name;
    div.onclick = () => selectChannel(ch);
    channelsDiv.appendChild(div);
  });
}

async function createChannel() {
  const name = newChannelInput.value.trim();
  if (!name) return;
  const res = await fetch("/api/channels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) return;
  newChannelInput.value = "";
  await loadChannels();
}

// ----- messages & pagination -----
async function loadMessages(channel, reset = true) {
  if (!channel) return;
  let url = `/api/channels/${channel._id}/messages?limit=30`;
  if (!reset && oldestMessageTime) {
    url += `&before=${encodeURIComponent(oldestMessageTime)}`;
  }

  const res = await fetch(url);
  const msgs = await res.json();

  if (reset) {
    messagesDiv.innerHTML = "";
    oldestMessageTime = null;
  }

  if (msgs.length > 0) {
    oldestMessageTime = msgs[0].createdAt;
    msgs.forEach((m) => appendMessage(m));
    loadOlderBtn.classList.remove("hidden");
  } else if (reset) {
    loadOlderBtn.classList.add("hidden");
  }
}

function appendMessage(msg) {
  const div = document.createElement("div");
  div.className = "message";
  const author = msg.userId?.username || "Unknown";
  const time = new Date(msg.createdAt).toLocaleTimeString();
  div.innerHTML = `
    <div class="author">${author}</div>
    <div>${msg.content}</div>
    <div class="time">${time}</div>
  `;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function selectChannel(ch) {
  currentChannel = ch;
  oldestMessageTime = null;
  document
    .querySelectorAll(".channel")
    .forEach((el) => el.classList.remove("active"));
  const channels = Array.from(document.querySelectorAll(".channel"));
  const idx = channels.findIndex((el) => el.textContent === ch.name);
  if (idx >= 0) channels[idx].classList.add("active");
  currentChannelName.textContent = ch.name;

  // show placeholder while we wait for count update
  const memberCountEl = document.getElementById("member-count");
  if (memberCountEl) {
    memberCountEl.textContent = `... members`;
  }

  socket.emit("joinChannel", ch._id);
  loadMessages(ch, true);
}

// ----- typing + send -----
let typingTimeout = null;

function handleTyping() {
  if (!socket || !currentChannel) return;
  socket.emit("typing", {
    channelId: currentChannel._id,
    isTyping: true,
    username: currentUser.username,
  });

  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing", {
      channelId: currentChannel._id,
      isTyping: false,
      username: currentUser.username,
    });
  }, 1000);
}

function sendMessage() {
  const content = messageInput.value.trim();
  if (!content || !currentChannel || !socket) return;
  socket.emit("sendMessage", {
    channelId: currentChannel._id,
    userId: currentUser.id,
    content,
  });
  messageInput.value = "";
}

// NEW: leave channel handler
function leaveChannel() {
  if (!currentChannel || !socket) return;
  socket.emit("leaveChannel", currentChannel._id);

  currentChannel = null;
  oldestMessageTime = null;
  messagesDiv.innerHTML = "";
  currentChannelName.textContent = "Select a channel";
  const memberCountEl = document.getElementById("member-count");
  if (memberCountEl) {
    memberCountEl.textContent = "0 members";
  }
  typingIndicator.textContent = "";
}

// ----- event listeners -----
document.getElementById("register-btn").onclick = register;
document.getElementById("login-btn").onclick = login;
document.getElementById("logout-btn").onclick = logout;
document.getElementById("create-channel-btn").onclick = createChannel;
document.getElementById("send-btn").onclick = sendMessage;
document.getElementById("leave-channel-btn").onclick = leaveChannel;
messageInput.addEventListener("input", handleTyping);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});
loadOlderBtn.onclick = () => {
  if (currentChannel) loadMessages(currentChannel, false);
};

// 👉 Auto-login if user was stored
window.addEventListener("load", () => {
  const saved = localStorage.getItem("chathive_user");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      initChat();
    } catch (e) {
      console.error("Failed to restore saved user", e);
      localStorage.removeItem("chathive_user");
    }
  }
});
