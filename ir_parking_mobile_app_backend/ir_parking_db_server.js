var mySQL = require('mysql')
var express = require('express')
var cors = require('cors')
var bodyParser = require('body-parser')
var app = express()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

var con = mySQL.createConnection({
  host: '54.251.180.67',
  user: 'parn',
  password: 'irdb2019',
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
  var viewCarInfo = 'SELECT c.licensePlate,CONCAT(co.carOwnerFirstName," ",co.carOwnerLastname) AS carOwnerName' + '\n' +
     ',co.carOwnerTel FROM carowners co JOIN car c ON co.carOwnerID = c.carOwnerID ' + '\n' +
     'WHERE c.licensePlate LIKE '+ mySQL.escape('%' + key +'%')
  con.query(viewCarInfo, function (err, result) {
    if (err) throw err
    response.send(result)
  })
})

app.get('/privilages/:location/:licenseplate' , function (request,response) {
  var keyLocation = request.params.location
  var keyLicensePlate = request.params.licenseplate
  console.log('Location: ',keyLocation);
  console.log('LicensePlate: ', keyLicensePlate);
  var viewPrivilagesOfcar = 'SELECT c.licensePlate, l.locationCode, l.locationName FROM car c JOIN ' + '\n' + 
    'location l ON c.stickerID = l.stickerID WHERE l.locationName LIKE' + '\n' + mySQL.escape('%' + keyLocation + '%') + '\n' +
    'AND c.licensePlate LIKE' + mySQL.escape('%' + keyLicensePlate + '%')
  con.query(viewPrivilagesOfcar, function (err, result) {
    if(err) throw err
    response.send(result)
  })
})

