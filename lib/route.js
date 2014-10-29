/*
 * Mini-express
 * Author: @miaoever
 * Email: leo.miao.ever@gmail.com
 */
var methods = require("methods");

var makeRoute = function () {
  var route = function(req, res, done) {
    var idx = 0;
    var stack = route.stack || [];

    var next = function(err) {
      var layer = stack[idx++];

      if (!layer) return done(err);

      if (req.method.toLowerCase() != layer.verb.toLowerCase() && layer.verb != "all") return next(err);

      var handle = layer.handler;

      try {
        if (err) { //error
          if (err === "route") return done();
          return done(err);
        } else { // without error 
          handle(req, res, next);
        }
      } catch (_err) {
        next(_err);
      }
    }
    next();
  };

  route.stack = [];

  route.use = function(verb, handler) {
    this.stack.push({verb: verb, handler: handler});
    return this;
  }

  methods.concat("all").forEach(function(verb) {
    route[verb] = function(handler) {
      this.use(verb, handler);
      return this;
    }
  });

  return route;
}

module.exports = function() {
  var route = makeRoute();
  return route;
}
