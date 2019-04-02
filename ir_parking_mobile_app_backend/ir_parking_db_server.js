var mySQL = require('mysql')
var express = require('express')
var app = express()

var con = mySQL.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ir_parking'
})
con.connect(function (err) {
  if (err) throw err
  console.log('Connected!')
})

app.get('/carinfo', function (request, response) {
  var viewCarInfo= 'SELECT c.licensePlate,CONCAT(co.carOwnerFirstName," ",co.carOwnerLastName) As carOwnerName, co.carOwnerTel FROM carowners co JOIN car c ON co.carOwnerID = c.carOwnerID'
  con.query(viewCarInfo, function (err, result) {
    if (err) throw err
    response.send(result)
  })
})
app.listen(3000)
