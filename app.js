var express = require('express');
var http    = require('http');
var parser = require('body-parser');
var nconf = require('nconf');

nconf.argv();
nconf.env();
nconf.file({
  file: './config.json'
});

var cheerio = require('cheerio');
// Extend cheerio.
cheerio.prototype.cleanText = function () {
  var text = this.text();
  // Strip beg. and end whitespace characters.
  text = text.replace(/^\s*|\s*$/g, '');
  return text;
}

var gitbot  = require('./integrations/gitbot');
var definebot = require('./integrations/definebot');

var app = express();


// Send bot response back as json.
function sendResponse (req, res) {
  res.status(200).json(res.bot || {});
}


// all environments
app.set('port', process.env.PORT || 3000);
app.use(parser.json());
app.use(parser.urlencoded({
  extended: true
}));


// send error as bot response
app.use(function (err, req, res, next) {
  var code = err && err.code || 500;
  var text = err && err.text || 'Error occurred.';

  console.log(err);

  res.status(code).json({
    text: text
  });
});

// bot routes
app.post('/gitbot', gitbot, sendResponse);
app.post('/definebot', definebot, sendResponse);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Server listening on port: ' + app.get('port'));
});
