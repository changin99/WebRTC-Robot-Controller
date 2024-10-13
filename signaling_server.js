const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// 연결된 클라이언트를 저장하는 배열
let clients = [];

// 클라이언트 연결 처리
wss.on('connection', (ws) => {
    // 클라이언트를 배열에 추가
    clients.push(ws);

    // 클라이언트로부터 메시지를 받으면 다른 클라이언트에게 전달
    ws.on('message', (message) => {
        clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    // 클라이언트가 연결을 끊으면 배열에서 제거
    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });

    console.log('New client connected');
});

// 서버 실행
console.log('Signaling server running on ws://localhost:8080');
