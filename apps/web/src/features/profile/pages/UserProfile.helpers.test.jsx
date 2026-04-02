import { describe, it, expect } from 'vitest';
import { getInitials, buildProfilePayload } from './UserProfile';

describe('UserProfile helpers', () => {
  it('getInitials retorna dos iniciales cuando hay nombre completo', () => {
    expect(getInitials('Andrea Flores')).toBe('AF');
  });

  it('getInitials retorna UN como fallback', () => {
    expect(getInitials('')).toBe('UN');
    expect(getInitials('   ')).toBe('UN');
  });

  it('buildProfilePayload normaliza campos vacíos a null', () => {
    const payload = buildProfilePayload({
      displayName: 'Test User',
      carrera_objetivo: '',
      canal_objetivo: 'canal1',
      colegio_tipo: '',
      distrito: 'Pocollay',
    });

    expect(payload).toEqual({
      displayName: 'Test User',
      carrera_objetivo: null,
      canal_objetivo: 'canal1',
      colegio_tipo: null,
      distrito: 'Pocollay',
    });
  });
});
