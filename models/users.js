const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const users = new mongoose.Schema({
    firstname: {
        type: String,
        required: true,
        unique: false
    },
    middlename: {
        type: String,
        required: true,
        unique: false
    },
    lastname: {
        type: String,
        required: true,
        unique: false
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        unique: false
    },
    accountType: {
        type: Number,
        required: true,
        unique: false,
        default: 0
    },
    created: {
        type: Date,
        required: true,
        unique: false,
        default: Date.now()
    }
});
users.plugin(passportLocalMongoose);

module.exports = mongoose.model("users",users);