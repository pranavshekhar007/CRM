const express = require("express");
const { sendResponse } = require("../utils/common");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

// Import models
const Profit = require("../model/profit.schema");
const Expense = require("../model/expense.schema");
const Investment = require("../model/investment.schema");
const ReserveFund = require("../model/reserveFund.schema");
const LoanCollection = require("../model/loanCollection.schema"); // for auto profit

const combinedController = express.Router();

/* =====================================================
   📘 API #1 — Combined List of Profit, Expense, Investment, Reserve Funds
   ===================================================== */
combinedController.post("/list", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body;

    // Common query for date filtering
    const dateQuery = {};
    if (dateFrom || dateTo) {
      dateQuery.date = {};
      if (dateFrom) dateQuery.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setHours(23, 59, 59, 999);
        dateQuery.date.$lte = dt;
      }
    }

    // Fetch all collections in parallel
    const [profits, loans, expenses, investments, reserves] = await Promise.all([
      Profit.find(dateQuery).lean(),
      LoanCollection.find({
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
                ...(dateTo
                  ? {
                      $lte: (() => {
                        const dt = new Date(dateTo);
                        dt.setHours(23, 59, 59, 999);
                        return dt;
                      })(),
                    }
                  : {}),
              },
            }
          : {}),
      }).lean(),
      Expense.find(dateQuery).lean(),
      Investment.find(dateQuery).lean(),
      ReserveFund.find(dateQuery).lean(),
    ]);

    // Combine auto profit from loans
    // const autoProfits = loans.map((loan) => ({
    //   title: `Loan Profit - ${loan.name || "N/A"}`,
    //   amount: (loan.loanAmount || 0) - (loan.givenAmount || 0),
    //   date: loan.createdAt,
    //   description: `Auto-generated from loan (${loan.phone || "N/A"})`,
    // }));

    const autoProfits = [];

    const allProfits = [...profits];

    // Calculate totals
    const totals = {
      totalProfit: allProfits.reduce((sum, p) => sum + (p.amount || 0), 0),
      totalExpense: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      totalInvestment: investments.reduce((sum, i) => sum + (i.amount || 0), 0),
      totalReserve: reserves.reduce((sum, f) => sum + (f.amount || 0), 0),
    };

    sendResponse(res, 200, "Success", {
      message: "Combined finance list fetched successfully",
      data: {
        profits: allProfits,
        expenses,
        investments,
        reserves,
        totals,
      },
    });
  } catch (error) {
    console.error("Combined list error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* =====================================================
   📗 API #2 — Combined Excel Download (Premium Styled)
   ===================================================== */
   combinedController.get("/download/excel", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const dateQuery = {};
  
      if (dateFrom || dateTo) {
        dateQuery.date = {};
        if (dateFrom) dateQuery.date.$gte = new Date(dateFrom);
        if (dateTo) {
          const dt = new Date(dateTo);
          dt.setHours(23, 59, 59, 999);
          dateQuery.date.$lte = dt;
        }
      }
  
      const [profits, loans, expenses, investments, reserves] = await Promise.all([
        Profit.find(dateQuery).lean(),
        LoanCollection.find({
          ...(dateFrom || dateTo
            ? {
                createdAt: {
                  ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
                  ...(dateTo
                    ? {
                        $lte: (() => {
                          const dt = new Date(dateTo);
                          dt.setHours(23, 59, 59, 999);
                          return dt;
                        })(),
                      }
                    : {}),
                },
              }
            : {}),
        }).lean(),        
        Expense.find(dateQuery).lean(),
        Investment.find(dateQuery).lean(),
        ReserveFund.find(dateQuery).lean(),
      ]);
  
      // const autoProfits = loans.map((loan) => ({
      //   title: `Loan Profit - ${loan.name || "N/A"}`,
      //   amount: (loan.loanAmount || 0) - (loan.givenAmount || 0),
      //   date: loan.createdAt,
      //   description: `Auto-generated from loan (${loan.phone || "N/A"})`,
      // }));
  
      const autoProfits = [];

      const allProfits = [...profits];
      const workbook = new ExcelJS.Workbook();
  
      // 📘 Universal Border & Alignment Helper
      const applyBorders = (ws) => {
        ws.eachRow({ includeEmpty: false }, (row) => {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin", color: { argb: "FFB0BEC5" } },
              left: { style: "thin", color: { argb: "FFB0BEC5" } },
              bottom: { style: "thin", color: { argb: "FFB0BEC5" } },
              right: { style: "thin", color: { argb: "FFB0BEC5" } },
            };
            cell.alignment = {
              vertical: "middle",
              horizontal: "center",
              wrapText: true,
            };
          });
        });
      };
  
      const createSectionSheet = (title, items, columns, totalField) => {
        const ws = workbook.addWorksheet(title);
  
        // ✅ First define columns before adding merged rows
        ws.columns = columns;
  
        /* ===============================
           🏢 COMPANY HEADER
           =============================== */
        ws.mergeCells(1, 1, 1, columns.length);
        const companyRow = ws.getRow(1);
        companyRow.getCell(1).value = "OM SAI ENTERPRISES";
        companyRow.height = 30;
        companyRow.alignment = { horizontal: "center", vertical: "middle" };
        companyRow.font = {
          name: "Calibri",
          size: 20,
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        companyRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0F172A" }, // Deep blue-gray
        };
  
        // 🧾 Report Title & Date
        ws.mergeCells(2, 1, 2, columns.length);
        const reportRow = ws.getRow(2);
        reportRow.getCell(1).value = `${title.toUpperCase()} REPORT`;
        reportRow.height = 22;
        reportRow.alignment = { horizontal: "center", vertical: "middle" };
        reportRow.font = {
          size: 14,
          bold: true,
          color: { argb: "FF1E293B" },
        };
  
        const dateRange =
          dateFrom && dateTo
            ? `Period: ${new Date(dateFrom).toLocaleDateString()} → ${new Date(
                dateTo
              ).toLocaleDateString()}`
            : "Full Financial Period";
  
        ws.mergeCells(3, 1, 3, columns.length);
        const dateRow = ws.getRow(3);
        dateRow.getCell(1).value = dateRange;
        dateRow.alignment = { horizontal: "center", vertical: "middle" };
        dateRow.font = { italic: true, color: { argb: "FF475569" } };
  
        ws.addRow([]);
  
        /* ===============================
           📊 TABLE HEADER
           =============================== */
        const headerRow = ws.addRow(columns.map((c) => c.header));
        headerRow.font = {
          bold: true,
          size: 12,
          color: { argb: "FFFFFFFF" },
        };
        headerRow.alignment = { horizontal: "center", vertical: "middle" };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2563EB" }, // Indigo blue
        };
        headerRow.height = 22;
  
        /* ===============================
           📅 DATA ROWS
           =============================== */
        let total = 0;
        items.forEach((item, i) => {
          const rowData = columns.map((col) => {
            if (col.key === "sno") return i + 1;
            return item[col.key] || "";
          });
          const row = ws.addRow(rowData);
          row.height = 18;
  
          // Alternate background
          if (i % 2 === 0) {
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFC" },
            };
          }
          total += Number(item[totalField] || 0);
        });
  
        ws.addRow([]);
        const totalRow = ws.addRow([
          "",
          "Total",
          "",
          total.toLocaleString(),
        ]);
        totalRow.font = { bold: true, size: 12, color: { argb: "FF000000" } };
        totalRow.alignment = { horizontal: "right", vertical: "middle" };
        totalRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE2E8F0" },
        };
        totalRow.height = 20;
  
        /* ===============================
           🎨 STYLING ADJUSTMENTS
           =============================== */
        ws.columns.forEach((col) => {
          col.width = col.width || 20;
        });
  
        // Add borders last for clean layout
        applyBorders(ws);
  
        // Add footer note
        const footer = ws.addRow([]);
        ws.mergeCells(footer.number, 1, footer.number, columns.length);
        footer.getCell(1).value = "Generated by OM SAI ENTERPRISES Financial System";
        footer.getCell(1).font = {
          italic: true,
          size: 10,
          color: { argb: "FF64748B" },
        };
        footer.getCell(1).alignment = {
          horizontal: "center",
          vertical: "middle",
        };
      };
  
      /* ===============================
         🧾 Add All Sheets
         =============================== */
      createSectionSheet(
        "Profits",
        allProfits,
        [
          { header: "S.No", key: "sno", width: 8 },
          { header: "Title", key: "title", width: 30 },
          { header: "Date", key: "date", width: 20 },
          { header: "Amount", key: "amount", width: 15 },
          { header: "Description", key: "description", width: 45 },
        ],
        "amount"
      );
  
      createSectionSheet(
        "Expenses",
        expenses,
        [
          { header: "S.No", key: "sno", width: 8 },
          { header: "Name", key: "name", width: 25 },
          { header: "Date", key: "date", width: 20 },
          { header: "Amount", key: "amount", width: 15 },
          { header: "Description", key: "description", width: 45 },
        ],
        "amount"
      );
  
      createSectionSheet(
        "Investments",
        investments,
        [
          { header: "S.No", key: "sno", width: 8 },
          { header: "Name", key: "name", width: 25 },
          { header: "Date", key: "date", width: 20 },
          { header: "Amount", key: "amount", width: 15 },
          { header: "Duration Type", key: "durationType", width: 20 },
          { header: "Duration Value", key: "durationValue", width: 18 },
          { header: "Description", key: "description", width: 45 },
        ],
        "amount"
      );
  
      createSectionSheet(
        "Reserve Funds",
        reserves,
        [
          { header: "S.No", key: "sno", width: 8 },
          { header: "Title", key: "title", width: 25 },
          { header: "Date", key: "date", width: 20 },
          { header: "Amount", key: "amount", width: 15 },
          { header: "Description", key: "description", width: 45 },
        ],
        "amount"
      );
  
      /* ===============================
         📦 SEND FILE
         =============================== */
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=OM_SAI_FINANCIAL_SUMMARY.xlsx"
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Combined Excel download error:", error);
      sendResponse(res, 500, "Failed", { message: error.message });
    }
  });
  
  
