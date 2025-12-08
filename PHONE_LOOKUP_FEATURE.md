# Phone Number Lookup Feature

## 🎯 Tổng quan

Thêm 2 chức năng mới để tìm kiếm và gửi tin nhắn qua số điện thoại:

1. **SendMessagePanel**: Thêm chế độ tìm kiếm qua số điện thoại
2. **FindUserPanel**: Panel độc lập để tìm kiếm thông tin người dùng Zalo

---

## ✨ Tính năng mới

### 1. SendMessagePanel - Phone Lookup Mode

**File:** [SendMessagePanel.tsx](desktop-app/renderer/src/components/SendMessagePanel.tsx)

**Chức năng:**
- Toggle giữa 2 chế độ input: "User ID" và "Số điện thoại"
- Nhập số điện thoại → Tự động tìm kiếm user
- Hiển thị thông tin user tìm được (avatar, tên, userId)
- Tự động điền userId sau khi tìm thấy
- Gửi tin nhắn bình thường sau khi có userId

**UI Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│  Gửi tin nhắn                  [👤 Đang dùng: Nguyễn Văn A] │
├─────────────────────────────────────────────────────────────┤
│  [ Nhập User ID ] [ Tìm qua số điện thoại ]                 │
│                                                              │
│  ┌────────────────────────────────┬──────────────┐          │
│  │ Số điện thoại: [0901234567__] │ [🔍 Tìm kiếm] │          │
│  └────────────────────────────────┴──────────────┘          │
│                                                              │
│  ✅ Đã tìm thấy: Nguyễn Văn A                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │ 👤 Nguyễn Văn A                                 │        │
│  │    User ID: 9047261701465740934                 │        │
│  └─────────────────────────────────────────────────┘        │
│                                                              │
│  Nội dung tin nhắn:                                         │
│  ┌────────────────────────────────────────────────┐         │
│  │ [Nhập nội dung...]                             │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  [📤 Gửi tin nhắn]                                          │
└─────────────────────────────────────────────────────────────┘
```

**Code Changes:**

```typescript
// New states
const [inputMode, setInputMode] = useState<'userId' | 'phone'>('userId');
const [phoneNumber, setPhoneNumber] = useState('');
const [foundUser, setFoundUser] = useState<any>(null);
const [lookingUp, setLookingUp] = useState(false);

// Phone lookup handler
const handleFindUser = async () => {
  setLookingUp(true);
  const result = await findUser(accountId, phoneNumber.trim());

  if (result.success && result.user) {
    setFoundUser(result.user);
    setUserId(result.user.userId); // Auto-fill userId
    setSuccess(`Đã tìm thấy: ${result.user.displayName}`);
  } else {
    setError(result.error || 'Không tìm thấy người dùng');
  }
  setLookingUp(false);
};
```

---

### 2. FindUserPanel - Dedicated Search Panel

**File:** [FindUserPanel.tsx](desktop-app/renderer/src/components/FindUserPanel.tsx) (NEW)

**Chức năng:**
- Panel độc lập chuyên để tìm kiếm
- Nhập số điện thoại → Hiển thị thông tin đầy đủ
- Card kết quả với avatar lớn, tên, userId, phone
- Button "Gửi tin nhắn" để chuyển sang SendMessagePanel
- Account indicator hiển thị account đang dùng để tìm kiếm

**UI Flow:**
```
┌──────────────────────────────────────────────────────────────┐
│  Tìm kiếm người dùng Zalo        [👤 Đang dùng: Trần Thị B]  │
├──────────────────────────────────────────────────────────────┤
│  Nhập số điện thoại để tìm kiếm thông tin người dùng Zalo.   │
│                                                               │
│  ┌─────────────────────────────────┬──────────────┐          │
│  │ Số điện thoại: [0901234567___] │ [🔍 Tìm kiếm] │          │
│  └─────────────────────────────────┴──────────────┘          │
│                                                               │
│  ┌────────────────── Kết quả tìm kiếm ───────────────────┐   │
│  │                                                        │   │
│  │  ┌───────┐   Nguyễn Văn A                             │   │
│  │  │ Avatar│                                             │   │
│  │  │ (80px)│   User ID:                                  │   │
│  │  └───────┘   9047261701465740934                       │   │
│  │                                                        │   │
│  │              Số điện thoại:                            │   │
│  │              0901234567                                │   │
│  │                                                        │   │
│  │  [📤 Gửi tin nhắn]                                     │   │
│  │                                                        │   │
│  │  Thông tin này được lấy trực tiếp từ Zalo.            │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  💡 Lưu ý:                                                    │
│  • Số điện thoại phải được liên kết với tài khoản Zalo       │
│  • Người dùng phải có trong danh bạ hoặc visible trên Zalo   │
│  • Tìm kiếm sử dụng account Zalo đã đăng nhập của bạn        │
└──────────────────────────────────────────────────────────────┘
```

**Component Structure:**

```typescript
interface FindUserPanelProps {
  accountId: number; // Account Zalo dùng để tìm kiếm
}

