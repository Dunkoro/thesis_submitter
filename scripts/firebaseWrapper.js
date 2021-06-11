const firebase = require("firebase/app");
require("firebase/auth");
require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyA_UXxrcilFCcfXR-slrfser0W1cXWYWRI",
    authDomain: "thesistopicsubmitter.firebaseapp.com",
    databaseURL: "https://thesistopicsubmitter-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "thesistopicsubmitter",
    storageBucket: "thesistopicsubmitter.appspot.com",
    messagingSenderId: "886296099680",
    appId: "1:886296099680:web:6a684949c07f3044b43c05",
    measurementId: "G-BHXKRN8FN2"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function getOne(documents) {
    let document = undefined;
    if (documents.size === 1) {
        documents.forEach(doc => document = doc);
    }
    return document;
}

function signIn(email, password) {
    return firebase.auth()
        .signInWithEmailAndPassword(email, password)
        .catch(function (error) {
            let errorCode = error.code;
            let errorMessage = error.message;
            console.log(errorCode);
            console.log(errorMessage);
            return error;
        });
}

function signOut() {
    return firebase.auth().signOut();
}

function getCurrentUser() {
    return firebase.auth().currentUser;
}

async function getAdminList() {
    return await db.collection("admins").get();
}

async function getUser(email) {
    const student = getOne(await db.collection("students").where("email", "==", email).get());
    const promoter = getOne(await db.collection("promoters").where("email", "==", email).get());
    if (student || promoter) {
        if (student && !student.get("archived")) {
            return student;
        } else if (!promoter.get("archived")) {
            return promoter;
        }
    }
    return undefined;
}

async function updateStudentDetails(email, details) {
    let student = getOne(await db.collection("students").where("email", "==", email).get());
    return student.ref.update(details);
}

async function getPotentialPromoters() {
    return await db.collection("promoters")
        .where("archived", "==", false)
        .get();
}

async function getThesisByStudentEmail(email) {
    return getOne(await db.collection("suggestions").where("studentEmail", "==", email).get());
}

async function getThesesByPromoterEmail(email) {
    return await db.collection("suggestions")
        .where("promoterEmail", "==", email)
        .where("archived", "==", false)
        .get();
}

async function getThesisSuggestionsByPromoterEmail(email) {
    return await db
        .collection("suggestions")
        .where("promoterEmail", "==", email)
        .where("studentEmail", "==", "")
        .get();
}

async function updateThesis(thesis) {
    let suggestion = getOne(await db.collection("suggestions").where("studentEmail", "==", thesis.studentEmail).get());
    if (suggestion) {
        suggestion.ref.set(thesis);
    } else {
        suggestion = getOne(await db.collection("suggestions").where("promoterEmail", "==", thesis.promoterEmail).get());
        if (suggestion) {
            suggestion.ref.set(thesis, {merge: true})
        } else {
            await db.collection("suggestions").add(thesis);
        }
    }
}

async function declareThesis(studentEmail) {
    let suggestion = getOne(await db.collection("suggestions").where("studentEmail", "==", studentEmail).get());
    await db.collection("theses").add(suggestion.data());
    suggestion.ref.update(
        {
            status: "DECLARED",
            statusDate: new Date()
        });
}

async function reviewThesis(studentEmail, status) {
    let thesis = {
        status: status,
        statusDate: new Date()
    };
    console.log(studentEmail);
    return getOne(await db.collection("suggestions").where("studentEmail", "==", studentEmail).get())
        .ref.update(thesis);

}

async function suggestThesis(thesis) {
    return await db.collection("suggestions").add(thesis);
}

async function getAllStudents() {
    return await db.collection("students").where("archived", "==", false).get();
}

async function getAllPromoters() {
    return await db.collection("promoters").where("archived", "==", false).get();
}

async function createStudent(student, password) {
    firebase.auth().createUserWithEmailAndPassword(student.email, password)
        .then(() => {
            signIn("admin@pwr.edu.pl", "AdminPassword123");
            db.collection("students").add(student);
        });
}

async function createPromoter(promoter, password) {
    firebase.auth().createUserWithEmailAndPassword(promoter.email, password)
        .then(() => {
            signIn("admin@pwr.edu.pl", "AdminPassword123");
            db.collection("promoters").add(promoter);
        });

}

async function archiveStudent(email) {
    let archived = {
        archived: true
    };
    await getOne(await db.collection("students").where("email", "==", email).get())
        .ref.update(archived);
    await getOne(await db.collection("suggestions").where("studentEmail", "==", email).get())
        .ref.update(archived);
}

async function archivePromoter(email) {
    let archived = {
        archived: true
    };
    await getOne(db.collection("promoters").where("email", "==", email).get())
        .ref.update(archived);
}

module.exports = {
    signIn,
    signOut,
    getCurrentUser,
    getAdminList,
    getUser,
    updateStudentDetails,
    getThesisByStudentEmail,
    getThesesByPromoterEmail,
    getPotentialPromoters,
    getThesisSuggestionsByPromoterEmail,
    updateThesis,
    declareThesis,
    reviewThesis,
    suggestThesis,
    getAllStudents,
    getAllPromoters,
    createStudent,
    createPromoter,
    archiveStudent,
    archivePromoter
};