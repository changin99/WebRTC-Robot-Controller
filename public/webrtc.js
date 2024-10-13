const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]  // Google STUN 서버 사용
});

const videoElement = document.getElementById('video');  // 비디오 엘리먼트
let dataChannel;  // 제어 명령을 전송할 DataChannel
let isWebSocketOpen = false;  // WebSocket 연결 상태

// WebSocket을 사용해 Signaling 서버와 연결 (Signaling 서버는 SDP와 ICE candidate 교환을 처리)
const signalingServer = new WebSocket('ws://192.168.50.85:8080');

// WebSocket 연결이 열렸을 때만 메시지 전송
signalingServer.onopen = () => {
    console.log('WebSocket connected');
    isWebSocketOpen = true;
};

// Signaling 서버로 메시지를 보내는 함수 (WebSocket 연결이 열려 있을 때만 전송)
function sendSignal(message) {
    if (isWebSocketOpen) {
        signalingServer.send(JSON.stringify(message));
        console.log('Signal sent:', message);
    } else {
        console.error('WebSocket is not open yet');
    }
}

// Signaling 서버로부터 메시지를 수신하여 WebRTC 설정
signalingServer.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    // SDP 처리
    if (data.sdp) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (data.sdp.type === 'offer') {
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            sendSignal({ sdp: peerConnection.localDescription });
        }
    } 
    // ICE 후보 처리
    else if (data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
};

// ICE 후보 생성 시 Signaling 서버로 전송
peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        sendSignal({ candidate: event.candidate });
        console.log('ICE candidate sent:', event.candidate);
    }
};

// 영상 스트림 수신
peerConnection.ontrack = (event) => {
    videoElement.srcObject = event.streams[0];
};

// DataChannel 생성 및 설정
async function startConnection() {
    dataChannel = peerConnection.createDataChannel('control');
    dataChannel.onopen = () => console.log('DataChannel opened');
    dataChannel.onclose = () => console.log('DataChannel closed');

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    sendSignal({ sdp: peerConnection.localDescription });
}

// 제어 명령 전송
function sendCommand(command) {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({ command }));
        console.log(`Command sent: ${command}`);
    } else {
        console.error("DataChannel is not open");
    }
}

// UI에서 버튼 클릭 시 명령 전송
document.getElementById('up').addEventListener('click', () => sendCommand('MOVE_FORWARD'));
document.getElementById('down').addEventListener('click', () => sendCommand('MOVE_BACKWARD'));
document.getElementById('left').addEventListener('click', () => sendCommand('MOVE_LEFT'));
document.getElementById('right').addEventListener('click', () => sendCommand('MOVE_RIGHT'));

// WebRTC 연결 시작
startConnection();

