var paths = require('./paths');
var operations = require('./operations');

module.exports = function (db, done) {
  var locks = {};

  function isLocked(path) {
    if (locks[path]) {
      return true;
    }

    var parentsLocked = paths.getParents(path).some(isDeepLocked);

    function isDeepLocked(path) {
      return locks[path] && locks[path].deep;
    }

    return parentsLocked;
  }

  function simpleLock(path) {
    locks[path] = {deep: false};
  }

  function deepLock(path) {
    locks[path] = {deep: true};
  }

  function unlock(path) {
    delete locks[path];
  }

  function databaseGet(key, done) {
    db.get(key, {valueEncoding: 'json'}, done);
  }

  function databasePut(key, value, done) {
    db.put(key, value, {valueEncoding: 'json'}, done);
  }

  function databaseBatch(operations, done) {
    db.batch(operations, {valueEncoding: 'json'}, done);
  }

  function performWrite(task, done) {
    task(done);
  }

  function put(path, properties, done) {
    if (isLocked(path)) {
      return setImmediate(done, new Error('path is locked'));
    }

    simpleLock(path);

    operations.put(databaseGet, path, properties, onOperations);

    function onOperations(error, operations) {
      if (error) {
        return failure(error);
      }

      databaseBatch(operations, onBatch);
    }

    function onBatch(error) {
      if (error) {
        return failure(error);
      }

      success();
    }

    function failure(error) {
      unlock(path);
      done(error);
    }

    function success() {
      unlock(path);
      done();
    }
  }

  function del(path, done) {
    if (isLocked(path)) {
      return setImmediate(done, new Error('path is locked'));
    }

    deepLock(path);

    operations.del(databaseGet, path, onOperations);

    function onOperations(error, operations) {
      if (error) {
        return failure(error);
      }

      databaseBatch(operations, onBatch);
    }

    function onBatch(error) {
      if (error) {
        return failure(error);
      }

      success();
    }

    function failure(error) {
      unlock(path);
      done(error);
    }

    function success() {
      unlock(path);
      done();
    }
  }

  function batch(patch, done) {
    if (isPatchLocked()) {
      return setImmediate(done, new Error('some paths are locked'));
    }

    lockPatch();

    operations.batch(databaseGet, patch, onOperations);

    function onOperations(error, operations) {
      if (error) {
        return failure(error);
      }

      databaseBatch(operations, onBatch);
    }

    function onBatch(error) {
      if (error) {
        return failure(error);
      }

      success();
    }

    function failure(error) {
      unlockPatch();
      done(error);
    }

    function success() {
      unlockPatch();
      done();
    }

    function isPatchLocked() {
      return patch.some(isOperationLocked);
    }

    function isOperationLocked(operation) {
      return isLocked(operation.path);
    }

    function lockPatch() {
      patch.forEach(lockOperation);
    }

    function lockOperation(operation) {
      var type = operation.type;
      var path = operation.path;

      if (type === 'put') {
        simpleLock(path);
      }

      if (type == 'del') {
        deepLock(path);
      }
    }    

    function unlockPatch() {
      patch.forEach(unlockOperation);
    }

    function unlockOperation(operation) {
      unlock(operation.path);
    }
  }

  function get(path, done) {
    databaseGet(path, onNode);

    function onNode(error, node) {
      if (error && error.notFound) {
        return done(null, false);
      }

      if (error) {
        return done(error);
      }

      done(null, true, node.properties, node.children);
    }
  }

  var tree = {};

  tree.put = put;
  tree.del = del;
  tree.get = get;
  tree.batch = batch;

  setImmediate(done, null, tree);
};
