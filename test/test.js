const assert = require('assert');
const firebaseWrapper = require("../scripts/firebaseWrapper");

describe('Firebase Wrapper', function () {
    it('Should find the student with e-mail abc@def.com', function (done) {
        firebaseWrapper.getUser("abc@def.com").then(users => {
                assert.equal(users.size, 1);
                done();
            }).catch(reason => {
                done(reason);
            });
    });
});

describe('Firebase Wrapper', function () {
    it('Should find the promoter with e-mail abcdef@gmail.com', function (done) {
        firebaseWrapper.getUser("abcdef@gmail.com").then(users => {
                assert.equal(users.size, 1);
                done();
            }).catch(reason => {
                done(reason);
            });
    });
});

describe('Firebase Wrapper', function () {
    it('Should find no user with e-mail aaa@bbb.com', function (done) {
        firebaseWrapper.getUser("aaa@bbb.com").then(users => {
                assert.strictEqual(typeof(users), "undefined");
                done();
            }).catch(reason => {
                done(reason);
            });
    });
});