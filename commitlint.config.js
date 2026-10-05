module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // El scope es el ID de la tarea del plan (F1.7)
    'scope-case': [0],
    'header-max-length': [2, 'always', 100],
  },
};
