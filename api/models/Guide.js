const mongoose = require('mongoose');

const TourGuideSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  languages: { type: [String], required: true },
  places: { type: [String], required: true },
  profilePhoto: { type: String, required: true },
  idProof: { type: String, required: true }
});

const TourGuideModel = mongoose.model('Guide', TourGuideSchema);

module.exports = TourGuideModel;
