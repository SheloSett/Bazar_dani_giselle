import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { deliveryUrl, parseCloudinaryUrl, publicIdFor, signParams } from '@/lib/cloudinary';

describe('Cloudinary: configuración', () => {
  test('lee la URL del panel de Cloudinary', () => {
    const cfg = parseCloudinaryUrl('cloudinary://123456789:abcDEF_ghi@mi-nube', {});
    assert.deepEqual(cfg, {
      key: '123456789',
      secret: 'abcDEF_ghi',
      cloud: 'mi-nube',
      folder: 'bazar',
      apiBase: 'https://api.cloudinary.com/v1_1/mi-nube',
      deliveryBase: 'https://res.cloudinary.com/mi-nube',
    });
  });

  test('carpeta y bases propias (pruebas)', () => {
    const cfg = parseCloudinaryUrl('cloudinary://k:s@demo', {
      CLOUDINARY_FOLDER: '/tienda/',
      CLOUDINARY_API_BASE: 'http://127.0.0.1:3097/v1_1/demo/',
      CLOUDINARY_DELIVERY_BASE: 'http://127.0.0.1:3097/demo',
    });
    assert.equal(cfg?.folder, 'tienda');
    assert.equal(cfg?.apiBase, 'http://127.0.0.1:3097/v1_1/demo');
    assert.equal(cfg?.deliveryBase, 'http://127.0.0.1:3097/demo');
  });

  test('sin la variable, o con una mal escrita, no hay Cloudinary', () => {
    for (const v of [undefined, '', 'cloudinary://sin-arroba', 'https://res.cloudinary.com/x', 'cloudinary://k@demo'])
      assert.equal(parseCloudinaryUrl(v, {}), null, String(v));
  });
});

describe('Cloudinary: nombres y firma', () => {
  test('el id en Cloudinary sale del nombre del archivo', () => {
    assert.equal(publicIdFor('0c3e-uuid.webp', 'bazar'), 'bazar/0c3e-uuid');
    assert.equal(publicIdFor('0c3e-uuid.t.webp', 'bazar'), 'bazar/0c3e-uuid-t');
    assert.equal(publicIdFor('vieja.jpg', 'bazar'), 'bazar/vieja');
    assert.equal(publicIdFor('../x.webp', 'bazar'), null);
    assert.equal(publicIdFor('x.svg', 'bazar'), null);
  });

  test('la URL pública conserva la extensión', () => {
    const cfg = parseCloudinaryUrl('cloudinary://k:s@demo', {})!;
    assert.equal(deliveryUrl(cfg, 'abc.webp'), 'https://res.cloudinary.com/demo/image/upload/bazar/abc.webp');
    assert.equal(deliveryUrl(cfg, 'abc.t.webp'), 'https://res.cloudinary.com/demo/image/upload/bazar/abc-t.webp');
    assert.equal(deliveryUrl(cfg, 'vieja.jpg'), 'https://res.cloudinary.com/demo/image/upload/bazar/vieja.jpg');
    assert.equal(deliveryUrl(cfg, 'no vale'), null);
  });

  test('la firma coincide con el ejemplo de la documentación de Cloudinary', () => {
    assert.equal(
      signParams({ timestamp: '1315060510', public_id: 'sample_image', eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop' }, 'abcd'),
      'bfd09f95f331f558cbd1320e67aa8d488770583e'
    );
  });
});
