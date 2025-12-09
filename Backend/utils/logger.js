const getTimestamp = () => new Date().toISOString();

const log = (level, message, code) => {
  const codeStr = code ? `[${code}]` : '';
  console.log(`${getTimestamp()} [${level}] ${codeStr} ${message}`);
};

const logger = {
  info: (message, code = '') => log('INFO', message, code),
  warn: (message, code = '') => log('WARN', message, code),
  error: (message, code = '') => log('ERROR', message, code),
};

module.exports = logger;
