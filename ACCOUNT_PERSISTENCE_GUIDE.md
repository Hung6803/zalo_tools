# Hướng dẫn: Quản lý tài khoản và lưu trữ dữ liệu

## VẤN ĐỀ ĐÃ GIẢI QUYẾT

### Trước đây (Có vấn đề)

```
Lần 1: User đăng nhập Zalo "Nguyễn Văn A"
  → accountId = Date.now() = 1762960780363
  → Gửi 10 tin nhắn, scrape 2 groups
  → Database lưu với accountId = 1762960780363

Logout và login lại:

Lần 2: User đăng nhập lại "Nguyễn Văn A"
  → accountId = Date.now() = 1762999999999 (timestamp mới!)
  → Database tạo record mới với accountId = 1762999999999
  → ❌ MẤT HẾT dữ liệu cũ (10 tin nhắn, 2 groups)
```

**Vấn đề:** Mỗi lần login tạo `accountId` mới từ timestamp, dẫn đến mất dữ liệu khi login lại cùng tài khoản Zalo.

---

### Bây giờ (Đã sửa)

```
Lần 1: User đăng nhập Zalo "Nguyễn Văn A" (zaloId: "123456789")
  → accountId = Date.now() = 1762960780363
  → Gửi 10 tin nhắn, scrape 2 groups
  → Database lưu:
    - zalo_accounts: accountId=1762960780363, zaloId="123456789"
    - messages: 10 records với accountId=1762960780363
    - groups: 2 records với accountId=1762960780363

Logout và login lại:

Lần 2: User đăng nhập lại "Nguyễn Văn A" (zaloId: "123456789")
  → accountId tạm = Date.now() = 1762999999999
  → Sau khi login thành công, hệ thống check database
  → 🔍 Tìm thấy zaloId="123456789" đã tồn tại với accountId=1762960780363
  → 🔄 MERGE: Move credentials từ 1762999999999 → 1762960780363
  → ✅ GIỮ NGUYÊN dữ liệu cũ (10 tin nhắn, 2 groups)
  → Dashboard hiển thị 1 account (không duplicate)
```

**Giải pháp:** Dùng `zaloId` (Zalo User ID) làm unique identifier, tự động merge khi phát hiện cùng zaloId.

---

## CƠ CHẾ HOẠT ĐỘNG

### 1. Database Schema

**Table: zalo_accounts**
```sql
CREATE TABLE zalo_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  accountId INTEGER UNIQUE NOT NULL,     -- Internal ID (timestamp)
  zaloId TEXT,                           -- Zalo User ID (unique per Zalo account)
  displayName TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'inactive',
  lastLoginAt TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Key fields:**
- `accountId`: Internal ID được tạo từ `Date.now()` lần đầu login
- `zaloId`: Zalo User ID, unique cho mỗi tài khoản Zalo (vd: "123456789012345678")

**Index tối ưu:**
```sql
CREATE INDEX idx_zalo_accounts_zaloId ON zalo_accounts(zaloId);
```

---

### 2. Luồng xử lý Login

#### Bước 1: Frontend tạo temporary accountId

**File:** [desktop-app/renderer/src/components/ZaloLogin.tsx:26](desktop-app/renderer/src/components/ZaloLogin.tsx#L26)
```tsx
const [accountId] = useState(Date.now()); // Temporary account ID
```

Tại thời điểm này, chưa biết `zaloId`, nên dùng timestamp tạm.

---

#### Bước 2: User quét QR code và login thành công

**File:** [desktop-app/worker/zalo-client.ts:270-305](desktop-app/worker/zalo-client.ts#L270-L305)

Login thành công → Lấy `zaloId` từ `api.fetchAccountInfo()`:
```typescript
const userInfo = await api.fetchAccountInfo();
// userInfo.profile.userId = "123456789012345678" (zaloId)

