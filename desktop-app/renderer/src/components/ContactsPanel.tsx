import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Checkbox,
  IconButton,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment,
  CircularProgress,
  Alert,
  Menu,
  MenuItem as MenuItemComponent,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  MoreVert,
  FilterList,
  Refresh,
  GroupAdd,
  FileDownload,
  FileUpload,
} from '@mui/icons-material';
import localApi, { findUser } from '../api/localApi';
import {
  importContactsFromExcel,
  exportContactsToExcel,
  downloadContactsTemplate,
} from '../utils/excelUtils';
import AccountSelector from './AccountSelector';

interface Contact {
  id: number;
  accountId: number;
  userId: string;
  displayName: string;
  phoneNumber?: string;
  avatar?: string;
}

interface ContactGroup {
  id: number;
  name: string;
  description?: string;
  memberCount: number;
}

interface ContactsPanelProps {
  accountId?: number; // Made optional - now managed internally
}

const ContactsPanel: React.FC<ContactsPanelProps> = ({ accountId: propAccountId }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Internal account selection
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(propAccountId || null);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [groupFilter, setGroupFilter] = useState<number | ''>('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Selection
  const [selected, setSelected] = useState<number[]>([]);

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showAssignGroupDialog, setShowAssignGroupDialog] = useState(false);

  // Menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuContactId, setMenuContactId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    displayName: '',
    phoneNumber: '',
    avatar: '',
  });

  // Find user state
  const [searchPhone, setSearchPhone] = useState('');
  const [searching, setSearching] = useState(false);

  // Account info state
  const [accountInfo, setAccountInfo] = useState<any>(null);

  // Sync with prop changes
  useEffect(() => {
    if (propAccountId !== undefined) {
      setSelectedAccountId(propAccountId);
    }
  }, [propAccountId]);

  useEffect(() => {
    if (selectedAccountId) {
      loadContacts();
      loadContactGroups();
      loadAccountInfo();
    }
  }, [selectedAccountId, page, rowsPerPage, searchText, groupFilter]);

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadAccountInfo = async () => {
    if (!selectedAccountId) return;
    try {
      const response = await localApi.get('/local/accounts');
      const accounts = response.data;
      const account = accounts.find((acc: any) => acc.id === selectedAccountId);
      setAccountInfo(account);
    } catch (error) {
      console.error('Failed to load account info:', error);
    }
  };

  const loadContacts = async () => {
    if (!selectedAccountId) return;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: rowsPerPage.toString(),
        offset: (page * rowsPerPage).toString(),
      });

      if (searchText) params.append('search', searchText);
      if (groupFilter) params.append('groupId', groupFilter.toString());

      const response = await localApi.get(
        `/local/contacts/${selectedAccountId}/filter?${params.toString()}`
      );

      if (response.data.success) {
        setContacts(response.data.data || []);
        setTotal(response.data.total || 0);
      } else {
        console.error('Load contacts failed:', response.data);
        setError('Không thể tải danh sách liên hệ. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('Error loading contacts:', err);
      setError('Lỗi kết nối. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const loadContactGroups = async () => {
    if (!selectedAccountId) return;
    try {
      const response = await localApi.get(`/local/contact-groups/${selectedAccountId}`);
      if (response.data.success) {
        setContactGroups(response.data.data || []);
      }
    } catch (err) {
      console.error('Error loading contact groups:', err);
      // Silent fail - không hiển thị lỗi cho user vì đây là chức năng phụ
    }
  };

  const handleSearch = () => {
    setPage(0);
    loadContacts();
  };

  const handleReset = () => {
    setSearchText('');
    setGroupFilter('');
    setPage(0);
    setTimeout(() => loadContacts(), 0);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(contacts.map((c) => c.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id: number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, contactId: number) => {
    setAnchorEl(event.currentTarget);
    setMenuContactId(contactId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuContactId(null);
  };

  const handleFindUser = async () => {
    if (!selectedAccountId) {
      setDialogError('Vui lòng chọn tài khoản trước');
      return;
    }
    if (!searchPhone.trim()) {
      setDialogError('Vui lòng nhập số điện thoại');
      return;
    }

    setSearching(true);
    setDialogError(null);

    try {
      const result = await findUser(selectedAccountId, searchPhone.trim());

      if (result.success && result.user) {
        // Auto-fill form with found user data
        setFormData({
          userId: result.user.userId,
          displayName: result.user.displayName,
          phoneNumber: result.user.phoneNumber || searchPhone.trim(),
          avatar: result.user.avatar || '',
        });
        setSuccess('Đã tìm thấy người dùng. Thông tin đã được điền tự động.');
      } else {
        setDialogError(result.error || 'Không tìm thấy người dùng với số điện thoại này');
      }
    } catch (err: any) {
      setDialogError(err.response?.data?.error || err.message || 'Đã xảy ra lỗi khi tìm kiếm');
    } finally {
      setSearching(false);
    }
  };

  const handleCreateContact = async () => {
    try {
      if (!selectedAccountId) {
        setDialogError('Vui lòng chọn tài khoản trước');
        return;
      }
      if (!formData.userId || !formData.displayName) {
        setDialogError('Vui lòng nhập đầy đủ User ID và Tên hiển thị');
        return;
      }

      await localApi.post('/local/contacts', {
        accountId: selectedAccountId,
        userId: formData.userId,
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber || undefined,
        avatar: formData.avatar || undefined,
      });

      setSuccess('Đã thêm liên hệ thành công');
      setShowCreateDialog(false);
      setFormData({ userId: '', displayName: '', phoneNumber: '', avatar: '' });
      setDialogError(null);
      loadContacts();
    } catch (err: any) {
      console.error('Error creating contact:', err);
      setDialogError('Không thể thêm liên hệ. Vui lòng kiểm tra thông tin và thử lại.');
    }
  };

  const handleEditContact = async () => {
    try {
      if (!selectedAccountId) {
        setDialogError('Vui lòng chọn tài khoản trước');
        return;
      }
      if (!editingContact) return;

      await localApi.post('/local/contacts', {
        accountId: selectedAccountId,
        userId: editingContact.userId,
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber || undefined,
        avatar: formData.avatar || undefined,
      });

      setSuccess('Đã cập nhật thông tin liên hệ');
      setShowEditDialog(false);
      setEditingContact(null);
      setFormData({ userId: '', displayName: '', phoneNumber: '', avatar: '' });
      setDialogError(null);
      loadContacts();
    } catch (err: any) {
      console.error('Error updating contact:', err);
      setDialogError('Không thể cập nhật liên hệ. Vui lòng thử lại.');
    }
  };

  const handleDeleteContact = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa liên hệ này?')) {
      return;
    }

    try {
      await localApi.delete(`/local/contacts/${id}`);
      setSuccess('Đã xóa liên hệ thành công');
      handleMenuClose();
      loadContacts();
    } catch (err: any) {
      console.error('Error deleting contact:', err);
      setError('Không thể xóa liên hệ. Vui lòng thử lại.');
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) {
      setError('Vui lòng chọn ít nhất một liên hệ để xóa');
      return;
    }

    if (!confirm(`Bạn có chắc muốn xóa ${selected.length} liên hệ?`)) {
      return;
    }

    try {
      await localApi.post('/local/contacts/bulk-delete', { ids: selected });
      setSuccess(`Đã xóa ${selected.length} liên hệ thành công`);
      setSelected([]);
      loadContacts();
    } catch (err: any) {
      console.error('Error bulk deleting contacts:', err);
      setError('Không thể xóa các liên hệ đã chọn. Vui lòng thử lại.');
    }
  };

  const handleAssignToGroup = async (groupId: number) => {
    if (selected.length === 0) {
      setError('Vui lòng chọn ít nhất một liên hệ để thêm vào nhóm');
      return;
    }

    try {
      await localApi.post('/local/contact-groups/assign', {
        contactGroupId: groupId,
        contactIds: selected,
      });

      setSuccess(`Đã thêm ${selected.length} liên hệ vào nhóm`);
      setShowAssignGroupDialog(false);
      setSelected([]);
      loadContacts();
    } catch (err: any) {
      console.error('Error assigning contacts to group:', err);
      setError('Không thể thêm liên hệ vào nhóm. Vui lòng thử lại.');
    }
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      userId: contact.userId,
      displayName: contact.displayName,
      phoneNumber: contact.phoneNumber || '',
      avatar: contact.avatar || '',
    });
    setShowEditDialog(true);
    handleMenuClose();
  };

  const isSelected = (id: number) => selected.indexOf(id) !== -1;

  // Export contacts to CSV
  const handleExport = async () => {
    if (!selectedAccountId) {
      setError('Vui lòng chọn tài khoản trước');
      return;
    }
    try {
      setLoading(true);

      // Get all contacts (without pagination)
      const params = new URLSearchParams();
      if (searchText) params.append('search', searchText);
      if (groupFilter) params.append('groupId', groupFilter.toString());

      const response = await localApi.get(
        `/local/contacts/${selectedAccountId}/filter?${params.toString()}`
      );

      if (!response.data.success) {
        console.error('Export failed - load contacts error:', response.data);
        setError('Không thể tải danh sách liên hệ để xuất. Vui lòng thử lại.');
        return;
      }

      const contactsToExport = response.data.data || [];

      if (contactsToExport.length === 0) {
        setError('Không có liên hệ nào để xuất');
        return;
      }

      // Export to Excel
      exportContactsToExcel(contactsToExport, `contacts_${new Date().getTime()}.xlsx`);

      setSuccess(`Đã xuất ${contactsToExport.length} liên hệ ra file Excel`);
    } catch (err: any) {
      console.error('Error exporting contacts:', err);
      setError('Không thể xuất file Excel. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Import contacts from Excel
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedAccountId) {
      setError('Vui lòng chọn tài khoản trước');
      event.target.value = '';
      return;
    }

    try {
      setLoading(true);
      console.log(`Starting Excel import: ${file.name}`);

      // Parse Excel file
      const excelContacts = await importContactsFromExcel(file);
      console.log(`Parsed ${excelContacts.length} contacts from Excel`);

      let importedCount = 0;
      let errorCount = 0;

      // Import each contact
      for (const contact of excelContacts) {
        try {
          await localApi.post('/local/contacts', {
            accountId: selectedAccountId,
            userId: contact.userId,
            displayName: contact.displayName,
            phoneNumber: contact.phoneNumber,
            avatar: contact.avatar,
          });
          importedCount++;
        } catch (err) {
          console.error('Failed to import contact:', contact.userId, err);
          errorCount++;
        }
      }

      if (importedCount > 0) {
        console.log(`Import completed: ${importedCount} success, ${errorCount} errors`);
        setSuccess(
          `Đã nhập ${importedCount} liên hệ thành công${
            errorCount > 0 ? ` (${errorCount} dòng bị lỗi)` : ''
          }`
        );
        loadContacts();
      } else {
        console.error('Import failed - no contacts imported');
        setError('Không thể nhập liên hệ nào. Vui lòng kiểm tra lại file Excel.');
      }
    } catch (err: any) {
      console.error('Error importing Excel file:', err);
      setError(err.message || 'Không thể đọc file Excel. Vui lòng kiểm tra lại file.');
    } finally {
      setLoading(false);
      // Reset input
      event.target.value = '';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Quản Lý Danh Bạ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tổng số: {total} contacts
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={downloadContactsTemplate}
            size="small"
          >
            Tải file mẫu
          </Button>
          <input
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            id="import-excel-file"
            type="file"
            onChange={handleImport}
          />
          <label htmlFor="import-excel-file">
            <Button
              variant="outlined"
              component="span"
              startIcon={<FileUpload />}
            >
              Nhập Excel
            </Button>
          </label>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExport}
          >
            Xuất Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadContacts}
          >
            Làm mới
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowCreateDialog(true)}
          >
            Thêm Contact
          </Button>
        </Box>
      </Box>

      {/* Account Selector */}
      <AccountSelector
        mode="single"
        value={selectedAccountId}
        onChange={(id) => {
          setSelectedAccountId(id as number);
          setPage(0); // Reset to first page when changing account
        }}
        label="Chọn tài khoản"
        helperText="Chọn tài khoản Zalo để quản lý danh bạ"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterList sx={{ mr: 1 }} />
            <Typography variant="h6">Bộ lọc</Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Tìm kiếm"
                placeholder="Tìm theo tên, User ID, số điện thoại..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Nhóm danh bạ</InputLabel>
                <Select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value as number | '')}
                  label="Nhóm danh bạ"
                >
                  <MenuItem value="">
                    <em>Tất cả</em>
                  </MenuItem>
                  {contactGroups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name} ({group.memberCount})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={handleSearch} startIcon={<Search />}>
                  Tìm kiếm
                </Button>
                <Button variant="outlined" onClick={handleReset}>
                  Đặt lại
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <Card sx={{ mb: 2, bgcolor: 'action.selected' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1">
                Đã chọn {selected.length} contacts
              </Typography>
              <Button
                variant="outlined"
                startIcon={<GroupAdd />}
                onClick={() => setShowAssignGroupDialog(true)}
              >
                Thêm vào nhóm
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleBulkDelete}
              >
                Xóa
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : contacts.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {searchText || groupFilter
                  ? 'Không tìm thấy contact nào'
                  : 'Chưa có contact nào. Nhấn "Thêm Contact" để tạo mới.'}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={
                            selected.length > 0 && selected.length < contacts.length
                          }
                          checked={
                            contacts.length > 0 && selected.length === contacts.length
                          }
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell>Tên</TableCell>
                      <TableCell>User ID</TableCell>
                      <TableCell>Số điện thoại</TableCell>
                      <TableCell align="right">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contacts.map((contact) => {
                      const isItemSelected = isSelected(contact.id);

                      return (
                        <TableRow
                          key={contact.id}
                          hover
                          selected={isItemSelected}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isItemSelected}
                              onChange={() => handleSelectOne(contact.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar
                                src={contact.avatar}
                                sx={{ mr: 2, width: 32, height: 32 }}
                              >
                                {contact.displayName[0]}
                              </Avatar>
                              <Typography variant="body2">
                                {contact.displayName}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                            >
                              {contact.userId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {contact.phoneNumber || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, contact.id)}
                            >
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Số dòng mỗi trang:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} của ${count !== -1 ? count : `hơn ${to}`}`
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItemComponent
          onClick={() => {
            const contact = contacts.find((c) => c.id === menuContactId);
            if (contact) openEditDialog(contact);
          }}
        >
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Chỉnh sửa
        </MenuItemComponent>
        <MenuItemComponent
          onClick={() => menuContactId && handleDeleteContact(menuContactId)}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Xóa
        </MenuItemComponent>
      </Menu>

      {/* Create Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setDialogError(null);
          setSearchPhone('');
          setFormData({ userId: '', displayName: '', phoneNumber: '', avatar: '' });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Thêm Contact Mới</DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError(null)}>
              {dialogError}
            </Alert>
          )}

          {/* Find User Section */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Tìm kiếm người dùng Zalo
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Số điện thoại"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !searching) {
                    handleFindUser();
                  }
                }}
                placeholder="0901234567"
                helperText="Nhập số điện thoại để tìm và tự động điền thông tin"
              />
              <Button
                variant="contained"
                onClick={handleFindUser}
                disabled={searching}
                startIcon={searching ? <CircularProgress size={16} /> : <Search />}
                sx={{ minWidth: 100 }}
              >
                {searching ? 'Tìm...' : 'Tìm'}
              </Button>
            </Box>
          </Box>

          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="User ID"
              required
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              sx={{ mb: 2 }}
              helperText="Zalo User ID (tự động điền sau khi tìm kiếm)"
            />
            <TextField
              fullWidth
              label="Tên hiển thị"
              required
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Số điện thoại"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Avatar URL"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreateContact}>
            Thêm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setDialogError(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Chỉnh Sửa Contact</DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError(null)}>
              {dialogError}
            </Alert>
          )}
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="User ID"
              disabled
              value={formData.userId}
              sx={{ mb: 2 }}
              helperText="User ID không thể thay đổi"
            />
            <TextField
              fullWidth
              label="Tên hiển thị"
              required
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Số điện thoại"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Avatar URL"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleEditContact}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Group Dialog */}
      <Dialog
        open={showAssignGroupDialog}
        onClose={() => setShowAssignGroupDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Thêm vào Nhóm Danh Bạ</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Chọn nhóm để thêm {selected.length} contacts
          </Typography>
          {contactGroups.length === 0 ? (
            <Alert severity="info">
              Chưa có nhóm nào. Vui lòng tạo nhóm trước.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {contactGroups.map((group) => (
                <Button
                  key={group.id}
                  variant="outlined"
                  onClick={() => handleAssignToGroup(group.id)}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  <Box sx={{ flex: 1, textAlign: 'left' }}>
                    <Typography variant="body2">{group.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {group.memberCount} thành viên
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAssignGroupDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContactsPanel;
