const { send } = require('../http');

module.exports = async (req, res) => {
  send(res, 200, { ok: true, ts: new Date().toISOString() });
};
