process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const runner = require('./lib/runner');

runner('build');
