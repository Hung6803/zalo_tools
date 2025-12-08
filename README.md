# akaBiz Clone - Zalo Automation Platform

Clone của ứng dụng akaBiz với kiến trúc hiện đại, tập trung vào tự động hóa Zalo marketing.

## 🎯 Tính năng chính

### Zalo Automation
- ✅ **Multi-account management** - Quản lý nhiều tài khoản Zalo
- ✅ **Group member scraping** - Lấy danh sách members từ group (kể cả private/hidden)
- ✅ **Bulk messaging** - Gửi tin nhắn hàng loạt qua API (không qua browser)
- ✅ **Campaign system** - Tạo và quản lý campaigns với scheduling
- ✅ **Message templates** - Templates với biến động (personalization)
- ✅ **Auto reply** - Tự động trả lời tin nhắn dựa trên keywords
- ✅ **Rate limiting** - Tránh spam detection với delays thông minh
- ✅ **Analytics & Reports** - Thống kê chi tiết campaigns

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────┐
│   Electron Frontend (React + TypeScript)│
│   - Desktop app với UI hiện đại         │
└──────────────┬──────────────────────────┘
               │ REST API
┌──────────────▼──────────────────────────┐
│   Python FastAPI Backend                │
│   ├─ Zalo API Service (Node.js bridge)  │
│   ├─ Browser Service (Playwright)       │
│   └─ Campaign Workers (Celery)          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   PostgreSQL + Redis                    │
└─────────────────────────────────────────┘
```

## 📋 Tech Stack

### Backend
- **Python 3.12** với FastAPI
- **PostgreSQL** - Database chính
- **Redis** - Task queue & caching
- **Celery** - Background jobs
- **Playwright** - Browser automation
- **zca-js** (via Node.js bridge) - Zalo API

### Frontend
- **Electron** - Desktop app framework
- **React 18** với TypeScript
- **TailwindCSS** - Styling
- **Zustand** - State management
- **React Query** - Data fetching

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL 16+ (hoặc dùng Docker)
- Redis 7+ (hoặc dùng Docker)

### 1. Clone repository

```bash
git clone <repo-url>
cd clone_akaBiz
```

### 2. Setup Database với Docker

```bash
# Start PostgreSQL + Redis
docker-compose up -d postgres redis

# Wait for services to be healthy
docker-compose ps
```

### 3. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env và cập nhật các thông tin cần thiết

# Run migrations (tạo database tables)
# TODO: Add alembic commands

# Install Playwright browsers
playwright install chromium

# Run backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend sẽ chạy tại: http://localhost:8000

### 4. Setup Zalo Bridge (Node.js)

```bash
cd zalo_bridge

# Install dependencies
npm install

# Test the bridge
node index.js login test_account
```

### 5. Setup Frontend (Coming soon)

```bash
cd frontend

# Install dependencies
npm install

# Run development
npm run dev
```

## 📖 API Documentation

Sau khi start backend, truy cập:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔧 Configuration

### Backend Environment Variables

Edit `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/akabiz_clone

# Security
SECRET_KEY=your-super-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# Zalo Bridge
ZALO_BRIDGE_PATH=../zalo_bridge/index.js

# Rate Limiting
ZALO_MESSAGES_PER_HOUR=100
ZALO_MIN_DELAY_MS=2000
ZALO_MAX_DELAY_MS=5000
```

## 📚 Project Structure

```
clone_akaBiz/
├── backend/                # Python FastAPI backend
│   ├── app/
│   │   ├── api/v1/        # API endpoints
│   │   ├── core/          # Config, database, security
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   └── workers/       # Celery workers
│   ├── alembic/           # Database migrations
│   ├── tests/             # Tests
│   └── requirements.txt
│
├── zalo_bridge/           # Node.js bridge for zca-js
│   ├── src/
│   │   └── zalo-client.js
│   ├── index.js
│   └── package.json
│
├── frontend/              # Electron + React app
│   ├── src/
│   │   ├── main/         # Electron main process
│   │   └── renderer/     # React app
│   └── package.json
│
├── docs/                  # Documentation
├── docker-compose.yml
└── README.md
```

## 🔐 Zalo Authentication

### Cách hoạt động

1. **QR Code Login** (Lần đầu)
   - App mở Zalo Web với Playwright
   - User scan QR code bằng Zalo mobile
   - Session được lưu vào file JSON

2. **Session Restore** (Lần sau)
   - Load session từ file
   - Không cần scan QR lại

### Login Flow

```python
# Python backend
from app.services import ZaloAPIService

