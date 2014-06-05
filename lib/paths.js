exports.getParents = getParents;

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
