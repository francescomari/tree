# Tree

This is an implementation of a tree persisted on LevelDB. The tree is composed of nodes. Each node is represented by a JavaScript object and maintains a list of children. 

Each node has a name and can be referenced by a path. The root of the tree is referenced by the path `'/'`, and each deeper node is referenced by a path in the form `'/blog/posts/1'`.

The current implementation enforces some rules on the nodes and on the operations that can be performed on them. For further details, see the documentation of the specific operation.

## Import the library

```
var createTree = require('tree');
```

The only item exported by the module is a function which can be invoked to create a tree.

## Create a tree

```js
createTree(db, done)
```

Create a tree. `db` is a [LevelUP](https://github.com/rvagg/node-levelup) database, and it is a required parameter. `done` is a `function (error, tree)`, where `error` is an optional error object and `tree` is the tree object which allows you to manipulate the nodes in the tree.

## Insert a node

```js
tree.put(path, properties, done)
```

Create or update a node with the given `path`. The node will carry the properties defined by the `properties` object. `done` is a `function (error)` which will be called when the node is persisted or if an error occurs.

To create a node at a given path, its parent node must already exist. In example, to create a node at `'/blog/posts'`, a node at `'/blog'` must already exists. In turn, to create a node at `'/blog'`, the root node '"/"' must already exist too. Please note that the root node is not created automatically.

## Delete a node

```js
tree.del(path, done)
```

Delete the node at the given `path`. The callback `done` is a `function (error)`, where error is an optional error object. If the node you want to delete doesn't exist, the function will not end with an error, but it will successfully complete.

## Read a node

```js
tree.get(path, done)
```

Read a node at the given `path`. The callback `done` is a `function (error, found, properties, children)`, where `error` is an optional error object. If the function completed without any error, the `found` parameter is a boolean value which is `true` if a node exists at the given `path`. If the node exists, `properties` is an object which represents the payload of the node, and `children` is an array of strings containing the names of the child nodes.

## Batch operations

```js
tree.batch(operations, done)
```

You can change the tree by performing multiple operations at once. The method is invoked with an array `operations` containing the operations to be performed as a single unit. The `done` callback is a `function (error)` which will be invoked with an optional `error` parameter when the operation completes.

### Insert operation

```js
{type: 'put', path: '/blog/posts/1', properties: {title: 'First post'}}
```

The `type` field must always have a value of `'put'`, while the `path` and `properties` fields have the same meaning as the parameters passed to the `tree.put()` function.

### Delete operation

```js
{type: 'del', path: '/blog/posts/1'}
```

The `type` field must always have a value of `'del'`, while the `path` field has the same meaning as the parameter apssed to the `tree.del()` function.

## Parallelism and locking

Reads performed to the tree always pass through, without any form of control. Writes to the database triggered with `tree.put()`, `tree.del()` or `tree.batch()`, instead, use a form of locking to protect from undesired results.

This happens to maintain consistency in the data written to the underlying database. Each write operation, in fact, is composed under the hood of many atomic LevelDB operations. Moreover, the set of atomic operations performed during a write depends on the status of the database when the write is performed.

In example, when writing a node in the database, the implementation must be sure that the parent node exists. Under the hood, a read operation is performed to check that the parent is already present in the database. If between this check and the actual write a delete operation deletes the parent, we are going to persist a dangling node which will not be accessed anymore. If the parent doesn't exist, there is no way to access that node anymore.

To avoid this and other weirder situations, every write to the database may fail if the path has been already locked by a previous operation. This is a reasonable tradeoff between performance and consistency.
