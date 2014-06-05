var paths = require('../lib/paths');

module.exports = {
  testGetParentsRoot: function (test) {
    test.deepEqual(paths.getParents('/'), []);
    test.done();
  },

  testGetParentsRootChild: function (test) {
    test.deepEqual(paths.getParents('/a'), ['/']);
    test.done();
  },

  testGetParents: function (test) {
    test.deepEqual(paths.getParents('/a/b/c'), ['/', '/a', '/a/b']);
    test.done();
  }
};
