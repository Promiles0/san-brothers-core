export interface SupportedLanguage {
  code: string;
  flag: string;
  nameEn: string;
  nameNative: string;
  isAvailable: boolean;
  isComingSoon?: boolean;
}

export interface PricingPlan {
  planType: "payg" | "daily" | "monthly" | "yearly";
  name: string;
  minutes: number;
  priceRwf: number;
  isPopular?: boolean;
  validity?: string;
  note?: string;
}

export interface DocumentType {
  name: string;
  examples: string;
}

export const supportedLanguages: SupportedLanguage[] = [
  { code: "EN", flag: "🇬🇧", nameEn: "English", nameNative: "English", isAvailable: true },
  { code: "ZH", flag: "🇨🇳", nameEn: "Chinese (Mandarin)", nameNative: "中文", isAvailable: true },
  { code: "RW", flag: "🇷🇼", nameEn: "Kinyarwanda", nameNative: "Kinyarwanda", isAvailable: true },
  { code: "FR", flag: "🇫🇷", nameEn: "French", nameNative: "Français", isAvailable: true },
  { code: "AR", flag: "🇸🇦", nameEn: "Arabic", nameNative: "العربية", isAvailable: true },
  { code: "SW", flag: "🇰🇪", nameEn: "Swahili", nameNative: "Kiswahili", isAvailable: false, isComingSoon: true },
  { code: "PT", flag: "🇵🇹", nameEn: "Portuguese", nameNative: "Português", isAvailable: false, isComingSoon: true },
];

export const pricingPlans: PricingPlan[] = [
  { planType: "payg", name: "Starter", minutes: 5, priceRwf: 2500 },
  { planType: "payg", name: "Most Popular", minutes: 30, priceRwf: 12000, isPopular: true, note: "Save 20%" },
  { planType: "payg", name: "Pro", minutes: 60, priceRwf: 22000, note: "Save 27%" },
  { planType: "daily", name: "Half Day", minutes: 30, priceRwf: 10000, validity: "24h" },
  { planType: "daily", name: "Most Popular", minutes: 60, priceRwf: 18000, isPopular: true, validity: "24h" },
  { planType: "daily", name: "Full Day", minutes: 120, priceRwf: 30000, validity: "24h" },
  { planType: "monthly", name: "Light", minutes: 120, priceRwf: 25000, validity: "month" },
  { planType: "monthly", name: "Most Popular", minutes: 300, priceRwf: 55000, isPopular: true, validity: "month", note: "Rolls over up to 2 months" },
  { planType: "monthly", name: "Business", minutes: 600, priceRwf: 95000, validity: "month", note: "Rolls over up to 2 months" },
  { planType: "yearly", name: "Casual", minutes: 1200, priceRwf: 240000, validity: "year" },
  { planType: "yearly", name: "Most Popular", minutes: 3000, priceRwf: 540000, isPopular: true, validity: "year", note: "Save 25%" },
  { planType: "yearly", name: "Heavy", minutes: 6000, priceRwf: 960000, validity: "year", note: "Save 35%" },
];

export const documentTypes: DocumentType[] = [
  { name: "Personal letters", examples: "Family correspondence, invitations" },
  { name: "School transcripts and diplomas", examples: "Academic records, certificates" },
  { name: "Business contracts", examples: "Agreements, NDAs, MoUs" },
  { name: "Legal documents", examples: "Certified, sworn translations" },
  { name: "Medical reports", examples: "Health records, prescriptions" },
  { name: "Birth/marriage certificates", examples: "Civil status documents" },
  { name: "Bank statements", examples: "Financial records" },
  { name: "Anything else", examples: "Just ask — we handle custom requests" },
];
