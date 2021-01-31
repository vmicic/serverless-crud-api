const mongoose = require('mongoose');

const environmentSchema = new mongoose.Schema(
  {
    name: String,
    entities: [],
  },
  { strict: false },
);

const getEnvironmentModel = () => {
  let Environment;
  try {
    Environment = mongoose.model('environment');
  } catch (error) {
    Environment = mongoose.model('environment', environmentSchema);
  }
  return Environment;
};

module.exports = { getEnvironmentModel, environmentSchema };
