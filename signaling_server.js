const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// 클라이언트들을 저장할 배열
let clients = [];

// 클라이언트 연결 시 처리
wss.on('connection', (ws) => {
    clients.push(ws);
    const clientID = clients.length;  // 클라이언트 ID를 할당 (간단한 인덱스)

    console.log(`New client connected: Client ${clientID}`);
    console.log(`Total connected clients: ${clients.length}`);

    // 클라이언트로부터 메시지를 받으면 다른 클라이언트에게 전달 (중계 역할)
    ws.on('message', (message) => {
        console.log(`Message received from Client ${clientID}: ${message}`);

        clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
                console.log(`Message relayed from Client ${clientID} to another client.`);
            }
        });
    });

    // 클라이언트 연결 종료 시 배열에서 제거
    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
        console.log(`Client ${clientID} disconnected.`);
        console.log(`Total connected clients: ${clients.length}`);
    });
});

// 서버 실행
console.log('Signaling server running on ws://192.168.50.85:8080');
