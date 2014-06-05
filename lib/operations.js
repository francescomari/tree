var async = require('async');

var paths = require('./paths');

exports.put = put;
exports.del = del;
exports.batch = batch;

function put(get, path, properties, done) {
  var parentPath = paths.getParent(path);
  var name = paths.getName(path);

  get(path, onPreviousNode);

  function onPreviousNode(error, node) {
    if (error && error.notFound && parentPath) {
      return get(parentPath, onParentNode);
    }

    if (error && error.notFound) {
      return done(null, [{type: 'put', key: path, value: {children: [], properties: properties}}]);
    }

    if (error) {
      return done(error);
    }

    done(null, [{type: 'put', key: path, value: {children: node.children, properties: properties}}]);
  }

  function onParentNode(error, parent) {
    if (error) {
      return done(error);
    }

    var operations = [
      {
        type: 'put', 
        key: parentPath, 
        value: {
          children: parent.children.concat(name), 
          properties: parent.properties
        }
      },
      {
        type: 'put',
        key: path,
        value: {
          children: [],
          properties: properties
        }
      }
    ];

    done(null, operations);
  }
}

function del(get, path, done) {
  var operations = [];
  var parentPath = paths.getParent(path);
  var name = paths.getName(path);

  if (parentPath) {
    get(parentPath, onParentNode);
  }
  else {
    iterate(path, onPaths);
  }

  function onParentNode(error, node) {
    if (error && error.notFound) {
      return done();
    }
    
    if (error) {
      return done(error);
    }

    var children = node.children.filter(isNotDeleted);

    function isNotDeleted(current) {
      return current !== name;
    }

    operations.push({type: 'put', key: parentPath, value: {children: children, properties: node.properties}});

    iterate(path, onPaths);
  }

  function iterate(path, done) {
    get(path, onNode);

    function onNode(error, node) {
      if (error && error.notFound) {
        return done();
      }

      if (error) {
        return done(error);
      }

      operations.push({type: 'del', key: path});

      var children = node.children.map(paths.appendName.bind(null, path));

      async.each(children, iterate, done);
    }
  }

  function onPaths(error) {
    if (error) {
      return done(error);
    }

    done(null, operations);
  }
}

function batch(get, operations, done) {
  var workspace = {};

  async.mapSeries(operations, computeOperations, onOperationsComputed);

  function computeOperations(operation, done) {
    if (operation.type === 'put') {
      return computePutOperations(operation, done);
    }

    if (operation.type === 'del') {
      return computeDelOperations(operation, done);
    }

    done(new Error('unrecognized operation type'));
  }

  function computePutOperations(operation, done) {
    put(workspaceGet, operation.path, operation.properties, onPutOperations);

    function onPutOperations(error, operations) {
      if (error) {
        return done(error);
      }

      operations.forEach(updateWorkspace);

      done(null, operations);
    }
  }

  function computeDelOperations(operation, done) {
    del(workspaceGet, operation.path, onDelOperations);

    function onDelOperations(error, operations) {
      if (error) {
        return done(error);
      }

      operations.forEach(updateWorkspace);

      done(null, operations);
    }
  }

  function workspaceGet(path, done) {
    var cached = workspace[path];

    if (cached === undefined) {
      return get(path, done);
    }

    if (cached === null) {
      return done({notFound: true});
    }

    done(null, cached);
  }

  function updateWorkspace(operation) {
    if (operation.type === 'put') {
      workspace[operation.key] = operation.value;
    }

    if (operation.type === 'del') {
      workspace[operation.key] = null;
    }
  }

  function onOperationsComputed(error, operations) {
    if (error) {
      return done(error);
    }

    var result = operations.reduce(concat, []);

    function concat(accumulator, current) {
      return accumulator.concat(current);
    }

    done(null, result);
  }
}
