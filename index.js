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
            })
                .catch((error) => res.render("error", {error: error}));
        } else {
            res.render("error", {error: "403\nUser Unauthorized"});
        }
    });
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
            if (thesis.exists) {
                options.thesis = thesis.data();
                options.disabled = thesis.get("status") === "ACCEPTED";
            } else {
                options.thesis = {
                    status: "NOT YET SUBMITTED"
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
        let email = firebaseWrapper.getCurrentUser().email;
        firebaseWrapper.getPotentialPromoters().then(promoters => {
            let promoterList = [];
            promoters.forEach(promoter => {
                promoterList.push(promoter.data());
            });
            let options = {
                promoters: promoterList,
                thesis: {
                    status: "NOT YET SUBMITTED",
                    topicPolish: req.body.suggestedTopic.split("|")[0],
                    topicEnglish: req.body.suggestedTopic.split("|")[1],
                    language: req.body.suggestedTopic.split("|")[2]
                }
            };
            res.render("thesisDetails", options);
        });
    }
});
app.post("/student/submitThesis", urlencodedParser, (req, res) => {
    firebaseWrapper.updateThesis(
        {
            topicPolish: req.body.topicPolish,
            topicEnglish: req.body.topicEnglish,
            language: req.body.language,
            studentEmail: firebaseWrapper.getCurrentUser().email,
            promoterEmail: req.body.promoterEmail,
            goalAndScope: req.body.goalAndScope,
            initialStructure: req.body.initialStructure,
            status: "PENDING"
        }
    );

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
        language: req.body.language
    }

    firebaseWrapper.suggestThesis(promoterEmail, thesis);

    res.redirect("/promoter/thesisSuggestion");
});

/**
 * Server Activation
 */

app.listen(port, () => {
    console.log(`Thesis Topic Submitter launched on http://localhost:${port}`);
});