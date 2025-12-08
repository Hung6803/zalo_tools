import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Tooltip,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  KeyboardArrowUp,
  KeyboardArrowDown,
  SmartToy,
} from '@mui/icons-material';
import localApi from '../api/localApi';

interface AutoReplyRule {
  id: number;
  accountId: number;
  name: string;
  description?: string;
  keywords: string[];
  replyMessage: string;
  isActive: number;
  priority: number;
  matchType: 'exact' | 'contains' | 'regex';
  createdAt: string;
  updatedAt: string;
}

interface AutoReplyRulesPanelProps {
  accountId: number;
}

const AutoReplyRulesPanel: React.FC<AutoReplyRulesPanelProps> = ({ accountId }) => {
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingRule, setDeletingRule] = useState<AutoReplyRule | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formKeywords, setFormKeywords] = useState<string[]>(['']);
  const [formReplyMessage, setFormReplyMessage] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formPriority, setFormPriority] = useState(0);
  const [formMatchType, setFormMatchType] = useState<'exact' | 'contains' | 'regex'>('contains');

  useEffect(() => {
    loadRules();
  }, [accountId]);

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadRules = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await localApi.get(`/local/auto-reply-rules/${accountId}`);
      if (response.data.success) {
        setRules(response.data.data || []);
      } else {
        console.error('Load auto-reply rules failed:', response.data);
        setError('Không thể tải danh sách quy tắc. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('Error loading auto-reply rules:', err);
      setError('Lỗi kết nối. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingRule(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (rule: AutoReplyRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDescription(rule.description || '');
    setFormKeywords(rule.keywords.length > 0 ? rule.keywords : ['']);
    setFormReplyMessage(rule.replyMessage);
    setFormIsActive(rule.isActive === 1);
    setFormPriority(rule.priority);
    setFormMatchType(rule.matchType);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormKeywords(['']);
    setFormReplyMessage('');
    setFormIsActive(true);
    setFormPriority(0);
    setFormMatchType('contains');
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setDialogError('Vui lòng nhập tên quy tắc');
      return;
    }

    const validKeywords = formKeywords.filter((k) => k.trim());
    if (validKeywords.length === 0) {
      setDialogError('Vui lòng thêm ít nhất 1 từ khóa');
      return;
    }

    if (!formReplyMessage.trim()) {
      setDialogError('Vui lòng nhập tin nhắn trả lời');
      return;
    }

    try {
      setLoading(true);
      setDialogError(null);

      const data = {
        accountId,
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        keywords: validKeywords,
        replyMessage: formReplyMessage.trim(),
        isActive: formIsActive,
        priority: formPriority,
        matchType: formMatchType,
      };

      if (editingRule) {
        await localApi.patch(`/local/auto-reply-rules/${editingRule.id}`, data);
        console.log('Auto-reply rule updated successfully:', editingRule.id);
        setSuccess('Đã cập nhật quy tắc thành công');
      } else {
        await localApi.post('/local/auto-reply-rules', data);
        console.log('Auto-reply rule created successfully');
        setSuccess('Đã tạo quy tắc thành công');
      }

      setDialogOpen(false);
      resetForm();
      await loadRules();
    } catch (err: any) {
      console.error('Error saving auto-reply rule:', err);
      setDialogError('Không thể lưu quy tắc. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (rule: AutoReplyRule) => {
    try {
      const newStatus = rule.isActive === 1 ? 0 : 1;
      await localApi.patch(`/local/auto-reply-rules/${rule.id}`, {
        isActive: newStatus,
      });
      console.log('Auto-reply rule status toggled:', rule.id, 'new status:', newStatus);
      await loadRules();
    } catch (err: any) {
      console.error('Error toggling auto-reply rule status:', err);
      setError('Không thể cập nhật trạng thái. Vui lòng thử lại.');
    }
  };

  const handleChangePriority = async (rule: AutoReplyRule, delta: number) => {
    try {
      const newPriority = rule.priority + delta;
      await localApi.patch(`/local/auto-reply-rules/${rule.id}`, {
        priority: newPriority,
      });
      console.log('Auto-reply rule priority changed:', rule.id, 'new priority:', newPriority);
      await loadRules();
    } catch (err: any) {
      console.error('Error changing auto-reply rule priority:', err);
      setError('Không thể cập nhật độ ưu tiên. Vui lòng thử lại.');
    }
  };

  const handleDelete = async () => {
    if (!deletingRule) return;

    try {
      setLoading(true);
      setError(null);

      await localApi.delete(`/local/auto-reply-rules/${deletingRule.id}`);
      console.log('Auto-reply rule deleted successfully:', deletingRule.id);
      setSuccess('Đã xóa quy tắc thành công');
      setDeleteConfirmOpen(false);
      setDeletingRule(null);
      await loadRules();
    } catch (err: any) {
      console.error('Error deleting auto-reply rule:', err);
      setError('Không thể xóa quy tắc. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const addKeywordField = () => {
    setFormKeywords([...formKeywords, '']);
  };

  const removeKeywordField = (index: number) => {
    const newKeywords = formKeywords.filter((_, i) => i !== index);
    setFormKeywords(newKeywords.length > 0 ? newKeywords : ['']);
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...formKeywords];
    newKeywords[index] = value;
    setFormKeywords(newKeywords);
  };

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case 'exact':
        return 'Khớp chính xác';
      case 'contains':
        return 'Chứa từ khóa';
      case 'regex':
        return 'Regex';
      default:
        return type;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Quy Tắc Tự Động Trả Lời
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tự động trả lời tin nhắn dựa trên từ khóa
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
          Tạo quy tắc mới
        </Button>
      </Box>

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

      {/* Table */}
      <Card>
        <CardContent>
          {loading && rules.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : rules.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <SmartToy sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">
                Chưa có quy tắc tự động trả lời nào
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={openCreateDialog}
                sx={{ mt: 2 }}
              >
                Tạo quy tắc đầu tiên
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Độ ưu tiên</TableCell>
                    <TableCell>Tên quy tắc</TableCell>
                    <TableCell>Từ khóa</TableCell>
                    <TableCell>Loại khớp</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell align="right">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleChangePriority(rule, 1)}
                          >
                            <KeyboardArrowUp fontSize="small" />
                          </IconButton>
                          <Typography variant="body2" sx={{ minWidth: 30, textAlign: 'center' }}>
                            {rule.priority}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleChangePriority(rule, -1)}
                          >
                            <KeyboardArrowDown fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {rule.name}
                        </Typography>
                        {rule.description && (
                          <Typography variant="caption" color="text.secondary">
                            {rule.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {rule.keywords.map((keyword, idx) => (
                            <Chip key={idx} label={keyword} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getMatchTypeLabel(rule.matchType)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.isActive === 1}
                          onChange={() => handleToggleActive(rule)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Chỉnh sửa">
                          <IconButton size="small" onClick={() => openEditDialog(rule)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setDeletingRule(rule);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => {
        setDialogOpen(false);
        setDialogError(null);
      }} maxWidth="md" fullWidth>
        <DialogTitle>{editingRule ? 'Chỉnh sửa quy tắc' : 'Tạo quy tắc mới'}</DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError(null)}>
              {dialogError}
            </Alert>
          )}
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Tên quy tắc"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label="Mô tả (tùy chọn)"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Từ khóa *
            </Typography>
            {formKeywords.map((keyword, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={`Từ khóa ${index + 1}`}
                  value={keyword}
                  onChange={(e) => updateKeyword(index, e.target.value)}
                />
                {formKeywords.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => removeKeywordField(index)}>
                    <Delete />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button size="small" onClick={addKeywordField} sx={{ mb: 2 }}>
              + Thêm từ khóa
            </Button>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Loại khớp</InputLabel>
              <Select
                value={formMatchType}
                onChange={(e) => setFormMatchType(e.target.value as any)}
                label="Loại khớp"
              >
                <MenuItem value="contains">Chứa từ khóa (không phân biệt hoa thường)</MenuItem>
                <MenuItem value="exact">Khớp chính xác (không phân biệt hoa thường)</MenuItem>
                <MenuItem value="regex">Regular Expression</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Tin nhắn trả lời"
              value={formReplyMessage}
              onChange={(e) => setFormReplyMessage(e.target.value)}
              multiline
              rows={4}
              sx={{ mb: 2 }}
              required
              helperText="Tin nhắn sẽ được gửi tự động khi phát hiện từ khóa"
            />

            <TextField
              fullWidth
              type="number"
              label="Độ ưu tiên"
              value={formPriority}
              onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
              sx={{ mb: 2 }}
              helperText="Quy tắc có độ ưu tiên cao hơn sẽ được kiểm tra trước"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                />
              }
              label="Kích hoạt quy tắc"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {editingRule ? 'Cập nhật' : 'Tạo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa quy tắc "{deletingRule?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Hủy</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutoReplyRulesPanel;
