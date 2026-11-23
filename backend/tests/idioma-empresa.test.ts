import { describe, it, expect } from 'vitest';
import { validarIdioma } from '../src/lib/idiomas';

describe('idioma de la zona de clientes', () => {
  it('admite es y en, y por defecto es', () => {
    expect(validarIdioma('es')).toBe('es');
    expect(validarIdioma('en')).toBe('en');
    expect(validarIdioma(undefined)).toBe('es');
    expect(validarIdioma(null)).toBe('es');
  });

  it('rechaza idiomas no publicados y valores que no son texto', () => {
    expect(() => validarIdioma('fr')).toThrow(/Idioma no válido/);
    expect(() => validarIdioma('EN')).toThrow();
    expect(() => validarIdioma(42)).toThrow();
  });
});
