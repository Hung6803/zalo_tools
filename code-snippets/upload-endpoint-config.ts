// UPLOAD ENDPOINT CONFIGURATION
// Thêm vào file: desktop-app/worker/api-server.ts

// ============================================
// BƯỚC 1: Thêm imports (đầu file)
// ============================================
import multer from 'multer';
import path from 'path';
import fs from 'fs';


// ============================================
// BƯỚC 2: Thêm cấu hình (sau app.use(express.json()))
// ============================================

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../data/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept images and documents
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh hoặc tài liệu!'));
    }
  }
});


// ============================================
// BƯỚC 3: Thêm upload route (sau app.get('/health'))
// ============================================

// ==================== FILE UPLOAD ====================

app.post('/local/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Return relative path for frontend
    const filePath = `/uploads/${req.file.filename}`;

    console.log(`✅ File uploaded: ${req.file.filename} (${(req.file.size / 1024).toFixed(2)}KB)`);

    res.json({
      success: true,
      filePath,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error: any) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
