const express = require('express');
const app = express();
const path = require('path');

// /public 디렉토리 내 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 서버 포트 설정
const port = 4444;
app.listen(port, () => {
    console.log(`Server running at http://192.168.50.85:${port}`);
});
