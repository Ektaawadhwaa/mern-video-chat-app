// Check authentication
if (!localStorage.getItem("token")) {
  window.location.href = "/auth.html";
}
 
const joinOverlay = document.getElementById("join-overlay");
const chatApp = document.getElementById("chat-app");
const joinForm = document.getElementById("join-form");
const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("message-input");
const roomEl = document.getElementById("room-input");
const leaveBtn = document.getElementById("leave-btn");
const usersListEl = document.getElementById("users-list");
const typingEl = document.getElementById("typing-indicator");
const roomDisplay = document.getElementById("room-display");
const headerRoom = document.getElementById("header-room");

let joined = false;
let currentUser = "";
let isTyping = false;
let typingTimeout;
const typingUsers = new Set();

// ========== JOIN ==========

joinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const room = roomEl.value.trim();
  if (!room) return;
  
  joined = true;
  const user = JSON.parse(localStorage.getItem("user"));
  currentUser = user.name;
  socket.emit("user:join", { room });

  joinOverlay.classList.add("hidden");
  chatApp.classList.remove("hidden");

  roomDisplay.textContent = `#${room}`;
  headerRoom.textContent = `#${room}`;
  inputEl.focus();
});

// ========== CHAT ==========

formEl.addEventListener("submit", (e) => {
  e.preventDefault();

  const text = inputEl.value.trim();
  if (!text || !joined) return;

  socket.emit("chat:message", { text });
  inputEl.value = "";
});

// Typing indicator
inputEl.addEventListener("input", () => {
  if (!joined) return;

  if (!isTyping) {
    socket.emit("chat:typing");
    isTyping = true;
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("chat:stop-typing");
    isTyping = false;
  }, 800);
});

// ========== SOCKET CHAT EVENTS ==========

socket.on("chat:history", (messages) => {
  messagesEl.innerHTML = "";
  messages.forEach((m) =>
    appendMessage(m.user, m.text, m.user === currentUser)
  );
  scrollToBottom();
});

socket.on("chat:message", (data) => {
  appendMessage(data.user, data.text, data.user === currentUser);
  scrollToBottom();
});

socket.on("chat:typing", ({ user }) => {
  typingUsers.add(user);
  renderTyping();
});

socket.on("chat:stop-typing", ({ user }) => {
  typingUsers.delete(user);
  renderTyping();
});

socket.on("chat:system", ({ text }) => {
  appendSystemMessage(text);
  scrollToBottom();
});

// ========== USERS + CALL BUTTON ==========

socket.on("room:users", (users) => {
  usersListEl.innerHTML = "";
 
  const uniqueUsers = [];
  const seenNames = new Set();
  
  users.forEach((user) => {
    if (!seenNames.has(user.name)) {
      seenNames.add(user.name);
      uniqueUsers.push(user);
    }
  });

  uniqueUsers.forEach(({ id, name }) => {
    const li = document.createElement("li");
    li.className = "flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary transition-colors";

    const isCurrentUser = name === currentUser;
    
    li.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-online flex-shrink-0"></span>
      <span class="truncate flex-1 text-foreground">${escapeHtml(name)}</span>
      ${isCurrentUser ? '<span class="text-xs text-muted-foreground">(you)</span>' : ''}
    `;

    if (!isCurrentUser) {
      const btn = document.createElement("button");
      btn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
        </svg>
      `;
      btn.className = "ml-auto p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors";
      btn.title = `Call ${name}`;
      btn.onclick = () => window.startCall(id);
      li.appendChild(btn);
    }

    usersListEl.appendChild(li);
  });
});


// ========== LEAVE ==========

leaveBtn.onclick = () => {
  if (window.currentCallUser) {
    socket.emit("video:end", { to: window.currentCallUser });
  }

  window.endCall();
  socket.emit("user:leave");
  
  joined = false;
  currentUser = "";
  messagesEl.innerHTML = "";
  usersListEl.innerHTML = "";
  typingUsers.clear();
  typingEl.innerHTML = "";
  roomEl.value = "";

  chatApp.classList.add("hidden");
  joinOverlay.classList.remove("hidden");
};

// ========== UI HELPERS ==========

function appendMessage(user, text, isSelf) {
  const div = document.createElement("div");
  div.className = `flex ${isSelf ? "justify-end" : "justify-start"}`;

  div.innerHTML = `
    <div class="max-w-[70%]">
      ${!isSelf ? `<p class="text-xs text-muted-foreground mb-1">${escapeHtml(user)}</p>` : ""}
      <div class="px-4 py-2.5 rounded-2xl ${
        isSelf
          ? "bg-primary text-primary-foreground rounded-br-md"
          : "bg-secondary text-foreground rounded-bl-md"
      }">
        ${escapeHtml(text)}
      </div>
    </div>
  `;

  messagesEl.appendChild(div);
}

function appendSystemMessage(text) {
  const div = document.createElement("div");
  div.className = "flex justify-center";
  div.innerHTML = `
    <span class="text-sm text-muted-foreground italic bg-muted/50 px-3 py-1 rounded-full">
      ${escapeHtml(text)}
    </span>
  `;
  messagesEl.appendChild(div);
}

function renderTyping() {
  if (typingUsers.size === 0) {
    typingEl.innerHTML = "";
    return;
  }

  const text = typingUsers.size === 1
    ? `${[...typingUsers][0]} is typing...`
    : "Several people are typing...";

  typingEl.innerHTML = `
    <span class="flex items-center gap-2">
      <span class="flex gap-1">
        <span class="w-1.5 h-1.5 bg-muted-foreground rounded-full typing-dot"></span>
        <span class="w-1.5 h-1.5 bg-muted-foreground rounded-full typing-dot"></span>
        <span class="w-1.5 h-1.5 bg-muted-foreground rounded-full typing-dot"></span>
      </span>
      ${text}
    </span>
  `;
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}