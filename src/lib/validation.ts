import { z } from "zod";

// Equipment validation schema
export const equipmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Equipment name must be at least 3 characters")
    .max(100, "Equipment name must be less than 100 characters"),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
  category: z
    .string()
    .trim()
    .min(2, "Category must be at least 2 characters")
    .max(50, "Category must be less than 50 characters"),
  district: z
    .string()
    .trim()
    .min(2, "District must be at least 2 characters")
    .max(50, "District must be less than 50 characters"),
  price_per_day: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Price must be a positive number",
    })
    .refine((val) => parseFloat(val) <= 100000, {
      message: "Price cannot exceed ₹100,000 per day",
    }),
  contact_number: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian phone number"),
  image_url: z
    .string()
    .trim()
    .url("Please enter a valid URL")
    .max(500, "URL must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});

// Review validation schema
export const reviewSchema = z.object({
  rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
  comment: z
    .string()
    .trim()
    .max(500, "Comment must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});

// Message validation schema
export const messageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be less than 1000 characters"),
});

// Profile validation schema
export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian phone number")
    .optional()
    .or(z.literal("")),
  district: z
    .string()
    .trim()
    .max(50, "District must be less than 50 characters")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(500, "Address must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});

export type EquipmentFormData = z.infer<typeof equipmentSchema>;
export type ReviewFormData = z.infer<typeof reviewSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
