process.env.VITEST = '1';
process.env.NODE_ENV = 'test';

const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...args) => {
  const message = typeof warning === 'string' ? warning : warning?.message;
  if (message?.includes('--localstorage-file')) return;
  return originalEmitWarning(warning, ...args);
};
