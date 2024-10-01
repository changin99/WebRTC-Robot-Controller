const io = require('socket.io-client');
const { RTCPeerConnection } = require('wrtc');
const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});
const socket = io('192.168.50.85:3000'); // PC의 IP 주소와 포트를 사용

// 웹캠 스트림을 가져와 WebRTC로 전송
const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
videoStream.getTracks().forEach(track => peerConnection.addTrack(track, videoStream));

peerConnection.onicecandidate = event => {
    if (event.candidate) {
        socket.emit('candidate', event.candidate);
    }
};

// 원격 제어 명령 수신
socket.on('command', (command) => {
    console.log(`Received command: ${command}`);
    // 여기에서 OpenCR을 통해 로봇을 제어하는 코드를 작성할 수 있습니다.
});

socket.on('watcher', async id => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', id, peerConnection.localDescription);
});

socket.on('answer', (id, description) => {
    peerConnection.setRemoteDescription(description);
});

socket.on('candidate', (id, candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.emit('broadcaster');
