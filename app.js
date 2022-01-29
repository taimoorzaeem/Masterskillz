const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const { NULL } = require("mysql/lib/protocol/constants/types");
const _ = require("lodash");
const { result } = require("lodash");
var successfulLogin = false;
var activeUserID = -1
const app = express();
var config = require("config.js");
coursesArray = []

app.set('view engine', 'ejs');;
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }))

let connection = mysql.createConnection(config.get("MySQL"));

connection.connect(function (err) {
    if (err) {
        return console.error('error: ' + err.message);
    }

    console.log('Connected to the MySQL server.');
});


app.get("/", (req, res) => {
    activeUserID = -1
    successfulLogin = false
    res.render("homepage");
});

app.get("/about", (req, res) => {
    res.render("about");
})

app.get("/userPage", (req, res) => {
    var query = "SELECT * FROM students WHERE student_id = " + mysql.escape(activeUserID);
    var query2 = "SELECT * FROM enrollments e JOIN courses c ON e.course_id = c.course_id WHERE e.student_id = " + mysql.escape(activeUserID)
    var query3 = "SELECT * FROM certificates c JOIN courses m ON c.course_id = m.course_id WHERE c.student_id =" + mysql.escape(activeUserID)
    var userData = {};
    let activeUserName;
    if (successfulLogin) {
        connection.query(query, (err, result) => {
            console.log(result);
            activeUserName = result[0].first_name
            console.log("This is user name: ", activeUserName)
            connection.query(query2, (err,result)=>{
                connection.query(query3, (err, output)=>{
                res.render("userPage", { name: activeUserName, enrollsArray: result, cArray : output });
                })
            })
            if (err) {
                res.redirect("/");
            }
        })

    }
    else {
        res.redirect("/");
    }
})

app.get("/teacherPage", (req, res) => {
    var query = "SELECT * FROM instructors WHERE instructor_id = " + mysql.escape(activeUserID);
    var userData = {};
    let activeUserName;
    if (successfulLogin) {
        connection.query(query, (err, result) => {
            console.log(result);
            activeUserName = result[0].first_name
            console.log("This is user name: ", activeUserName)

            res.render("teacherPage", { name: activeUserName });


            if (err) {
                res.redirect("/");
            }
        })

    }
    else {
        res.redirect("/");
    }
})

app.get("/certificate/:courseID", (req, res) => {
    let certificatedCourse = req.params.courseID;
    SQLquery = "select enrollments.course_id,enrollments.student_id,enrollments.date,courses.cname,courses.instructor_id,instructors.first_name as ifn,instructors.last_name as iln,students.first_name,students.last_name from enrollments join courses join students join instructors on enrollments.course_id = courses.course_id AND enrollments.student_id = students.student_id AND courses.instructor_id = instructors.instructor_id WHERE enrollments.course_id = " + mysql.escape(certificatedCourse) + "AND enrollments.student_id = " + mysql.escape(activeUserID);
    connection.query(SQLquery,(err,result)=>{
        if (err){
            console.log(err);
        }
        else{
            console.log(result);
            // connection.query("INSERT INTO certificates(student_id,course_id) VALUES (?,?)",  [activeUserID,certificatedCourse])
            res.render("certificate", {
                firstName : result[0].first_name,
                secondName : result[0].last_name,
                courseName : result[0].cname,
                instructorName : result[0].ifn + " " + result[0].iln,
                issuedDate : result[0].date
            })
            checkQuery = "SELECT student_id,course_id FROM certificates";
            connection.query(checkQuery,(err,result)=>{
                check = false;
                for(i=0; i < result.length; i++){
                    if (result[i].student_id == activeUserID && result[i].course_id == certificatedCourse){
                        check = true;
                    }
                }
                if (check){
                    console.log("Already certified.");
                }
                else{ 
                    connection.query("INSERT INTO certificates(student_id,course_id) VALUES (?,?)", [activeUserID, certificatedCourse]);
                }
        })}
    })
})

app.get("/course", (req, res) => {
    SQLquery = "SELECT * from courses JOIN instructors ON courses.instructor_id = instructors.instructor_id";
    connection.query(SQLquery, (err, result) => {
        if (err) {
            console.log(err);
        }
        else {
            // console.log(result);
            res.render("course", { coursesArray: result })
        }
    })
})

