const {
  Property,
  PropertyImage,
  RoomImage,
  Category,
  PropertyRules,
  Amenity,
  PropertyCategory,
  User,
  Rooms,
} = require("../models");

exports.createProperty = async (req, res) => {
  try {
    const {
      propertyName,
      description,
      price,
      bedCount,
      bedroomCount,
      maxGuestCount,
      bathroomCount,
      propertyType,
      country,
      city,
      latitude,
      longitude,
      province,
      streetAddress,
      postalCode,
      propertyRules,
      propertyAmenities,
    } = req.body;

    const images = req.files;

    if (!images || images.length === 0) {
      return res.status(400).json({
        ok: false,
        status: 400,
        message: "Image(s) for the property are required",
      });
    }

    const imageObjects = images.map((image) => ({
      image: image.filename,
    }));

    if (!imageObjects || imageObjects.length === 0) {
      return res.status(400).json({
        ok: false,
        status: 400,
        message: "No valid images provided",
      });
    }

    const coverImage = imageObjects[0].image;

    const propertyImages = await PropertyImage.bulkCreate(imageObjects);

    const property = await Property.create(
      {
        propertyName,
        description,
        price,
        bedCount,
        bedroomCount,
        maxGuestCount,
        bathroomCount,
        coverImage: coverImage,
        userId: req.user.id,
        isActive: true,
        Categories: [
          {
            propertyType,
            country,
            city,
            province,
            longitude,
            latitude,
            streetAddress,
            postalCode,
          },
        ],
      },
      {
        include: [{ model: Category, as: "Categories" }],
      }
    );

    if (!property || !property.Categories) {
      return res.status(400).json({
        ok: false,
        status: 400,
        message: "Please fill all the fields",
      });
    }

    await Promise.all(
      propertyImages.map((image) => image.update({ propertyId: property.id }))
    );

    if (propertyRules && propertyRules.length > 0) {
      const propertyRulesObjects = propertyRules.map((rule) => ({
        rule,
        propertyId: property.id,
      }));
      await PropertyRules.bulkCreate(propertyRulesObjects);
    }

    if (propertyAmenities && propertyAmenities.length > 0) {
      const amenityObjects = propertyAmenities.map((amenity) => ({
        amenity,
        propertyId: property.id,
      }));
      await Amenity.bulkCreate(amenityObjects);
    }

    return res.status(201).json({
      ok: true,
      status: 201,
      message: "Property successfully created",
      property: {
        id: property.id,
        name: property.name,
        description: property.description,
        price: property.price,
        address: property.address,
        coverImage: property.coverImage,
        userId: property.userId,
        propertyImages,
        Categories: property.Categories,
      },
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      ok: false,
      status: 500,
      message: "Internal Server Error",
    });
  }
};

