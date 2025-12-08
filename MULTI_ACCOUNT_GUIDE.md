# Hướng dẫn quản lý nhiều tài khoản Zalo

## ✅ HỆ THỐNG ĐÃ HỖ TRỢ NHIỀU TÀI KHOẢN

**Câu trả lời ngắn gọn:** Có, hệ thống **đã hỗ trợ** thêm và quản lý nhiều tài khoản Zalo. Tuy nhiên, hiện tại chỉ có thể **đăng nhập tuần tự** (từng tài khoản một), chứ không thể đăng nhập đồng thời nhiều tài khoản cùng lúc.

---

## 🔍 CÁCH HOẠT ĐỘNG HIỆN TẠI

### Luồng thêm tài khoản

```
1. User click "Thêm tài khoản" → ZaloLogin dialog mở
2. Hệ thống tạo accountId duy nhất = Date.now()
3. User quét QR code để đăng nhập
4. Sau khi thành công, tài khoản được lưu vào SQLite:
   - Table: zalo_accounts
   - Fields: accountId, zaloId, displayName, avatar, status, lastLoginAt
5. Dialog đóng, Dashboard tự động refresh
6. Tài khoản mới xuất hiện trong danh sách
```

### Cấu trúc lưu trữ

**Database:** SQLite (local-db.ts)
```sql
CREATE TABLE zalo_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  accountId INTEGER UNIQUE NOT NULL,  -- Unique ID từ Date.now()
  zaloId TEXT,                        -- Zalo user ID
  displayName TEXT,                   -- Tên hiển thị
  avatar TEXT,                        -- Avatar URL
  status TEXT DEFAULT 'inactive',     -- Status: active/inactive
  lastLoginAt TEXT,                   -- Thời gian login gần nhất
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Credentials storage:** JSON files
```
./data/sessions/zalo_{accountId}_credentials.json
```
Mỗi tài khoản có file riêng chứa:
```json
{
  "imei": "...",
  "cookie": [...],
  "userAgent": "...",
  "language": "vi"
}
```

---

## ✅ TÍNH NĂNG ĐÃ CÓ

### 1. Thêm nhiều tài khoản tuần tự
- ✅ Click "Thêm tài khoản" nhiều lần
- ✅ Mỗi lần đăng nhập một tài khoản
- ✅ Tất cả tài khoản được lưu trong database
- ✅ Hiển thị danh sách tất cả tài khoản trong Dashboard

### 2. Hiển thị tất cả tài khoản
**Vị trí:** [Dashboard.tsx:119-156](desktop-app/renderer/src/pages/Dashboard.tsx#L119-L156)
```tsx
<Grid container spacing={2}>
  {accounts.map((account) => (
    <Grid item xs={12} sm={6} md={4} key={account.id}>
      <Paper
        onClick={() => setSelectedAccountId(account.id)}
        sx={{
          border: selectedAccountId === account.id ? 2 : 0,
          borderColor: 'primary.main',
        }}
      >
        <Avatar src={account.avatar}>{account.displayName[0]}</Avatar>
        <Typography>{account.displayName}</Typography>
        <Chip label="Đang hoạt động" color="success" />
      </Paper>
    </Grid>
  ))}
