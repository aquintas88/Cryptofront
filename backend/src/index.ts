import { cargarConfig } from './config';
import { crearApp } from './app';
import { prisma } from './lib/prisma';

const config = cargarConfig();
const app = crearApp();

const servidor = app.listen(config.port, () => {
  console.log(`Cryptofront backend escuchando en el puerto ${config.port} (${config.nodeEnv})`);
});

async function apagar() {
  servidor.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', apagar);
process.on('SIGINT', apagar);
