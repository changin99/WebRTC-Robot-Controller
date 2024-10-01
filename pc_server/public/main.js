const socket = io();
const videoElement = document.getElementById('webcamVideo');
const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});

socket.on('offer', async (id, description) => {
    await peerConnection.setRemoteDescription(description);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', id, peerConnection.localDescription);
});

peerConnection.onicecandidate = event => {
    if (event.candidate) {
        socket.emit('candidate', broadcaster, event.candidate);
    }
};

peerConnection.ontrack = event => {
    videoElement.srcObject = event.streams[0];
};

socket.on('candidate', (id, candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.emit('watcher');

function sendCommand(command) {
    socket.emit('command', command);
}
