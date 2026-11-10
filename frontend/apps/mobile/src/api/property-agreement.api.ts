/**
 * Property Agreement / Rental Application API
 *
 * Covers the 5-step property agreement wizard (/property-agreement):
 *   Step 1 — Personal information & employment
 *   Step 2 — Rental history & references
 *   Step 3 — Financial details (income, credit consent)
 *   Step 4 — Agreement terms review
 *   Step 5 — E-signature & submission
 *
 * Also covers deposit protection tracking post-submission.
 *
 * Endpoints:
 *   POST   /property-applications                        — create / start a new application (draft)
 *   GET    /property-applications                        — list current user's applications
 *   GET    /property-applications/:id                    — get single application (with current step)
 *   PATCH  /property-applications/:id/step/:stepNum      — save progress for a specific step
 *   POST   /property-applications/:id/submit             — final submit (triggers e-signature flow)
 *   POST   /property-applications/:id/sign               — submit e-signature
 *   DELETE /property-applications/:id                    — withdraw application (before submission)
 *
 *   GET    /property-applications/:id/deposit            — deposit protection details
 *   POST   /property-applications/:id/deposit/pay        — initiate deposit payment
 *
 *   Landlord-side (badge required):
 *   GET    /property-applications/received               — applications received for my listings
 *   PATCH  /property-applications/:id/decision           — approve or reject application
 */

import { api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "signed"
  | "withdrawn";

export interface PersonalInfo {
  fullName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  currentAddress: string;
  employerName?: string;
  employerAddress?: string;
  jobTitle?: string;
  employmentType?: "full_time" | "part_time" | "self_employed" | "student" | "other";
  monthlyIncome?: number;
}

export interface RentalHistory {
  currentLandlordName?: string;
  currentLandlordPhone?: string;
  monthsAtCurrentAddress?: number;
  reasonForLeaving?: string;
  previousAddress?: string;
  references?: { name: string; phone: string; relationship: string }[];
}

export interface FinancialDetails {
  monthlyIncome: number;
  otherIncome?: number;
  creditCheckConsent: boolean;
  hasPets?: boolean;
  petDescription?: string;
  additionalOccupants?: number;
}

export interface AgreementTermsAcknowledgement {
  rentAmount: number;
  leaseTerm: string;
  moveInDate: string;
  depositAmount: number;
  /** Optional since plan 12: the signature on the offer is the acknowledgement. */
  termsRead?: boolean;
  termsAgreed?: boolean;
}

export interface ESignature {
  /** Base64 encoded signature image or typed name */
  signature: string;
  signatureType: "drawn" | "typed";
  signedAt: string;
}

export interface PropertyApplication {
  id: string;
  listingId: string;
  listingTitle?: string;
  /** The listing as the application sees it; `availableDate` is a calendar date (plan 12). */
  listing?: { id: string; title: string; address?: string; city?: string; country?: string; availableDate?: string | null };
  landlordId?: string;
  landlordName?: string;
  rentAmount?: number | null;
  depositAmount?: number | null;
  currency?: string;
  applicantId: string;
  status: ApplicationStatus;
  currentStep: 1 | 2 | 3 | 4 | 5;
  personalInfo?: PersonalInfo;
  rentalHistory?: RentalHistory;
  financialDetails?: FinancialDetails;
  agreementTerms?: AgreementTermsAcknowledgement;
  signature?: ESignature;
  landlordDecision?: "approved" | "rejected";
  landlordNote?: string;
  submittedAt?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepositProtection {
  applicationId: string;
  amount: number;
  currency: string;
  status: "pending" | "held" | "released" | "disputed";
  scheme?: string;
  referenceNumber?: string;
  heldAt?: string;
  releaseDate?: string;
}

export type StepPayload =
  | { step: 1; data: PersonalInfo }
  | { step: 2; data: RentalHistory }
  | { step: 3; data: FinancialDetails }
  | { step: 4; data: AgreementTermsAcknowledgement }
  | { step: 5; data: ESignature };

// ─── API calls ────────────────────────────────────────────────────────────────

export function createApplication(listingId: string): Promise<PropertyApplication> {
  return api.post<PropertyApplication>("/property-applications", { listingId });
}

export function getMyApplications(): Promise<PropertyApplication[]> {
  return api.get<PropertyApplication[]>("/property-applications");
}

export function getApplication(id: string): Promise<PropertyApplication> {
  return api.get<PropertyApplication>(`/property-applications/${id}`);
}

export function saveStep(id: string, stepNum: 1 | 2 | 3 | 4 | 5, data: unknown): Promise<PropertyApplication> {
  return api.patch<PropertyApplication>(`/property-applications/${id}/step/${stepNum}`, data);
}

export function submitApplication(id: string): Promise<PropertyApplication> {
  return api.post<PropertyApplication>(`/property-applications/${id}/submit`);
}

export function signApplication(id: string, signature: ESignature): Promise<PropertyApplication> {
  return api.post<PropertyApplication>(`/property-applications/${id}/sign`, signature);
}

export function withdrawApplication(id: string): Promise<void> {
  return api.delete(`/property-applications/${id}`);
}

export function getDepositDetails(id: string): Promise<DepositProtection> {
  return api.get<DepositProtection>(`/property-applications/${id}/deposit`);
}

export function initiateDepositPayment(id: string): Promise<{ paymentUrl: string; referenceNumber: string }> {
  return api.post(`/property-applications/${id}/deposit/pay`);
}

export function getReceivedApplications(): Promise<PropertyApplication[]> {
  return api.get<PropertyApplication[]>("/property-applications/received");
}

export function decideApplication(id: string, decision: "approved" | "rejected", note?: string): Promise<PropertyApplication> {
  return api.patch<PropertyApplication>(`/property-applications/${id}/decision`, { decision, note });
}
