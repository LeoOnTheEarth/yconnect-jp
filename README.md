##yconnect-jp##

A Simple Yahoo Japan Yconnect Library

Example:

    var http = require('http');
    var url = require('url');
    var Yconnect = require('yconnect-jp');
    
    var options = {
      appId: 'id',
      secret: 'secret',
      redirectUri: 'http://127.0.0.1:3000/',
      state: 'ZSEDXDRFCFTTGVGYBNJUIJNJKIOKMKLPOOLLP',
      nonce: 'LPMKOKJMNIJNJIJBHUHUHYGVCFTFCFRDXDESZSEWSAWQERTYIU'
    };
    var yconnect = new Yconnect(options);
    
    http.createServer(function(request, response) {
      var queryData = url.parse(request.url, true).query;
      
      if (queryData.code) {
        yconnect.getAccessToken(queryData.code, function(accessToken) {
          response.writeHead(200, {"Content-Type": "text/plain"});
          response.end(JSON.stringify(accessToken));
        });
      } else {
        var redirectUri = yconnect.getAuthorizationUri();
        response.writeHead(302, {'Location': redirectUri});
        response.end();
      }
    }).listen(3000);

Then, go http://127.0.0.1:3000/ to get the access token
