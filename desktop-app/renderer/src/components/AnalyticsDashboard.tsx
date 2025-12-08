import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  Campaign as CampaignIcon,
  CheckCircle,
  Error,
  Description,
  Group,
  SmartToy,
  Person,
} from '@mui/icons-material';
import localApi, { getZaloAccounts, ZaloAccount } from '../api/localApi';
import { getCampaignTypeLabel } from '../constants/campaignTypes';

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalMessagesSent: number;
  totalMessagesFailed: number;
  successRate: number;
}

interface TemplateUsage {
  templateId: number;
  templateName: string;
  usageCount: number;
  totalMessagesSent: number;
}

interface CampaignTypeStats {
  campaignType: string;
  count: number;
  totalSent: number;
  totalFailed: number;
}

interface ContactGroupStats {
  groupId: number;
  groupName: string;
  memberCount: number;
}

interface AutoReplyStats {
  totalRules: number;
  activeRules: number;
  inactiveRules: number;
}

interface AnalyticsDashboardProps {
  accountId?: number; // Optional - component can manage its own account selection
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ accountId: propAccountId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(30);

  // Account selection
  const [accounts, setAccounts] = useState<ZaloAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(propAccountId || null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Statistics
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [templateUsage, setTemplateUsage] = useState<TemplateUsage[]>([]);
  const [campaignTypeStats, setCampaignTypeStats] = useState<CampaignTypeStats[]>([]);
  const [contactGroupStats, setContactGroupStats] = useState<ContactGroupStats[]>([]);
  const [autoReplyStats, setAutoReplyStats] = useState<AutoReplyStats | null>(null);

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

  // Load analytics when account or date range changes
  useEffect(() => {
    if (selectedAccountId) {
      loadAnalytics();
    }
  }, [selectedAccountId, dateRange]);

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const data = await getZaloAccounts();
      const activeAccounts = data.filter(acc => acc.status === 'active');
      setAccounts(activeAccounts);

      // Auto-select first account if none selected
      if (!selectedAccountId && activeAccounts.length > 0) {
        setSelectedAccountId(activeAccounts[0].id);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadAnalytics = async () => {
    if (!selectedAccountId) return;

    try {
      setLoading(true);
      setError(null);

      const [
        campaignRes,
        templateRes,
        campaignTypeRes,
        contactGroupRes,
        autoReplyRes,
      ] = await Promise.all([
        localApi.get(`/local/analytics/campaigns/${selectedAccountId}`),
        localApi.get(`/local/analytics/template-usage/${selectedAccountId}`),
        localApi.get(`/local/analytics/campaign-types/${selectedAccountId}`),
        localApi.get(`/local/analytics/contact-groups/${selectedAccountId}`),
        localApi.get(`/local/analytics/auto-reply/${selectedAccountId}`),
      ]);

      console.log('Analytics data loaded successfully');
      setCampaignStats(campaignRes.data.data);
      setTemplateUsage(templateRes.data.data || []);
      setCampaignTypeStats(campaignTypeRes.data.data || []);
      setContactGroupStats(contactGroupRes.data.data || []);
      setAutoReplyStats(autoReplyRes.data.data);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError('Không thể tải dữ liệu thống kê. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}15`,
              color: color,
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Show account selector if no accounts or loading accounts
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
        <Alert severity="warning">
          Chưa có tài khoản Zalo nào. Vui lòng đăng nhập tài khoản ở tab "Đăng nhập".
        </Alert>
      </Box>
    );
  }

  if (loading && !campaignStats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Thống Kê & Phân Tích
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tổng quan về hiệu suất chiến dịch và hoạt động
          </Typography>
        </Box>
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

          {/* Date Range Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Khoảng thời gian</InputLabel>
            <Select value={dateRange} onChange={(e) => setDateRange(e.target.value as number)} label="Khoảng thời gian">
              <MenuItem value={7}>7 ngày qua</MenuItem>
              <MenuItem value={30}>30 ngày qua</MenuItem>
              <MenuItem value={90}>90 ngày qua</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tổng Chiến Dịch"
            value={campaignStats?.totalCampaigns || 0}
            icon={<CampaignIcon />}
            color="#1976d2"
            subtitle={`${campaignStats?.activeCampaigns || 0} đang chạy`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tin Nhắn Đã Gửi"
            value={campaignStats?.totalMessagesSent || 0}
            icon={<CheckCircle />}
            color="#2e7d32"
            subtitle={`${campaignStats?.successRate || 0}% thành công`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tin Nhắn Thất Bại"
            value={campaignStats?.totalMessagesFailed || 0}
            icon={<Error />}
            color="#d32f2f"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Hoàn Thành"
            value={campaignStats?.completedCampaigns || 0}
            icon={<TrendingUp />}
            color="#ed6c02"
          />
        </Grid>
      </Grid>

      {/* Success Rate Progress */}
      {campaignStats && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Tỷ Lệ Thành Công
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={campaignStats.successRate}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: campaignStats.successRate >= 80 ? '#2e7d32' : campaignStats.successRate >= 50 ? '#ed6c02' : '#d32f2f',
                    },
                  }}
                />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                {campaignStats.successRate}%
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Chip label={`${campaignStats.totalMessagesSent} Thành công`} color="success" size="small" />
              <Chip label={`${campaignStats.totalMessagesFailed} Thất bại`} color="error" size="small" />
            </Box>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Template Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Description sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Top Templates</Typography>
              </Box>
              {templateUsage.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={3}>
                  Chưa có dữ liệu
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Template</TableCell>
                        <TableCell align="right">Sử dụng</TableCell>
                        <TableCell align="right">Tin gửi</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {templateUsage.map((item, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>{item.templateName}</TableCell>
                          <TableCell align="right">
                            <Chip label={item.usageCount} size="small" color="primary" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">{item.totalMessagesSent || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Campaign Type Stats */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CampaignIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Loại Chiến Dịch</Typography>
              </Box>
              {campaignTypeStats.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={3}>
                  Chưa có dữ liệu
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Loại</TableCell>
                        <TableCell align="right">Số lượng</TableCell>
                        <TableCell align="right">Đã gửi</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {campaignTypeStats.map((item, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography variant="body2" noWrap>
                              {getCampaignTypeLabel(item.campaignType as any)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip label={item.count} size="small" color="primary" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">{item.totalSent || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Contact Groups */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Group sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Nhóm Danh Bạ</Typography>
              </Box>
              {contactGroupStats.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={3}>
                  Chưa có nhóm nào
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tên nhóm</TableCell>
                        <TableCell align="right">Số thành viên</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {contactGroupStats.map((item, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>{item.groupName}</TableCell>
                          <TableCell align="right">
                            <Chip label={item.memberCount} size="small" color="secondary" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Auto Reply Stats */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SmartToy sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Tự Động Trả Lời</Typography>
              </Box>
              {autoReplyStats ? (
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box textAlign="center">
                      <Typography variant="h3" color="primary">
                        {autoReplyStats.totalRules}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tổng quy tắc
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center">
                      <Typography variant="h3" color="success.main">
                        {autoReplyStats.activeRules}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Đang hoạt động
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center">
                      <Typography variant="h3" color="text.disabled">
                        {autoReplyStats.inactiveRules}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Đã tắt
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={3}>
                  Chưa có dữ liệu
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
