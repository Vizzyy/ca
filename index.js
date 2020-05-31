#!/usr/bin/env node

const 	constants = require('./constants'),
    http = require('http'),
    express = require('express'),
    path = require('path'),
    // favicon = require('serve-favicon'),
    app = express(),
    index = require('./routes/certificateAuthority');


app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules')));
// app.use(favicon(__dirname + '/public/favicon.ico'));

app.use('/', index);
const server = http.createServer(app);

server.listen(constants.port);
server.on('listening', onListening);

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}

module.exports = app;