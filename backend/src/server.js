/**
 * Punto de entrada: aplica migraciones pendientes, carga datos de demostración
 * si la base está vacía y levanta el servidor HTTP.
 */
const env = require('./config/env');
const db = require('./db/knex');
const app = require('./app');

async function iniciar() {
  await db.migrate.latest();
  const { total } = await db('usuarios').count({ total: '*' }).first();
  if (Number(total) === 0) {
    console.log('Base de datos vacía: cargando datos de demostración…');
    await db.seed.run();
  }
  const servidor = app.listen(env.PORT, () => {
    console.log(`API MYK escuchando en http://localhost:${env.PORT}  ·  Swagger: http://localhost:${env.PORT}/api/docs`);
  });

  const cerrar = async (senal) => {
    console.log(`${senal} recibido: cerrando servidor…`);
    servidor.close(async () => {
      await db.destroy();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => cerrar('SIGTERM'));
  process.on('SIGINT', () => cerrar('SIGINT'));
}

iniciar().catch((err) => {
  console.error('No fue posible iniciar la API:', err);
  process.exit(1);
});
