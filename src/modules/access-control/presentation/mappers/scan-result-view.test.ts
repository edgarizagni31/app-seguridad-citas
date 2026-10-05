import { parseQrContent } from '../../domain';

import { toScanResultView } from './scan-result-view';

const TZ = 'America/El_Salvador';
const NOW = new Date('2026-10-05T18:00:00Z');
const view = (raw: string, scannedAt = new Date('2026-10-05T16:42:00Z')) =>
  toScanResultView({ content: parseQrContent(raw), scannedAt }, NOW, TZ);

describe('toScanResultView', () => {
  it('unidad de transporte: éxito con código y placa', () => {
    expect(view('APPSCH00000000000123-ABC-123')).toEqual({
      tone: 'success',
      icon: 'truck-outline',
      title: 'Unidad de transporte',
      readAt: 'Leído hoy 10:42 a. m.',
      fields: [
        { label: 'Código', value: 'APPSCH00000000000123', display: 'code' },
        { label: 'Placa', value: 'ABC-123', display: 'plate' },
      ],
      raw: 'APPSCH00000000000123-ABC-123',
      note: 'Lectura correcta. La validación de ingreso se realiza en el siguiente paso.',
    });
  });

  it('formato heredado: el sufijo numérico es un documento', () => {
    expect(view('APPSCH00000000000123-04512378').fields[1]).toEqual({
      label: 'Documento',
      value: '04512378',
      display: 'code',
    });
  });

  it('voucher: advertencia con su código', () => {
    expect(view('VI000007')).toMatchObject({
      tone: 'warning',
      title: 'Voucher',
      fields: [{ label: 'Código', value: 'VI000007', display: 'code' }],
    });
  });

  it('pase de visitante: info con el código de pase', () => {
    expect(view('PASS-9F2C4B7A1D3E5061')).toMatchObject({
      tone: 'info',
      title: 'Pase de visitante',
      fields: [{ label: 'Código de pase', value: 'PASS-9F2C4B7A1D3E5061' }],
    });
  });

  it('no reconocido: error sin campos y con el contenido crudo', () => {
    expect(view('hola mundo')).toMatchObject({
      tone: 'error',
      title: 'No reconocido',
      fields: [],
      raw: 'hola mundo',
    });
  });

  it('lecturas de otro día muestran la fecha', () => {
    expect(view('VI000007', new Date('2026-10-04T16:42:00Z')).readAt).toBe(
      'Leído 04/10/2026 10:42 a. m.',
    );
  });
});
