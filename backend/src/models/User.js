const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'responsable', 'utilisateur'], default: 'utilisateur' },
  structure: { type: mongoose.Schema.Types.ObjectId, ref: 'Structure' },
});

module.exports = mongoose.model('User', UserSchema);
