var levelup = require('levelup');
var memdown = require('memdown');

var tree = require('../lib/tree');

module.exports = {
  setUp: function (done) {
    var self = this;

    tree(levelup('memdown', {db: memdown}), onTree);

    function onTree(error, tree) {
      if (error) {
        return done(error);
      }

      self.tree = tree;

      done();
    }
  },

  testRoot: function (test) {
    var tree = this.tree;

    tree.put('/', {name: 'root'}, onPut);

    function onPut(error) {
      test.ifError(error);
      tree.get('/', onGet);
    }

    function onGet(error, found, properties, children) {
      test.ifError(error);
      test.strictEqual(found, true);
      test.deepEqual(properties, {name: 'root'});
      test.deepEqual(children, []);
      tree.del('/', onDel);
    }

    function onDel(error) {
      test.ifError(error);
      tree.get('/', onNotFound);
    }

    function onNotFound(error, found) {
      test.ifError(error);
      test.strictEqual(found, false);
      test.done();
    }
  },

  testChild: function (test) {
    var tree = this.tree;

    tree.put('/', {name: 'root'}, onRootPut);

    function onRootPut(error) {
      test.ifError(error);
      tree.put('/child', {name: 'child'}, onChildPut);
    }

    function onChildPut(error) {
      test.ifError(error);
      tree.get('/', onRootGet);
    }

    function onRootGet(error, found, properties, children) {
      test.ifError(error);
      test.strictEqual(found, true);
      test.deepEqual(properties, {name: 'root'});
      test.deepEqual(children, ['child']);
      tree.get('/child', onChildGet);
    }

    function onChildGet(error, found, properties, children) {
      test.ifError(error);
      test.strictEqual(found, true);
      test.deepEqual(properties, {name: 'child'});
      test.deepEqual(children, []);
      tree.del('/child', onRootDel);
    }

    function onRootDel(error) {
      test.ifError(error);
      tree.get('/', onModifiedRoot);
    }

    function onModifiedRoot(error, found, properties, children) {
      test.ifError(error);
      test.strictEqual(found, true);
      test.deepEqual(properties, {name: 'root'});
      test.deepEqual(children, []);
      tree.get('/child', onChildNotFound);
    }

    function onChildNotFound(error, found) {
      test.ifError(error);
      test.strictEqual(found, false);
      test.done();
    }
  },

  testBatch: function (test) {
    var tree = this.tree;

    var operations = [
      {type: 'put', path: '/', properties: {name: 'root'}},
      {type: 'put', path: '/child', properties: {name: 'child'}},
      {type: 'put', path: '/deletable', properties: {name: 'deletable'}},
      {type: 'del', path: '/deletable'}
    ];

    tree.batch(operations, onBatch);

    function onBatch(error) {
      test.ifError(error);
      tree.get('/', onRoot);
    }

    function onRoot(error, found, properties, children) {
      test.ifError(error);
      test.strictEqual(found, true);
      test.deepEqual(properties, {name: 'root'});
      test.deepEqual(children, ['child']);
      tree.get('/child', onChild);
    }

    function onChild(error, found, properties, children) {
      test.ifError(error);
      test.strictEqual(found, true);
      test.deepEqual(properties, {name: 'child'});
      test.deepEqual(children, []);
      tree.get('/deletable', onDeletable);
    }

    function onDeletable(error, found) {
      test.ifError(error);
      test.strictEqual(found, false);
      test.done();
    }
  }
};
