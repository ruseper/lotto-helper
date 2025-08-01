// server.js or app.js

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());  // 모든 Origin 허용

// 예시 API
app.get('/api/generate-lotto', (req, res) => {
  try {
    // 기존 로또 번호 생성 로직
    const lottoNumbers = generateLotto(); // 예시 함수
    res.json({ numbers: lottoNumbers });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).send('Internal Server Error');
  }
});
