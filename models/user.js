const mongoose = require('mongoose');
const { environmentSchema } = require('./environment.js');

const userSchema = new mongoose.Schema({
  username: String,
  environments: [environmentSchema]
});

const User = mongoose.model('User', userSchema);

module.exports = { userSchema, User };
