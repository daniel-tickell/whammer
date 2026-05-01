module.exports = {
  apps: [
    {
      name: 'whammer-hub',
      script: 'node_modules/.bin/next',
      args: 'start -p 8888',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
