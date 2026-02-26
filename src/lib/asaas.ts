/**
 * Asaas Payment Gateway Integration
 *
 * API Docs: https://docs.asaas.com/
 * Sandbox: https://api-sandbox.asaas.com/v3
 * Production: https://api.asaas.com/v3
 *
 * Environment variables:
 * - ASAAS_API_KEY       → API key ($aact_...)
 * - ASAAS_ENVIRONMENT   → "sandbox" or "production"
 * - ASAAS_WEBHOOK_TOKEN → Token para validar webhooks
 */

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";
const ASAAS_ENV = process.env.ASAAS_ENVIRONMENT || "sandbox";
const BASE_URL =
  ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

export function isAsaasConfigured(): boolean {
  return !!ASAAS_API_KEY;
}

async function asaasRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...options?.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMsg =
      data.errors?.[0]?.description || data.message || "Erro na API Asaas";
    console.error("[Asaas] API Error:", JSON.stringify(data));
    throw new Error(errorMsg);
  }

  return data as T;
}

// ============ CUSTOMER ============

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  province?: string;
  externalReference?: string;
}

export interface CreateCustomerInput {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  externalReference?: string;
}

export async function createCustomer(
  input: CreateCustomerInput
): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function findCustomerByCpf(
  cpfCnpj: string
): Promise<AsaasCustomer | null> {
  const data = await asaasRequest<{ data: AsaasCustomer[] }>(
    `/customers?cpfCnpj=${cpfCnpj}`
  );
  return data.data?.[0] || null;
}

export async function getOrCreateCustomer(
  input: CreateCustomerInput
): Promise<AsaasCustomer> {
  const existing = await findCustomerByCpf(input.cpfCnpj);
  if (existing) return existing;
  return createCustomer(input);
}

// ============ PAYMENTS ============

export type BillingType = "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";

export type PaymentStatus =
  | "PENDING"
  | "RECEIVED"
  | "CONFIRMED"
  | "OVERDUE"
  | "REFUNDED"
  | "RECEIVED_IN_CASH"
  | "REFUND_REQUESTED"
  | "REFUND_IN_PROGRESS"
  | "CHARGEBACK_REQUESTED"
  | "CHARGEBACK_DISPUTE"
  | "AWAITING_CHARGEBACK_REVERSAL"
  | "DUNNING_REQUESTED"
  | "DUNNING_RECEIVED"
  | "AWAITING_RISK_ANALYSIS";

export interface CreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface CreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone?: string;
  mobilePhone?: string;
}

export interface CreatePaymentInput {
  customer: string;
  billingType: BillingType;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  creditCard?: CreditCardData;
  creditCardHolderInfo?: CreditCardHolderInfo;
  creditCardToken?: string;
  remoteIp?: string;
}

export interface AsaasPayment {
  id: string;
  dateCreated: string;
  customer: string;
  value: number;
  netValue: number;
  description?: string;
  billingType: BillingType;
  status: PaymentStatus;
  dueDate: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  externalReference?: string;
  installmentCount?: number;
  creditCardNumber?: string;
  creditCardBrand?: string;
  creditCardToken?: string;
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<AsaasPayment> {
  return asaasRequest<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getPayment(id: string): Promise<AsaasPayment> {
  return asaasRequest<AsaasPayment>(`/payments/${id}`);
}

// ============ PIX QR CODE ============

export interface PixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export async function getPixQrCode(paymentId: string): Promise<PixQrCode> {
  return asaasRequest<PixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

// ============ HELPERS ============

export function formatDueDate(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function mapAsaasStatusToOrder(
  status: PaymentStatus
): "PENDING" | "PAID" | "CANCELLED" {
  switch (status) {
    case "RECEIVED":
    case "CONFIRMED":
    case "RECEIVED_IN_CASH":
      return "PAID";
    case "REFUNDED":
    case "REFUND_REQUESTED":
    case "REFUND_IN_PROGRESS":
    case "CHARGEBACK_REQUESTED":
    case "CHARGEBACK_DISPUTE":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}
