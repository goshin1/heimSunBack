// 필요한 모듈 가져오기
const dotenv = require('dotenv');
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

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
    cb(null, path.join(__dirname, 'uploads/')); // Railway에서는 로컬 디렉터리 사용
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

// 라우터 설정
// /login
app.post('/login', async (req, res) => {
  const { user_id, password } = req.body;
  if (!user_id || !password) return res.status(400).send(false);

  try {
    const result = await pool.query(
      'SELECT * FROM members WHERE user_id = $1 AND password = $2',
      [user_id, password]
    );
    res.send(result.rows.length > 0);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// /sign
app.post('/sign', async (req, res) => {
  const { user_id, password, name, email } = req.body;
  if (!user_id || !password || !name || !email) return res.status(400).send(false);

  try {
    await pool.query(
      'INSERT INTO members (user_id, password, name, email) VALUES ($1, $2, $3, $4)',
      [user_id, password, name, email]
    );
    res.send(true);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// /duplicate
app.post('/duplicate', async (req, res) => {
  const { user_id } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM members WHERE user_id = $1',
      [user_id]
    );
    res.send(result.rows.length === 0);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// /farm/add
app.post('/farm/add', upload.single('image'), async (req, res) => {
  const { user_id, crop_name, planting_date, harvest_date } = req.body;
  const image = req.file ? path.join('uploads', req.file.filename) : null;

  if (!user_id || !crop_name || !planting_date || !harvest_date || !image) return res.status(400).send(false);

  try {
    await pool.query(
      'INSERT INTO farms (user_id, crop_name, planting_date, harvest_date, image) VALUES ($1, $2, $3, $4, $5)',
      [user_id, crop_name, planting_date, harvest_date, image]
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
      'SELECT * FROM farms WHERE user_id = $1',
      [user_id]
    );
    res.send(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// /farm/edit
app.put('/farm/edit', upload.single('image'), async (req, res) => {
  const { farm_id, user_id, crop_name, planting_date, harvest_date } = req.body;
  const image = req.file ? path.join('uploads', req.file.filename) : null;

  try {
    await pool.query(
      `UPDATE farms SET 
        crop_name = COALESCE($1, crop_name), 
        planting_date = COALESCE($2, planting_date), 
        harvest_date = COALESCE($3, harvest_date), 
        image = COALESCE($4, image) 
      WHERE farm_id = $5 AND user_id = $6`,
      [crop_name, planting_date, harvest_date, image, farm_id, user_id]
    );
    res.send(true);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// /farm/delete
app.delete('/farm/delete', async (req, res) => {
  const { farm_id } = req.body;

  try {
    await pool.query(
      'DELETE FROM farms WHERE farm_id = $1',
      [farm_id]
    );
    res.send(true);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// /crops/add
app.post('/crops/add', upload.single('image'), async (req, res) => {
  const { farm_id, work_date, work_record, result } = req.body;
  const image = req.file ? path.join('uploads', req.file.filename) : null;

  if (!farm_id || !work_date || !work_record || !result || !image) return res.status(400).send(false);

  try {
    await pool.query(
      'INSERT INTO crop_info (farm_id, work_date, work_record, result, image) VALUES ($1, $2, $3, $4, $5)',
      [farm_id, work_date, work_record, result, image]
    );
    res.send(true);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// /crops/check
app.get('/crops/check', async (req, res) => {
  const { farm_id } = req.query;

  try {
    const result = await pool.query(
      'SELECT * FROM crop_info WHERE farm_id = $1',
      [farm_id]
    );
    res.send(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// /crops/edit
app.put('/crops/edit', upload.single('image'), async (req, res) => {
  const { id, work_date, work_record, result } = req.body;
  const image = req.file ? path.join('uploads', req.file.filename) : null;

  try {
    await pool.query(
      `UPDATE crop_info SET 
        work_date = COALESCE($1, work_date), 
        work_record = COALESCE($2, work_record), 
        result = COALESCE($3, result), 
        image = COALESCE($4, image) 
      WHERE id = $5`,
      [work_date, work_record, result, image, id]
    );
    res.send(true);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// /crops/delete
app.delete('/crops/delete', async (req, res) => {
  const { id } = req.body;

  try {
    await pool.query(
      'DELETE FROM crop_info WHERE id = $1',
      [id]
    );
    res.send(true);
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
