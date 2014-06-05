exports.getParent = getParent;
exports.getParents = getParents;
exports.getName = getName;
exports.appendName = appendName;

function appendName(path, name) {
  if (path === '/') {
    return path + name;
  }

  return path + '/' + name;
}

function getName(path) {
  if (path === '/') {
    return null;
  }

  return path.slice(path.lastIndexOf('/') + 1);
}

function getParent(path) {
  if (path === '/') {
    return null;
  }

  var index = path.lastIndexOf('/');

  if (index === 0) {
    return '/';
  }

  return path.slice(0, index);
}

function getParents(path) {
  if (path === '/') {
    return [];
  }

  var index = path.lastIndexOf('/');

  if (index === 0) {
    return ['/'];
  }

  var components = path.slice(1, index).split('/');

  var parents = [];

  for (var i = 0; i <= components.length; i++) {
    parents.push('/' + components.slice(0, i).join('/'));
  }

  return parents;
}
