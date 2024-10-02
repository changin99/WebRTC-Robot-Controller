import cv2
import asyncio
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from aiortc.contrib.signaling import TcpSocketSignaling

class CameraStreamTrack(VideoStreamTrack):
    """
    비디오 트랙을 WebRTC로 전송하는 클래스
    """
    def __init__(self, camera):
        super().__init__()
        self.camera = camera

    async def recv(self):
        frame = await self.camera.read()
        return frame

async def run(pc, signaling):
    # WebRTC offer 받기
    offer = await signaling.receive()
    await pc.setRemoteDescription(offer)

    # 응답 생성
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await signaling.send(pc.localDescription)

    # 피어 연결 유지
    while True:
        await asyncio.sleep(1)

async def main():
    # 시그널링 서버 연결
    signaling = TcpSocketSignaling('192.168.50.85', 3000)
    pc = RTCPeerConnection()

    # 카메라 설정 (USB 카메라)
    camera = cv2.VideoCapture(0)
    camera_track = CameraStreamTrack(camera)
    pc.addTrack(camera_track)

    await run(pc, signaling)

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