this.loginSessions.set(accountId, {
  status: 'success',
  data: {
    displayName: userInfo.profile.displayName,
    zaloId: userInfo.profile.userId,  // ✅ ZaloId được lấy ở đây
    avatar: userInfo.profile.avatar,
  },
});
```

---

#### Bước 3: Frontend poll login status

**File:** [desktop-app/renderer/src/components/ZaloLogin.tsx:85](desktop-app/renderer/src/components/ZaloLogin.tsx#L85)
```tsx
const result = await checkLoginStatus(accountId);
// result = { success: true, status: 'success', data: { zaloId, displayName, ... } }
```

Frontend gọi `POST /local/check-login { accountId }`

---

#### Bước 4: Backend check duplicate và merge

**File:** [desktop-app/worker/api-server.ts:74-134](desktop-app/worker/api-server.ts#L74-L134)

```typescript
app.post('/local/check-login', async (req, res) => {
  const result = zaloClient.getLoginStatus(accountId);

  if (result.success && result.data) {
    const zaloId = result.data.zaloId;

    // 🔍 Check if this zaloId already exists
    const existingAccount = db.findAccountByZaloId(zaloId);

    if (existingAccount && existingAccount.accountId !== accountId) {
      // ✅ Found existing account with same zaloId but different accountId
      // → This is a re-login of existing Zalo account

      console.log(`📌 Merging account ${accountId} → ${existingAccount.accountId}`);

      // 🔄 Merge: Move credentials from new → old accountId
      await zaloClient.mergeAccount(accountId, existingAccount.accountId);

      // 💾 Update database with OLD accountId (keep existing data)
      db.upsertAccount({
        accountId: existingAccount.accountId,
        zaloId: result.data.zaloId,
        displayName: result.data.displayName,
        avatar: result.data.avatar,
        status: 'active',
        lastLoginAt: new Date().toISOString(),
      });

      // ✅ Return with OLD accountId + merged flag
      res.json({
        ...result,
        accountId: existingAccount.accountId,
        merged: true,  // Tell frontend this was merged
      });
    } else {
      // New account or same accountId → Normal flow
      db.upsertAccount({ accountId, zaloId, ... });
      res.json(result);
    }
  }
});
```

**Logic:**
1. Get `zaloId` from login result
2. Query database: `SELECT accountId FROM zalo_accounts WHERE zaloId = ?`
3. **If found with different accountId** → Merge
4. **If not found** → New account
5. **If found with same accountId** → Normal update

---

#### Bước 5: ZaloClient merge account

**File:** [desktop-app/worker/zalo-client.ts:849-894](desktop-app/worker/zalo-client.ts#L849-L894)

```typescript
async mergeAccount(newAccountId: number, existingAccountId: number) {
  console.log(`🔄 Merging ${newAccountId} → ${existingAccountId}`);

  // 1. Move API instance
  const newApi = this.apiInstances.get(newAccountId);
  if (newApi) {
    this.apiInstances.set(existingAccountId, newApi);
    this.apiInstances.delete(newAccountId);
  }

  // 2. Move login session
  const newSession = this.loginSessions.get(newAccountId);
  if (newSession) {
    this.loginSessions.set(existingAccountId, newSession);
    this.loginSessions.delete(newAccountId);
  }

  // 3. Move credentials file
  // ./data/sessions/1762999999999.json → ./data/sessions/1762960780363.json
  await fs.rename(
    this.getSessionFilePath(newAccountId),
    this.getSessionFilePath(existingAccountId)
  );

  // 4. Clean up temporary QR code
  await fs.unlink(`./data/sessions/zalo_${newAccountId}_qr.png`);
}
```

**Actions:**
- Move API instance trong Map từ key mới → key cũ
- Move credentials file
- Clean up temporary files

---

#### Bước 6: Frontend hiển thị thông báo

**File:** [desktop-app/renderer/src/components/ZaloLogin.tsx:105-110](desktop-app/renderer/src/components/ZaloLogin.tsx#L105-L110)

```tsx
if (result.status === 'success') {
  if (result.merged) {
    setStatus(`Đã tìm thấy tài khoản cũ! Đang khôi phục dữ liệu...`);
    console.log(`📌 Account merged: ${accountId} → ${result.accountId}`);
  } else {
    setStatus('Đăng nhập thành công!');
  }

  setTimeout(() => onSuccess(), 1000);
}
```

User thấy thông báo rõ ràng về việc merge.

---

## SCENARIOS VÀ KẾT QUẢ

### Scenario 1: Login lần đầu (New account)

```
User: Nguyễn Văn A (zaloId: "111111111")

