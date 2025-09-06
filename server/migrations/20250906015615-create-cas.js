'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('cas', {
      ca_number: { // Matching the model's field name
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
      },
      status: { type: Sequelize.STRING, allowNull: false },
      validity: { type: Sequelize.STRING, allowNull: false },
      processNumber: { type: Sequelize.STRING, allowNull: false },
      nature: { type: Sequelize.STRING, allowNull: false },
      equipmentName: { type: Sequelize.STRING, allowNull: false },
      equipmentType: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      approvedFor: { type: Sequelize.TEXT, allowNull: false },
      restrictions: { type: Sequelize.TEXT, allowNull: true },
      observations: { type: Sequelize.TEXT, allowNull: true },
      manufacturer: { type: Sequelize.JSONB, allowNull: false },
      photos: { type: Sequelize.JSONB, allowNull: true },
      history: { type: Sequelize.JSONB, allowNull: true },
      norms: { type: Sequelize.JSONB, allowNull: true },
      markings: { type: Sequelize.TEXT, allowNull: true },
      references: { type: Sequelize.TEXT, allowNull: true },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('cas');
  }
};
