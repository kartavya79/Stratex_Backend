const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true,
        trim:true
    }
    ,
    shortName:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },
    description: String,

    logo: String,

    banner: String,

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  {
    timestamps: true
  })

const schoolModel = mongoose.model('School', schoolSchema);

module.exports = schoolModel;