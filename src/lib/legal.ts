// Textos de "Términos y condiciones" y "Política de privacidad" (/terminos y
// /privacidad). Describen lo que el sitio hace hoy: si cambia qué datos se piden o
// cómo se vende (por ejemplo, al sumar pagos online), hay que actualizarlos acá.

export interface LegalSection {
  title: string;
  // Cada elemento es un párrafo; una lista de textos es una lista con viñetas
  body: (string | string[])[];
}

// Fecha que muestran las dos páginas: cambiarla cada vez que se toque un texto
export const LEGAL_UPDATED = '5 de octubre de 2026';

// hasWhatsApp: si el negocio tiene cargado su WhatsApp en Ajustes (es el contacto)
const contact = (hasWhatsApp: boolean) => (hasWhatsApp ? 'escribinos por WhatsApp' : 'contactanos');

export function termsSections(shop: string, hasWhatsApp: boolean): LegalSection[] {
  return [
    {
      title: '1. Qué es este sitio',
      body: [
        `Este sitio es el catálogo de ${shop}. Sirve para ver los productos, armar un pedido y enviarlo al negocio por WhatsApp. Usarlo implica aceptar estos términos.`,
      ],
    },
    {
      title: '2. Cómo funcionan los pedidos',
      body: [
        'Armar y enviar un pedido no es una compra: es una solicitud. La venta queda acordada recién cuando el negocio te confirma la disponibilidad, el importe final, la forma de pago y la entrega.',
        'Para enviar un pedido tenés que dejar tu nombre y un teléfono real, con código de área. Los usamos para coordinar el pedido con vos.',
      ],
    },
    {
      title: '3. Precios',
      body: [
        'Los precios publicados están en pesos argentinos y pueden actualizarse. El total que muestra el sitio es estimado: el negocio te confirma el importe final (por ejemplo, con el costo del envío) antes de cerrar la venta.',
      ],
    },
    {
      title: '4. Stock y fotos',
      body: [
        'La disponibilidad que muestra el sitio es orientativa: un producto queda reservado cuando el negocio confirma el pedido.',
        'Las fotos son ilustrativas. Los colores y las medidas pueden variar levemente respecto del producto real.',
      ],
    },
    {
      title: '5. Pago y entrega',
      body: [
        'El sitio no cobra ni procesa pagos. La forma de pago y el envío o el retiro se coordinan directamente con el negocio.',
      ],
    },
    {
      title: '6. Cambios, devoluciones y arrepentimiento',
      body: [
        'Los cambios y las devoluciones se coordinan con el negocio y se rigen por la Ley N.º 24.240 de Defensa del Consumidor.',
        `Si la compra se hizo a distancia, tenés derecho a arrepentirte dentro de los 10 días corridos desde que recibís el producto o desde que se acordó la compra, lo que ocurra último, sin tener que dar motivos. Para hacerlo, ${contact(hasWhatsApp)}.`,
      ],
    },
    {
      title: '7. Uso del sitio',
      body: [
        'No está permitido enviar pedidos falsos o con datos de otra persona, ni intentar dañar el sitio o entrar a sus partes restringidas. Podemos descartar los pedidos que no cumplan con esto.',
      ],
    },
    {
      title: '8. Contenido',
      body: [
        `Los textos, las fotos y las marcas del sitio pertenecen a ${shop} o a sus proveedores, y no pueden usarse con fines comerciales sin autorización.`,
      ],
    },
    {
      title: '9. Funcionamiento del sitio',
      body: [
        'Hacemos lo posible para que el sitio funcione siempre y la información esté al día, pero puede haber interrupciones o errores involuntarios (por ejemplo, en un precio o una foto). Si pasa, lo aclaramos al confirmar el pedido.',
      ],
    },
    {
      title: '10. Datos personales',
      body: [
        'El nombre y el teléfono que dejás al pedir se tratan como explica la Política de privacidad de este sitio.',
      ],
    },
    {
      title: '11. Ley aplicable y reclamos',
      body: [
        'Estos términos se rigen por las leyes de la República Argentina. Ante un reclamo que no podamos resolver juntos, podés acudir a la autoridad de defensa del consumidor de tu jurisdicción.',
      ],
    },
    {
      title: '12. Cambios en estos términos',
      body: [
        'Podemos actualizar estos términos. La versión vigente es la publicada en esta página, con su fecha de actualización.',
      ],
    },
  ];
}

export function privacySections(shop: string, hasWhatsApp: boolean): LegalSection[] {
  return [
    {
      title: '1. Responsable del tratamiento',
      body: [
        `${shop} es responsable del tratamiento de los datos personales que se cargan en este sitio, de acuerdo con la Ley N.º 25.326 de Protección de Datos Personales de la República Argentina.`,
      ],
    },
    {
      title: '2. Datos que recopilamos',
      body: [
        'Para ver el catálogo no hace falta dejar ningún dato. Al enviar un pedido te pedimos:',
        [
          'Nombre y apellido',
          'Teléfono, con código de área',
          'El detalle del pedido: productos, cantidades, total estimado y fecha',
        ],
        'Este sitio no pide ni guarda datos de pago, documento ni domicilio.',
      ],
    },
    {
      title: '3. Para qué los usamos',
      body: [
        [
          'Preparar y confirmar tu pedido',
          'Escribirte o llamarte para coordinar el pago y la entrega',
          'Llevar el registro de los pedidos del negocio',
        ],
      ],
    },
    {
      title: '4. Con quién se comparten',
      body: [
        'No vendemos ni cedemos tus datos personales. Los ven solo las personas del negocio que gestionan los pedidos, y quedan guardados en el servidor donde está alojado el sitio.',
        'El pedido lo enviás vos por WhatsApp: esa conversación se rige además por las condiciones de WhatsApp. El enlace del pedido que va en el mensaje muestra los productos y el total, pero no tu nombre ni tu teléfono.',
      ],
    },
    {
      title: '5. Cuánto tiempo los guardamos',
      body: [
        'Guardamos los pedidos mientras hagan falta para gestionarlos y para el registro de ventas del negocio. Podés pedirnos que borremos los tuyos.',
      ],
    },
    {
      title: '6. Seguridad',
      body: [
        'El sitio funciona con conexión cifrada (HTTPS) y a los pedidos se accede solo desde un panel protegido con contraseña.',
      ],
    },
    {
      title: '7. Tus derechos',
      body: [
        `Podés pedir en cualquier momento ver, corregir o borrar tus datos, como establece la Ley N.º 25.326. Para hacerlo, ${contact(hasWhatsApp)}.`,
        'El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto, conforme lo establecido en el artículo 14, inciso 3 de la Ley N.º 25.326.',
        'La Agencia de Acceso a la Información Pública, en su carácter de órgano de control de la Ley N.º 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.',
      ],
    },
    {
      title: '8. Cookies y almacenamiento del navegador',
      body: [
        'Este sitio no usa cookies de publicidad ni herramientas de seguimiento de terceros.',
        'Usa el almacenamiento de tu navegador para recordar, en tu propio dispositivo, el pedido que estás armando y el nombre y el teléfono que escribiste, así no tenés que cargarlos de nuevo. Podés borrarlos limpiando los datos de este sitio en tu navegador.',
      ],
    },
    {
      title: '9. Cambios en esta política',
      body: [
        'Podemos actualizar esta política. La versión vigente es la publicada en esta página, con su fecha de actualización.',
      ],
    },
  ];
}
