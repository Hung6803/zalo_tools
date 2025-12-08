# Campaign System Guide

Complete guide to using the akaBiz Clone campaign management system.

## Table of Contents

- [Overview](#overview)
- [Campaign Workflow](#campaign-workflow)
- [Creating Campaigns](#creating-campaigns)
- [Message Templates](#message-templates)
- [Auto-Reply System](#auto-reply-system)
- [Analytics & Reporting](#analytics--reporting)
- [Celery Workers](#celery-workers)

## Overview

The akaBiz Clone campaign system allows you to:
- Send bulk messages to Zalo users
- Target specific groups or contacts
- Schedule campaigns for future execution
- Use message templates with variables
- Track campaign performance
- Automatically reply to incoming messages

## Campaign Workflow

```
┌──────────────┐
│ Create       │
│ Campaign     │ (DRAFT status)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Configure    │ - Set targets (groups/contacts)
│ Campaign     │ - Choose template or write message
└──────┬───────┘ - Set schedule & rate limits
       │
       ▼
┌──────────────┐
│ Start        │ - Prepare recipients
│ Campaign     │ - Trigger Celery worker
└──────┬───────┘ (RUNNING status)
       │
       ▼
┌──────────────┐
│ Execute      │ - Send messages with delays
│ Campaign     │ - Track progress
└──────┬───────┘ - Handle errors
       │
       ▼
┌──────────────┐
│ Complete     │ (COMPLETED status)
│ Campaign     │ - View analytics
└──────────────┘
```

## Creating Campaigns

### API Endpoint

**POST** `/api/campaigns/`

### Request Body

```json
{
  "name": "Marketing Campaign 2024",
  "description": "Seasonal promotion for existing customers",
  "account_id": 1,
  "template_id": 5,
  "target_type": "groups",
  "target_groups": [1, 2, 3],
  "send_method": "api",
  "schedule_type": "scheduled",
  "scheduled_at": "2024-12-25T09:00:00",
  "messages_per_hour": 100,
  "delay_between_messages": 5
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Campaign name |
| `description` | string | Optional campaign description |
| `account_id` | int | Zalo account ID to use |
| `template_id` | int | Optional message template ID |
| `target_type` | enum | `"contacts"`, `"groups"`, or `"manual"` |
| `target_groups` | array | List of group IDs (for groups target) |
| `target_contacts` | array | List of contact IDs (for contacts target) |
| `send_method` | enum | `"api"` (fast) or `"browser"` (slow) |
| `schedule_type` | enum | `"immediate"` or `"scheduled"` |
| `scheduled_at` | datetime | When to send (for scheduled) |
| `messages_per_hour` | int | Rate limit (1-500) |
| `delay_between_messages` | int | Seconds between messages |

### Target Types

#### 1. Contacts Target

Target specific contacts you've saved:

```json
{
  "target_type": "contacts",
  "target_contacts": [1, 2, 3, 4, 5]
}
```

#### 2. Groups Target

Target all members from selected groups:

```json
{
  "target_type": "groups",
  "target_groups": [1, 2]
}
```

The system will automatically fetch all contacts from these groups.

#### 3. Manual Target

Add recipients manually via API:

```json
{
  "target_type": "manual"
}
```

Then use **POST** `/api/campaigns/{id}/recipients` to add recipients.

### Starting a Campaign

**POST** `/api/campaigns/{campaign_id}/start`

This endpoint:
1. Prepares recipients (creates CampaignRecipient records)
2. Updates campaign status to RUNNING
3. Triggers Celery worker for background execution

**Response:**

```json
{
  "message": "Campaign started successfully",
  "campaign_id": 123,
  "status": "running",
  "task_id": "abc123-def456",
  "recipients_prepared": 226
}
```

### Campaign Controls

#### Pause Campaign

**POST** `/api/campaigns/{campaign_id}/pause`

Pause a running campaign. The worker will stop after the current message.

#### Resume Campaign

**POST** `/api/campaigns/{campaign_id}/start`

Resume a paused campaign (if status is PAUSED).

#### Stop Campaign

**POST** `/api/campaigns/{campaign_id}/stop`

Stop a campaign permanently. Cannot be restarted.

## Message Templates

Templates allow you to create reusable message formats with variables.

### Creating a Template

**POST** `/api/templates/`

```json
{
  "name": "Welcome Message",
  "description": "Welcome new customers",
  "account_id": 1,
  "content": "Xin chào {name}! Cảm ơn bạn đã quan tâm đến sản phẩm của chúng tôi. Mã giảm giá của bạn là: {promo_code}",
  "category": "marketing",
  "is_active": true
}
```

### Variable Syntax

Use `{variable_name}` in your template content:

- `{name}` - Recipient's display name
- `{phone}` - Phone number
- `{group}` - Group name (for group targets)
- Custom variables - Any variable you define

### Preview Template

**POST** `/api/templates/preview`

```json
{
  "template_id": 5,
  "variables": {
    "name": "John Doe",
    "promo_code": "SAVE20"
  }
}
```

**Response:**

```json
{
  "template_id": 5,
  "original_content": "Xin chào {name}! ... {promo_code}",
  "rendered_content": "Xin chào John Doe! ... SAVE20",
  "variables_used": ["name", "promo_code"]
}
```

### Template Usage

Templates are automatically applied when:
1. Campaign has `template_id` set
2. Campaign has variables defined for recipients

Variables are provided per recipient:

```json
{
  "campaign_id": 123,
  "zalo_user_id": "123456",
  "variables": {
    "name": "Nguyen Van A",
    "promo_code": "DISCOUNT50"
  }
}
```

## Auto-Reply System

Automatically respond to incoming messages based on keywords.

### Creating Auto-Reply Rules

**POST** `/api/auto-replies/`

```json
{
  "name": "Price Inquiry Response",
  "account_id": 1,
  "keywords": ["giá", "price", "bao nhiêu"],
  "reply_content": "Bảng giá của chúng tôi:\n- Gói A: 100,000đ\n- Gói B: 200,000đ\n- Gói C: 300,000đ\n\nLiên hệ: 0123456789",
  "match_type": "contains",
  "is_active": true,
  "priority": 10
}
```

### Match Types

| Type | Description | Example |
|------|-------------|---------|
| `exact` | Exact match | "price" matches "price" only |
| `contains` | Contains keyword | "price" matches "what is the price?" |
| `starts_with` | Starts with keyword | "help" matches "help me" |
| `regex` | Regular expression | `"price\s+\d+"` matches "price 100" |

### Priority System

Rules are checked in priority order (highest first):
- Priority 10: High priority (checked first)
- Priority 5: Medium priority
- Priority 0: Low priority (checked last)

First matching rule wins.

### Testing Rules

**POST** `/api/auto-replies/test`

```json
{
  "message": "Cho tôi biết giá sản phẩm",
  "account_id": 1
}
```

**Response:**

```json
{
  "matched": true,
  "rule_id": 5,
  "rule_name": "Price Inquiry Response",
  "reply_content": "Bảng giá của chúng tôi..."
}
```

### Integration with Message Listener

To enable auto-reply, you need to:

1. Create a message listener service
2. Monitor incoming Zalo messages
3. Call the test endpoint to find matching rule
4. Send the reply if a rule matches
5. Call **POST** `/api/auto-replies/{rule_id}/increment-triggered` to track usage

## Analytics & Reporting

### Campaign Overview

**GET** `/api/analytics/campaigns/overview?account_id=1`

```json
{
  "total_campaigns": 50,
  "draft_campaigns": 5,
  "running_campaigns": 2,
  "completed_campaigns": 40,
  "failed_campaigns": 3,
  "paused_campaigns": 0,
  "total_messages_sent": 12500,
  "total_messages_failed": 250,
  "average_success_rate": 95.2
}
```

### Campaign Performance

**GET** `/api/analytics/campaigns/performance?account_id=1`

Returns detailed metrics for all campaigns:

```json
[
  {
    "campaign_id": 123,
    "campaign_name": "Marketing Campaign 2024",
    "total_recipients": 226,
    "sent_count": 220,
    "failed_count": 6,
    "pending_count": 0,
    "success_rate": 97.35,
    "started_at": "2024-12-01T10:00:00",
    "completed_at": "2024-12-01T10:30:00",
    "duration_minutes": 30.0
  }
]
```

### Campaign Details

**GET** `/api/analytics/campaigns/{campaign_id}/details`

Get detailed analytics for a specific campaign:

```json
{
  "campaign": {
    "id": 123,
    "name": "Marketing Campaign 2024",
    "status": "completed"
  },
  "metrics": {
    "total_recipients": 226,
    "sent_count": 220,
    "failed_count": 6,
    "success_rate": 97.35,
    "failure_rate": 2.65,
    "duration": {
      "hours": 0,
      "minutes": 30,
      "seconds": 15
    }
  },
  "status_breakdown": {
    "pending": 0,
    "sending": 0,
    "sent": 220,
    "failed": 6
  },
  "failed_recipients": [
    {
      "display_name": "User 1",
      "zalo_user_id": "123",
      "error": "User blocked your account"
    }
  ]
}
```

### Daily Statistics

**GET** `/api/analytics/campaigns/daily-stats?days=7&account_id=1`

Get daily stats for the last N days:

```json
[
  {
    "date": "2024-12-01",
    "messages_sent": 500,
    "messages_failed": 10,
    "campaigns_completed": 3
  },
  {
    "date": "2024-12-02",
    "messages_sent": 450,
    "messages_failed": 5,
    "campaigns_completed": 2
  }
]
```

### Auto-Reply Statistics

**GET** `/api/analytics/auto-replies/stats?account_id=1`

```json
{
  "total_rules": 15,
  "active_rules": 12,
  "inactive_rules": 3,
  "total_triggered": 1250,
  "most_triggered_rule": {
    "id": 5,
    "name": "Price Inquiry Response",
    "triggered_count": 450,
    "last_triggered_at": "2024-12-07T14:30:00"
  }
}
```

### Template Statistics

**GET** `/api/analytics/templates/stats?account_id=1`

```json
{
  "total_templates": 20,
  "active_templates": 18,
  "inactive_templates": 2,
  "most_used_template": {
    "id": 10,
    "name": "Welcome Message",
    "usage_count": 1500,
    "last_used_at": "2024-12-07T10:00:00"
  }
}
```

## Celery Workers

### Starting the Celery Worker

```bash
cd backend

# Windows
celery -A app.core.celery_app worker --loglevel=info --pool=solo

# Linux/Mac
celery -A app.core.celery_app worker --loglevel=info
```

### Worker Tasks

The campaign worker implements three tasks:

#### 1. `prepare_campaign_recipients_task`

Prepares recipients before campaign execution:
- Loads target groups/contacts
- Creates CampaignRecipient records
- Prepares variables for each recipient

#### 2. `execute_campaign_task`

Main campaign execution task:
- Fetches campaign and recipients
- Renders message templates
- Sends messages via Zalo API
- Updates progress in real-time
- Handles errors and retries
- Respects rate limiting

#### 3. `schedule_campaign_task`

Checks if scheduled campaigns should start:
- Checks scheduled_at timestamp
- Starts campaign if time arrived

### Monitoring Tasks

Check task status using the task ID:

```bash
# In Python
from celery.result import AsyncResult

result = AsyncResult(task_id, app=celery_app)
print(result.state)  # PENDING, STARTED, SUCCESS, FAILURE
print(result.info)   # Task metadata
```

### Rate Limiting

The worker implements automatic rate limiting:

- Delay between messages: `campaign.delay_between_messages` seconds
- Max messages per hour: `campaign.messages_per_hour`
- Pauses if campaign is paused/stopped
- Retries failed messages up to `max_retries` times

### Error Handling

The worker handles errors gracefully:

1. **Recipient-level errors**: Mark recipient as FAILED, continue with next
2. **Campaign-level errors**: Mark campaign as FAILED, stop execution
3. **Network errors**: Retry up to `max_retries` times with exponential backoff

## Best Practices

### 1. Rate Limiting

- Start with low rates (50-100 messages/hour)
- Monitor for Zalo API blocks
- Increase gradually if no issues

### 2. Message Content

- Keep messages short and personal
- Use templates for consistent messaging
- Test messages before bulk sending
- Include opt-out instructions

### 3. Target Selection

- Clean your contact lists regularly
- Remove users who opted out
- Segment your audience for better targeting

### 4. Scheduling

- Schedule campaigns during business hours
- Avoid weekends/holidays
- Consider time zones

### 5. Monitoring

- Check campaign progress regularly
- Review failed recipients
- Monitor success rates
- Adjust strategy based on analytics

## Troubleshooting

### Campaign Not Starting

1. Check campaign status (must be DRAFT or PAUSED)
2. Verify recipients were prepared successfully
3. Check Celery worker is running
4. Check Redis connection

### Messages Not Sending

1. Verify Zalo account is logged in
2. Check rate limits not exceeded
3. Review error messages in failed recipients
4. Test single message send first

### Worker Not Processing Tasks

1. Check Celery worker logs
2. Verify Redis broker is running
3. Check database connection
4. Restart Celery worker

### Low Success Rate

1. Review failed recipient errors
2. Check message content (spam filters)
3. Verify contacts are valid
4. Reduce sending rate

## API Reference

### Campaign Endpoints

- `POST /api/campaigns/` - Create campaign
- `GET /api/campaigns/` - List campaigns
- `GET /api/campaigns/{id}` - Get campaign
- `PUT /api/campaigns/{id}` - Update campaign
- `DELETE /api/campaigns/{id}` - Delete campaign
- `POST /api/campaigns/{id}/start` - Start campaign
- `POST /api/campaigns/{id}/pause` - Pause campaign
- `POST /api/campaigns/{id}/stop` - Stop campaign
- `GET /api/campaigns/{id}/recipients` - List recipients
- `POST /api/campaigns/{id}/recipients` - Add recipient

### Template Endpoints

- `POST /api/templates/` - Create template
- `GET /api/templates/` - List templates
- `GET /api/templates/{id}` - Get template
- `PUT /api/templates/{id}` - Update template
- `DELETE /api/templates/{id}` - Delete template
- `POST /api/templates/preview` - Preview template
- `POST /api/templates/{id}/duplicate` - Duplicate template

### Auto-Reply Endpoints

- `POST /api/auto-replies/` - Create rule
- `GET /api/auto-replies/` - List rules
- `GET /api/auto-replies/{id}` - Get rule
- `PUT /api/auto-replies/{id}` - Update rule
- `DELETE /api/auto-replies/{id}` - Delete rule
- `POST /api/auto-replies/test` - Test rule
- `POST /api/auto-replies/{id}/toggle` - Toggle active status

### Analytics Endpoints

- `GET /api/analytics/campaigns/overview` - Campaign overview
- `GET /api/analytics/campaigns/performance` - Performance metrics
- `GET /api/analytics/campaigns/{id}/details` - Campaign details
- `GET /api/analytics/campaigns/daily-stats` - Daily statistics
- `GET /api/analytics/auto-replies/stats` - Auto-reply stats
- `GET /api/analytics/templates/stats` - Template stats
- `GET /api/analytics/campaigns/{id}/export` - Export report

## Support

For issues and questions:
- GitHub Issues: [Project Repository]
- Documentation: `/docs` folder

---

**Generated with akaBiz Clone Campaign System** 🚀
