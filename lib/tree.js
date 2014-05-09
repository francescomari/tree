var async = require('async');

var operations = require('./operations');

module.exports = function (db, done) {
  var writes = async.queue(performWrite, 1);

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
    writes.push(putTask.bind(null, path, properties), done);
  }

  function putTask(path, properties, done) {
    operations.put(databaseGet, path, properties, onOperations);

    function onOperations(error, operations) {
      if (error) {
        return done(error);
      }

      databaseBatch(operations, done);
    }
  }

  function del(path, done) {
    writes.push(delTask.bind(null, path), done);
  }

  function delTask(path, done) {
    operations.del(databaseGet, path, onOperations);

    function onOperations(error, operations) {
      if (error) {
        return done(error);
      }

      databaseBatch(operations, done);
    }
  }

  function batch(patch, done) {
    writes.push(batchTask.bind(null, patch), done);
  }

  function batchTask(patch, done) {
    operations.batch(databaseGet, patch, onOperations);

    function onOperations(error, operations) {
      if (error) {
        return done(error);
      }

      databaseBatch(operations, done);
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
