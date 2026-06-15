const mogoose = require('mongoose');
const specializationSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program",
      required: true
    },

    name: {
      type: String,
      required: true
    },

    description: String
  },
  {
    timestamps: true
  }
);

const specializationModel = mongoose.model('Specialization', specializationSchema);
module.exports = specializationModel;