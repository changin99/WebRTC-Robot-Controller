package main

import (
    "fmt"
    "log"
    "sync"
    //"time"
    "os/exec"
    "github.com/pion/webrtc/v3"
    //"github.com/pion/ice/v2"
    "github.com/gorilla/websocket"
)

var (
    peerConnection *webrtc.PeerConnection
    videoTrack     *webrtc.TrackLocalStaticSample
    wsConn         *websocket.Conn
    iceCandidates  []webrtc.ICECandidateInit
    mutex          sync.Mutex
)

func main() {
    // WebSocket 연결
    var err error
    wsConn, _, err = websocket.DefaultDialer.Dial("ws://192.168.50.85:5555", nil)
    if err != nil {
        log.Fatal("Failed to connect to signaling server:", err)
    }
    defer wsConn.Close()

    // WebRTC 설정
    webrtcConfig := webrtc.Configuration{
        ICETransportPolicy: webrtc.ICETransportPolicyAll,
        ICEServers: []webrtc.ICEServer{
            {
                URLs:       []string{"stun:stun.l.google.com:19302"},  // ICE 서버 설정
                Username:   "yourUsername",
                Credential: "yourPassword",
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

    // 영상 스트리밍 시작
    startGStreamerPipeline()

    // Offer/Answer 설정
    peerConnection.OnNegotiationNeeded(func() {
        log.Println("Negotiation needed")
        if peerConnection.SignalingState() == webrtc.SignalingStateStable {
            createAndSendOffer()
        }
    })

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

    // 대기 (PeerConnection 종료 전까지 실행 유지)
    select {}
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

// SDP 및 ICE 후보 시그널링 서버로 전송
func sendSDPToSignalingServer(sdp webrtc.SessionDescription) {
    message := map[string]interface{}{
        "type": "sdp",
        "sdp":  sdp,
    }
    err := wsConn.WriteJSON(message)
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
    err := wsConn.WriteJSON(message)
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