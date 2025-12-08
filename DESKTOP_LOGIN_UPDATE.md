# Desktop App - Zalo Login Update

## 🎯 Mục tiêu
Cập nhật cách đăng nhập Zalo trong desktop app để hiển thị QR code trực tiếp trong ứng dụng thay vì mở browser riêng, sử dụng zca-js với callback (giống backend service).

---

## ✅ Các thay đổi đã thực hiện

### 1. **worker/zalo-client.ts** - Core Login Logic

#### Thêm interface mới:
```typescript
interface Credentials {
  imei: string;
  cookie: any[];
  userAgent: string;
  language?: string;
}
```

#### Viết lại method `login()`:
- **Kiểm tra credentials cũ** → Tự động restore session nếu còn hợp lệ
- **Sử dụng `ZCA.Zalo.loginQR()`** với callback để track events:
  - Event 0: QR Generated → Đọc file PNG, convert sang base64
  - Event 1: QR Expired → Timeout
  - Event 2: QR Scanned → Đang xác nhận
  - Event 3: QR Declined → Bị từ chối
- **Lưu credentials** (format mới cho `zalo.login()`)
- **Trả về QR code base64** trong response

#### Thêm methods mới:
```typescript
// Load credentials từ file
private async loadCredentials(accountId: number): Promise<Credentials | null>

// Save credentials (format mới)
private async saveCredentials(accountId: number, credentials: Credentials): Promise<void>

// Get login status cho polling
getLoginStatus(accountId: number): {
  success: boolean;
  status: string;
  qrCodeImage?: string;
  message?: string;
  data?: any;
}
```

---

### 2. **worker/api-server.ts** - API Endpoints

#### Cập nhật endpoint `/local/check-login`:
```typescript
app.post('/local/check-login', async (req: Request, res: Response) => {
  // Đổi từ checkLoginStatus() (không tồn tại) → getLoginStatus()
  const result = zaloClient.getLoginStatus(accountId);

  // Update DB khi login thành công
  if (result.success && result.data) {
    db.upsertAccount({ ... });
  }

  res.json(result);
});
```

---

### 3. **renderer/src/components/ZaloLogin.tsx** - UI Component

#### State management:
```typescript
const [qrCode, setQrCode] = useState<string | null>(null);
const [status, setStatus] = useState(''); // NEW: Hiển thị trạng thái
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
```

#### Logic `startLogin()`:
```typescript
// 1. Gọi loginZalo API
const result = await loginZalo(accountId);

// 2. Xử lý kết quả
if (result.success && result.data?.restored) {
  // Session restored → Không cần QR
  setStatus('Đã khôi phục phiên đăng nhập!');
  setTimeout(() => onSuccess(), 1000);
} else if (result.qrCode) {
  // QR code generated → Hiển thị
  setQrCode(result.qrCode);
  setStatus('Vui lòng quét mã QR');
  pollLoginStatus(); // Bắt đầu polling
}
```

#### Logic `pollLoginStatus()`:
```typescript
// Poll mỗi 2 giây (nhanh hơn trước đây là 5 giây)
setInterval(async () => {
  const result = await checkLoginStatus(accountId);

  // Update QR nếu chưa có (race condition)
  if (result.qrCodeImage && !qrCode) {
    setQrCode(result.qrCodeImage);
  }

  // Xử lý theo status
  switch (result.status) {
    case 'success':
      setStatus('Đăng nhập thành công!');
      setTimeout(() => onSuccess(), 1000);
      break;
    case 'scanning':
      setStatus('Đã quét QR, đang xác nhận...');
      break;
    case 'timeout':
      setError('Mã QR đã hết hạn. Vui lòng thử lại.');
      break;
    case 'error':
      setError(result.message || 'Đăng nhập thất bại');
      break;
  }
}, 2000);
```

#### UI Design:
```tsx
<Dialog maxWidth="sm" fullWidth>
  <DialogTitle>Đăng nhập Zalo</DialogTitle>
  <DialogContent>
    {/* Loading state */}
    {loading && !qrCode && (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography>{status}</Typography>
      </Box>
    )}

    {/* Error state */}
    {error && <Alert severity="error">{error}</Alert>}

    {/* QR Code display */}
    {qrCode && (
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body1" fontWeight="bold">
          Quét mã QR bằng ứng dụng Zalo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Mở Zalo → Tab "Cá nhân" → QR → Quét mã
        </Typography>

        {/* QR image with white background */}
        <Box sx={{
          display: 'inline-block',
          padding: 2,
          bgcolor: 'white',
          borderRadius: 2,
          boxShadow: 2
        }}>
          <img src={qrCode} alt="QR Code"
               style={{ maxWidth: '280px' }} />
        </Box>

        {/* Status indicator */}
        {status === 'Đã quét QR, đang xác nhận...' && (
          <Box sx={{ mt: 3 }}>
            <CircularProgress size={20} />
            <Typography color="primary">{status}</Typography>
          </Box>
        )}
      </Box>
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={onClose} disabled={loading}>Hủy</Button>
    {error && <Button onClick={startLogin} variant="contained">Thử lại</Button>}
  </DialogActions>
</Dialog>
```

---

## 🔄 FLOW HOÀN CHỈNH

### Scenario 1: Session đã tồn tại (Auto-restore)
```
User clicks "Add Account"
    ↓
ZaloLogin dialog opens
    ↓
POST /local/login { accountId }
    ↓
Worker: loadCredentials() → Found!
    ↓
Worker: zalo.login(credentials) → Verify with fetchAccountInfo()
    ↓
Response: { success: true, data: { restored: true, ... } }
    ↓
UI: "Đã khôi phục phiên đăng nhập!" → Auto close
```