exports.editProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const tenantId = req.user.id;
    const {
      propertyName,
      description,
      price,
      bedCount,
      bedroomCount,
      maxGuestCount,
      bathroomCount,
      propertyType,
      country,
      city,
      province,
      streetAddress,
      postalCode,
      propertyRules,
      propertyAmenities,
    } = req.body;

    const existingProperty = await Property.findByPk(propertyId, {
      include: [
        {
          model: PropertyImage,
          as: "PropertyImages",
          attributes: ["id", "image"],
        },
        {
          model: Category,
          as: "Categories",
          attributes: [
            "propertyType",
            "country",
            "city",
            "province",
            "latitude",
            "longitude",
            "streetAddress",
            "postalCode",
          ],
          through: { attributes: [] },
        },
        {
          model: PropertyRules,
          as: "PropertyRules",
          attributes: ["id", "rule"],
        },
        {
          model: Amenity,
          as: "Amenities",
          attributes: ["id", "amenity"],
        },
      ],
      attributes: [
        "id",
        "propertyName",
        "description",
        "price",
        "bedCount",
        "bedroomCount",
        "maxGuestCount",
        "bathroomCount",
        "coverImage",
        "userId",
        "isActive",
      ],
    });

    console.log("PropertyId:", existingProperty.userId);
    console.log("tenant:", tenantId);

    if (existingProperty.userId !== tenantId) {
      return res.status(403).json({
        ok: false,
        status: 403,
        message: "You are not authorized to edit this property",
      });
    }

    if (!existingProperty) {
      return res.status(404).json({
        ok: false,
        status: 404,
        message: "Property not found",
      });
    }

    existingProperty.propertyName =
      propertyName || existingProperty.propertyName;
    existingProperty.description = description || existingProperty.description;
    existingProperty.price = price || existingProperty.price;
    existingProperty.bedCount = bedCount || existingProperty.bedCount;
    existingProperty.bedroomCount =
      bedroomCount || existingProperty.bedroomCount;
    existingProperty.maxGuestCount =
      maxGuestCount || existingProperty.maxGuestCount;
    existingProperty.bathroomCount =
      bathroomCount || existingProperty.bathroomCount;

    await existingProperty.save();

    const images = req.files;

    if (images && images.length > 0) {
      const newImageObjects = images.map((image) => ({
        image: image.filename,
        propertyId,
      }));

      for (const newImageObject of newImageObjects) {
        const existingImage = await PropertyImage.findOne({
          where: {
            propertyId: newImageObject.propertyId,
            image: newImageObject.image,
          },
        });

        if (existingImage) {
          await PropertyImage.destroy({
            where: {
              propertyId: newImageObject.propertyId,
              image: newImageObject.image,
            },
          });
        }
      }

      const newPropertyImages = await PropertyImage.bulkCreate(newImageObjects);
      existingProperty.propertyImages =
        existingProperty.propertyImages.concat(newPropertyImages);
    }

    if (req.body.coverImage) {
      existingProperty.coverImage = req.body.coverImage;
      await existingProperty.save();
    }

    await PropertyRules.destroy({ where: { propertyId } });
    if (propertyRules && propertyRules.length > 0) {
      const newPropertyRulesObjects = propertyRules.map((rule) => ({
        rule,
        propertyId,
      }));
      await PropertyRules.bulkCreate(newPropertyRulesObjects);
    }

    await Amenity.destroy({ where: { propertyId } });
    if (propertyAmenities && propertyAmenities.length > 0) {
      const newAmenityObjects = propertyAmenities.map((amenity) => ({
        amenity,
        propertyId,
      }));
      await Amenity.bulkCreate(newAmenityObjects);
    }

    return res.status(200).json({
      ok: true,
      status: 200,
      message: "Property successfully updated",
      property: {
        id: existingProperty.id,
        name: existingProperty.name,
        description: existingProperty.description,
        price: existingProperty.price,
        address: existingProperty.address,
        coverImage: existingProperty.coverImage,
        userId: existingProperty.userId,
        propertyImages: existingProperty.propertyImages,
        Categories: existingProperty.Categories,
      },
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      ok: false,
      status: 500,
      message: "Internal Server Error",
    });
  }
};

exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.findAll({
      include: [
        {
          model: PropertyImage,
          as: "PropertyImages",
          attributes: ["id", "image"],
        },
        {
          model: PropertyRules,
          as: "PropertyRules",
          attributes: ["id", "rule"],
        },
        {
          model: Amenity,
          as: "Amenities",
          attributes: ["id", "amenity"],
        },
        {
          model: Category,
          as: "Categories",
          attributes: [
            "propertyType",
            "country",
            "city",
            "province",
            "latitude",
            "longitude",
            "streetAddress",
            "postalCode",
          ],
          through: { attributes: [] },
        },
        {
          model: Rooms,
          include: [
            {
              model: RoomImage,
              as: "roomImages",
            },
          ],
        },
      ],
      attributes: [
        "id",
        "propertyName",
        "description",
        "price",
        "bedCount",
        "bedroomCount",
        "maxGuestCount",
        "bathroomCount",
        "coverImage",
        "userId",
        "isActive",
      ],
      where: {},
    });

    if (!properties || properties.length === 0) {
      return res.status(404).json({
        ok: false,
        status: 404,
        message: "No properties found",
      });
    }

    const formattedProperties = properties.map((property) => {
      return {
        id: property.id,
        userId: property.userId,
        name: property.propertyName,
        description: property.description,
        bedCount: property.bedCount,
        bedroomCount: property.bedroomCount,
        maxGuestCount: property.maxGuestCount,
        bathroomCount: property.bathroomCount,
        price: property.price,
        coverImage: property.coverImage,
        categories: property.Categories.map((category) => ({
          id: category.id,
          propertyType: category.propertyType,
          country: category.country,
          city: category.city,
          province: category.province,
          latitude: category.latitude,
          longitude: category.longitude,
          streetAddress: category.streetAddress,
          postalCode: category.postalCode,
        })),
        amenities: property.Amenities.map((amenity) => ({
          id: amenity.id,
          amenity: amenity.amenity,
        })),
        propertyImages: property.PropertyImages.map((image) => ({
          id: image.id,
          image: image.image,
        })),
        propertyRules: property.PropertyRules.map((rule) => ({
          id: rule.id,
          rule: rule.rule,
        })),
        rooms: property.Rooms.map((room) => ({
          id: room.id,
          name: room.roomName,
          description: room.description,
          bedCount: room.bedCount,
          bedroomCount: room.bedroomCount,
          maxGuestCount: room.maxGuestCount,
          bathroomCount: room.bathroomCount,
          price: room.price,
          propertyId: room.propertyId,
          tenantId: room.userId,
          roomImages: room.roomImages.map((image) => ({
            id: image.id,
            image: image.image,
          })),
        })),
      };
    });

    return res.status(200).json({
      ok: true,
      status: 200,
      Properties: formattedProperties,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      status: 500,
      message: "Internal Server Error",
    });
  }
};

exports.getPropertiesByUserId = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        status: 400,
        message: "Please Login",
      });
    }
    const properties = await Property.findAll({
      where: {
        userId: userId,
      },
      include: [
        {
          model: PropertyImage,
          as: "PropertyImages",
          attributes: ["id", "image"],
        },
        {
          model: PropertyRules,
          as: "PropertyRules",
          attributes: ["id", "rule"],
        },
        {
          model: Amenity,
          as: "Amenities",
          attributes: ["id", "amenity"],
        },
        {
          model: Category,
          as: "Categories",
          attributes: [
            "propertyType",
            "country",
            "city",
            "province",
            "latitude",
            "longitude",
            "streetAddress",
            "postalCode",
          ],
          through: { attributes: [] },
        },
      ],
      attributes: [
        "id",
        "propertyName",
        "description",
        "price",
        "bedCount",
        "bedroomCount",
        "maxGuestCount",
        "bathroomCount",
        "coverImage",
        "userId",
        "isActive",
      ],
    });

    if (!properties || properties.length === 0) {
      return res.status(404).json({
        ok: false,
        status: 404,
        message: "No properties found for the specified userId",
      });
    }

    const formattedProperties = properties.map((property) => {
      return {
        id: property.id,
        userId: property.userId,
        name: property.propertyName,
        description: property.description,
        bedCount: property.bedCount,
        bedroomCount: property.bedroomCount,
        maxGuestCount: property.maxGuestCount,
        bathroomCount: property.bathroomCount,
        price: property.price,
        coverImage: property.coverImage,
        categories: property.Categories.map((category) => ({
          id: category.id,
          propertyType: category.propertyType,
          country: category.country,
          city: category.city,
          province: category.province,
          latitude: category.latitude,
          longitude: category.longitude,
          streetAddress: category.streetAddress,
          postalCode: category.postalCode,
        })),
        amenities: property.Amenities.map((amenity) => ({
          id: amenity.id,
          amenity: amenity.amenity,
        })),
        propertyImages: property.PropertyImages.map((image) => ({
          id: image.id,
          image: image.image,
        })),
        propertyRules: property.PropertyRules.map((rule) => ({
          id: rule.id,
          rule: rule.rule,
        })),
      };
    });

    return res.status(200).json({
      ok: true,
      status: 200,
      Properties: formattedProperties,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      status: 500,
      message: "Internal Server Error",
    });
  }
};

