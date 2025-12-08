# Fix: Heartbeat Spam Logs

## 🐛 Vấn đề

Khi chạy desktop app mà chưa đăng ký agent (hoặc API key không hợp lệ), console bị spam với lỗi heartbeat mỗi 30 giây:

```
💓 Sending heartbeat with API key: 85f88ad0d7...
❌ Heartbeat failed: {
  statusCode: 401,
  timestamp: '2025-11-13T07:25:43.327Z',
  path: '/api/agents/heartbeat',
  message: 'Invalid token or user not found'
}
```

Lặp lại vô hạn → Console bị spam → Khó debug

---

## ✅ Giải pháp

### 1. Smart Log Silence

**File:** [sync-service.ts:11-12,85-118](desktop-app/worker/sync-service.ts#L11-L12)

**Thêm:**
- Counter để đếm số lần heartbeat fail
- Sau 3 lần fail → Im lặng, không log nữa
- Khi recover → Log thông báo

**Code:**
```typescript
export class SyncService {
  private heartbeatFailCount: number = 0;
  private maxHeartbeatFailBeforeSilence: number = 3;

  async sendHeartbeat() {
    try {
      const activeAccounts = this.db.getActiveAccounts();

      // Chỉ log lần đầu hoặc sau khi recover từ lỗi
      if (this.heartbeatFailCount === 0) {
        console.log(`💓 Sending heartbeat...`);
      }

      await this.api.post('/api/agents/heartbeat', {
        zaloAccountIds: activeAccounts,
        status: 'online',
      });

      // Reset fail count khi thành công
      if (this.heartbeatFailCount > 0) {
        console.log(`✅ Heartbeat recovered after ${this.heartbeatFailCount} failures`);
        this.heartbeatFailCount = 0;
      }
    } catch (error: any) {
      this.heartbeatFailCount++;

      // Chỉ log 3 lần đầu, sau đó im lặng
      if (this.heartbeatFailCount <= this.maxHeartbeatFailBeforeSilence) {
        console.error(`❌ Heartbeat failed (${this.heartbeatFailCount}/3):`, error.response?.data);

        if (this.heartbeatFailCount === 3) {
          console.warn('⚠️  Heartbeat sẽ tiếp tục chạy nhưng không log lỗi nữa.');
          console.warn('   Vui lòng kiểm tra:');
          console.warn('   1. Backend server có đang chạy không?');
          console.warn('   2. API Key có hợp lệ không? (Vào Settings để đăng ký agent)');
        }
      }
    }
  }
}
```

---

### 2. Validate Config Before Init

**File:** [api-server.ts:24-42](desktop-app/worker/api-server.ts#L24-L42)

**Thêm validation:**
```typescript
// Initialize sync service if API key is configured
const hasValidApiKey = process.env.AGENT_API_KEY &&
                       process.env.AGENT_API_KEY.trim().length > 0;
const hasValidBackendUrl = process.env.BACKEND_URL &&
                           process.env.BACKEND_URL.trim().length > 0;

if (hasValidApiKey && hasValidBackendUrl) {
  syncService = new SyncService(
    process.env.BACKEND_URL!,
    process.env.AGENT_API_KEY!,
    db
  );
  syncService.startAutoSync();
  syncService.startHeartbeat();
  console.log('✅ Sync service initialized');
} else {
  console.warn('⚠️  Sync service disabled. Để bật:');
  console.warn('   1. Vào Settings → Nhập Backend URL');
  console.warn('   2. Đăng nhập để nhận Agent API Key');
  console.warn('   3. Sync sẽ tự động bật sau khi đăng nhập thành công');
}
```

**Before:** Check `if (process.env.AGENT_API_KEY)` → True ngay cả khi `AGENT_API_KEY=""` (empty string)

**After:** Check `if (apiKey.trim().length > 0)` → False nếu empty

---

## 📊 Behavior

### Scenario 1: Chưa đăng ký agent (API key rỗng)

**Before:**
```
💓 Sending heartbeat with API key: ...
❌ Heartbeat failed: Invalid token
💓 Sending heartbeat with API key: ...
❌ Heartbeat failed: Invalid token
💓 Sending heartbeat with API key: ...
❌ Heartbeat failed: Invalid token
... (lặp lại mãi mãi)
```

**After:**
```
⚠️  Sync service disabled. Để bật:
   1. Vào Settings → Nhập Backend URL
   2. Đăng nhập để nhận Agent API Key
   3. Sync sẽ tự động bật sau khi đăng nhập thành công

(không có heartbeat spam!)
```

---

### Scenario 2: Đã đăng ký nhưng backend chết

**Before:**
```
💓 Sending heartbeat...
❌ Heartbeat failed: ECONNREFUSED
💓 Sending heartbeat...
❌ Heartbeat failed: ECONNREFUSED
💓 Sending heartbeat...
❌ Heartbeat failed: ECONNREFUSED
... (lặp lại mãi mãi)
```

**After:**
```
💓 Sending heartbeat...
❌ Heartbeat failed (1/3): ECONNREFUSED
❌ Heartbeat failed (2/3): ECONNREFUSED
❌ Heartbeat failed (3/3): ECONNREFUSED
⚠️  Heartbeat sẽ tiếp tục chạy nhưng không log lỗi nữa.
   Vui lòng kiểm tra:
   1. Backend server có đang chạy không?
   2. API Key có hợp lệ không?

(im lặng sau đó, nhưng vẫn chạy)
```

---

### Scenario 3: Backend recover sau khi chết

**Timeline:**
```
09:00 - Backend online
        💓 Heartbeat success

09:05 - Backend crash
        ❌ Heartbeat failed (1/3)
        ❌ Heartbeat failed (2/3)
        ❌ Heartbeat failed (3/3)
        ⚠️  (warning message)

09:10 - Silent... (không log)

09:15 - Backend restart
        ✅ Heartbeat recovered after 12 failures
        💓 Heartbeat success
```

---

## 🎯 Lợi ích

### 1. Console sạch hơn
- Không spam logs mỗi 30 giây
- Chỉ log khi cần thiết
- Dễ debug các vấn đề khác

### 2. User-friendly warnings
- Hướng dẫn rõ ràng: Làm gì để fix?
- Warning chỉ xuất hiện 1 lần (không lặp lại)

### 3. Auto-recovery detection
- Log thông báo khi backend hồi phục
- User biết system đã stable trở lại

---

## 🔧 Heartbeat là gì?

### Mục đích

**Heartbeat** = "Nhịp tim" của desktop app gửi về backend server

**Chức năng:**
1. **Thông báo online status:** "Agent này vẫn còn sống"
2. **Report active accounts:** Có bao nhiêu Zalo accounts đang active
3. **Health monitoring:** Backend biết agent nào còn hoạt động, agent nào đã offline

### Cấu trúc

**Request:**
```typescript
POST /api/agents/heartbeat
Headers: { 'X-Agent-Key': '<api-key>' }
Body: {
  zaloAccountIds: [1762960780363, 1762999999999], // Active Zalo accounts
  status: 'online'
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Heartbeat received"
}
```

**Response (Error):**
```json
{
  "statusCode": 401,
  "message": "Invalid token or user not found"
}
```

### Tần suất

- **Heartbeat:** Mỗi 30 giây
- **Sync:** Mỗi 5 phút

### Flow diagram

```
Desktop App (Agent)                Backend Server
     |                                    |
     |  POST /heartbeat (30s)             |
     |  { zaloAccountIds: [...] }         |
     |----------------------------------->|
     |                                    |
     |  ← 200 OK                          |
     |<-----------------------------------|
     |                                    |
     |  (30 seconds later)                |
     |  POST /heartbeat                   |
     |----------------------------------->|
     |                                    |

IF Backend offline:
     |  POST /heartbeat                   |
     |------------X ECONNREFUSED          |
     |                                    |
     |  Log: ❌ Heartbeat failed (1/3)    |
     |  (wait 30s)                        |
     |  POST /heartbeat                   |
     |------------X ECONNREFUSED          |
     |  Log: ❌ Heartbeat failed (2/3)    |
     |  (wait 30s)                        |
     |  POST /heartbeat                   |
     |------------X ECONNREFUSED          |
     |  Log: ❌ Heartbeat failed (3/3)    |
     |  ⚠️  Warning: Backend offline      |
     |                                    |
     |  (Silent from now on...)           |
```

---

## 🧪 Testing

### Test 1: Khởi động app chưa có API key

```bash
# 1. Xóa API key trong .env
echo "AGENT_API_KEY=" > desktop-app/.env

# 2. Restart app
npm run dev

# Expected log:
⚠️  Sync service disabled. Để bật:
   1. Vào Settings → Nhập Backend URL
   2. Đăng nhập để nhận Agent API Key
   3. Sync sẽ tự động bật sau khi đăng nhập thành công

# 3. Verify: KHÔNG có heartbeat spam
```

---

### Test 2: Backend offline

```bash
# 1. Stop backend server
cd backend-nestjs
# Ctrl+C

# 2. Desktop app vẫn chạy
# Expected log trong 90 giây đầu:
❌ Heartbeat failed (1/3): ECONNREFUSED
❌ Heartbeat failed (2/3): ECONNREFUSED
❌ Heartbeat failed (3/3): ECONNREFUSED
⚠️  Heartbeat sẽ tiếp tục chạy nhưng không log lỗi nữa.

# 3. Sau 90 giây: Im lặng, không log nữa

# 4. Start lại backend
npm run start:dev

# 5. Expected log sau 30s:
✅ Heartbeat recovered after 12 failures
💓 Heartbeat sent (2 active accounts)
```

---

### Test 3: Đăng ký agent mới

```bash
# 1. Start app chưa có API key
# 2. Vào Settings → Đăng nhập
# 3. Expected: Sync service start ngay sau khi đăng nhập thành công

# Log:
✅ Agent registered and sync service started
✅ Sync service initialized with backend: http://localhost:8000
💓 Sending heartbeat with API key: abc123...
💓 Heartbeat sent (0 active accounts)
```

---

## 📝 Files Changed

### Modified
- ✅ `desktop-app/worker/sync-service.ts`
  - Added `heartbeatFailCount` counter
  - Smart log silencing after 3 failures
  - Recovery detection

- ✅ `desktop-app/worker/api-server.ts`
  - Validate API key not empty before init sync service
  - Better warning messages

---

## 🚀 Future Improvements

### Priority 1: Exponential backoff
```typescript
// Thay vì heartbeat mỗi 30s, tăng dần khi fail
// Fail 1-3: 30s
// Fail 4-10: 60s
// Fail 10+: 120s
```

### Priority 2: UI indicator
```tsx
// Hiển thị sync status trong Settings panel
<Chip
  label="Sync: Online"
  color="success"
  icon={<CheckCircle />}
/>

// Hoặc khi offline:
<Chip
  label="Sync: Offline"
  color="error"
  icon={<ErrorIcon />}
/>
```

### Priority 3: Retry strategy
```typescript
// Stop heartbeat sau N failures, restart khi user manually trigger sync
if (heartbeatFailCount > 100) {
  stopHeartbeat();
  console.warn('⚠️  Heartbeat stopped after 100 failures. Manual sync required.');
}
```

---

**Date:** 2025-11-13
**Version:** 2.1.1 (Heartbeat Fix)
**Status:** ✅ Ready for Production
