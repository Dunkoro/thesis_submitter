// index.js

/**
 * Required External Modules
 */

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const firebaseWrapper = require("./scripts/firebaseWrapper");

/**
 * App Variables
 */

const app = express();
const port = process.env.PORT || "8000";
const urlencodedParser = bodyParser.urlencoded({extended: false});

/**
 *  App Configuration
 */

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(express.static(path.join(__dirname, "public")));

/**
 * Routes Definitions
 */

app.get("/", (req, res) => {
    firebaseWrapper.signOut();
    res.render("index");
});

app.post("/login", urlencodedParser, (req, res) => {
    firebaseWrapper.signIn(req.body.email, req.body.password).then(signInResponse => {
        if (signInResponse && signInResponse.toString() !== "auth/user-not-found" && signInResponse.toString() !== "auth/wrong-password") {
            firebaseWrapper.getAdminList().then(admins => {
                admins.forEach(admin => {
                    if (admin.get("email") === req.body.email) {
                        res.redirect("/admin");
                    }
                });
                firebaseWrapper.getUser(req.body.email).then(user => {
                    if (user) {
                        if (user.get("index")) {
                            res.redirect("/student");
                        } else {
                            res.redirect("/promoter");
                        }
                    } else {
                        res.render("error", {error: "403\nUser Unauthorized"});
                    }
                }).catch((error) => res.render("error", {error: error}));
            })
        } else {
            res.render("error", {error: "403\nUser Unauthorized"});
        }
    });
});

app.get("/admin", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    res.render("admin");
});
app.get("/admin/createStudent", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    res.render("studentCreation");
});
app.post("/admin/createStudent", urlencodedParser, (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    firebaseWrapper.createStudent({
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            index: req.body.index,
            specialization: req.body.specialization,
            degreeOfStudy: req.body.degreeOfStudy,
            formOfStudy: req.body.formOfStudy,
            yearOfStudy: req.body.yearOfStudy,
            archived: false
        },
        req.body.password)
    res.redirect("/admin/createStudent");
});
app.get("/admin/createPromoter", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    res.render("promoterCreation");
});
app.post("/admin/createPromoter", urlencodedParser, (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    firebaseWrapper.createPromoter({
            email: req.body.email,
            title: req.body.title,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            archived: false
        },
        req.body.password)
    res.redirect("/admin/createPromoter");
});
app.get("/admin/archiveStudent", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    firebaseWrapper.getAllStudents().then(students => {
        let studentList = [];
        students.forEach(student => studentList.push(student.data()));
        res.render("studentArchiving", {students: studentList});
    }).catch(error => {
        console.log(error);
        res.redirect("/admin");
    });
});
app.post("/admin/archiveStudent", urlencodedParser, (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    firebaseWrapper.archiveStudent(req.body.studentEmail);
    res.redirect("/admin/archiveStudent");
});
app.get("/admin/archivePromoter", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    firebaseWrapper.getAllPromoters().then(promoters => {
        let promoterList = [];
        promoters.forEach(promoter => promoterList.push(promoter.data()));
        res.render("promoterArchiving", {promoters: promoterList});
    }).catch(error => {
        console.log(error);
        res.redirect("/admin");
    });
});
app.post("/admin/archivePromoter", urlencodedParser, (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    firebaseWrapper.archivePromoter(req.body.promoterEmail);
    res.redirect("/admin/archivePromoter");
});

app.get("/student", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    let email = firebaseWrapper.getCurrentUser().email;
    res.render("student", {email: email});
});

app.get("/student/details", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    let email = firebaseWrapper.getCurrentUser().email;
    firebaseWrapper.getUser(email).then(student => {
        if (student) {
            let options = {
                student: student.data()
            }
            res.render("studentDetails", options);
        } else {
            res.redirect("/");
        }
    }).catch((error) => console.log(error));
});
app.post("/student/details", (req, res) => {
    res.redirect("/student/details");
});
app.post("/student/updateDetails", urlencodedParser, (req, res) => {
    firebaseWrapper.updateStudentDetails(
        firebaseWrapper.getCurrentUser().email,
        {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            specialization: req.body.specialization,
            degreeOfStudy: req.body.degreeOfStudy,
            formOfStudy: req.body.formOfStudy,
            yearOfStudy: req.body.yearOfStudy
        }
    );
    res.redirect("/student/details");
});

