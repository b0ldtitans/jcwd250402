"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Rooms extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Rooms.init(
    {
      name: DataTypes.STRING,
      price: DataTypes.INTEGER,
      description: DataTypes.STRING,
      maxGuestCount: DataTypes.INTEGER,
      isBooked: DataTypes.BOOLEAN,
      bathroomCount: DataTypes.INTEGER,
      totalSale: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Rooms",
    }
  );
  return Rooms;
};