app.get("/content/:courseID", (req, res) => {
    let activeCourseId = req.params.courseID;
    console.log("The active course id is: ", activeCourseId)
    SQLquery = "SELECT * FROM courses WHERE course_id = " + mysql.escape(activeCourseId);
    connection.query(SQLquery, (err, result) => {
        if (err) {
            res.render("/course");
        }
        else {
            console.log("Last check of this is : \n");
            console.log(result);
            res.render("content", { courseName: result[0].cname,
                videoLink: result[0].video_link,
                courseDescription: result[0].course_description,
                course_id: activeCourseId
            }) 
            checkQuery = "SELECT student_id,course_id FROM enrollments";
            connection.query(checkQuery,(err,result)=>{
                check = false;
                for(i=0; i < result.length; i++){
                    if (result[i].student_id == activeUserID && result[i].course_id == activeCourseId){
                        check = true;
                    }
                }
                if (check){
                    console.log("Already enrolled.");
                }
                else{ 
                    connection.query("INSERT INTO enrollments(student_id,course_id) VALUES (?,?)", [activeUserID, activeCourseId]);
                }
            })
        }
    })
})

app.post("/teacherRegister", (req, res) => {
    var fname = req.body.teacherfName
    var lname = req.body.teacherlName
    var email = req.body.teacheremail
    var pwd = req.body.teacherpwd;

    connection.query("Insert into instructors (first_name, last_name, email, password) values (?,?,?,?) ", [fname, lname, email, pwd], (err, result) => {
        if (err) {
            console.log("Not inserted")
            res.redirect("/")
        }
        else {
            console.log("Inserted User");
            res.redirect("/")
        }
    })
});

app.post("/studentRegister", (req, res) => {
    console.log(req.body);
    var sfname = req.body.fName;
    var slname = req.body.lName;
    var semail = req.body.email;
    var spwd = req.body.password;

    connection.query("Insert into students (first_name, last_name, email, password) values (?,?,?,?) ", [sfname, slname, semail, spwd], (err, result) => {
        if (err) {
            console.log("Not inserted Student")
            console.log(err);
            res.redirect("/")
        }
        else {
            console.log("Inserted Student");
            res.redirect("/")
        }
    })
})

app.post("/studentLogin", (req, res) => {
    console.log(req.body);
    var userEmail = req.body.studentLoginEmail
    var userPwd = req.body.studentLoginPwd

    var query = "SELECT * From students where email = " + mysql.escape(userEmail) + " AND password = " + mysql.escape(userPwd)

    connection.query(query, (err, result) => {
        console.log(result);
        if (err) {
            res.redirect("/")
        }
        else if (result[0] == null) {
            res.redirect("/")
        }
        else {
            activeUserID = result[0].student_id
            console.log("The active user id = " + activeUserID);
            successfulLogin = true;
            res.redirect("/userPage")
        }
    })
});

app.post("/teacherLogin", (req, res) => {
    console.log(req.body);
    var userEmail = req.body.teacherLoginEmail
    var userPwd = req.body.teacherLoginPwd

    var query = "SELECT * From instructors where email = " + mysql.escape(userEmail) + " AND password = " + mysql.escape(userPwd)

    connection.query(query, (err, result) => {
        console.log(result);
        if (err) {
            res.redirect("/")
        }
        else if (result[0] == null) {
            res.redirect("/")
        }
        else {
            activeUserID = result[0].instructor_id
            console.log("The active user id = " + activeUserID);
            successfulLogin = true;
            res.redirect("/teacherPage")
        }
    })
})

app.get("/addCourse", (req, res) => {
    res.render("addCourse");
})

app.post("/addCourse", (req, res) => {
    console.log(req.body)
    courseName = req.body.courseName
    categoryTitle = req.body.categoryTitle
    videoLink = req.body.videoLink
    courseDescription = req.body.courseDescription

    console.log("The active user id here is: " + activeUserID)

    SQLquery = "INSERT INTO courses (cname,category,instructor_id,video_link,course_description) VALUES (?,?,?,?,?)";

    connection.query(SQLquery, [courseName, categoryTitle, activeUserID, videoLink, courseDescription], (err, result) => {
        if (err) {
            console.log("Course not inserted");
            console.log(err)
            res.redirect("/addCourse");
        }
        else {
            console.log("Course Inserted.");
            res.redirect("/teacherPage")
        }
    })
})



app.listen(3000);