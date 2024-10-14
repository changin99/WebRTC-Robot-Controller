// 시그널링 서버와 WebSocket 연결 설정
const signalingServerUrl = "ws://192.168.50.85:5555";
const ws = new WebSocket(signalingServerUrl);

let peerConnection;
let dataChannel;
let videoElement = document.getElementById("video");
let isOfferer = false;  // Offerer 역할인지 여부를 시그널링 서버에서 결정

// 시그널링 서버 연결 후 처리
ws.onopen = () => {
    console.log("Connected to the signaling server");
};

// 시그널링 서버에서 메시지 수신 시 처리
ws.onmessage = async (message) => {
    const signal = JSON.parse(message.data);
    
    if (signal.role) {
        // 시그널링 서버로부터 Offerer/Answerer 역할을 받음
        isOfferer = signal.role === "offer";
        console.log(`This peer is ${isOfferer ? "Offerer" : "Answerer"}`);
        
        // Offerer인 경우 Offer 생성
        if (isOfferer) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            sendToSignalingServer({ sdp: peerConnection.localDescription });
        }
    }
    else if (signal.sdp) {
        // SDP 처리 (Offer 또는 Answer)
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (!isOfferer && signal.sdp.type === "offer") {
            // Offerer가 아닌 경우에 Answer 생성
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            sendToSignalingServer({ sdp: peerConnection.localDescription });
        }
    } else if (signal.candidate) {
        // ICE 후보 처리
        await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
};

// SDP 또는 ICE 후보 시그널링 서버로 전송
function sendToSignalingServer(message) {
    ws.send(JSON.stringify(message));
}

// WebRTC PeerConnection 및 DataChannel 설정
async function setupWebRTC() {
    // ICE 서버 설정
    const iceServers = [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ];

    // PeerConnection 생성
    peerConnection = new RTCPeerConnection({ iceServers });

    // ICE 후보 생성 시 시그널링 서버로 전송
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendToSignalingServer({ candidate: event.candidate });
        }
    };

    // DataChannel 생성 및 제어 명령 전송
    dataChannel = peerConnection.createDataChannel("control");
    dataChannel.onopen = () => console.log("DataChannel opened");
    dataChannel.onclose = () => console.log("DataChannel closed");

    // 원격 스트림 수신 시 비디오 엘리먼트에 설정
    peerConnection.ontrack = (event) => {
        videoElement.srcObject = event.streams[0];
    };
}

// 제어 명령 버튼 설정
document.getElementById("up").onclick = () => sendCommand("MOVE_FORWARD");
document.getElementById("down").onclick = () => sendCommand("MOVE_BACKWARD");
document.getElementById("left").onclick = () => sendCommand("MOVE_LEFT");
document.getElementById("right").onclick = () => sendCommand("MOVE_RIGHT");

// DataChannel을 통해 제어 명령 전송
function sendCommand(command) {
    if (dataChannel && dataChannel.readyState === "open") {
        dataChannel.send(command);
    } else {
        console.error("DataChannel is not open");
    }
}

// 페이지 로드 시 WebRTC 설정 시작
window.onload = () => {
    setupWebRTC();
};
