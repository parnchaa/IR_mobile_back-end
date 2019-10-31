const mySQL = require('mysql')
const express = require('express')
const cors = require('cors')
const body = require('body-parser')
const app = express()
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

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
  app.listen(8080, () => {
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
      's.staffRole, o.organizationName, s.staffImages FROM Staffs s JOIN Organizations o ON s.organizationID = o.organizationID' + '\n' +
      'WHERE s.staffEmail =' + mySQL.escape(keyEmail)

      con.query(viewStaffInfo, function (err, result) {
        if (err) throw err
        response.send(result)
      })
      
  });
  
  // -------------------------------- login ----------------------------------------- //

  app.get('/carinfo/:licenseplate', function (request, response) {
    let keyLicensePlate = request.params.licenseplate
    let viewCarInfo = 'SELECT c.carID, c.licensePlate,CONCAT(co.carOwnerFirstName," ",co.carOwnerLastname) AS carOwnerName' + '\n' +
      ',co.carOwnerTel, co.carOwnerEmail FROM CarOwners co JOIN Car c ON co.carOwnerID = c.carOwnerID ' + '\n' +
      'WHERE c.licensePlate LIKE ' + mySQL.escape('%' + keyLicensePlate + '%')
    con.query(viewCarInfo, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })


  app.get('/havecar/:licenseplate', function (request, response) {
    let keyLicensePlate = request.params.licenseplate
    let checkHaveCar = 'SELECT c.licensePlate FROM Car c JOIN CarOwners co ON c.carOwnerID = co.carOwnerID' + '\n' +
      'WHERE c.licensePlate LIKE' + mySQL.escape('%' + keyLicensePlate + '%')
    con.query(checkHaveCar, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })

  app.get('/privileges/:location/:licenseplate', function (request, response) {
    let keyLocation = request.params.location
    let keyLicensePlate = request.params.licenseplate
    let viewPrivilegesOfcar = 'SELECT c.licensePlate, l.locationName FROM Car c JOIN ' + '\n' +
      'Location l ON c.stickerID = l.stickerID WHERE l.locationName LIKE' + mySQL.escape('%' + keyLocation + '%') + '\n' +
      'AND c.licensePlate LIKE' + mySQL.escape('%' + keyLicensePlate + '%')
    con.query(viewPrivilegesOfcar, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })


  app.get('/checkMaxWarning/:licenseplate/:allegation', function (request, response) {
    let keyLicensePlate = request.params.licenseplate
    let keyAllegation = request.params.allegation
    let checkMaxWarning = "SELECT c.licensePlate, COUNT(t.carID) AS NumOfTicketOfCar, pt.allegation, i.maxWarning , i.price" + '\n' +
      "FROM TrafficTicket t JOIN Problems p ON t.ticketID = p.ticketID JOIN ProblemType pt ON p.problemTypeID = pt.problemTypeID" + '\n' +
      "JOIN InternalRules i ON pt.problemTypeID = i.problemTypeID JOIN Car c ON t.carID = c.carID" + '\n' +
      "WHERE c.licensePlate =" + mySQL.escape(keyLicensePlate) + "AND pt.allegation =" + mySQL.escape(keyAllegation) + "AND t.ticketType = 'ใบเตือน'"
    con.query(checkMaxWarning, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })


  app.get('/allegation', function (request, response) {
    let viewAllegation = "SELECT p.allegation AS value FROM ProblemType p"
    con.query(viewAllegation, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })


  app.get('/allegationByID/:allegation', function (request, response) {
    let keyAllegation = request.params.allegation
    let viewAllegationID = "SELECT p.problemTypeID FROM ProblemType p WHERE p.allegation =" + mySQL.escape(keyAllegation)
    con.query(viewAllegationID, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })

  app.get('/allLocationPolygon', function (request, response) {
    let viewAllLocationPolygon = "SELECT l.locationCode FROM Location l"
    con.query(viewAllLocationPolygon, function (err, result) {
      if (err) throw err
      response.send(result)
    })
  })

  app.get('/locationPolygon/:latitude', function (request, response) {
    let keyLatitude = request.params.latitude
    let viewAllLocationPolygon = "SELECT l.locationName, l.locationCode FROM Location l WHERE l.locationCode LIKE " + '\n' + 
    mySQL.escape('%' + keyLatitude + '%')
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
    let insertGuestCar = "INSERT INTO Car(licensePlate,province,carColor,carBrand,carModel,carOwnerID,stickerID) VALUES" + '\n' +
      "(" + mySQL.escape(keyLicensePlate) + "," + mySQL.escape(keyProvince) + "," + mySQL.escape(keyCarColor) + "," + mySQL.escape(keyCarBrand) + "," + '\n' +
      mySQL.escape(keyCarModel) + ",1,1)"
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
    let createProblem = "INSERT INTO Problems(evidenceImage,scene,problemDetails,dateOfProblem,timeOfProblem,ticketID,problemTypeID,staffID) VALUES(" + '\n' +
      mySQL.escape(keyEvidenceImage) + "," + mySQL.escape(keyScene) + "," + mySQL.escape(keyProblemDetails) + "," + mySQL.escape(keyDateOfProblem) + '\n' +
      "," + mySQL.escape(keyTimeOfProblem) + "," + mySQL.escape(keyTicketID) + "," + mySQL.escape(keyProblemTypeID) + "," + mySQL.escape(keyStaffID) + ")"
    con.query(createProblem, function (err, result) {
      if (err) throw err
      response.json(result)
    })
  })

  app.post('/sendEmail', function (request, response) {
    // let keyFrom
    let keyTo = request.body.to;
    let keySubject = request.body.subject;
    let keyAllegation = request.body.allegation;
    let keyProblemDetails = request.body.problemDetails;
    let keyPriceOfProblem = request.body.priceOfProblem;
    let keyScene = request.body.scene;
    let keyDate = request.body.date;
    let keyTime = request.body.time;
    let keyImageEvidence = request.body.imageEvidence;
    
    console.log("prepared to send email");

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      secureConnection: true,
      auth: {
        user: 'centerirparking@gmail.com',
        pass: 'basjparn'
      },
      tls: {
        secureProtocol: "TLSv1_method"
      }
    });

    let mailOptions = {
      from: '"ฝ่ายอาคารและสถานที่ มจธ." <centerirparking@gmail.com>',
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

  })

})

