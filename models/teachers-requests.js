const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const teachersRequests= new mongoose.Schema({
    created: {
        type: Date,
        required: true,
        default: Date.now()
    },

    creator: {
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            unique: true
        },
        firstname: {
            type: String,
            required: true
        },
        lastname: {
            type: String,
            required: true
        }
    },

    requestInfo: {
        education: {
            type: String
        },
        educationPlace: {
            type: String
        },
        workExperience: {
            type: String
        },
        aboutMe: {
            type: String
        },
        canEducatePeoples: {
            type: Array,
            default: []
        },
        studyWays: {
            type: Array,
            default: []
        }
    }
});
teachersRequests.plugin(passportLocalMongoose);

module.exports = mongoose.model("teachers-requests",teachersRequests);