/* =====================================================
   📕 API #3 — Combined PDF Download (Professional Styled v2 + Date Filter)
   ===================================================== */
   combinedController.get("/download/pdf", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const dateQuery = {};
  
      // 🗓️ Build date filter for all models that use 'date' field
      if (dateFrom || dateTo) {
        dateQuery.date = {};
        if (dateFrom) dateQuery.date.$gte = new Date(dateFrom);
        if (dateTo) {
          const dt = new Date(dateTo);
          dt.setHours(23, 59, 59, 999);
          dateQuery.date.$lte = dt;
        }
      }
  
      // 🧩 Apply date filter to LoanCollection (using createdAt)
      const loanDateFilter =
        dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
                ...(dateTo
                  ? {
                      $lte: (() => {
                        const dt = new Date(dateTo);
                        dt.setHours(23, 59, 59, 999);
                        return dt;
                      })(),
                    }
                  : {}),
              },
            }
          : {};
  
      // ✅ Fetch all collections with date filtering
      const [profits, loans, expenses, investments, reserves] = await Promise.all([
        Profit.find(dateQuery).lean(),
        LoanCollection.find(loanDateFilter).lean(),
        Expense.find(dateQuery).lean(),
        Investment.find(dateQuery).lean(),
        ReserveFund.find(dateQuery).lean(),
      ]);
  
      // 🧮 Generate Auto Profits from loans
      // const autoProfits = loans.map((loan) => ({
      //   title: `Loan Profit - ${loan.name || "N/A"}`,
      //   amount: (loan.loanAmount || 0) - (loan.givenAmount || 0),
      //   date: loan.createdAt,
      //   description: `Auto-generated from loan (${loan.phone || "N/A"})`,
      // }));
  
      const autoProfits = [];

      const allProfits = [...profits];
  
      // ========================= PDF GENERATION =========================
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=OM_SAI_FINANCE_SUMMARY.pdf"
      );
      doc.pipe(res);
  
      /* ============================
         🏢 HEADER - COMPANY TITLE
         ============================ */
      const headerColor = "#1E40AF";
      const lightGray = "#F8FAFC";
      const borderGray = "#E2E8F0";
  
      doc
        .rect(40, 40, 515, 45)
        .fill(headerColor)
        .fillColor("white")
        .font("Helvetica-Bold")
        .fontSize(20)
        .text("OM SAI ENTERPRISES", 45, 55, { align: "center" })
        .fillColor("black");
  
      doc.moveDown(2);
      doc
        .fontSize(12)
        .fillColor("#1E293B")
        .font("Helvetica-Bold")
        .text("Finance Summary Report", { align: "center" });
  
      doc
        .moveDown(0.3)
        .fontSize(10)
        .fillColor("#475569")
        .text(
          `Generated on: ${new Date().toLocaleDateString()}`,
          { align: "center" }
        );
  
      // 🗓️ Show Filter Range if applied
      if (dateFrom || dateTo) {
        const rangeText =
          `Period: ${dateFrom ? new Date(dateFrom).toLocaleDateString() : "—"} → ` +
          `${dateTo ? new Date(dateTo).toLocaleDateString() : "—"}`;
        doc
          .moveDown(0.3)
          .fontSize(10)
          .fillColor("#334155")
          .text(rangeText, { align: "center" });
      }
  
      doc
        .moveDown(0.5)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .strokeColor(borderGray)
        .stroke();
  
      doc.moveDown(1);
  
      /* ============================
         📘 SECTION TABLE CREATOR
         ============================ */
      const createSection = (title, data, addPageBefore = true) => {
        if (addPageBefore) doc.addPage();
  
        // Section Header
        doc
          .rect(40, doc.y, 515, 25)
          .fill("#2563EB")
          .fillColor("white")
          .font("Helvetica-Bold")
          .fontSize(13)
          .text(`  ${title}`, 40, doc.y + 7)
          .fillColor("black");
        doc.moveDown(2);
  
        if (data.length === 0) {
          doc
            .font("Helvetica-Oblique")
            .fontSize(10)
            .fillColor("#9CA3AF")
            .text("No records available.\n\n");
          return;
        }
  
        const colWidths =
          title === "INVESTMENTS"
            ? [40, 100, 70, 60, 70, 70, 100] // Wider table for duration columns
            : [40, 120, 80, 80, 180];
  
        const colHeaders =
          title === "INVESTMENTS"
            ? [
                "Sr No",
                "Name",
                "Date",
                "Amount",
                "Duration Type",
                "Duration Value",
                "Description",
              ]
            : ["Sr No", "Title / Name", "Date", "Amount", "Description"];
  
        const startY = doc.y;
        doc.rect(40, startY, 515, 20).fill("#1E3A8A");
        doc.fillColor("white").font("Helvetica-Bold").fontSize(10);
  
        let x = 45;
        colHeaders.forEach((h, i) => {
          doc.text(h, x, startY + 5, {
            width: colWidths[i] - 10,
            align: "left",
          });
          x += colWidths[i];
        });
  
        doc.font("Helvetica").fontSize(9).fillColor("black");
  
        let y = startY + 25;
        let total = 0;
  
        data.forEach((d, i) => {
          if (y > 750) {
            doc.addPage();
            y = 50;
          }
  
          const dateStr = d.date ? new Date(d.date).toLocaleDateString() : "-";
          const amount = d.amount ? d.amount.toLocaleString() : "0";
          const desc = d.description || "-";
  
          // Alternate background
          if (i % 2 === 0) {
            doc.rect(40, y - 2, 515, 20).fill(lightGray);
          }
  
          x = 45;
          doc.fillColor("black");
          doc.text(i + 1, x, y, { width: colWidths[0] - 10 });
          x += colWidths[0];
  
          doc.text(d.title || d.name || "-", x, y, { width: colWidths[1] - 10 });
          x += colWidths[1];
  
          doc.text(dateStr, x, y, { width: colWidths[2] - 10 });
          x += colWidths[2];
  
          doc.text(amount, x, y, { width: colWidths[3] - 10, align: "right" });
          x += colWidths[3];
  
          if (title === "INVESTMENTS") {
            doc.text(d.durationType || "-", x, y, { width: colWidths[4] - 10 });
            x += colWidths[4];
            doc.text(
              d.durationValue ? d.durationValue.toString() : "-",
              x,
              y,
              { width: colWidths[5] - 10, align: "center" }
            );
            x += colWidths[5];
          }
  
          doc.text(desc, x, y, {
            width: colWidths[colWidths.length - 1] - 15,
            align: "left",
            continued: false,
          });
  
          total += Number(d.amount || 0);
          y += 22;
        });
  
        // Totals Row
        doc
          .rect(40, y - 2, 515, 20)
          .fill("#E2E8F0")
          .fillColor("#111827")
          .font("Helvetica-Bold")
          .text("Total", 250, y + 4)
          .text(total.toLocaleString(), 380, y + 4, {
            width: 70,
            align: "right",
          });
        doc.moveDown(3);
      };
  
      /* ============================
         📊 SECTIONS
         ============================ */
      createSection("PROFITS", allProfits, false);
      createSection("EXPENSES", expenses);
      createSection("INVESTMENTS", investments);
      createSection("RESERVE FUNDS", reserves);
  
      /* ============================
         🧾 FOOTER
         ============================ */
      const footerY = doc.page.height - 60;
      doc
        .moveTo(40, footerY - 5)
        .lineTo(555, footerY - 5)
        .strokeColor(borderGray)
        .stroke();
  
      doc
        .fontSize(9)
        .fillColor("#64748B")
        .text("Generated by OM SAI ENTERPRISES Financial System", 40, footerY, {
          align: "center",
          width: 515,
        });
  
      doc.end();
    } catch (error) {
      console.error("PDF generation error:", error);
      sendResponse(res, 500, "Failed", { message: error.message });
    }
  });
  
  
  
  

module.exports = combinedController;
