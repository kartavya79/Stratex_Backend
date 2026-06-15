const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true
    },
    description: String,
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    },
    duration: String,

    degreeType: {
      type: String,
      enum: [
        "UG",
        "PG",
        "Diploma",
        "PhD"
      ]
    }
},
{
    timestamps: true    

});

const programModel = mongoose.model('Program', programSchema);

module.exports = programModel;