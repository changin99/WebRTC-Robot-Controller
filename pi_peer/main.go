package main

import (
    "fmt"
    "log"
    "sync"
    "encoding/json"
    "os/exec"
    "github.com/pion/webrtc/v3"
    "golang.org/x/net/websocket"
)

var (
    peerConnection *webrtc.PeerConnection
    videoTrack     *webrtc.TrackLocalStaticSample
    wsConn         *websocket.Conn
    iceCandidates  []webrtc.ICECandidateInit
    mutex          sync.Mutex
    isOfferer      bool  // Offerer인지 Answerer인지 확인하는 변수
)

func main() {
    // WebSocket 연결
    var err error
    wsConn, err = websocket.Dial("ws://192.168.50.85:5555", "", "http://localhost/")
    if err != nil {
        log.Fatal("Failed to connect to signaling server:", err)
    }
    defer wsConn.Close()

    log.Println("WebSocket 연결 성공")

    // 시그널링 서버에서 Offerer/Answerer 결정 메시지를 수신
    var roleMsg string
    websocket.Message.Receive(wsConn, &roleMsg)
    if roleMsg == "offer" {
        isOfferer = true
    } else if roleMsg == "answer" {
        isOfferer = false
    }

    log.Printf("This peer is %s", roleMsg)

    // WebRTC 설정
    webrtcConfig := webrtc.Configuration{
        ICETransportPolicy: webrtc.ICETransportPolicyAll,
        ICEServers: []webrtc.ICEServer{
            {
                URLs:       []string{"stun:stun.l.google.com:19302"},
            },
        },
    }

    // PeerConnection 생성
    peerConnection, err = webrtc.NewPeerConnection(webrtcConfig)
    if err != nil {
        log.Fatal(err)
    }

    // ICE 후보가 생성되면 시그널링 서버를 통해 상대에게 전송
    peerConnection.OnICECandidate(func(candidate *webrtc.ICECandidate) {
        if candidate != nil {
            candidateInit := candidate.ToJSON()
            log.Printf("New ICE Candidate: %v", candidateInit)
            sendIceCandidateToSignalingServer(candidateInit)
        }
    })

    // 역할에 따라 Offer 또는 Answer 생성
    if isOfferer {
        createAndSendOffer()
    }

    // 웹캠에서 영상 가져오기 (GStreamer 사용)
    videoTrack, err = webrtc.NewTrackLocalStaticSample(webrtc.RTPCodecCapability{
        MimeType: webrtc.MimeTypeVP8,
    }, "video", "stream")
    if err != nil {
        log.Fatal(err)
    }

    _, err = peerConnection.AddTrack(videoTrack)
    if err != nil {
        log.Fatal(err)
    }

    // GStreamer 파이프라인 시작
    startGStreamerPipeline()

    // 데이터채널 생성 및 제어 명령 처리
    dataChannel, err := peerConnection.CreateDataChannel("control", nil)
    if err != nil {
        log.Fatal(err)
    }

    dataChannel.OnMessage(func(msg webrtc.DataChannelMessage) {
        command := string(msg.Data)
        log.Printf("Received command: %s", command)
        handleControlCommand(command)
    })

    // 시그널링 서버에서 받은 메시지를 처리
    go func() {
        for {
            var msg string
            websocket.Message.Receive(wsConn, &msg)
            log.Printf("Received message from signaling server: %s", msg)
            handleSignalingMessage(msg)
        }
    }()

    // 대기 (PeerConnection 종료 전까지 실행 유지)
    select {}
}

// 시그널링 서버에서 받은 메시지 처리
func handleSignalingMessage(msg string) {
    var signal map[string]interface{}
    err := json.Unmarshal([]byte(msg), &signal)
    if err != nil {
        log.Printf("Error unmarshaling signaling message: %v", err)
        return
    }

    if sdp, ok := signal["sdp"].(map[string]interface{}); ok {
        log.Println("Received SDP")
        if sdp["type"] == "offer" {
            // Offer 수신 시 Answer 생성
            createAndSendAnswer()
        }
    } else if candidate, ok := signal["candidate"].(map[string]interface{}); ok {
        log.Println("Received ICE Candidate")
        
        // 포인터 변환을 위해 임시 변수 사용
        sdpMid := candidate["sdpMid"].(string)
        sdpMLineIndex := uint16(candidate["sdpMLineIndex"].(float64))

        iceCandidate := webrtc.ICECandidateInit{
            Candidate:     candidate["candidate"].(string),
            SDPMid:        &sdpMid,             // *string으로 변환
            SDPMLineIndex: &sdpMLineIndex,      // *uint16으로 변환
        }
        peerConnection.AddICECandidate(iceCandidate)
    }
}


// GStreamer를 사용해 웹캠에서 영상 가져오기
func startGStreamerPipeline() {
    cmd := exec.Command("gst-launch-1.0", "v4l2src", "device=/dev/video0", "!", "videoconvert", "!", "vp8enc", "!", "rtpvp8pay", "!", "udpsink", "host=127.0.0.1", "port=5000")
    err := cmd.Start()
    if err != nil {
        log.Fatalf("Failed to start GStreamer pipeline: %v", err)
    }
    log.Println("GStreamer pipeline started")
}

// SDP Offer 생성 및 시그널링 서버로 전송
func createAndSendOffer() {
    offer, err := peerConnection.CreateOffer(nil)
    if err != nil {
        log.Fatal(err)
    }

    err = peerConnection.SetLocalDescription(offer)
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Created SDP Offer: %s", offer.SDP)
    sendSDPToSignalingServer(offer)
}

// SDP Answer 생성 및 시그널링 서버로 전송
func createAndSendAnswer() {
    answer, err := peerConnection.CreateAnswer(nil)
    if err != nil {
        log.Fatal(err)
    }

    err = peerConnection.SetLocalDescription(answer)
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Created SDP Answer: %s", answer.SDP)
    sendSDPToSignalingServer(answer)
}

// SDP 및 ICE 후보 시그널링 서버로 전송
func sendSDPToSignalingServer(sdp webrtc.SessionDescription) {
    message := map[string]interface{}{
        "type": "sdp",
        "sdp":  sdp,
    }
    err := websocket.JSON.Send(wsConn, message)
    if err != nil {
        log.Println("Error sending SDP to signaling server:", err)
    } else {
        log.Println("SDP sent to signaling server")
    }
}

func sendIceCandidateToSignalingServer(candidate webrtc.ICECandidateInit) {
    message := map[string]interface{}{
        "type":      "candidate",
        "candidate": candidate,
    }
    err := websocket.JSON.Send(wsConn, message)
    if err != nil {
        log.Println("Error sending ICE candidate to signaling server:", err)
    } else {
        log.Println("ICE candidate sent to signaling server")
    }
}

// 제어 명령 처리 함수
func handleControlCommand(command string) {
    switch command {
    case "MOVE_FORWARD":
        fmt.Println("MOVE_FORWARD")
    case "MOVE_BACKWARD":
        fmt.Println("MOVE_BACKWARD")
    case "MOVE_LEFT":
        fmt.Println("MOVE_LEFT")
    case "MOVE_RIGHT":
        fmt.Println("MOVE_RIGHT")
    default:
        fmt.Println("Command Not Found", command)
    }
}
