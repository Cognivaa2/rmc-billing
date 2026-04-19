const ts = () => new Date().toISOString();

export const logger = {
  info: (...a) => console.log(`[${ts()}] INFO`, ...a),
  warn: (...a) => console.warn(`[${ts()}] WARN`, ...a),
  error: (...a) => console.error(`[${ts()}] ERROR`, ...a),
  debug: (...a) => {
    if (process.env.NODE_ENV !== 'production') console.log(`[${ts()}] DBG`, ...a);
  },
};
