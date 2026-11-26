/**
 * Consulta de la bitácora de auditoría (RF16). Solo administrador.
 */
const { Router } = require('express');
const db = require('../../db/knex');
const { autorizar } = require('../../middlewares/auth');
const { leerPaginacion, respuestaPaginada } = require('../../utils/paginacion');
const { aNum } = require('../../utils/bd');

const router = Router();
router.use(autorizar('admin'));

router.get('/', async (req, res) => {
  const pag = leerPaginacion(req.query, { limiteDef: 25 });
  const q = db('auditoria as a').leftJoin('usuarios as u', 'u.id', 'a.usuario_id');
  if (req.query.entidad) q.where('a.entidad', String(req.query.entidad));
  if (req.query.accion) q.where('a.accion', String(req.query.accion));
  const [{ total }] = await q.clone().count({ total: '*' });
  const filas = await q.select('a.*', 'u.nombre as usuario').orderBy('a.id', 'desc').limit(pag.limite).offset(pag.offset);
  res.json(respuestaPaginada(filas.map((f) => {
    let detalle = null;
    try { detalle = f.detalle ? JSON.parse(f.detalle) : null; } catch { detalle = f.detalle; }
    return { ...f, detalle };
  }), aNum(total), pag));
});

module.exports = router;
