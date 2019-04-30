var mySQL = require('mysql')
var express = require('express')
// var session = require('express-session')
// var path = require('path')
var cors = require('cors')
var body = require('body-parser')
var app = express()

// app.use(session({
//   secret: 'secret',
//   resave: true,
//   saveUninitialized: true
// }))
app.use(cors())
app.use(body())
app.use(body.urlencoded({ extended: true }))
app.use(body.json())


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
  var keyLicensePlate = request.params.licenseplate
  var viewCarInfo = 'SELECT c.carID, c.licensePlate,CONCAT(co.carOwnerFirstName," ",co.carOwnerLastname) AS carOwnerName' + '\n' +
     ',co.carOwnerTel FROM CarOwners co JOIN Car c ON co.carOwnerID = c.carOwnerID ' + '\n' +
    'WHERE c.licensePlate LIKE ' + mySQL.escape('%' + keyLicensePlate +'%')
  con.query(viewCarInfo, function (err, result) {
    if (err) throw err
    response.send(result)
  })
})


app.get('/privileges/:location/:licenseplate' , function (request,response) {
  var keyLocation = request.params.location
  var keyLicensePlate = request.params.licenseplate
  console.log('Location: ',keyLocation);
  console.log('LicensePlate: ', keyLicensePlate);
  var viewPrivilegesOfcar = 'SELECT c.licensePlate, l.locationCode, l.locationName FROM Car c JOIN ' + '\n' + 
    'Location l ON c.stickerID = l.stickerID WHERE l.locationName LIKE' + '\n' + mySQL.escape('%' + keyLocation + '%') + '\n' +
    'AND c.licensePlate LIKE' + mySQL.escape('%' + keyLicensePlate + '%')
  con.query(viewPrivilegesOfcar, function (err, result) {
    if(err) throw err
    response.send(result)
  })
})

app.get('/allegation' ,function(request,response){
  var viewAllegation = "SELECT p.allegation AS value FROM ProblemType p"
  con.query(viewAllegation,function (err,result) {
    if(err) throw err
    response.send(result)
  })
})

app.get('/location', function (request, response) {
  var viewLocation = "SELECT l.locationName AS value FROM Location l"
  con.query(viewLocation, function (err, result) {
    if (err) throw err
    response.send(result)
  })
})


app.post('/ticket', function (request, response) {
  var keyTicketType = request.body.ticketType
  var keyCarID = request.body.carID
  console.log('TicketType: ',keyTicketType);
  console.log('CarID: ' , keyCarID);
  var createTicket = "INSERT INTO TrafficTicket(ticketType,carID) VALUES(" +  mySQL.escape(keyTicketType) +  "," + mySQL.escape(keyCarID) + ")"
  con.query(createTicket,function (err, result) {
    if (err) throw err
    response.json(result)
  })
})

