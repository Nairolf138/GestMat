const mongoose = require('mongoose');

const EquipmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  totalQty: { type: Number, required: true },
  availableQty: { type: Number, required: true },
  refTech: String,
  state: String,
  location: String,
  structure: { type: mongoose.Schema.Types.ObjectId, ref: 'Structure' },
});

module.exports = mongoose.model('Equipment', EquipmentSchema);
