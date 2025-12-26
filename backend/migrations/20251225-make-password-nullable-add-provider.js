'use strict';

// This migration is written for Sequelize + SQLite.
// SQLite does not support ALTER COLUMN to drop NOT NULL, so we recreate the table.
// IMPORTANT: Ensure the column list below matches your actual Users table columns.
// If you have additional columns, add them to the createTable and insert SELECT lists.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1) Create new table Users_new with password allowNull: true and provider default 'local'
    await queryInterface.createTable('Users_new', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: true, // changed to allow null
      },
      googleId: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      provider: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'local', // existing users will be considered 'local'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 2) Copy data from existing Users into Users_new.
    // Note: If your Users table has additional columns, include them here in both lists.
    // Set provider = 'local' for existing users by default.
    await queryInterface.sequelize.query(`
      INSERT INTO Users_new (id, email, password, googleId, provider, createdAt, updatedAt)
      SELECT id, email, password, googleId, COALESCE(provider, 'local'), createdAt, updatedAt FROM Users;
    `);

    // 3) Drop old Users table
    await queryInterface.dropTable('Users');

    // 4) Rename Users_new -> Users
    await queryInterface.renameTable('Users_new', 'Users');
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse: recreate old Users table with password NOT NULL and without provider (if original didn't have it)
    // Adjust to your original schema as necessary. This will make password NOT NULL again.
    await queryInterface.createTable('Users_old', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false, // back to NOT NULL
      },
      googleId: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Copy rows where password is not null (can't insert null into non-null column)
    await queryInterface.sequelize.query(`
      INSERT INTO Users_old (id, email, password, googleId, createdAt, updatedAt)
      SELECT id, email, password, googleId, createdAt, updatedAt FROM Users WHERE password IS NOT NULL;
    `);

    await queryInterface.dropTable('Users');
    await queryInterface.renameTable('Users_old', 'Users');
  }
};
