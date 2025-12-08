# Zalo Login Integration - Fixed

## Summary

Đã kiểm tra và sửa lỗi tích hợp giữa frontend, backend Python và Node.js bridge để đăng nhập Zalo.

## Components Checked

### 1. Node.js Bridge
**Location**: `d:\Project\SourceCode\clone_akaBiz\zalo_bridge\`

**Files**:
- `index.js` - CLI interface nhận commands từ Python
- `src/zalo-client.js` - Implementation sử dụng zca-js library
- `package.json` - Dependencies: zca-js v2.0.0

**Features**:
- Login via QR code using zca-js
- Session persistence in `./data/sessions/{accountId}.json`
- Hỗ trợ các commands:
  - `login` - Đăng nhập Zalo
  - `getAccountInfo` - Lấy thông tin account
  - `findUser` - Tìm user theo số điện thoại
  - `sendMessage` - Gửi tin nhắn
  - `sendBulkMessages` - Gửi tin nhắn hàng loạt
  - `getGroupMembersFromLink` - Lấy danh sách thành viên nhóm từ link
  - `logout` - Đăng xuất

**Response Format**:
```json
{
  "success": true,
  "message": "Login successful",
  "requiresQR": true,  // camelCase
  "data": {...}
}
```

### 2. Backend Python
**Location**: `d:\Project\SourceCode\clone_akaBiz\backend\`

**Files Modified**:
- `app/routes/zalo.py` - Removed response model validation, returns raw JSON from bridge
- `app/services/zalo_api_service.py` - Calls Node.js bridge via subprocess
- `app/core/config.py` - Configuration for bridge path and session path

**Configuration** (`.env`):
```env
ZALO_BRIDGE_PATH=../zalo_bridge/index.js
ZALO_SESSION_PATH=./data/sessions
```

**API Endpoints**:
- `POST /api/zalo/login` - Login to Zalo account
  - Request: `{"account_id": "string"}`
  - Response: Direct from Node.js bridge (camelCase format)

- `GET /api/zalo/account-info/{account_id}` - Get account info
- `POST /api/zalo/send-message` - Send message
- `POST /api/zalo/send-bulk-messages` - Send bulk messages
- `POST /api/zalo/scrape-group` - Scrape group members

**Session Storage**:
- Sessions stored in: `backend/data/sessions/{accountId}.json`
- Both Python and Node.js use the same directory (relative to backend/)

### 3. Frontend React
**Location**: `d:\Project\SourceCode\clone_akaBiz\frontend\`

**Files Modified**:
- `src/services/api.js` - Fixed API calls:
  - Login: `POST /api/zalo/login` with `account_id` as string
  - Get Account Info: Changed from POST to `GET /api/zalo/account-info/{accountId}`

- `src/pages/Accounts.jsx` - Login handler:
  ```javascript
  const handleLogin = async (id) => {
    const result = await zaloAccountAPI.login(id)
    if (result.requiresQR) {  // Expects camelCase from backend
      // Show QR code modal
    } else {
      // Login successful
    }
  }
  ```

## Integration Flow

```
User clicks "Đăng nhập" button in Frontend
    ↓
Frontend: POST /api/zalo/login { account_id: "123" }
    ↓
Backend Python: zalo_api_service.py
    → Executes: node ../zalo_bridge/index.js login 123
    ↓
Node.js Bridge: index.js
    → Calls: ZaloClient.login('123')
    → Checks session file: ./data/sessions/123.json
    ↓
If session exists and valid:
    → Returns: { success: true, requiresQR: false, data: {...} }
    ↓
If session expired or new login:
    → Calls: zca-js loginQR()
    → Saves session to: ./data/sessions/123.json
    → Returns: { success: true, requiresQR: true }
    ↓
Backend Python: Returns raw JSON to frontend
    ↓
Frontend: Checks result.requiresQR
    → If true: Show QR code modal
    → If false: Show success message and reload accounts
```

## Key Fixes Applied

### 1. Response Format Consistency
**Issue**: Backend tried to convert `requiresQR` (camelCase) to `requires_qr` (snake_case), but frontend expected camelCase.

**Fix**: Removed response model validation in backend, return raw JSON from Node.js bridge.

**Before**:
```python
@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    result = await zalo_api.login(request.account_id)
    if 'requiresQR' in result:
        result['requires_qr'] = result.pop('requiresQR')  # ❌ Unnecessary conversion
    return LoginResponse(**result)
