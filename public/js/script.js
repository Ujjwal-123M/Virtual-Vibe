const socket = io("/");
const main__chat__window = document.getElementById("main__chat_window");
const videoGrids = document.getElementById("video-grids");
const myVideo = document.createElement("video");
const chat = document.getElementById("chat");
const screenShareButt = document.querySelector(".screenshare");

let startButton = document.getElementById("start");
let status = document.getElementById("status");
let mediaRecorder;

OtherUsername = "";
chat.hidden = true;
myVideo.muted = true;

var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "3000",
});

const connectedUsers = new Set();
let screenShare = false;
let myVideoStream;
const peers = {};
var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

sendmessage = (text) => {
  if (event.key === "Enter" && text.value != "") {
    socket.emit("messagesend", myname + " : " + text.value);
    text.value = "";
    main__chat_window.scrollTop = main__chat_window.scrollHeight;
  }
};

function addUser(userId) {
  connectedUsers.add(userId);
}

// Remove a user from the set
function removeUser(userId) {
  connectedUsers.delete(userId);
}

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;

    addVideoStream(myVideo, stream, myname);
    socket.on("user-connected", (id, username) => {
      console.log("userid:" + id);
      connectToNewUser(id, stream, username);
      socket.emit("tellName", myname);
    });
    socket.on("user-disconnected", (id) => {
      console.log("ye print hoga" + peers);
      if (peers[id]) peers[id].close();
      RemoveUnusedDivs();
    });
  });

peer.on("call", (call) => {
  getUserMedia(
    { video: true, audio: true },
    function (stream) {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", function (remoteStream) {
        addVideoStream(video, remoteStream, OtherUsername);
      });
      RemoveUnusedDivs();
    },
    function (err) {
      console.log("Failed to get local stream", err);
    }
  );
});

peer.on("open", (id) => {
  socket.emit("join-room", roomId, id, myname);
});

socket.on("createMessage", (message) => {
  var ul = document.getElementById("messageadd");
  var li = document.createElement("li");
  li.className = "message";
  li.appendChild(document.createTextNode(message));
  ul.appendChild(li);
});

socket.on("AddName", (username) => {
  OtherUsername = username;
  console.log(username);
});

const RemoveUnusedDivs = () => {
  //
  alldivs = videoGrids.getElementsByTagName("div");
  for (var i = 0; i < alldivs.length; i++) {
    e = alldivs[i].getElementsByTagName("video").length;
    if (e == 0) {
      alldivs[i].remove();
    }
  }
};

const connectToNewUser = (userId, streams, myname) => {
  const call = peer.call(userId, streams);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    //       console.log(userVideoStream);
    addVideoStream(video, userVideoStream, myname);
  });

  call.on("close", () => {
    video.remove();
    RemoveUnusedDivs();
  });
  peers[userId] = call;
};

const cancel = () => {
  $("#getCodeModal").modal("hide");
};

const copy = async () => {
  const roomid = document.getElementById("roomid").innerText;
  await navigator.clipboard.writeText("http://localhost:3000/join/" + roomid);
  $("#getCodeModal").modal("hide");
};

const invitebox = () => {
  $("#getCodeModal").modal("show");
};

const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    setMuteButton();
  }
};

const setMuteButton = () => {
  const html = `
      <i class="fas fa-microphone"></i>
      <span>Mute</span>
    `;
  document.querySelector(".main__mute_button").innerHTML = html;
};

const setUnmuteButton = () => {
  const html = `
      <i class="unmute fas fa-microphone-slash"></i>
      <span>Unmute</span>
    `;
  document.querySelector(".main__mute_button").innerHTML = html;
};

const VideomuteUnmute = () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  console.log(getUserMedia);
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  } else {
    setStopVideo();
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
};

const setStopVideo = () => {
  const html = `
      <i class="fas fa-video"></i>
      <span>Stop Video</span>
    `;
  document.querySelector(".main__video_button").innerHTML = html;
};

const setPlayVideo = () => {
  const html = `
    <i class="stop fas fa-video-slash"></i>
      <span>Play Video</span>
    `;
  document.querySelector(".main__video_button").innerHTML = html;
};

const showchat = () => {
  if (chat.hidden == false) {
    chat.hidden = true;
  } else {
    chat.hidden = false;
  }
};

let screenOn = false;
// screen share
screenShareButt.addEventListener("click", () => {
  if (!screenOn) {
    screenOn = true;
    screenshare();
  } else {
    screenOn = false;
    switchToCamera();
  }
});

function switchToCamera() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      myVideoStream = stream;
      addVideoStream(myVideo, stream, myname);
      socket.on("user-connected", (id, username) => {
        connectToNewUser(id, stream, username);
        socket.emit("tellName", myname);
      });
    })
    .catch((error) => {
      console.error("Error", error);
    });
}

function screenshare() {
  navigator.mediaDevices
    .getDisplayMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      myVideoStream = stream;
      addVideoStream(myVideo, stream, myname);
      socket.on("user-connected", (id, username) => {
        connectToNewUser(id, stream, username);
        socket.emit("tellName", myname);
      });
    })
    .catch((error) => {
      console.error("Error accessing screen capture:", error);
    });
}

function adjustVideoSizes() {
  let totalUsers = document.getElementsByTagName("video").length;
  if (totalUsers > 1) {
    const videos = document.getElementsByTagName("video");
    for (let index = 0; index < totalUsers; index++) {
      videos[index].style.width = 100 / totalUsers + "%";
    }
  }
}

// video grid adding
const addVideoStream = (videoEl, stream, name) => {
  videoEl.srcObject = stream;
  videoEl.addEventListener("loadedmetadata", () => {
    videoEl.play();
  });
  const h1 = document.createElement("h1");
  const h1name = document.createTextNode(name);
  h1.appendChild(h1name);
  const videoGrid = document.createElement("div");
  videoGrid.classList.add("video-grid");
  videoGrid.appendChild(h1);
  videoGrids.appendChild(videoGrid);
  videoGrid.append(videoEl);
  RemoveUnusedDivs();
  adjustVideoSizes();
};

let isRecording = false;

startButton.addEventListener("click", async function () {
  if (!isRecording) {
    try {
      let stream = await recordScreen();
      let mimeType = "video/webm";
      mediaRecorder = createRecorder(stream, mimeType);
      status.textContent = "Recording";
      startButton.textContent = "Stop Recording";

      isRecording = true;
    } catch (error) {
      console.error("Error starting recording:", error);
      status.textContent = "Error starting recording";
    }
  } else {
    mediaRecorder.stop();
    status.textContent = "Stopped recording";
    startButton.textContent = "Start Recording";
    isRecording = false;
  }
});

async function recordScreen() {
  return await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: { mediaSource: "screen" },
  });
}

function createRecorder(stream, mimeType) {
  let recordedChunks = [];

  const mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = function (e) {
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };
  mediaRecorder.onstop = function () {
    saveFile(recordedChunks);
    recordedChunks = [];
  };
  mediaRecorder.start(200); // For every 200ms the stream data will be stored in a separate chunk.
  return mediaRecorder;
}

function saveFile(recordedChunks) {
  const blob = new Blob(recordedChunks, {
    type: "video/webm",
  });
  let filename = window.prompt("Enter file name");
  let downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = `${filename}.webm`;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  URL.revokeObjectURL(blob); // clear from memory
  document.body.removeChild(downloadLink);
}
