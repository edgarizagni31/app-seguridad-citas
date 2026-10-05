import { z } from 'zod';

import { err, ok, type Result } from '@/shared/domain';

import type { HttpError } from './http-error';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type QueryValue = string | number | boolean | undefined;

export type HttpRequest<T> = {
  readonly method: HttpMethod;
  readonly url: string;
  readonly schema: z.ZodType<T>;
  readonly query?: Readonly<Record<string, QueryValue>>;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  readonly authenticated?: boolean;
  readonly unwrapEnvelope?: boolean;
  readonly timeoutMs?: number;
};

export interface HttpClient {
  request<T>(request: HttpRequest<T>): Promise<Result<T, HttpError>>;
}

export type HttpClientConfig = {
  readonly baseUrl: string;
  readonly appVersion: string;
  readonly platform: string;
  readonly createCorrelationId: () => string;
  readonly timeoutMs?: number;
  readonly fetchFn?: typeof fetch;
  readonly getAccessToken?: () => Promise<string | null>;
  readonly onUnauthorized?: () => Promise<boolean>;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const errorBodySchema = z.looseObject({
  message: z.string().nullish(),
  Message: z.string().nullish(),
});

const isAbsolute = (url: string) => /^https?:\/\//i.test(url);
const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

function buildUrl(baseUrl: string, url: string, query?: HttpRequest<unknown>['query']) {
  const full = isAbsolute(url) ? url : joinUrl(baseUrl, url);
  const params = Object.entries(query ?? {}).filter(
    (entry): entry is [string, string | number | boolean] => entry[1] !== undefined,
  );
  if (params.length === 0) return full;
  const search = new URLSearchParams(params.map(([key, value]) => [key, String(value)]));
  return `${full}${full.includes('?') ? '&' : '?'}${search.toString()}`;
}

function parseJson(text: string): Result<unknown, HttpError> {
  if (text.trim() === '') return ok(undefined);
  try {
    return ok(JSON.parse(text));
  } catch {
    return err({ type: 'invalid-response', issues: 'El cuerpo no es JSON válido' });
  }
}

function serverMessage(body: unknown): string | undefined {
  const parsed = errorBodySchema.safeParse(body);
  return parsed.success ? (parsed.data.message ?? parsed.data.Message ?? undefined) : undefined;
}

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const fetchFn = config.fetchFn ?? fetch;

  async function send(request: HttpRequest<unknown>): Promise<Result<Response, HttpError>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Correlation-Id': config.createCorrelationId(),
      'X-App-Version': config.appVersion,
      'X-Platform': config.platform,
      ...request.headers,
    };
    if (request.body !== undefined) headers['Content-Type'] = 'application/json';
    if (request.authenticated !== false) {
      const token = await config.getAccessToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      request.timeoutMs ?? config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    try {
      const response = await fetchFn(buildUrl(config.baseUrl, request.url, request.query), {
        method: request.method,
        headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: controller.signal,
      });
      return ok(response);
    } catch (cause) {
      return err(controller.signal.aborted ? { type: 'timeout' } : { type: 'network', cause });
    } finally {
      clearTimeout(timer);
    }
  }

  async function execute<T>(
    request: HttpRequest<T>,
    retried = false,
  ): Promise<Result<T, HttpError>> {
    const sent = await send(request);
    if (!sent.ok) return sent;
    const response = sent.value;

    const body = parseJson(await response.text());
    const authenticated = request.authenticated !== false;

    if (response.status === 401) {
      if (authenticated && !retried && (await config.onUnauthorized?.())) {
        return execute(request, true);
      }
      return err({
        type: 'unauthorized',
        message: body.ok ? serverMessage(body.value) : undefined,
      });
    }
    if (!response.ok) {
      return err({
        type: 'http',
        status: response.status,
        message: body.ok ? serverMessage(body.value) : undefined,
      });
    }
    if (!body.ok) return body;

    const schema = request.unwrapEnvelope
      ? z.object({ data: request.schema }).transform((envelope) => envelope.data)
      : request.schema;
    const parsed = schema.safeParse(body.value);
    if (!parsed.success)
      return err({ type: 'invalid-response', issues: z.prettifyError(parsed.error) });
    return ok(parsed.data as T);
  }

  return { request: (req) => execute(req) };
}
