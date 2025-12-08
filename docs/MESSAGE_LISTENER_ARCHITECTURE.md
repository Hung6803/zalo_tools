# Message Listener Architecture - Lắng Nghe Tin Nhắn Từ Nhiều Tài Khoản

Phân tích và thiết kế hệ thống lắng nghe tin nhắn real-time từ nhiều tài khoản Zalo đồng thời.

## 📋 Mục Lục

- [Khả Năng Thực Hiện](#khả-năng-thực-hiện)
- [Kiến Trúc Đề Xuất](#kiến-trúc-đề-xuất)
- [Implementation Options](#implementation-options)
- [Challenges & Solutions](#challenges--solutions)
- [Code Examples](#code-examples)
- [Performance Analysis](#performance-analysis)
- [Recommendations](#recommendations)

---

## Khả Năng Thực Hiện

### ✅ **CÓ THỂ** - Hoàn toàn khả thi!

**Lý do**:

1. **zca-js hỗ trợ message listener**
   ```javascript
   // zca-js có sẵn event listener
   api.listener.on('message', (message) => {
       console.log('New message:', message);
   });
   ```

2. **Node.js hỗ trợ multiple concurrent connections**
   - Có thể chạy nhiều Zalo clients cùng lúc
   - Event loop xử lý async tốt

3. **Architecture hiện tại đã sẵn sàng**
   - Session management đã có
   - Multi-account support đã có
   - Database models đã có

### ⚠️ **Thách Thức**

1. **Resource Usage**
   - Mỗi account = 1 WebSocket connection
   - 10 accounts = 10 connections đồng thời
   - Memory & CPU tăng theo số accounts

2. **Connection Management**
   - Reconnect khi mất kết nối
   - Handle session expiry
   - Load balancing

3. **Message Processing**
   - Lưu messages vào database
   - Trigger auto-reply rules
   - Real-time notifications

---

## Kiến Trúc Đề Xuất

### **Option 1: Single Process Multi-Listener** ⭐ RECOMMENDED

```
┌────────────────────────────────────────────────────────────┐
│                 Message Listener Service                   │
│                  (Node.js Long-Running)                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Account1 │  │ Account2 │  │ Account3 │  │ AccountN │ │
│  │ Listener │  │ Listener │  │ Listener │  │ Listener │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │             │             │             │        │
│       └─────────────┴─────────────┴─────────────┘        │
│                          │                                │
│                    Event Queue                            │
│                          │                                │
└──────────────────────────┼────────────────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ Message Queue  │
                  │   (Redis)      │
                  └────────┬───────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  FastAPI       │
                  │  Backend       │
                  └────────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    Save to DB      Trigger Auto     Send Webhook
                     Reply Rules      Notifications
```

**Ưu điểm**:
- ✅ Hiệu quả resources (1 process cho tất cả)
- ✅ Dễ quản lý và monitor
- ✅ Shared memory giữa các listeners
- ✅ Centralized logging

**Nhược điểm**:
- ⚠️ Single point of failure
- ⚠️ Khó scale horizontally

---

### **Option 2: Multiple Worker Processes**

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Listener       │  │  Listener       │  │  Listener       │
│  Worker 1       │  │  Worker 2       │  │  Worker N       │
│                 │  │                 │  │                 │
│ Accounts: 1,2,3 │  │ Accounts: 4,5,6 │  │ Accounts: 7,8,9 │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Redis Queue      │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  FastAPI Backend   │
                    └────────────────────┘
```

**Ưu điểm**:
- ✅ Horizontal scaling dễ dàng
- ✅ Fault isolation (1 worker fail không ảnh hưởng khác)
- ✅ Load balancing tốt

**Nhược điểm**:
- ⚠️ Phức tạp hơn trong deployment
- ⚠️ Tốn resources hơn

---

### **Option 3: Celery Workers** (Integration với hệ thống hiện tại)

```
┌─────────────────────────────────────────────────────────┐
│              Celery Beat (Scheduler)                    │
│  - Schedule: Check accounts every 10 seconds            │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│          Celery Workers (Listener Tasks)                │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │ Listen     │  │ Listen     │  │ Listen     │       │
│  │ Task       │  │ Task       │  │ Task       │       │
│  │ Account 1  │  │ Account 2  │  │ Account N  │       │
│  └────────────┘  └────────────┘  └────────────┘       │
└─────────────────────────────────────────────────────────┘
```

**Ưu điểm**:
- ✅ Tích hợp với infrastructure hiện tại (Celery + Redis)
- ✅ Task scheduling sẵn có
- ✅ Retry mechanism built-in

**Nhược điểm**:
- ⚠️ Không thực sự real-time (polling-based)
- ⚠️ Delay có thể lên đến 10-30 seconds

---

## Implementation Options

### **Approach A: Real-Time WebSocket Listener** ⭐ BEST

**Cách hoạt động**: Giữ kết nối WebSocket mở liên tục, nhận messages ngay lập tức.

**Flow**:
```
1. Start Listener Service
   → Load all active accounts from database
   → For each account: Create Zalo client + Start listener

2. On Message Received
   → Parse message data
   → Publish to Redis queue
   → FastAPI workers pick up and process

3. Processing
   → Save to database
   → Check auto-reply rules
   → Send notifications
   → Update statistics
```

**Code Structure**:
```javascript
// message-listener.js
class MultiAccountListener {
    constructor() {
        this.listeners = new Map();
        this.isRunning = false;
    }

    async start() {
        const accounts = await this.loadActiveAccounts();

        for (const account of accounts) {
            await this.startAccountListener(account.id);
        }

        this.isRunning = true;
        console.log(`Started ${this.listeners.size} listeners`);
    }

    async startAccountListener(accountId) {
        const client = new ZaloClient();
        await client.login(accountId);

        // Start listening
        client.api.listener.on('message', (msg) => {
            this.handleMessage(accountId, msg);
        });

        client.api.listener.start();
        this.listeners.set(accountId, client);
    }

    async handleMessage(accountId, message) {
        // Publish to Redis
        await redis.publish('zalo:messages', JSON.stringify({
            account_id: accountId,
            message: message,
            timestamp: Date.now()
        }));
    }

    async stop() {
        for (const [accountId, client] of this.listeners) {
            client.api.listener.stop();
        }
        this.listeners.clear();
        this.isRunning = false;
    }
}

// Start service
const listener = new MultiAccountListener();
listener.start();
```

---

### **Approach B: Polling-Based (Simpler)**

**Cách hoạt động**: Định kỳ check messages mới (mỗi 5-10 giây).

**Flow**:
```
1. Celery Beat Schedule
   → Every 10 seconds: Run check_messages_task

2. Check Messages Task
   → For each active account
   → Call getMessages() to fetch new messages
   → Compare with last message timestamp
   → Process new messages

3. Processing
   → Same as Approach A
```

**Pros/Cons**:
- ✅ Đơn giản, dễ implement
- ✅ Ít resources hơn
- ⚠️ Có delay (5-10 giây)
- ⚠️ Nhiều API calls hơn

---

## Challenges & Solutions

### **Challenge 1: Session Management**

**Vấn đề**: Session có thể expire trong khi listener đang chạy.

**Giải pháp**:
```javascript
class SessionManager {
    async validateSession(accountId) {
        try {
            await client.api.getOwnId();
            return true;
        } catch (error) {
            // Session expired
            await this.refreshSession(accountId);
            return false;
        }
    }

    async refreshSession(accountId) {
        // Re-login with QR or stored credentials
        await client.login(accountId);
        // Restart listener
        await this.restartListener(accountId);
    }

    // Check sessions every 1 hour
    startSessionMonitoring() {
        setInterval(async () => {
            for (const accountId of this.listeners.keys()) {
                await this.validateSession(accountId);
            }
        }, 3600000); // 1 hour
    }
}
```

---

### **Challenge 2: Message Deduplication**

**Vấn đề**: Có thể nhận duplicate messages khi reconnect.

**Giải pháp**:
```python
# Use Redis to track processed messages
async def process_message(message):
    message_id = message['msgId']

    # Check if already processed
    if await redis.exists(f"msg:{message_id}"):
        return  # Skip duplicate

    # Mark as processed (TTL 24 hours)
    await redis.setex(f"msg:{message_id}", 86400, "1")

    # Process message
    await save_to_database(message)
    await check_auto_reply(message)
```

---

### **Challenge 3: Memory Management**

**Vấn đề**: 100 accounts = 100 connections = high memory usage.

**Giải pháp**:
```javascript
// Limit concurrent listeners
const MAX_LISTENERS_PER_PROCESS = 50;

class LoadBalancer {
    async distributeAccounts() {
        const accounts = await getActiveAccounts();
        const numProcesses = Math.ceil(accounts.length / MAX_LISTENERS_PER_PROCESS);

        for (let i = 0; i < numProcesses; i++) {
            const start = i * MAX_LISTENERS_PER_PROCESS;
            const end = start + MAX_LISTENERS_PER_PROCESS;
            const accountsChunk = accounts.slice(start, end);

            // Start worker process
            startListenerProcess(accountsChunk);
        }
    }
}
```

---

### **Challenge 4: Auto-Reply Integration**

**Vấn đề**: Làm sao trigger auto-reply rules khi nhận message?

**Giải pháp**:
```python
# message_processor.py
async def process_incoming_message(account_id: int, message: dict):
    # 1. Save to database
    db_message = ZaloMessage(
        account_id=account_id,
        sender_id=message['fromId'],
        content=message['content'],
        msg_id=message['msgId'],
        timestamp=datetime.fromtimestamp(message['ts'])
    )
    db.add(db_message)
    db.commit()

    # 2. Check auto-reply rules
    rules = db.query(ZaloAutoReply).filter(
        ZaloAutoReply.account_id == account_id,
        ZaloAutoReply.is_active == True
    ).order_by(ZaloAutoReply.priority.desc()).all()

    for rule in rules:
        if match_keyword(message['content'], rule.keywords, rule.match_type):
            # Send auto-reply
            await zalo_api.send_message(
                account_id=str(account_id),
                user_id=message['fromId'],
                message=rule.reply_content
            )

            # Update stats
            rule.triggered_count += 1
            rule.last_triggered_at = datetime.utcnow()
            db.commit()

            break  # First match wins

    # 3. Send notification (if enabled)
    await send_webhook_notification(account_id, message)
```

---

## Code Examples

### **Full Implementation: Message Listener Service**

```javascript
// zalo_listener/index.js
import { Zalo } from 'zca-js';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

class ZaloMessageListener {
    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            db: 3  // Use separate DB for listener
        });

        this.listeners = new Map();
        this.sessionPath = './data/sessions';
    }

    async loadActiveAccounts() {
        // Option 1: Load from Redis (cached)
        const accountsJson = await this.redis.get('active_accounts');
        if (accountsJson) {
            return JSON.parse(accountsJson);
        }

        // Option 2: Query database via HTTP API
        const response = await fetch('http://localhost:8000/api/accounts/zalo/active');
        const accounts = await response.json();

        // Cache for 5 minutes
        await this.redis.setex('active_accounts', 300, JSON.stringify(accounts));

        return accounts;
    }

    async startAccountListener(account) {
        try {
            console.log(`Starting listener for account ${account.id}: ${account.display_name}`);

            // Load session
            const sessionFile = path.join(this.sessionPath, `${account.id}.json`);
            if (!fs.existsSync(sessionFile)) {
                console.error(`Session file not found for account ${account.id}`);
                return false;
            }

            const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));

            // Create Zalo client
            const zalo = new Zalo({
                cookie: sessionData.cookie,
                imei: sessionData.imei,
                userAgent: sessionData.userAgent
            });

            // Verify session
            try {
                await zalo.getOwnId();
            } catch (error) {
                console.error(`Session expired for account ${account.id}`);
                await this.notifySessionExpired(account.id);
                return false;
            }

            // Setup message listener
            zalo.listener.on('message', async (message) => {
                await this.handleMessage(account.id, message);
            });

            // Setup error handler
            zalo.listener.on('error', (error) => {
                console.error(`Listener error for account ${account.id}:`, error);
                this.handleListenerError(account.id, error);
            });

            // Start listening
            await zalo.listener.start();

            // Store client reference
            this.listeners.set(account.id, {
                client: zalo,
                account: account,
                startedAt: Date.now(),
                messageCount: 0
            });

            console.log(`✓ Listener started for account ${account.id}`);
            return true;

        } catch (error) {
            console.error(`Failed to start listener for account ${account.id}:`, error);
            return false;
        }
    }

    async handleMessage(accountId, message) {
        try {
            // Increment message counter
            const listener = this.listeners.get(accountId);
            if (listener) {
                listener.messageCount++;
            }

            // Publish to Redis for backend processing
            const payload = {
                account_id: accountId,
                message: {
                    msgId: message.msgId,
                    fromId: message.uidFrom || message.fromId,
                    toId: message.uidTo || message.toId,
                    content: message.content || message.msg,
                    msgType: message.msgType,
                    timestamp: message.ts || Date.now(),
                    quote: message.quote,
                    mentions: message.mentions
                },
                received_at: Date.now()
            };

            // Publish to Redis pub/sub channel
            await this.redis.publish('zalo:incoming_messages', JSON.stringify(payload));

            // Also push to list for processing queue
            await this.redis.lpush('zalo:message_queue', JSON.stringify(payload));

            console.log(`Message received on account ${accountId} from ${payload.message.fromId}`);

        } catch (error) {
            console.error(`Error handling message for account ${accountId}:`, error);
        }
    }

    async handleListenerError(accountId, error) {
        const listener = this.listeners.get(accountId);
        if (!listener) return;

        // Attempt to reconnect
        console.log(`Attempting to reconnect account ${accountId}...`);

        setTimeout(async () => {
            try {
                // Stop old listener
                await listener.client.listener.stop();
                this.listeners.delete(accountId);

                // Restart
                await this.startAccountListener(listener.account);

            } catch (error) {
                console.error(`Failed to reconnect account ${accountId}:`, error);
            }
        }, 5000); // Wait 5 seconds before reconnecting
    }

    async notifySessionExpired(accountId) {
        // Notify backend that session expired
        await this.redis.publish('zalo:session_expired', JSON.stringify({
            account_id: accountId,
            timestamp: Date.now()
        }));
    }

    async start() {
        console.log('Starting Zalo Message Listener Service...');

        // Load active accounts
        const accounts = await this.loadActiveAccounts();
        console.log(`Found ${accounts.length} active accounts`);

        // Start listener for each account
        let successCount = 0;
        for (const account of accounts) {
            const success = await this.startAccountListener(account);
            if (success) successCount++;

            // Small delay between starts to avoid overwhelming
            await this.sleep(1000);
        }

        console.log(`✓ Started ${successCount}/${accounts.length} listeners successfully`);

        // Start monitoring
        this.startMonitoring();
    }

    startMonitoring() {
        // Check health every 5 minutes
        setInterval(() => {
            console.log('\n=== Listener Status ===');
            for (const [accountId, listener] of this.listeners) {
                const uptime = Math.floor((Date.now() - listener.startedAt) / 1000 / 60);
                console.log(`Account ${accountId}: ${listener.messageCount} messages, uptime: ${uptime} min`);
            }
            console.log('======================\n');
        }, 300000); // 5 minutes

        // Reload accounts list every 10 minutes (to detect new accounts)
        setInterval(async () => {
            console.log('Reloading active accounts...');
            const accounts = await this.loadActiveAccounts();

            // Start listeners for new accounts
            for (const account of accounts) {
                if (!this.listeners.has(account.id)) {
                    console.log(`New account detected: ${account.id}`);
                    await this.startAccountListener(account);
                }
            }

            // Stop listeners for removed accounts
            for (const [accountId, listener] of this.listeners) {
                const stillActive = accounts.find(a => a.id === accountId);
                if (!stillActive) {
                    console.log(`Account ${accountId} no longer active, stopping listener`);
                    await listener.client.listener.stop();
                    this.listeners.delete(accountId);
                }
            }
        }, 600000); // 10 minutes
    }

    async stop() {
        console.log('Stopping all listeners...');

        for (const [accountId, listener] of this.listeners) {
            try {
                await listener.client.listener.stop();
                console.log(`Stopped listener for account ${accountId}`);
            } catch (error) {
                console.error(`Error stopping listener for account ${accountId}:`, error);
            }
        }

        this.listeners.clear();
        await this.redis.quit();

        console.log('All listeners stopped');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start service
const listener = new ZaloMessageListener();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await listener.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await listener.stop();
    process.exit(0);
});

// Start
listener.start().catch(error => {
    console.error('Failed to start listener service:', error);
    process.exit(1);
});

export default ZaloMessageListener;
```

---

### **Backend: Message Processor**

```python
# app/services/message_processor.py
import asyncio
import json
from redis import Redis
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import SessionLocal
from app.models.zalo_message import ZaloMessage
from app.models.zalo_auto_reply import ZaloAutoReply
from app.services.zalo_api_service import ZaloAPIService

class MessageProcessor:
    """Process incoming Zalo messages from Redis queue"""

    def __init__(self):
        self.redis = Redis(host='localhost', port=6379, db=3, decode_responses=True)
        self.zalo_api = ZaloAPIService()

    async def start(self):
        """Start processing messages from Redis queue"""
        print("Starting message processor...")

        while True:
            try:
                # Block and wait for message (BRPOP with 1 second timeout)
                result = self.redis.brpop('zalo:message_queue', timeout=1)

                if result:
                    _, message_json = result
                    payload = json.loads(message_json)

                    await self.process_message(payload)

            except Exception as e:
                print(f"Error in message processor: {e}")
                await asyncio.sleep(1)

    async def process_message(self, payload: dict):
        """Process a single incoming message"""
        db = SessionLocal()

        try:
            account_id = payload['account_id']
            message = payload['message']

            print(f"Processing message from account {account_id}: {message.get('content', '')[:50]}")

            # 1. Check for duplicates
            existing = db.query(ZaloMessage).filter(
                ZaloMessage.msg_id == message['msgId']
            ).first()

            if existing:
                print(f"Duplicate message {message['msgId']}, skipping")
                return

            # 2. Save to database
            db_message = ZaloMessage(
                account_id=account_id,
                msg_id=message['msgId'],
                sender_id=message['fromId'],
                receiver_id=message['toId'],
                content=message.get('content', ''),
                msg_type=message.get('msgType', 'text'),
                timestamp=datetime.fromtimestamp(message['timestamp'] / 1000),
                direction='incoming',
                status='delivered'
            )

            db.add(db_message)
            db.commit()

            # 3. Check auto-reply rules
            await self.check_auto_reply(db, account_id, message)

            # 4. Send webhook notification (if configured)
            await self.send_webhook(account_id, message)

            print(f"✓ Message processed: {message['msgId']}")

        except Exception as e:
            print(f"Error processing message: {e}")
            db.rollback()

        finally:
            db.close()

    async def check_auto_reply(self, db: Session, account_id: int, message: dict):
        """Check and trigger auto-reply rules"""
        content = message.get('content', '').strip()

        if not content:
            return

        # Get active auto-reply rules for this account
        rules = db.query(ZaloAutoReply).filter(
            ZaloAutoReply.account_id == account_id,
            ZaloAutoReply.is_active == True
        ).order_by(ZaloAutoReply.priority.desc()).all()

        for rule in rules:
            # Check if message matches any keyword
            matched = False

            for keyword in rule.keywords:
                if rule.match_type == 'exact':
                    matched = content.lower() == keyword.lower()
                elif rule.match_type == 'contains':
                    matched = keyword.lower() in content.lower()
                elif rule.match_type == 'starts_with':
                    matched = content.lower().startswith(keyword.lower())
                elif rule.match_type == 'regex':
                    import re
                    matched = bool(re.search(keyword, content, re.IGNORECASE))

                if matched:
                    break

            if matched:
                # Send auto-reply
                print(f"Auto-reply triggered: {rule.name}")

                result = await self.zalo_api.send_message(
                    account_id=str(account_id),
                    user_id=message['fromId'],
                    message=rule.reply_content
                )

                if result.get('success'):
                    # Update rule statistics
                    rule.triggered_count += 1
                    rule.last_triggered_at = datetime.utcnow()
                    db.commit()

                    print(f"✓ Auto-reply sent")
                else:
                    print(f"✗ Auto-reply failed: {result.get('error')}")

                # First match wins
                break

    async def send_webhook(self, account_id: int, message: dict):
        """Send webhook notification for incoming message"""
        # TODO: Implement webhook system
        # This would call configured webhook URLs with message data
        pass


# Run processor
if __name__ == "__main__":
    processor = MessageProcessor()
    asyncio.run(processor.start())
```

---

## Performance Analysis

### **Resource Usage Estimates**

| Accounts | Memory | CPU | Network |
|----------|--------|-----|---------|
| 1 | ~50 MB | ~5% | ~10 KB/s |
| 10 | ~200 MB | ~15% | ~50 KB/s |
| 50 | ~800 MB | ~40% | ~200 KB/s |
| 100 | ~1.5 GB | ~60% | ~400 KB/s |

**Khuyến nghị**:
- **< 20 accounts**: Single process
- **20-50 accounts**: 2-3 worker processes
- **50+ accounts**: Distributed architecture với load balancer

### **Latency Analysis**

| Approach | Average Latency | 95th Percentile |
|----------|----------------|-----------------|
| Real-time WebSocket | 100-500 ms | 1-2 seconds |
| Polling (10s interval) | 5-10 seconds | 15 seconds |
| Polling (30s interval) | 15-30 seconds | 45 seconds |

---

## Recommendations

### ✅ **Khuyến Nghị Triển Khai**

#### **Phase 1: MVP (Recommended Start)**

1. **Implement Polling-Based Listener**
   - Celery task chạy mỗi 10-15 giây
   - Check messages mới cho tất cả active accounts
   - Process và trigger auto-reply

**Why**: Đơn giản, dễ implement, tích hợp với infrastructure hiện tại.

```python
# Quick implementation
@celery_app.task
def check_all_accounts_messages():
    accounts = db.query(ZaloAccount).filter(
        ZaloAccount.status == 'active'
    ).all()

    for account in accounts:
        messages = zalo_api.get_messages(account.id, limit=10)
        process_new_messages(account.id, messages)
```

#### **Phase 2: Real-Time Listener**

2. **Upgrade to WebSocket Real-Time**
   - Implement dedicated listener service (Node.js)
   - Redis pub/sub cho message queue
   - FastAPI processor workers

**Why**: Real-time response, better user experience.

#### **Phase 3: Scale & Optimize**

3. **Add Monitoring & Auto-Scaling**
   - Health checks cho listeners
   - Auto-restart failed connections
   - Distributed architecture nếu > 50 accounts

---

### 📊 **Decision Matrix**

| Số Accounts | Recommended Approach | Infrastructure |
|-------------|---------------------|----------------|
| 1-5 | Polling (30s) | Celery only |
| 5-20 | Polling (10s) | Celery + Redis |
| 20-50 | Real-time WebSocket | Node.js + Redis + Celery |
| 50+ | Multi-Worker Real-time | Distributed, Load Balancer |

---

## Kết Luận

### ✅ **CÓ THỂ** lắng nghe tin nhắn từ nhiều tài khoản cùng lúc!

**Cách tốt nhất**:

1. **Start Simple**: Polling-based với Celery (10-15s interval)
2. **Upgrade**: Real-time WebSocket listener khi cần latency thấp
3. **Scale**: Distributed architecture khi > 50 accounts

**Kiến trúc đề xuất cho hệ thống của bạn**:

```
Single Node.js Listener Service
  → Listen to all accounts (< 50 accounts)
  → Publish messages to Redis
  → FastAPI workers process messages
  → Trigger auto-reply rules
  → Save to database
```

**Next Steps**:
1. Tôi có thể implement polling-based listener (Phase 1) trước
2. Hoặc implement full real-time WebSocket listener (Phase 2)

Bạn muốn bắt đầu với approach nào?