exports.getPropertyById = async (req, res) => {
  const propertyId = req.params.id;

  try {
    const property = await Property.findOne({
      where: { id: propertyId },
      include: [
        {
          model: PropertyImage,
          as: "PropertyImages",
          attributes: ["id", "image"],
        },
        {
          model: PropertyRules,
          as: "PropertyRules",
          attributes: ["id", "rule"],
        },
        {
          model: Amenity,
          as: "Amenities",
          attributes: ["id", "amenity"],
        },
        {
          model: Category,
          as: "Categories",
          attributes: [
            "propertyType",
            "country",
            "city",
            "province",
            "latitude",
            "longitude",
            "streetAddress",
            "postalCode",
          ],
          through: { attributes: [] },
        },
        {
          model: Rooms,
          as: "Rooms",
          include: [
            {
              model: RoomImage,
              as: "roomImages",
            },
          ],
        },
        {
          model: User,
          as: "Tenant",
          attributes: [
            "id",
            "fullname",
            "username",
            "email",
            "phoneNumber",
            "profilePicture",
            "isVerified",
            "createdAt",
          ],
        },
      ],
      attributes: [
        "id",
        "propertyName",
        "description",
        "price",
        "bedCount",
        "bedroomCount",
        "maxGuestCount",
        "bathroomCount",
        "coverImage",
        "userId",
        "isActive",
        "createdAt",
      ],
    });

    if (!property) {
      return res.status(404).json({
        ok: false,
        status: 404,
        message: "Property not found 123!",
      });
    }

    const formattedProperty = {
      id: property.id,
      name: property.propertyName,
      description: property.description,
      bedCount: property.bedCount,
      bedroomCount: property.bedroomCount,
      maxGuestCount: property.maxGuestCount,
      bathroomCount: property.bathroomCount,
      price: property.price,
      coverImage: property.coverImage,
      categories: property.Categories.map((category) => ({
        id: category.id,
        propertyType: category.propertyType,
        country: category.country,
        city: category.city,
        province: category.province,
        latitude: category.latitude,
        longitude: category.longitude,
        streetAddress: category.streetAddress,
        postalCode: category.postalCode,
      })),
      amenities: property.Amenities.map((amenity) => ({
        id: amenity.id,
        amenity: amenity.amenity,
      })),
      propertyImages: property.PropertyImages.map((image) => ({
        id: image.id,
        image: image.image,
      })),
      propertyRules: property.PropertyRules.map((rule) => ({
        id: rule.id,
        rule: rule.rule,
      })),
      Rooms: property.Rooms.map((room) => ({
        id: room.id,
        name: room.roomName,
        description: room.description,
        bedCount: room.bedCount,
        bedroomCount: room.bedroomCount,
        maxGuestCount: room.maxGuestCount,
        bathroomCount: room.bathroomCount,
        price: room.price,
        propertyId: room.propertyId,
        tenantId: room.userId,
        roomImages: room.roomImages.map((image) => ({
          id: image.id,
          image: image.image,
        })),
      })),
      Owner: {
        id: property.Tenant.id,
        fullname: property.Tenant.fullname,
        username: property.Tenant.username,
        email: property.Tenant.email,
        phoneNumber: property.Tenant.phoneNumber,
        profilePicture: property.Tenant.profilePicture,
        isVerified: property.Tenant.isVerified,
        memberSince: property.Tenant.createdAt,
      },
      CreatedAt: property.createdAt,
    };

    return res.status(200).json({
      ok: true,
      status: 200,
      Property: formattedProperty,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      status: 500,
      message: "Internal Server Error",
    });
  }
};