</Grid>
```

### 3. Chọn tài khoản để sử dụng
- ✅ Click vào card tài khoản để chọn
- ✅ Tài khoản được chọn có border màu xanh
- ✅ Các chức năng (gửi tin nhắn, scrape group) sử dụng tài khoản đang chọn

### 4. Session auto-restore
- ✅ Mỗi tài khoản có credentials riêng
- ✅ Khi mở lại app, tài khoản tự động restore session
- ✅ Không cần quét QR lại nếu session còn hợp lệ

### 5. API hỗ trợ multi-account
**Endpoint:** `GET /local/accounts`
**Response:**
```json
[
  {
    "id": 1762960780363,
    "displayName": "Nguyễn Văn A",
    "avatar": "https://...",
    "phoneNumber": "0901234567",
    "userId": "123456789"
  },
  {
    "id": 1762960999999,
    "displayName": "Trần Thị B",
    "avatar": "https://...",
    "phoneNumber": "0907654321",
    "userId": "987654321"
  }
]
```

---

## ❌ GIỚI HẠN HIỆN TẠI

### 1. Không thể đăng nhập đồng thời (Parallel Login)

**Tình huống:**
```
User mở 2 dialog ZaloLogin cùng lúc → KHÔNG THỂ
```

**Lý do kỹ thuật:**

1. **UI chỉ có 1 dialog duy nhất**
   - File: [Dashboard.tsx:322-326](desktop-app/renderer/src/pages/Dashboard.tsx#L322-L326)
   ```tsx
   const [showLoginDialog, setShowLoginDialog] = useState(false);

   <ZaloLogin
     open={showLoginDialog}
     onClose={() => setShowLoginDialog(false)}
     onSuccess={handleLoginSuccess}
   />
   ```
   - State `showLoginDialog` là boolean → chỉ 1 dialog tại 1 thời điểm

2. **ZaloLogin component sử dụng accountId cố định**
   - File: [ZaloLogin.tsx:26](desktop-app/renderer/src/components/ZaloLogin.tsx#L26)
   ```tsx
   const [accountId] = useState(Date.now());
   ```
   - Mỗi component instance tạo 1 accountId khi mount
   - Nếu mở 2 dialog cùng lúc, accountId sẽ khác nhau

3. **Backend loginSessions Map hỗ trợ concurrent sessions**
   - File: [zalo-client.ts](desktop-app/worker/zalo-client.ts)
   ```typescript
   private loginSessions = new Map<number, any>();
   ```
   - Map này **đã hỗ trợ** nhiều sessions đồng thời
   - Key là accountId → mỗi tài khoản có session riêng
   - **Backend không có vấn đề gì!**

**Kết luận:** Giới hạn chỉ ở **UI layer**, backend đã sẵn sàng!

### 2. Không có UI để quản lý nhiều session đang login

Hiện tại:
```
User A đang quét QR → User B bấm "Thêm tài khoản" → Dialog User A bị đóng
```

Lý tưởng:
```
User A đang quét QR → User B bấm "Thêm tài khoản" → Mở dialog thứ 2 bên cạnh
```

---

## 🚀 CÁCH DÙNG HIỆN TẠI (Tuần tự)

### Bước 1: Thêm tài khoản đầu tiên
1. Mở Dashboard
2. Click "Thêm tài khoản"
3. Quét QR code
4. Đợi đăng nhập thành công
5. Dialog tự đóng

### Bước 2: Thêm tài khoản thứ hai
1. Click "Thêm tài khoản" lần nữa
2. Quét QR code (tài khoản Zalo khác)
3. Đợi đăng nhập thành công
4. Dialog tự đóng

### Bước 3: Sử dụng nhiều tài khoản
1. Xem danh sách tất cả tài khoản trong tab "Tài khoản"
2. Click vào tài khoản muốn dùng
3. Chuyển sang tab "Gửi tin nhắn" hoặc "Lấy thành viên nhóm"
4. Hệ thống tự động dùng tài khoản đang chọn

### Ví dụ thực tế:
```
9:00 AM - Thêm tài khoản "Marketing Team" → Thành công
9:05 AM - Thêm tài khoản "Sales Team" → Thành công
9:10 AM - Thêm tài khoản "Support Team" → Thành công

Dashboard hiển thị 3 tài khoản:
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ 👤 Marketing Team   │  │ 👤 Sales Team       │  │ 👤 Support Team     │
│ 0901234567          │  │ 0907654321          │  │ 0909876543          │
│ ✅ Đang hoạt động   │  │ ✅ Đang hoạt động   │  │ ✅ Đang hoạt động   │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘

