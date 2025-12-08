# Báo cáo phân tích Multi-Account Support

## TÓM TẮT

**Kết luận:** Hệ thống **ĐÃ HỖ TRỢ HOÀN TOÀN** multi-account trên desktop-app! Không cần sửa gì cả.

---

## KIỂM TRA CHI TIẾT

### ✅ Backend API Server (api-server.ts)

Tất cả endpoints **đã hỗ trợ** accountId:

| Endpoint | Method | Params | Status |
|----------|--------|--------|--------|
| `/local/login` | POST | `accountId` | ✅ Có accountId |
| `/local/check-login` | POST | `accountId` | ✅ Có accountId |
| `/local/send-message` | POST | `accountId, userId, message` | ✅ Có accountId |
| `/local/send-friend-request` | POST | `accountId, userId, message` | ✅ Có accountId |
| `/local/find-user` | POST | `accountId, phoneNumber` | ✅ Có accountId |
| `/local/scrape-group` | POST | `accountId, groupLink, maxMembers` | ✅ Có accountId |
| `/local/account-info/:accountId` | GET | `accountId` (param) | ✅ Có accountId |
| `/local/messages/:accountId` | GET | `accountId` (param) | ✅ Có accountId |
| `/local/contacts/:accountId` | GET | `accountId` (param) | ✅ Có accountId |
| `/local/group-members/:accountId/:groupId` | GET | `accountId` (param) | ✅ Có accountId |
| `/local/accounts` | GET | - | ✅ Trả về tất cả accounts |

**Đánh giá:** Backend API đã được thiết kế hoàn toàn cho multi-account từ đầu.

---

### ✅ Worker - ZaloClient (zalo-client.ts)

**Quản lý instance:**
```typescript
private apiInstances: Map<number, any> = new Map();
private loginSessions: Map<number, any> = new Map();
```
- Mỗi accountId có một API instance riêng
- Login sessions được quản lý theo accountId
- Credentials files: `./data/sessions/{accountId}.json`
- Browser profiles: `./data/browser_profiles/zalo_{accountId}`

**Các method chính:**

| Method | Signature | Multi-account |
|--------|-----------|---------------|
| `login(accountId)` | ✅ Nhận accountId | ✅ Hỗ trợ |
| `getAPI(accountId)` | ✅ Nhận accountId | ✅ Map-based |
| `sendMessage(accountId, userId, message)` | ✅ Nhận accountId | ✅ Hỗ trợ |
| `sendFriendRequest(accountId, userId, message)` | ✅ Nhận accountId | ✅ Hỗ trợ |
| `scrapeGroup(accountId, groupLink)` | ✅ Nhận accountId | ✅ Hỗ trợ |
| `getAccountInfo(accountId)` | ✅ Nhận accountId | ✅ Hỗ trợ |
| `logout(accountId)` | ✅ Nhận accountId | ✅ Hỗ trợ |

**Đánh giá:** Worker layer đã hoàn toàn hỗ trợ multi-account với kiến trúc Map-based.

---

### ✅ Database (local-db.ts)

**Cấu trúc table zalo_accounts:**
```sql
CREATE TABLE zalo_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  accountId INTEGER UNIQUE NOT NULL,  -- ✅ Unique key
  zaloId TEXT,
  displayName TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'inactive',
  lastLoginAt TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Các table khác:**
- `messages` - có field `accountId` ✅
- `contacts` - có field `accountId` + UNIQUE(accountId, userId) ✅
- `groups` - có field `accountId` + UNIQUE(accountId, groupId) ✅
- `group_members` - có field `accountId` + UNIQUE(accountId, groupId, userId) ✅

**Các method:**

| Method | Multi-account Support |
|--------|----------------------|
| `insertMessage(msg)` | ✅ Có accountId field |
| `getMessages(accountId, limit)` | ✅ Filter by accountId |
| `getContacts(accountId)` | ✅ Filter by accountId |
| `getGroupMembers(accountId, groupId)` | ✅ Filter by accountId |
| `upsertAccount(account)` | ✅ Có accountId |
| `getAllAccounts()` | ✅ Trả về tất cả |
| `getActiveAccounts()` | ✅ Trả về active accounts |

**Đánh giá:** Database schema được thiết kế hoàn hảo cho multi-account.

---

### ✅ Frontend API Client (localApi.ts)

Tất cả API functions **đã truyền accountId đúng:**

```typescript
// ✅ Login
export const loginZalo = async (accountId: number): Promise<LoginResult>
export const checkLoginStatus = async (accountId: number): Promise<LoginResult>

// ✅ Messaging
export const sendMessage = async (
  accountId: number,  // ✅
  userId: string,
  message: string,
): Promise<SendMessageResult>

export const sendFriendRequest = async (
  accountId: number,  // ✅
  userId: string,
  message: string,
): Promise<SendMessageResult>

