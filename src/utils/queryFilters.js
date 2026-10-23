const parseList = (value) => {
  if (value === undefined || value === null || value === '') return [];
  return (Array.isArray(value) ? value : String(value).split(','))
    .map((item) => String(item).trim())
    .filter(Boolean);
};

const parseSort = (value, allowed, fallback) => {
  const requested = String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
  if (!requested.length) return fallback;
  const sort = {};
  requested.forEach((part) => {
    const [field, direction = 'asc'] = part.split(':');
    if (!allowed.includes(field)) return;
    sort[field] = direction.toLowerCase() === 'desc' ? -1 : 1;
  });
  return Object.keys(sort).length ? sort : fallback;
};

module.exports = { parseList, parseSort };
