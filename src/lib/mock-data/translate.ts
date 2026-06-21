export interface DocumentType {
  name: string;
  examples: string;
}

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
