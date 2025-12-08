import React, { useState } from 'react';
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
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { Search, Send } from '@mui/icons-material';
import { findUser } from '../api/localApi';

interface FindUserPanelProps {
  accountId: number;
  onSendMessage?: () => void;
}

interface FoundUser {
  userId: string;
  displayName: string;
  avatar?: string;
  phoneNumber?: string;
}

const FindUserPanel: React.FC<FindUserPanelProps> = ({ accountId, onSendMessage }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [accountInfo, setAccountInfo] = useState<any>(null);

  // Load account info when accountId changes
  React.useEffect(() => {
    const loadAccountInfo = async () => {
      try {
        const response = await fetch(`http://localhost:3001/local/accounts`);
        const accounts = await response.json();
        const account = accounts.find((acc: any) => acc.id === accountId);
        setAccountInfo(account);
      } catch (error) {
        console.error('Failed to load account info:', error);
      }
    };

    if (accountId) {
      loadAccountInfo();
    }
  }, [accountId]);

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      setError('Vui lòng nhập số điện thoại');
      return;
    }

    setLoading(true);
    setError('');
    setFoundUser(null);

    try {
      const result = await findUser(accountId, phoneNumber.trim());

      if (result.success && result.user) {
        setFoundUser(result.user);
      } else {
        setError(result.error || 'Không tìm thấy người dùng với số điện thoại này');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Đã xảy ra lỗi khi tìm kiếm');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (onSendMessage) {
      onSendMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          Tìm kiếm người dùng Zalo
        </Typography>
        {accountInfo && accountInfo.displayName && (
          <Chip
            avatar={<Avatar src={accountInfo.avatar}>{accountInfo.displayName[0]}</Avatar>}
            label={`Đang dùng: ${accountInfo.displayName}`}
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Nhập số điện thoại để tìm kiếm thông tin người dùng Zalo. Chức năng này sử dụng account
          Zalo đã đăng nhập để thực hiện tìm kiếm.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            label="Số điện thoại"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="0901234567"
            helperText="Nhập số điện thoại Việt Nam (bắt đầu với 0 hoặc +84)"
          />
          <Button
            variant="contained"
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <Search />}
            onClick={handleSearch}
            disabled={loading}
            sx={{ height: 56, mt: 1 }}
          >
            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
          </Button>
        </Stack>

        {loading && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Đang tìm kiếm người dùng Zalo với số điện thoại này...
          </Alert>
        )}

        {foundUser && (
          <Card sx={{ mt: 3 }} variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Kết quả tìm kiếm
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 3 }}>
                <Avatar
                  src={foundUser.avatar}
                  sx={{ width: 80, height: 80, mr: 3 }}
                >
                  {foundUser.displayName?.[0] || '?'}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" gutterBottom>
                    {foundUser.displayName}
                  </Typography>

                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      User ID
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                    >
                      {foundUser.userId}
                    </Typography>
                  </Box>

                  {foundUser.phoneNumber && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Số điện thoại
                      </Typography>
                      <Typography variant="body1">
                        {foundUser.phoneNumber}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={handleSendMessage}
                fullWidth
              >
                Gửi tin nhắn
              </Button>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Thông tin này được lấy trực tiếp từ Zalo thông qua account đã đăng nhập.
              </Typography>
            </CardContent>
          </Card>
        )}

        {!foundUser && !loading && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Lưu ý:</strong>
            </Typography>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Số điện thoại phải được liên kết với tài khoản Zalo</li>
              <li>Người dùng phải có trong danh bạ hoặc visible trên Zalo</li>
              <li>Tìm kiếm sử dụng account Zalo đã đăng nhập của bạn</li>
            </ul>
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default FindUserPanel;
