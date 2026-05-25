export type DepartmentKey =
  | "visa"
  | "translation"
  | "accounting"
  | "consultancy"
  | "general";

export interface Department {
  key: DepartmentKey;
  label: string;
  description: string;
  icon: string;
  // Roles allowed to handle this department.
  roles: Array<"secretary" | "manager" | "admin" | "translator">;
}

export const DEPARTMENTS: Department[] = [
  {
    key: "visa",
    label: "Visa Support",
    description: "Questions about visa applications and requirements",
    icon: "🛂",
    roles: ["secretary", "manager", "admin"],
  },
  {
    key: "translation",
    label: "Document Translation",
    description: "Document translation requests and status",
    icon: "📄",
    roles: ["translator", "manager", "admin"],
  },
  {
    key: "accounting",
    label: "Accounting & Bookkeeping",
    description: "Bookkeeping, tax, and financial questions",
    icon: "📊",
    roles: ["secretary", "manager", "admin"],
  },
  {
    key: "consultancy",
    label: "Business Consultancy",
    description: "Business setup and consultancy services",
    icon: "💼",
    roles: ["secretary", "manager", "admin"],
  },
  {
    key: "general",
    label: "General Support",
    description: "General questions and support",
    icon: "💬",
    roles: ["secretary", "manager", "admin"],
  },
];

export function getDepartment(key: string | null | undefined): Department {
  return DEPARTMENTS.find((d) => d.key === key) ?? DEPARTMENTS[4];
}

export function departmentsForRole(role: string | null | undefined): DepartmentKey[] {
  if (!role) return [];
  if (role === "admin" || role === "manager") return DEPARTMENTS.map((d) => d.key);
  return DEPARTMENTS.filter((d) => d.roles.includes(role as never)).map((d) => d.key);
}
