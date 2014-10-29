/*
 * Mini-express
 * Author: @miaoever
 * Email: leo.miao.ever@gmail.com
 */

var http = require('http');
var layer = require('./layer');
var route = require('./route');
var methods = require('methods');

var done = function (err, req, res) {
  if (err) {
    res.statusCode = 500;
  } else {
    res.statusCode = 404;
  }
  return res.end();
}

var makeApp = function() {
  var app = function(req, res) {
    app.handle(req, res, done);
  }

  app.stack = [];

  app.listen = function() {
    var server = http.createServer(this);
    return server.listen.apply(server, arguments);
  }

  app.use = function(route, fn, opt) {
    this.stack = this.stack || [];

    if (typeof route != 'string') {
      fn = route;
      route = "/";
    }

    if (typeof fn.handle === 'function') {
      var subApp = fn;
      fn = function (req, res, next) {
        subApp.prefix = (route[route.length - 1] === '/')? route.substr(0,route.length -1) : route;
        subApp.handle(req, res, function(err, req, res) {
          req.url = req.originUrl; //restore the original request url when exit the subApp
          next(err);
        });
      }
    }
    this.stack.push(new layer(route, fn, opt));

    return this;
  }

  app.handle = function(req, res, done) {
    var idx = 0;
    var stack = this.stack;
    var prefix = this.prefix || "";

    var next = function(err) {
      var layer = stack[idx++];

      if (!layer) return done(err, req, res);

      var handle = layer.handle;

      req.originUrl = req.url;
      req.url = req.url.substr(prefix.length);//remove prefix path for subApp

      var isMatched = layer.match(req.url);
      //url not match
      if (!isMatched) return next(err);

      req.params = isMatched.params;

      try {
        if (err) { //error
          if (handle.length < 4) {
            next(err);
          } else {
            handle(err, req, res, next);
          }
        } else { // without error 
          if (handle.length === 4) {
            next();
          } else {
            handle(req, res, next);
          }
        }
      } catch (_err) {
        next(_err);
      }
    }
    next();
  }

  app.route = function(path) {
    var router = route();
    this.use(path, router, true);
    return router;
  }

  methods.concat("all").forEach(function(method) {
    app[method] = function (path, handler) {
      var router = this.route(path);
      router[method](handler);
      return this;
    }
  });

  return app;
}

module.exports = function () {
  var app = makeApp();
  return app;
};
