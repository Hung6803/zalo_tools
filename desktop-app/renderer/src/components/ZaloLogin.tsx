import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { loginZalo, checkLoginStatus, cancelLogin } from '../api/localApi';

interface ZaloLoginProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reloginAccountId?: number; // Optional: Use existing accountId for relogin
}

const ZaloLogin: React.FC<ZaloLoginProps> = ({ open, onClose, onSuccess, reloginAccountId }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [accountId, setAccountId] = useState<number>(0);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Generate NEW accountId or reuse existing one for relogin
  useEffect(() => {
    if (open) {
      let loginAccountId: number;

      if (reloginAccountId) {
        // Reuse existing accountId for relogin
        loginAccountId = reloginAccountId;
        console.log('🔄 Reusing existing accountId for relogin:', loginAccountId);
      } else {
        // Generate NEW accountId for new login
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        loginAccountId = timestamp * 10000 + random;
        console.log('🆕 Generated NEW accountId:', loginAccountId);
      }

      setAccountId(loginAccountId);
      startLogin(loginAccountId);
    }
  }, [open, reloginAccountId]);

  const handleClose = async () => {
    // Stop polling if active
    if (pollingInterval) {
      console.log('⏹️ Stopping polling...');
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    // Cancel login session if dialog is closed
    if (accountId && accountId !== 0) {
      console.log('🚫 User closed dialog, canceling login for account:', accountId);
      try {
        await cancelLogin(accountId);
      } catch (error) {
        console.error('❌ Failed to cancel login:', error);
      }
    }

    onClose();
  };

  const startLogin = async (loginAccountId: number) => {
    console.log('🚀 Starting Zalo login with accountId:', loginAccountId);
    setLoading(true);
    setError('');
    setQrCode(null);
    setStatus('Đang khởi tạo...');

    try {
      console.log('📞 Calling loginZalo API...');
      const result = await loginZalo(loginAccountId);
      console.log('✅ Login result:', result);

      if (result.success && result.data?.restored) {
        // Session restored successfully
        console.log('✅ Session restored!');
        setStatus('Đã khôi phục phiên đăng nhập!');
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else if (result.qrCode) {
        // QR code generated, show it
        setQrCode(result.qrCode);
        setStatus('Vui lòng quét mã QR');
        setLoading(false);
        // Start polling for login status
        pollLoginStatus(loginAccountId);
      } else if (result.success) {
        // Login successful immediately
        onSuccess();
      } else if (result.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'Không thể tạo QR code');
      setLoading(false);
    }
  };

  const pollLoginStatus = async (loginAccountId: number) => {
    const maxAttempts = 120; // 10 minutes (120 * 5 seconds)
    let attempts = 0;

    console.log('🔄 Starting polling for login status...');

    const interval = setInterval(async () => {
      attempts++;
      console.log(`🔍 Polling attempt ${attempts}/${maxAttempts}...`);

      try {
        const result = await checkLoginStatus(loginAccountId);
        console.log('📊 Check login result:', result);

        // Update QR code if it appears during polling (race condition handling)
        if (result.qrCodeImage && !qrCode) {
          setQrCode(result.qrCodeImage);
        }

        // Update status message
        if (result.message) {
          setStatus(result.message);
        }

        if (result.status === 'success') {
          console.log('✅ Login successful! Closing...');
          clearInterval(interval);
          setPollingInterval(null);
          setLoading(false);
          setError('');

          // Check if account was merged (re-login with existing Zalo account)
          if (result.merged) {
            setStatus(`Đã tìm thấy tài khoản cũ! Đang khôi phục dữ liệu...`);
            console.log(`📌 Account merged: ${accountId} → ${result.accountId}`);
          } else {
            setStatus('Đăng nhập thành công!');
          }

          setTimeout(() => {
            onSuccess();
          }, 1000);
        } else if (result.status === 'scanning') {
          setStatus('Đã quét QR, đang xác nhận...');
        } else if (result.status === 'timeout') {
          console.log('⏱️ QR code expired');
          clearInterval(interval);
          setPollingInterval(null);
          setError('Mã QR đã hết hạn. Vui lòng thử lại.');
          setLoading(false);
        } else if (result.status === 'error') {
          console.log('❌ Login error');
          clearInterval(interval);
          setPollingInterval(null);
          setError(result.message || 'Đăng nhập thất bại');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Login check failed:', error);
      }

      if (attempts >= maxAttempts) {
        console.log('⏱️ Polling timeout reached');
        clearInterval(interval);
        setPollingInterval(null);
        setLoading(false);
        setError('Hết thời gian chờ. Vui lòng thử lại.');
      }
    }, 2000); // Poll every 2 seconds (faster than before)

    // Store interval ID in state so we can clear it on cancel
    setPollingInterval(interval);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Đăng nhập Zalo</DialogTitle>
      <DialogContent>
        {loading && !qrCode && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {status || 'Đang khởi tạo...'}
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {qrCode && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
              Quét mã QR bằng ứng dụng Zalo
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Mở Zalo trên điện thoại → Tab "Cá nhân" → Biểu tượng QR → Quét mã
            </Typography>
            <Box
              sx={{
                display: 'inline-block',
                padding: 2,
                bgcolor: 'white',
                borderRadius: 2,
                boxShadow: 2,
              }}
            >
              <img
                src={qrCode}
                alt="QR Code"
                style={{ maxWidth: '280px', width: '100%', height: 'auto', display: 'block' }}
              />
            </Box>
            <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {status === 'Đã quét QR, đang xác nhận...' ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  <Typography variant="body2" color="primary" fontWeight="medium">
                    {status}
                  </Typography>
                </>
              ) : status === 'Đăng nhập thành công!' ? (
                <Typography variant="body2" color="success.main" fontWeight="medium">
                  ✓ {status}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {status || 'Đang chờ quét mã...'}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Hủy
        </Button>
        {error && (
          <Button
            onClick={() => {
              const timestamp = Date.now();
              const random = Math.floor(Math.random() * 10000);
              const newAccountId = timestamp * 10000 + random;
              console.log('🔄 Retry with NEW accountId:', newAccountId);
              setAccountId(newAccountId);
              startLogin(newAccountId);
            }}
            variant="contained"
          >
            Thử lại
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ZaloLogin;
