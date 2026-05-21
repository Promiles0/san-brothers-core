import type { User, Service, ServiceRequest, Document, Notification } from "@/lib/types";

export const mockUsers: User[] = [
  {
    id: "u1",
    email: "client@sb.com",
    fullName: "Alice Client",
    role: "client",
    signupSource: "web",
    preferredLanguage: "en",
    theme: "system",
  },
  {
    id: "u2",
    email: "sec@sb.com",
    fullName: "Sam Secretary",
    role: "secretary",
    signupSource: "internal",
    preferredLanguage: "en",
    theme: "light",
  },
  {
    id: "u3",
    email: "mgr@sb.com",
    fullName: "Maya Manager",
    role: "manager",
    signupSource: "internal",
    preferredLanguage: "en",
    theme: "dark",
  },
  {
    id: "u4",
    email: "trn@sb.com",
    fullName: "Tom Translator",
    role: "translator",
    signupSource: "web",
    preferredLanguage: "rw",
    theme: "system",
  },
  {
    id: "u5",
    email: "admin@sb.com",
    fullName: "Ada Admin",
    role: "admin",
    signupSource: "internal",
    preferredLanguage: "en",
    theme: "dark",
  },
];

export const mockServices: Service[] = [
  {
    id: "s1",
    name: "Visa Application Assistance",
    category: "visa",
    description: "End-to-end visa application support.",
    basePriceRwf: 250000,
    estimatedDays: 14,
  },
  {
    id: "s2",
    name: "Monthly Bookkeeping",
    category: "accounting",
    description: "Full monthly bookkeeping and reporting.",
    basePriceRwf: 180000,
    estimatedDays: 30,
  },
  {
    id: "s3",
    name: "Certified Document Translation",
    category: "translation",
    description: "Sworn translations EN/ZH/RW.",
    basePriceRwf: 45000,
    estimatedDays: 3,
  },
  {
    id: "s4",
    name: "Live Interpretation Call",
    category: "translation",
    description: "On-demand interpreter via video.",
    basePriceRwf: 25000,
    estimatedDays: 1,
  },
  {
    id: "s5",
    name: "Business Setup Consultancy",
    category: "consultancy",
    description: "Company incorporation in Rwanda.",
    basePriceRwf: 600000,
    estimatedDays: 21,
  },
];

export const mockServiceRequests: ServiceRequest[] = [
  {
    id: "r1",
    clientId: "u1",
    serviceId: "s1",
    status: "in_progress",
    progressStep: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "r2",
    clientId: "u1",
    serviceId: "s3",
    status: "awaiting_client",
    progressStep: 1,
    createdAt: new Date().toISOString(),
  },
];

export const mockDocuments: Document[] = [
  {
    id: "d1",
    serviceRequestId: "r1",
    fileName: "passport.pdf",
    status: "approved",
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "d2",
    serviceRequestId: "r1",
    fileName: "photo.jpg",
    status: "pending",
    uploadedAt: new Date().toISOString(),
  },
];

export const mockNotifications: Notification[] = [
  {
    id: "n1",
    userId: "u1",
    title: "Document approved",
    body: "Your passport was approved.",
    isRead: false,
    link: "/dashboard",
    createdAt: new Date().toISOString(),
  },
  {
    id: "n2",
    userId: "u1",
    title: "Action required",
    body: "Please upload a recent photo.",
    isRead: false,
    createdAt: new Date().toISOString(),
  },
];
