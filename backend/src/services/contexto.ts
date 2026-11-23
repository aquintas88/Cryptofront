// Usuario autenticado tal como lo deja requiereSesion en res.locals.usuario.
export interface Usuario {
  id: string;
  tenantId: string;
  rol: string;
}
