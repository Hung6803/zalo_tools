import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Grid,
  Tooltip,
  Stack,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  ContentCopy,
  CheckCircle,
  Cancel,
  AttachFile,
  Image,
  Close as CloseIcon,
} from '@mui/icons-material';

interface Template {
  id: number;
  agentId?: string;
  name: string;
  content: string;
  variables: string[];
  category?: string;
  description?: string;
  isActive: number;
  usageCount: number;
  attachments?: string; // JSON string of attachment file paths
  createdAt: string;
  updatedAt: string;
}

interface TemplatesPanelProps {}

const TemplatesPanel: React.FC<TemplatesPanelProps> = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Field-level errors for inline validation
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    content: '',
  });

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  // Form states
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState(''); // Image URL for message
  const [formIsActive, setFormIsActive] = useState(true);
  const [formAttachments, setFormAttachments] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Load templates
  useEffect(() => {
    loadTemplates();
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

  const loadTemplates = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/local/templates');
      const result = await response.json();

      if (result.success) {
        setTemplates(result.data);
      } else {
        console.error('Load templates failed:', result);
        setError(result.error || 'Không thể tải danh sách template. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError('Lỗi kết nối. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template?: Template) => {
    // Reset error and success messages when opening dialog
    setError('');
    setSuccess('');
    setFieldErrors({
      name: '',
      content: '',
    });

    if (template) {
      setEditingTemplate(template);
      setFormName(template.name);
      setFormContent(template.content);
      setFormCategory(template.category || '');
      setFormDescription(template.description || '');
      setFormImageUrl(template.imageUrl || '');
      setFormIsActive(template.isActive === 1);
      // Parse attachments from JSON string
      try {
        const attachments = template.attachments ? JSON.parse(template.attachments) : [];
        setFormAttachments(Array.isArray(attachments) ? attachments : []);
      } catch {
        setFormAttachments([]);
      }
    } else {
      setEditingTemplate(null);
      setFormName('');
      setFormContent('');
      setFormCategory('');
      setFormDescription('');
      setFormImageUrl('');
      setFormIsActive(true);
      setFormAttachments([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTemplate(null);
    // Reset error and success messages when closing dialog
    setError('');
    setSuccess('');
    setFieldErrors({
      name: '',
      content: '',
    });
  };

  const extractVariables = (content: string): string[] => {
    const regex = /\[(\w+)\]/g;
    const matches = content.match(regex);
    if (!matches) return [];

    const variables = matches.map((m) => m.replace(/[\[\]]/g, ''));
    return [...new Set(variables)]; // Remove duplicates
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    try {
      const newAttachments: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Create a FormData to upload file
        const formData = new FormData();
        formData.append('file', file);

        // Upload to server
        const response = await fetch('http://localhost:3001/local/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.success && result.filePath) {
          newAttachments.push(result.filePath);
        } else {
          console.error('File upload failed:', result);
          setError(`Không thể upload file ${file.name}`);
        }
      }

      setFormAttachments([...formAttachments, ...newAttachments]);

      // Clear file input
      event.target.value = '';
    } catch (err: any) {
      console.error('Error uploading files:', err);
      setError('Không thể upload file. Vui lòng thử lại.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setFormAttachments(formAttachments.filter((_, i) => i !== index));
  };

  const handleSaveTemplate = async () => {
    // Clear all previous errors
    setError('');
    setSuccess('');
    setFieldErrors({
      name: '',
      content: '',
    });

    let hasError = false;
    const newErrors = { ...fieldErrors };

    // Validation
    if (!formName.trim()) {
      newErrors.name = 'Vui lòng nhập tên template';
      hasError = true;
    }

    if (!formContent.trim()) {
      newErrors.content = 'Vui lòng nhập nội dung template';
      hasError = true;
    }

    // If there are errors, update state and return
    if (hasError) {
      setFieldErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const variables = extractVariables(formContent);

      const payload = {
        name: formName.trim(),
        content: formContent.trim(),
        variables,
        category: formCategory.trim() || undefined,
        description: formDescription.trim() || undefined,
        imageUrl: formImageUrl.trim() || undefined,
        isActive: formIsActive ? 1 : 0,
        attachments: formAttachments.length > 0 ? JSON.stringify(formAttachments) : undefined,
      };

      let response;
      if (editingTemplate) {
        // Update existing template
        response = await fetch(`http://localhost:3001/local/templates/${editingTemplate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new template
        response = await fetch('http://localhost:3001/local/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await response.json();

      if (result.success) {
        console.log('Template saved successfully:', editingTemplate ? editingTemplate.id : 'new');
        setSuccess(
          editingTemplate ? 'Đã cập nhật template thành công' : 'Đã tạo template thành công',
        );
        handleCloseDialog();
        loadTemplates();
      } else {
        console.error('Save template failed:', result);
        setError('Không thể lưu template. Vui lòng kiểm tra thông tin và thử lại.');
      }
    } catch (err: any) {
      console.error('Error saving template:', err);
      setError('Không thể lưu template. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`http://localhost:3001/local/templates/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        console.log('Template deleted successfully:', id);
        setSuccess('Đã xóa template thành công');
        setDeleteConfirmId(null);
        loadTemplates();
      } else {
        console.error('Delete template failed:', result);
        setError('Không thể xóa template. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('Error deleting template:', err);
      setError('Không thể xóa template. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewTemplate = async (template: Template) => {
    try {
      // Create sample data for preview
      const sampleVariables: any = {};
      template.variables.forEach((varName) => {
        sampleVariables[varName] = `[${varName}]`;
      });

      const response = await fetch('http://localhost:3001/local/templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: template.content,
          variables: sampleVariables,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('Template preview generated successfully');
        setPreviewContent(result.data.preview);
        setPreviewDialogOpen(true);
      } else {
        console.error('Preview template failed:', result);
        setError('Không thể xem trước template. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('Error previewing template:', err);
      setError('Không thể xem trước template. Vui lòng thử lại.');
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    setSuccess('Đã copy nội dung');
    setTimeout(() => setSuccess(''), 2000);
  };

  const insertVariable = (varName: string) => {
    setFormContent((prev) => `${prev}[${varName}]`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Quản lý Template
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Tạo Template
        </Button>
      </Box>

      {error && !openDialog && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && !openDialog && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {loading && !openDialog && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                opacity: template.isActive ? 1 : 0.6,
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {template.name}
                  </Typography>
                  {template.isActive === 1 ? (
                    <CheckCircle color="success" fontSize="small" />
                  ) : (
                    <Cancel color="disabled" fontSize="small" />
                  )}
                </Box>

                {template.category && (
                  <Chip label={template.category} size="small" sx={{ mb: 1 }} />
                )}

                {template.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {template.description}
                  </Typography>
                )}

                <Typography
                  variant="body2"
                  sx={{
                    mb: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {template.content}
                </Typography>

                {template.variables.length > 0 && (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                    {template.variables.map((varName) => (
                      <Chip key={varName} label={`[${varName}]`} size="small" variant="outlined" />
                    ))}
                  </Stack>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Đã dùng: {template.usageCount} lần
                </Typography>
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Box>
                  <Tooltip title="Xem trước">
                    <IconButton size="small" onClick={() => handlePreviewTemplate(template)}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Copy nội dung">
                    <IconButton size="small" onClick={() => handleCopyContent(template.content)}>
                      <ContentCopy />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box>
                  <Tooltip title="Chỉnh sửa">
                    <IconButton size="small" onClick={() => handleOpenDialog(template)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Xóa">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteConfirmId(template.id)}
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {templates.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Chưa có template nào. Nhấn "Tạo Template" để bắt đầu.
          </Typography>
        </Paper>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingTemplate ? 'Chỉnh sửa Template' : 'Tạo Template Mới'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Tên template"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              sx={{ mb: 2 }}
              required
              error={!!fieldErrors.name}
              helperText={fieldErrors.name}
            />

            <TextField
              fullWidth
              label="Danh mục (tùy chọn)"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              sx={{ mb: 2 }}
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

            <TextField
              fullWidth
              label="URL ảnh đính kèm (tùy chọn)"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              helperText="Nhập URL ảnh để gửi kèm tin nhắn. Ảnh sẽ được gửi trước nội dung tin nhắn."
              sx={{ mb: 2 }}
            />

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                <strong>HƯỚNG DẪN:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • <strong>Nhiều biến thể tin nhắn:</strong> Cách nhau bởi dấu "|" (Shift + \)
                <br />
                Ví dụ: Tin nhắn 1 | Tin nhắn 2 | Tin nhắn 3
              </Typography>

              <Typography variant="body2" sx={{ mb: 1 }}>
                • <strong>Biến từ Excel</strong> (dùng khi gửi hàng loạt từ file Excel):
                <br />
                - [FULLNAME] - Họ và tên trong Excel
                <br />
                - [MOBILE] - Số điện thoại (dùng để tìm tài khoản Zalo)
                <br />
                - [INFO1], [INFO2], [INFO3], [INFO4] - Các trường thông tin bổ sung
              </Typography>

              <Typography variant="body2">
                • <strong>Biến từ Zalo</strong>
                <br />
                - [FULLNAME_WEB] - Tên hiển thị gốc trên Zalo
                <br />
                - [FULLNAME_ORIGINAL] - Tên đã cá nhân hóa (tên bạn đặt cho tài khoản đích trong danh bạ)
                <br />
                - [vocative_web] - anh/chị (viết thường)
                <br />
                - [Vocative_web] - Anh/Chị (viết hoa chữ đầu)
                <br />
                - [VOCATIVE_WEB] - ANH/CHỊ (viết hoa toàn bộ)
              </Typography>
            </Alert>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Biến từ Excel:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => insertVariable('FULLNAME')}
                sx={{ textTransform: 'none' }}
              >
                + [FULLNAME]
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => insertVariable('MOBILE')}
                sx={{ textTransform: 'none' }}
              >
                + [MOBILE]
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => insertVariable('INFO1')}
                sx={{ textTransform: 'none' }}
              >
                + [INFO1]
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => insertVariable('INFO2')}
                sx={{ textTransform: 'none' }}
              >
                + [INFO2]
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => insertVariable('INFO3')}
                sx={{ textTransform: 'none' }}
              >
                + [INFO3]
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => insertVariable('INFO4')}
                sx={{ textTransform: 'none' }}
              >
                + [INFO4]
              </Button>
            </Stack>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Biến từ Zalo:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => insertVariable('FULLNAME_WEB')}
                sx={{ textTransform: 'none' }}
              >
                + [FULLNAME_WEB]
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => insertVariable('vocative_web')}
                sx={{ textTransform: 'none' }}
              >
                + [vocative_web]
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => insertVariable('Vocative_web')}
                sx={{ textTransform: 'none' }}
              >
                + [Vocative_web]
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => insertVariable('VOCATIVE_WEB')}
                sx={{ textTransform: 'none' }}
              >
                + [VOCATIVE_WEB]
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => insertVariable('FULLNAME_ORIGINAL')}
                sx={{ textTransform: 'none' }}
              >
                + [FULLNAME_ORIGINAL]
              </Button>
            </Stack>

            <TextField
              fullWidth
              label="Nội dung"
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              multiline
              rows={6}
              sx={{ mb: 2 }}
              required
              error={!!fieldErrors.content}
              helperText={fieldErrors.content}
            />

            {extractVariables(formContent).length > 0 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Biến được tìm thấy:</strong>{' '}
                  {extractVariables(formContent).map((v) => `[${v}]`).join(', ')}
                </Typography>
              </Alert>
            )}

            {/* File Attachments Section */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                File đính kèm (hình ảnh/tài liệu)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                💡 Gợi ý: Khi có file đính kèm, thời gian nghỉ giữa 2 lần gửi nên là 60-100 giây
              </Typography>

              {/* Upload Button */}
              <input
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                style={{ display: 'none' }}
                id="upload-attachment-file"
                type="file"
                multiple
                onChange={handleFileUpload}
              />
              <label htmlFor="upload-attachment-file">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={uploadingFile ? <CircularProgress size={20} /> : <AttachFile />}
                  disabled={uploadingFile}
                  sx={{ mb: 2 }}
                >
                  {uploadingFile ? 'Đang upload...' : 'Thêm file/hình ảnh'}
                </Button>
              </label>

              {/* Display uploaded files */}
              {formAttachments.length > 0 && (
                <Stack spacing={1}>
                  {formAttachments.map((filePath, index) => {
                    const fileName = filePath.split('/').pop() || filePath;
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

                    return (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          p: 1,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: 'background.paper',
                        }}
                      >
                        {isImage ? (
                          <Image sx={{ mr: 1, color: 'primary.main' }} />
                        ) : (
                          <AttachFile sx={{ mr: 1, color: 'text.secondary' }} />
                        )}
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {fileName}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveAttachment(index)}
                          color="error"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>

            <FormControlLabel
              control={
                <Switch checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
              }
              label="Kích hoạt template"
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Hủy</Button>
          <Button onClick={handleSaveTemplate} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : editingTemplate ? 'Cập nhật' : 'Tạo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc chắn muốn xóa template này không?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Hủy</Button>
          <Button
            onClick={() => deleteConfirmId && handleDeleteTemplate(deleteConfirmId)}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Xem trước Template</DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{previewContent}</Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplatesPanel;