1. Frontend: accountId = Date.now() = 1762960780363
2. Login QR → Success
3. Backend check: findAccountByZaloId("111111111") → NOT FOUND
4. Database insert:
   accountId=1762960780363, zaloId="111111111"
5. Result: { success: true, merged: false }
```

**Kết quả:** Account mới được tạo.

---

### Scenario 2: Re-login cùng tài khoản (Merge)

```
User: Nguyễn Văn A (zaloId: "111111111") - ĐÃ ĐĂNG NHẬP TRƯỚC ĐÓ

Dữ liệu cũ trong database:
  - accountId=1762960780363, zaloId="111111111"
  - 10 messages với accountId=1762960780363
  - 2 groups với accountId=1762960780363

1. Frontend: accountId = Date.now() = 1762999999999 (NEW timestamp)
2. Login QR → Success
3. Backend check: findAccountByZaloId("111111111") → FOUND accountId=1762960780363
4. Detect: existingAccountId(1762960780363) ≠ accountId(1762999999999)
5. MERGE:
   - Move API instance: apiInstances[1762999999999] → apiInstances[1762960780363]
   - Move credentials: 1762999999999.json → 1762960780363.json
6. Database update: accountId=1762960780363 (OLD, keep data)
7. Result: { success: true, merged: true, accountId: 1762960780363 }
```

**Kết quả:**
- Dữ liệu cũ được giữ nguyên
- Credentials mới được lưu vào accountId cũ
- Dashboard không duplicate account

---

### Scenario 3: Login nhiều tài khoản khác nhau

```
User A: Nguyễn Văn A (zaloId: "111111111")
  → accountId=1762960780363
  → 10 messages, 2 groups

User B: Trần Thị B (zaloId: "222222222")
  → accountId=1762960999999
  → 5 messages, 1 group

User C: Lê Văn C (zaloId: "333333333")
  → accountId=1762961234567
  → 3 messages, 0 groups

Database:
  zalo_accounts: 3 records
  messages: 18 records (10+5+3) với accountId khác nhau
  groups: 3 records (2+1+0) với accountId khác nhau
```

**Kết quả:** Tất cả accounts độc lập, không conflict.

---

### Scenario 4: Re-login nhiều lần

```
Day 1: Login "Nguyễn Văn A" → accountId=1762960780363
       Gửi 5 tin nhắn

Day 2: Logout → Login lại "Nguyễn Văn A"
       → MERGE vào accountId=1762960780363
       → Thấy 5 tin nhắn cũ ✅
       Gửi thêm 3 tin nhắn → Tổng 8 tin nhắn

Day 3: Logout → Login lại "Nguyễn Văn A"
       → MERGE vào accountId=1762960780363
       → Thấy 8 tin nhắn cũ ✅
       Scrape 1 group

Database final:
  messages: 8 records với accountId=1762960780363
  groups: 1 record với accountId=1762960780363
```

**Kết quả:** Dữ liệu tích lũy theo thời gian, không bị reset.

---

## DATABASE QUERIES

### Tìm account theo zaloId

```sql
SELECT accountId FROM zalo_accounts WHERE zaloId = '111111111';
```

**Usage:** Check xem zaloId đã tồn tại chưa trước khi insert.

---

### Xem tất cả messages của một Zalo account

```sql
-- Get accountId first
SELECT accountId FROM zalo_accounts WHERE zaloId = '111111111';
-- Result: accountId = 1762960780363

