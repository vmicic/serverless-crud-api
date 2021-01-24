const mongoose = require('mongoose');

const environmentSchema = new mongoose.Schema({
  name: String,
  entities: []
});

const Environment = mongoose.model('Environment', environmentSchema);

module.exports = { environmentSchema, Environment };