app.get("/student/thesis", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    let email = firebaseWrapper.getCurrentUser().email;
    firebaseWrapper.getThesisByStudentEmail(email).then(thesis => {
        firebaseWrapper.getPotentialPromoters().then(promoters => {
            let promoterList = [];
            promoters.forEach(promoter => {
                promoterList.push(promoter.data());
            });
            let options = {
                promoters: promoterList
            };
            if (thesis) {
                options.thesis = thesis.data();
                options.acceptedOrDeclared = thesis.get("status") === "ACCEPTED" || thesis.get("status") === "DECLARED";
                options.accepted = thesis.get("status") === "ACCEPTED";
            } else {
                options.thesis = {
                    status: "NOT YET SUBMITTED",
                    statusDate: new Date()
                };
                options.disabled = false;
            }
            res.render("thesisDetails", options);
        });
    });
});
app.post("/student/thesis", urlencodedParser, (req, res) => {
    if (!req.body.suggestedTopic) {
        res.redirect("/student/thesis");
    } else {
        firebaseWrapper.getPotentialPromoters().then(promoters => {
            let promoterList = [];
            promoters.forEach(promoter => {
                promoterList.push(promoter.data());
            });
            let options = {
                promoters: promoterList,
                thesis: {
                    status: "NOT YET SUBMITTED",
                    statusDate: new Date(),
                    topicPolish: req.body.suggestedTopic.split("|")[0],
                    topicEnglish: req.body.suggestedTopic.split("|")[1],
                    language: req.body.suggestedTopic.split("|")[2]
                }
            };
            res.render("thesisDetails", options);
        });
    }
});
app.post("/student/suggestThesis", urlencodedParser, (req, res) => {
    firebaseWrapper.updateThesis(
        {
            topicPolish: req.body.topicPolish,
            topicEnglish: req.body.topicEnglish,
            language: req.body.language,
            studentEmail: firebaseWrapper.getCurrentUser().email,
            promoterEmail: req.body.promoterEmail,
            goalAndScope: req.body.goalAndScope,
            initialStructure: req.body.initialStructure,
            status: "PENDING",
            statusDate: new Date(),
            archived: false
        }
    );

    res.redirect("/student/thesis");
});
app.post("/student/submitThesis", urlencodedParser, (req, res) => {
    firebaseWrapper.declareThesis(firebaseWrapper.getCurrentUser().email);

    res.redirect("/student/thesis");
});

app.post("/student/suggestedTopics", urlencodedParser, (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    let email = req.body.promoterEmail;
    firebaseWrapper.getThesisSuggestionsByPromoterEmail(email)
        .then(theses => {
            let suggestedTopics = [];
            theses.forEach(thesis => {
                suggestedTopics.push(thesis.data());
            });

            res.render("suggestedTopics", {email: email, suggestedTopics: suggestedTopics});
        });
});

app.get("/promoter", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    let promoterEmail = firebaseWrapper.getCurrentUser().email;
    let options = {
        student: {},
        thesis: {}
    };
    let thesesList = [];
    firebaseWrapper.getThesesByPromoterEmail(promoterEmail).then(theses => {
        theses.forEach(thesis => {
            thesesList.push(thesis.data());
        });
        options.thesesList = thesesList;
        res.render("promoter", options);

    }).catch(error => {
        console.log(error);
        res.redirect("/");
    });
});

app.post("/promoter/studentThesis", urlencodedParser, (req, res) => {
    let studentEmail = req.body.thesesList;
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    } else if (!studentEmail) {
        res.redirect("/promoter");
    }
    let options = {};
    firebaseWrapper.getThesisByStudentEmail(studentEmail).then(thesis => {
        options.thesis = thesis.data();
        options.reviewHidden = thesis.get("status") !== "PENDING";
        firebaseWrapper.getUser(studentEmail).then(student => {
            options.student = student.data();
            res.render("studentThesisDetails", options);
        })
    })
});
app.post("/promoter/acceptThesis", urlencodedParser, (req, res) => {
    firebaseWrapper.reviewThesis(req.body.email, "ACCEPTED");

    res.redirect("/promoter");
});
app.post("/promoter/rejectThesis", urlencodedParser, (req, res) => {
    firebaseWrapper.reviewThesis(req.body.email, "REJECTED");

    res.redirect("/promoter");
});

app.get("/promoter/thesisSuggestion", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }

    res.render("thesisSuggestion");
});
app.post("/promoter/thesisSuggestion", urlencodedParser, (req, res) => {
    res.redirect("/promoter/thesisSuggestion");
});
app.post("/promoter/suggestThesis", urlencodedParser, (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }

    let promoterEmail = firebaseWrapper.getCurrentUser().email;
    let thesis = {
        topicPolish: req.body.topicPolish,
        topicEnglish: req.body.topicEnglish,
        language: req.body.language,
        promoterEmail: promoterEmail,
        studentEmail: ""
    }

    firebaseWrapper.suggestThesis(thesis);

    res.redirect("/promoter/thesisSuggestion");
});

/**
 * Server Activation
 */

app.listen(port, () => {
    console.log(`Thesis Topic Submitter launched on http://localhost:${port}`);
});