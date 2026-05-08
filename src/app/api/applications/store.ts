export const statusOptions = [
  "Saved",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
] as const;

export type ApplicationStatus = (typeof statusOptions)[number];

export interface Application {
  id: string;
  company: string;
  role: string;
  location: string;
  salary: string;
  jobLink: string;
  status: ApplicationStatus;
  notes: string;
  createdAt: string;
}

export function isValidStatus(status: unknown): status is ApplicationStatus {
  return statusOptions.includes(status as ApplicationStatus);
}

export function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function formatApplication(application: Application): Application {
  return {
    ...application,
    location: application.location ?? "",
    salary: application.salary ?? "",
    jobLink: application.jobLink ?? "",
    notes: application.notes ?? "",
  };
}
