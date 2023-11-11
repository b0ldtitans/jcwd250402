"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    // /**
    //  * Helper method for defining associations.
    //  * This method is not a part of Sequelize lifecycle.
    //  * The `models/index` file will call this method automatically.
    //  */
  }
  User.init(
    {
      fullname: DataTypes.STRING,
      gender: DataTypes.ENUM("male", "female", "other"),
      dateofbirth: DataTypes.DATE,
      username: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      phoneNumber: DataTypes.STRING,
      profilePicture: DataTypes.STRING,
      isVerified: DataTypes.BOOLEAN,
      role: DataTypes.ENUM("user", "tenant"),
      ktpImg: DataTypes.STRING,
      verifyToken: DataTypes.STRING,
      verifyTokenExpiry: DataTypes.DATE,
      resetToken: DataTypes.STRING,
      resetTokenExpiry: DataTypes.DATE,
      passwordUpdatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
