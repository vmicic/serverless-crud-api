const mongoose = require('mongoose');
const { environmentSchema } = require('./environment.js');

const userSchema = new mongoose.Schema({
  username: String,
  environments: [environmentSchema],
});

const getUserModel = () => {
  let User;
  try {
    User = mongoose.model('User');
  } catch (error) {
    User = mongoose.model('User', userSchema);
  }
  return User;
};

module.exports = { getUserModel };
