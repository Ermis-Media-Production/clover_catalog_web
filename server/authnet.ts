/**
 * Authorize.net payment integration.
 * Uses the Accept.js / AIM JSON API directly (no SDK dependency needed).
 * All amounts are in cents; we convert to dollars before sending.
 */

const AUTHNET_ENDPOINT = {
  sandbox: "https://apitest.authorize.net/xml/v1/request.api",
  production: "https://api.authorize.net/xml/v1/request.api",
};

function getEndpoint(): string {
  const env = process.env.AUTHNET_ENVIRONMENT ?? "sandbox";
  return env === "production" ? AUTHNET_ENDPOINT.production : AUTHNET_ENDPOINT.sandbox;
}

function getMerchantAuth() {
  return {
    name: process.env.AUTHNET_API_LOGIN_ID ?? "",
    transactionKey: process.env.AUTHNET_TRANSACTION_KEY ?? "",
  };
}

export interface ChargeCardParams {
  /** Amount in cents */
  amountCents: number;
  /** Card number (no spaces) */
  cardNumber: string;
  /** MM/YYYY or MMYY */
  expirationDate: string;
  /** CVV */
  cardCode: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Order reference for tracking */
  invoiceNumber: string;
  /** Line items description */
  description?: string;
}

export interface ChargeResult {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

/**
 * Charge a credit card using Authorize.net createTransactionRequest.
 * Returns a typed result — never throws (errors are captured in the result).
 */
export async function chargeCard(params: ChargeCardParams): Promise<ChargeResult> {
  const amountDollars = (params.amountCents / 100).toFixed(2);

  // Normalize expiration: accept MMYYYY, MMYY, MM/YYYY, MM/YY
  const expRaw = params.expirationDate.replace(/\D/g, "");
  let expFormatted: string;
  if (expRaw.length === 6) {
    // MMYYYY → YYYY-MM
    expFormatted = `${expRaw.slice(2)}-${expRaw.slice(0, 2)}`;
  } else if (expRaw.length === 4) {
    // MMYY → 20YY-MM
    expFormatted = `20${expRaw.slice(2)}-${expRaw.slice(0, 2)}`;
  } else {
    expFormatted = params.expirationDate;
  }

  const payload = {
    createTransactionRequest: {
      merchantAuthentication: getMerchantAuth(),
      refId: params.invoiceNumber,
      transactionRequest: {
        transactionType: "authCaptureTransaction",
        amount: amountDollars,
        payment: {
          creditCard: {
            cardNumber: params.cardNumber.replace(/\s/g, ""),
            expirationDate: expFormatted,
            cardCode: params.cardCode,
          },
        },
        order: {
          invoiceNumber: params.invoiceNumber,
          description: params.description ?? "Clover Catalog Order",
        },
        billTo: {
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email,
        },
      },
    },
  };

  try {
    const res = await fetch(getEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as Record<string, unknown>;

    const txResponse = (data as any)?.transactionResponse;
    const messages = (data as any)?.messages;
    const resultCode: string = messages?.resultCode ?? "";

    if (resultCode === "Ok" && txResponse?.responseCode === "1") {
      return {
        success: true,
        transactionId: String(txResponse.transId ?? ""),
        authCode: String(txResponse.authCode ?? ""),
        rawResponse: data,
      };
    }

    // Extract the most useful error message
    const txErrors: Array<{ errorCode: string; errorText: string }> =
      txResponse?.errors ?? [];
    const msgErrors: Array<{ code: string; text: string }> =
      messages?.message ?? [];

    const errorMessage =
      txErrors[0]?.errorText ??
      msgErrors[0]?.text ??
      `Transaction declined (responseCode: ${txResponse?.responseCode})`;

    return {
      success: false,
      errorMessage,
      rawResponse: data,
    };
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : "Network error contacting payment gateway",
    };
  }
}