// ✅ Scraping
export const scrapeGroup = async (
  accountId: number,  // ✅
  groupLink: string,
): Promise<ScrapeResult>

// ✅ Account Management
export const getZaloAccounts = async (): Promise<ZaloAccount[]>
```

**Đánh giá:** Frontend API client đã được implement đúng với multi-account.

---

### ✅ UI Components

#### Dashboard.tsx

**Account Selection:**
```typescript
const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

// Hiển thị tất cả accounts
{accounts.map((account) => (
  <Grid item xs={12} sm={6} md={4} key={account.id}>
    <Paper onClick={() => setSelectedAccountId(account.id)}>
      {/* Account card */}
    </Paper>
  </Grid>
))}
```

**Panel Routing:**
```typescript
case 'send-message':
  return selectedAccountId ? (
    <SendMessagePanel accountId={selectedAccountId} />  // ✅ Truyền accountId
  ) : (
    <Typography>Vui lòng chọn tài khoản Zalo</Typography>
  );

case 'scrape-group':
  return selectedAccountId ? (
    <ScrapeGroupPanel accountId={selectedAccountId} />  // ✅ Truyền accountId
  ) : (
    <Typography>Vui lòng chọn tài khoản Zalo</Typography>
  );

case 'contacts':
  return selectedAccountId ? (
    <ContactsPanel accountId={selectedAccountId} />  // ✅ Truyền accountId
  ) : (
    <Typography>Vui lòng chọn tài khoản Zalo</Typography>
  );
```

**Đánh giá:** Dashboard đã implement hoàn chỉnh account selection và truyền accountId vào panels.

---

#### SendMessagePanel.tsx

```typescript
interface SendMessagePanelProps {
  accountId: number;  // ✅ Nhận accountId từ props
}

const SendMessagePanel: React.FC<SendMessagePanelProps> = ({ accountId }) => {
  const handleSend = async () => {
    if (sendFriendReq) {
      result = await sendFriendRequest(accountId, userId, message);  // ✅ Dùng accountId
    } else {
      result = await sendMessage(accountId, userId, message);  // ✅ Dùng accountId
    }
  };
}
```

**Đánh giá:** ✅ Hoàn toàn hỗ trợ multi-account

---

#### ScrapeGroupPanel.tsx

```typescript
interface ScrapeGroupPanelProps {
  accountId: number;  // ✅ Nhận accountId từ props
}

const ScrapeGroupPanel: React.FC<ScrapeGroupPanelProps> = ({ accountId }) => {
  const handleScrape = async () => {
    const result = await scrapeGroup(accountId, groupLink);  // ✅ Dùng accountId
  };
}
```

**Đánh giá:** ✅ Hoàn toàn hỗ trợ multi-account

---

#### ContactsPanel.tsx

```typescript
interface ContactsPanelProps {
  accountId: number;  // ✅ Nhận accountId từ props
}

const ContactsPanel: React.FC<ContactsPanelProps> = ({ accountId }) => {
  // Hiện tại chưa implement full, nhưng đã nhận accountId
}
```

**Đánh giá:** ✅ Đã sẵn sàng cho multi-account (chờ implement features)

---

#### SettingsPanel.tsx

```typescript
const SettingsPanel: React.FC = () => {
  // Không cần accountId vì quản lý cấu hình chung
}
```

**Đánh giá:** ✅ Không cần accountId (settings toàn cục)

---

## LUỒNG HOẠT ĐỘNG MULTI-ACCOUNT

### 1. Thêm tài khoản mới

```
User click "Thêm tài khoản"
  ↓
ZaloLogin dialog mở
  ↓
accountId = Date.now()  (unique timestamp)
  ↓
POST /local/login { accountId }
  ↓
Worker: zaloClient.login(accountId)
  ↓
QR code được generate và lưu: ./data/sessions/zalo_{accountId}_qr.png
  ↓
User quét QR code trên Zalo app
  ↓
Credentials lưu vào: ./data/sessions/{accountId}.json
  ↓
API instance lưu vào: apiInstances.Map[accountId]
  ↓
Account info lưu vào SQLite: zalo_accounts table
  ↓
Dashboard refresh → account mới hiển thị
```

### 2. Chọn tài khoản và gửi tin nhắn

```
Dashboard load tất cả accounts từ DB
  ↓
User click vào account card → setSelectedAccountId(accountId)
  ↓
User chuyển sang tab "Gửi tin nhắn"
  ↓
SendMessagePanel nhận props: { accountId: selectedAccountId }
  ↓
User nhập userId và message, click "Gửi"
  ↓
sendMessage(accountId, userId, message)
  ↓
POST /local/send-message { accountId, userId, message }
  ↓
Worker: zaloClient.sendMessage(accountId, userId, message)
  ↓
