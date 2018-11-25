module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', 'karma-typescript'],
    plugins: [
      require('karma-typescript'),
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage-istanbul-reporter'),
    ],
    client: {
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, 'coverage'),
      reports: ['html', 'lcovonly'],
      fixWebpackSourcePaths: true
    },
    files: [
      'src/**/*.ts' // *.tsx for React Jsx
    ],
    preprocessors: {
      'src/**/*.ts': 'karma-typescript' // *.tsx for React Jsx
    },
    reporters: ['progress', 'karma-typescript', 'kjhtml'],
    browsers: ['Chrome'],
    singleRun: false,
    autoWatch: true
  });
};
