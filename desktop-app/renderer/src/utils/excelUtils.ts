import * as XLSX from 'xlsx';

export interface ExcelContact {
  userId: string;
  displayName: string;
  phoneNumber?: string;
  avatar?: string;
}

export interface ExcelRecipient {
  userId: string; // This can be either actual userId or phone number (for backward compatibility)
  zaloId?: string; // Optional Zalo User ID from [ZALOID] column
  displayName: string;
  phoneNumber?: string; // Optional phone number from [MOBILE] column
  [key: string]: string | undefined; // For template variables
}

/**
 * Import contacts from Excel file
 * Expected columns: userId, displayName, phoneNumber (optional), avatar (optional)
 */
export const importContactsFromExcel = async (file: File): Promise<ExcelContact[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

        // Validate and map data
        const contacts: ExcelContact[] = jsonData
          .filter((row) => row.userId && row.displayName) // Filter rows with required fields
          .map((row) => ({
            userId: String(row.userId).trim(),
            displayName: String(row.displayName).trim(),
            phoneNumber: row.phoneNumber ? String(row.phoneNumber).trim() : undefined,
            avatar: row.avatar ? String(row.avatar).trim() : undefined,
          }));

        if (contacts.length === 0) {
          reject(new Error('Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra file Excel có các cột: userId, displayName'));
        } else {
          resolve(contacts);
        }
      } catch (error: any) {
        reject(new Error(`Lỗi đọc file Excel: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Lỗi đọc file'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * Export contacts to Excel file
 */
export const exportContactsToExcel = (
  contacts: ExcelContact[],
  filename: string = 'contacts.xlsx',
) => {
  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(contacts);

  // Format all cells as text to prevent Excel from converting phone numbers and IDs
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[cellAddress]) continue;

      // Set cell format to text (@)
      worksheet[cellAddress].z = '@';
      worksheet[cellAddress].t = 's'; // Force type to string
    }
  }

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // userId
    { wch: 25 }, // displayName
    { wch: 15 }, // phoneNumber
    { wch: 15 }, // avatar
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

  // Download file
  XLSX.writeFile(workbook, filename);
};

/**
 * Download Excel template for contacts
 */
export const downloadContactsTemplate = () => {
  const templateData = [
    {
      userId: '84912345678',
      displayName: 'Nguyễn Văn A',
      phoneNumber: '0912345678',
      avatar: '',
    },
    {
      userId: '84987654321',
      displayName: 'Trần Thị B',
      phoneNumber: '0987654321',
      avatar: '',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Format all cells as text to prevent Excel from converting phone numbers and IDs
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[cellAddress]) continue;

      // Set cell format to text (@)
      worksheet[cellAddress].z = '@';
      worksheet[cellAddress].t = 's'; // Force type to string
    }
  }

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

  XLSX.writeFile(workbook, 'contacts_template.xlsx');
};

/**
 * Import recipients with template variables from Excel
 * Supports two formats:
 * 1. Old format: userId, displayName, [template vars]
 * 2. New format: [ZALOID], [FULLNAME], [MOBILE], [INFO1], [INFO2], etc.
 *
 * Priority: If [ZALOID] exists, use it directly. Otherwise, use userId or [MOBILE].
 */
export const importRecipientsFromExcel = async (
  file: File,
  templateVariables: string[],
): Promise<ExcelRecipient[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

        // Check which format is being used
        const hasNewFormat = jsonData.length > 0 && '[ZALOID]' in jsonData[0];

        // Validate and parse recipients
        const recipients: ExcelRecipient[] = jsonData
          .filter((row) => {
            if (hasNewFormat) {
              // New format: Require either [ZALOID] or [MOBILE], and [FULLNAME]
              return (row['[ZALOID]'] || row['[MOBILE]']) && row['[FULLNAME]'];
            } else {
              // Old format: Require userId and displayName
              return row.userId && row.displayName;
            }
          })
          .map((row) => {
            let recipient: ExcelRecipient;

            if (hasNewFormat) {
              // New format parsing
              const zaloId = row['[ZALOID]'] ? String(row['[ZALOID]']).trim() : undefined;
              const phoneNumber = row['[MOBILE]'] ? String(row['[MOBILE]']).trim() : undefined;
              const fullName = String(row['[FULLNAME]']).trim();

              recipient = {
                userId: zaloId || phoneNumber || '', // userId = zaloId if available, else phoneNumber
                zaloId: zaloId,
                displayName: fullName,
                phoneNumber: phoneNumber,
              };

              // Add template variables from [INFO1], [INFO2], etc.
              templateVariables.forEach((varName) => {
                const excelColName = `[${varName}]`;
                if (row[excelColName]) {
                  recipient[varName] = String(row[excelColName]).trim();
                }
              });
            } else {
              // Old format parsing
              recipient = {
                userId: String(row.userId).trim(),
                displayName: String(row.displayName).trim(),
              };

              // Add template variables
              templateVariables.forEach((varName) => {
                if (row[varName]) {
                  recipient[varName] = String(row[varName]).trim();
                }
              });
            }

            return recipient;
          });

        if (recipients.length === 0) {
          reject(
            new Error(
              'Không tìm thấy dữ liệu hợp lệ. File Excel phải có:\n' +
              '- Format mới: [ZALOID] hoặc [MOBILE], và [FULLNAME]\n' +
              '- Format cũ: userId và displayName'
            )
          );
        } else {
          resolve(recipients);
        }
      } catch (error: any) {
        reject(new Error(`Lỗi đọc file Excel: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Lỗi đọc file'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * Download Excel template for bulk send with template variables
 * Dynamically generates columns based on template variables
 *
 * Base columns (always included):
 * - [ZALOID]: Optional - use if available (from group member export). Leave blank for normal use.
 * - [MOBILE]: Phone number - required if ZALOID is blank
 * - [FULLNAME]: Display name - always required
 *
 * Zalo default variables (auto-filled from Zalo, not needed in Excel):
 * - FULLNAME_WEB, FULLNAME_ORIGINAL, vocative_web, Vocative_web, VOCATIVE_WEB
 *
 * Custom variables (added if used in template):
 * - INFO1, INFO2, INFO3, INFO4, and any other custom variables
 */
export const downloadBulkSendTemplate = (templateVariables: string[]) => {
  // Base columns: always include ZALOID (optional), MOBILE, and FULLNAME
  const sampleData: any = {
    '[ZALOID]': '', // Leave blank for normal use. Only fill if you have ZaloID (from group export)
    '[MOBILE]': '0912345678',
    '[FULLNAME]': 'Nguyễn Văn A',
  };

  // Zalo default variables - these are automatically fetched from Zalo, don't need in Excel
  const zaloDefaultVariables = [
    'FULLNAME_WEB',
    'FULLNAME_ORIGINAL',
    'vocative_web',
    'Vocative_web',
    'VOCATIVE_WEB',
  ];

  // Sample values for common template variables
  const sampleValues: Record<string, string> = {
    'INFO1': 'Giá trị mẫu 1',
    'INFO2': 'Giá trị mẫu 2',
    'INFO3': 'Giá trị mẫu 3',
    'INFO4': 'Giá trị mẫu 4',
  };

  // Add columns for each template variable (excluding already added base columns and Zalo default variables)
  templateVariables.forEach((varName) => {
    // Skip if already added as base column
    if (varName === 'MOBILE' || varName === 'FULLNAME') {
      return;
    }

    // Skip Zalo default variables - they are auto-filled from Zalo profile
    if (zaloDefaultVariables.includes(varName)) {
      return;
    }

    const sampleValue = sampleValues[varName] || `Giá trị mẫu cho ${varName}`;
    sampleData[`[${varName}]`] = sampleValue;
  });

  // Add the sample row plus 99 empty rows (100 rows total) for user to fill
  const templateData = [sampleData];
  const columnKeys = Object.keys(sampleData);

  // Add 99 empty rows with same structure
  for (let i = 0; i < 99; i++) {
    const emptyRow: any = {};
    columnKeys.forEach(key => {
      emptyRow[key] = '';
    });
    templateData.push(emptyRow);
  }

  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Format ALL cells as text to prevent Excel from converting phone numbers
  // This includes all 100 rows so users can fill any row without losing leading zeros
  const numCols = columnKeys.length;
  const numRows = 101; // Header + 100 data rows

  for (let R = 0; R < numRows; ++R) {
    for (let C = 0; C < numCols; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });

      // Create cell if it doesn't exist
      if (!worksheet[cellAddress]) {
        worksheet[cellAddress] = { t: 's', v: '' };
      }

      // Set cell format to text (@)
      worksheet[cellAddress].z = '@';
      worksheet[cellAddress].t = 's'; // Force type to string
    }
  }

  // Auto width for all columns
  const colWidths = Object.keys(sampleData).map(() => ({ wch: 20 }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recipients');

  XLSX.writeFile(workbook, 'bulk_send_template.xlsx');
};

/**
 * Export group members to Excel with campaign format
 * Format: [ZALOID], [FULLNAME], [MOBILE], [INFO1], [INFO2], [INFO3], [INFO4]
 */
export const exportGroupMembersToExcel = (
  members: Array<{ userId: string; displayName: string; phoneNumber?: string; avatar?: string }>,
  filename: string = 'group_members.xlsx',
) => {
  // Transform members to campaign format
  const campaignData = members.map((member) => ({
    '[ZALOID]': member.userId,
    '[FULLNAME]': member.displayName,
    '[MOBILE]': member.phoneNumber || '',
    '[INFO1]': '',
    '[INFO2]': '',
    '[INFO3]': '',
    '[INFO4]': '',
  }));

  // Add 20 empty rows for users to manually add more data
  const columnKeys = ['[ZALOID]', '[FULLNAME]', '[MOBILE]', '[INFO1]', '[INFO2]', '[INFO3]', '[INFO4]'];
  for (let i = 0; i < 20; i++) {
    const emptyRow: any = {};
    columnKeys.forEach(key => {
      emptyRow[key] = '';
    });
    campaignData.push(emptyRow);
  }

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(campaignData);

  // Format ALL cells as text to prevent Excel from converting phone numbers and IDs
  const numCols = columnKeys.length;
  const numRows = members.length + 21; // Data rows + header + 20 empty rows

  for (let R = 0; R < numRows; ++R) {
    for (let C = 0; C < numCols; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });

      // Create cell if it doesn't exist
      if (!worksheet[cellAddress]) {
        worksheet[cellAddress] = { t: 's', v: '' };
      }

      // Set cell format to text (@)
      worksheet[cellAddress].z = '@';
      worksheet[cellAddress].t = 's'; // Force type to string
    }
  }

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // [ZALOID]
    { wch: 25 }, // [FULLNAME]
    { wch: 15 }, // [MOBILE]
    { wch: 20 }, // [INFO1]
    { wch: 20 }, // [INFO2]
    { wch: 20 }, // [INFO3]
    { wch: 20 }, // [INFO4]
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Group Members');

  // Download file
  XLSX.writeFile(workbook, filename);
};
