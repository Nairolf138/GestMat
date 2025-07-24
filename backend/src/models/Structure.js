const mongoose = require('mongoose');

const StructureSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

module.exports = mongoose.model('Structure', StructureSchema);
