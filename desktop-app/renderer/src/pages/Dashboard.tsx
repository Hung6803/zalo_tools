import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Paper,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Chip,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  AccountCircle,
  Message,
  Group,
  ContactPage,
  Settings,
  Sync,
  Menu as MenuIcon,
  Add,
  Logout,
  Description,
  Campaign,
  GroupWork,
  History,
  SmartToy,
  BarChart,
} from '@mui/icons-material';
import { getZaloAccounts, getSyncStatus, triggerSync, logoutZalo, validateSessions, ZaloAccount, SyncStatus } from '../api/localApi';
import ZaloLogin from '../components/ZaloLogin';
import SendMessagePanel from '../components/SendMessagePanel';
import ScrapeGroupPanel from '../components/ScrapeGroupPanel';
import ContactsPanel from '../components/ContactsPanel';
import SettingsPanel from '../components/SettingsPanel';
import TemplatesPanel from '../components/TemplatesPanel';
import CampaignsPanel from '../components/CampaignsPanel';
import ContactGroupsPanel from '../components/ContactGroupsPanel';
import MessageHistoryPanel from '../components/MessageHistoryPanel';
import AutoReplyRulesPanel from '../components/AutoReplyRulesPanel';
import AnalyticsDashboard from '../components/AnalyticsDashboard';

const DRAWER_WIDTH = 240;

type ActivePanel = 'accounts' | 'analytics' | 'send-message' | 'scrape-group' | 'contacts' | 'templates' | 'campaigns' | 'contact-groups' | 'message-history' | 'auto-reply' | 'settings';