const FindUserPanel: React.FC<FindUserPanelProps> = ({ accountId }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [accountInfo, setAccountInfo] = useState<any>(null);

  // Load account info (for indicator)
  useEffect(() => { /* ... */ }, [accountId]);

  // Search handler
  const handleSearch = async () => {
    const result = await findUser(accountId, phoneNumber);
    if (result.success) setFoundUser(result.user);
  };

  // Navigate to send message
  const handleSendMessage = () => {
    navigate('/dashboard/send-message');
  };

  return (
    <Box>
      {/* Account indicator */}
      {/* Phone input + Search button */}
      {/* Result card with user info */}
      {/* Send message button */}
    </Box>
  );
};
```

---

### 3. Dashboard Integration

**File:** [Dashboard.tsx](desktop-app/renderer/src/pages/Dashboard.tsx)

**Changes:**
1. Import FindUserPanel component
2. Add 'find-user' to ActivePanel type
3. Add case in renderPanel()
4. Add menu item in sidebar

**New Menu Item:**
```typescript
<ListItem disablePadding>
  <ListItemButton
    selected={activePanel === 'find-user'}
    onClick={() => setActivePanel('find-user')}
  >
    <ListItemIcon>
      <Search />
    </ListItemIcon>
    <ListItemText primary="Tìm người dùng" />
  </ListItemButton>
</ListItem>
```

---

### 4. API Integration

**File:** [localApi.ts](desktop-app/renderer/src/api/localApi.ts)

**New Function:**

```typescript
export const findUser = async (
  accountId: number,
  phoneNumber: string,
): Promise<{
  success: boolean;
  user?: {
    userId: string;
    displayName: string;
    avatar?: string;
    phoneNumber?: string;
  };
  error?: string;
}> => {
  const response = await localApi.post('/local/find-user', {
    accountId,
    phoneNumber,
  });
  return response.data;
};
```

**Backend Endpoint:** (Already exists in api-server.ts)
```
POST /local/find-user
Body: { accountId, phoneNumber }
Response: { success, user, error }
```

---

## 🎨 UI/UX Improvements

### 1. Mode Toggle (SendMessagePanel)
- Chips với icon rõ ràng (Person, Phone)
- Active state với màu primary
- Click để switch mode → Clear previous state

### 2. Phone Input với Search Button
- TextField với placeholder gợi ý format
- Button "Tìm kiếm" với Search icon
- Loading state: CircularProgress + "Đang tìm..."

### 3. Found User Display
- Alert severity="success" với thông tin user
- Avatar + Display name + User ID
- Monospace font cho userId để dễ đọc

### 4. Dedicated Search Panel
- Card layout với spacing tốt
- Large avatar (80x80) cho visibility
- Section labels (User ID, Số điện thoại)
- Info alerts với instructions
- Send message button to navigate

---

## 🔄 User Flows

### Flow 1: Gửi tin nhắn qua số điện thoại

```
1. User chọn Account A trong Dashboard
2. Vào tab "Gửi tin nhắn"
3. Click chip "Tìm qua số điện thoại"
4. Nhập số: 0901234567
5. Click "Tìm kiếm"
   → Loading: "Đang tìm..."
   → Success: Hiển thị user info
   → Auto-fill userId
6. Nhập nội dung tin nhắn
7. Click "Gửi tin nhắn"
   → Success: "Tin nhắn đã được gửi!"
```

---

### Flow 2: Tìm kiếm thông tin user

```
1. User chọn Account B trong Dashboard
2. Vào tab "Tìm người dùng"
3. Thấy account indicator: "Đang dùng: Account B"
4. Nhập số điện thoại
5. Click "Tìm kiếm"
   → Loading
   → Result card hiển thị:
     • Avatar
     • Tên: Nguyễn Văn A
     • User ID: 9047261701465740934
     • Phone: 0901234567
6. (Optional) Click "Gửi tin nhắn"
   → Navigate to SendMessagePanel
```

---

### Flow 3: Switch giữa input modes

```
SendMessagePanel:

