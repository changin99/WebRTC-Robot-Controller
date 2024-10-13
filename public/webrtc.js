// STUN 서버 설정 및 WebRTC PeerConnection 객체 생성
const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]  // Google STUN 서버 사용
});

const videoElement = document.getElementById('video');  // 영상을 표시할 HTML 비디오 엘리먼트
let dataChannel;  // 제어 명령을 전송할 DataChannel

// WebSocket을 사용해 Signaling 서버와 연결 (Signaling 서버는 SDP와 ICE candidate 교환을 처리)
const signalingServer = new WebSocket('ws://localhost:8080');

// Signaling 서버로 메시지를 보내는 함수 (SDP 및 ICE 후보 전송)
function sendSignal(message) {
    signalingServer.send(JSON.stringify(message));
}

// Signaling 서버로부터 메시지를 수신
signalingServer.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    // 수신한 SDP 처리 (offer 또는 answer)
    if (data.sdp) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        
        // 오퍼를 수신한 경우 SDP 응답 생성 및 전송
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

// WebRTC ICE 후보 생성 시 Signaling 서버로 전송
peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        sendSignal({ candidate: event.candidate });
    }
};

// 영상 스트림 수신: 로봇에서 전송한 IP 카메라 영상을 비디오 엘리먼트에 표시
peerConnection.ontrack = (event) => {
    videoElement.srcObject = event.streams[0];
};

// DataChannel 생성 및 설정 (제어 명령을 로봇으로 전송)
async function startConnection() {
    // DataChannel을 통해 제어 명령을 전송
    dataChannel = peerConnection.createDataChannel('control');
    dataChannel.onopen = () => console.log('DataChannel opened');
    dataChannel.onclose = () => console.log('DataChannel closed');

    // 로컬 SDP 오퍼 생성
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // SDP 오퍼를 Signaling 서버로 전송
    sendSignal({ sdp: peerConnection.localDescription });
}

// 방향 제어 명령 전송 함수
function sendCommand(command) {
    if (dataChannel && dataChannel.readyState === 'open') {
        // 명령어를 JSON 형식으로 변환 후 전송
        dataChannel.send(JSON.stringify({ command }));
        console.log(`Command sent: ${command}`);
    }
}

// UI에서 버튼 클릭 시 제어 명령 전송
document.getElementById('up').addEventListener('click', () => sendCommand('MOVE_FORWARD'));
document.getElementById('down').addEventListener('click', () => sendCommand('MOVE_BACKWARD'));
document.getElementById('left').addEventListener('click', () => sendCommand('MOVE_LEFT'));
document.getElementById('right').addEventListener('click', () => sendCommand('MOVE_RIGHT'));

// WebRTC 연결 시작
startConnection();
