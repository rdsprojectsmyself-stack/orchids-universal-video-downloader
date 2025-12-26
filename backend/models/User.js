const { DataTypes } = require('sequelize');
const sequelize = require('../db'); // adjust path if your sequelize instance is elsewhere

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  // email unique identifier
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },

  // Password is now nullable: Google sign-in users will have password = null
  password: {
    type: DataTypes.STRING,
    allowNull: true, // <-- changed from false to true
  },

  // Optional field to store Google sub/id if your flow uses it.
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },

  // provider indicates how the user signed up: 'local' or 'google'
  provider: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'local', // existing users will be local by default
    validate: {
      isIn: [['local', 'google']],
    },
  },

  // timestamps are handled by Sequelize by default unless configured otherwise
}, {
  tableName: 'Users', // ensure this matches the table name used by your migrations/db
  underscored: false,
});

module.exports = User;