```

**After**:
```python
@router.post("/login")
async def login(request: LoginRequest):
    result = await zalo_api.login(request.account_id)
    return result  # ✅ Return raw JSON from bridge
```

### 2. API Endpoint Mismatch
**Issue**: Frontend called `POST /api/zalo/account-info` but backend expected `GET /api/zalo/account-info/{account_id}`

**Fix**: Updated frontend API call to use GET with path parameter.

**Before**:
```javascript
getAccountInfo: (accountId) => api.post('/zalo/account-info', { account_id: accountId })
```

**After**:
```javascript
getAccountInfo: (accountId) => api.get(`/zalo/account-info/${accountId}`)
```

### 3. Bridge Path Configuration
**Issue**: Need to verify bridge path works from backend directory.

**Fix**: Tested that `node ../zalo_bridge/index.js` works correctly from backend directory.

**Result**: ✅ Path is correct, bridge responds properly.

### 4. Session Path Alignment
**Issue**: Ensure both Python and Node.js use the same session directory.

**Fix**: Both use `./data/sessions` relative to backend directory:
- Python config: `ZALO_SESSION_PATH=./data/sessions`
- Node.js uses: `./data/sessions` (relative to where node is executed = backend dir)

**Result**: ✅ Both systems share the same session files.

## How to Use Zalo Login

### 1. Add Zalo Account
1. Open frontend: http://localhost:5173
2. Go to "Quản Lý Tài Khoản Zalo" page
3. Click "Thêm Tài Khoản"
4. Enter phone number and display name
5. Click "Lưu"

### 2. Login to Zalo
1. Click "Đăng nhập" button for an account
2. Two scenarios:

**A. First Time Login or Session Expired**:
- Backend will show QR code (if zca-js supports QR display)
- Open Zalo app on phone
- Scan QR code
- Session will be saved automatically
- Account status will be updated to "active"

**B. Valid Session Exists**:
- Will login automatically using saved session
- No QR code needed
- Account status updated immediately

### 3. Session Persistence
- Sessions are saved in: `backend/data/sessions/{accountId}.json`
- Session format:
```json
{
  "cookie": "...",
  "imei": "...",
  "userAgent": "...",
  "secretKey": "..."
}
```
- Sessions remain valid until Zalo logs out or token expires

## Testing Checklist

- [✅] Node.js bridge accessible from backend directory
- [✅] Session directory created: `backend/data/sessions/`
- [✅] Backend server starts without import errors
- [✅] Frontend API calls use correct endpoints
- [✅] Response format matches between components (camelCase)
- [✅] Session path aligned between Python and Node.js
- [ ] QR code login flow (requires actual Zalo login test)
- [ ] Session persistence across restarts
- [ ] Multiple accounts login simultaneously

## Current Status

✅ **Integration Complete**:
- Node.js bridge verified and working
- Backend routes fixed and server running
- Frontend API calls corrected
- Session storage configured properly

⏳ **Pending**:
- End-to-end testing with actual Zalo login
- QR code display implementation (if needed)
- Error handling improvements

## Next Steps

1. Test actual login flow:
   - Click "Đăng nhập" in frontend
   - Check browser console for response
   - Verify QR code display (if requiresQR: true)

2. Monitor session files:
   - Check if session JSON files are created
   - Verify session format matches expected structure

3. Test session persistence:
   - Restart backend server
   - Click "Đăng nhập" again
   - Should reuse existing session without QR code

## Troubleshooting

### Backend Server Won't Start
```bash
cd d:\Project\SourceCode\clone_akaBiz\backend
source ../.venv/bin/activate  # or .venv\Scripts\activate on Windows
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Node.js Bridge Test
```bash
cd d:\Project\SourceCode\clone_akaBiz\backend
node ../zalo_bridge/index.js login test_account
# Should show: {"success":false,"error":"..."}
```

### Check Session Files
```bash
dir d:\Project\SourceCode\clone_akaBiz\backend\data\sessions
# Should list .json files for each logged-in account
```

### Frontend API Errors
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "zalo"
4. Check request/response format
5. Verify status codes (200 = success, 500 = server error)

## Notes

- **QR Code Display**: The zca-js library returns QR code data, but displaying it in the frontend modal may need additional work
- **Rate Limiting**: Zalo has rate limits. Don't spam login requests
- **Multiple Accounts**: Each account has its own session file, so multiple accounts can be logged in simultaneously
- **Session Security**: Session files contain sensitive data. Keep them secure and don't commit to git
