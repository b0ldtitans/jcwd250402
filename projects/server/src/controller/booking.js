const { ro } = require("date-fns/locale");
const { Booking, Property, User, Payment, Rooms } = require("../models");

const isPropertyAvailable = async (propertyId, startDate, endDate, roomId) => {
  const bookings = await Booking.findAll({
    where: {
      propertyId,
    },
  });

  const bookedDates = [];

  bookings.forEach((booking) => {
    if (roomId && booking.roomId !== roomId) {
      return;
    }

    const bookingStartDate = new Date(booking.startDate);
    const bookingEndDate = new Date(booking.endDate);

    const overlap =
      (bookingStartDate <= startDate && startDate <= bookingEndDate) ||
      (bookingStartDate <= endDate && endDate <= bookingEndDate) ||
      (startDate <= bookingStartDate && endDate >= bookingEndDate);

    if (overlap) {
      const dates = generateDateRange(bookingStartDate, bookingEndDate);

      dates.forEach((date) => {
        bookedDates.push(date.toISOString());
      });
    }
  });

  const selectedDates = generateDateRange(
    new Date(startDate),
    new Date(endDate)
  );

  return !selectedDates.some((date) =>
    bookedDates.includes(date.toISOString())
  );
};

exports.createBooking = async (req, res) => {
  const renterId = req.user.id;
  const {
    tenantId,
    propertyId,
    startDate,
    endDate,
    guestCount,
    totalPrice,
    roomId,
  } = req.body;

  console.log(req.body);

  try {
    if (
      !renterId ||
      !tenantId ||
      !propertyId ||
      !startDate ||
      !endDate ||
      !guestCount ||
      !totalPrice
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!startDate && !endDate) {
      return res.status(400).json({ message: "Please select a date" });
    }

    if (!guestCount) {
      return res
        .status(400)
        .json({ message: "Please enter the number of guest(s)" });
    }

    if (renterId === tenantId) {
      return res
        .status(400)
        .json({ message: "Renter and tenant cannot be the same" });
    }

    const isAvailable = await isPropertyAvailable(
      propertyId,
      startDate,
      endDate,
      roomId
    );

    if (!isAvailable) {
      return res
        .status(400)
        .json({ message: "Property is not available for the selected dates" });
    }

    const bookingData = {
      renterId,
      tenantId,
      propertyId,
      startDate,
      endDate,
      guestCount,
      totalPrice,
      status: "pending payment",
    };

    if (roomId !== undefined && roomId !== null) {
      bookingData.roomId = roomId;
    }

    const booking = await Booking.create(bookingData, {
      include: [
        { model: Property, as: "property" },
        { model: Rooms, as: "room" },
        { model: User, as: "renter" },
      ],
    });

    res.status(201).json({ message: "Booking created successfully", booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getNewBooking = async (req, res) => {
  const tenantId = req.user.id;

  try {
    const bookings = await Booking.findAll({
      include: [
        { model: Property, as: "property", attributes: ["id", "propertyName"] },
        { model: User, as: "renter", attributes: ["fullname"] },
        { model: Payment, as: "payment" },
        { model: Rooms, as: "room" }, // Include the Rooms model
      ],
      where: {
        tenantId: tenantId,
      },
    });

    res.status(200).json({ message: "Success", bookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.myBooking = async (req, res) => {
  const renterId = req.user.id;
  try {
    const bookings = await Booking.findAll({
      include: [
        { model: Property, as: "property" },
        { model: User, as: "tenant", attributes: ["id", "fullname", "email"] },
        {
          model: User,
          as: "renter",
          attributes: ["id", "fullname", "email", "phoneNumber"],
        },
        { model: Payment, as: "payment", attributes: ["id", "paymentProof"] },
      ],
      where: {
        renterId: renterId,
      },
    });

    res.status(200).json({ message: "Success", bookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const generateDateRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

exports.getBookedDates = async (req, res) => {
  const propertyId = req.params.id;
  try {
    const bookings = await Booking.findAll({
      where: {
        propertyId,
      },
    });

    const bookedDates = [];

    bookings.forEach((booking) => {
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);

      const dates = generateDateRange(startDate, endDate);

      dates.forEach((date) => {
        bookedDates.push(date.toISOString());
      });
    });

    res.status(200).json({ message: "Success", bookedDates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.cancelBooking = async (req, res) => {
  const userId = req.user.id;
  const bookingId = req.params.id;
  try {
    const booking = await Booking.findByPk(bookingId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "pending payment") {
      return res
        .status(400)
        .json({ message: "Booking is not in pending payment status" });
    }

    await booking.update({
      status: "cancelled",
      starDate: null,
      endDate: null,
    });

    res.status(200).json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.rejectBooking = async (req, res) => {
  const tenantId = req.user.id;
  const bookingId = req.params.id;
  try {
    const booking = await Booking.findByPk(bookingId);

    if (!tenantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "pending confirmation") {
      return res
        .status(400)
        .json({ message: "Booking is not in pending confirmation status" });
    }

    await booking.update({
      status: "cancelled",
      starDate: null,
      endDate: null,
    });

    res.status(200).json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.acceptBooking = async (req, res) => {
  const tenantId = req.user.id;
  const bookingId = req.params.id;
  try {
    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!tenantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (booking.status !== "pending confirmation") {
      return res
        .status(400)
        .json({ message: "Booking is not in pending confirmation status" });
    }

    await booking.update({
      status: "confirmed",
    });

    res.status(200).json({ message: "Booking accepted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.createPayment = async (req, res) => {
  const paymentProof = req.file.filename;
  const bookingId = req.params.bookingId;
  console.log(req.file);
  try {
    if (!paymentProof) {
      return res.status(400).json({ message: "Payment proof is required" });
    }
    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const payment = await Payment.create({
      bookingId,
      paymentProof: paymentProof,
      totalPrice: booking.totalPrice,
      incude: [{ model: Booking, as: "booking" }],
    });

    await booking.update({
      status: "pending confirmation",
    });

    res.status(201).json({ message: "Payment created successfully", payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getPaymentData = async (req, res) => {
  const tenantId = req.user.id;
  const bookingId = req.params.bookingId;

  try {
    const booking = await Booking.findOne({
      where: {
        id: bookingId,
      },
    });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.tenantId !== tenantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payment = await Payment.findOne({
      where: {
        id: bookingId,
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({ message: "Success", payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
