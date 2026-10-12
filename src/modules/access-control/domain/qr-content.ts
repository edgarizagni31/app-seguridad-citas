import { QR_RULES } from './qr-rules';

export type QrContent =
  | {
      readonly kind: 'codeWithSuffix';
      readonly code: string;
      readonly suffix: string;
      readonly raw: string;
    }
  | { readonly kind: 'code'; readonly code: string; readonly raw: string }
  | { readonly kind: 'visitorPass'; readonly passCode: string; readonly raw: string }
  | { readonly kind: 'vehicleToken'; readonly token: string; readonly raw: string }
  | { readonly kind: 'unknown'; readonly raw: string };

export type QrContentKind = QrContent['kind'];

const isGeneratedCode = (value: string) => QR_RULES.generatedCodePattern.test(value);

export function parseQrContent(decodedText: string | null | undefined): QrContent {
  const raw = (decodedText ?? '').trim();
  if (raw.length <= QR_RULES.maxSignedTokenLength && QR_RULES.signedTokenPattern.test(raw)) {
    return { kind: 'vehicleToken', token: raw, raw };
  }
  if (!raw || raw.length > QR_RULES.maxContentLength) return { kind: 'unknown', raw };

  if (raw.toUpperCase().startsWith(QR_RULES.visitorPassPrefix)) {
    return { kind: 'visitorPass', passCode: raw, raw };
  }

  // Se corta por el PRIMER guion: el código generado nunca lo tiene y la placa sí (ABC-123)
  const separatorIndex = raw.indexOf(QR_RULES.separator);
  if (separatorIndex < 0) {
    return isGeneratedCode(raw) ? { kind: 'code', code: raw, raw } : { kind: 'unknown', raw };
  }

  const code = raw.slice(0, separatorIndex).trim();
  const suffix = raw.slice(separatorIndex + 1).trim();
  if (!suffix || !isGeneratedCode(code)) return { kind: 'unknown', raw };

  return { kind: 'codeWithSuffix', code, suffix, raw };
}
