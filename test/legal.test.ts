import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { LEGAL_UPDATED, privacySections, termsSections, type LegalSection } from '@/lib/legal';

const text = (sections: LegalSection[]) =>
  sections.map((s) => [s.title, ...s.body.flat()].join('\n')).join('\n');

describe('términos y política de privacidad', () => {
  test('los dos textos nombran al negocio cargado en Ajustes', () => {
    assert.ok(text(termsSections('Bazar Deco', true)).includes('catálogo de Bazar Deco'));
    assert.ok(text(privacySections('Bazar Deco', true)).startsWith('1. Responsable del tratamiento\nBazar Deco es responsable'));
  });

  test('los términos dicen que el pedido no es una compra y que el sitio no cobra', () => {
    const t = text(termsSections('Bazar Deco', true));
    assert.ok(t.includes('no es una compra'));
    assert.ok(t.includes('no cobra ni procesa pagos'));
    assert.ok(t.includes('Ley N.º 24.240'));
    assert.ok(t.includes('10 días corridos'));
  });

  test('la privacidad dice qué datos se piden y cómo ejercer los derechos', () => {
    const p = text(privacySections('Bazar Deco', true));
    for (const piece of ['Nombre y apellido', 'Teléfono, con código de área', 'Ley N.º 25.326', 'Agencia de Acceso a la Información Pública', 'ver, corregir o borrar'])
      assert.ok(p.includes(piece), piece);
  });

  test('sin WhatsApp cargado no manda a escribir por WhatsApp', () => {
    const withWa = text(termsSections('X', true)) + text(privacySections('X', true));
    const without = text(termsSections('X', false)) + text(privacySections('X', false));
    assert.ok(withWa.includes('escribinos por WhatsApp'));
    assert.ok(!without.includes('escribinos por WhatsApp'));
    assert.ok(without.includes('contactanos'));
  });

  test('las secciones van numeradas de corrido y ninguna queda vacía', () => {
    for (const sections of [termsSections('X', true), privacySections('X', true)]) {
      sections.forEach((s, i) => {
        assert.ok(s.title.startsWith(`${i + 1}. `), s.title);
        assert.ok(s.body.length > 0 && s.body.flat().every((line) => line.trim().length > 0), s.title);
      });
    }
  });

  test('las páginas llevan fecha de actualización', () => {
    assert.match(LEGAL_UPDATED, /^\d{1,2} de [a-z]+ de \d{4}$/);
  });
});