-- Get all messages
SELECT * FROM messages WHERE accountId = 1762960780363 ORDER BY sentAt DESC;
```

---

### Xem groups của một Zalo account

```sql
SELECT g.*, COUNT(gm.id) as member_count
FROM groups g
LEFT JOIN group_members gm ON g.accountId = gm.accountId AND g.groupId = gm.groupId
WHERE g.accountId = 1762960780363
GROUP BY g.groupId;
```

---

### Check duplicate accounts

```sql
-- Nếu có duplicate, nghĩa là có bug
SELECT zaloId, COUNT(*) as count
FROM zalo_accounts
WHERE zaloId IS NOT NULL
GROUP BY zaloId
HAVING count > 1;
```

Expected: 0 rows (không có duplicate)

---

## FILE SYSTEM LAYOUT

### Credentials files

```
./data/sessions/
├── 1762960780363.json    ← Account A (Nguyễn Văn A)
├── 1762960999999.json    ← Account B (Trần Thị B)
└── 1762961234567.json    ← Account C (Lê Văn C)
```

**Content của file:**
```json
{
  "imei": "abcd1234-5678-90ef-ghij-klmnopqrstuv",
  "cookie": [
    { "name": "zpw_sek", "value": "...", "domain": ".zalo.me" },
    { "name": "zpsid", "value": "...", "domain": ".zalo.me" }
  ],
  "userAgent": "Mozilla/5.0...",
  "language": "vi"
}
```

---

### Browser profiles

```
./data/browser_profiles/
├── zalo_1762960780363/   ← Browser profile Account A
│   ├── Cookies
│   ├── Local Storage/
│   └── ...
├── zalo_1762960999999/   ← Browser profile Account B
└── zalo_1762961234567/   ← Browser profile Account C
```

**Lưu ý:** Browser profile chứa cookies, localStorage, sessionStorage của Zalo Web.

---

## EDGE CASES VÀ XỬ LÝ

### Edge Case 1: Credentials file bị corrupt

**Tình huống:**
```
User login "Nguyễn Văn A" → accountId=1762960780363
File 1762960780363.json bị corrupt (JSON invalid)
User login lại "Nguyễn Văn A"
```

**Xử lý:**
1. Login tạo accountId mới = 1762999999999
2. Backend check database → Found accountId=1762960780363
3. Merge → Try to move file but old file corrupt
4. New credentials overwrite old file (fix corruption)
5. Account continues working with old accountId

**Code:** [zalo-client.ts:867-883](desktop-app/worker/zalo-client.ts#L867-L883)

---

### Edge Case 2: Database có accountId nhưng không có credentials file

**Tình huống:**
```
Database: accountId=1762960780363, zaloId="111111111"
File system: KHÔNG CÓ ./data/sessions/1762960780363.json
User login lại "Nguyễn Văn A"
```

**Xử lý:**
1. Login tạo accountId mới = 1762999999999
2. Backend check database → Found accountId=1762960780363
3. Merge → Move file 1762999999999.json → 1762960780363.json
4. Account restored với credentials mới

---

### Edge Case 3: Concurrent login cùng Zalo account

**Tình huống:**
```
Tab 1: User đang login "Nguyễn Văn A" (chưa quét QR)
Tab 2: User login lại "Nguyễn Văn A" (quét QR trước)
```

**Xử lý:**
1. Tab 2 quét QR → Merge vào accountId cũ → Success
2. Tab 1 QR expired hoặc user scan → Cũng merge vào accountId cũ
3. Credentials của lần login sau ghi đè lần trước (OK)

**Race condition:** Có thể xảy ra nhưng kết quả cuối cùng vẫn consistent.

---

### Edge Case 4: zaloId NULL (chưa get được thông tin)

**Tình huống:**
```
Login thành công nhưng api.fetchAccountInfo() failed
→ zaloId = null
```

**Xử lý:**
```typescript
if (result.success && result.data && result.data.zaloId) {
  // Only check for duplicate if zaloId available
  const existingAccount = db.findAccountByZaloId(zaloId);
  ...
} else {
  // No zaloId → Treat as new account (no merge)
  db.upsertAccount({ accountId, zaloId: null, ... });
}
```

**Hành vi:** Tạo account mới, không merge (safe default).

---

## TESTING

### Test Case 1: First time login

```bash
# 1. Clear database
rm ./data/app.db

# 2. Start app
npm run dev

# 3. Login with Zalo A
# Expected: accountId created, no merge

# 4. Check database
sqlite3 ./data/app.db "SELECT accountId, zaloId, displayName FROM zalo_accounts;"
# Expected: 1 row
```

---

### Test Case 2: Re-login same account

```bash
# 1. After Test Case 1, note the accountId (e.g. 1762960780363)

