const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
  quantity: Number,
});

const LoanRequestSchema = new mongoose.Schema({
  items: [ItemSchema],
  borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'Structure' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Structure' },
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['pending', 'accepted', 'refused', 'closed'], default: 'pending' },
  comment: String,
});

module.exports = mongoose.model('LoanRequest', LoanRequestSchema);
