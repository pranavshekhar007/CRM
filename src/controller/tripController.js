const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Trip = require("../model/trip.schema");
const Employee = require("../model/employee.schema");
const tripController = express.Router();

tripController.post("/create", async (req, res) => {
  try {
    const { employee } = req.body;

    const employeeExists = await Employee.findById(employee);
    if (!employeeExists)
      return sendResponse(res, 400, "Failed", { message: "Invalid employee ID" });

    const createdTrip = await Trip.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Trip created successfully!",
      data: createdTrip,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

tripController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
      tripStatus,
      advanceStatus,
      reimbursementStatus,
    } = req.body;

    const query = {};
    if (tripStatus) query.tripStatus = tripStatus;
    if (advanceStatus) query.advanceStatus = advanceStatus;
    if (reimbursementStatus) query.reimbursementStatus = reimbursementStatus;
    if (searchKey) {
      query.$or = [
        { purpose: { $regex: searchKey, $options: "i" } },
        { destination: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const trips = await Trip.find(query)
      .populate("employee", "fullName email")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Trip.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Trip list retrieved successfully!",
      data: trips,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

tripController.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findById(id);
    if (!trip)
      return sendResponse(res, 404, "Failed", { message: "Trip not found" });

    const { tripStatus, advanceStatus, reimbursementStatus, ...otherFields } = req.body;

    if (tripStatus) trip.tripStatus = tripStatus;
    if (advanceStatus) trip.advanceStatus = advanceStatus;
    if (reimbursementStatus) trip.reimbursementStatus = reimbursementStatus;

    Object.assign(trip, otherFields);

    const updatedTrip = await trip.save();

    sendResponse(res, 200, "Success", {
      message: "Trip updated successfully!",
      data: updatedTrip,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

tripController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findById(id);
    if (!trip)
      return sendResponse(res, 404, "Failed", { message: "Trip not found" });

    await Trip.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Trip deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = tripController;