# 2. Send some messages
# Database now has messages with accountId=1762960780363

# 3. Logout (delete credentials)
rm ./data/sessions/1762960780363.json

# 4. Login again with same Zalo A
# Expected: "Đã tìm thấy tài khoản cũ! Đang khôi phục dữ liệu..."

# 5. Check database
sqlite3 ./data/app.db "SELECT accountId, zaloId FROM zalo_accounts;"
# Expected: Still 1 row with SAME accountId (not duplicate)

sqlite3 ./data/app.db "SELECT COUNT(*) FROM messages WHERE accountId=1762960780363;"
# Expected: Messages still there
```

---

### Test Case 3: Login different accounts

```bash
# 1. Login Zalo A → accountId=X
# 2. Login Zalo B → accountId=Y (different!)
# 3. Login Zalo C → accountId=Z

# Check database
sqlite3 ./data/app.db "SELECT accountId, zaloId, displayName FROM zalo_accounts;"
# Expected: 3 rows with different accountId and zaloId
```

---

## TROUBLESHOOTING

### Problem: Duplicate accounts sau khi re-login

**Symptoms:**
```
Dashboard hiển thị 2 cards cho cùng một Zalo account:
  - Nguyễn Văn A (accountId: 1762960780363)
  - Nguyễn Văn A (accountId: 1762999999999)
```

**Diagnosis:**
```sql
SELECT accountId, zaloId, displayName FROM zalo_accounts WHERE displayName LIKE '%Nguyễn Văn A%';
```

**Cause:**
- Merge logic không chạy
- `findAccountByZaloId` return null (có thể do zaloId NULL)

**Fix:**
```sql
-- Manually merge trong database
DELETE FROM zalo_accounts WHERE accountId = 1762999999999;
UPDATE messages SET accountId = 1762960780363 WHERE accountId = 1762999999999;
UPDATE groups SET accountId = 1762960780363 WHERE accountId = 1762999999999;
```

---

### Problem: Lost data sau khi re-login

**Symptoms:**
```
Trước khi re-login: 10 messages
Sau khi re-login: 0 messages
```

**Diagnosis:**
```sql
-- Check if messages still in database with old accountId
SELECT accountId, COUNT(*) FROM messages GROUP BY accountId;

-- Check zalo_accounts
SELECT accountId, zaloId FROM zalo_accounts;
```

**Cause:**
- Merge không thành công
- AccountId mới được tạo thay vì merge

**Prevention:**
- Ensure `findAccountByZaloId` has index
- Log merge operations

---

## PERFORMANCE CONSIDERATIONS

### Index trên zaloId

```sql
CREATE INDEX idx_zalo_accounts_zaloId ON zalo_accounts(zaloId);
```

**Impact:** Query `findAccountByZaloId` nhanh hơn (O(log n) thay vì O(n)).

---

### Frequency of merge check

**Current:** Check mỗi khi login thành công (POST /local/check-login)

**Alternative:** Check ngay khi frontend mở dialog (trước khi tạo QR)
- Pros: Biết trước có duplicate hay không
- Cons: Phức tạp hơn vì chưa có zaloId

**Decision:** Giữ current approach (simple và reliable).

---

## KẾT LUẬN

### ✅ Đã giải quyết được

- [x] Re-login cùng tài khoản Zalo không bị mất dữ liệu
- [x] Dashboard không duplicate accounts
- [x] Dữ liệu (messages, groups, contacts) được preserve
- [x] Credentials được update với accountId cũ
- [x] Frontend hiển thị thông báo rõ ràng khi merge

### 🎯 Benefits

1. **User Experience:** User không cần lo lắng về việc mất dữ liệu
2. **Data Integrity:** Dữ liệu tích lũy theo thời gian
3. **Consistency:** Một Zalo account = Một accountId trong database
4. **Performance:** Index trên zaloId đảm bảo query nhanh

### 📝 Maintenance Notes

- Monitor logs cho merge operations
- Add alerting nếu phát hiện duplicate zaloId
- Periodic cleanup cho orphaned credentials files

---

**Last updated:** 2025-11-13
**Version:** 2.0.0 (with account merge)
