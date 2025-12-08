import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Send, Phone, Person, Search } from '@mui/icons-material';
import { sendMessage, sendFriendRequest, findUser, getZaloAccounts, ZaloAccount } from '../api/localApi';

interface SendMessagePanelProps {
  accountId?: number;
}

const SendMessagePanel: React.FC<SendMessagePanelProps> = ({ accountId: propAccountId }) => {
  // Account selection
  const [accounts, setAccounts] = useState<ZaloAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(propAccountId || null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [userId, setUserId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [sendFriendReq, setSendFriendReq] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [inputMode, setInputMode] = useState<'userId' | 'phone'>('userId');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState(false);

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

  // Load account info when selectedAccountId changes
  useEffect(() => {
    if (selectedAccountId) {
      const account = accounts.find(acc => acc.id === selectedAccountId);
      setAccountInfo(account);
    }
  }, [selectedAccountId, accounts]);

  // Auto-hide success message after 5 seconds
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleFindUser = async () => {
    if (!phoneNumber.trim()) {
      setError('Vui lòng nhập số điện thoại');
      return;
    }

    setLookingUp(true);
    setError('');
    setFoundUser(null);

    try {
      const result = await findUser(selectedAccountId!, phoneNumber.trim());

      if (result.success && result.user) {
        setFoundUser(result.user);
        setUserId(result.user.userId);
        setSuccess(`Đã tìm thấy: ${result.user.displayName}`);
      } else {
        setError(result.error || 'Không tìm thấy người dùng với số điện thoại này');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Đã xảy ra lỗi khi tìm kiếm');
    } finally {
      setLookingUp(false);
    }
  };

  const handleSend = async () => {
    let targetUserId = userId; // Use current userId

    // If using phone mode and haven't found user yet, find them first
    if (inputMode === 'phone' && !foundUser) {
      if (!phoneNumber.trim()) {
        setError('Vui lòng nhập số điện thoại');
        return;
      }
      if (!message.trim()) {
        setError('Vui lòng nhập nội dung tin nhắn');
        return;
      }

      // Auto-find user by phone number
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        console.log('🔍 Auto-finding user by phone before sending...');
        const result = await findUser(selectedAccountId!, phoneNumber.trim());

        if (result.success && result.user) {
          setFoundUser(result.user);
          setUserId(result.user.userId);
          targetUserId = result.user.userId; // Use the found userId immediately
          console.log('✅ Found user:', result.user.displayName);
          // Continue to send message with the found userId
        } else {
          setError(result.error || 'Không tìm thấy người dùng với số điện thoại này');
          setLoading(false);
          return;
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Đã xảy ra lỗi khi tìm kiếm');
        setLoading(false);
        return;
      }
    }

    // Validate targetUserId and message
    if (!targetUserId.trim() || !message.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let result;

      if (sendFriendReq) {
        result = await sendFriendRequest(selectedAccountId!, targetUserId.trim(), message.trim());
      } else {
        result = await sendMessage(selectedAccountId!, targetUserId.trim(), message.trim());
      }

      if (result.success) {
        setSuccess(
          sendFriendReq
            ? 'Đã gửi lời mời kết bạn thành công!'
            : `Tin nhắn đã được gửi! ID: ${result.messageId}`
        );
        setMessage('');
      } else {
        setError(result.error || 'Gửi tin nhắn thất bại');
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
        <Typography variant="h5" sx={{ mb: 2 }}>Gửi tin nhắn</Typography>
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
          Gửi tin nhắn
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

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Chip
            icon={<Person />}
            label="Nhập User ID"
            color={inputMode === 'userId' ? 'primary' : 'default'}
            onClick={() => {
              setInputMode('userId');
              setFoundUser(null);
              setSuccess('');
              setError('');
            }}
            clickable
          />
          <Chip
            icon={<Phone />}
            label="Tìm qua số điện thoại"
            color={inputMode === 'phone' ? 'primary' : 'default'}
            onClick={() => {
              setInputMode('phone');
              setFoundUser(null);
              setSuccess('');
              setError('');
            }}
            clickable
          />
        </Stack>

        {inputMode === 'userId' ? (
          <TextField
            fullWidth
            label="Zalo User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="9047261701465740934"
            margin="normal"
            helperText="ID người nhận (lấy từ danh bạ hoặc nhóm đã scrape)"
          />
        ) : (
          <Box>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                label="Số điện thoại"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0901234567"
                margin="normal"
                helperText="Nhập số điện thoại để tìm người dùng Zalo"
              />
              <Button
                variant="outlined"
                startIcon={lookingUp ? <CircularProgress size={20} /> : <Search />}
                onClick={handleFindUser}
                disabled={lookingUp}
                sx={{ mt: 2, height: 56 }}
              >
                {lookingUp ? 'Đang tìm...' : 'Tìm kiếm'}
              </Button>
            </Stack>

            {foundUser && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar src={foundUser.avatar} sx={{ mr: 2 }}>
                    {foundUser.displayName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {foundUser.displayName}
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      User ID: {foundUser.userId}
                    </Typography>
                  </Box>
                </Box>
              </Alert>
            )}
          </Box>
        )}

        <TextField
          fullWidth
          label="Nội dung tin nhắn"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          multiline
          rows={4}
          margin="normal"
          placeholder="Nhập nội dung tin nhắn..."
        />

        <Stack direction="row" spacing={2} sx={{ mt: 2, alignItems: 'center' }}>
          <Chip
            label="Gửi tin nhắn thường"
            color={!sendFriendReq ? 'primary' : 'default'}
            onClick={() => setSendFriendReq(false)}
            clickable
          />
          <Chip
            label="Gửi lời mời kết bạn"
            color={sendFriendReq ? 'primary' : 'default'}
            onClick={() => setSendFriendReq(true)}
            clickable
          />
        </Stack>

        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} /> : <Send />}
          onClick={handleSend}
          disabled={loading}
          sx={{ mt: 3 }}
        >
          {loading ? 'Đang gửi...' : sendFriendReq ? 'Gửi lời mời' : 'Gửi tin nhắn'}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Lưu ý: Tin nhắn sẽ được gửi từ IP của máy bạn, an toàn với Zalo. Dữ liệu sẽ tự động đồng
          bộ lên server để quản lý.
        </Typography>
      </Paper>
    </Box>
  );
};

export default SendMessagePanel;
