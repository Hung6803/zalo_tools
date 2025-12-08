# Test Plan - Zalo Marketing Desktop Application

## 1. AUTHENTICATION & ACCOUNT MANAGEMENT

### 1.1 Zalo Login
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-001 | Login with valid QR code | 1. Click "Thêm tài khoản"<br>2. Scan QR with Zalo app<br>3. Approve login | Account added to dashboard, displays in account list | High | Done
| AUTH-002 | Login timeout | 1. Open QR dialog<br>2. Wait without scanning (>5 min) | QR expires, show error message | Medium | D
| AUTH-003 | Cancel login | 1. Click "Thêm tài khoản"<br>2. Click cancel/close dialog | Dialog closes, no account added | Low | D
| AUTH-004 | Multiple accounts | 1. Add account A<br>2. Add account B<br>3. Switch between accounts | Both accounts active, can switch seamlessly | High | D
| AUTH-005 | Logout account | 1. Select account<br>2. Click logout<br>3. Confirm | Account removed from list, cookies cleared | High | D
| AUTH-006 | Session persistence | 1. Login account<br>2. Close app<br>3. Reopen app | Account still logged in, no re-login required | High | D

### 1.2 Account Display
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ACC-001 | Display account info | Select account | Shows avatar, display name, phone number, userId | High | D
| ACC-002 | Account status | View account card | Shows "Đang hoạt động" chip | Medium | D
| ACC-003 | Empty state | No accounts logged in | Shows "Chưa có tài khoản" message | Medium | D

---

## 2. DASHBOARD & NAVIGATION (LAST)

### 2.1 Navigation Menu
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| NAV-001 | Access all menu items | Click each menu item | Correct panel loads without errors | High |
| NAV-002 | Menu highlighting | Click "Tài khoản" | Menu item highlighted/selected | Low |
| NAV-003 | Drawer toggle | Click menu icon | Drawer opens/closes smoothly | Medium |
| NAV-004 | No account selected | Click feature requiring account | Shows "Vui lòng chọn tài khoản Zalo" | High |

### 2.2 Sync Functionality
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SYNC-001 | Manual sync | Click "Đồng bộ" button | Syncs data, shows success message | High |
| SYNC-002 | Auto sync | Wait 30 seconds | Auto-refreshes accounts & sync status | Medium |
| SYNC-003 | Sync status display | View header | Shows "Chưa đồng bộ: X" count | Medium |
| SYNC-004 | Sync during operation | Start sync while campaign running | Doesn't interrupt running operations | High |

---

## 3. CONTACTS MANAGEMENT

### 3.1 View Contacts
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CON-001 | View all contacts | Navigate to "Danh bạ" | Displays contact list with avatar, name, userId, phone | High |
| CON-002 | Empty contacts | No contacts exist | Shows "Chưa có contact nào" message | Medium |
| CON-003 | Pagination | Add 100+ contacts | Pagination works (25/50/100 per page) | High |
| CON-004 | Contact count | View header | Shows "Tổng số: X contacts" | Low |

### 3.2 Search & Filter
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| FIL-001 | Search by name | Enter "Nguyen" in search | Shows only matching contacts | High |
| FIL-002 | Search by userId | Enter userId in search | Shows exact match | High |
| FIL-003 | Search by phone | Enter phone number | Shows matching contact | High |
| FIL-004 | Filter by group | Select group from dropdown | Shows only group members | High |
| FIL-005 | Combined filters | Search + group filter | Shows contacts matching both criteria | Medium |
| FIL-006 | Reset filters | Click "Đặt lại" | Clears all filters, shows all contacts | Medium |
| FIL-007 | No results | Search non-existent term | Shows "Không tìm thấy contact nào" | Low |

### 3.3 CRUD Operations
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CRU-001 | Create contact | 1. Click "Thêm Contact"<br>2. Fill userId, displayName<br>3. Submit | Contact created, appears in list | High |
| CRU-002 | Create without userId | Submit form without userId | Shows validation error | High |
| CRU-003 | Create without displayName | Submit form without displayName | Shows validation error | High |
| CRU-004 | Create with optional fields | Add phone + avatar URL | Contact created with all fields | Medium |
| CRU-005 | Edit contact | 1. Click context menu > Edit<br>2. Update displayName<br>3. Save | Contact updated in list | High |
| CRU-006 | Edit userId (disabled) | Open edit dialog | userId field is disabled | Medium |
| CRU-007 | Delete single contact | 1. Click context menu > Delete<br>2. Confirm | Contact removed from list | High |
| CRU-008 | Delete cancel | 1. Click delete<br>2. Cancel confirmation | Contact not deleted | Medium |
| CRU-009 | Duplicate userId | Create contact with existing userId | Updates existing contact (upsert) | High |

