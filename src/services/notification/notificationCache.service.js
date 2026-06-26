const DEFAULT_TTL_MS = Number(process.env.NOTIFICATION_ANALYTICS_CACHE_TTL_MS) || 60000;

const store = new Map();

const getCacheKey = (key) => `notification:${key}`;

const get = (key) => {
  const cacheKey = getCacheKey(key);
  const item = store.get(cacheKey);

  if (!item) {
    return null;
  }

  if (item.expiresAt <= Date.now()) {
    store.delete(cacheKey);
    return null;
  }

  return item.value;
};

const set = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  store.set(getCacheKey(key), {
    value,
    expiresAt: Date.now() + ttlMs,
  });
};

const invalidate = (key) => {
  if (key) {
    store.delete(getCacheKey(key));
    return;
  }

  [...store.keys()]
    .filter((cacheKey) => cacheKey.startsWith("notification:"))
    .forEach((cacheKey) => store.delete(cacheKey));
};

module.exports = {
  get,
  invalidate,
  set,
};
