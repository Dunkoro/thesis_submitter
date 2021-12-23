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
app.get("/privacyPolicy", urlencodedParser, (req, res) => {
    res.render("privacyPolicy");
});

app.get("/admin", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    firebaseWrapper.getAllTheses().then(theses => {
        firebaseWrapper.getAllStudents().then(students => {
            let thesesList = [];
            let notSubmitted = 0;
            let pendingApproval = 0;
            let accepted = 0;
            theses.forEach(thesis => {
                thesesList.push(thesis.data());
            });
            thesesList.sort((a, b) => a.status < b.status ? -1 : 1);
            students.forEach(student => {
                let studentThesis = thesesList.find(th => th.studentEmail === student.get("email"));
                if (!studentThesis) {
                    notSubmitted++;
                } else if (studentThesis.status === "PENDING") {
                    pendingApproval++;
                } else if (studentThesis.status === "ACCEPTED") {
                    accepted++;
                }
            });
            let options = {
                theses: thesesList,
                notSubmitted: notSubmitted,
                pendingApproval: pendingApproval,
                accepted: accepted
            };
            res.render("admin", options);
        });
    });
});
app.get("/admin/theses", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    firebaseWrapper.getAllTheses().then(theses => {
        let thesesList = [];
        theses.forEach(thesis => {
            thesesList.push(thesis.data());
        });
        thesesList.sort((a, b) => a.status < b.status ? -1 : 1);
        let options = {
            theses: thesesList,
        };
        res.render("adminTheses", options);
    });
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
        req.body.password);
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
        req.body.password);
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

function loadStudentWithThesis(res, email, thesis) {
        firebaseWrapper.getAllPromoters().then(promoters => {
            firebaseWrapper.getUser(email).then(student => {
                let promotersList = [];
                promoters.forEach(promoter => {
                    promotersList.push(promoter.data());
                });

                let options = {
                    student: {
                        firstName: student.get("firstName"),
                        lastName: student.get("lastName")
                    },
                    promoters: promotersList
                };
                if (thesis) {
                    options.thesis = thesis.data();
                } else {
                    options.thesis = {
                        status: "NOT YET SUBMITTED",
                        statusDate: new Date()
                    };
                }
                res.render("student", options);
            });
        });
}
app.get("/student", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    let email = firebaseWrapper.getCurrentUser().email;
    firebaseWrapper.getThesisByStudentEmail(email).then(thesis => {
        loadStudentWithThesis(res, email, thesis);
    });
});
app.get("/student/selectThesis", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    if (!req.query.topicPolish) {
        res.redirect("/student");
        return;
    }
    let email = firebaseWrapper.getCurrentUser().email;
    firebaseWrapper.getThesisByTopicPolish(req.query.topicPolish).then(thesis => {
        loadStudentWithThesis(res, email, thesis);
    });
});
app.post("/student/submitThesis", urlencodedParser, (req, res) => {
    let thesis = {
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
    };

    firebaseWrapper.updateThesis(thesis).then(a => res.redirect("/student"));
});
app.get("/student/theses", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    firebaseWrapper.getAllSuggestedTheses().then(theses => {
        firebaseWrapper.getUser(firebaseWrapper.getCurrentUser().email).then(student => {
            let thesisList = [];
            theses.forEach(ths => {
                thesisList.push(ths.data());
            });
            thesisList = thesisList.sort((a, b) =>
                !a.studentEmail
                    ? !b.studentEmail
                    ? a.promoterEmail < b.promoterEmail ? -1 : 1
                    : -1
                    : !b.studentEmail
                    ? 1
                    : a.promoterEmail < b.promoterEmail ? -1 : 1);
            let options = {
                student: {
                    firstName: student.get("firstName"),
                    lastName: student.get("lastName")
                },
                theses: thesisList
            };
            res.render("studentTheses", options);
        });
    });
});

app.get("/promoter", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    let promoterEmail = firebaseWrapper.getCurrentUser().email;
    firebaseWrapper.getUser(promoterEmail).then(promoter => {
        firebaseWrapper.getThesesByPromoterEmail(promoterEmail).then(theses => {
            let options = {
                promoter: {
                    title: promoter.get("title"),
                    firstName: promoter.get("firstName"),
                    lastName: promoter.get("lastName")
                },
                student: {},
                thesis: {}
            };
            let thesesList = [];

            theses.forEach(thesis => {
                thesesList.push(thesis.data());
            });
            options.theses = thesesList;
            res.render("promoter", options);
            }).catch(error => {
                console.log(error);
                res.redirect("/");
            });
    });
});
app.get("/promoter/acceptThesis", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    if (req.query.studentEmail) {
        firebaseWrapper.reviewThesis(req.query.studentEmail, "ACCEPTED").then(result =>
            res.redirect("/promoter"));
    } else {
        res.redirect("/promoter");
    }
});
app.get("/promoter/rejectThesis", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    if (req.query.studentEmail) {
        firebaseWrapper.reviewThesis(req.query.studentEmail, "REJECTED").then(result =>
            res.redirect("/promoter"));
    } else {
        res.redirect("/promoter");
    }
});

app.get("/promoter/suggest", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }

    let promoterEmail = firebaseWrapper.getCurrentUser().email;
    firebaseWrapper.getUser(promoterEmail).then(promoter => {
        let options = {
            promoter: {
                title: promoter.get("title"),
                firstName: promoter.get("firstName"),
                lastName: promoter.get("lastName")
            }
        };
        res.render("promoterSuggestion", options);
    });
});
app.post("/promoter/suggest", urlencodedParser, (req, res) => {
    res.redirect("/promoter/suggest");
});
app.post("/promoter/suggestThesis", urlencodedParser, (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }

    let promoterEmail = firebaseWrapper.getCurrentUser().email;
    let thesis = {
        status: "AVAILABLE",
        statusDate: new Date(),
        topicPolish: req.body.topicPolish,
        topicEnglish: req.body.topicEnglish,
        language: req.body.language,
        promoterEmail: promoterEmail,
        studentEmail: "",
        suggested: true
    };

    firebaseWrapper.suggestThesis(thesis);

    res.redirect("/promoter/suggest");
});

/**
 * Server Activation
 */
app.listen(port, () => {
    console.log(`Thesis Topic Submitter launched on http://localhost:${port}`);
});