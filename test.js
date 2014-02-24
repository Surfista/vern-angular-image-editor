var connect = require('connect');
var port = 8080;

var app = connect().use(function(req, res, next) {
	  res.setHeader("Access-Control-Allow-Origin", "*");
	  res.setHeader("Access-Control-Allow-Methods", "GET");
	  res.setHeader("Access-Control-Allow-Headers", "*");
	  next()
	})
	.use(connect.static(__dirname));

connect.createServer(app).listen(port, function() {
    console.log('Listening on port ' + port);
  });