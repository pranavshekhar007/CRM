const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const LoanCollection = require("../model/loanCollection.schema");
const loanCollectionController = express.Router();
const auth = require("../utils/auth");

// ✅ Create Loan
loanCollectionController.post("/create", async (req, res) => {
  try {
    const data = req.body;
    data.remainingLoan = data.loanAmount; // Initial remaining = total loan
    data.totalDueInstallments = Math.ceil(data.loanAmount / data.perDayCollection);

    const loanCreated = await LoanCollection.create(data);
    sendResponse(res, 200, "Success", {
      message: "Loan created successfully!",
      data: loanCreated,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ List Loans
loanCollectionController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      status,
      pageNo = 1,
      pageCount = 10,
      sortByField = "createdAt",
      sortByOrder = "desc",
    } = req.body;

    const query = {};
    if (status) query.status = status;
    if (searchKey) {
      query.$or = [
        { name: { $regex: searchKey, $options: "i" } },
        { phone: { $regex: searchKey, $options: "i" } },
        { referenceBy: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortOption = { [sortByField]: sortByOrder === "asc" ? 1 : -1 };

    const loanList = await LoanCollection.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await LoanCollection.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Loan list fetched successfully!",
      data: loanList,
      total: totalCount,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Loan Details by ID
loanCollectionController.get("/details/:id", async (req, res) => {
  try {
    const loan = await LoanCollection.findById(req.params.id);
    if (!loan)
      return sendResponse(res, 404, "Failed", { message: "Loan not found" });

    sendResponse(res, 200, "Success", {
      message: "Loan details fetched successfully!",
      data: loan,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Update Loan
loanCollectionController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;

    if (!id) {
      return sendResponse(res, 400, "Failed", { message: "Loan ID missing" });
    }

    // Remove fields that should not be updated directly
    const { _id, createdAt, updatedAt, ...updateData } = req.body;

    const updatedLoan = await LoanCollection.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedLoan) {
      return sendResponse(res, 404, "Failed", { message: "Loan not found" });
    }

    sendResponse(res, 200, "Success", {
      message: "Loan updated successfully!",
      data: updatedLoan,
    });
  } catch (error) {
    console.error("Update loan error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


// ✅ Delete Loan
loanCollectionController.delete("/delete/:id", async (req, res) => {
  try {
    const loan = await LoanCollection.findById(req.params.id);
    if (!loan)
      return sendResponse(res, 404, "Failed", { message: "Loan not found" });

    await LoanCollection.findByIdAndDelete(req.params.id);
    sendResponse(res, 200, "Success", {
      message: "Loan deleted successfully!",
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Add Installment API
loanCollectionController.post("/addInstallment/:id", async (req, res) => {
  try {
    const { installAmount } = req.body;
    const { id } = req.params;

    const loan = await LoanCollection.findById(id);
    if (!loan) return sendResponse(res, 404, "Failed", { message: "Loan not found" });

    // Add installment
    loan.installments.push({ installAmount });

    // Update totals
    loan.totalPaidLoan += installAmount;
    loan.remainingLoan = Math.max(loan.loanAmount - loan.totalPaidLoan, 0);
    loan.totalPaidInstallments = loan.installments.length;

    if (loan.remainingLoan <= 0) loan.status = "Closed";

    const updatedLoan = await loan.save();

    sendResponse(res, 200, "Success", {
      message: "Installment added successfully!",
      data: updatedLoan,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


// ✅ Download Loans as Excel
loanCollectionController.get("/download/excel", async (req, res) => {
  try {
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Loans");

    // Define columns
    worksheet.columns = [
      { header: "#", key: "index", width: 5 },
      { header: "Name", key: "name", width: 20 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Loan", key: "loanAmount", width: 12 },
      { header: "Given", key: "givenAmount", width: 12 },
      { header: "Per Day", key: "perDayCollection", width: 12 },
      { header: "Days", key: "daysForLoan", width: 10 },
      { header: "Due Inst.", key: "totalDueInstallments", width: 12 },
      { header: "Paid Inst.", key: "totalPaidInstallments", width: 12 },
      { header: "Paid Loan", key: "totalPaidLoan", width: 12 },
      { header: "Remaining", key: "remainingLoan", width: 12 },
      { header: "Aadhaar", key: "adharCard", width: 18 },
      { header: "PAN", key: "panCard", width: 18 },
      { header: "Reference", key: "referenceBy", width: 18 },
      { header: "Status", key: "status", width: 10 },
    ];

    // Fetch all loans
    const loans = await LoanCollection.find().lean();

    loans.forEach((loan, index) => {
      worksheet.addRow({
        index: index + 1,
        name: loan.name,
        phone: loan.phone,
        loanAmount: loan.loanAmount || 0,
        givenAmount: loan.givenAmount || 0,
        perDayCollection: loan.perDayCollection || 0,
        daysForLoan: loan.daysForLoan || "-",
        totalDueInstallments: loan.totalDueInstallments || "-",
        totalPaidInstallments: loan.totalPaidInstallments || 0,
        totalPaidLoan: loan.totalPaidLoan || 0,
        remainingLoan: loan.remainingLoan || 0,
        adharCard: loan.adharCard || "-",
        panCard: loan.panCard || "-",
        referenceBy: loan.referenceBy || "-",
        status: loan.status || "Open",
      });
    });

    // Set header styles
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };

    // Write Excel to buffer and send
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=loans.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel download error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Download Loans as PDF
loanCollectionController.get("/download/pdf", async (req, res) => {
  try {
    const PDFDocument = require("pdfkit");

    const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=loan_collection.pdf");

    // Pipe to response first
    doc.pipe(res);

    // Title
    doc.fontSize(18).font("Helvetica-Bold").text("Loan Collection Report", { align: "center" });
    doc.moveDown(1.5);

    // Fetch loans
    const loans = await LoanCollection.find().lean();

    // Define columns (same as Excel)
    const colTitles = [
      "#",
      "Name",
      "Phone",
      "Loan",
      "Given",
      "Per Day",
      "Days",
      "Due Inst.",
      "Paid Inst.",
      "Paid Loan",
      "Remaining",
      "Aadhaar",
      "PAN",
      "Reference",
      "Status",
    ];

    // Adjusted column widths to fit exactly in A4 landscape (≈ 782pt usable)
    const colWidths = [
      25, // #
      80, // Name
      70, // Phone
      53, // Loan
      40, // Given
      40, // Per Day
      30, // Days
      50, // Due Inst.
      50, // Paid Inst.
      50, // Paid Loan
      60, // Remaining
      70, // Aadhaar
      60, // PAN
      60, // Reference
      50, // Status
    ];

    const xStart = 30;
    const usableWidth = colWidths.reduce((a, b) => a + b, 0);
    let tableTop = 90;

    // Helper: draw single row
    const drawRow = (y, row, isHeader = false) => {
      let x = xStart;
      row.forEach((text, i) => {
        const width = colWidths[i];
        const height = 20;

        // Border box
        doc.rect(x, y - 5, width, height).stroke();

        if (isHeader) {
          doc.rect(x, y - 5, width, height).fill("#f0f0f0").stroke();
          doc.font("Helvetica-Bold").fontSize(8);
        } else {
          doc.font("Helvetica").fontSize(7);
        }

        // Text inside
        doc.fillColor("#000").text(String(text), x + 3, y, {
          width: width - 6,
          align: "left",
        });

        x += width;
      });
    };

    // Draw header
    drawRow(tableTop, colTitles, true);
    let y = tableTop + 23;

    // Draw table rows
    loans.forEach((loan, index) => {
      // New page if overflow
      if (y > 560) {
        doc.addPage({ margin: 30, size: "A4", layout: "landscape" });
        drawRow(50, colTitles, true);
        y = 73;
      }

      const row = [
        index + 1,
        loan.name || "-",
        loan.phone || "-",
        loan.loanAmount ?? 0,
        loan.givenAmount ?? 0,
        loan.perDayCollection ?? 0,
        loan.daysForLoan ?? "-",
        loan.totalDueInstallments ?? "-",
        loan.totalPaidInstallments ?? 0,
        loan.totalPaidLoan ?? 0,
        loan.remainingLoan ?? 0,
        loan.adharCard || "-",
        loan.panCard || "-",
        loan.referenceBy || "-",
        loan.status || "Open",
      ];

      drawRow(y, row);
      y += 20;
    });

    // Footer (optional)
    // doc.moveDown(2);
    // doc.fontSize(8).fillColor("#555").text(
    //   `Generated on: ${new Date().toLocaleString()}`,
    //   { align: "right" }
    // );

    doc.end();
  } catch (error) {
    console.error("PDF download error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


module.exports = loanCollectionController;
