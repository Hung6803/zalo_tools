import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Avatar,
  Chip,
  Stack,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { GroupAdd, FileDownload, Person } from '@mui/icons-material';
import { scrapeGroup, getZaloAccounts, ZaloAccount } from '../api/localApi';
import { exportGroupMembersToExcel } from '../utils/excelUtils';

interface GroupMember {
  userId: string;
  displayName: string;
  avatar?: string;
  role?: string;
}

interface ScrapeGroupPanelProps {
  accountId?: number;
}

const ScrapeGroupPanel: React.FC<ScrapeGroupPanelProps> = ({ accountId: propAccountId }) => {
  // Account selection
  const [accounts, setAccounts] = useState<ZaloAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(propAccountId || null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [groupLink, setGroupLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<GroupMember[]>([]);
  const [success, setSuccess] = useState('');

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Update selectedAccountId when prop changes
  useEffect(() => {
    if (propAccountId) {
      setSelectedAccountId(propAccountId);
    }
  }, [propAccountId]);

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const data = await getZaloAccounts();
      const activeAccounts = data.filter(acc => acc.status === 'active');
      setAccounts(activeAccounts);

      if (!selectedAccountId && activeAccounts.length > 0) {
        setSelectedAccountId(activeAccounts[0].id);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSelectMember = (member: GroupMember) => {
    const exists = selectedMembers.some((m) => m.userId === member.userId);
    if (exists) {
      setSelectedMembers(selectedMembers.filter((m) => m.userId !== member.userId));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const handleScrape = async () => {
    if (!selectedAccountId) {
      setError('Vui lòng chọn tài khoản Zalo');
      return;
    }
    if (!groupLink.trim()) {
      setError('Vui lòng nhập link nhóm Zalo');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setMembers([]);
    setSelectedMembers([]);

    try {
      const result = await scrapeGroup(selectedAccountId, groupLink.trim());

      if (result.success && result.data?.members) {
        setMembers(result.data.members);
        setSuccess(`✅ Đã lấy thành công ${result.data.members.length} thành viên`);
      } else {
        setError(result.error || 'Không thể lấy danh sách thành viên');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while loading accounts
  if (loadingAccounts) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (accounts.length === 0) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 2 }}>Lấy danh sách thành viên nhóm</Typography>
        <Alert severity="warning">
          Chưa có tài khoản Zalo nào. Vui lòng đăng nhập tài khoản ở tab "Đăng nhập".
        </Alert>
      </Box>
    );
  }

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          Lấy danh sách thành viên nhóm
        </Typography>
        {/* Account Selector */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Tài khoản Zalo</InputLabel>
          <Select
            value={selectedAccountId || ''}
            onChange={(e) => setSelectedAccountId(e.target.value as number)}
            label="Tài khoản Zalo"
            renderValue={() => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar src={selectedAccount?.avatar} sx={{ width: 24, height: 24 }}>
                  <Person sx={{ fontSize: 16 }} />
                </Avatar>
                <span>{selectedAccount?.displayName || 'Chọn tài khoản'}</span>
              </Box>
            )}
          >
            {accounts.map((account) => (
              <MenuItem key={account.id} value={account.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar src={account.avatar} sx={{ width: 24, height: 24 }}>
                    <Person sx={{ fontSize: 16 }} />
                  </Avatar>
                  <span>{account.displayName}</span>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ p: 3, mt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Link nhóm Zalo"
          value={groupLink}
          onChange={(e) => setGroupLink(e.target.value)}
          placeholder="https://zalo.me/g/..."
          margin="normal"
          helperText="Nhập link mời hoặc link công khai của nhóm Zalo"
        />

        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} /> : <GroupAdd />}
          onClick={handleScrape}
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? 'Đang lấy dữ liệu...' : 'Lấy danh sách'}
        </Button>

        {loading && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Đang mở trình duyệt và thu thập dữ liệu. Quá trình này có thể mất vài phút...
          </Alert>
        )}

        {members.length > 0 && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              ⚠️ Không nên chọn Quản trị viên nhóm (Admin, Phó nhóm) khi xuất để gửi tin nhắn
            </Alert>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Chọn thành viên để xuất Excel ({selectedMembers.length}/{members.length})
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setSelectedMembers([...members])}
                >
                  Chọn tất cả
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    const nonAdminMembers = members.filter((m) => {
                      const roleUpper = m.role ? m.role.toUpperCase() : '';
                      return roleUpper !== 'OWNER' && roleUpper !== 'ADMIN';
                    });
                    setSelectedMembers(nonAdminMembers);
                  }}
                >
                  Chọn tất cả trừ admin
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<FileDownload />}
                  disabled={selectedMembers.length === 0}
                  onClick={() => {
                    const timestamp = new Date().getTime();
                    exportGroupMembersToExcel(
                      selectedMembers,
                      `group_members_${timestamp}.xlsx`
                    );
                    setSuccess(`✅ Đã xuất ${selectedMembers.length} thành viên ra Excel`);
                  }}
                >
                  Xuất Excel
                </Button>
              </Stack>
            </Box>

            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              <Stack spacing={1}>
                {members
                  .slice()
                  .sort((a, b) => {
                    // Sort by role: OWNER → ADMIN → MEMBER
                    const roleOrder: Record<string, number> = {
                      OWNER: 1,
                      ADMIN: 2,
                      MEMBER: 3,
                    };
                    const roleA = (a.role || 'MEMBER').toUpperCase();
                    const roleB = (b.role || 'MEMBER').toUpperCase();
                    return (roleOrder[roleA] || 999) - (roleOrder[roleB] || 999);
                  })
                  .map((member) => {
                    const isSelected = selectedMembers.some((m) => m.userId === member.userId);
                    const roleUpper = member.role ? member.role.toUpperCase() : '';
                    const isAdmin = roleUpper === 'OWNER' || roleUpper === 'ADMIN';

                    // Map role to Vietnamese label
                    const getRoleLabel = (role: string) => {
                      const upperRole = role.toUpperCase();
                      if (upperRole === 'OWNER') return 'Trưởng nhóm';
                      if (upperRole === 'ADMIN') return 'Phó nhóm';
                      return 'Thành viên';
                    };

                    return (
                      <Box
                        key={member.userId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          p: 1,
                          border: 1,
                          borderColor: isAdmin ? 'warning.main' : 'divider',
                          borderRadius: 1,
                          bgcolor: isSelected ? 'action.selected' : 'background.paper',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                        onClick={() => handleSelectMember(member)}
                      >
                        <Checkbox checked={isSelected} />
                        <Avatar src={member.avatar} sx={{ width: 32, height: 32, mr: 1 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2">{member.displayName}</Typography>
                          {member.role && (
                            <Chip
                              label={getRoleLabel(member.role)}
                              size="small"
                              color={isAdmin ? 'warning' : 'default'}
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      </Box>
                    );
                  })}
              </Stack>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Dữ liệu đã được lưu cục bộ và sẽ tự động đồng bộ lên server.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ScrapeGroupPanel;
