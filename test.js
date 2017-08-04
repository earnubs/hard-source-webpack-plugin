var Serializers = require('./lib/cache-serializers.js');

var MedeaSerializer = Serializers.MedeaDbSerializer;

var serializer = new MedeaSerializer({ cacheDirPath: './medea-cache'});

serializer.read()
serializer.write([{key: 'foo', value: 'foo'}, {key: 'bar', value: null}]);
