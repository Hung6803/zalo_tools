import re

file_path = r'D:\Project\SourceCode\clone_akaBiz\desktop-app\worker\zalo-client.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the escaped newlines
old_text = r"const memberRecords = members.map((member: any) => ({\n            accountId,\n            groupId,\n            userId: member.userId,\n            displayName: member.displayName,\n            avatar: member.avatar,\n            role: member.role,\n            synced: 0,\n          }));\n          this.db.insertGroupMembers(memberRecords);"

new_text = """const memberRecords = members.map((member: any) => ({
            accountId,
            groupId,
            userId: member.userId,
            displayName: member.displayName,
            avatar: member.avatar,
            role: member.role,
            synced: 0,
          }));
          this.db.insertGroupMembers(memberRecords);"""

content = content.replace(old_text, new_text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fixed database save method!")
