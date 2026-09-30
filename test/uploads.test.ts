import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
  detectImageExt,
  isSafeFilename,
  mimeForFilename,
  processPhoto,
  shareImage,
} from '@/lib/uploads';

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(
    parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p))
  );

// Caja ftyp de 24 bytes: tamaño, "ftyp", marca principal, versión, 2 compatibles
const ftyp = (major: string, compat: string) =>
  bytes([0, 0, 0, 24], 'ftyp', major, [0, 0, 0, 0], compat, 'miaf');

// Imagen de prueba de un color, en el formato pedido
const image = (width: number, height: number, format: 'png' | 'jpeg') =>
  sharp({ create: { width, height, channels: 3, background: '#c8322b' } })
    [format]()
    .toBuffer();

describe('detección del tipo real de imagen', () => {
  test('reconoce JPG, PNG, WebP y AVIF por su contenido', () => {
    assert.equal(detectImageExt(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0])), '.jpg');
    assert.equal(detectImageExt(bytes('\x89PNG\r\n\x1a\n', [0, 0])), '.png');
    assert.equal(detectImageExt(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 ')), '.webp');
    assert.equal(detectImageExt(ftyp('avif', 'mif1')), '.avif');
    assert.equal(detectImageExt(ftyp('mif1', 'avif')), '.avif');
  });

  test('rechaza cualquier otra cosa', () => {
    assert.equal(detectImageExt(bytes('<html><script>alert(1)</script>')), null);
    assert.equal(detectImageExt(bytes('GIF89a')), null);
    assert.equal(detectImageExt(ftyp('heic', 'mif1')), null);
    assert.equal(detectImageExt(bytes([0xff, 0xd8])), null);
    assert.equal(detectImageExt(new Uint8Array()), null);
  });
});

describe('procesado de fotos', () => {
  test('acota el lado mayor a 1200 px, saca miniatura de 600 px y pasa a WebP', async () => {
    const { full, thumb } = await processPhoto(await image(2000, 1000, 'png'));
    const f = await sharp(full).metadata();
    const t = await sharp(thumb).metadata();
    assert.equal(f.format, 'webp');
    assert.deepEqual([f.width, f.height], [1200, 600]);
    assert.equal(t.format, 'webp');
    assert.deepEqual([t.width, t.height], [600, 300]);
  });

  test('no agranda fotos chicas', async () => {
    const { full, thumb } = await processPhoto(await image(300, 200, 'jpeg'));
    const f = await sharp(full).metadata();
    const t = await sharp(thumb).metadata();
    assert.deepEqual([f.width, f.height], [300, 200]);
    assert.deepEqual([t.width, t.height], [300, 200]);
  });

  test('descarta los metadatos (EXIF, GPS) de la foto original', async () => {
    const withExif = await sharp(await image(400, 300, 'jpeg'))
      .withMetadata({ exif: { IFD0: { Copyright: 'prueba', ImageDescription: 'con-exif' } } })
      .jpeg()
      .toBuffer();
    assert.ok((await sharp(withExif).metadata()).exif, 'la de prueba tiene EXIF');
    const { full } = await processPhoto(withExif);
    assert.equal((await sharp(full).metadata()).exif, undefined);
  });

  test('una imagen rota falla en vez de guardarse', async () => {
    await assert.rejects(processPhoto(Buffer.from('\x89PNG\r\n\x1a\nbasura')));
  });

  test('la imagen para compartir es un JPEG de 1200×630 con la foto entera', async () => {
    const jpg = await shareImage(await image(1000, 1000, 'png'));
    const m = await sharp(jpg).metadata();
    assert.equal(m.format, 'jpeg');
    assert.deepEqual([m.width, m.height], [1200, 630]);
    // Fondo blanco a los costados, foto (roja) en el centro
    const { data } = await sharp(jpg).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => Array.from(data.subarray((y * 1200 + x) * 3, (y * 1200 + x) * 3 + 3));
    assert.ok(px(10, 315).every((c) => c > 240), 'borde blanco');
    assert.ok(px(600, 315)[0] > 150 && px(600, 315)[1] < 100, 'centro rojo');
  });
});

describe('nombres de archivo servibles', () => {
  test('acepta los nombres que genera la app', () => {
    const name = '3f2b8c1e-9a4d-4e7b-8c6a-1d2e3f4a5b6c.webp';
    assert.equal(isSafeFilename(name), true);
    assert.equal(mimeForFilename(name), 'image/webp');
  });

  test('rechaza rutas y extensiones no admitidas', () => {
    for (const name of ['..', '../.env', 'a/b.jpg', '..\\x.jpg', '.jpg', 'x.html', 'x.jpg.html', 'x.svg']) {
      assert.equal(isSafeFilename(name), false, name);
      assert.equal(mimeForFilename(name), null, name);
    }
  });
});
