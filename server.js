var express = require('express')
var serveStatic = require('serve-static')

var app = express()
var port = 8000
app.use(serveStatic('public'))
app.listen(port)
console.log('Started server on port '+port)
