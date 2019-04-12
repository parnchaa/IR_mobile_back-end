var mySQL = require('mysql')
var express = require('express')
var cors = require('cors')
var bodyParser = require('body-parser')
var app = express()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

var con = mySQL.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ir_parking'
})

con.connect(err => {
  if (err) throw err
  app.listen(3000, () => {
    console.log('Start server at port 3000.')
  })
})

app.get('/carinfo/:licenseplate', function (request, response) {
  var key = request.params.licenseplate
  console.log(key);
  var viewCarInfo = 'SELECT c.licensePlate,CONCAT(co.carOwnerFirstName," ",co.carOwnerLastname) AS carOwnerName,co.carOwnerTel' + '\n' +
    'FROM carowners co JOIN car c ON co.carOwnerID = c.carOwnerID WHERE c.licensePlate LIKE '+ mySQL.escape('%' + key +'%')
  con.query(viewCarInfo, function (err, result) {
    if (err) throw err
    response.send(result)
  })
})

app.get('/privilages/:location' , function (request,response) {
  var key = request.params.location
  console.log(key);
  var viewPrivilagesOfcar = 'SELECT c.licensePlate, s.typeOfSticker,s.colorOfSticker, l.locationCode, l.locationName ' + '\n' + 
    'FROM car c JOIN sticker s ON c.stickerID = s.stickerID JOIN location l ON s.stickerID = l.stickerID' + '\n' +
    'WHERE l.locationName LIKE' + mySQL.escape('%' + key + '%')
  con.query(viewPrivilagesOfcar, function (err, result) {
    if(err) throw err
    response.send(result)
  })
})
