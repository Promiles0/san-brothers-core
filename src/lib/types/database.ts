// Database types for Staff Capabilities, Services, Documents, Claims, Audit Log
// Mirrors the SQL schema in the Supabase project.

export type CapabilityName =
  | "handle_visa"
  | "handle_accounting"
  | "handle_consultancy"
  | "handle_translation"
  | "handle_live_calls"
  | "register_clients_manually"
  | "approve_visa"
  | "approve_accounting"
  | "view_financial_reports"
  | "manage_staff"
  | "manage_pricing"
  | "manage_services_catalog"
  | "view_audit_log"
  | "handle_claims";

export type ServiceCategory = "visa" | "accounting" | "consultancy" | "translation";

export type ServiceRequestStatus =
  | "submitted"
  | "under_review"
  | "awaiting_client"
  | "verified"
  | "submitted_to_authority"
  | "completed"
  | "rejected"
  | "cancelled";

export type ApplicantType = "individual" | "family" | "company";
export type Priority = "normal" | "urgent";

export type DocumentStatus = "uploaded" | "verified" | "rejected" | "final_delivery";

export type ClaimReasonCategory =
  | "service_not_delivered"
  | "service_incorrect"
  | "long_delay"
  | "quality_issue"
  | "refund_request"
  | "other";

export type ClaimStatus = "open" | "under_review" | "resolved" | "rejected";

export interface StaffCapability {
  id: string;
  user_id: string;
  capability: CapabilityName;
  granted_by: string | null;
  granted_at: string;
}

export interface CapabilityPreset {
  id: string;
  preset_name: string;
  description: string | null;
  capabilities: CapabilityName[];
  is_active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  slug: string;
  category: ServiceCategory;
  name_en: string;
  name_zh: string | null;
  name_rw: string | null;
  description_en: string | null;
  description_zh: string | null;
  description_rw: string | null;
  price_min_rwf: number | null;
  price_max_rwf: number | null;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequest {
  id: string;
  client_id: string;
  service_id: string;
  service_category: ServiceCategory;
  status: ServiceRequestStatus;
  progress_step: number;
  progress_total: number;
  assigned_staff_id: string | null;
  applicant_type: ApplicantType;
  priority: Priority;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DocumentRow {
  id: string;
  service_request_id: string;
  client_id: string;
  uploaded_by: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  status: DocumentStatus;
  is_final_delivery: boolean;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  uploaded_at: string;
}

export interface Claim {
  id: string;
  client_id: string;
  service_request_id: string | null;
  reason_category: ClaimReasonCategory;
  description: string;
  evidence_file_paths: string[] | null;
  status: ClaimStatus;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  refund_amount_rwf: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