Worker lấy API instance: apiInstances.get(accountId)
  ↓
Gửi message qua Zalo API
  ↓
Lưu message vào SQLite với accountId
  ↓
Sync lên backend (nếu có cấu hình)
```

### 3. Scrape group với account cụ thể

```
User chọn account A → selectedAccountId = A
  ↓
User chuyển sang tab "Lấy thành viên nhóm"
  ↓
ScrapeGroupPanel nhận props: { accountId: A }
  ↓
User nhập groupLink, click "Lấy danh sách"
  ↓
scrapeGroup(accountId=A, groupLink)
  ↓
POST /local/scrape-group { accountId: A, groupLink }
  ↓
Worker: zaloClient.scrapeGroup(A, groupLink)
  ↓
Mở browser với profile: ./data/browser_profiles/zalo_A
  ↓
Scrape members từ group
  ↓
Lưu vào SQLite:
  - groups table với accountId=A
  - group_members table với accountId=A
  - contacts table với accountId=A
  ↓
Return members list → UI hiển thị
```

### 4. Switch giữa các accounts

```
User đang dùng account A
  ↓
User quay lại tab "Tài khoản"
  ↓
User click vào account B card
  ↓
setSelectedAccountId(B)
  ↓
User chuyển sang tab "Gửi tin nhắn"
  ↓
SendMessagePanel re-render với accountId=B
  ↓
Tất cả actions giờ sử dụng account B
```

---

## KẾT LUẬN VÀ KHUYẾN NGHỊ

### ✅ Đã hoàn thành

Toàn bộ hệ thống desktop-app **ĐÃ HỖ TRỢ HOÀN TOÀN multi-account**:

1. ✅ Backend API có accountId parameter
2. ✅ Worker ZaloClient quản lý nhiều API instances bằng Map
3. ✅ Database có accountId field trong tất cả tables
4. ✅ Frontend API client truyền accountId đúng
5. ✅ UI Components nhận và sử dụng accountId từ props
6. ✅ Dashboard quản lý account selection
7. ✅ Credentials và sessions được tách biệt theo accountId
8. ✅ Browser profiles riêng cho mỗi account

### ⚠️ Lưu ý

**Không cần sửa gì cả!** Hệ thống đã được thiết kế tốt từ đầu.

Chỉ cần **sử dụng đúng cách:**

1. **Thêm nhiều tài khoản:**
   - Click "Thêm tài khoản" nhiều lần
   - Mỗi lần quét QR code của một tài khoản Zalo khác nhau
   - Tất cả tài khoản sẽ xuất hiện trong Dashboard

2. **Chọn tài khoản để sử dụng:**
   - Vào tab "Tài khoản"
   - Click vào card của tài khoản muốn dùng (border xanh xuất hiện)
   - Chuyển sang tab chức năng (Gửi tin nhắn, Scrape group, v.v.)
   - Tất cả hành động sẽ sử dụng tài khoản đã chọn

3. **Switch giữa các tài khoản:**
   - Quay lại tab "Tài khoản"
   - Click vào tài khoản khác
   - Chuyển lại tab chức năng → tài khoản mới được sử dụng

### 📊 Test Scenarios

Để verify multi-account hoạt động đúng, test các scenarios sau:

#### Scenario 1: Thêm 3 tài khoản
```
1. Click "Thêm tài khoản" → Quét QR bằng Zalo A → Thành công
2. Click "Thêm tài khoản" → Quét QR bằng Zalo B → Thành công
3. Click "Thêm tài khoản" → Quét QR bằng Zalo C → Thành công
4. Verify: Dashboard hiển thị 3 cards với tên/avatar khác nhau
5. Verify: Database có 3 records trong zalo_accounts
6. Verify: Folder ./data/sessions có 3 files JSON
```

#### Scenario 2: Gửi tin nhắn từ account khác nhau
```
1. Chọn account A (click vào card A)
2. Chuyển sang "Gửi tin nhắn"
3. Gửi tin nhắn cho userId X với nội dung "Hello from A"
4. Quay lại "Tài khoản", chọn account B
5. Chuyển sang "Gửi tin nhắn"
6. Gửi tin nhắn cho userId X với nội dung "Hello from B"
7. Verify: Database messages table có 2 records với accountId khác nhau
8. Verify: User X nhận được 2 tin nhắn từ 2 tài khoản khác nhau
```

#### Scenario 3: Scrape group với account khác nhau
```
1. Chọn account A
2. Scrape group G1 → Lưu 50 members
3. Chọn account B
4. Scrape group G2 → Lưu 30 members
5. Verify: Database groups table có 2 records:
   - accountId=A, groupId=G1, memberCount=50
   - accountId=B, groupId=G2, memberCount=30
