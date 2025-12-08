export class LoginWithQRResponseDto {
  qrCodeImage?: string; // Base64 image
  status: 'waiting' | 'scanning' | 'success' | 'error' | 'timeout';
  message?: string;
  data?: {
    displayName?: string;
    zaloId?: string;
    avatarUrl?: string;
  };
}
