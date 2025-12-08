const fs = require('fs');

const filePath = 'D:\\Project\\SourceCode\\clone_akaBiz\\desktop-app\\worker\\zalo-client.ts';

let content = fs.readFileSync(filePath, 'utf8');

// Fix the escaped newlines
const oldText = `const memberRecords = members.map((member: any) => ({\\n            accountId,\\n            groupId,\\n            userId: member.userId,\\n            displayName: member.displayName,\\n            avatar: member.avatar,\\n            role: member.role,\\n            synced: 0,\\n          }));\\n          this.db.insertGroupMembers(memberRecords);`;

const newText = `const memberRecords = members.map((member: any) => ({
            accountId,
            groupId,
            userId: member.userId,
            displayName: member.displayName,
            avatar: member.avatar,
            role: member.role,
            synced: 0,
          }));
          this.db.insertGroupMembers(memberRecords);`;

content = content.replace(oldText, newText);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed database save method!');