6. Verify: group_members table có 80 records với accountId khác nhau
```

#### Scenario 4: Session restore sau khi restart
```
1. Có 3 tài khoản đã login (A, B, C)
2. Đóng app (Ctrl+C)
3. Mở lại app (npm run dev)
4. Dashboard hiển thị 3 accounts
5. Click "Thêm tài khoản" với cùng accountId đã tồn tại
6. Verify: Hiển thị "Đã khôi phục phiên đăng nhập!" (không cần quét QR)
```

### 🎯 Cải thiện trong tương lai (tùy chọn)

Mặc dù đã hoàn chỉnh, có thể thêm các tính năng này:

1. **Batch operations:**
   - Gửi tin nhắn từ nhiều accounts cùng lúc
   - Scrape group bằng nhiều accounts song song

2. **Account labeling:**
   - Thêm field `label` để user đặt tên account (vd: "Marketing", "Sales")
   - Thêm field `color` để phân biệt màu sắc

3. **Account status monitoring:**
   - Hiển thị online/offline status
   - Cảnh báo nếu session expired

4. **Bulk import:**
   - Import nhiều accounts từ file JSON
   - QR code grid để login nhiều accounts

5. **Contact management per account:**
   - ContactsPanel hiển thị contacts của account đang chọn
   - Filter và search contacts theo account

---

## KIẾN TRÚC TỔNG QUAN

```
┌─────────────────────────────────────────────────────────────────┐
│                         DESKTOP APP                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      RENDERER (React)                       │ │
│  │                                                             │ │
│  │  Dashboard.tsx                                              │ │
│  │    - accounts: ZaloAccount[]                                │ │
│  │    - selectedAccountId: number                              │ │
│  │                                                             │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │ │
│  │  │ Account A    │ │ Account B    │ │ Account C    │       │ │
│  │  │ [Selected]   │ │              │ │              │       │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘       │ │
│  │                                                             │ │
│  │  Panels (receive accountId prop):                          │ │
│  │    - SendMessagePanel(accountId: A)                        │ │
│  │    - ScrapeGroupPanel(accountId: A)                        │ │
│  │    - ContactsPanel(accountId: A)                           │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             ↕ HTTP                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   WORKER (Express API)                      │ │
│  │                                                             │ │
│  │  api-server.ts                                              │ │
│  │    POST /local/send-message { accountId, userId, message } │ │
│  │    POST /local/scrape-group { accountId, groupLink }       │ │
│  │    GET  /local/accounts                                    │ │
│  │                                                             │ │
│  │  zalo-client.ts                                            │ │
│  │    apiInstances: Map<accountId, API>                       │ │
│  │      ├── accountId: 1762960780363 → API instance A         │ │
│  │      ├── accountId: 1762960999999 → API instance B         │ │
│  │      └── accountId: 1762961234567 → API instance C         │ │
│  │                                                             │ │
│  │  local-db.ts (SQLite)                                      │ │
│  │    zalo_accounts(accountId UNIQUE, displayName, ...)       │ │
│  │    messages(accountId, userId, message, ...)               │ │
│  │    contacts(accountId, userId, displayName, ...)           │ │
│  │    groups(accountId, groupId, groupName, ...)              │ │
│  │    group_members(accountId, groupId, userId, ...)          │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             ↕                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    FILE SYSTEM                              │ │
│  │                                                             │ │
│  │  ./data/sessions/                                          │ │
│  │    ├── 1762960780363.json  (Credentials for A)            │ │
│  │    ├── 1762960999999.json  (Credentials for B)            │ │
│  │    └── 1762961234567.json  (Credentials for C)            │ │
│  │                                                             │ │
│  │  ./data/browser_profiles/                                  │ │
│  │    ├── zalo_1762960780363/ (Browser profile for A)        │ │
│  │    ├── zalo_1762960999999/ (Browser profile for B)        │ │
│  │    └── zalo_1762961234567/ (Browser profile for C)        │ │
│  │                                                             │ │
│  │  ./data/app.db (SQLite database)                          │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## TÀI LIỆU THAM KHẢO

- [MULTI_ACCOUNT_GUIDE.md](./MULTI_ACCOUNT_GUIDE.md) - Hướng dẫn chi tiết cho user
- [desktop-app/worker/zalo-client.ts](desktop-app/worker/zalo-client.ts) - ZaloClient implementation
- [desktop-app/worker/api-server.ts](desktop-app/worker/api-server.ts) - API endpoints
- [desktop-app/worker/local-db.ts](desktop-app/worker/local-db.ts) - Database schema
- [desktop-app/renderer/src/pages/Dashboard.tsx](desktop-app/renderer/src/pages/Dashboard.tsx) - UI account management

---

**Ngày phân tích:** 2025-11-13
**Phiên bản:** 1.0.0
**Kết luận:** ✅ Hệ thống đã hoàn toàn hỗ trợ multi-account, không cần sửa đổi gì
