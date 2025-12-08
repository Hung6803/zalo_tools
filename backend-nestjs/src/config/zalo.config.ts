import { registerAs } from '@nestjs/config';

export default registerAs('zalo', () => ({
  sessionPath: process.env.ZALO_SESSION_PATH || './data/sessions',
  messagesPerHour: parseInt(process.env.ZALO_MESSAGES_PER_HOUR || '100', 10),
  messagesPerDay: parseInt(process.env.ZALO_MESSAGES_PER_DAY || '500', 10),
  minDelayMs: parseInt(process.env.ZALO_MIN_DELAY_MS || '2000', 10),
  maxDelayMs: parseInt(process.env.ZALO_MAX_DELAY_MS || '5000', 10),
}));