const Dashboard: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<ActivePanel>('accounts');
  const [accounts, setAccounts] = useState<ZaloAccount[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; severity: 'success' | 'error' | 'info' } | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [reloginAccountId, setReloginAccountId] = useState<number | undefined>(undefined);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  useEffect(() => {
    // Validate sessions on app startup, then load accounts
    const initializeApp = async () => {
      await validateAccountSessions();
      await loadAccounts();
      await loadSyncStatus();
    };

    initializeApp();

    // Auto refresh every 30 seconds
    const interval = setInterval(() => {
      loadAccounts();
      loadSyncStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const validateAccountSessions = async () => {
    try {
      console.log('🔍 Validating account sessions...');
      const result = await validateSessions();

      if (result.success && result.data) {
        const { valid, invalid, results } = result.data;
        console.log(`✅ Session validation: ${valid} valid, ${invalid} invalid`);

        // Log invalid sessions for user awareness
        const invalidAccounts = results.filter(r => !r.isValid);
        if (invalidAccounts.length > 0) {
          console.warn(
            '⚠️ Phiên đăng nhập đã hết hạn cho các tài khoản sau:',
            invalidAccounts.map(acc => acc.displayName).join(', ')
          );
        }
      }
    } catch (error) {
      console.error('Failed to validate sessions:', error);
      // Continue anyway - don't block app startup
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await getZaloAccounts();
      setAccounts(data);

      // Only auto-select an active account
      if (data.length > 0 && !selectedAccountId) {
        const firstActiveAccount = data.find((acc) => acc.status === 'active');
        if (firstActiveAccount) {
          setSelectedAccountId(firstActiveAccount.id);
        }
      }

      // If currently selected account is inactive, clear selection
      if (selectedAccountId) {
        const currentAccount = data.find((acc) => acc.id === selectedAccountId);
        if (currentAccount && currentAccount.status === 'inactive') {
          setSelectedAccountId(null);
          // Try to select another active account
          const firstActiveAccount = data.find((acc) => acc.status === 'active');
          if (firstActiveAccount) {
            setSelectedAccountId(firstActiveAccount.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const status = await getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      await triggerSync();
      await loadSyncStatus();
      setSyncMessage({ text: 'Đồng bộ thành công!', severity: 'success' });
    } catch (error: any) {
      console.error('Sync failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Đồng bộ thất bại';
      setSyncMessage({ text: errorMessage, severity: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginDialog(false);
    setReloginAccountId(undefined);
    loadAccounts();
  };

  const handleOpenLoginDialog = (accountId?: number) => {
    setReloginAccountId(accountId);
    setShowLoginDialog(true);
  };

  const handleLogout = async (accountId: number) => {
    if (!confirm('Bạn có chắc muốn đăng xuất tài khoản này?')) {
      return;
    }

    try {
      await logoutZalo(accountId);

      // Clear selected account if it's the one being logged out
      if (selectedAccountId === accountId) {
        setSelectedAccountId(null);
      }

      // Reload accounts list
      await loadAccounts();

      console.log(`✅ Logged out account ${accountId}`);
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Đăng xuất thất bại. Vui lòng thử lại.');
    }
  };

  const renderPanel = () => {
    switch (activePanel) {
      case 'analytics':
        // AnalyticsDashboard now manages its own account selection
        return <AnalyticsDashboard accountId={selectedAccountId || undefined} />;

      case 'accounts':
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5">Tài khoản Zalo</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenLoginDialog()}
              >
                Thêm tài khoản
              </Button>
            </Box>

            <Grid container spacing={2}>
              {accounts.map((account) => (
                <Grid item xs={12} sm={6} md={4} key={account.id}>
                  <Paper
                    sx={{
                      p: 2,
                      border: selectedAccountId === account.id ? 2 : 0,
                      borderColor: 'primary.main',
                    }}
                  >
                    <Box
                      sx={{ cursor: account.status === 'active' ? 'pointer' : 'not-allowed', opacity: account.status === 'active' ? 1 : 0.7 }}
                      onClick={() => {
                        if (account.status === 'active') {
                          setSelectedAccountId(account.id);
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar src={account.avatar} sx={{ mr: 2 }}>
                          {account.displayName[0]}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1">{account.displayName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {account.phoneNumber || account.userId}
                          </Typography>
                        </Box>
                      </Box>
                      {account.status === 'active' ? (
                        <Chip label="Đang hoạt động" color="success" size="small" />
                      ) : (
                        <Chip label="Phiên đã hết hạn" color="error" size="small" />
                      )}
                    </Box>

                    {account.status === 'active' ? (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<Logout />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLogout(account.id);
                        }}
                        sx={{ mt: 2, width: '100%' }}
                      >
                        Đăng xuất
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<Add />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLoginDialog(account.id);
                        }}
                        sx={{ mt: 2, width: '100%' }}
                      >
                        Đăng nhập lại
                      </Button>
                    )}
                  </Paper>
                </Grid>
              ))}

              {accounts.length === 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      Chưa có tài khoản Zalo nào. Nhấn "Thêm tài khoản" để bắt đầu.
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      case 'send-message':
        return selectedAccountId ? (
          <SendMessagePanel accountId={selectedAccountId} />
        ) : (
          <Typography>Vui lòng chọn tài khoản Zalo</Typography>
        );

      case 'scrape-group':
        return selectedAccountId ? (
          <ScrapeGroupPanel accountId={selectedAccountId} />
        ) : (
          <Typography>Vui lòng chọn tài khoản Zalo</Typography>
        );

      case 'contacts':
        return selectedAccountId ? (
          <ContactsPanel accountId={selectedAccountId} />
        ) : (
          <Typography>Vui lòng chọn tài khoản Zalo</Typography>
        );

      case 'templates':
        return <TemplatesPanel />;

      case 'campaigns':
        return <CampaignsPanel accountId={selectedAccountId || undefined} />;

      case 'contact-groups':
        return selectedAccountId ? (
          <ContactGroupsPanel accountId={selectedAccountId} />
        ) : (
          <Typography>Vui lòng chọn tài khoản Zalo</Typography>
        );

      case 'message-history':
        return selectedAccountId ? (
          <MessageHistoryPanel accountId={selectedAccountId} />
        ) : (
          <Typography>Vui lòng chọn tài khoản Zalo</Typography>
        );

      case 'auto-reply':
        return selectedAccountId ? (
          <AutoReplyRulesPanel accountId={selectedAccountId} />
        ) : (
          <Typography>Vui lòng chọn tài khoản Zalo</Typography>
        );

      case 'settings':
        return <SettingsPanel />;

      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Zalo Marketing Desktop
          </Typography>

          {syncStatus && (
            <Box sx={{ mr: 2 }}>
              <Typography variant="caption" sx={{ mr: 1 }}>
                Chưa đồng bộ: {syncStatus.unsyncedMessages + syncStatus.unsyncedContacts}
              </Typography>
            </Box>
          )}

          <Button
            color="inherit"
            startIcon={<Sync />}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ'}
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="persistent"
        open={drawerOpen}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem disablePadding>
              <ListItemButton
                selected={activePanel === 'accounts'}
                onClick={() => setActivePanel('accounts')}
              >
                <ListItemIcon>
                  <AccountCircle />
                </ListItemIcon>
                <ListItemText primary="Tài khoản" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                selected={activePanel === 'analytics'}
                onClick={() => setActivePanel('analytics')}
              >
                <ListItemIcon>
                  <BarChart />
                </ListItemIcon>
                <ListItemText primary="Thống kê & Phân tích" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                selected={activePanel === 'send-message'}
                onClick={() => setActivePanel('send-message')}
              >
                <ListItemIcon>
                  <Message />
                </ListItemIcon>
                <ListItemText primary="Gửi tin nhắn" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                selected={activePanel === 'scrape-group'}
                onClick={() => setActivePanel('scrape-group')}
              >
                <ListItemIcon>
                  <Group />
                </ListItemIcon>
                <ListItemText primary="Lấy thành viên nhóm" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                selected={activePanel === 'contacts'}
                onClick={() => setActivePanel('contacts')}
              >
                <ListItemIcon>
                  <ContactPage />
                </ListItemIcon>
                <ListItemText primary="Danh bạ" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                selected={activePanel === 'templates'}
                onClick={() => setActivePanel('templates')}
              >
                <ListItemIcon>
                  <Description />
                </ListItemIcon>
                <ListItemText primary="Quản lý Template" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                selected={activePanel === 'campaigns'}
                onClick={() => setActivePanel('campaigns')}
              >
                <ListItemIcon>
                  <Campaign />
                </ListItemIcon>
                <ListItemText primary="Quản lý Chiến Dịch" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                selected={activePanel === 'contact-groups'}
                onClick={() => setActivePanel('contact-groups')}
              >
                <ListItemIcon>
                  <GroupWork />
                </ListItemIcon>
                <ListItemText primary="Nhóm Danh Bạ" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                selected={activePanel === 'message-history'}
                onClick={() => setActivePanel('message-history')}
              >
                <ListItemIcon>
                  <History />
                </ListItemIcon>
                <ListItemText primary="Lịch Sử Tin Nhắn" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                selected={activePanel === 'auto-reply'}
                onClick={() => setActivePanel('auto-reply')}
              >
                <ListItemIcon>
                  <SmartToy />
                </ListItemIcon>
                <ListItemText primary="Tự Động Trả Lời" />
              </ListItemButton>
            </ListItem>
          </List>

          <Divider />

          <List>
            <ListItem disablePadding>
              <ListItemButton
                selected={activePanel === 'settings'}
                onClick={() => setActivePanel('settings')}
              >
                <ListItemIcon>
                  <Settings />
                </ListItemIcon>
                <ListItemText primary="Cài đặt" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerOpen ? DRAWER_WIDTH : 0}px)` },
          ml: drawerOpen ? 0 : `-${DRAWER_WIDTH}px`,
          transition: 'margin 0.3s',
        }}
      >
        <Toolbar />
        <Container maxWidth="lg">
          {renderPanel()}
        </Container>
      </Box>

      <ZaloLogin
        open={showLoginDialog}
        onClose={() => {
          setShowLoginDialog(false);
          setReloginAccountId(undefined);
        }}
        onSuccess={handleLoginSuccess}
        reloginAccountId={reloginAccountId}
      />

      {/* Sync Message Snackbar */}
      <Snackbar
        open={syncMessage !== null}
        autoHideDuration={5000}
        onClose={() => setSyncMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSyncMessage(null)}
          severity={syncMessage?.severity || 'info'}
          sx={{ width: '100%' }}
        >
          {syncMessage?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;
