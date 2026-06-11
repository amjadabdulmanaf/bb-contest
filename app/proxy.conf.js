const target = process.env['DOCKER_ENV'] === 'true' ? 'http://api:3000' : 'http://localhost:3000';

module.exports = {
  '/api': {
    target: target,
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  }
};
