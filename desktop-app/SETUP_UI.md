# Hướng dẫn cài đặt và chạy Desktop App với UI

## 📋 Tổng quan

Desktop app đã được implement đầy đủ với:
- ✅ Backend modules (Agents + Sync)
- ✅ Local worker (API server, Zalo client, SQLite, Sync service)
- ✅ React UI (Login, Dashboard, Send Message, Scrape Group, Settings)
- ✅ Electron wrapper

## 🚀 Cài đặt

### Bước 1: Cài dependencies cho root project

```bash
cd desktop-app
npm install
```

### Bước 2: Cài dependencies cho React UI

```bash
cd renderer
npm install
cd ..
```

## 🎮 Chạy Development Mode

### Cách 1: Chạy tất cả cùng lúc (Recommended)

```bash
npm run dev
```

Lệnh này sẽ tự động chạy:
1. Local worker API (localhost:3001)
2. React dev server với Vite (localhost:3002)
3. Electron window

### Cách 2: Chạy từng phần riêng biệt

Terminal 1 - Worker:
```bash
npm run dev:worker
```

Terminal 2 - React UI:
```bash
npm run dev:renderer
```

Terminal 3 - Electron (đợi 2 cái trên chạy xong):
```bash
npm run dev:electron
```

## 📱 Cách sử dụng

### 1. Màn hình đăng nhập

Khi mở app lần đầu, bạn sẽ thấy màn hình login:

- **Backend URL**: `http://localhost:8000` (backend NestJS)
- **Username**: Tài khoản đã đăng ký trên backend
- **Password**: Mật khẩu

Nhấn "Đăng nhập" → App sẽ:
1. Gọi backend API `/api/agents/register` để đăng ký desktop này làm agent
2. Nhận về `agentId` và `apiKey`
3. Lưu config vào SQLite local
4. Chuyển sang Dashboard

### 2. Dashboard - Thêm tài khoản Zalo

Click nút "Thêm tài khoản":
1. Dialog hiển thị QR code
2. Mở Zalo app trên điện thoại → Quét mã
3. Sau khi quét thành công → Tài khoản xuất hiện trong danh sách

### 3. Gửi tin nhắn

Tab "Gửi tin nhắn":
1. Nhập **Zalo User ID** của người nhận
2. Nhập nội dung tin nhắn
3. Chọn loại: "Gửi tin nhắn thường" hoặc "Gửi lời mời kết bạn"
4. Click "Gửi"

→ Tin nhắn được gửi từ IP của máy bạn → An toàn với Zalo
→ Dữ liệu tự động lưu vào SQLite local
→ Background sync sẽ đồng bộ lên backend sau 5 phút (hoặc nhấn nút "Đồng bộ")

### 4. Lấy thành viên nhóm

Tab "Lấy thành viên nhóm":
1. Nhập link nhóm Zalo (ví dụ: `https://zalo.me/g/...`)
2. Click "Lấy danh sách"
3. Trình duyệt Chromium sẽ mở → Tự động scrape
4. Danh sách thành viên hiển thị trong bảng

→ Dữ liệu lưu local và tự động sync lên backend

### 5. Settings

Tab "Cài đặt":
- Xem thông tin kết nối backend
- Kiểm tra trạng thái đồng bộ
- Xem số lượng dữ liệu chưa đồng bộ

## 🏗️ Cấu trúc UI

```
renderer/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Root component với auth check
│   ├── api/
│   │   └── localApi.ts       # Axios client cho local API (localhost:3001)
│   ├── pages/
│   │   ├── Login.tsx         # Màn hình đăng nhập với backend
│   │   └── Dashboard.tsx     # Main dashboard với drawer menu
│   └── components/
│       ├── ZaloLogin.tsx         # Dialog QR code đăng nhập Zalo
│       ├── SendMessagePanel.tsx  # Form gửi tin nhắn
│       ├── ScrapeGroupPanel.tsx  # Form scrape nhóm + hiển thị kết quả
│       ├── ContactsPanel.tsx     # Quản lý danh bạ (placeholder)
│       └── SettingsPanel.tsx     # Cài đặt và sync status
```

## 🔧 Build Production

### Build tất cả

```bash
npm run build
```

Lệnh này sẽ:
1. Build worker TypeScript → `dist/worker/`
2. Build React với Vite → `renderer/dist/`
3. Build Electron TypeScript → `dist/electron/`

### Tạo Windows installer (.exe)

```bash
npm run build:win
```

Output: `dist-build/Zalo Marketing Setup 1.0.0.exe`

## 🔍 Kiểm tra endpoints

### Local Worker API (localhost:3001)

Test worker đang chạy:
```bash
curl http://localhost:3001/health
```

Endpoints có sẵn:
- `POST /local/login` - Đăng nhập Zalo QR
- `POST /local/check-login` - Check trạng thái login
- `POST /local/send-message` - Gửi tin nhắn
- `POST /local/send-friend-request` - Gửi lời mời kết bạn
- `POST /local/scrape-group` - Scrape nhóm
- `GET /local/accounts` - Danh sách tài khoản Zalo
- `GET /local/sync/status` - Trạng thái đồng bộ
- `POST /local/sync/trigger` - Đồng bộ ngay
- `GET /local/config` - Config backend
- `POST /local/config` - Lưu config
- `POST /local/register-agent` - Đăng ký agent với backend

### React Dev Server (localhost:3002)

Mở trình duyệt: http://localhost:3002

## ⚠️ Troubleshooting

### 1. "Cannot connect to local API"

Kiểm tra worker đã chạy chưa:
```bash
# Terminal riêng
npm run dev:worker
```

### 2. "Module not found" khi chạy React

Cài lại dependencies:
```bash
cd renderer
rm -rf node_modules package-lock.json
npm install
```

### 3. Electron không load UI

Đợi worker và Vite dev server chạy xong (khoảng 5-10 giây) trước khi chạy:
```bash
npm run dev:electron
```

### 4. QR code không hiển thị

Check worker logs:
- Kiểm tra zca-js library đã cài đúng chưa
- Kiểm tra kết nối internet

### 5. Scrape group bị lỗi

- Kiểm tra Playwright đã cài browsers chưa:
```bash
npx playwright install chromium
```

## 📊 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: Material-UI (MUI)
- **Desktop**: Electron 28
- **Local API**: Express + TypeScript
- **Database**: SQLite (better-sqlite3)
- **Zalo API**: zca-js
- **Browser Automation**: Playwright

## 🎯 Next Steps

1. **Test end-to-end flow**:
   - Chạy backend NestJS (`npm run start:dev`)
   - Chạy desktop app (`npm run dev`)
   - Đăng nhập → Thêm Zalo account → Gửi message → Scrape group → Check sync

2. **Implement missing features**:
   - ContactsPanel với danh sách đầy đủ
   - Search và filter contacts
   - Template management trong UI
   - Campaign management

3. **Production deployment**:
   - Build Windows installer
   - Setup auto-update
   - User documentation
   - Deploy backend lên VPS
