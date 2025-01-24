// 필요한 모듈 가져오기
const dotenv = require('dotenv');
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');

dotenv.config();

// Express 앱 생성
const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads/');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// PostgreSQL 클라이언트 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// /farm/add
app.post('/farm/add', upload.single('upload'), async (req, res) => {
  const { user_id, description, start, end } = req.body;
  const uploadPath = req.file ? `/uploads/${req.file.filename}` : null;

  if (!user_id || !description || !start || !end || !uploadPath) return res.status(400).send(false);

  try {
    await pool.query(
      'INSERT INTO farm_info (user_id, description, start, end, upload) VALUES ($1, $2, $3, $4, $5)',
      [user_id, description, start, end, uploadPath]
    );
    res.send(true);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// /farm/check
app.get('/farm/check', async (req, res) => {
  const { user_id } = req.query;

  try {
    const result = await pool.query(
      'SELECT * FROM farm_info WHERE user_id = $1',
      [user_id]
    );
    res.send(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// /farm/edit
app.put('/farm/edit', upload.single('upload'), async (req, res) => {
  const { id, user_id, description, start, end } = req.body;
  const uploadPath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    await pool.query(
      `UPDATE farm_info SET 
        description = COALESCE($1, description), 
        start = COALESCE($2, start), 
        end = COALESCE($3, end), 
        upload = COALESCE($4, upload) 
      WHERE id = $5 AND user_id = $6`,
      [description, start, end, uploadPath, id, user_id]
    );
    res.send(true);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// /farm/delete
app.delete('/farm/delete', async (req, res) => {
  const { id } = req.body;

  try {
    await pool.query(
      'DELETE FROM farm_info WHERE id = $1',
      [id]
    );
    res.send(true);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// /farm/month
app.post('/farm/month', async (req, res) => {
  const { user_id, month } = req.body;

  if (!user_id || !month) return res.status(400).send(false);

  try {
    const date = new Date(month);
    const year = date.getFullYear();
    const monthNumber = date.getMonth() + 1; // JavaScript의 month는 0부터 시작

    const result = await pool.query(
      `SELECT * FROM farm_info 
       WHERE user_id = $1 
       AND EXTRACT(YEAR FROM TO_TIMESTAMP(start, 'YYYY-MM-DD"T"HH24:MI')) = $2 
       AND EXTRACT(MONTH FROM TO_TIMESTAMP(start, 'YYYY-MM-DD"T"HH24:MI')) = $3`,
      [user_id, year, monthNumber]
    );
    res.send(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// 포트 설정 및 서버 실행
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
