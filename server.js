var express = require('express');
var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs-extra');
var colors = require('colors');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var cookiesParser = require('cookie-parser');
var session = require('express-session');
var errorHandler = require('errorhandler');
var config = require('./config');
var app = express();
//ssl file and passphrase us for server
var ssl_options = {
    key: null,
    cert: null
};
var compress = require('compression');
app.use(compress({
    threshold: 0, //or whatever you want the lower threshold to be
    filter: function(req, res) {
        var ct = res.get('content-type')
        return true
    }
}));

//all environment
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger(config.env));
app.use(bodyParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.set(process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0');
app.set('port', process.env.port || config.port);
app.use(methodOverride());
app.use(cookiesParser('02fnvnwt43fgj93fqmkkkk'));
app.use(session({
    secret: '3a96a546-f7d2-4e14-a3a7-75ad4c041cbd',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}));
//middleware response location
app.use(function(req, res, next) {
    var ip = req.cookies.sb_ip;
    var geoip = require('geoip-lite');
    //base64
    var _base64 = {
        _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        encode: function(input) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;
            input = _base64._utf8_encode(input);
            while (i < input.length) {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);
                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;
                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }
                output = output + this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) + this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
            }
            return output;
        },
        decode: function(input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            while (i < input.length) {
                enc1 = this._keyStr.indexOf(input.charAt(i++));
                enc2 = this._keyStr.indexOf(input.charAt(i++));
                enc3 = this._keyStr.indexOf(input.charAt(i++));
                enc4 = this._keyStr.indexOf(input.charAt(i++));
                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;
                output = output + String.fromCharCode(chr1);
                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            }
            output = _base64._utf8_decode(output);
            return output;
        },
        _utf8_encode: function(string) {
            string = string.replace(/\r\n/g, "\n");
            var utftext = "";
            for (var n = 0; n < string.length; n++) {
                var c = string.charCodeAt(n);
                if (c < 128) {
                    utftext += String.fromCharCode(c);
                } else if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                } else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
            }
            return utftext;
        },
        _utf8_decode: function(utftext) {
            var string = "";
            var i = 0;
            var c = c1 = c2 = 0;
            while (i < utftext.length) {
                c = utftext.charCodeAt(i);
                if (c < 128) {
                    string += String.fromCharCode(c);
                    i++;
                } else if ((c > 191) && (c < 224)) {
                    c2 = utftext.charCodeAt(i + 1);
                    string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                    i += 2;
                } else {
                    c2 = utftext.charCodeAt(i + 1);
                    c3 = utftext.charCodeAt(i + 2);
                    string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    i += 3;
                }
            }
            return string;
        }
    };
    //end
    if (ip) {
        ip = _base64.decode(ip);
        var geo = geoip.lookup(ip);
        if(geo){
            geo = _base64.encode(JSON.stringify(geo.ll));
            res.cookie('sb_geo', geo, {
                expires: new Date(Date.now() + (1000 * 60 * 20)),
                httpOnly: false
            });
        }
    }
    next();
});
//end
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(__dirname + '/public'));
app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, '/public/index.html'));
});
if (config.env === 'dev') {
    app.use(errorHandler());
}
if (process.argv.indexOf('--nossl') !== -1) {
    https.createServer(ssl_options, app).listen(config.port, function() {
        console.log('================ Sportsbook running on port '.green, config.port.toString().red.bold.underline, '================'.green);
    })
} else {
    http.createServer(app).listen(config.port, function() {
        console.log('================ Sportsbook running on port '.green, config.port.toString().red.bold.underline, '================'.green);
    });
}
