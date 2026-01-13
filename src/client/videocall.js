 

let pc = null;
let localStream = null;
let currentCallUser = null;
window.currentCallUser = null;
let pendingCandidates = [];
let inCall = false;
let localVideoEl = null;
let remoteVideoEl = null;

const videoArea = document.getElementById("video-area");

// Popup elements
const callPopup = document.getElementById("callPopup");
const callerText = document.getElementById("callerText");
const acceptBtn = document.getElementById("acceptBtn");
const rejectBtn = document.getElementById("rejectBtn");
const endCallBtn = document.getElementById("endCallBtn");
const callingOverlay = document.getElementById("callingOverlay");
const ringtone = document.getElementById("ringtone");

let callSeconds = 0;
const muteBtn = document.getElementById("muteBtn");
const cameraBtn = document.getElementById("cameraBtn");

let micEnabled = true;
let camEnabled = true;

muteBtn.onclick = () => {
  if (!localStream) return;

  micEnabled = !micEnabled;
  localStream.getAudioTracks().forEach((t) => (t.enabled = micEnabled));
  muteBtn.textContent = micEnabled ? "🎤" : "🔇";
  muteBtn.classList.toggle("bg-destructive", !micEnabled);
  muteBtn.classList.toggle("bg-gray-700/80", micEnabled);
};

cameraBtn.onclick = () => {
  if (!localStream) return;

  camEnabled = !camEnabled;
  localStream.getVideoTracks().forEach((t) => (t.enabled = camEnabled));
  cameraBtn.textContent = camEnabled ? "📷" : "🚫";
  cameraBtn.classList.toggle("bg-destructive", !camEnabled);
  cameraBtn.classList.toggle("bg-gray-700/80", camEnabled);
};

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// ========== MEDIA ==========

async function startMedia() {
  if (localStream) return;

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  localVideoEl = document.createElement("video");
  localVideoEl.autoplay = true;
  localVideoEl.muted = true;
  localVideoEl.playsInline = true;
  localVideoEl.srcObject = localStream;

  localVideoEl.className =
    "w-40 h-32 object-cover rounded-xl border-2 border-white absolute bottom-4 right-4 shadow-lg";

  videoArea.appendChild(localVideoEl);
}
 

function createPC() {
  if (pc) return;

  pc = new RTCPeerConnection(config);

  if (localStream) {
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  }

  pc.ontrack = (e) => {
    if (!remoteVideoEl) {
      remoteVideoEl = document.createElement("video");
      remoteVideoEl.autoplay = true;
      remoteVideoEl.playsInline = true;
      remoteVideoEl.className = "w-full h-full object-cover";

      videoArea.appendChild(remoteVideoEl);
    }
   remoteVideoEl.srcObject = e.streams[0];
remoteVideoEl.muted = false;

remoteVideoEl.play().catch(err => {
  console.log("Autoplay blocked:", err);
});
  };

  pc.onicecandidate = (e) => {
    if (e.candidate && currentCallUser) {
      socket.emit("video:ice", {
        to: currentCallUser,
        candidate: e.candidate,
      });
    }
  };
}
 

async function startCall(targetId) {
  if (inCall) return;
  inCall = true;
  videoArea.classList.remove("hidden");
  currentCallUser = targetId;
  window.currentCallUser = targetId;

  await startMedia();
  createPC();

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("video:call", { to: targetId, offer });
  callingOverlay.classList.remove("hidden");
}

async function acceptCall() {
  callPopup.style.display = "none";

  inCall = true;
  videoArea.classList.remove("hidden");
  await startMedia();
  createPC();

  await pc.setRemoteDescription(incomingOffer);
  flushIce();
  currentCallUser = incomingFrom;
  window.currentCallUser = incomingFrom;
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("video:answer", { to: incomingFrom, answer });
  callingOverlay.classList.add("hidden");
  ringtone.pause();
  ringtone.currentTime = 0;

  incomingOffer = null;
  incomingFrom = null;
}

function endCall() {
  if (pc) {
    pc.close();
    pc = null;
  }

  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }

  if (localVideoEl) {
    localVideoEl.srcObject = null;
    localVideoEl.remove();
    localVideoEl = null;
  }

  if (remoteVideoEl) {
    remoteVideoEl.srcObject = null;
    remoteVideoEl.remove();
    remoteVideoEl = null;
  }

  currentCallUser = null;
  window.currentCallUser = null;
  pendingCandidates = [];
  inCall = false;
  ringtone.pause();
  ringtone.currentTime = 0;

  videoArea.classList.add("hidden");
  callingOverlay.classList.add("hidden");
   
  micEnabled = true;
  camEnabled = true;
  muteBtn.textContent = "🎤";
  cameraBtn.textContent = "📷";
  muteBtn.classList.remove("bg-destructive");
  muteBtn.classList.add("bg-gray-700/80");
  cameraBtn.classList.remove("bg-destructive");
  cameraBtn.classList.add("bg-gray-700/80");
}

// ========== ICE ==========

function flushIce() {
  pendingCandidates.forEach((c) => pc.addIceCandidate(c));
  pendingCandidates = [];
}

// ========== SOCKET EVENTS ==========

let incomingOffer = null;
let incomingFrom = null;

socket.on("video:incoming", ({ from, name, offer }) => {
  if (inCall) return;

  incomingOffer = offer;
  incomingFrom = from;

  callerText.textContent = `Incoming call from ${name}`;
  callPopup.style.display = "flex";
  ringtone.play();
});

socket.on("video:answer", async ({ answer }) => {
  if (!pc) return;
  await pc.setRemoteDescription(answer);
  flushIce();
  callingOverlay.classList.add("hidden");
});

socket.on("video:ice", async ({ candidate }) => {
  if (pc && pc.remoteDescription) {
    await pc.addIceCandidate(candidate);
  } else {
    pendingCandidates.push(candidate);
  }
});

socket.on("video:busy", () => {
  alert("User is busy on another call");
  endCall();
});

socket.on("video:end", () => {
  endCall();
});

endCallBtn.onclick = () => {
  if (currentCallUser) {
    socket.emit("video:end", { to: currentCallUser });
  }
  endCall();
};

// Expose to chat.js
window.startCall = startCall;
window.endCall = endCall;

// Popup buttons
acceptBtn.onclick = acceptCall;
rejectBtn.onclick = () => {
    if (incomingFrom) {
    socket.emit("video:reject", { to: incomingFrom });
  }
  callPopup.style.display = "none";
  incomingOffer = null;
  incomingFrom = null;
  ringtone.pause();
  ringtone.currentTime = 0;
};
// Handle rejection notification
socket.on("video:rejected", () => {
  callingOverlay.classList.add("hidden");
  alert("Call was rejected");
  endCall();
});
