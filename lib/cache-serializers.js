var fs = require('fs');
var path = require('path');

var mkdirp = require('mkdirp');
var medea = require('medea');
var Promise = require('bluebird');


var fsReadFile = Promise.promisify(fs.readFile, {context: fs});
var fsReaddir = Promise.promisify(fs.readdir, {context: fs});
var fsStat = Promise.promisify(fs.stat, {context: fs});
var fsWriteFile = Promise.promisify(fs.writeFile, {context: fs});

exports.FileSerializer = FileSerializer;
exports.MedeaDbSerializer = MedeaDbSerializer;
exports.JsonSerializer = JsonSerializer;

function FileSerializer(options) {
  this.path = options.cacheDirPath;
}

FileSerializer.prototype.read = function() {
  var assets = {};
  var cacheAssetDirPath = this.path;
  mkdirp.sync(cacheAssetDirPath);
  return Promise.all(fs.readdirSync(cacheAssetDirPath).map(function(name) {
    return fsReadFile(path.join(cacheAssetDirPath, name))
    .then(function(asset) {
      assets[name] = asset;
    });
  }))
  .then(function() {return assets;});
};

FileSerializer.prototype.write = function(assetOps) {
  var cacheAssetDirPath = this.path;
  mkdirp.sync(cacheAssetDirPath);
  return Promise.all(assetOps.map(function(asset) {
    var assetPath = path.join(cacheAssetDirPath, asset.key);
    return fsWriteFile(assetPath, asset.value);
  }));
};

function MedeaDbSerializer(options) {
  this.path = options.cacheDirPath;
  this.medeaDbLock = Promise.resolve();
}

MedeaDbSerializer.prototype.read = function() {
  var start = Date.now();
  var cacheDirPath = this.path;
  var moduleCache = {};
  var medeaDb = medea();

  var readDb = function openDb(path, moduleCache) {
    return new Promise(function(resolve,reject){
      medeaDb.open(path, function(err) {
        if (err) reject(err);

        debugger;
        medeaDb.listKeys(function(err, keys) {
          debugger;
          for (var i = 0; i < keys.length; i++) {
            (function(count) {
              var key = keys[i];
              medeaDb.get(key, function(err, value) {
                if (err) reject(err);

                if (!moduleCache[key]) {
                  moduleCache[key] = value;
                }
              })
            })(i);
          }
          debugger;
          medeaDb.close(function(err) {
            if (err) reject(err);

            debugger;
            console.log(moduleCache);
            resolve(moduleCache);
          });
        });
      });
    });
  }

  return readDb(cacheDirPath, moduleCache);
};

MedeaDbSerializer.prototype.write = function(moduleOps) {
  debugger;
  var ops = moduleOps;
  var cachePath = this.path;
  var medeaDb = medea();

  if (ops.length === 0) {
    return;
  }

  var writeDb = function writeDb(path) {
    return new Promise(function(resolve,reject) {
      medeaDb.open(path, function(err) {
        var start = Date.now();
        if (err) reject(err);

        var batch = medeaDb.createBatch();
        for (var i = 0; i < ops.length; i++) {
          if (ops[i].value === null) {
            batch.remove(ops[i].key);
          }
          else {
            batch.put(ops[i].key, ops[i].value);
          }
        }

        medeaDb.write(batch, function() {
          medeaDb.close(function(err) {
            resolve();
          });
        });
      })
    });
  };

  return this.medeaDbLock = this.medeaDbLock
    .then(function() {
      return writeDb(cachePath);
    });
};

function JsonSerializer(options) {
  this.path = options.cacheDirPath;
  if (!/\.json$/.test(this.path)) {
    this.path += '.json';
  }
}

JsonSerializer.prototype.read = function() {
  var cacheDirPath = this.path;
  return Promise.promisify(fs.readFile)(cacheDirPath, 'utf8')
  .catch(function() {return '{}';})
  .then(JSON.parse);
};

JsonSerializer.prototype.write = function(moduleOps) {
  var cacheDirPath = this.path;
  return this.read()
  .then(function(cache) {
    for (var i = 0; i < moduleOps.length; i++) {
      var op = moduleOps[i];
      cache[op.key] = op.value;
    }
    return cache;
  })
  .then(JSON.stringify)
  .then(function(cache) {
    return Promise.promisify(fs.writeFile)(cacheDirPath, cache);
  });
};