[ Nhập User ID ] [ Tìm qua số điện thoại ]
         ↓                     ↓
┌────────────────┐   ┌────────────────────┐
│ TextField:     │   │ TextField: Phone   │
│ User ID        │   │ + Search Button    │
│ (direct input) │   │ (find then fill)   │
└────────────────┘   └────────────────────┘
```

---

## 🧪 Testing

### Test 1: Phone lookup in SendMessagePanel

```bash
# 1. Start app, login account A
# 2. Go to "Gửi tin nhắn"
# 3. Click "Tìm qua số điện thoại"
# 4. Enter valid phone: 0901234567
# 5. Click "Tìm kiếm"

# Expected:
✅ Loading spinner appears
✅ Success alert: "Đã tìm thấy: [Name]"
✅ User info displayed with avatar
✅ userId auto-filled
✅ Can send message normally

# 6. Enter invalid phone: 0999999999
# Expected:
❌ Error alert: "Không tìm thấy người dùng"
```

---

### Test 2: FindUserPanel search

```bash
# 1. Go to "Tìm người dùng"
# 2. Account indicator shows current account
# 3. Enter phone number
# 4. Click search

# Expected:
✅ Result card appears
✅ Avatar displayed (80x80)
✅ Name, userId, phone shown
✅ "Gửi tin nhắn" button visible
✅ Click button → Navigate to send message
```

---

### Test 3: Multi-account switch

```bash
# 1. Login 2 accounts (A and B)
# 2. Select Account A
# 3. Go to "Tìm người dùng"
# 4. Search phone → Found user X

# 5. Switch to Account B
# Expected:
✅ Account indicator updates: "Đang dùng: Account B"
✅ Previous search cleared

# 6. Search same phone with Account B
# Expected:
✅ May find different user or same user
✅ Uses Account B's credentials to search
```

---

## 📝 Files Changed

### Modified:
- ✅ `desktop-app/renderer/src/components/SendMessagePanel.tsx`
  - Added input mode toggle (userId vs phone)
  - Added phone number input + search
  - Added found user display
  - Auto-fill userId after search

- ✅ `desktop-app/renderer/src/api/localApi.ts`
  - Added `findUser()` function
  - Type definitions for FindUser result

- ✅ `desktop-app/renderer/src/pages/Dashboard.tsx`
  - Import FindUserPanel
  - Add 'find-user' to ActivePanel type
  - Add renderPanel case
  - Add sidebar menu item

### Created:
- ✅ `desktop-app/renderer/src/components/FindUserPanel.tsx` (NEW)
  - Complete component with search functionality
  - Account indicator
  - Result card display
  - Send message navigation

---

## 🚀 Future Improvements

### Priority 1: Recent Searches
- Lưu lịch sử tìm kiếm gần đây
- Quick access to previous searches
- Autocomplete từ history

### Priority 2: Batch Lookup
- Upload CSV file với danh sách phone
- Tìm kiếm hàng loạt
- Export results

### Priority 3: Save Found Users
- Button "Lưu vào danh bạ" trong FindUserPanel
- Auto-sync to contacts table
- Tag users with source (e.g., "Phone lookup")

### Priority 4: Direct Send from FindUserPanel
- Modal hoặc expandable section
- Nhập tin nhắn ngay trong FindUserPanel
- Không cần navigate sang SendMessagePanel

---

## 🔧 Backend API

**Endpoint:** `POST /local/find-user`

**Request:**
```json
{
  "accountId": 1234567890,
  "phoneNumber": "0901234567"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "userId": "9047261701465740934",
    "displayName": "Nguyễn Văn A",
    "avatar": "https://...",
    "phoneNumber": "0901234567"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Không tìm thấy người dùng với số điện thoại này"
}
```

**Implementation:** Already exists in `desktop-app/worker/api-server.ts:220-237`

---

## 🎯 Benefits

### 1. User Convenience
- Không cần biết userId của người nhận
- Chỉ cần số điện thoại (dễ có)
- Tự động tìm và điền thông tin

### 2. Flexibility
- 2 cách input: userId hoặc phone
- User chọn cách nào phù hợp
- Toggle dễ dàng giữa các mode

### 3. Verification
- Xem trước thông tin người nhận
- Đảm bảo gửi đúng người
- Giảm sai sót

### 4. Discovery
- FindUserPanel để khám phá users mới
- Không cần đi vào send message
- Dedicated tool for search

---

**Date:** 2025-11-13
**Version:** 2.2.0 (Phone Lookup Feature)
**Status:** ✅ Ready for Testing
