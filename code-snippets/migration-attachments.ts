// MIGRATION: Add attachments column to templates table
// Thêm đoạn code này vào file: desktop-app/worker/local-db.ts
// Vị trí: Sau migration campaignType (dòng ~313)

// Migration: Add attachments column to templates table if missing
try {
  const templateColumns = this.db.pragma('table_info(templates)') as Array<{ name: string }>;
  const hasAttachments = templateColumns.some((col) => col.name === 'attachments');

  if (!hasAttachments) {
    console.log('📝 Running migration: Adding attachments column to templates table');
    this.db.exec(`ALTER TABLE templates ADD COLUMN attachments TEXT`);
    console.log('✅ Migration completed: attachments column added');
  }
} catch (error) {
  console.error('❌ Migration error (templates.attachments):', error);
}
