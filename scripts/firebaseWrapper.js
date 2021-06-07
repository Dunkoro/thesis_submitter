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

async function getUser(email) {
    const student = await db.collection("students").doc(email).get();
    const promoter = await db.collection("promoters").doc(email).get();
    if (student.exists || promoter.exists) {
        if (student.exists && !student.get("archived")) {
            return student;
        } else if (!promoter.get("archived")) {
            return promoter;
        }
    }
    return undefined;
}

async function updateStudentDetails(email, details) {
    return await db.collection("students").doc(email).update(details);
}

async function getPotentialPromoters() {
    return await db.collection("promoters")
        .where("archived", "==", false)
        .get();
}

async function getThesisByStudentEmail(email) {
    return await db.collection("theses").doc(email).get();
}

async function getThesesByPromoterEmail(email) {
    return await db.collection("theses")
        .where("promoterEmail", "==", email)
        .where("archived", "==", false)
        .get();
}

async function getThesisSuggestionsByPromoterEmail(email) {
    return await db
        .collection("promoters").doc(email)
        .collection("suggestedTheses")
        .get();
}

async function updateThesis(thesis) {
    await db.collection("theses").doc(thesis.studentEmail).set(thesis);
}

async function reviewThesis(studentEmail, status) {
    let thesis = {
        status: status
    };
    return await db.collection("theses").doc(studentEmail).update(thesis);
}

async function suggestThesis(promoterEmail, thesis) {
    console.log(promoterEmail, thesis);
    return await db
        .collection("promoters").doc(promoterEmail)
        .collection("suggestedTheses").doc(thesis.topicPolish + "|" + thesis.topicEnglish)
        .set(thesis);
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
            db.collection("students").doc(student.email).set(student);
        });
}

async function createPromoter(promoter, password) {
    firebase.auth().createUserWithEmailAndPassword(promoter.email, password)
        .then(() => {
            signIn("admin@pwr.edu.pl", "AdminPassword123");
            db.collection("promoters").doc(promoter.email).set(promoter);
        });

}

async function archiveStudent(email) {
    let archived = {
        archived: true
    };
    await db.collection("students").doc(email).update(archived);
    await db.collection("theses").doc(email).update(archived);
}

async function archivePromoter(email) {
    let archived = {
        archived: true
    };
    await db.collection("promoters").doc(email).update(archived);
}

module.exports = {
    signIn,
    signOut,
    getCurrentUser,
    getUser,
    updateStudentDetails,
    getThesisByStudentEmail,
    getThesesByPromoterEmail,
    getPotentialPromoters,
    getThesisSuggestionsByPromoterEmail,
    updateThesis,
    reviewThesis,
    suggestThesis,
    getAllStudents,
    getAllPromoters,
    createStudent,
    createPromoter,
    archiveStudent,
    archivePromoter
};