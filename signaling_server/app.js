const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// 소켓 연결 이벤트 처리
io.on('connection', socket => {
  console.log('사용자가 연결됨:', socket.id);

  // 오퍼 메시지 수신 및 전달
  socket.on('offer', (offer, room) => {
    socket.to(room).emit('offer', offer);
  });

  // 앤서 메시지 수신 및 전달
  socket.on('answer', (answer, room) => {
    socket.to(room).emit('answer', answer);
  });

  // ICE 후보 수신 및 전달
  socket.on('candidate', (candidate, room) => {
    socket.to(room).emit('candidate', candidate);
  });

  // 특정 방에 참여 요청 처리
  socket.on('join', room => {
    socket.join(room);
    socket.to(room).emit('new-user', socket.id);
  });

  // 소켓 연결 해제 이벤트 처리
  socket.on('disconnect', () => {
    console.log('사용자가 연결 해제됨:', socket.id);
  });
});

// 포트 설정 및 서버 시작
const PORT = 10000; // 시그널링 서버 포트
server.listen(PORT, () => {
  console.log(`시그널링 서버가 포트 ${PORT}에서 실행 중`);
});
