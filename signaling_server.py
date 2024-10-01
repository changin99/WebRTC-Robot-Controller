from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app)

# 클라이언트에서 offer/answer/ICE candidates 처리
@socketio.on('offer')
def handle_offer(data):
    emit('offer', data, broadcast=True)

@socketio.on('answer')
def handle_answer(data):
    emit('answer', data, broadcast=True)

@socketio.on('ice_candidate')
def handle_ice(data):
    emit('ice_candidate', data, broadcast=True)

@app.route('/')
def index():
    return "WebRTC Signaling Server Running"

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
