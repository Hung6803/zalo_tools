import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Send,
  Upload,
  Delete,
  Pause,
  PlayArrow,
  Stop,
  Visibility,
  FileDownload,
} from '@mui/icons-material';
import { sendMessage } from '../api/localApi';
import {
  importRecipientsFromExcel,
  downloadBulkSendTemplate,
} from '../utils/excelUtils';

interface Template {
  id: number;
  name: string;
  content: string;
  variables: string[];
  usageCount?: number;
}

interface Recipient {
  userId: string;
  displayName: string;
  variables: Record<string, string>;
}

interface SendProgress {
  total: number;
  sent: number;
  failed: number;
  current: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'stopped';
}

interface BulkSendPanelProps {
  accountId: number;
}

const BulkSendPanel: React.FC<BulkSendPanelProps> = ({ accountId }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [delayMs, setDelayMs] = useState(2000);
  const [maxRetries, setMaxRetries] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [progress, setProgress] = useState<SendProgress>({
    total: 0,
    sent: 0,
    failed: 0,
    current: 0,
    status: 'idle',
  });

  const [activeStep, setActiveStep] = useState(0);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewRecipient, setPreviewRecipient] = useState<Recipient | null>(null);
  const [previewMessage, setPreviewMessage] = useState('');

  const steps = ['Chọn Template', 'Thêm Người Nhận', 'Cấu Hình & Gửi'];

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, [accountId]);

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      setSelectedTemplate(template || null);
    } else {
      setSelectedTemplate(null);
    }
  }, [selectedTemplateId, templates]);

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3001/local/templates?activeOnly=true`,
      );
      const result = await response.json();

      if (result.success) {
        setTemplates(result.data);
      }
    } catch (err: any) {
      setError('Không thể tải danh sách template');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const templateVariables = selectedTemplate?.variables || [];
      const excelRecipients = await importRecipientsFromExcel(file, templateVariables);

      const parsedRecipients: Recipient[] = excelRecipients.map((row) => {
        const variables: Record<string, string> = {};

        // Extract template variables from Excel row
        templateVariables.forEach((varName) => {
          if (row[varName]) {
            variables[varName] = row[varName];
          }
        });

        return {
          userId: row.userId,
          displayName: row.displayName,
          variables,
        };
      });

      setRecipients(parsedRecipients);
      setSuccess(`Đã tải ${parsedRecipients.length} người nhận từ Excel`);
    } catch (err: any) {
      setError(err.message || 'Không thể đọc file Excel. Vui lòng kiểm tra lại file.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleAddRecipient = () => {
    setRecipients([
      ...recipients,
      {
        userId: '',
        displayName: '',
        variables: {},
      },
    ]);
  };

  const handleUpdateRecipient = (index: number, field: string, value: string) => {
    const updated = [...recipients];
    if (field === 'userId' || field === 'displayName') {
      updated[index][field] = value;
    }
    setRecipients(updated);
  };

  const handleDeleteRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const replaceVariables = (content: string, variables: Record<string, string>): string => {
    let result = content;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, variables[key]);
    });
    return result;
  };

  const handlePreview = (recipient: Recipient) => {
    if (!selectedTemplate) return;

    const message = replaceVariables(selectedTemplate.content, recipient.variables);
    setPreviewRecipient(recipient);
    setPreviewMessage(message);
    setPreviewDialogOpen(true);
  };

  const handleStartBulkSend = async () => {
    if (!selectedTemplate || recipients.length === 0) {
      setError('Vui lòng chọn template và thêm người nhận');
      return;
    }

    setProgress({
      total: recipients.length,
      sent: 0,
      failed: 0,
      current: 0,
      status: 'running',
    });

    for (let i = 0; i < recipients.length; i++) {
      if (progress.status === 'stopped') break;

      while (progress.status === 'paused') {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setProgress((prev) => ({ ...prev, current: i }));

      const recipient = recipients[i];
      const message = replaceVariables(selectedTemplate.content, recipient.variables);

      let attempts = 0;
      let sent = false;

      while (attempts <= maxRetries && !sent) {
        try {
          const result = await sendMessage(accountId, recipient.userId, message);

          if (result.success) {
            sent = true;
            setProgress((prev) => ({ ...prev, sent: prev.sent + 1 }));

            // Increment template usage count
            await fetch(`http://localhost:3001/local/templates/${selectedTemplate.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ usageCount: (selectedTemplate.usageCount || 0) + 1 }),
            });
          } else {
            throw new Error(result.error);
          }
        } catch (err: any) {
          attempts++;
          console.warn(`❌ Failed to send to ${recipient.userId}, attempt ${attempts}/${maxRetries + 1}`);

          if (attempts > maxRetries) {
            setProgress((prev) => ({ ...prev, failed: prev.failed + 1 }));
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      // Delay between messages
      if (i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    setProgress((prev) => ({ ...prev, status: 'completed' }));
    setSuccess(`Hoàn thành! Đã gửi ${progress.sent}/${recipients.length} tin nhắn`);
  };

  const handlePause = () => {
    setProgress((prev) => ({ ...prev, status: 'paused' }));
  };

  const handleResume = () => {
    setProgress((prev) => ({ ...prev, status: 'running' }));
  };

  const handleStop = () => {
    setProgress((prev) => ({ ...prev, status: 'stopped' }));
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Chọn Template
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Template</InputLabel>
              <Select
                value={selectedTemplateId || ''}
                onChange={(e) => setSelectedTemplateId(e.target.value as number)}
              >
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedTemplate && (
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.100' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedTemplate.content}
                </Typography>
                {selectedTemplate.variables.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    {selectedTemplate.variables.map((varName) => (
                      <Chip key={varName} label={`{${varName}}`} size="small" />
                    ))}
                  </Stack>
                )}
              </Paper>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Danh Sách Người Nhận</Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<FileDownload />}
                  onClick={() => downloadBulkSendTemplate(selectedTemplate?.variables || [])}
                >
                  Tải file mẫu
                </Button>
                <Button variant="outlined" component="label" startIcon={<Upload />}>
                  Nhập Excel
                  <input type="file" accept=".xlsx,.xls" hidden onChange={handleFileUpload} />
                </Button>
                <Button variant="contained" onClick={handleAddRecipient}>
                  Thêm Người Nhận
                </Button>
              </Stack>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              Excel format: userId, displayName, {selectedTemplate?.variables.join(', ')}
            </Alert>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User ID</TableCell>
                    <TableCell>Tên</TableCell>
                    {selectedTemplate?.variables.map((varName) => (
                      <TableCell key={varName}>{varName}</TableCell>
                    ))}
                    <TableCell align="right">Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recipients.map((recipient, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          size="small"
                          value={recipient.userId}
                          onChange={(e) => handleUpdateRecipient(index, 'userId', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={recipient.displayName}
                          onChange={(e) => handleUpdateRecipient(index, 'displayName', e.target.value)}
                        />
                      </TableCell>
                      {selectedTemplate?.variables.map((varName) => (
                        <TableCell key={varName}>
                          <TextField
                            size="small"
                            value={recipient.variables[varName] || ''}
                            onChange={(e) => {
                              const updated = [...recipients];
                              updated[index].variables[varName] = e.target.value;
                              setRecipients(updated);
                            }}
                          />
                        </TableCell>
                      ))}
                      <TableCell align="right">
                        <Tooltip title="Xem trước">
                          <IconButton size="small" onClick={() => handlePreview(recipient)}>
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRecipient(index)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {recipients.length === 0 && (
              <Paper sx={{ p: 3, textAlign: 'center', mt: 2 }}>
                <Typography color="text.secondary">
                  Chưa có người nhận. Thêm thủ công hoặc tải lên file CSV.
                </Typography>
              </Paper>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Cấu Hình Gửi
            </Typography>

            <Stack spacing={2} sx={{ mb: 3 }}>
              <TextField
                label="Độ trễ giữa các tin nhắn (ms)"
                type="number"
                value={delayMs}
                onChange={(e) => setDelayMs(parseInt(e.target.value))}
                helperText="Khuyến nghị: 2000-5000ms để tránh spam"
              />

              <TextField
                label="Số lần thử lại khi thất bại"
                type="number"
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                helperText="Số lần thử lại khi gửi tin nhắn thất bại"
              />
            </Stack>

            <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
              <Typography variant="subtitle2" gutterBottom>
                Tóm tắt:
              </Typography>
              <Typography variant="body2">
                • Template: {selectedTemplate?.name}
              </Typography>
              <Typography variant="body2">
                • Số người nhận: {recipients.length}
              </Typography>
              <Typography variant="body2">
                • Độ trễ: {delayMs}ms
              </Typography>
              <Typography variant="body2">
                • Thử lại: {maxRetries} lần
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Thời gian ước tính: ~{((recipients.length * delayMs) / 1000 / 60).toFixed(1)} phút
              </Typography>
            </Paper>

            {progress.status !== 'idle' && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Tiến trình: {progress.sent + progress.failed}/{progress.total}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={((progress.sent + progress.failed) / progress.total) * 100}
                  sx={{ mb: 1 }}
                />
                <Stack direction="row" spacing={2}>
                  <Chip label={`Thành công: ${progress.sent}`} color="success" size="small" />
                  <Chip label={`Thất bại: ${progress.failed}`} color="error" size="small" />
                </Stack>

                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  {progress.status === 'running' && (
                    <Button startIcon={<Pause />} onClick={handlePause}>
                      Tạm dừng
                    </Button>
                  )}
                  {progress.status === 'paused' && (
                    <Button startIcon={<PlayArrow />} onClick={handleResume}>
                      Tiếp tục
                    </Button>
                  )}
                  {progress.status !== 'completed' && progress.status !== 'stopped' && (
                    <Button startIcon={<Stop />} color="error" onClick={handleStop}>
                      Dừng
                    </Button>
                  )}
                </Stack>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Gửi Tin Nhắn Hàng Loạt
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 3, mb: 2 }}>
        {renderStepContent()}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button disabled={activeStep === 0} onClick={() => setActiveStep((prev) => prev - 1)}>
          Quay lại
        </Button>
        <Box>
          {activeStep < steps.length - 1 && (
            <Button
              variant="contained"
              onClick={() => setActiveStep((prev) => prev + 1)}
              disabled={
                (activeStep === 0 && !selectedTemplateId) ||
                (activeStep === 1 && recipients.length === 0)
              }
            >
              Tiếp theo
            </Button>
          )}
          {activeStep === steps.length - 1 && progress.status === 'idle' && (
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={handleStartBulkSend}
              disabled={!selectedTemplate || recipients.length === 0 || loading}
            >
              Bắt Đầu Gửi
            </Button>
          )}
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Xem Trước Tin Nhắn</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" gutterBottom>
            Gửi đến: {previewRecipient?.displayName} ({previewRecipient?.userId})
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.100', mt: 2 }}>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{previewMessage}</Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BulkSendPanel;
