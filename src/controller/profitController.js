const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Profit = require("../model/profit.schema");
const profitController = express.Router();
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const LoanCollection = require("../model/loanCollection.schema");

// ===============================
// 📘 CREATE PROFIT ENTRY
// ===============================
profitController.post("/create", async (req, res) => {
  try {
    const { title, amount, date, description = "" } = req.body;

    if (!title || amount === undefined || !date) {
      return sendResponse(res, 422, "Failed", {
        message: "title, amount and date are required",
      });
    }

    const profitDate = new Date(date);
    if (isNaN(profitDate.getTime())) {
      return sendResponse(res, 422, "Failed", { message: "Invalid date" });
    }

    const profit = new Profit({
      title,
      amount: Number(amount),
      date: profitDate,
      description,
    });

    await profit.save();

    sendResponse(res, 201, "Success", {
      message: "Profit created successfully",
      data: profit,
    });
  } catch (error) {
    console.error("Create profit error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

profitController.post("/list", async (req, res) => {
    try {
      const {
        searchKey = "",
        dateFrom,
        dateTo,
        pageNo = 1,
        pageCount = 10,
        sortByField = "date",
        sortByOrder = -1,
      } = req.body;
  
      const query = {};
  
      // Search filter for manual profits
      if (searchKey && searchKey.trim()) {
        query.$or = [
          { title: { $regex: searchKey.trim(), $options: "i" } },
          { description: { $regex: searchKey.trim(), $options: "i" } },
        ];
      }
  
      // Date filter
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
  
      // Pagination & sort
      const skip = (Number(pageNo) - 1) * Number(pageCount);
      const limit = Number(pageCount);
      const sort = { [sortByField]: Number(sortByOrder) };
  
      // ✅ Fetch both data sources
      const [manualProfits, loans] = await Promise.all([
        Profit.find(query).sort(sort).lean(),
        LoanCollection.find().lean(),
      ]);
  
      // ✅ Transform loan profits into same format as manual profits
      const autoProfits = loans.map((loan) => ({
        _id: loan._id,
        title: `Loan Profit - ${loan.name || "N/A"}`,
        amount: (loan.loanAmount || 0) - (loan.givenAmount || 0),
        date: loan.createdAt,
        description: `Auto-generated from loan (${loan.phone || "N/A"})`,
        type: "Auto",
      }));
  
      // ✅ Add manual profits
      const manualFormatted = manualProfits.map((p) => ({
        _id: p._id,
        title: p.title,
        amount: p.amount,
        date: p.date,
        description: p.description || "",
        type: "Manual",
      }));
  
      // ✅ Combine both
      const combined = [...autoProfits, ...manualFormatted].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
  
      // ✅ Pagination on combined data
      const paginated = combined.slice(skip, skip + limit);
  
      // ✅ Calculate totals
      const totalAmount = combined.reduce((acc, f) => acc + (f.amount || 0), 0);
  
      sendResponse(res, 200, "Success", {
        message: "Combined profit list fetched successfully",
        data: {
          profits: paginated,
          totalCount: combined.length,
          totalAmount,
          pageNo: Number(pageNo),
          pageCount: Number(pageCount),
        },
      });
    } catch (error) {
      console.error("Combined profit list error:", error);
      sendResponse(res, 500, "Failed", { message: error.message });
    }
  });
  

  profitController.get("/summary", async (req, res) => {
    try {
      const [profits, loans] = await Promise.all([
        Profit.find().lean(),
        LoanCollection.find().lean(),
      ]);
  
      let totalAmount = 0;
      let lastMonthAmount = 0;
      const dailyProfit = {};
  
      const now = new Date();
      const lastMonthIndex = now.getMonth() - 1;
      const correctedLastMonth = (lastMonthIndex + 12) % 12;
      const lastMonthYear =
        lastMonthIndex < 0 ? now.getFullYear() - 1 : now.getFullYear();
  
      // ✅ 1️⃣ Manual profits
      profits.forEach((p) => {
        const dateObj = new Date(p.date || p.createdAt);
        const dateKey = dateObj.toISOString().split("T")[0];
        const amount = Number(p.amount || 0);
  
        totalAmount += amount;
  
        if (
          dateObj.getMonth() === correctedLastMonth &&
          dateObj.getFullYear() === lastMonthYear
        ) {
          lastMonthAmount += amount;
        }
  
        if (!dailyProfit[dateKey]) dailyProfit[dateKey] = 0;
        dailyProfit[dateKey] += amount;
      });
  
      // ✅ 2️⃣ Auto loan profits
      loans.forEach((loan) => {
        const dateObj = new Date(loan.createdAt);
        const dateKey = dateObj.toISOString().split("T")[0];
        const profit = (loan.loanAmount || 0) - (loan.givenAmount || 0);
  
        totalAmount += profit;
  
        if (
          dateObj.getMonth() === correctedLastMonth &&
          dateObj.getFullYear() === lastMonthYear
        ) {
          lastMonthAmount += profit;
        }
  
        if (!dailyProfit[dateKey]) dailyProfit[dateKey] = 0;
        dailyProfit[dateKey] += profit;
      });
  
      const dailyTrend = Object.entries(dailyProfit).map(([date, amount]) => ({
        date,
        amount,
      }));
  
      sendResponse(res, 200, "Success", {
        message: "Combined profit summary calculated successfully",
        data: {
          totalAmount,
          lastMonthAmount,
          totalCount: profits.length + loans.length,
          dailyTrend,
        },
      });
    } catch (error) {
      console.error("Profit summary error:", error);
      sendResponse(res, 500, "Failed", { message: error.message });
    }
  });
  

// ===============================
// ❌ DELETE PROFIT ENTRY
// ===============================
profitController.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Profit.findByIdAndDelete(id);
    if (!deleted) {
      return sendResponse(res, 404, "Failed", { message: "Profit not found" });
    }
    sendResponse(res, 200, "Success", {
      message: "Profit deleted successfully",
    });
  } catch (error) {
    console.error("Delete profit error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ===============================
// 📘 DOWNLOAD EXCEL
// ===============================
profitController.get("/download/excel", async (req, res) => {
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

    const profits = await Profit.find(query).sort({ date: 1 }).lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Profits");

    worksheet.columns = [
      { header: "S.No", key: "sno", width: 10 },
      { header: "Date", key: "date", width: 15 },
      { header: "Title", key: "title", width: 25 },
      { header: "Amount (₹)", key: "amount", width: 18 },
      { header: "Description", key: "description", width: 40 },
    ];

    let totalAmount = 0;
    profits.forEach((f, i) => {
      worksheet.addRow({
        sno: i + 1,
        date: new Date(f.date).toISOString().split("T")[0],
        title: f.title,
        amount: f.amount,
        description: f.description || "",
      });
      totalAmount += Number(f.amount || 0);
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.alignment = { horizontal: "center" };

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
    res.setHeader("Content-Disposition", "attachment; filename=profits.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Profit Excel download error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ===============================
// 📕 DOWNLOAD PDF
// ===============================
profitController.get("/download/pdf", async (req, res) => {
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

    const profits = await Profit.find(query).sort({ date: 1 }).lean();

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=profits.pdf");
    doc.pipe(res);

    doc.fontSize(18).text("Profit Report", { align: "center", underline: true });
    doc.moveDown(1);

    const col = { sno: 50, date: 90, title: 160, amount: 350, description: 430 };

    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("S.No", col.sno);
    doc.text("Date", col.date);
    doc.text("Title", col.title);
    doc.text("Amount", col.amount);
    doc.text("Description", col.description);
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    doc.font("Helvetica").fontSize(10);
    let total = 0;
    let y = doc.y + 5;

    profits.forEach((f, i) => {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }
      doc.text(i + 1, col.sno, y);
      doc.text(new Date(f.date).toISOString().split("T")[0], col.date, y);
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
    console.error("Profit PDF download error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = profitController;
