# 🚀 NestJS Backend - AkaBiz Clone

> Zalo Marketing Automation Platform - NestJS Edition

Backend NestJS được migrate từ Python FastAPI, với **zca-js tích hợp trực tiếp**!

---

## ⚡ Quick Start

```bash
# 1. Start PostgreSQL & Redis
cd ..
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Start development server
npm run start:dev
```

**Server**: http://localhost:8000
**Swagger API Docs**: http://localhost:8000/api/docs

📖 **Chi tiết**: Xem [QUICK_START.md](./QUICK_START.md)

---

## ✅ Đã Hoàn Thành (50%)

### 🏗️ Core Infrastructure
- ✅ NestJS v11 + TypeScript v5.7
- ✅ Configuration management
- ✅ Swagger documentation
- ✅ CORS & validation

### 💾 Database (TypeORM + PostgreSQL)
- ✅ **13 entities hoàn chỉnh**
- ✅ Relationships, indexes, enums
- ✅ Auto-migration trong dev

### 🔐 Authentication
- ✅ JWT + Passport
- ✅ Access & refresh tokens
- ✅ bcrypt password hashing
- ✅ Global auth guard

### 📱 Zalo API Service ⭐ **HIGHLIGHT**
- ✅ **zca-js tích hợp trực tiếp** (không cần Python bridge!)
- ✅ QR code login
- ✅ Send messages (single & bulk)
- ✅ Find users, send friend requests
- ✅ Get group members WITHOUT joining
- ✅ Rate limiting & retry logic

---

## ⏳ Còn Lại (50%)

- ⏳ Playwright Browser Service (2-3h)
- ⏳ Campaign System với BullMQ (4-5h)
- ⏳ CRUD Modules (Accounts, Templates, Auto-Reply, etc.) (6-8h)
- ⏳ Testing & deployment (3-4h)

**Total**: ~15-20 giờ

---

## 📁 Project Structure

```
backend-nestjs/
├── src/
│   ├── config/              # Config files
│   ├── database/entities/   # 13 TypeORM entities ✅
│   ├── modules/
│   │   ├── auth/           # Authentication ✅
│   │   ├── zalo-api/       # Zalo API Service ✅
│   │   ├── zalo-browser/   # Browser automation ⏳
│   │   ├── zalo-accounts/  # Account CRUD ⏳
│   │   └── ...             # Other modules ⏳
│   └── main.ts
├── data/
│   ├── sessions/           # Zalo sessions
│   └── browser_profiles/
├── .env
└── package.json
```

---

## 🛠️ Tech Stack

- **NestJS** v11 - Backend framework
- **TypeScript** v5.7 - Type safety
- **TypeORM** - ORM for PostgreSQL
- **PostgreSQL** v16 - Database
- **Redis** v7 - Cache & queue
- **zca-js** v2.0 - Zalo API (DIRECT!)
- **Passport + JWT** - Authentication
- **BullMQ** - Job queue
- **Swagger** - API docs

---

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Get user info

### Zalo API
- `POST /api/zalo/login/:id` - Login QR code
- `POST /api/zalo/send-message` - Gửi tin nhắn
- `POST /api/zalo/send-bulk-messages` - Gửi hàng loạt
- `POST /api/zalo/scrape-group` - Lấy thành viên nhóm
- `GET /api/zalo/health` - Health check

**Full docs**: http://localhost:8000/api/docs

---

## 🎯 Migration Highlights

### Before (Python)
```
Python FastAPI → subprocess → Node.js Bridge → zca-js
```

### After (NestJS) ⭐
```typescript
// Direct integration!
const { API } = require('zca-js');
const api = new API(cookies, imei, userAgent);
await api.sendMessage(userId, message);
```

**Benefits**:
- ❌ No bridge needed
- ✅ Type-safe TypeScript
- ✅ Better performance
- ✅ Easier debugging

---

## 📝 Commands

```bash
npm run start:dev    # Development
npm run build        # Build
npm run start:prod   # Production
npm run test         # Tests
npm run lint         # Linting
```

---

## 📊 Progress

| Component | Status | %  |
|-----------|--------|----|
| Setup | ✅ | 100% |
| Database | ✅ | 100% |
| Auth | ✅ | 100% |
| Zalo API | ✅ | 100% |
| Browser | ⏳ | 0% |
| Campaigns | ⏳ | 0% |
| CRUD | ⏳ | 0% |
| **Total** | 🚧 | **50%** |

---

## 📖 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Setup & testing guide
- **[../MIGRATION_PROGRESS.md](../MIGRATION_PROGRESS.md)** - Detailed migration progress

---

## 🔧 Environment

Copy `.env` (đã có sẵn):

```env
PORT=8000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=akabiz_clone
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
```

---

## 🤝 Next Steps

1. Start Docker services
2. Test Zalo API
3. Implement browser service
4. Build campaign system
5. Create CRUD modules

---

**Made with ❤️ using NestJS + zca-js**

For more info: See [QUICK_START.md](./QUICK_START.md)
