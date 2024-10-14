const WebSocket = require('ws');

// 시그널링 서버 설정 (포트: 5555)
const wss = new WebSocket.Server({ host: '0.0.0.0', port: 5555 });

// 클라이언트들을 저장할 배열
let clients = [];
let clientRoles = {};  // 각 클라이언트의 Offerer/Answerer 역할을 저장

// Offer 역할을 부여할 첫 번째 클라이언트만 Offerer로 지정
let offererAssigned = false;

// 클라이언트 연결 시 처리
wss.on('connection', (ws) => {
    clients.push(ws);
    console.log('New client connected');

    // 클라이언트가 연결될 때 Offerer/Answerer 역할 부여
    if (!offererAssigned) {
        clientRoles[ws] = "offer";
        offererAssigned = true;
        ws.send(JSON.stringify({ role: "offer" }));
        console.log("Assigned role: Offerer");
    } else {
        clientRoles[ws] = "answer";
        ws.send(JSON.stringify({ role: "answer" }));
        console.log("Assigned role: Answerer");
    }

    // 클라이언트로부터 메시지 수신 시 처리
    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);

        // 받은 메시지를 다른 클라이언트에게 전달
        clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    // 클라이언트 연결 종료 시 처리
    ws.on('close', () => {
        console.log('Client disconnected');
        clients = clients.filter(client => client !== ws);

        // Offerer가 나가면 다음 클라이언트를 Offerer로 지정
        if (clientRoles[ws] === "offer") {
            offererAssigned = false;
        }

        delete clientRoles[ws];
    });
});

console.log('Signaling server is running on ws://0.0.0.0:5555');
