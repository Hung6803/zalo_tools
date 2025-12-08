# CODE CẦN THÊM VÀO BACKEND - COPY & PASTE

## ⚠️ LƯU Ý: Đảm bảo backend server đã TẮT trước khi edit

---

## 📝 FILE 1: `desktop-app/worker/local-db.ts`

### Bước 1.1: Thêm field vào TemplateRecord interface (dòng ~57)

Tìm interface `TemplateRecord` và thêm dòng `attachments`:

```typescript
export interface TemplateRecord {
  id?: number;
  accountId?: number;
  agentId?: string;
  name: string;
  content: string;
  variables?: string;
  category?: string;
  description?: string;
  isActive: number;
  usageCount: number;
  attachments?: string; // ← THÊM DÒNG NÀY
  createdAt?: string;
  updatedAt?: string;
}
```

---

### Bước 1.2: Thêm migration (tìm dòng ~313, sau migration campaignType)

Tìm đoạn:
```typescript
    } catch (error) {
      console.error('❌ Migration error (campaigns.campaignType):', error);
    }
```

Thêm SAU đoạn trên:

```typescript
    // Migration: Add attachments column to templates table if missing
    try {
      const templateColumns = this.db.pragma('table_info(templates)') as Array<{ name: string }>;
      const hasAttachments = templateColumns.some((col) => col.name === 'attachments');

      if (!hasAttachments) {
        console.log('📝 Running migration: Adding attachments column to templates table');
        this.db.exec(`ALTER TABLE templates ADD COLUMN attachments TEXT`);
        console.log('✅ Migration completed: attachments column added');
      }
    } catch (error) {
      console.error('❌ Migration error (templates.attachments):', error);
    }
```

---

## 📝 FILE 2: `desktop-app/worker/api-server.ts`

### Bước 2.1: Thêm imports (đầu file, dòng ~1-6)

Tìm:
```typescript
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { LocalDatabase } from './local-db';
import { ZaloClient } from './zalo-client';
import { SyncService } from './sync-service';
```

Thay bằng:
```typescript
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { LocalDatabase } from './local-db';
import { ZaloClient } from './zalo-client';
import { SyncService } from './sync-service';
```

---

### Bước 2.2: Thêm cấu hình multer (sau `app.use(express.json());`, dòng ~16)

Tìm:
```typescript
app.use(cors());
app.use(express.json());

// Initialize services
```

Thay bằng:
```typescript
app.use(cors());
app.use(express.json());

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

// Initialize services
```

---

### Bước 2.3: Thêm upload endpoint (sau `app.get('/health', ...)`, dòng ~46-54)

Tìm:
```typescript
app.get('/health', (req: Request, res: Response) => {
  const stats = db.getStats();
  res.json({
    status: 'ok',
    syncEnabled: syncService !== null,
    database: stats,
    timestamp: new Date(),
  });
});

// ==================== ZALO LOGIN ====================
```

Thêm GIỮA 2 đoạn trên (sau `app.get('/health')` và trước `// ==================== ZALO LOGIN`):

```typescript
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
```

---

## ✅ SAU KHI HOÀN THÀNH

1. **Save tất cả files**
2. **Restart backend server:**
   ```bash
   cd desktop-app
   npm run dev
   ```

3. **Kiểm tra console log:**
   - Phải thấy: `✅ Migration completed: attachments column added`

4. **Test upload:**
   - Vào Templates Panel
   - Tạo template mới
   - Click "Thêm file/hình ảnh"
   - Upload một file ảnh
   - Check console Network tab xem request thành công

5. **Verify database:**
   ```bash
   sqlite3 desktop-app/data/app.db
   .schema templates
   # Phải thấy column: attachments TEXT
   .quit
   ```

---

## 🐛 TROUBLESHOOTING

**Nếu gặp lỗi TypeScript:**
```bash
# Xóa cache và rebuild
cd desktop-app
rm -rf node_modules/.cache
npm run build
```

**Nếu migration không chạy:**
- Check file `data/app.db` có tồn tại
- Restart lại backend server
- Hoặc chạy SQL thủ công:
  ```bash
  sqlite3 desktop-app/data/app.db
  ALTER TABLE templates ADD COLUMN attachments TEXT;
  .quit
  ```

**Nếu upload lỗi "ENOENT":**
- Thư mục uploads chưa tồn tại:
  ```bash
  mkdir -p desktop-app/data/uploads
  ```
