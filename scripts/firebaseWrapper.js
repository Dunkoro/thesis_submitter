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

function getCurrentUser() {
    return firebase.auth().currentUser;
}

async function getUser(email) {
    const students = await db.collection("students").where("email", "==", email).get();
    const promoters = await db.collection("promoters").where("email", "==", email).get();
    if (students.size === 1 || promoters.size === 1) {
        if (students.size === 1) {
            return students;
        } else {
            return promoters;
        }
    }
}

async function getPotentialPromoters() {
    return await db.collection("promoters").get();
}

async function getThesisByStudentEmail(email) {
    const theses = await db.collection("theses").where("studentEmail", "==", email).get();
    if (theses.size === 1) {
        return theses;
    }
}

async function getThesesByPromoterEmail(email) {
    return await db.collection("theses").where("promoterEmail", "==", email).get();
}

async function updateThesis(studentEmail, promoterEmail, topicPolish, topicEnglish, status) {
    let thesis = {
        studentEmail: studentEmail,
        promoterEmail: promoterEmail,
        topicEnglish: topicEnglish,
        topicPolish: topicPolish,
        status: status
    }
    return await db.collection("theses").doc(studentEmail + " " + promoterEmail).set(thesis);
}

async function reviewThesis(studentEmail, promoterEmail, status) {
    let thesis = {
        status: status
    };
    return await db.collection("theses").doc(studentEmail + " " + promoterEmail).update(thesis);
}

module.exports = {
    signIn,
    getUser,
    getCurrentUser,
    getThesisByStudentEmail,
    getThesesByPromoterEmail,
    getPotentialPromoters,
    updateThesis,
    reviewThesis
};