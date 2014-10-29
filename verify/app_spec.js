var express = require("../")
  , request = require("supertest")
  , expect = require("chai").expect
  , http = require("http");

describe("Implement app", function() {
  var app = express();
  describe("as handler to http.createServer", function() {
    it("responds to / with 404", function(done) {
      var server = http.createServer(app);
      request(server).get("/").expect(404).end(done);
    });
  });

  describe("Implement listen method", function() {
    it("responds sth on specific port", function(done) {
      var server = app.listen(4000);
      request("http://localhost:4000").get("/foo").expect(404).end(done);
    })
  })

})


describe("Implement the middlewares stack", function() {
  var app;
  beforeEach(function() {
    app = new express();
  });
  it(".use to handle middlware with route and handler", function(done){
    var m1 = function(req, res, next) {
      next();
    }
    var m2 = function(req, res, next) {
      res.end("m2");
    }
    app.use("/", m1);
    app.use("/", m2);

    var server = http.createServer(app);
    request(server).get("/").expect("m2").end(done);
  });

  it("return 404 at the end of the middlewares chain", function(done) {
    var m1 = function(req, res, next){
      next();
    }
    var m2 = function(req, res, next){
      next();
    }
    app.use(m1);
    app.use(m2);
    var server = http.createServer(app);
    request(server).get("/").expect(404).end(done);
  });
})

describe("Implement Error Handling", function() {
  var app;
  beforeEach(function() {
    app = new express();
  })

  it("should return 500 for unhandled error", function(done) {
    var m1 = function(req, res, next) {
      next(new Error("boom!"));
    }
    app.use(m1);
    request(app).get("/").expect(500).end(done);
  });
  it("should return 500 for uncaught error", function(done) {
    var m1 = function(req, res, next) {
      throw new Error("boom!");
    }
    app.use(m1);
    request(app).get("/").expect(500).end(done);
  });
  it("should ignore error handlers when 'next' is call without error", function(done) {
    var m1 = function(req, res, next) {
      next();
    }
    var e1 = function(req, res, next) {
    }
    var m2 = function(req ,res, next) {
      res.end("m2");
    }

    app.use(m1);
    app.use(m1);
    app.use(m2);
    request(app).get("/").expect("m2").end(done);
  })
  it("should skip normal middlewares if 'next' is call with an error", function(done) {
    var m1 = function(req, res, next) {
      next(new Error("boom!"));
    }
    var m2 = function(req, res, next) {
    }
    var e1 = function(err, req, res, next) {
      res.end("e1");
    }
    app.use(m1);
    app.use(m2);
    app.use(e1);

    request(app).get("/").expect("e1").end(done);
  }) 
})

describe("Implement App Embedding As Middleware", function() {
  var app, subApp;
  beforeEach(function() {
    app = new express();
    subApp = new express();
  })

  it("should pass unhandled request to parent", function(done) {
    function m2(req, res) {
      res.end("m2");
    }

    app.use(subApp);
    app.use(m2);
    request(app).get("/").expect("m2").end(done);
  });

  it("should pass unhandled error to parent", function(done) {
    function m1(req, res, next) {
      next("m1 error");
    }

    function e1(err, req, res, next) {
      res.end(err);
    }

    subApp.use(m1);
    app.use(subApp);
    app.use(e1);
    request(app).get("/").expect("m1 error").end(done);
  })
})

describe("Implement Layer Class and the match method", function() {
  var layer, fn; 
  beforeEach(function() {
    var Layer = require("../lib/layer");
    fn = function() {};
    layer = new Layer('/foo', fn);
  });

  it("returns undefined if path doesn't match", function() {
    expect(layer.match('/')).to.be.undefined;
  });
  it("returns matched path if layer matches the request path exactly", function() {
    expect(layer.match("/foo")).to.have.property("path", "/foo");
  });
  it("returns matched prefix if layer matches the prefix of the request path", function() {
    expect(layer.match("/foo/bar")).to.have.property("path", "/foo");
  });
})

describe("The middlewares called should match request path", function() {
  var app;
  beforeEach(function() {
    app = new express();
    app.use("/foo", function(req, res, next) {
      res.end("foo");
    })

    app.use(function(req, res) {
      res.end("root");
    })
  })

  it("return root for GET /", function(done) {
    request(app).get("/").expect("root").end(done);
  })
  it("return foo for GET /foo", function(done) {
    request(app).get("/foo").expect("foo").end(done);
  })
  it("return foo for GET /foo/bar", function(done) {
    request(app).get("/foo/bar").expect("foo").end(done);
  })
})

