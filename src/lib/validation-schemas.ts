
import { z } from "zod";

// Enums for validation
const LeadSourceEnum = z.enum(["website", "chat", "referral", "ads"]);
const LeadStatusEnum = z.enum([
  "new",
  "contacted",
  "qualified",
  "proposal",
  "closed_won",
  "closed_lost",
]);
const LeadBudgetEnum = z.enum([
  "under_5k",
  "5k_25k",
  "25k_100k",
  "100k_500k",
  "500k_plus",
]);
const LeadTimelineEnum = z.enum([
  "immediate",
  "1_3_months",
  "3_6_months",
  "6_12_months",
  "12_plus_months",
]);
const ChannelEnum = z.enum(["chat", "email", "phone"]);
const RoleEnum = z.enum(["user", "assistant", "system"]);
const ServiceTierEnum = z.enum(["basic", "growth", "enterprise"]);
const OllamaActionEnum = z.enum(["generate", "chat", "models", "pull"]);
const AIProviderEnum = z.enum(["ollama", "google", "anthropic", "openai"]);

// Phone number regex (basic international format)
const phoneRegex = /^\+?[\d\s\-\(\)]{7,}$/;

// Lead validation schemas
export const LeadCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email format"),
  company: z
    .string()
    .max(100, "Company name must be less than 100 characters")
    .optional(),
  phone: z.string().regex(phoneRegex, "Invalid phone number format").optional(),
  source: LeadSourceEnum,
  budget: LeadBudgetEnum.optional(),
  timeline: LeadTimelineEnum.optional(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
});

export const LeadUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  email: z.string().email("Invalid email format").optional(),
  company: z
    .string()
    .max(100, "Company name must be less than 100 characters")
    .optional(),
  phone: z.string().regex(phoneRegex, "Invalid phone number format").optional(),
  source: LeadSourceEnum.optional(),
  budget: LeadBudgetEnum.optional(),
  timeline: LeadTimelineEnum.optional(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
  status: LeadStatusEnum.optional(),
  score: z.number().min(0).max(100).optional(),
  interests: z.array(z.string()).optional(),
});

// Appointment validation schemas
export const AppointmentCreateSchema = z.object({
  lead_id: z.string().uuid("Invalid lead ID format"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  scheduled_at: z.string().datetime("Invalid date format"),
  duration_minutes: z
    .number()
    .min(15, "Duration must be at least 15 minutes")
    .max(480, "Duration cannot exceed 8 hours"),
  meeting_link: z.string().url("Invalid meeting link format").optional(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
});

// Conversation validation schemas
export const ConversationCreateSchema = z.object({
  lead_id: z.string().uuid("Invalid lead ID format").optional(),
  channel: ChannelEnum,
});

export const MessageCreateSchema = z.object({
  role: RoleEnum,
  content: z
    .string()
    .min(1, "Content is required")
    .max(10000, "Content must be less than 10,000 characters"),
  metadata: z.record(z.any()).optional(),
});

// Service validation schemas
export const ServiceCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Service name is required")
    .max(100, "Service name must be less than 100 characters"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  tier: ServiceTierEnum,
  price: z.number().min(0, "Price must be non-negative"),
  features: z.array(z.string()).min(1, "At least one feature is required"),
});

// AI/Ollama validation schemas
export const OllamaRequestSchema = z.object({
  action: OllamaActionEnum,
  model: z.string().optional(),
  prompt: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: RoleEnum,
        content: z.string().min(1, "Message content is required"),
      }),
    )
    .optional(),
  options: z.record(z.any()).optional(),
});

export const AIAgentRequestSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
  message: z
    .string()
    .min(1, "Message is required")
    .max(5000, "Message must be less than 5000 characters"),
  conversationHistory: z
    .array(
      z.object({
        role: RoleEnum,
        content: z.string().min(1, "Message content is required"),
      }),
    )
    .optional(),
  preferredProvider: AIProviderEnum.optional(),
});

export const ModelConfigSchema = z.object({
    agentId: z.string(),
    primaryProvider: AIProviderEnum,
    primaryModel: z.string(),
    fallbackChain: z.array(z.object({
        provider: AIProviderEnum,
        model: z.string(),
        priority: z.number(),
    })),
});

export const UsageQuerySchema = z.object({
    userId: z.string().uuid(),
    dateRange: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
    }),
});

// Query parameter schemas
export const PaginationSchema = z.object({
  page: z
    .string()
    .transform(Number)
    .refine((val) => val > 0, "Page must be greater than 0")
    .optional(),
  limit: z
    .string()
    .transform(Number)
    .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
    .optional(),
  search: z.string().optional(),
  status: LeadStatusEnum.optional(),
  source: LeadSourceEnum.optional(),
});

// Utility function to sanitize strings
export function sanitizeString(input: string): string {
  return input.trim().replace(/\0/g, "");
}

// Utility function to validate and sanitize input
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: any): T {
  const validated = schema.parse(data);

  // Apply sanitization to string fields
  if (typeof validated === "object" && validated !== null) {
    Object.keys(validated).forEach((key) => {
      if (typeof (validated as any)[key] === "string") {
        (validated as any)[key] = sanitizeString((validated as any)[key]);
      }
    });
  }

  return validated;
}

