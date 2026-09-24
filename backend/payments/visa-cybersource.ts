/**
 * Pinduoduo Uzbekistan — Visa payment adapter
 *
 * Provider: Visa / Cybersource
 * API: Cybersource REST Payments API
 *
 * IMPORTANT:
 * - Never store PAN, CVV/CVC or raw card data in our backend/database.
 * - The frontend should tokenize card data with Cybersource Flex/Click to Pay
 *   and send only the resulting token/instrument ID to this service.
 * - Credentials MUST come from environment variables / secret manager.
 *
 * Sandbox:
 *   https://apitest.cybersource.com
 * Production:
 *   https://api.cybersource.com
 *
 * Official docs:
 *   https://developer.cybersource.com/docs/cybs/en-us/payments/developer/migs/rest/payments.html
 */

import crypto from "node:crypto";

type Currency = "USD" | "UZS" | "EUR";

export type VisaPaymentStatus =
  | "AUTHORIZED"
  | "PENDING"
  | "DECLINED"
  | "FAILED"
  | "REFUNDED";

export interface VisaCustomer {
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string; // ISO 3166-1 alpha-2, e.g. UZ
}

export interface CreateVisaPaymentInput {
  orderId: string;
  amount: string; // Decimal string, e.g. "125.50"
  currency: Currency;
  customer: VisaCustomer;

  /**
   * Token/instrument returned by the PCI-compliant card tokenization layer.
   * Do NOT pass PAN/CVV here.
   */
  paymentInstrumentId: string;

  /**
   * false = authorize only; true = authorization + capture.
   * For a marketplace, authorize-then-capture is usually preferable because
   * capture can happen when the order is ready to be fulfilled.
   */
  capture?: boolean;
}

export interface VisaPaymentResult {
  provider: "cybersource";
  orderId: string;
  transactionId: string;
  status: VisaPaymentStatus;
  responseCode?: string;
  reconciliationId?: string;
  rawStatus?: string;
}

interface CybersourceResponse {
  id?: string;
  status?: string;
  submitTimeUtc?: string;
  reconciliationId?: string;
  processorInformation?: {
    responseCode?: string;
    transactionId?: string;
    networkTransactionId?: string;
    approvalCode?: string;
    responseDetails?: string;
  };
  errorInformation?: {
    reason?: string;
    message?: string;
  };
}

/**
 * Cybersource HTTP Signature authentication.
 *
 * NOTE: Cybersource documents HTTP Signature authentication as being
 * deprecated for March 2027. Keep this adapter isolated so authentication
 * can later be switched to the current supported method without touching
 * order/payment business logic.
 */
