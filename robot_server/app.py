import asyncio
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from av import VideoFrame

class CameraStreamTrack(VideoStreamTrack):
    # 카메라 스트림 트랙 정의
    def __init__(self, camera):
        super().__init__()  # 비디오스트림트랙 초기화
        self.camera = camera  # 카메라 객체 저장

    async def recv(self):
        frame = self.camera.get_frame()  # 카메라에서 프레임 받기
        av_frame = VideoFrame.from_ndarray(frame, format='bgr24')
        av_frame.pts = None
        av_frame.time_base = None
        return av_frame

async def run():
    pc = RTCPeerConnection()
    pc.addTrack(CameraStreamTrack(camera))  # 카메라 트랙 추가

    @pc.on('icecandidate')
    async def on_icecandidate(candidate):
        print('새 ICE 후보:', candidate)

    # 시그널링을 통해 받은 오퍼에 대응
    offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    print('오퍼 생성 및 로컬 설명 설정 완료:', offer)

asyncio.run(run())
