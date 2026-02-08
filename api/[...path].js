const { send, sendError } = require('../lib/http');

function getSegments(req) {
  // For /api/[...path].js Vercel sets req.query.path
  const p = (req.query && req.query.path) || [];
  const segs = Array.isArray(p) ? p : [p];
  return segs.filter(Boolean).map(s => String(s));
}

module.exports = async (req, res) => {
  try {
    const segs = getSegments(req);
    const top = segs[0] || '';
    const sub = segs.slice(1);

    // Health
    if (top === 'health' && req.method === 'GET') {
      const h = require('../lib/handlers/health');
      return h(req, res);
    }

    // Stats
    if (top === 'stats') {
      const h = require('../lib/handlers/stats');
      return h(req, res);
    }

    // Vote
    if (top === 'vote') {
      const h = require('../lib/handlers/vote');
      return h(req, res);
    }

    // Config
    if (top === 'config') {
      const h = require('../lib/handlers/config/index');
      return h(req, res);
    }

    // Admin
    if (top === 'admin') {
      const action = sub[0] || '';
      if (action === 'reset-votes') {
        const h = require('../lib/handlers/admin/reset-votes');
        return h(req, res);
      }
      if (action === 'export') {
        const h = require('../lib/handlers/admin/export');
        return h(req, res);
      }
    }

    // Students
    if (top === 'students') {
      const action = sub[0] || 'index';
      const map = {
        'index': '../lib/handlers/students/index',
        'verify-code': '../lib/handlers/students/verify-code',
        'add': '../lib/handlers/students/add',
        'update': '../lib/handlers/students/update',
        'delete': '../lib/handlers/students/delete',
        'delete-by-code': '../lib/handlers/students/delete-by-code',
        'generate-codes': '../lib/handlers/students/generate-codes',
        'bulk': '../lib/handlers/students/bulk',
      };
      const modPath = map[action] || map['index'];
      const h = require(modPath);
      return h(req, res);
    }

    // Candidates
    if (top === 'candidates') {
      // candidates/ (index) or candidates/<id>
      if (sub.length === 0 || sub[0] === 'index') {
        const h = require('../lib/handlers/candidates/index');
        return h(req, res);
      }
      // emulate the old dynamic route by setting req.query.id
      req.query = req.query || {};
      req.query.id = sub[0];
      const h = require('../lib/handlers/candidates/[id]');
      return h(req, res);
    }

    send(res, 404, { success: false, error: 'Ruta no encontrada' });
  } catch (err) {
    sendError(res, err);
  }
};
