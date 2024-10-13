#include "rclcpp/rclcpp.hpp"
#include <websocketpp/config/asio_no_tls_client.hpp>
#include <websocketpp/client.hpp>
#include <thread>
#include <mutex>
#include <gst/gst.h>
#include <nlohmann/json.hpp>  // JSON 처리용
#include <webrtc/api/peer_connection_interface.h>  // WebRTC 라이브러리

using json = nlohmann::json;
using websocketpp::connection_hdl;
using message_ptr = websocketpp::config::asio_client::message_type::ptr;
using websocket_client = websocketpp::client<websocketpp::config::asio_client>;

class ManipulatorControlNode : public rclcpp::Node
{
public:
    ManipulatorControlNode()
    : Node("manipulator_control_node")
    {
        // Signaling 서버와 연결
        std::thread(&ManipulatorControlNode::connect_to_signaling_server, this).detach();
        
        // WebRTC P2P 연결 설정 (영상 스트리밍)
        std::thread(&ManipulatorControlNode::start_webrtc_stream, this).detach();
    }

    // Signaling 서버 연결 및 WebSocket 클라이언트 실행 함수
    void connect_to_signaling_server()
    {
        try {
            client_.init_asio();
            
            client_.set_open_handler([this](connection_hdl hdl) {
                std::lock_guard<std::mutex> lock(mutex_);
                RCLCPP_INFO(this->get_logger(), "Connected to the signaling server");
                hdl_ = hdl;

                // SDP Offer 요청
                json offer_request = {{"type", "offer"}};
                client_.send(hdl_, offer_request.dump(), websocketpp::frame::opcode::text);
            });

            client_.set_message_handler([this](connection_hdl, message_ptr msg) {
                std::lock_guard<std::mutex> lock(mutex_);
                RCLCPP_INFO(this->get_logger(), "Received signaling message: %s", msg->get_payload().c_str());

                // Signaling 서버에서 받은 메시지 처리 (WebRTC SDP 및 ICE 교환만 처리)
                handle_signaling_message(msg->get_payload());
            });

            websocketpp::lib::error_code ec;
            websocket_client::connection_ptr con = client_.get_connection("ws://192.168.50.85:8080", ec);

            if (ec) {
                RCLCPP_ERROR(this->get_logger(), "Could not create connection: %s", ec.message().c_str());
                return;
            }

            client_.connect(con);
            client_.run();
        } catch (const std::exception& e) {
            RCLCPP_ERROR(this->get_logger(), "Exception: %s", e.what());
        }
    }

    // Signaling 서버에서 받은 메시지 처리 (WebRTC 설정)
    void handle_signaling_message(const std::string& message)
    {
        auto json_message = json::parse(message);

        // SDP 및 ICE 후보 처리 (WebRTC 연결만 담당)
        if (json_message.contains("sdp")) {
            RCLCPP_INFO(this->get_logger(), "Processing SDP message...");
            peer_connection_->SetRemoteDescription(...);  // 수신한 SDP를 사용해 Remote Description 설정
        } else if (json_message.contains("candidate")) {
            RCLCPP_INFO(this->get_logger(), "Processing ICE candidate...");
            // 수신한 ICE 후보를 추가
            webrtc::IceCandidateInterface* candidate = CreateIceCandidate(json_message["sdpMid"], json_message["sdpMLineIndex"], json_message["candidate"]);
            peer_connection_->AddIceCandidate(candidate);
        }
    }

    // WebRTC 스트리밍 함수 (WebRTC P2P 통신 설정)
    void start_webrtc_stream()
    {
        RCLCPP_INFO(this->get_logger(), "Starting WebRTC video stream");

        // WebRTC RTCPeerConnection 설정
        webrtc::PeerConnectionInterface::RTCConfiguration config;
        config.servers.push_back(webrtc::PeerConnectionInterface::IceServer{});
        peer_connection_ = peer_connection_factory_->CreatePeerConnection(config, nullptr, nullptr, this);

        // 비디오 트랙 생성 (로컬 비디오 소스를 WebRTC 트랙에 추가)
        rtc::scoped_refptr<webrtc::VideoTrackInterface> video_track = peer_connection_factory_->CreateVideoTrack(
            "video_label", CreateVideoSource());

        peer_connection_->AddTrack(video_track, {"stream_label"});

        // SDP Offer 생성 및 전송
        peer_connection_->CreateOffer(this, webrtc::PeerConnectionInterface::RTCOfferAnswerOptions());
    }

    // DataChannel을 통해 제어 명령을 처리하는 함수
    void handle_datachannel_message(const std::string& command)
    {
        if (command == "MOVE_FORWARD") {
            RCLCPP_INFO(this->get_logger(), "Moving forward");
        } else if (command == "MOVE_BACKWARD") {
            RCLCPP_INFO(this->get_logger(), "Moving backward");
        } else if (command == "MOVE_LEFT") {
            RCLCPP_INFO(this->get_logger(), "Moving left");
        } else if (command == "MOVE_RIGHT") {
            RCLCPP_INFO(this->get_logger(), "Moving right");
        } else {
            RCLCPP_WARN(this->get_logger(), "Unknown command: %s", command.c_str());
        }
    }

    // 비디오 소스 생성 (USB 카메라 사용)
    rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> CreateVideoSource() {
        // 여기에서 /dev/video0 USB 카메라 스트림을 생성하고 WebRTC VideoSource로 변환
        // VideoCaptureModule을 이용해 로컬 카메라 스트림 가져오기
        // GStreamer 대신 WebRTC 자체 기능을 통해 직접 처리
    }

private:
    websocket_client client_;
    connection_hdl hdl_;
    std::mutex mutex_;

    rtc::scoped_refptr<webrtc::PeerConnectionInterface> peer_connection_;
    rtc::scoped_refptr<webrtc::PeerConnectionFactoryInterface> peer_connection_factory_;
};

int main(int argc, char **argv)
{
    rclcpp::init(argc, argv);
    auto node = std::make_shared<ManipulatorControlNode>();
    rclcpp::spin(node);
    rclcpp::shutdown();
    return 0;
}
