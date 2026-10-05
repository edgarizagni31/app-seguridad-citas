import { createCredentials } from './credentials';

describe('createCredentials', () => {
  it('normaliza el correo y conserva la contraseña tal cual', () => {
    expect(createCredentials('  Carlos.Mendez@Empresa.com ', ' Clave 1 ')).toEqual({
      ok: true,
      value: { email: 'carlos.mendez@empresa.com', password: ' Clave 1 ' },
    });
  });

  it.each(['', 'sin-arroba', 'a@b', 'con espacio@b.com'])('rechaza el correo "%s"', (email) => {
    expect(createCredentials(email, 'x')).toEqual({ ok: false, error: { type: 'invalid-email' } });
  });

  it('rechaza la contraseña vacía', () => {
    expect(createCredentials('a@b.com', '')).toEqual({
      ok: false,
      error: { type: 'empty-password' },
    });
  });
});