function buildHttpSignatureHeaders(
  method: string,
  resourcePath: string,
  body: string,
): Record<string, string> {
  const host = process.env.CYBERSOURCE_HOST ?? "apitest.cybersource.com";
  const merchantId = requiredEnv("CYBERSOURCE_MERCHANT_ID");
  const keyId = requiredEnv("CYBERSOURCE_KEY_ID");
  const secretKey = requiredEnv("CYBERSOURCE_SECRET_KEY");

  const date = new Date().toUTCString();
  const digest =
    "SHA-256=" +
    crypto.createHash("sha256").update(body, "utf8").digest("base64");

  const signingString = [
    `host: ${host}`,
    `date: ${date}`,
    `request-target: ${method.toLowerCase()} ${resourcePath}`,
    `digest: ${digest}`,
    `v-c-merchant-id: ${merchantId}`,
  ].join("\n");

  const signature = crypto
    .createHmac("sha256", Buffer.from(secretKey, "base64"))
    .update(signingString, "utf8")
    .digest("base64");

  return {
    host,
    date,
    "v-c-merchant-id": merchantId,
    digest,
    "Content-Type": "application/json",
    Signature:
      `keyid="${keyId}", algorithm="HmacSHA256", headers="host date request-target digest v-c-merchant-id", signature="${signature}"`,
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function mapStatus(response: CybersourceResponse): VisaPaymentStatus {
  switch (response.status) {
    case "AUTHORIZED":
    case "PARTIAL_AUTHORIZED":
      return "AUTHORIZED";
    case "PENDING":
      return "PENDING";
    case "DECLINED":
      return "DECLINED";
    case "REFUNDED":
      return "REFUNDED";
    default:
      return response.errorInformation ? "FAILED" : "FAILED";
  }
}

async function cybersourceRequest<T>(
  method: string,
  resourcePath: string,
  payload: unknown,
): Promise<T> {
  const host = process.env.CYBERSOURCE_HOST ?? "apitest.cybersource.com";
  const body = JSON.stringify(payload);

  const response = await fetch(`https://${host}${resourcePath}`, {
    method,
    headers: buildHttpSignatureHeaders(method, resourcePath, body),
    body,
  });

  const text = await response.text();

  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Cybersource returned non-JSON response (HTTP ${response.status})`);
  }

  if (!response.ok) {
    const error = data as CybersourceResponse;
    throw new Error(
      `Cybersource request failed: HTTP ${response.status}; ${error.errorInformation?.reason ?? error.errorInformation?.message ?? "unknown error"}`,
    );
  }

  return data as T;
}

export class VisaPaymentService {
  /**
   * Create a Visa card payment.
   *
   * This uses a tokenized payment instrument rather than raw card details.
   * Cybersource's sale endpoint combines authorization + capture when
   * processingInformation.capture = true.
   */
  async createPayment(
    input: CreateVisaPaymentInput,
  ): Promise<VisaPaymentResult> {
    if (!input.orderId.trim()) throw new Error("orderId is required");
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(input.amount)) {
      throw new Error("amount must be a positive decimal string");
    }
    if (!input.paymentInstrumentId.trim()) {
      throw new Error("paymentInstrumentId is required");
    }

    const clientReference = `PDU-${input.orderId}`;

    const payload = {
      clientReferenceInformation: {
        code: clientReference,
      },
      processingInformation: {
        capture: input.capture ?? true,
      },
      paymentInformation: {
        paymentInstrument: {
          id: input.paymentInstrumentId,
        },
      },
      orderInformation: {
        amountDetails: {
          totalAmount: input.amount,
          currency: input.currency,
        },
        billTo: {
          firstName: input.customer.firstName,
          lastName: input.customer.lastName,
          email: input.customer.email,
          address1: input.customer.address1,
          locality: input.customer.city,
          administrativeArea: input.customer.state ?? input.customer.city,
          postalCode: input.customer.postalCode,
          country: input.customer.country,
        },
      },
    };

    const response = await cybersourceRequest<CybersourceResponse>(
      "POST",
      "/pts/v2/payments",
      payload,
    );

    return {
      provider: "cybersource",
      orderId: input.orderId,
      transactionId:
        response.id ??
        response.processorInformation?.transactionId ??
        clientReference,
      status: mapStatus(response),
      responseCode: response.processorInformation?.responseCode,
      reconciliationId: response.reconciliationId,
      rawStatus: response.status,
    };
  }

  /**
   * Capture an existing authorization.
   */
  async capturePayment(
    transactionId: string,
    orderId: string,
    amount: string,
    currency: Currency,
  ): Promise<VisaPaymentResult> {
    const payload = {
      clientReferenceInformation: {
        code: `PDU-${orderId}`,
      },
      orderInformation: {
        amountDetails: {
          totalAmount: amount,
          currency,
        },
      },
    };

    const response = await cybersourceRequest<CybersourceResponse>(
      "POST",
      `/pts/v2/payments/${encodeURIComponent(transactionId)}/captures`,
      payload,
    );

    return {
      provider: "cybersource",
      orderId,
      transactionId: response.id ?? transactionId,
      status: mapStatus(response),
      responseCode: response.processorInformation?.responseCode,
      reconciliationId: response.reconciliationId,
      rawStatus: response.status,
    };
  }

  /**
   * Refund a captured payment.
   */
  async refundPayment(
    transactionId: string,
    orderId: string,
    amount: string,
    currency: Currency,
  ): Promise<VisaPaymentResult> {
    const payload = {
      orderInformation: {
        amountDetails: {
          totalAmount: amount,
          currency,
        },
      },
    };

    const response = await cybersourceRequest<CybersourceResponse>(
      "POST",
      `/pts/v2/payments/${encodeURIComponent(transactionId)}/refunds`,
      payload,
    );

    return {
      provider: "cybersource",
      orderId,
      transactionId: response.id ?? transactionId,
      status: response.status === "REFUNDED" ? "REFUNDED" : mapStatus(response),
      responseCode: response.processorInformation?.responseCode,
      reconciliationId: response.reconciliationId,
      rawStatus: response.status,
    };
  }
}

export const visaPayments = new VisaPaymentService();
