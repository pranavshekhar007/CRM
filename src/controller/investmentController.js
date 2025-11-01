const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Investment = require("../model/investment.schema");
const investmentController = express.Router();
const auth = require("../utils/auth");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");


investmentController.post("/create", async (req, res) => {
  try {
    const { name, date, amount, durationType, durationValue, description = "" } = req.body;

    if (!name || !date || !amount || !durationType || !durationValue) {
      return sendResponse(res, 422, "Failed", {
        message: "name, date, amount, durationType, and durationValue are required",
      });
    }

    const validTypes = ["Month", "Year"];
    if (!validTypes.includes(durationType)) {
      return sendResponse(res, 422, "Failed", { message: "durationType must be 'Month' or 'Year'" });
    }

    const investmentDate = new Date(date);
    if (isNaN(investmentDate.getTime())) {
      return sendResponse(res, 422, "Failed", { message: "Invalid date" });
    }

    const investment = new Investment({
      name,
      date: investmentDate,
      amount: Number(amount),
      durationType,
      durationValue: Number(durationValue),
      description,
    });

    await investment.save();

    sendResponse(res, 201, "Success", {
      message: "Investment created successfully",
      data: investment,
    });
  } catch (error) {
    console.error("Create investment error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


investmentController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      dateFrom,
      dateTo,
      pageNo = 1,
      pageCount = 10,
      sortByField = "createdAt",
      sortByOrder = -1,
    } = req.body;

    const query = {};

    // Search by name or description
    if (searchKey && searchKey.trim()) {
      query.$or = [
        { name: { $regex: searchKey.trim(), $options: "i" } },
        { description: { $regex: searchKey.trim(), $options: "i" } },
      ];
    }

    // Date range
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setHours(23, 59, 59, 999);
        query.date.$lte = dt;
      }
    }

    const skip = (Number(pageNo) - 1) * Number(pageCount);
    const limit = Number(pageCount);
    const sort = { [sortByField]: Number(sortByOrder) };

    const [investments, totalCount] = await Promise.all([
      Investment.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Investment.countDocuments(query),
    ]);

    const totalInvested = investments.reduce((sum, i) => sum + (i.amount || 0), 0);

    sendResponse(res, 200, "Success", {
      message: "Investments listed successfully",
      data: { investments, totalCount, totalInvested },
    });
  } catch (error) {
    console.error("List investment error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


investmentController.get("/summary", async (req, res) => {
  try {
    const investments = await Investment.find().lean();

    let totalInvestment = 0;
    let lastMonthInvestment = 0;
    const dailyInvestment = {};

    const now = new Date();
    const lastMonthIndex = now.getMonth() - 1;
    const correctedLastMonth = (lastMonthIndex + 12) % 12;
    const lastMonthYear = lastMonthIndex < 0 ? now.getFullYear() - 1 : now.getFullYear();

    investments.forEach((inv) => {
      const dateObj = new Date(inv.date);
      const dateKey = dateObj.toISOString().split("T")[0];
      const amount = Number(inv.amount || 0);

      totalInvestment += amount;

      if (dateObj.getMonth() === correctedLastMonth && dateObj.getFullYear() === lastMonthYear) {
        lastMonthInvestment += amount;
      }

      if (!dailyInvestment[dateKey]) dailyInvestment[dateKey] = 0;
      dailyInvestment[dateKey] += amount;
    });

    const dailyTrend = Object.entries(dailyInvestment).map(([date, amount]) => ({
      date,
      amount,
    }));

    sendResponse(res, 200, "Success", {
      message: "Investment summary calculated successfully",
      data: {
        totalInvestment,
        lastMonthInvestment,
        totalCount: investments.length,
        dailyTrend,
      },
    });
  } catch (error) {
    console.error("Investment summary error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


investmentController.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Investment.findByIdAndDelete(id);
    if (!deleted) {
      return sendResponse(res, 404, "Failed", { message: "Investment not found" });
    }
    sendResponse(res, 200, "Success", { message: "Investment deleted successfully" });
  } catch (error) {
    console.error("Delete investment error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


// ------------------------- 📘 Excel Download -------------------------
investmentController.get("/download/excel", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const query = {};
  
      if (dateFrom || dateTo) {
        query.date = {};
        if (dateFrom) {
          const df = new Date(dateFrom);
          if (!isNaN(df.getTime())) query.date.$gte = df;
        }
        if (dateTo) {
          const dt = new Date(dateTo);
          if (!isNaN(dt.getTime())) {
            dt.setHours(23, 59, 59, 999);
            query.date.$lte = dt;
          }
        }
        if (Object.keys(query.date).length === 0) delete query.date;
      }
  
      const investments = await Investment.find(query).sort({ date: 1 }).lean();
  
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Investments");
  
      worksheet.columns = [
        { header: "S.No", key: "sno", width: 10 },
        { header: "Date", key: "date", width: 15 },
        { header: "Name", key: "name", width: 25 },
        { header: "Amount", key: "amount", width: 18 },
        { header: "Duration", key: "duration", width: 20 },
        { header: "Description", key: "description", width: 40 },
      ];
  
      let totalAmount = 0;
      investments.forEach((i, index) => {
        const duration = `${i.durationValue} ${i.durationType}${i.durationValue > 1 ? "s" : ""}`;
        const row = {
          sno: index + 1,
          date: new Date(i.date).toISOString().split("T")[0],
          name: i.name,
          amount: i.amount,
          duration,
          description: i.description || "",
        };
        totalAmount += Number(i.amount || 0);
        worksheet.addRow(row);
      });
  
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 12 };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 20;
  
      // ✅ Add Total row
      const totalRow = worksheet.addRow({
        sno: "",
        date: "",
        name: "Total",
        amount: totalAmount,
        duration: "",
        description: "",
      });
      totalRow.font = { bold: true };
  
      worksheet.eachRow((row) => {
        row.alignment = { vertical: "middle", horizontal: "left" };
        row.height = 18;
      });
  
      // ✅ Set borders
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });
  
      // Send file
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=investments.xlsx");
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Investment Excel download error:", error);
      sendResponse(res, 500, "Failed", { message: error.message });
    }
  });
  
  
  
  // ------------------------- 📕 PDF Download -------------------------
  investmentController.get("/download/pdf", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const query = {};
  
      if (dateFrom || dateTo) {
        query.date = {};
        if (dateFrom) {
          const df = new Date(dateFrom);
          if (!isNaN(df.getTime())) query.date.$gte = df;
        }
        if (dateTo) {
          const dt = new Date(dateTo);
          if (!isNaN(dt.getTime())) {
            dt.setHours(23, 59, 59, 999);
            query.date.$lte = dt;
          }
        }
        if (Object.keys(query.date).length === 0) delete query.date;
      }
  
      const investments = await Investment.find(query).sort({ date: 1 }).lean();
  
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=investments.pdf");
      doc.pipe(res);
  
      // Title
      doc.fontSize(18).text("Investments Report", { align: "center", underline: true });
      doc.moveDown(1);
  
      // Table Header
      const tableTop = doc.y;
      const columnPositions = {
        sno: 50,
        date: 90,
        name: 160,
        amount: 300,
        duration: 380,
        description: 460,
      };
  
      doc.fontSize(11).font("Helvetica-Bold");
      doc.text("S.No", columnPositions.sno, tableTop);
      doc.text("Date", columnPositions.date, tableTop);
      doc.text("Name", columnPositions.name, tableTop);
      doc.text("Amount", columnPositions.amount, tableTop);
      doc.text("Duration", columnPositions.duration, tableTop);
      doc.text("Description", columnPositions.description, tableTop);
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
  
      // Table Rows
      doc.font("Helvetica").fontSize(10);
      let total = 0;
      let y = doc.y + 5;
  
      investments.forEach((i, index) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        const dateStr = new Date(i.date).toISOString().split("T")[0];
        const duration = `${i.durationValue} ${i.durationType}${i.durationValue > 1 ? "s" : ""}`;
        doc.text(index + 1, columnPositions.sno, y);
        doc.text(dateStr, columnPositions.date, y);
        doc.text(i.name, columnPositions.name, y, { width: 130 });
        doc.text(`${Number(i.amount || 0).toLocaleString()}`, columnPositions.amount, y, {
          width: 60,
          align: "right",
        });
        doc.text(duration, columnPositions.duration, y, { width: 60 });
        doc.text(i.description || "-", columnPositions.description, y, { width: 120 });
  
        total += Number(i.amount || 0);
        y += 18;
      });
  
      // Draw line before total
      doc.moveTo(40, y).lineTo(550, y).stroke();
  
      // ✅ Total Row
      doc.font("Helvetica-Bold").fontSize(12);
      doc.text("Total", columnPositions.name, y + 5);
      doc.text(`${total.toLocaleString()}`, columnPositions.amount, y + 5, {
        width: 60,
        align: "right",
      });
  
      doc.end();
    } catch (error) {
      console.error("Investment PDF download error:", error);
      sendResponse(res, 500, "Failed", { message: error.message });
    }
  });
  

module.exports = investmentController;
