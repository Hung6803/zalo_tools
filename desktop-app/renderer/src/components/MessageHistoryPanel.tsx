import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment,
  CircularProgress,
  Alert,
  Avatar,
} from '@mui/material';
import { Search, FilterList, Refresh, Person } from '@mui/icons-material';
import localApi, { getZaloAccounts, ZaloAccount } from '../api/localApi';
import { utcToVietnamTime } from '../utils/dateUtils';

interface Message {
  id: number;
  accountId: number;
  userId: string;
  message: string;
  messageId: string;
  status: string;
  sentAt: string;
  displayName?: string;
  phoneNumber?: string;
}

interface MessageHistoryPanelProps {
  accountId?: number;
}

const MessageHistoryPanel: React.FC<MessageHistoryPanelProps> = ({ accountId: propAccountId }) => {
  // Account selection
  const [accounts, setAccounts] = useState<ZaloAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(propAccountId || null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

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

  useEffect(() => {
    if (selectedAccountId) {
      loadMessages();
    }
  }, [selectedAccountId, page, rowsPerPage]);

  const loadMessages = async () => {
    if (!selectedAccountId) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: rowsPerPage.toString(),
        offset: (page * rowsPerPage).toString(),
      });

      if (searchText) params.append('search', searchText);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await localApi.get(
        `/local/messages/${selectedAccountId}/filter?${params.toString()}`
      );

      if (response.data.success) {
        setMessages(response.data.data || []);
        setTotal(response.data.total || 0);
      } else {
        setError('Không thể tải lịch sử tin nhắn');
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải lịch sử');
      console.error('Failed to load message history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    loadMessages();
  };

  const handleReset = () => {
    setSearchText('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPage(0);
    setTimeout(() => loadMessages(), 0);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'success':
        return 'success';
      case 'failed':
      case 'error':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent':
      case 'success':
        return 'Thành công';
      case 'failed':
      case 'error':
        return 'Thất bại';
      case 'pending':
        return 'Đang chờ';
      default:
        return status;
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
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Lịch Sử Tin Nhắn</Typography>
        <Alert severity="warning">
          Chưa có tài khoản Zalo nào. Vui lòng đăng nhập tài khoản ở tab "Đăng nhập".
        </Alert>
      </Box>
    );
  }

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Lịch Sử Tin Nhắn
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadMessages}>
            Làm mới
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tìm kiếm"
                placeholder="Tìm theo nội dung, tên người nhận, số điện thoại..."
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

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as string)}
                  label="Trạng thái"
                >
                  <MenuItem value="">
                    <em>Tất cả</em>
                  </MenuItem>
                  <MenuItem value="sent">Thành công</MenuItem>
                  <MenuItem value="success">Thành công</MenuItem>
                  <MenuItem value="failed">Thất bại</MenuItem>
                  <MenuItem value="error">Lỗi</MenuItem>
                  <MenuItem value="pending">Đang chờ</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Từ ngày"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Đến ngày"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
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

      {/* Results */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Kết quả ({total} tin nhắn)
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Không có tin nhắn nào</Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Thời gian</TableCell>
                      <TableCell>Người nhận</TableCell>
                      <TableCell>Số điện thoại</TableCell>
                      <TableCell>Nội dung</TableCell>
                      <TableCell>Trạng thái</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {messages.map((message) => (
                      <TableRow key={message.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {utcToVietnamTime(message.sentAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {message.displayName || message.userId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {message.phoneNumber || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 300,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {message.message}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(message.status)}
                            color={getStatusColor(message.status) as any}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
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
                rowsPerPageOptions={[25, 50, 100, 200]}
                labelRowsPerPage="Số dòng mỗi trang:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} của ${count !== -1 ? count : `hơn ${to}`}`
                }
              />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default MessageHistoryPanel;
