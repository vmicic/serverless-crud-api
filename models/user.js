const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: String,
    environments: [],
    entitySchemas: {},
  },
  { strict: false },
);

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
