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
    res.render("index", {title: "Home"});
});

app.post("/login", urlencodedParser, (req, res) => {
    firebaseWrapper.signIn(req.body.email, req.body.password)
        .then(signInResponse => {
            if (signInResponse) {
                firebaseWrapper.getUser(req.body.email)
                    .then(users => {
                        users.forEach(user => {
                            if (user) {
                                if (user.get("degree")) {
                                    res.redirect("/student");
                                } else {
                                    res.redirect("/promoter");
                                }
                            } else {
                                res.status(403);
                                res.send("User Unauthorized!");
                            }
                        });
                    })
                    .catch((error) => console.log(error));
            } else {
                res.status(403);
                res.send("User Unauthorized!");
            }
        });
});

app.get("/student", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    let email = firebaseWrapper.getCurrentUser().email;
    firebaseWrapper.getThesisByStudentEmail(email)
        .then(theses => {
            firebaseWrapper.getPotentialPromoters()
                .then(promoters => {
                    let promoterList = [];
                    promoters.forEach(promoter => {
                        promoterList.push(promoter.data());
                    });
                    let options = {
                        title: "Student",
                        promoters: promoterList
                    };
                    if (theses && theses.size === 1) {
                        theses.forEach(thesis => {
                            options.thesisTopicPolish = thesis.get("topicPolish");
                            options.thesisTopicEnglish = thesis.get("topicEnglish");
                            options.thesisStatus = thesis.get("status");
                            options.thesisDisabled = thesis.get("status") === "ACCEPTED" || thesis.get("status") === "PENDING";
                        })
                    } else {
                        options.thesisStatus = "NOT YET SUBMITTED";
                        options.thesisDisabled = false;
                    }
                    res.render("student", options);
                });
        });
});

app.get("/promoter", (req, res) => {
    if (!firebaseWrapper.getCurrentUser()) {
        res.redirect("/");
        return;
    }
    let email = firebaseWrapper.getCurrentUser().email;
    let options = {
        title: "Promoter"
    };
    let acceptedThesesList = [];
    let pendingThesesList = [];
    firebaseWrapper.getThesesByPromoterEmail(email)
        .then(theses => {
            theses.forEach(thesis => {
                if (thesis.get("status") === "ACCEPTED") {
                    acceptedThesesList.push(thesis.data());
                } else if (thesis.get("status") === "PENDING") {
                    pendingThesesList.push(thesis.data());
                }
            });
            options.acceptedThesesList = acceptedThesesList;
            options.pendingThesesList = pendingThesesList;

            res.render("promoter", options);
        });
});

app.post("/submitThesis", urlencodedParser, (req, res) => {
    firebaseWrapper.updateThesis(firebaseWrapper.getCurrentUser().email, req.body.promoter, req.body.thesisTopicPolish, req.body.thesisTopicEnglish, "PENDING");

    res.redirect("/student");
});

app.post("/reviewThesis", urlencodedParser, (req, res) => {
    let studentEmail = req.body.reviewedThesis.split(" ")[0];
    let promoterEmail = firebaseWrapper.getCurrentUser().email;
    let accept = req.body.accept;
    let reject = req.body.reject;

    if(accept) {
        firebaseWrapper.reviewThesis(studentEmail, promoterEmail, "ACCEPTED");
    } else if (reject) {
        firebaseWrapper.reviewThesis(studentEmail, promoterEmail, "REJECTED");
    } else {
        console.log("Unexpected status!");
    }

    res.redirect("/promoter");
});

/**
 * Server Activation
 */

app.listen(port, () => {
    console.log(`Thesis Topic Submitter launched on http://localhost:${port}`);
});