exports.deletePropertyHandler = async (req, res) => {
  const propertyId = req.params.id;
  const tenantId = req.user.id;
  try {
    const property = await Property.findOne({
      where: { id: propertyId },
      attributes: ["id"],
    });

    if (tenantId !== property.userId) {
      return res.status(403).json({
        ok: false,
        status: 403,
        message: "You are not authorized to delete this property",
      });
    }

    if (!property) {
      return res.status(404).json({
        ok: false,
        message: "property not found",
      });
    }

    await PropertyImage.destroy({
      where: {
        propertyId: property.id,
      },
    });

    await PropertyCategory.destroy({
      where: {
        propertyId: property.id,
      },
    });

    await PropertyRules.destroy({
      where: {
        propertyId: property.id,
      },
    });

    await Amenity.destroy({
      where: {
        propertyId: property.id,
      },
    });

    await property.destroy();

    res.status(200).json({
      ok: true,
      message: "Property has been successfully deleted",
    });
  } catch (error) {
    console.error("Property deletion error:", error);
    res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
};

exports.createRoom = async (req, res) => {
  const tenantId = req.user.id;
  const propertyId = req.params.propertyId;
  const {
    roomName,
    description,
    price,
    bedCount,
    maxGuestCount,
    bathroomCount,
  } = req.body;

  try {
    const property = await Property.findByPk(propertyId);

    if (tenantId !== property.userId) {
      return res.status(403).json({
        ok: false,
        status: 403,
        message: "You are not authorized to access this property",
      });
    }

    if (!property) {
      return res.status(404).json({
        ok: false,
        status: 404,
        message: "Property not found",
      });
    }

    const images = req.files;
    console.log(images);

    if (!images || images.length === 0) {
      return res.status(400).json({
        ok: false,
        status: 400,
        message: "Image(s) for the property are required",
      });
    }

    const imageObjects = images.map((image) => ({
      image: image.filename,
    }));

    if (!imageObjects || imageObjects.length === 0) {
      return res.status(400).json({
        ok: false,
        status: 400,
        message: "No valid images provided",
      });
    }

    const roomImages = await RoomImage.bulkCreate(imageObjects);

    const room = await Rooms.create({
      roomName: roomName,
      userId: tenantId,
      description: description,
      price: price,
      bedCount: bedCount,
      maxGuestCount: maxGuestCount,
      bathroomCount: bathroomCount,
      propertyId: propertyId,
    });

    if (!room) {
      return res.status(400).json({
        ok: false,
        status: 400,
        message: "Please fill all the fields",
      });
    }

    await room.addRoomImages(roomImages);

    return res.status(201).json({
      ok: true,
      status: 201,
      message: "Room successfully created",
      room: {
        id: room.id,
        name: room.roomName,
        description: room.description,
        bedCount: room.bedCount,
        bedroomCount: room.bedroomCount,
        maxGuestCount: room.maxGuestCount,
        bathroomCount: room.bathroomCount,
        price: room.price,
        propertyId: room.propertyId,
        tenantId: room.userId,
        roomImages: roomImages,
      },
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      ok: false,
      status: 500,
      message: "Internal Server Error",
    });
  }
};

exports.getAllRoomsAndProperties = async (req, res) => {
  const userId = req.user.id;

  try {
    const properties = await Property.findAll({
      where: {
        userId: userId,
      },
      include: [
        {
          model: Rooms,
          as: "Rooms",
          include: [
            {
              model: RoomImage,
              as: "roomImages",
            },
          ],
        },
      ],
    });

    res.status(200).json({
      ok: true,
      status: 200,
      Property: properties,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
};

exports.getRoomById = async (req, res) => {
  const roomId = req.params.id;

  try {
    const room = await Rooms.findOne({
      where: {
        id: roomId,
      },
    });

    if (!room) {
      return res.status(404).json({
        ok: false,
        status: 404,
        message: "Room not found",
      });
    }

    return res.status(200).json({
      ok: true,
      status: 200,
      room: room,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
};

exports.deleteRoom = async (req, res) => {
  const roomId = req.params.roomId;
  const tenantId = req.user.id;

  try {
    const room = await Rooms.findOne({
      where: {
        id: roomId,
      },
    });

    if (!room) {
      return res.status(404).json({
        ok: false,
        status: 404,
        message: "Room not found",
      });
    }

    if (tenantId != room.userId) {
      return res.status(403).json({
        ok: false,
        status: 403,
        message: "You are not authorized to access this room",
      });
    }

    await RoomImage.destroy({
      where: {
        roomId: room.id,
      },
    });

    await room.destroy();

    return res.status(200).json({
      ok: true,
      status: 200,
      message: "Room has been successfully deleted",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
};