zalo_api = ZaloAPIService()

# Login (first time - requires QR scan)
result = await zalo_api.login("account_1")

# Get account info
info = await zalo_api.get_account_info("account_1")
```

## 💬 Zalo Messaging

### Send Single Message

```python
result = await zalo_api.send_message(
    account_id="account_1",
    user_id="zalo_user_id",
    message="Hello from akaBiz Clone!"
)
```

### Send Bulk Messages

```python
recipients = [
    {"userId": "user1", "message": "Hi user1!"},
    {"userId": "user2", "message": "Hi user2!"},
]

result = await zalo_api.send_bulk_messages(
    account_id="account_1",
    recipients=recipients,
    delay_ms=2000,  # 2 seconds between messages
    max_retries=3
)
```

### Find User by Phone

```python
result = await zalo_api.find_user(
    account_id="account_1",
    phone_number="0123456789"
)
```

## 👥 Group Member Scraping

```python
from app.services import ZaloBrowserService

browser = ZaloBrowserService()

# Scrape group members
result = await browser.scrape_group_members(
    account_id="account_1",
    group_link="https://chat.zalo.me/g/...",
    max_members=1000
)

# Result contains:
# - group info (name, id)
# - members list (zaloId, displayName, avatarUrl, role)
```

## 📊 Campaign System

### Create Campaign

```python
campaign = {
    "name": "Marketing Campaign 2024",
    "target_type": "groups",  # Target group members
    "target_groups": [1, 2, 3],  # Group IDs
    "message_content": "Hello {name}! Special offer...",
    "send_method": "api",  # Send via API (not browser)
    "schedule_type": "scheduled",
    "scheduled_at": "2024-01-01 09:00:00",
    "messages_per_hour": 100,
    "delay_between_messages": 5
}
```

## 🧪 Testing

```bash
cd backend
pytest tests/
```

## 📝 Database Migrations

```bash
cd backend

# Create new migration
alembic revision --autogenerate -m "Add new table"

# Run migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 🐛 Troubleshooting

### Issue: zca-js login fails
- Đảm bảo Node.js version >= 18
- Check `zalo_bridge/data/sessions` folder permissions
- Try delete old session file và login lại

### Issue: Playwright browser không mở
```bash
# Reinstall browsers
playwright install chromium
```

### Issue: Database connection error
```bash
# Check PostgreSQL running
docker-compose ps

# Check connection string in .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/akabiz_clone
```

## 📈 Roadmap

### Phase 1: Core ✅ COMPLETED
- [x] Project structure
- [x] Database models
- [x] Zalo API integration (zca-js)
- [x] Group scraping via API (no join required!)
- [x] Browser scraping fallback (Playwright)
- [x] REST API endpoints

### Phase 2: Advanced Features ✅ COMPLETED
- [x] Campaign management system
- [x] Campaign execution workers (Celery)
- [x] Auto reply rules with keyword matching
- [x] Message templates with variables
- [x] Analytics & reporting dashboard
- [x] Bulk operations

### Phase 3: Polish (In Progress)
- [x] Comprehensive documentation
- [ ] Error handling & logging improvements
- [ ] Performance optimization
- [ ] Unit & integration testing
- [ ] Frontend (Electron + React)
- [ ] Message listener service

## 🤝 Contributing

Contributions are welcome! Please read CONTRIBUTING.md first.

## 📄 License

MIT

## ⚠️ Disclaimer

Đây là công cụ tự động hóa cho mục đích marketing hợp pháp. Vui lòng:
- Tuân thủ Terms of Service của Zalo
- Không spam
- Tôn trọng privacy của người dùng
- Sử dụng rate limiting hợp lý

## 📧 Contact

For questions and support, please open an issue on GitHub.

---

Made with ❤️ by Claude Code
