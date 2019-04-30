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
  var key = request.params.licenseplate
  console.log(key);
  var viewCarInfo = 'SELECT c.licensePlate,CONCAT(co.carOwnerFirstName," ",co.carOwnerLastname) AS carOwnerName' + '\n' +
     ',co.carOwnerTel FROM CarOwners co JOIN Car c ON co.carOwnerID = c.carOwnerID ' + '\n' +
     'WHERE c.licensePlate LIKE '+ mySQL.escape('%' + key +'%')
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


app.post('/problems', function (request, response) {
  var keyScene = request.body.scene
  var keyProblemDetails = request.body.problemDetails
  console.log("Scene: ", keyScene);
  console.log("problemDetails: ", keyProblemDetails);
  var insertProblems = "INSERT INTO Problems(scene,evidenceImage,problemDetails,dateOfProblem,timeOfProblem,ticketID,problemTypeID,staffID)" + '\n' +
    "VALUES(" + mySQL.escape(keyScene) + ", null," + mySQL.escape(keyProblemDetails) + ", '2019-04-24', '18:00:00', 3, 1, 2)"
  con.query(insertProblems,function (err, result) {
    if (err) throw err
    response.json(result)
  })
})



