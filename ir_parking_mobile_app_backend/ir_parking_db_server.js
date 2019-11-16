const mySQL = require('mysql')
const express = require('express')
const cors = require('cors')
const body = require('body-parser')
const app = express()
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

require('dotenv').config()

app.use(cors())
app.use(body())
app.use(body.urlencoded({ extended: true }))
app.use(body.json())

let con = mySQL.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
})

con.connect(err => {
  if (err) throw err
  app.listen(process.env.PORT || 8080, () => {
    console.log('Start server at port 8080.')
  })

  // -------------------------------- login ----------------------------------------- //

  const jwt = require("jwt-simple");
  const passport = require("passport");
  const ExtractJwt = require("passport-jwt").ExtractJwt;
  const JwtStrategy = require("passport-jwt").Strategy;
  const SECRET = process.env.SECRET_KEY;

  const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromHeader("authorization"),
    secretOrKey: SECRET
  };

  const jwtAuth = new JwtStrategy(jwtOptions, (payload, done) => {
    if (payload.sub !== undefined) done(null, true);
    else done(null, false);
  });

  passport.use(jwtAuth);

  const loginMiddleWare = (request, response, next) => {
    let keyEmail = request.body.email
    
    let checkEmail = 'SELECT CONCAT(s.firstName," ",s.lastName) AS staffName FROM Staffs s JOIN Organizations o ON s.organizationID = o.organizationID' + '\n' +
    'WHERE s.staffEmail =' + mySQL.escape(keyEmail)

    con.query(checkEmail , function (err, result) {
      if (err) throw err
      if(result[0] != null){
        let cipherPassword = 'SELECT s.staffPassword FROM Staffs s WHERE s.staffEmail =' + mySQL.escape(keyEmail)

        con.query(cipherPassword, function (err, result) {
        if (err) throw err
          let hashPassword = result[0].staffPassword
          let macth = bcrypt.compareSync(request.body.password, hashPassword)
          if (macth) {

            let viewStaffInfo = 'SELECT CONCAT(s.firstName," ",s.lastName) AS staffName FROM Staffs s JOIN Organizations o ON s.organizationID = o.organizationID' + '\n' +
            'WHERE s.staffEmail =' + mySQL.escape(keyEmail) + ' AND s.staffPassword =' + mySQL.escape(hashPassword)
        
            con.query(viewStaffInfo, function (err, result) {
              if (err) throw err
              if (result[0] != null) {
                next();
              }else{
                response.json("WrongEmailOrPassword");
              }
            })
          }else{
            response.json("WrongEmailOrPassword");
          }
        })
      }else{
        response.json("WrongEmailOrPassword");
      }
    })

  };

  app.post("/authentication", loginMiddleWare, (request, response) => {
   const payload = {
      sub: request.body.email,
      iat: new Date().getTime()
   };
   let token = jwt.encode(payload, SECRET);
   response.json(token);
  });

  const requireJWTAuth = passport.authenticate("jwt", {session:false});

  app.get("/staff/:email", requireJWTAuth, (request, response) => {
    let keyEmail = request.params.email
    let viewStaffInfo = 'SELECT s.staffID ,CONCAT(s.firstName," ",s.lastName) AS staffName ,s.staffEmail , ' + '\n' +
      's.staffRole, o.organizationName, s.staffImages, s.organizationID FROM Staffs s JOIN Organizations o ON s.organizationID = o.organizationID' + '\n' +
      'WHERE s.staffEmail =' + mySQL.escape(keyEmail)

      con.query(viewStaffInfo, function (err, result) {
        if (err) throw err
        response.send(result)
      })
      
  });
  
  // -------------------------------- login ----------------------------------------- //

  app.get('/carinfo/:licenseplate/:organizationID', function (request, response) {
    let keyLicensePlate = request.params.licenseplate
    let keyorganizationID = request.params.organizationID
    let viewCarInfo = 'SELECT c.carID, c.licensePlate,CONCAT(co.carOwnerFirstName," ",co.carOwnerLastname) AS carOwnerName' + '\n' +
      ',co.carOwnerTel, co.carOwnerEmail FROM CarOwners co JOIN Car c ON co.carOwnerID = c.carOwnerID ' + '\n' +
      'WHERE c.licensePlate LIKE ' + mySQL.escape('%' + keyLicensePlate + '%') + "AND c.organizationID = " + mySQL.escape(keyorganizationID)
    con.query(viewCarInfo, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })


  app.get('/havecar/:licenseplate/:organizationID', function (request, response) {
    let keyLicensePlate = request.params.licenseplate
    let keyorganizationID = request.params.organizationID
    let checkHaveCar = 'SELECT c.licensePlate FROM Car c JOIN CarOwners co ON c.carOwnerID = co.carOwnerID' + '\n' +
      'WHERE c.licensePlate LIKE' + mySQL.escape('%' + keyLicensePlate + '%') + "AND c.organizationID = " + mySQL.escape(keyorganizationID)
    con.query(checkHaveCar, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })

  app.get('/privileges/:location/:licenseplate/:organizationID', function (request, response) {
    let keyLocation = request.params.location
    let keyLicensePlate = request.params.licenseplate
    let keyorganizationID = request.params.organizationID
    let viewPrivilegesOfcar = 'SELECT c.licensePlate, l.locationName FROM Car c JOIN ' + '\n' +
      'Location l ON c.stickerID = l.stickerID WHERE l.locationName LIKE' + mySQL.escape('%' + keyLocation + '%') + '\n' +
      'AND c.licensePlate LIKE' + mySQL.escape('%' + keyLicensePlate + '%') + 'AND c.organizationID = ' + mySQL.escape(keyorganizationID) + '\n' + 
      'AND l.organizationID = ' + mySQL.escape(keyorganizationID)
    con.query(viewPrivilegesOfcar, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })


  app.get('/checkMaxWarning/:licenseplate/:allegation/:organizationID', function (request, response) {
    let keyLicensePlate = request.params.licenseplate
    let keyAllegation = request.params.allegation
    let keyorganizationID = request.params.organizationID
    let checkMaxWarning = "SELECT c.licensePlate, COUNT(t.carID) AS NumOfTicketOfCar, i.ruleName, i.maxWarning , i.price" + '\n' +
      "FROM TrafficTicket t JOIN Problems p ON t.ticketID = p.ticketID JOIN InternalRules i ON p.ruleID = i.ruleID JOIN Car c ON t.carID = c.carID" + '\n' +
      "WHERE c.licensePlate =" + mySQL.escape(keyLicensePlate) + "AND i.ruleName =" + mySQL.escape(keyAllegation) + "AND t.ticketType = 'ใบเตือน'" + '\n' +
      "AND i.organizationID = " + mySQL.escape(keyorganizationID)
    con.query(checkMaxWarning, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })


  app.get('/allegation/:organizationID', function (request, response) {
    let keyorganizationID = request.params.organizationID
    let viewAllegation = "SELECT i.ruleName AS value FROM InternalRules i WHERE i.organizationID =" + mySQL.escape(keyorganizationID)
    con.query(viewAllegation, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })


  app.get('/allegationByID/:allegation/:organizationID', function (request, response) {
    let keyAllegation = request.params.allegation
    let keyorganizationID = request.params.organizationID
    let viewAllegationID = "SELECT i.ruleID FROM InternalRules i WHERE i.ruleName =" + mySQL.escape(keyAllegation) + '\n' +
    "AND i.organizationID =" + mySQL.escape(keyorganizationID)
    con.query(viewAllegationID, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })

  app.get('/locations/:organizationID', function (request, response) {
    let keyorganizationID = request.params.organizationID
    let viewLocations = "SELECT l.locationName AS value FROM Location l WHERE l.organizationID = " + mySQL.escape(keyorganizationID)
    con.query(viewLocations, function(err, result){
      if (err) throw err
      response.json(result)
    })
  })

  app.get('/allLocationPolygon/:organizationID', function (request, response) {
    let keyorganizationID = request.params.organizationID
    let viewAllLocationPolygon = "SELECT l.locationCode FROM Location l WHERE l.organizationID = " + mySQL.escape(keyorganizationID)
    con.query(viewAllLocationPolygon, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })

  app.get('/locationPolygon/:latitude/:organizationID', function (request, response) {
    let keyLatitude = request.params.latitude
    let keyorganizationID = request.params.organizationID
    let viewAllLocationPolygon = "SELECT l.locationName, l.locationCode FROM Location l WHERE l.locationCode LIKE " + '\n' + 
    mySQL.escape('%' + keyLatitude + '%') + "AND l.organizationID = " + mySQL.escape(keyorganizationID)
    con.query(viewAllLocationPolygon, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })

  app.post('/ticket', function (request, response) {
    let keyTicketType = request.body.ticketType
    let keyCarID = request.body.carID
    let createTicket = "INSERT INTO TrafficTicket(ticketType,carID) VALUES(" + mySQL.escape(keyTicketType) + "," + mySQL.escape(keyCarID) + ")"
    con.query(createTicket, function (err, result) {
      if (err) throw err
      response.json(result)
    })
  })


  app.get('/ticketByID', function (request, response) {
    let viewLastTicketID = "SELECT MAX(t.ticketID) AS lastTicketID FROM TrafficTicket t"
    con.query(viewLastTicketID, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })


  app.post('/guestCar', function (request, response) {
    let keyLicensePlate = request.body.licensePlate
    let keyProvince = request.body.province
    let keyCarColor = request.body.carColor
    let keyCarBrand = request.body.carBrand
    let keyCarModel = request.body.carModel
    let keyorganizationID = request.body.organizationID
    let insertGuestCar = "INSERT INTO Car(licensePlate,province,carColor,carBrand,carModel,carOwnerID,stickerID,organizationID) VALUES" + '\n' +
      "(" + mySQL.escape(keyLicensePlate) + "," + mySQL.escape(keyProvince) + "," + mySQL.escape(keyCarColor) + "," + mySQL.escape(keyCarBrand) + "," + '\n' +
      mySQL.escape(keyCarModel) + ",1,1," + mySQL.escape(keyorganizationID) +  ")"
    con.query(insertGuestCar, function (err, result) {
      if (err) throw err
      response.json(result)
    })
  })

  app.post('/problem', function (request, response) {
    let keyEvidenceImage = request.body.evidenceImage
    let keyScene = request.body.scene
    let keyProblemDetails = request.body.problemDetails
    let keyDateOfProblem = request.body.dateOfProblem
    let keyTimeOfProblem = request.body.timeOfProblem
    let keyTicketID = request.body.ticketID
    let keyProblemTypeID = request.body.problemTypeID
    let keyStaffID = request.body.staffID
    let keyorganizationID = request.body.organizationID
    let createProblem = "INSERT INTO Problems(evidenceImage,scene,problemDetails,dateOfProblem,timeOfProblem,ticketID,ruleID,staffID,organizationID) VALUES(" + '\n' +
      mySQL.escape(keyEvidenceImage) + "," + mySQL.escape(keyScene) + "," + mySQL.escape(keyProblemDetails) + "," + mySQL.escape(keyDateOfProblem) + '\n' +
      "," + mySQL.escape(keyTimeOfProblem) + "," + mySQL.escape(keyTicketID) + "," + mySQL.escape(keyProblemTypeID) + "," + mySQL.escape(keyStaffID) + "," + mySQL.escape(keyorganizationID) + ")"
    con.query(createProblem, function (err, result) {
      if (err) throw err
      response.json(result)
    })
  })

  app.post('/sendEmail', function (request, response) {
    let keyOrganizationID = request.body.organizationID
    let keyTo = request.body.to;
    let keySubject = request.body.subject;
    let keyAllegation = request.body.allegation;
    let keyProblemDetails = request.body.problemDetails;
    let keyPriceOfProblem = request.body.priceOfProblem;
    let keyScene = request.body.scene;
    let keyDate = request.body.date;
    let keyTime = request.body.time;
    let keyImageEvidence = request.body.imageEvidence;

    let organizationDetails = "SELECT o.organizationName, o.organizationEmail FROM Organizations o WHERE o.organizationID =" +  mySQL.escape(keyOrganizationID)
    con.query(organizationDetails, function (err, result) {
      if(err) throw err
      if(result[0] != null){
        let organizationName =  result[0].organizationName
        let organizationEmail = result[0].organizationEmail
        
        console.log("prepared to send email");

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          secureConnection: true,
          auth: {
            user: `${organizationEmail}`,
            pass: 'irparkingProject'
          },
          tls: {
            secureProtocol: "TLSv1_method"
          }
        });
    
        let mailOptions = {
          from: `"${organizationName}" <${organizationEmail}>`,
          to: keyTo,             
          subject: keySubject,            
          html: 
          `<h3 style="font-weight: 700">คุณกระทำความผิดข้อหา: <span style="font-weight: 200">${keyAllegation}</span></h3>` + '\n' + 
          `<h3 style="font-weight: 700">รายละเอียดข้อหาเพิ่มเติม: <span style="font-weight: 200">${keyProblemDetails}</span></h3>` + '\n' + 
          `<h3 style="font-weight: 700">ค่าปรับ: <span style="font-weight: 200">${keyPriceOfProblem}</span></h3>` + '\n' + 
          `<h3 style="font-weight: 700">สถานที่: <span style="font-weight: 200">${keyScene}</span></h3>` + '\n' + 
          `<h3 style="font-weight: 700">วัน: <span style="font-weight: 200">${keyDate}</span></h3>` + "   " + `<h3 style="font-weight: 700">เวลา: <span style="font-weight: 200">${keyTime}</span></h3>` + '\n' +
          `<h3 style="font-weight: 700">ภาพถ่ายหลักฐาน: </h5>` + '\n' + 
          `<img src="${keyImageEvidence}" width="100%" height="85%" />`
        };
    
        transporter.sendMail(mailOptions, function (err, info) {
          if(err)
            console.log(err)
          else
            response.json(info.response)
       });
      }
    })
  })

})

