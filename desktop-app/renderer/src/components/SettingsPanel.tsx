import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { Refresh, Delete, Person, CloudDownload, CloudUpload } from '@mui/icons-material';
import { getSyncStatus, SyncStatus, getZaloAccounts, deleteZaloAccount, ZaloAccount, pullSyncFromBackend, PullSyncResult, triggerSync } from '../api/localApi';
import { utcToVietnamTime } from '../utils/dateUtils';

const SettingsPanel: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Account management states
  const [accounts, setAccounts] = useState<ZaloAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<ZaloAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pull sync states
  const [pulling, setPulling] = useState(false);
  const [pullResult, setPullResult] = useState<PullSyncResult | null>(null);

  // Push sync states
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    loadSyncStatus();
    loadAccounts();
  }, []);

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadSyncStatus = async () => {
    try {
      const status = await getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const data = await getZaloAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleOpenDeleteDialog = (account: ZaloAccount) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setAccountToDelete(null);
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;

    setDeleting(true);
    setError('');

    try {
      const result = await deleteZaloAccount(accountToDelete.id);

      if (result.success) {
        setSuccess(result.message || 'Đã xóa tài khoản thành công');
        handleCloseDeleteDialog();
        loadAccounts(); // Refresh the list
      } else {
        setError(result.error || 'Không thể xóa tài khoản');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa tài khoản');
    } finally {
      setDeleting(false);
    }
  };

  const handlePushSync = async () => {
    setPushing(true);
    setError('');

    try {
      await triggerSync();
      setSuccess('Đã đồng bộ dữ liệu lên backend thành công!');
      // Refresh sync status after push
      await loadSyncStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Lỗi khi đồng bộ dữ liệu lên backend');
    } finally {
      setPushing(false);
    }
  };

  const handlePullSync = async () => {
    setPulling(true);
    setError('');
    setPullResult(null);

    try {
      const result = await pullSyncFromBackend();
      setPullResult(result);

      if (result.success && result.data) {
        const { contacts, groups, messages, templates } = result.data;
        const totalPulled = contacts.pulled + groups.pulled + messages.pulled + templates.pulled;
        setSuccess(`Đã tải về ${totalPulled} mục dữ liệu từ backend (${contacts.pulled} danh bạ, ${groups.pulled} nhóm, ${messages.pulled} tin nhắn, ${templates.pulled} mẫu tin)`);
      } else {
        setError(result.error || 'Không thể tải dữ liệu từ backend');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải dữ liệu từ backend');
    } finally {
      setPulling(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Cài đặt
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Sync Status */}
      <Paper sx={{ p: 3, mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Trạng thái đồng bộ
          </Typography>
          <Button
            size="small"
            startIcon={<Refresh />}
            onClick={loadSyncStatus}
          >
            Làm mới
          </Button>
        </Box>

        {syncStatus ? (
          <List>
            <ListItem>
              <ListItemText primary="Trạng thái" />
              <Chip
                label={
                  !syncStatus.syncEnabled
                    ? 'Chưa kích hoạt'
                    : syncStatus.apiKeyValid === false
                    ? 'API Key không hợp lệ'
                    : 'Đang hoạt động'
                }
                color={
                  !syncStatus.syncEnabled
                    ? 'default'
                    : syncStatus.apiKeyValid === false
                    ? 'error'
                    : 'success'
                }
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Lần đồng bộ cuối"
                secondary={
                  syncStatus.lastSyncAt
                    ? utcToVietnamTime(syncStatus.lastSyncAt)
                    : 'Chưa đồng bộ'
                }
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText primary="Tin nhắn chưa đồng bộ" />
              <Chip
                label={syncStatus.unsyncedMessages}
                color={syncStatus.unsyncedMessages > 0 ? 'warning' : 'success'}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary="Danh bạ chưa đồng bộ" />
              <Chip
                label={syncStatus.unsyncedContacts}
                color={syncStatus.unsyncedContacts > 0 ? 'warning' : 'success'}
              />
            </ListItem>
            <ListItem>
              <ListItemText primary="Thành viên nhóm chưa đồng bộ" />
              <Chip
                label={syncStatus.unsyncedGroupMembers}
                color={syncStatus.unsyncedGroupMembers > 0 ? 'warning' : 'success'}
              />
            </ListItem>
          </List>
        ) : (
          <Alert severity="info">Đang tải trạng thái đồng bộ...</Alert>
        )}

        {syncStatus?.syncEnabled ? (
          syncStatus.apiKeyValid === false ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              <strong>API Key không hợp lệ!</strong>
              <br />
              API Key hiện tại không được chấp nhận bởi backend. Vui lòng vào tab <strong>"Đăng nhập"</strong> và đăng nhập lại với tài khoản backend của bạn để nhận API Key mới.
            </Alert>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Ứng dụng tự động đồng bộ dữ liệu lên backend mỗi 5 phút. Bạn cũng có thể đồng bộ thủ công bằng nút bên dưới.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={pushing ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
                onClick={handlePushSync}
                disabled={pushing || (syncStatus.unsyncedMessages === 0 && syncStatus.unsyncedContacts === 0 && syncStatus.unsyncedGroupMembers === 0)}
              >
                {pushing ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu lên Backend'}
              </Button>
              {syncStatus.unsyncedMessages === 0 && syncStatus.unsyncedContacts === 0 && syncStatus.unsyncedGroupMembers === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Tất cả dữ liệu đã được đồng bộ.
                </Typography>
              )}
            </Box>
          )
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            {!syncStatus?.hasBackendUrl ? (
              <>
                <strong>Chưa cấu hình Backend URL.</strong>
                <br />
                Vui lòng liên hệ quản trị viên để lấy địa chỉ Backend URL và cấu hình trong file .env
              </>
            ) : !syncStatus?.hasApiKey ? (
              <>
                <strong>Chưa đăng nhập.</strong>
                <br />
                Vui lòng vào tab <strong>"Đăng nhập"</strong> và đăng nhập với tài khoản backend để kích hoạt đồng bộ.
              </>
            ) : (
              <>
                Đồng bộ chưa được kích hoạt. Vui lòng khởi động lại ứng dụng hoặc vào tab "Đăng nhập" để đăng nhập lại.
              </>
            )}
          </Alert>
        )}
      </Paper>

      {/* Pull Sync - Sync from another machine */}
      {syncStatus?.syncEnabled && syncStatus?.apiKeyValid !== false && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Đồng bộ từ máy khác
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sử dụng tính năng này khi bạn muốn chuyển dữ liệu từ máy tính cũ sang máy mới.
            Dữ liệu sẽ được tải về từ backend bao gồm: danh bạ, nhóm, tin nhắn và mẫu tin nhắn.
          </Typography>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Lưu ý:</strong> Tính năng này chỉ tải về dữ liệu đã được đồng bộ lên backend trước đó.
            Đảm bảo rằng máy cũ đã đồng bộ đầy đủ dữ liệu lên backend trước khi thực hiện.
          </Alert>

          <Button
            variant="contained"
            color="primary"
            startIcon={pulling ? <CircularProgress size={20} color="inherit" /> : <CloudDownload />}
            onClick={handlePullSync}
            disabled={pulling}
            sx={{ mb: 2 }}
          >
            {pulling ? 'Đang tải dữ liệu...' : 'Tải dữ liệu từ Backend'}
          </Button>

          {pullResult && pullResult.data && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Kết quả tải dữ liệu:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Danh bạ"
                    secondary={pullResult.data.contacts.error || `${pullResult.data.contacts.pulled} mục`}
                  />
                  <Chip
                    size="small"
                    label={pullResult.data.contacts.pulled}
                    color={pullResult.data.contacts.error ? 'error' : 'success'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Nhóm"
                    secondary={pullResult.data.groups.error || `${pullResult.data.groups.pulled} mục`}
                  />
                  <Chip
                    size="small"
                    label={pullResult.data.groups.pulled}
                    color={pullResult.data.groups.error ? 'error' : 'success'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Tin nhắn"
                    secondary={pullResult.data.messages.error || `${pullResult.data.messages.pulled} mục`}
                  />
                  <Chip
                    size="small"
                    label={pullResult.data.messages.pulled}
                    color={pullResult.data.messages.error ? 'error' : 'success'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Mẫu tin nhắn"
                    secondary={pullResult.data.templates.error || `${pullResult.data.templates.pulled} mục`}
                  />
                  <Chip
                    size="small"
                    label={pullResult.data.templates.pulled}
                    color={pullResult.data.templates.error ? 'error' : 'success'}
                  />
                </ListItem>
              </List>
            </Box>
          )}
        </Paper>
      )}

      {/* Account Management */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Quản lý tài khoản Zalo
          </Typography>
          <Button
            size="small"
            startIcon={loadingAccounts ? <CircularProgress size={16} /> : <Refresh />}
            onClick={loadAccounts}
            disabled={loadingAccounts}
          >
            Làm mới
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Quản lý các tài khoản Zalo đã đăng nhập. Xóa tài khoản sẽ xóa tất cả dữ liệu liên quan
          (chiến dịch, tin nhắn, danh bạ, nhóm).
        </Typography>

        {accounts.length === 0 && !loadingAccounts ? (
          <Alert severity="info">
            Chưa có tài khoản Zalo nào. Vui lòng đăng nhập tài khoản ở tab "Đăng nhập".
          </Alert>
        ) : (
          <List>
            {accounts.map((account, index) => (
              <React.Fragment key={account.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemAvatar>
                    <Avatar src={account.avatar}>
                      <Person />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={account.displayName || `Tài khoản ${account.id}`}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <span>ID: {account.userId}</span>
                        <Chip
                          label={account.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                          size="small"
                          color={account.status === 'active' ? 'success' : 'default'}
                        />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => handleOpenDeleteDialog(account)}
                      title="Xóa tài khoản"
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* System Info */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Thông tin hệ thống
        </Typography>

        <List>
          <ListItem>
            <ListItemText
              primary="Phiên bản"
              secondary="1.0.0"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Local API"
              secondary="http://localhost:3001"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Cơ sở dữ liệu"
              secondary="SQLite (local-db.sqlite)"
            />
          </ListItem>
        </List>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          Xác nhận xóa tài khoản
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa tài khoản <strong>{accountToDelete?.displayName}</strong>?
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Hành động này sẽ xóa vĩnh viễn tất cả dữ liệu liên quan đến tài khoản này:
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li>Tất cả chiến dịch marketing</li>
              <li>Lịch sử tin nhắn</li>
              <li>Danh bạ và nhóm danh bạ</li>
              <li>Thông tin nhóm Zalo đã lưu</li>
              <li>Session đăng nhập</li>
            </ul>
            <strong>Hành động này không thể hoàn tác!</strong>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleting}>
            Hủy
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <Delete />}
          >
            {deleting ? 'Đang xóa...' : 'Xóa tài khoản'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPanel;
