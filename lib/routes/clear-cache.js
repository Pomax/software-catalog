module.exports = env => function clearCache(_req, _res, next) {
  for (let i = 0; i < env.loaders.length; i += 1) {
    env.loaders[i].cache = {};
  }
  next();
};
