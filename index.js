// 필요한 모듈 가져오기
const dotenv = require('dotenv');
const cors = require('cors')
const express = require('express');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

// Supabase 클라이언트 설정
const supabaseUrl = process.env.DATABASE_URL;
const supabaseKey = process.env.DATABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 라우터 설정
// /login
app.post('/login', async (req, res) => {
  const { user_id, password } = req.body;
  if (!user_id || !password) return res.status(400).send(false);

  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user_id)
      .eq('password', password);

    if (error) throw error;
    res.send(data.length > 0);
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
    const { error } = await supabase
      .from('members')
      .insert([{ user_id, password, name, email }]);

    if (error) throw error;
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
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user_id);

    if (error) throw error;
    res.send(data.length === 0);
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
    const { error } = await supabase
      .from('farms')
      .insert([{ user_id, crop_name, planting_date, harvest_date, image: image }]);

    if (error) throw error;
    res.send(true);
  } catch (err) {
    console.error(err);
    res.status(500).send(false);
  }
});

// 기타 라우터 설정
// /farm/check, /farm/edit, /farm/delete, /crops/add, /crops/check, /crops/edit, /crops/delete 등
// 기존 코드 그대로 유지

// 포트 설정 및 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
