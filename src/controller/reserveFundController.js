const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const ReserveFund = require("../model/reserveFund.schema");
const reserveFundController = express.Router();
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

reserveFundController.post("/create", async (req, res) => {
  try {
    const { title, amount, date, description = "" } = req.body;

    if (!title || amount === undefined || !date) {
      return sendResponse(res, 422, "Failed", {
        message: "title, amount and date are required",
      });
    }

    const fundDate = new Date(date);
    if (isNaN(fundDate.getTime())) {
      return sendResponse(res, 422, "Failed", { message: "Invalid date" });
    }

    const fund = new ReserveFund({
      title,
      amount: Number(amount),
      date: fundDate,
      description,
    });

    await fund.save();

    sendResponse(res, 201, "Success", {
      message: "Reserve fund created successfully",
      data: fund,
    });
  } catch (error) {
    console.error("Create reserve fund error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

reserveFundController.post("/list", async (req, res) => {
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

    if (searchKey && searchKey.trim()) {
      query.$or = [
        { title: { $regex: searchKey.trim(), $options: "i" } },
        { description: { $regex: searchKey.trim(), $options: "i" } },
      ];
    }

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

    const skip = (Number(pageNo) - 1) * Number(pageCount);
    const limit = Number(pageCount);
    const sort = { [sortByField]: Number(sortByOrder) };

    const [funds, totalCountAgg] = await Promise.all([
      ReserveFund.find(query).sort(sort).skip(skip).limit(limit).lean(),
      ReserveFund.countDocuments(query),
    ]);

    const totalAmount = funds.reduce((acc, f) => acc + (f.amount || 0), 0);

    sendResponse(res, 200, "Success", {
      message: "Reserve funds listed successfully",
      data: {
        funds,
        totalCount: totalCountAgg,
        totalAmount,
        pageNo: Number(pageNo),
        pageCount: Number(pageCount),
      },
    });
  } catch (error) {
    console.error("List reserve fund error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

reserveFundController.get("/summary", async (req, res) => {
  try {
    const funds = await ReserveFund.find().lean();

    let totalAmount = 0;
    let lastMonthAmount = 0;
    const dailyFunds = {};

    const now = new Date();
    const lastMonthIndex = now.getMonth() - 1;
    const correctedLastMonth = (lastMonthIndex + 12) % 12;
    const lastMonthYear =
      lastMonthIndex < 0 ? now.getFullYear() - 1 : now.getFullYear();

    funds.forEach((f) => {
      const dateObj = new Date(f.date || f.createdAt);
      const dateKey = dateObj.toISOString().split("T")[0];
      const amount = Number(f.amount || 0);

      totalAmount += amount;

      if (
        dateObj.getMonth() === correctedLastMonth &&
        dateObj.getFullYear() === lastMonthYear
      ) {
        lastMonthAmount += amount;
      }

      if (!dailyFunds[dateKey]) dailyFunds[dateKey] = 0;
      dailyFunds[dateKey] += amount;
    });

    const dailyTrend = Object.entries(dailyFunds).map(([date, amount]) => ({
      date,
      amount,
    }));

    sendResponse(res, 200, "Success", {
      message: "Reserve fund summary calculated successfully",
      data: {
        totalAmount,
        lastMonthAmount,
        totalCount: funds.length,
        dailyTrend,
      },
    });
  } catch (error) {
    console.error("Reserve fund summary error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


reserveFundController.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ReserveFund.findByIdAndDelete(id);
    if (!deleted) {
      return sendResponse(res, 404, "Failed", { message: "Fund not found" });
    }
    sendResponse(res, 200, "Success", {
      message: "Reserve fund deleted successfully",
    });
  } catch (error) {
    console.error("Delete reserve fund error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

reserveFundController.get("/download/excel", async (req, res) => {
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

    const funds = await ReserveFund.find(query).sort({ date: 1 }).lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reserve Funds");

    worksheet.columns = [
      { header: "S.No", key: "sno", width: 10 },
      { header: "Date", key: "date", width: 15 },
      { header: "Title", key: "title", width: 25 },
      { header: "Amount (₹)", key: "amount", width: 18 },
      { header: "Description", key: "description", width: 40 },
    ];

    let totalAmount = 0;
    funds.forEach((f, i) => {
      const row = {
        sno: i + 1,
        date: new Date(f.date).toISOString().split("T")[0],
        title: f.title,
        amount: f.amount,
        description: f.description || "",
      };
      totalAmount += Number(f.amount || 0);
      worksheet.addRow(row);
    });

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.alignment = { horizontal: "center" };
    headerRow.height = 20;

    // Total row
    const totalRow = worksheet.addRow({
      sno: "",
      date: "",
      title: "Total",
      amount: totalAmount,
      description: "",
    });
    totalRow.font = { bold: true };

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

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=reserve_funds.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Reserve Fund Excel download error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

reserveFundController.get("/download/pdf", async (req, res) => {
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

    const funds = await ReserveFund.find(query).sort({ date: 1 }).lean();

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=reserve_funds.pdf");
    doc.pipe(res);

    doc.fontSize(18).text("Reserve Funds Report", { align: "center", underline: true });
    doc.moveDown(1);

    const top = doc.y;
    const col = { sno: 50, date: 90, title: 160, amount: 350, description: 430 };

    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("S.No", col.sno, top);
    doc.text("Date", col.date, top);
    doc.text("Title", col.title, top);
    doc.text("Amount", col.amount, top);
    doc.text("Description", col.description, top);
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    doc.font("Helvetica").fontSize(10);
    let total = 0;
    let y = doc.y + 5;

    funds.forEach((f, i) => {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }
      const dateStr = new Date(f.date).toISOString().split("T")[0];
      doc.text(i + 1, col.sno, y);
      doc.text(dateStr, col.date, y);
      doc.text(f.title, col.title, y, { width: 180 });
      doc.text(f.amount.toLocaleString(), col.amount, y, { align: "right" });
      doc.text(f.description || "-", col.description, y, { width: 120 });
      total += f.amount || 0;
      y += 18;
    });

    doc.moveTo(40, y).lineTo(550, y).stroke();
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("Total", col.title, y + 5);
    doc.text(total.toLocaleString(), col.amount, y + 5, { align: "right" });

    doc.end();
  } catch (error) {
    console.error("Reserve Fund PDF download error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = reserveFundController;