### Scenario 2: Login mới với QR code
```
User clicks "Add Account"
    ↓
ZaloLogin dialog opens → Loading spinner
    ↓
POST /local/login { accountId }
    ↓
Worker: zalo.loginQR({ qrPath }, callback)
    ↓
Callback Event 0: QR Generated
    ├─ Read PNG file
    ├─ Convert to base64
    └─ Store in loginSessions Map
    ↓
Response: { success: true, qrCode: "data:image/png;base64,..." }
    ↓
UI: Display QR code with instructions
    ↓
UI: Start polling POST /local/check-login every 2 seconds
    ↓
User scans QR on phone
    ↓
Callback Event 2: QR Scanned
    └─ loginSessions status = 'scanning'
    ↓
Poll response: { status: 'scanning', message: '...' }
    ↓
UI: "Đã quét QR, đang xác nhận..." with spinner
    ↓
zca-js completes login
    ├─ fetchAccountInfo()
    ├─ saveCredentials()
    └─ loginSessions status = 'success'
    ↓
Poll response: { status: 'success', data: { ... } }
    ↓
UI: "Đăng nhập thành công!" → Auto close after 1s
    ↓
Dashboard refreshes account list
```

### Scenario 3: QR code expires
```
QR displayed for 2 minutes
    ↓
Callback Event 1: QR Expired
    └─ loginSessions status = 'timeout'
    ↓
Poll response: { status: 'timeout', message: 'QR expired' }
    ↓
UI: Error alert + "Thử lại" button
```

---

## 📊 SO SÁNH TRƯỚC & SAU

| Aspect | Before (Browser) | After (In-App QR) |
|--------|------------------|-------------------|
| **UX** | Mở browser riêng, user phải chuyển qua lại | Tất cả trong 1 dialog, liền mạch |
| **QR Display** | Browser window | Base64 image trong app |
| **Session Restore** | Không tự động | Tự động restore khi mở lại |
| **Status Tracking** | Không có feedback | Real-time status updates |
| **Error Handling** | Generic errors | Chi tiết (expired, declined, etc.) |
| **Performance** | Chậm (launch browser) | Nhanh (pure API) |
| **Reliability** | Phụ thuộc browser | Trực tiếp với Zalo API |

---

## 🧪 CÁCH TEST

### Bước 1: Start desktop app
```bash
cd desktop-app
npm install
npm run dev
```

### Bước 2: Login backend (nếu chưa)
1. Mở app → Nhập backend URL, username, password
2. Click "Đăng nhập"
3. App register làm agent với backend

### Bước 3: Test Zalo login mới
1. Click "Add Account" button
2. Dialog mở → Hiển thị QR code ngay
3. Mở Zalo trên phone → Tab "Cá nhân" → Icon QR → Quét mã
4. UI update "Đã quét QR, đang xác nhận..."
5. Dialog tự đóng sau khi thành công
6. Account xuất hiện trong danh sách

### Bước 4: Test session restore
1. Đóng app
2. Mở lại app
3. Click "Add Account" lần nữa
4. Thay vì QR, hiển thị "Đã khôi phục phiên đăng nhập!"
5. Tự động đóng không cần quét lại

### Bước 5: Test QR expiration
1. Click "Add Account"
2. QR hiển thị nhưng KHÔNG quét
3. Đợi 2-3 phút
4. UI hiển thị "Mã QR đã hết hạn"
5. Click "Thử lại" → QR mới xuất hiện

---

## 🐛 TROUBLESHOOTING

### Lỗi: "Cannot find name 'navigator'" trong TypeScript
- **Nguyên nhân:** page.evaluate() code trong worker context
- **Giải pháp:** Ignore, không ảnh hưởng runtime

### QR code không hiển thị
- **Kiểm tra:** Console logs có "QR code generated and converted to base64"?
- **Nếu không:** Check folder `./data/sessions/` có file PNG?
- **Fix:** Thêm log trong callback Event 0

### Polling không dừng
- **Nguyên nhân:** Interval không được clear
- **Fix:** Đảm bảo `clearInterval(interval)` được gọi trong tất cả cases

### Session restore failed
- **Kiểm tra:** File credentials có đúng format?
  ```json
  {
    "imei": "...",
    "cookie": [...],
    "userAgent": "...",
    "language": "vi"
  }
  ```
- **Fix:** Delete old session files, login lại

---

## 🎨 UI IMPROVEMENTS

### Design Highlights:
1. **QR Box:** White background + shadow để QR nổi bật
2. **Instructions:** Clear step-by-step guide
3. **Status Indicator:** Dynamic với spinner/checkmark
4. **Loading States:** Spinner + text để user biết đang xảy ra gì
5. **Error Handling:** Alert + retry button

### Color Scheme:
- Primary: #0068FF (Zalo blue)
- Success: Green checkmark
- Error: Red alert
- Loading: Blue spinner

---

## 🚀 NEXT STEPS (Optional)

1. **Add countdown timer** cho QR expiration
2. **Auto-refresh QR** khi hết hạn
3. **Multiple account support** trong 1 dialog
4. **Export/Import credentials** để backup
5. **Session analytics** (login time, expiry, etc.)

---

## 📝 NOTES

- **Credentials format:** Đã đổi từ `ZaloSession` (cookies string) sang `Credentials` (cookie array) để tương thích với `zalo.login()`
- **QR path:** Lưu tạm trong `./data/sessions/zalo_{accountId}_qr.png`, xóa sau khi login thành công
- **Polling interval:** 2 giây (balance giữa responsive & server load)
- **Max attempts:** 120 attempts = 4 minutes timeout

---

Đã hoàn thành việc cập nhật desktop app login flow! 🎉
