import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Alert,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PersonAdd,
  Group as GroupIcon,
  MoreVert,
  Close,
  FileDownload,
  FileUpload,
} from '@mui/icons-material';
import {
  getContactGroups,
  createContactGroup,
  updateContactGroup,
  deleteContactGroup,
  getContactGroupMembers,
  addContactToGroup,
  removeContactFromGroup,
  ContactGroup,
} from '../api/localApi';
import localApi from '../api/localApi';
import {
  importContactsFromExcel,
  exportContactsToExcel,
  downloadContactsTemplate,
  ExcelContact,
} from '../utils/excelUtils';
import AccountSelector from './AccountSelector';

const PRESET_COLORS = [
  '#1976d2',
  '#2e7d32',
  '#ed6c02',
  '#d32f2f',
  '#7b1fa2',
  '#c2185b',
  '#f57c00',
  '#388e3c',
  '#0288d1',
  '#5d4037',
];

interface Contact {
  id: number;
  userId: string;
  displayName: string;
  phoneNumber?: string;
  avatar?: string;
}

interface ContactGroupsPanelProps {
  accountId?: number; // Made optional - now managed internally
}

const ContactGroupsPanel: React.FC<ContactGroupsPanelProps> = ({ accountId: propAccountId }) => {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ContactGroup | null>(null);
  const [members, setMembers] = useState<Contact[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<any>(null);

  // Internal account selection
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(propAccountId || null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuGroup, setMenuGroup] = useState<ContactGroup | null>(null);

  // Sync with prop changes
  useEffect(() => {
    if (propAccountId !== undefined) {
      setSelectedAccountId(propAccountId);
    }
  }, [propAccountId]);

  useEffect(() => {
    if (selectedAccountId) {
      loadGroups();
      loadAllContacts();
      loadAccountInfo();
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupMembers(selectedGroup.id);
    }
  }, [selectedGroup]);

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadGroups = async () => {
    if (!selectedAccountId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getContactGroups(selectedAccountId);
      setGroups(data);
    } catch (err: any) {
      console.error('Error loading contact groups:', err);
      setError('Không thể tải danh sách nhóm. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const loadAllContacts = async () => {
    if (!selectedAccountId) return;
    try {
      const response = await localApi.get(`/local/contacts/${selectedAccountId}`);
      setAllContacts(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to load contacts:', err);
    }
  };

  const loadGroupMembers = async (groupId: number) => {
    try {
      const data = await getContactGroupMembers(groupId);
      setMembers(data);
    } catch (err: any) {
      console.error('Failed to load group members:', err);
    }
  };

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

  const handleCreateGroup = async () => {
    if (!selectedAccountId) {
      setDialogError('Vui lòng chọn tài khoản trước');
      return;
    }
    if (!formName.trim()) {
      setDialogError('Tên nhóm không được để trống');
      return;
    }

    try {
      setLoading(true);
      setDialogError(null);
      await createContactGroup(selectedAccountId, formName, formDescription, formColor);
      console.log('Contact group created successfully');
      setSuccess('Đã tạo nhóm thành công');
      setCreateDialogOpen(false);
      resetForm();
      await loadGroups();
    } catch (err: any) {
      console.error('Error creating contact group:', err);
      setDialogError('Không thể tạo nhóm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup || !formName.trim()) {
      setDialogError('Tên nhóm không được để trống');
      return;
    }

    try {
      setLoading(true);
      setDialogError(null);
      await updateContactGroup(selectedGroup.id, {
        name: formName,
        description: formDescription,
        color: formColor,
      });
      console.log('Contact group updated successfully:', selectedGroup.id);
      setSuccess('Đã cập nhật nhóm thành công');
      setEditDialogOpen(false);
      resetForm();
      await loadGroups();
      if (selectedGroup) {
        const updatedGroup = groups.find((g) => g.id === selectedGroup.id);
        if (updatedGroup) setSelectedGroup(updatedGroup);
      }
    } catch (err: any) {
      console.error('Error updating contact group:', err);
      setDialogError('Không thể cập nhật nhóm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!menuGroup) return;

    try {
      setLoading(true);
      setError(null);
      await deleteContactGroup(menuGroup.id);
      console.log('Contact group deleted successfully:', menuGroup.id);
      setSuccess('Đã xóa nhóm thành công');
      setDeleteDialogOpen(false);
      if (selectedGroup?.id === menuGroup.id) {
        setSelectedGroup(null);
        setMembers([]);
      }
      await loadGroups();
    } catch (err: any) {
      console.error('Error deleting contact group:', err);
      setError('Không thể xóa nhóm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setMenuGroup(null);
    }
  };

  const handleAddMember = async (contactId: number) => {
    if (!selectedGroup) return;

    try {
      setError(null);
      await addContactToGroup(selectedGroup.id, contactId);
      console.log('Member added to group successfully:', selectedGroup.id, contactId);
      setSuccess('Đã thêm thành viên thành công');
      await loadGroupMembers(selectedGroup.id);
      await loadGroups();
    } catch (err: any) {
      console.error('Error adding member to group:', err);
      setError('Không thể thêm thành viên. Vui lòng thử lại.');
    }
  };

  const handleRemoveMember = async (contactId: number) => {
    if (!selectedGroup) return;

    try {
      setError(null);
      await removeContactFromGroup(selectedGroup.id, contactId);
      console.log('Member removed from group successfully:', selectedGroup.id, contactId);
      setSuccess('Đã xóa thành viên thành công');
      await loadGroupMembers(selectedGroup.id);
      await loadGroups();
    } catch (err: any) {
      console.error('Error removing member from group:', err);
      setError('Không thể xóa thành viên. Vui lòng thử lại.');
    }
  };

  const handleExportMembers = () => {
    if (!selectedGroup || members.length === 0) {
      setError('Không có thành viên nào để xuất');
      return;
    }

    const excelContacts: ExcelContact[] = members.map((member) => ({
      userId: member.userId,
      displayName: member.displayName,
      phoneNumber: member.phoneNumber,
      avatar: member.avatar,
    }));

    exportContactsToExcel(excelContacts, `${selectedGroup.name}_members_${new Date().getTime()}.xlsx`);
    setSuccess(`Đã xuất ${members.length} thành viên ra file Excel`);
  };

  const handleImportMembers = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedGroup) return;

    if (!selectedAccountId) {
      setError('Vui lòng chọn tài khoản trước');
      event.target.value = '';
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const excelContacts = await importContactsFromExcel(file);

      let importedCount = 0;
      let errorCount = 0;

      for (const contact of excelContacts) {
        try {
          // First, check if contact exists in contacts table, if not create it
          let existingContact = allContacts.find((c) => c.userId === contact.userId);

          if (!existingContact) {
            // Create contact first
            const createResponse = await localApi.post('/local/contacts', {
              accountId: selectedAccountId,
              userId: contact.userId,
              displayName: contact.displayName,
              phoneNumber: contact.phoneNumber,
              avatar: contact.avatar,
            });

            if (createResponse.data.success) {
              existingContact = createResponse.data.data;
            }
          }

          if (existingContact) {
            // Add to group
            await addContactToGroup(selectedGroup.id, existingContact.id);
            importedCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          console.error('Error importing contact:', contact.userId, err);
          errorCount++;
        }
      }

      if (importedCount > 0) {
        setSuccess(
          `Đã thêm ${importedCount} thành viên vào nhóm${errorCount > 0 ? ` (${errorCount} dòng bị lỗi)` : ''}`
        );
        await loadGroupMembers(selectedGroup.id);
        await loadGroups();
        await loadAllContacts();
      } else {
        setError('Không thể thêm thành viên nào. Vui lòng kiểm tra lại file Excel.');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể đọc file Excel. Vui lòng kiểm tra lại file.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormColor(PRESET_COLORS[0]);
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (group: ContactGroup) => {
    setSelectedGroup(group);
    setFormName(group.name);
    setFormDescription(group.description || '');
    setFormColor(group.color || PRESET_COLORS[0]);
    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const openDeleteDialog = (group: ContactGroup) => {
    setMenuGroup(group);
    setDeleteDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, group: ContactGroup) => {
    setMenuAnchor(event.currentTarget);
    setMenuGroup(group);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuGroup(null);
  };

  const availableContacts = allContacts.filter(
    (contact) => !members.some((member) => member.id === contact.id)
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Nhóm Danh Bạ
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
          Tạo nhóm mới
        </Button>
      </Box>

      {/* Account Selector */}
      <AccountSelector
        mode="single"
        value={selectedAccountId}
        onChange={(id) => {
          setSelectedAccountId(id as number);
          setSelectedGroup(null); // Reset selected group when changing account
          setMembers([]);
        }}
        label="Chọn tài khoản"
        helperText="Chọn tài khoản Zalo để quản lý nhóm danh bạ"
      />

      {/* Alerts */}
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

      {/* Content */}
      <Grid container spacing={3}>
        {/* Groups List */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Danh sách nhóm ({groups.length})
              </Typography>

              {loading && groups.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : groups.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  Chưa có nhóm nào
                </Typography>
              ) : (
                <List>
                  {groups.map((group) => (
                    <ListItem
                      key={group.id}
                      button
                      selected={selectedGroup?.id === group.id}
                      onClick={() => setSelectedGroup(group)}
                      sx={{
                        borderRadius: 1,
                        mb: 1,
                        border: selectedGroup?.id === group.id ? 2 : 0,
                        borderColor: group.color || 'primary.main',
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: group.color || PRESET_COLORS[0] }}>
                          <GroupIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={group.name}
                        secondary={`${group.memberCount} thành viên`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e, group);
                          }}
                        >
                          <MoreVert />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Group Details */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {selectedGroup ? (
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 3,
                    }}
                  >
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {selectedGroup.name}
                      </Typography>
                      {selectedGroup.description && (
                        <Typography color="text.secondary" variant="body2">
                          {selectedGroup.description}
                        </Typography>
                      )}
                      <Chip
                        icon={<GroupIcon />}
                        label={`${selectedGroup.memberCount} thành viên`}
                        size="small"
                        sx={{ mt: 1, bgcolor: selectedGroup.color, color: 'white' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<FileDownload />}
                        onClick={downloadContactsTemplate}
                      >
                        Tải file mẫu
                      </Button>
                      <input
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        id="import-members-excel"
                        type="file"
                        onChange={handleImportMembers}
                      />
                      <label htmlFor="import-members-excel">
                        <Button
                          variant="outlined"
                          component="span"
                          size="small"
                          startIcon={<FileUpload />}
                        >
                          Nhập Excel
                        </Button>
                      </label>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<FileDownload />}
                        onClick={handleExportMembers}
                        disabled={members.length === 0}
                      >
                        Xuất Excel
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<PersonAdd />}
                        onClick={() => setAddMemberDialogOpen(true)}
                      >
                        Thêm thành viên
                      </Button>
                    </Box>
                  </Box>

                  <Typography variant="subtitle1" gutterBottom>
                    Thành viên
                  </Typography>

                  {members.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                      Chưa có thành viên nào
                    </Typography>
                  ) : (
                    <List>
                      {members.map((member) => (
                        <ListItem key={member.id} sx={{ borderRadius: 1, mb: 1 }}>
                          <ListItemAvatar>
                            <Avatar src={member.avatar} alt={member.displayName}>
                              {member.displayName.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={member.displayName}
                            secondary={member.phoneNumber}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              color="error"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Close />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </>
              ) : (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <GroupIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                  <Typography color="text.secondary">
                    Chọn một nhóm để xem chi tiết
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Group Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            if (menuGroup) openEditDialog(menuGroup);
          }}
        >
          <Edit sx={{ mr: 1 }} /> Chỉnh sửa
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuGroup) openDeleteDialog(menuGroup);
          }}
        >
          <Delete sx={{ mr: 1 }} color="error" /> Xóa
        </MenuItem>
      </Menu>

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onClose={() => {
        setCreateDialogOpen(false);
        setDialogError(null);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Tạo nhóm mới</DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError(null)}>
              {dialogError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Tên nhóm"
            fullWidth
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Mô tả"
            fullWidth
            multiline
            rows={3}
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Màu sắc
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map((color) => (
              <Box
                key={color}
                onClick={() => setFormColor(color)}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  bgcolor: color,
                  cursor: 'pointer',
                  border: formColor === color ? 3 : 0,
                  borderColor: 'white',
                  boxShadow: formColor === color ? 3 : 1,
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleCreateGroup} variant="contained" disabled={loading}>
            Tạo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={editDialogOpen} onClose={() => {
        setEditDialogOpen(false);
        setDialogError(null);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Chỉnh sửa nhóm</DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError(null)}>
              {dialogError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Tên nhóm"
            fullWidth
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Mô tả"
            fullWidth
            multiline
            rows={3}
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Màu sắc
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map((color) => (
              <Box
                key={color}
                onClick={() => setFormColor(color)}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  bgcolor: color,
                  cursor: 'pointer',
                  border: formColor === color ? 3 : 0,
                  borderColor: 'white',
                  boxShadow: formColor === color ? 3 : 1,
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleUpdateGroup} variant="contained" disabled={loading}>
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog
        open={addMemberDialogOpen}
        onClose={() => setAddMemberDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Thêm thành viên</DialogTitle>
        <DialogContent>
          {availableContacts.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              Không có danh bạ nào để thêm
            </Typography>
          ) : (
            <List>
              {availableContacts.map((contact) => (
                <ListItem
                  key={contact.id}
                  button
                  onClick={() => {
                    handleAddMember(contact.id);
                    setAddMemberDialogOpen(false);
                  }}
                >
                  <ListItemAvatar>
                    <Avatar src={contact.avatar} alt={contact.displayName}>
                      {contact.displayName.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={contact.displayName} secondary={contact.phoneNumber} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMemberDialogOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa nhóm "{menuGroup?.name}"? Hành động này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleDeleteGroup} color="error" variant="contained" disabled={loading}>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContactGroupsPanel;
