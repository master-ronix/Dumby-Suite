import {
  CredentialVerificationError,
  type VerifiedCredential,
} from './developer-credential.service.js';

/**
 * §22.8: verification is delegated to the Credentials Service alone — Swastik and the developer
 * portal never hash or compare developer credentials themselves, they call the verify endpoint
 * and act on its verdict.
 */
export interface CredentialVerifier {
  verify(input: { keyId: string; secret: string; devId?: string }): Promise<VerifiedCredential>;
}

/**
 * §22.8: issuance is delegated to the Credentials Service alone, so no other surface mints
 * developer credentials itself.
 */
export interface CredentialIssuer {
  issueDevId(input: {
    devId: string;
    registeredBy: string;
    label?: string;
  }): Promise<{ keyId: string; secret: string; status: string }>;
  /** §22.5/§22.8: issue a Power Engine operator credential (`operator_keypair`) bound to the operator id. */
  issueOperator(input: {
    operatorId: string;
    registeredBy: string;
    label?: string;
  }): Promise<{ keyId: string; secret: string; status: string }>;
}

/** §15.8: an owner approval activates the credential through the Credentials Service alone. */
export interface CredentialActivator {
  activate(keyId: string): Promise<boolean>;
}

export interface CredentialClient extends CredentialVerifier, CredentialIssuer, CredentialActivator {}

interface IssueResponseBody {
  readonly keyId?: unknown;
  readonly secret?: unknown;
  readonly status?: unknown;
}

export interface HttpCredentialVerifierOptions {
  readonly baseUrl: string;
  readonly internalApiKey: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

interface VerifyResponseBody {
  readonly valid?: unknown;
  readonly purpose?: unknown;
  readonly status?: unknown;
}

export class HttpCredentialClient implements CredentialClient {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: HttpCredentialVerifierOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 2000;
  }

  async verify(input: {
    keyId: string;
    secret: string;
    devId?: string;
  }): Promise<VerifiedCredential> {
    const body = await this.post('/credentials/verify', input);
    if (
      body.valid !== true ||
      typeof body.purpose !== 'string' ||
      typeof body.status !== 'string'
    ) {
      throw new CredentialVerificationError('malformed-verify-response');
    }
    return {
      keyId: input.keyId,
      purpose: body.purpose as VerifiedCredential['purpose'],
      status: body.status as VerifiedCredential['status'],
    };
  }

  async issueDevId(input: {
    devId: string;
    registeredBy: string;
    label?: string;
  }): Promise<{ keyId: string; secret: string; status: string }> {
    const body = await this.post('/credentials/issue-devid', input);
    if (typeof body.keyId !== 'string' || typeof body.secret !== 'string') {
      throw new CredentialVerificationError('malformed-issue-response');
    }
    return {
      keyId: body.keyId,
      secret: body.secret,
      status: typeof body.status === 'string' ? body.status : 'pending',
    };
  }

  async activate(keyId: string): Promise<boolean> {
    const body = await this.post(`/credentials/${encodeURIComponent(keyId)}/activate`, {});
    return (body as { status?: unknown }).status === 'active';
  }

  async issueOperator(input: {
    operatorId: string;
    registeredBy: string;
    label?: string;
  }): Promise<{ keyId: string; secret: string; status: string }> {
    const body = await this.post('/credentials/issue-operator', input);
    if (typeof body.keyId !== 'string' || typeof body.secret !== 'string') {
      throw new CredentialVerificationError('malformed-issue-response');
    }
    return {
      keyId: body.keyId,
      secret: body.secret,
      status: typeof body.status === 'string' ? body.status : 'active',
    };
  }

  private async post(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<VerifyResponseBody & IssueResponseBody> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.options.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-api-key': this.options.internalApiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch {
      // A transport failure is a refusal, not a bypass. Thrown as the same single error so an
      // unreachable Credentials Service cannot be distinguished from a bad secret.
      throw new CredentialVerificationError('credentials-service-unreachable');
    } finally {
      clearTimeout(timer);
    }
    if (response.status !== 200 && response.status !== 201) {
      throw new CredentialVerificationError('credentials-service-refused');
    }
    return (await response.json()) as VerifyResponseBody & IssueResponseBody;
  }
}
