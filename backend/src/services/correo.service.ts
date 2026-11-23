// Prueba de extremo a extremo del correo del sistema. Solo SUPERADMIN.
import { prisma } from '../lib/prisma';
import { ErrorApp } from '../lib/errores';
import { configuracionCorreo, enviarCorreo } from '../lib/correo';
import { registrarAuditoria } from '../lib/auditoria';

export async function probarEnvio(actor: { id: string; tenantId: string }, destinatario: string) {
  if (!configuracionCorreo()) throw new ErrorApp(409, 'El correo del sistema no está configurado');
  let resultado: 'enviado' | 'error' = 'enviado';
  try {
    await enviarCorreo(destinatario, 'Prueba del correo de Cryptofront', 'Este es un correo de prueba de la plataforma.');
  } catch {
    // No se revela el motivo: podría contener datos de la conexión.
    resultado = 'error';
  }
  await registrarAuditoria(prisma, {
    tenantId: actor.tenantId,
    actorId: actor.id,
    entidad: 'Correo',
    entidadId: null,
    accion: 'EVENTO',
    cambios: { evento: 'PRUEBA_CORREO', resultado },
  });
  if (resultado === 'error') throw new ErrorApp(502, 'No se pudo enviar el correo de prueba');
  return { enviado: true };
}