### 3.4 Bulk Operations
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| BLK-001 | Select all | Click select all checkbox | All contacts on page selected | High |
| BLK-002 | Select individual | Click individual checkboxes | Only selected contacts highlighted | Medium |
| BLK-003 | Bulk delete | 1. Select 5 contacts<br>2. Click bulk delete<br>3. Confirm | All selected contacts deleted | High |
| BLK-004 | Bulk assign to group | 1. Select contacts<br>2. Click "Thêm vào nhóm"<br>3. Select group | Contacts added to group | High |
| BLK-005 | Bulk action without selection | Click bulk action with 0 selected | Shows error "Vui lòng chọn ít nhất một contact" | Medium |

### 3.5 Import/Export
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| IMP-001 | Export contacts (all) | Click "Xuất CSV" | Downloads CSV with all contacts | High |
| IMP-002 | Export contacts (filtered) | 1. Apply filter<br>2. Click export | Downloads CSV with filtered contacts only | High |
| IMP-003 | Export format | Open exported CSV | Correct format: userId,displayName,phone,avatar | High |
| IMP-004 | Import valid CSV | 1. Click "Nhập CSV"<br>2. Select valid CSV file | Imports contacts, shows success count | High |
| IMP-005 | Import invalid CSV | Upload malformed CSV | Shows error count, imports valid rows | High |
| IMP-006 | Import empty CSV | Upload CSV with header only | Shows "Không nhập được contact nào" | Medium |
| IMP-007 | Import duplicate userId | Import CSV with existing userIds | Updates existing contacts (upsert) | High |
| IMP-008 | Import partial errors | CSV with some invalid rows | Shows "Đã nhập X contacts, Y lỗi" | Medium |

---

## 4. CONTACT GROUPS

### 4.1 CRUD Operations
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| GRP-001 | Create group | 1. Click "Tạo nhóm"<br>2. Enter name, description, color<br>3. Save | Group created, appears in list | High |
| GRP-002 | Create without name | Submit without name | Shows validation error | High |
| GRP-003 | Edit group | 1. Click edit<br>2. Update fields<br>3. Save | Group updated | High |
| GRP-004 | Delete empty group | Delete group with 0 members | Group deleted successfully | Medium |
| GRP-005 | Delete group with members | Delete group with members | Shows confirmation, deletes group + removes associations | High |
| GRP-006 | View group members | Click "Xem thành viên" | Shows list of all group members | High |

### 4.2 Member Management
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| MEM-001 | Add single contact | 1. Select group<br>2. Click "Thêm thành viên"<br>3. Select contact | Contact added to group | High |
| MEM-002 | Add multiple contacts | Add 10 contacts to group | All contacts added, member count updates | High |
| MEM-003 | Remove contact | 1. View members<br>2. Click remove<br>3. Confirm | Contact removed, count decreases | High |
| MEM-004 | Assign via bulk action | 1. Select contacts in Contacts panel<br>2. Bulk assign to group | Contacts added to group | High |
| MEM-005 | Member count accuracy | Add/remove members | Count always accurate in UI | Medium |

---

## 5. TEMPLATES

### 5.1 CRUD Operations
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TPL-001 | Create template | 1. Click "Tạo template"<br>2. Enter name, content<br>3. Save | Template created | High | D
| TPL-002 | Create with variables | Add {name}, {phone} in content | Variables detected and listed | High | D
| TPL-003 | Edit template | Update content and variables | Template updated | High | D
| TPL-004 | Delete template | 1. Click delete<br>2. Confirm | Template deleted | High | D
| TPL-005 | Delete template in use | Delete template used by campaign | Shows warning or prevents deletion | High | 

