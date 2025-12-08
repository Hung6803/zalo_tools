import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Chip,
  Avatar,
  SelectChangeEvent,
  Alert,
} from '@mui/material';
import { getZaloAccounts, ZaloAccount } from '../api/localApi';

interface AccountSelectorProps {
  mode: 'single' | 'multiple';
  value: number[] | number | null;
  onChange: (accountIds: number[] | number | null) => void;
  label?: string;
  required?: boolean;
  helperText?: string;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({
  mode,
  value,
  onChange,
  label = 'Chọn tài khoản Zalo',
  required = false,
  helperText,
}) => {
  const [accounts, setAccounts] = useState<ZaloAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getZaloAccounts();

      // Only show active accounts
      const activeAccounts = data.filter((acc) => acc.status === 'active');
      setAccounts(activeAccounts);

      // Auto-select first account if mode is single and no value
      if (mode === 'single' && !value && activeAccounts.length > 0) {
        onChange(activeAccounts[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
      setError('Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event: SelectChangeEvent<number | number[]>) => {
    const val = event.target.value;

    if (mode === 'single') {
      onChange(val === '' ? null : (val as number));
    } else {
      onChange(val as number[]);
    }
  };

  const selectedAccountIds = mode === 'single'
    ? (value as number | null)
    : (value as number[] || []);

  const getSelectedAccounts = () => {
    if (mode === 'single') {
      const accountId = value as number | null;
      return accountId ? accounts.filter((acc) => acc.id === accountId) : [];
    } else {
      const accountIds = value as number[] || [];
      return accounts.filter((acc) => accountIds.includes(acc.id));
    }
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (accounts.length === 0 && !loading) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        Không có tài khoản Zalo nào đang hoạt động. Vui lòng đăng nhập tài khoản trước.
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <FormControl fullWidth required={required}>
        <InputLabel>{label}</InputLabel>
        <Select
          multiple={mode === 'multiple'}
          value={mode === 'single' ? (value || '') : (value || [])}
          onChange={handleChange}
          disabled={loading || accounts.length === 0}
          renderValue={() => {
            const selectedAccs = getSelectedAccounts();

            if (mode === 'single') {
              const account = selectedAccs[0];
              return account ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar src={account.avatar} sx={{ width: 24, height: 24 }}>
                    {account.displayName[0]}
                  </Avatar>
                  {account.displayName}
                </Box>
              ) : '';
            } else {
              return (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selectedAccs.map((account) => (
                    <Chip
                      key={account.id}
                      avatar={
                        <Avatar src={account.avatar} sx={{ width: 24, height: 24 }}>
                          {account.displayName[0]}
                        </Avatar>
                      }
                      label={account.displayName}
                      size="small"
                    />
                  ))}
                </Box>
              );
            }
          }}
        >
          {accounts.map((account) => (
            <MenuItem key={account.id} value={account.id}>
              {mode === 'multiple' && (
                <Checkbox
                  checked={
                    Array.isArray(selectedAccountIds) &&
                    selectedAccountIds.includes(account.id)
                  }
                />
              )}
              <Avatar src={account.avatar} sx={{ width: 32, height: 32, mr: 2 }}>
                {account.displayName[0]}
              </Avatar>
              <ListItemText
                primary={account.displayName}
                secondary={account.phoneNumber || account.userId}
              />
            </MenuItem>
          ))}
        </Select>
        {helperText && (
          <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
            {helperText}
          </Box>
        )}
      </FormControl>
    </Box>
  );
};

export default AccountSelector;