describe("The error handlers called should match request path", function() {
  var app;
  beforeEach(function() {
    app = new express();
    app.use("/foo",function(req,res,next) {
      throw "boom!"
    });

    app.use("/foo/a",function(err,req,res,next) {
      res.end("error handled /foo/a");
    });

    app.use("/foo/b",function(err,req,res,next) {
      res.end("error handled /foo/b");
    });
  })

  it("return error handled for GET /foo/a", function(done) {
    request(app).get("/foo/a").expect("error handled /foo/a").end(done);
  })
  it("return error handled for GET /foo/b", function(done) {
    request(app).get("/foo/b").expect("error handled /foo/b").end(done);
  })
  it("return 500 for GET /foo", function(done) {
    request(app).get("/foo").expect(500).end(done);
  })

})

describe("Path parameters extraction",function() {
  var Layer, layer;

  before(function() {
    Layer = require("../lib/layer");
    layer = new Layer("/foo/:a/:b", function() {});
  });

  it("returns undefined for unmatched path",function() {
    expect(layer.match("/bar")).to.be.undefined;
  });

  it("returns undefined if there isn't enough parameters",function() {
    expect(layer.match("/foo/apple")).to.be.undefined;
  });

  it("returns match data for exact match",function() {
    var match = layer.match("/foo/apple/xiaomi");
    expect(match).to.not.be.undefined;
    expect(match).to.have.property("path","/foo/apple/xiaomi");
    expect(match.params).to.deep.equal({a: "apple", b: "xiaomi"});
  });

  it("returns match data for prefix match",function() {
    var match = layer.match("/foo/apple/xiaomi/htc");
    expect(match).to.not.be.undefined;
    expect(match).to.have.property("path","/foo/apple/xiaomi");
    expect(match.params).to.deep.equal({a: "apple", b: "xiaomi"});
  });

  it("should decode uri encoding",function() {
    var match = layer.match("/foo/apple/xiao%20mi");
    expect(match.params).to.deep.equal({a: "apple", b: "xiao mi"});
  });

  it("should strip trialing slash",function() {
    layer = new Layer("/")
    expect(layer.match("/foo")).to.not.be.undefined;
    expect(layer.match("/")).to.not.be.undefined;

    layer = new Layer("/foo/")
    expect(layer.match("/foo")).to.not.be.undefined;
    expect(layer.match("/foo/")).to.not.be.undefined;
  });
});

describe("Implement req.params",function() {
  var app;
  before(function() {
    app = express();
    app.use("/foo/:a",function(req,res,next) {
      res.end(req.params.a);
    });

    app.use("/foo",function(req,res,next) {
      res.end(""+req.params.a);
    });
  });

  it("should make path parameters accessible in req.params",function(done) {
    request(app).get("/foo/google").expect("google").end(done);
  })

  it("should make {} the default for req.params",function(done) {
    request(app).get("/foo").expect("undefined").end(done);
  });
})

describe("Prefix path trimming",function() {
  var app, subapp, barapp;
  beforeEach(function() {
    app = express();
    subapp = express();

    subapp.use("/bar",function(req,res) {
      res.end("embedded app: "+req.url);
    });

    app.use("/foo",subapp);

    app.use("/foo",function(req,res) {
      res.end("handler: "+req.url);
    });
  });

  it("trims request path prefix when calling embedded app",function(done) {
    request(app).get("/foo/bar").expect("embedded app: /bar").end(done);
  });

  it("restore trimmed request path to original when going to the next middleware",function(done) {
    request(app).get("/foo").expect("handler: /foo").end(done);
  });

  describe("ensures leading slash",function() {
    beforeEach(function() {
      barapp = express();
      barapp.use("/",function(req,res) {
        res.end("/bar");
      });
      app.use("/bar",barapp);
    });

    it("ensures that first char is / for trimmed path",function(done) {
      // request(app).get("/bar").expect("/bar").end(done);
      request(app).get("/bar/").expect("/bar").end(done);
    });
  });
});

describe("Implement app.get", function() {
  var app;
  beforeEach(function() {
    app = new express();
    app.get("/foo", function(req, res) {
      res.end("foo");
    })
  })

  it("should respond for GET request", function(done) {
    request(app).get("/foo").expect("foo").end(done);
  });

  it("should respond 404 for non GET requests", function(done) {
    request(app).post("/foo").expect(404).end(done);
  });
  it("should respond 404 for non whole path match", function(done) {
    request(app).get("/foo/bar").expect(404).end(done);
  })
})

describe("All http verbs:",function() {
  var methods,app;

  try {
    methods = require("methods");
    methods.splice(methods.indexOf("connect"), 1);
  } catch(e) {
    methods = [];
  }

  beforeEach(function() {
    app = express();
  });

  methods.forEach(function(method) {
    it("responds to "+method,function(done) {
      app[method]("/foo",function(req,res) {
        res.end("foo");
      });

      if(method == "delete")
        method = "del";

      request(app)[method]("/foo").expect(200).end(done);
    });
  });
});