### 5.2 Variable Handling
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| VAR-001 | Detect variables | Type "Hello {name}" | Auto-detects {name} variable | High |
| VAR-002 | Multiple variables | Use {name}, {phone}, {company} | All variables listed | Medium |
| VAR-003 | Invalid variable syntax | Type {name (unclosed) | Handles gracefully | Low |

---

## 6. CAMPAIGNS

### 6.1 Campaign Creation
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CMP-001 | Create MESSAGE_TO_PHONE campaign | 1. Select campaign type<br>2. Choose template<br>3. Add recipients<br>4. Set delay/retry<br>5. Create | Campaign created in "draft" status | High |
| CMP-002 | Create without name | Submit without campaign name | Shows validation error | High |
| CMP-003 | Create without template (for message types) | Skip template selection | Shows error "yêu cầu chọn template" | High |
| CMP-004 | Create without recipients | Skip recipients | Shows error "Vui lòng thêm người nhận" | High |
| CMP-005 | Create with schedule | Set future datetime | Campaign created with "scheduled" status | High |
| CMP-006 | Create with contact group | Select contact group | Campaign associated with group | Medium |
| CMP-007 | Set rate limit | Set rate limit to 50/hour | Rate limit saved and displayed | Medium |

### 6.2 Campaign Types - Messaging
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| MSG-001 | MESSAGE_TO_PHONE execution | Run campaign with 5 phone numbers | Finds users, sends messages to all 5 | High |
| MSG-002 | MESSAGE_TO_FRIENDS execution | Run with friend list | Sends messages to all friends | High |
| MSG-003 | MESSAGE_TO_GROUP_MEMBERS | Run with group members | Sends private messages to each member | High |
| MSG-004 | MESSAGE_TO_GROUP | Run with group ID | Sends message to group chat | High |
| MSG-005 | MESSAGE_BIRTHDAY | Run on contact's birthday | Sends birthday message | Medium |

### 6.3 Campaign Types - Friend Requests
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| FRD-001 | FRIEND_REQUEST_PHONE | Run with 3 phone numbers | Sends friend requests to all 3 | High |
| FRD-002 | FRIEND_REQUEST_GROUP | Run with group members | Sends friend requests to members | High |
| FRD-003 | FRIEND_REQUEST_SUGGESTIONS | Run with limit 10 | Gets Zalo suggestions, sends 10 requests | High |
| FRD-004 | INVITE_FRIEND | Run invite campaign | Sends invitations | Medium |
| FRD-005 | CANCEL_INVITE_FRIEND | Run cancel campaign | Cancels sent requests | Medium |

### 6.4 Campaign Types - Group Management
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| GRM-001 | ADD_TO_GROUP | Add 5 users to group | All 5 added to group | High |
| GRM-002 | JOIN_GROUP_BY_LINK | Join 3 groups via links | Successfully joins all 3 groups | High |

### 6.5 Campaign Execution
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| EXE-001 | Start draft campaign | Click Play on draft campaign | Status changes to "running" | High |
| EXE-002 | Pause running campaign | Click Pause during execution | Status changes to "paused", execution pauses | High |
| EXE-003 | Resume paused campaign | Click Play on paused campaign | Resumes from where it stopped | High |
| EXE-004 | Stop running campaign | Click Stop | Status changes to "stopped", execution terminates | High |
| EXE-005 | Campaign completion | Let campaign finish all recipients | Status changes to "completed" | High |
| EXE-006 | Progress tracking | Monitor during execution | sentCount and failedCount update in real-time | High |
| EXE-007 | Retry on failure | Campaign with maxRetries=2 | Retries failed operations 2 times | High |
| EXE-008 | Delay between messages | Set delayMs=3000 | Waits 3 seconds between each message | High |
| EXE-009 | Only one campaign at a time | Try starting 2nd campaign while 1st running | 2nd campaign button disabled | High |

### 6.6 Campaign Management
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| MGT-001 | View campaign details | Click "Xem chi tiết" | Shows full campaign info in dialog | Medium |
| MGT-002 | Delete draft campaign | Delete campaign in draft status | Campaign deleted | High |
| MGT-003 | Delete running campaign (prevented) | Try delete running campaign | Delete button disabled/hidden | High |
| MGT-004 | Progress bar accuracy | Watch running campaign | Progress bar matches sentCount/totalRecipients | Medium |
| MGT-005 | Status color coding | View different statuses | draft=default, running=blue, completed=green, etc. | Low |

---

## 7. BULK SEND

### 7.1 Recipient Management
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| BLK-101 | Add recipient manually | Enter userId + variables | Recipient added to list | High |
| BLK-102 | Import recipients CSV | Upload CSV with userId + variables | All recipients imported | High |
| BLK-103 | Edit recipient | Click edit, change variables | Recipient updated | Medium |
| BLK-104 | Remove recipient | Click remove | Recipient deleted from list | Medium |
| BLK-105 | Variable validation | Add recipient with missing required variable | Shows warning | High |

### 7.2 Send Operations
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| SND-001 | Send to 10 recipients | Add 10, select template, send | All 10 messages sent successfully | High |
| SND-002 | Send with delay | Set 2 second delay | Waits 2s between each send | High |
| SND-003 | Variable replacement | Use template with {name}, send to 5 | Each message personalized correctly | High |
| SND-004 | Handle failures | Send to invalid userId | Marks as failed, continues with others | High |

---

## 8. MESSAGE HISTORY

### 8.1 View History
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| HIS-001 | View all messages | Navigate to history | Displays all sent messages with timestamps | High |
| HIS-002 | Pagination | Add 100+ messages | Pagination works (50/100/200 per page) | High |
| HIS-003 | Empty history | No messages sent | Shows "Không có tin nhắn nào" | Medium |

### 8.2 Search & Filter
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| HIS-101 | Search by content | Enter keyword in search | Shows messages containing keyword | High |
| HIS-102 | Search by recipient name | Enter recipient name | Shows messages to that recipient | High |
| HIS-103 | Search by phone | Enter phone number | Shows messages to that contact | High |
| HIS-104 | Filter by status | Select "Thành công" | Shows only successful messages | High |
| HIS-105 | Filter by date range | Set start + end date | Shows messages in date range | High |
| HIS-106 | Combined filters | Search + status + date | Shows messages matching all criteria | Medium |
| HIS-107 | Reset filters | Click "Đặt lại" | Clears all filters | Medium |

---

## 9. AUTO-REPLY RULES

### 9.1 CRUD Operations
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| AUT-001 | Create rule | 1. Click "Tạo quy tắc"<br>2. Enter name, keywords, reply<br>3. Save | Rule created | High |
| AUT-002 | Create without name | Submit without name | Shows validation error | High |
| AUT-003 | Create without keywords | Submit without keywords | Shows validation error | High |
| AUT-004 | Create without reply | Submit without reply message | Shows validation error | High |
| AUT-005 | Edit rule | Update keywords and reply | Rule updated | High |
| AUT-006 | Delete rule | Click delete, confirm | Rule deleted | High |

### 9.2 Keyword Management
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| KEY-001 | Add keyword | Type keyword, click add | Keyword added to list | High |
| KEY-002 | Add multiple keywords | Add 5 keywords | All 5 displayed as chips | Medium |
| KEY-003 | Remove keyword | Click X on keyword chip | Keyword removed | Medium |
| KEY-004 | Empty keywords | Remove all keywords | Shows validation on save | High |

### 9.3 Match Types
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| MAT-001 | Exact match | Keyword="hello", message="hello" | Matches and replies | High |
| MAT-002 | Exact match (case insensitive) | Keyword="Hello", message="HELLO" | Matches | High |
| MAT-003 | Contains match | Keyword="hello", message="hello world" | Matches | High |
| MAT-004 | Regex match | Keyword="\\d{10}", message="0123456789" | Matches phone pattern | High |
| MAT-005 | Invalid regex | Enter invalid regex pattern | Handles gracefully, shows error | Medium |

### 9.4 Priority System
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| PRI-001 | Priority ordering | Create 3 rules with different priorities | Rules ordered by priority DESC | High |
| PRI-002 | Increase priority | Click up arrow | Priority increases by 1 | Medium |
| PRI-003 | Decrease priority | Click down arrow | Priority decreases by 1 | Medium |
| PRI-004 | Higher priority matches first | 2 rules match same message | Higher priority rule's reply sent | High |

### 9.5 Active/Inactive
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| ACT-001 | Toggle inactive | Turn off active switch | Rule inactive, won't match | High |
| ACT-002 | Toggle active | Turn on active switch | Rule active again | High |
| ACT-003 | Inactive rule matching | Incoming message matches inactive rule | No auto-reply sent | High |

---

## 10. ANALYTICS DASHBOARD

### 10.1 Overview Stats
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| ANA-001 | View campaign stats | Navigate to analytics | Shows total/active/completed campaigns | High |
| ANA-002 | View message stats | Check messages sent card | Shows accurate count | High |
| ANA-003 | Success rate calculation | Send 80 success, 20 failed | Shows 80% success rate | High |
| ANA-004 | Success rate color | View progress bar at 90% | Bar is green (≥80%) | Medium |
| ANA-005 | Success rate color (medium) | View at 60% | Bar is orange (50-79%) | Medium |
| ANA-006 | Success rate color (low) | View at 30% | Bar is red (<50%) | Medium |

### 10.2 Date Range Filtering
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| DAT-001 | 7 days filter | Select "7 ngày qua" | Shows data from last 7 days | High |
| DAT-002 | 30 days filter | Select "30 ngày qua" | Shows data from last 30 days | High |
| DAT-003 | 90 days filter | Select "90 ngày qua" | Shows data from last 90 days | High |

### 10.3 Template Usage
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| TPL-201 | Top templates display | View template usage table | Shows top 10 most used templates | High |
| TPL-202 | Usage count | Check usage count column | Accurate count of campaigns using template | High |
| TPL-203 | Messages sent | Check messages sent column | Total messages sent with template | High |

### 10.4 Campaign Types
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| CMP-201 | Campaign type breakdown | View campaign types table | Shows count per campaign type | High |
| CMP-202 | Type labels | Check type names | Uses Vietnamese labels correctly | Medium |

### 10.5 Contact Groups Stats
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| GRP-201 | Top groups | View contact groups table | Shows top 10 groups by member count | High |
| GRP-202 | Member count | Check member count column | Accurate count for each group | High |

### 10.6 Auto-Reply Stats
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| AUT-201 | Total rules | View auto-reply stats | Shows total rules count | High |
| AUT-202 | Active rules | Check active count | Shows count of active rules | High |
| AUT-203 | Inactive rules | Check inactive count | Shows count of inactive rules | High |

---

## 11. SCRAPE GROUP

### 11.1 Scrape Operations
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| SCR-001 | Scrape group members | 1. Enter group URL<br>2. Click scrape | Fetches all group members | High |
| SCR-002 | Invalid group URL | Enter invalid URL | Shows error message | High |
| SCR-003 | Progress tracking | Scrape large group (100+ members) | Shows progress during scrape | Medium |
| SCR-004 | Save to contacts | After scrape, save members | Members added to contacts | High |

---

## 12. FIND USER

### 12.1 Search Operations
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| FND-001 | Find by phone number | Enter valid phone number | Returns user profile | High |
| FND-002 | Find non-existent user | Enter non-registered phone | Shows "Không tìm thấy" | High |
| FND-003 | Send message from results | Click "Gửi tin nhắn" | Redirects to send message panel with userId pre-filled | Medium |

---

## 13. SETTINGS

### 13.1 Configuration
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| SET-001 | View settings | Navigate to settings | Shows all configuration options | Medium |
| SET-002 | Update settings | Change setting, save | Setting persisted across sessions | Medium |

---

## 14. ERROR HANDLING & EDGE CASES

### 14.1 Network Errors
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| ERR-001 | API server offline | Stop backend, try operation | Shows user-friendly error message | High |
| ERR-002 | Network timeout | Simulate slow network | Shows timeout message after reasonable wait | High |
| ERR-003 | Retry mechanism | Transient network error during campaign | Retries according to maxRetries setting | High |

### 14.2 Data Validation
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| VAL-001 | Invalid phone format | Enter "abc" as phone | Shows validation error | High |
| VAL-002 | Required field empty | Submit form with required field empty | Shows "Vui lòng nhập..." error | High |
| VAL-003 | Negative numbers | Enter negative delay/retry | Rejects or converts to positive | Medium |
| VAL-004 | SQL injection attempt | Enter SQL in text fields | Properly escaped, no SQL injection | Critical |
| VAL-005 | XSS attempt | Enter `<script>alert('xss')</script>` | Properly escaped, no script execution | Critical |

### 14.3 Concurrent Operations
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| CON-001 | Multiple users editing same contact | 2 users edit same contact simultaneously | Last write wins, or conflict resolution | Medium |
| CON-002 | Database locks | Multiple writes to same record | Handles locks gracefully | Medium |

### 14.4 Performance
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| PRF-001 | Large contact list (10,000) | Load contacts | Loads within 3 seconds, pagination responsive | High |
| PRF-002 | Campaign with 1,000 recipients | Run campaign | Executes without memory leaks | High |
| PRF-003 | Import 5,000 contacts CSV | Import large CSV | Completes within 30 seconds | Medium |

---

## 15. SECURITY TESTING

### 15.1 Authentication Security
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| SEC-001 | Session hijacking | Try using another user's cookies | Rejected or logged out | Critical |
| SEC-002 | Expired session | Use expired cookie | Redirects to login | High |

### 15.2 Authorization
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| AUZ-001 | Access other account's data | Try accessing accountId=2 from accountId=1 | Access denied | Critical |
| AUZ-002 | Direct API access | Call API without authentication | Returns 401/403 | Critical |

### 15.3 Input Sanitization
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| SAN-001 | HTML in message content | Enter `<b>test</b>` in message | Rendered as text, not bold | High |
| SAN-002 | Special characters | Use emojis, Unicode in messages | Handled correctly | Medium |

---

## 16. CROSS-BROWSER & COMPATIBILITY

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|---|----------|
| BRW-001 | Chrome compatibility | Test all features in Chrome | All features work | High |
| BRW-002 | Firefox compatibility | Test all features in Firefox | All features work | High |
| BRW-003 | Edge compatibility | Test all features in Edge | All features work | Medium |
| BRW-004 | Electron renderer | Test in Electron desktop app | All features work | High |

---

## 17. REGRESSION TESTING

After any code change, run this subset of critical tests:

### 17.1 Smoke Test Suite
1. Login account
2. Create contact
3. Create template
4. Create and run simple campaign (3 recipients)
5. View message history
6. Create auto-reply rule
7. View analytics
8. Logout

### 17.2 Critical Path Tests
- All tests marked as "Critical" or "High" priority
- All campaign type execution tests (MSG-001 to GRM-002)
- All CRUD operation tests

---

## 18. TEST EXECUTION CHECKLIST

### Pre-Testing
- [ ] Backend server running on port 3001
- [ ] Frontend dev server running
- [ ] Database initialized with schema
- [ ] Test accounts available
- [ ] Test data prepared (contacts, templates)

### During Testing
- [ ] Record all bugs with screenshots
- [ ] Note performance issues
- [ ] Check console for errors
- [ ] Verify database state after operations

### Post-Testing
- [ ] Generate test report
- [ ] Calculate pass/fail rate
- [ ] Prioritize bugs for fixing
- [ ] Update test cases based on findings

---

## 19. AUTOMATION STRATEGY

### Unit Tests (Jest + React Testing Library)
- Component rendering tests
- Form validation tests
- Utility function tests

### Integration Tests (Jest)
- API endpoint tests
- Database operation tests
- Service layer tests

### E2E Tests (Playwright/Cypress)
- Complete user workflows
- Campaign execution flows
- Multi-step operations

### Example Test Files to Create:
```
tests/
├── unit/
│   ├── components/
│   │   ├── ContactsPanel.test.tsx
│   │   ├── CampaignsPanel.test.tsx
│   │   └── AnalyticsDashboard.test.tsx
│   └── utils/
│       └── validation.test.ts
├── integration/
│   ├── api/
│   │   ├── contacts.test.ts
│   │   ├── campaigns.test.ts
│   │   └── analytics.test.ts
│   └── db/
│       └── local-db.test.ts
└── e2e/
    ├── login.spec.ts
    ├── contacts-crud.spec.ts
    ├── campaign-execution.spec.ts
    └── bulk-operations.spec.ts
```

---

## 20. BUG SEVERITY LEVELS

- **Critical**: System crash, data loss, security breach
- **High**: Feature completely broken, major functionality impaired
- **Medium**: Feature partially broken, workaround exists
- **Low**: Minor UI issue, cosmetic problem
- **Trivial**: Typos, minor text issues

---

## TEST METRICS TO TRACK

1. **Coverage**: % of code covered by tests
2. **Pass Rate**: Tests passed / Total tests
3. **Defect Density**: Bugs found / Test cases executed
4. **Test Execution Time**: Time to run full test suite
5. **Mean Time to Failure**: Average time before finding a bug
6. **Defect Removal Efficiency**: Bugs fixed / Bugs found

---

## EXPECTED OUTCOMES

- **Pass Criteria**: ≥95% of High priority tests pass
- **Performance**: All operations complete within acceptable time
- **Security**: No Critical/High security vulnerabilities
- **Stability**: No crashes during 1 hour continuous use
- **Usability**: All features accessible and intuitive