Click vào "Sales Team" → Gửi tin nhắn → Tin nhắn gửi từ Sales Team account
```

---

## 💡 GIẢI PHÁP NÂng CAO (Nếu muốn parallel login)

### Option 1: Mở nhiều dialog cùng lúc

**Thay đổi cần thiết:**

1. **Dashboard.tsx** - Đổi state từ boolean sang array
```tsx
// Before:
const [showLoginDialog, setShowLoginDialog] = useState(false);

// After:
const [loginDialogs, setLoginDialogs] = useState<number[]>([]);

// Add new dialog:
const addLoginDialog = () => {
  const accountId = Date.now();
  setLoginDialogs([...loginDialogs, accountId]);
};

// Remove dialog:
const removeLoginDialog = (accountId: number) => {
  setLoginDialogs(loginDialogs.filter(id => id !== accountId));
};

// Render multiple dialogs:
{loginDialogs.map((accountId) => (
  <ZaloLogin
    key={accountId}
    accountId={accountId}
    open={true}
    onClose={() => removeLoginDialog(accountId)}
    onSuccess={() => {
      removeLoginDialog(accountId);
      loadAccounts();
    }}
  />
))}
```

2. **ZaloLogin.tsx** - Nhận accountId từ props
```tsx
interface ZaloLoginProps {
  accountId: number; // NEW: Pass from parent
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ZaloLogin: React.FC<ZaloLoginProps> = ({ accountId, open, onClose, onSuccess }) => {
  // Remove: const [accountId] = useState(Date.now());
  // Use accountId from props instead
};
```

3. **UI Enhancement** - Stack dialogs hoặc grid layout
```tsx
// Option A: Stack with offset
<Dialog
  open={open}
  sx={{
    '& .MuiDialog-container': {
      '& .MuiPaper-root': {
        position: 'absolute',
        left: `${index * 50}px`,
        top: `${index * 50}px`,
      }
    }
  }}
>

// Option B: Split screen
<Grid container spacing={2}>
  {loginDialogs.map((accountId, index) => (
    <Grid item xs={6} key={accountId}>
      <Paper>
        <ZaloLogin accountId={accountId} ... />
      </Paper>
    </Grid>
  ))}
</Grid>
```

### Option 2: Queue system (Tuần tự tự động)

```tsx
// Add accounts to queue
const [loginQueue, setLoginQueue] = useState<number[]>([]);
const [currentLogin, setCurrentLogin] = useState<number | null>(null);

const addToQueue = () => {
  const accountId = Date.now();
  setLoginQueue([...loginQueue, accountId]);
};

useEffect(() => {
  if (!currentLogin && loginQueue.length > 0) {
    const [next, ...rest] = loginQueue;
    setCurrentLogin(next);
    setLoginQueue(rest);
  }
}, [currentLogin, loginQueue]);

const handleSuccess = () => {
  setCurrentLogin(null); // Process next in queue
  loadAccounts();
};
```

---

## 📊 SO SÁNH CÁC PHƯƠNG ÁN

| Tiêu chí | Hiện tại (Tuần tự) | Option 1 (Parallel) | Option 2 (Queue) |
|----------|-------------------|---------------------|------------------|
| **Số tài khoản cùng lúc** | 1 | Không giới hạn | 1 (tự động) |
| **Trải nghiệm UX** | Đơn giản, dễ hiểu | Phức tạp, cần quản lý nhiều window | Tự động, không cần can thiệp |
| **Thay đổi code** | Không cần | Nhiều (UI + logic) | Trung bình (queue system) |
| **Performance** | Tốt | Có thể chậm nếu quá nhiều dialog | Tốt |
| **Use case phù hợp** | Thêm 2-3 tài khoản | Onboarding nhiều account (10+) | Background batch import |

---

## 🎯 KHUYẾN NGHỊ

### Cho mục đích sử dụng thông thường (2-5 tài khoản):
👉 **Giữ nguyên cách hiện tại** - Thêm tuần tự từng tài khoản

**Lý do:**
- Đơn giản, không phức tạp
- Thêm 5 tài khoản chỉ mất ~5-10 phút
- Không cần thay đổi code
- UX rõ ràng, không gây nhầm lẫn

### Cho mục đích onboarding số lượng lớn (10+ tài khoản):
👉 **Implement Option 2 (Queue system)**

**Lý do:**
- User chỉ cần click "Thêm tài khoản" nhiều lần
- Hệ thống tự động xử lý tuần tự
- Không cần quản lý nhiều dialog
- Code đơn giản hơn Option 1

### Cho mục đích demo/enterprise (cần parallel):
👉 **Implement Option 1 (Parallel dialogs)**

**Lý do:**
- Trông "pro" hơn
- Tiết kiệm thời gian (quét nhiều QR cùng lúc)
- Phù hợp với use case setup nhiều agent

---

## 🧪 TEST MULTI-ACCOUNT

### Test case 1: Thêm 3 tài khoản
```bash
# Bước 1: Start app
cd desktop-app
npm run dev

# Bước 2: Thêm account 1
1. Click "Thêm tài khoản"
2. Quét QR bằng Zalo account 1
3. Đợi thành công, dialog đóng

# Bước 3: Thêm account 2
1. Click "Thêm tài khoản" lần 2
2. Quét QR bằng Zalo account 2 (khác account 1!)
3. Đợi thành công, dialog đóng

# Bước 4: Thêm account 3
1. Click "Thêm tài khoản" lần 3
2. Quét QR bằng Zalo account 3
3. Đợi thành công, dialog đóng

# Bước 5: Verify
- Dashboard hiển thị 3 cards
- Click vào từng card → border xanh xuất hiện
- Check database: sqlite3 ./data/app.db "SELECT * FROM zalo_accounts;"
```

### Test case 2: Switch giữa các account
```bash
# Bước 1: Click vào account 1
→ Border xanh xuất hiện

# Bước 2: Chuyển sang tab "Gửi tin nhắn"
→ Gửi tin nhắn từ account 1

# Bước 3: Quay lại tab "Tài khoản"
→ Click vào account 2

# Bước 4: Chuyển sang tab "Gửi tin nhắn"
→ Gửi tin nhắn từ account 2

# Verify: Check messages table
sqlite3 ./data/app.db "SELECT accountId, message FROM messages ORDER BY sentAt DESC LIMIT 10;"
→ Phải thấy messages từ cả 2 accountId khác nhau
```

### Test case 3: Session restore
```bash
# Bước 1: Thêm 3 tài khoản và đăng nhập thành công
# Bước 2: Đóng app (Ctrl+C)
# Bước 3: Mở lại app (npm run dev)
# Bước 4: Check credentials files
ls ./data/sessions/

# Expected output:
zalo_1762960780363_credentials.json
zalo_1762960999999_credentials.json
zalo_1762961234567_credentials.json

# Bước 5: Click "Thêm tài khoản" với cùng accountId
→ Nếu credentials hợp lệ, hiển thị "Đã khôi phục phiên đăng nhập!"
→ Không cần quét QR lại
```

---

## 📝 KẾT LUẬN

**Câu hỏi:** "Hiện tại không thể thêm được nhiều tài khoản một lúc sao?"

**Trả lời:**
1. ✅ **Có thể thêm nhiều tài khoản** - chỉ cần thêm tuần tự (từng cái một)
2. ❌ **Không thể đăng nhập đồng thời** nhiều tài khoản cùng lúc (parallel login)
3. 💡 **Backend đã sẵn sàng** cho parallel login, chỉ cần update UI
4. 🎯 **Khuyến nghị:** Giữ nguyên cách hiện tại cho 90% use case

**Hướng dẫn sử dụng:**
- Thêm tài khoản 1 → Đợi thành công → Thêm tài khoản 2 → Đợi thành công → ...
- Tất cả tài khoản được lưu và hiển thị trong Dashboard
- Click vào tài khoản để chọn, sau đó dùng các chức năng như bình thường

**Nếu cần parallel login:** Tham khảo Option 1 hoặc 2 ở trên và implement theo nhu cầu.
