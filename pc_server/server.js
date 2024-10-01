const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

let broadcaster;

io.on('connection', socket => {
    console.log('User connected:', socket.id);

    socket.on('broadcaster', () => {
        broadcaster = socket.id;
        socket.broadcast.emit('broadcaster');
    });

    socket.on('watcher', () => {
        socket.to(broadcaster).emit('watcher', socket.id);
    });

    socket.on('offer', (id, message) => {
        socket.to(id).emit('offer', socket.id, message);
    });

    socket.on('answer', (id, message) => {
        socket.to(id).emit('answer', socket.id, message);
    });

    socket.on('candidate', (id, message) => {
        socket.to(id).emit('candidate', socket.id, message);
    });

    socket.on('disconnect', () => {
        socket.to(broadcaster).emit('disconnectPeer', socket.id);
    });

    // 원격 제어 명령 처리
    socket.on('command', (command) => {
        console.log(`Received command: ${command}`);
        // 여기에서 라즈베리파이로 명령을 전달할 수 있음
        socket.to(broadcaster).emit('command', command);
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

