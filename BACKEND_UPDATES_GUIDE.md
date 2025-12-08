# Hướng dẫn cập nhật Backend cho tính năng Upload File

## Bước 1: Cập nhật TemplateRecord Interface

**File:** `desktop-app/worker/local-db.ts` (dòng ~57)

Thêm trường `attachments` vào interface:

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
  attachments?: string; // ← THÊM DÒNG NÀY (JSON array of file paths)
  createdAt?: string;
  updatedAt?: string;
}
```

---

## Bước 2: Thêm Migration cho trường attachments

**File:** `desktop-app/worker/local-db.ts` (sau dòng ~313, sau migration campaignType)

Tìm đoạn code:
```typescript
    } catch (error) {
      console.error('❌ Migration error (campaigns.campaignType):', error);
    }
```

Thêm migration mới **SAU** đoạn trên:

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

## Bước 3: Thêm Upload Endpoint

**File:** `desktop-app/worker/api-server.ts`

### 3.1. Thêm imports (đầu file, sau các import hiện tại):

```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';
```

### 3.2. Thêm cấu hình multer (sau dòng `app.use(express.json());`):

```typescript
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
```

### 3.3. Thêm upload route (đặt sau `app.get('/health', ...)` và trước các route khác):

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

## Bước 4: Cập nhật Template API để hỗ trợ attachments

**File:** `desktop-app/worker/api-server.ts`

Tìm endpoint `POST /local/templates` (thường ở dòng ~800-900)

Thêm trường `attachments` vào payload khi tạo/cập nhật template:

### Trong hàm CREATE template:
Tìm đoạn:
```typescript
const result = db.createTemplate({
  name: req.body.name,
  content: req.body.content,
  variables: JSON.stringify(req.body.variables || []),
  category: req.body.category,
  description: req.body.description,
  isActive: req.body.isActive !== undefined ? req.body.isActive : 1,
  usageCount: 0,
});
```

Thêm trường attachments:
```typescript
const result = db.createTemplate({
  name: req.body.name,
  content: req.body.content,
  variables: JSON.stringify(req.body.variables || []),
  category: req.body.category,
  description: req.body.description,
  isActive: req.body.isActive !== undefined ? req.body.isActive : 1,
  usageCount: 0,
  attachments: req.body.attachments, // ← THÊM DÒNG NÀY
});
```

### Trong hàm UPDATE template:
Tìm đoạn update và thêm tương tự:
```typescript
db.updateTemplate(id, {
  name: req.body.name,
  content: req.body.content,
  variables: JSON.stringify(req.body.variables || []),
  category: req.body.category,
  description: req.body.description,
  isActive: req.body.isActive,
  attachments: req.body.attachments, // ← THÊM DÒNG NÀY
});
```

---

## Bước 5: Kiểm tra

1. **Restart backend server:**
   ```bash
   # Nếu đang chạy, stop và start lại
   npm run dev
   ```

2. **Kiểm tra migration đã chạy:**
   - Xem console log, phải có: `✅ Migration completed: attachments column added`

3. **Test upload:**
   - Vào Templates Panel
   - Tạo template mới
   - Click "Thêm file/hình ảnh"
   - Upload một file
   - Lưu template
   - Check console network tab để xem request/response

4. **Verify database:**
   ```bash
   sqlite3 desktop-app/data/app.db
   .schema templates
   # Phải thấy column 'attachments TEXT'
   ```

---

## Lưu ý:

- ✅ Thư mục `data/uploads/` đã được tạo
- ✅ Package `multer` đã được cài
- ⚠️ Giới hạn file: 10MB
- ⚠️ Chỉ chấp nhận: images (jpg, png, gif, webp) và documents (pdf, doc, docx, xls, xlsx)
- 📁 Files được lưu tại: `desktop-app/data/uploads/`
- 🔗 URL truy cập: `http://localhost:3001/uploads/filename`

---

## Troubleshooting:

**Lỗi "File upload failed":**
- Kiểm tra thư mục `data/uploads/` có tồn tại không
- Kiểm tra quyền ghi file

**Lỗi "Chỉ chấp nhận file hình ảnh hoặc tài liệu":**
- File extension không đúng
- MIME type không được hỗ trợ

**Migration không chạy:**
- Restart lại backend server
- Xóa file `app.db` và chạy lại (⚠️ cẩn thận, sẽ mất data)
