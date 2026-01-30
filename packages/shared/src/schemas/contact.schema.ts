import { z } from 'zod';

// =============================================================================
// Contact Form
// =============================================================================

export const ContactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  recaptcha_token: z.string().min(1, 'reCAPTCHA verification required'),
});
export type ContactFormDto = z.infer<typeof ContactFormSchema>;

export const ContactSubmissionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  subject: z.string(),
  message: z.string(),
  status: z.enum(['pending', 'read', 'replied', 'archived']),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  created_at: z.coerce.date(),
  replied_at: z.coerce.date().nullable(),
  replied_by: z.string().uuid().nullable(),
});
export type ContactSubmission = z.infer<typeof ContactSubmissionSchema>;

export enum ContactStatus {
  PENDING = 'pending',
  READ = 'read',
  REPLIED = 'replied',
  ARCHIVED = 'archived',
}

export const ContactStatusSchema = z.nativeEnum(ContactStatus);
