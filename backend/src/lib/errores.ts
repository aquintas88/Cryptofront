// Error con código HTTP. El mensaje es seguro para mostrar al cliente.
export class ErrorApp extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ErrorApp';
  }
}
