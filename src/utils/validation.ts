import { z } from 'zod';
import { OTP_CONFIG, OTP_COPY } from '../config/otp.config';

export const phoneSchema = z.string()
  .transform(val => val.replace(/\s|-/g, ''))
  .refine(val => /^(03|3)[0-9]{9}$/.test(val), {
    message: 'Please enter a valid Pakistani mobile number',
  });

const otpIncompleteMessage = OTP_COPY.incompleteCode(OTP_CONFIG.length);

export const otpSchema = z.string()
  .length(OTP_CONFIG.length, { message: otpIncompleteMessage })
  .regex(new RegExp(`^[0-9]{${OTP_CONFIG.length}}$`), { message: otpIncompleteMessage });

export const nameSchema = z.string()
  .min(2, { message: 'Name must be at least 2 characters' })
  .max(50, { message: 'Name must be 50 characters or less' })
  .transform(val => val.trim())
  .refine(val => val.length >= 2, { message: 'Please enter your name' });
