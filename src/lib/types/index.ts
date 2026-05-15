export type UserRole = "client" | "secretary" | "manager" | "translator" | "admin";
export type Locale = "en" | "zh" | "rw";
export type Theme = "light" | "dark" | "system";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  signupSource: string;
  preferredLanguage: Locale;
  profilePictureUrl?: string;
  theme: Theme;
}

export interface Service {
  id: string;
  name: string;
  category: "visa" | "accounting" | "translation" | "consultancy";
  description: string;
  basePriceRwf: number;
  estimatedDays: number;
}

export type ServiceRequestStatus =
  | "submitted"
  | "in_progress"
  | "awaiting_client"
  | "forwarded"
  | "approved"
  | "completed"
  | "cancelled";

export interface ServiceRequest {
  id: string;
  clientId: string;
  serviceId: string;
  status: ServiceRequestStatus;
  progressStep: number;
  createdAt: string;
}

export interface Document {
  id: string;
  serviceRequestId: string;
  fileName: string;
  status: "pending" | "approved" | "rejected";
  uploadedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}
