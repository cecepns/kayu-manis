import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, File } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ordersAPI } from "../../utils/apiOrders";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ImageLightbox from "../../components/common/ImageLightbox";
import logo from "../../assets/logo.jpeg";
import svlkLogo from "../../assets/svlk.jpeg";
import { fetchImageForExcel, fitImageToBox, getImageUrl } from "../../utils/imageUtils";
import { formatReportDate } from "../../utils/formatDate";
import {
  BANK_OPTIONS,
  DEFAULT_BANK_ID,
} from "../../constants/reportDefaults";

const getBankDetails = (bankId) =>
  BANK_OPTIONS.find((b) => b.id === (bankId || DEFAULT_BANK_ID)) ||
  BANK_OPTIONS[0];

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({
    current: 0,
    total: 0,
    message: "",
  });
  const [lightboxImage, setLightboxImage] = useState(null);

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getOrderReport(id);
      setReportData(response);
    } catch (error) {
      console.error("Error loading report:", error);
      alert("Error loading report");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const getCurrencySymbol = (currency) => {
    const symbols = {
      USD: "$",
      EUR: "€",
      Rp: "Rp",
      IDR: "Rp",
    };
    return symbols[currency] || currency || "$";
  };

  const formatCurrency = (amount, currency, options = {}) => {
    const symbol = getCurrencySymbol(currency || "USD");
    const curr = currency || "USD";
    const parsed = parseFloat(amount);
    const safeValue = isNaN(parsed) ? 0 : parsed;
    let formatted = safeValue.toFixed(2);
    if (options.stripTrailingZeros) {
      formatted = formatted.replace(/\.?0+$/, "");
    }

    if (curr === "Rp" || curr === "IDR") {
      return `${symbol} ${formatted}`;
    } else {
      return `${symbol}${formatted}`;
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading report..." />;
  }

  if (!reportData) {
    return <div>Report not found</div>;
  }

  const { order, items, summary } = reportData;
  const bankDetails = getBankDetails(order?.bank_id);
  const reportDate = formatReportDate(order?.invoice_date || order?.created_at);
  const displayCurrency = order?.currency || summary?.currency || "USD";
  const isSpecialTemplate = order?.template_type === 'special';
  const customColumns = order?.custom_columns
    ? typeof order.custom_columns === "string"
      ? JSON.parse(order.custom_columns)
      : order.custom_columns
    : [];

  // Helper to calculate total per-unit Gross W and Net W across all items
  const calculatePerUnitWeightTotals = (itemsArray) => {
    if (!Array.isArray(itemsArray)) {
      return { totalGrossUnit: 0, totalNetUnit: 0 };
    }

    const safeParse = (value) => {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    };

    return itemsArray.reduce(
      (acc, item) => {
        const qtyNum = safeParse(item.qty);

        let grossPer = item.gross_weight;
        let netPer = item.net_weight;

        // Fallback: derive per-unit from total if per-unit not present
        if ((grossPer === null || grossPer === undefined) && item.gross_weight_total && qtyNum > 0) {
          grossPer = safeParse(item.gross_weight_total) / qtyNum;
        }
        if ((netPer === null || netPer === undefined) && item.net_weight_total && qtyNum > 0) {
          netPer = safeParse(item.net_weight_total) / qtyNum;
        }

        const grossNum =
          typeof grossPer === "number" ? grossPer : safeParse(grossPer);
        const netNum =
          typeof netPer === "number" ? netPer : safeParse(netPer);

        return {
          totalGrossUnit:
            acc.totalGrossUnit + (isNaN(grossNum) ? 0 : grossNum),
          totalNetUnit: acc.totalNetUnit + (isNaN(netNum) ? 0 : netNum),
        };
      },
      { totalGrossUnit: 0, totalNetUnit: 0 }
    );
  };

  const { totalGrossUnit, totalNetUnit } = calculatePerUnitWeightTotals(items);
  const displayTotalGrossUnit = totalGrossUnit.toFixed(2);
  const displayTotalNetUnit = totalNetUnit.toFixed(2);

  // Calculate total qty
  const totalQty = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    return sum + (isNaN(qty) ? 0 : qty);
  }, 0);

  // Total FOB from items with same rounding as OrderForm (avoid float drift)
  const round2 = (n) => Math.round(n * 100) / 100;
  const getItemFobTotalDisplay = (item) => {
    const qty = parseFloat(item.qty) || 0;
    let unit = parseFloat(item.fob ?? item.fob_price ?? 0);
    if (isSpecialTemplate) {
      const d = parseInt(item.discount_5) || 0;
      if (d === 5) unit = round2(unit * 0.95);
      else if (d === 10) unit = round2(unit * 0.9);
      else unit = round2(unit);
    } else {
      unit = round2(unit);
    }
    return round2(unit * qty);
  };
  const computedTotalUSD = round2(
    items.reduce(
      (sum, item) =>
        sum +
        (item.fob != null || item.fob_price != null
          ? getItemFobTotalDisplay(item)
          : parseFloat(item.fob_total_usd ?? item.fob_total ?? 0)),
      0
    )
  );

  // Helper to calculate price after discount per unit (rounded to 2 decimals, same as OrderForm)
  const calculatePriceAfterDiscount = (item) => {
    if (!isSpecialTemplate) return null;
    const fobPrice = parseFloat(item.fob || item.fob_price || 0);
    const discountType = parseInt(item.discount_5) || 0;
    if (discountType === 5) {
      return round2(fobPrice * 0.95);
    } else if (discountType === 10) {
      return round2(fobPrice * 0.9);
    }
    return round2(fobPrice);
  };

  const handleExportExcel = async () => {
    if (!items || !Array.isArray(items)) return;

    setExporting(true);
    setExportProgress({ current: 0, total: 100, message: "Preparing export..." });

    try {
      // Helper function to convert value to number if possible
      const toNumber = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const num = typeof value === "string" ? parseFloat(value) : Number(value);
        return isNaN(num) ? null : num;
      };
      // Round to 2 decimal places for currency/totals
      const roundTo2 = (value) => {
        const n = toNumber(value);
        return n != null ? Number(parseFloat(n).toFixed(2)) : null;
      };
      const round2Num = (n) =>
        n != null && !isNaN(n) ? Math.round(Number(n) * 100) / 100 : 0;

      // Item FOB total with same rounding as OrderForm (round unit price then round total)
      const getItemFobTotal = (item) => {
        const qty = parseFloat(item.qty) || 0;
        let unit = parseFloat(item.fob || item.fob_price || 0);
        if (isSpecialTemplate) {
          const d = parseInt(item.discount_5) || 0;
          if (d === 5) unit = round2Num(unit * 0.95);
          else if (d === 10) unit = round2Num(unit * 0.9);
          else unit = round2Num(unit);
        } else {
          unit = round2Num(unit);
        }
        return round2Num(unit * qty);
      };

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Packing List");

    // Helper to create fixed-length row values (21 columns)
    const createRowValues = () => Array(21).fill("");

    // Company letterhead (logo + address)
    const letterheadRow = worksheet.addRow(createRowValues());
    // Make letterhead taller so all address lines have enough space
    letterheadRow.height = 110;
    // Leave columns 1-3 for logo / spacing, put text starting at column 4
    worksheet.mergeCells(letterheadRow.number, 4, letterheadRow.number, 12);
    const letterheadCell = letterheadRow.getCell(4);
    letterheadCell.value = {
      richText: [
        { text: "CV Kayu Manis\n", font: { bold: true, size: 14 } },
        {
          text: "Furniture Manufacturer & Exporter\n",
          font: { bold: true, size: 12 },
        },
        {
          text:
            "Jl.Monumen TNI AU No.8, Donoloyo, Tamanan, Banguntapan, Bantul 55191, Yogyakarta\n",
          font: { size: 11 },
        },
        {
          text: "Phone : +62-274-7471285\n",
          font: { size: 11 },
        },
        {
          text: "E-mail : kayumanisliving@gmail.com\n",
          font: { size: 11 },
        },
        {
          text: "www.kayumanishomefurniture.com",
          font: { size: 11, color: { argb: "FF800000" } },
        },
      ],
    };
    letterheadCell.alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: true,
    };

    // Add logo image on the left of the letterhead
    setExportProgress({ current: 10, total: 100, message: "Adding logo..." });
    try {
      const logoResponse = await fetch(logo);
      const logoBlob = await logoResponse.blob();
      const logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          resolve(typeof result === "string" ? result.split(",")[1] : null);
        };
        reader.readAsDataURL(logoBlob);
      });
      if (logoBase64) {
        const logoId = workbook.addImage({ base64: logoBase64, extension: "jpeg" });
        worksheet.addImage(logoId, {
          tl: { col: 0.2, row: letterheadRow.number - 1 + 0.3 },
          ext: { width: 70, height: 70 },
          editAs: "oneCell",
        });
        worksheet.getColumn(1).width = 26;
        worksheet.getColumn(2).width = 6;
        worksheet.getColumn(3).width = 4;
      }
    } catch (e) {
      console.error("Error adding logo to Excel letterhead:", e);
    }

    // SVLK logo top-right
    try {
      const response = await fetch(svlkLogo);
      const blob = await response.blob();
      const svlkBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          resolve(typeof result === "string" ? result.split(",")[1] : null);
        };
        reader.readAsDataURL(blob);
      });
      if (svlkBase64) {
        const svlkId = workbook.addImage({ base64: svlkBase64, extension: "jpeg" });
        worksheet.addImage(svlkId, {
          tl: { col: 17, row: letterheadRow.number - 1 + 0.2 },
          ext: { width: 90, height: 70 },
          editAs: "oneCell",
        });
      }
    } catch (e) {
      console.error("Error adding SVLK logo to Excel:", e);
    }

    // Blank row after letterhead
    worksheet.addRow([]);

    // Title row
    const titleRow = worksheet.addRow(["Packing List & Invoice"]);
    worksheet.mergeCells(titleRow.number, 1, titleRow.number, 21);
    titleRow.height = 24;
    titleRow.eachCell((cell) => {
      cell.font = { bold: true, size: 14, underline: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // PI Number row (below title)
    const piNumberRow = worksheet.addRow(["NO PI : " + (order.no_pi || "")]);
    worksheet.mergeCells(piNumberRow.number, 1, piNumberRow.number, 21);
    piNumberRow.height = 20;
    piNumberRow.eachCell((cell) => {
      cell.font = { size: 12 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Buyer & Invoice Information block (same content as on-screen)
    const infoHeaderValues = createRowValues();
    infoHeaderValues[0] = "Buyer Information";
    infoHeaderValues[11] = "Invoice Information";
    const infoHeaderRow = worksheet.addRow(infoHeaderValues);
    worksheet.mergeCells(infoHeaderRow.number, 1, infoHeaderRow.number, 10);
    worksheet.mergeCells(infoHeaderRow.number, 12, infoHeaderRow.number, 21);
    infoHeaderRow.eachCell((cell, colNumber) => {
      if (colNumber === 1 || colNumber === 12) {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
    });

    // Buyer name row (left side only)
    const buyerNameAndDateValues = createRowValues();
    buyerNameAndDateValues[0] = order.buyer_name || "";
    const buyerNameAndDateRow = worksheet.addRow(buyerNameAndDateValues);
    worksheet.mergeCells(
      buyerNameAndDateRow.number,
      1,
      buyerNameAndDateRow.number,
      10
    );

    // No PO row (below buyer name)
    if (order.no_po) {
      const noPoValues = createRowValues();
      noPoValues[0] = `No PO : ${order.no_po}`;
      const noPoRow = worksheet.addRow(noPoValues);
      worksheet.mergeCells(noPoRow.number, 1, noPoRow.number, 10);
    }

    // Buyer address row with Volume (first line of Invoice Information)
    const buyerAddressAndVolumeValues = createRowValues();
    buyerAddressAndVolumeValues[0] = order.buyer_address || "";
    buyerAddressAndVolumeValues[11] = "Volume:";
    buyerAddressAndVolumeValues[12] =
      order.volume && order.volume !== ""
        ? `${order.volume} `
        : summary.totalCBM ?? "";
    const buyerAddressAndVolumeRow = worksheet.addRow(
      buyerAddressAndVolumeValues
    );
    worksheet.mergeCells(
      buyerAddressAndVolumeRow.number,
      1,
      buyerAddressAndVolumeRow.number,
      10
    );

    // Style Volume label & value as bold
    buyerAddressAndVolumeRow.eachCell((cell, colNumber) => {
      if (colNumber === 11 || colNumber === 12) {
        cell.font = { bold: true };
      }
    });

    // Port of Loading row (second line of Invoice Information)
    const portLoadingRowValues = createRowValues();
    portLoadingRowValues[11] = "Port of Loading:";
    portLoadingRowValues[12] = order.port_loading || "-";
    const portLoadingRow = worksheet.addRow(portLoadingRowValues);
    portLoadingRow.eachCell((cell, colNumber) => {
      if (colNumber === 11 || colNumber === 12) {
        cell.font = { bold: true };
      }
    });

    // Destination Port row (third line of Invoice Information)
    const destinationPortRowValues = createRowValues();
    destinationPortRowValues[11] = "Destination Port:";
    destinationPortRowValues[12] = order.destination_port || "-";
    const destinationPortRow = worksheet.addRow(destinationPortRowValues);
    destinationPortRow.eachCell((cell, colNumber) => {
      if (colNumber === 11 || colNumber === 12) {
        cell.font = { bold: true };
      }
    });

    // Date row (fourth line of Invoice Information)
    const dateRowValues = createRowValues();
    dateRowValues[11] = "Date:";
    dateRowValues[12] = formatReportDate(order.invoice_date || order.created_at);
    const dateRow = worksheet.addRow(dateRowValues);
    dateRow.eachCell((cell, colNumber) => {
      if (colNumber === 11 || colNumber === 12) {
        cell.font = { bold: true };
      }
    });

    // Blank row before table headers
    worksheet.addRow([]);

    setExportProgress({ current: 20, total: 100, message: "Setting up headers..." });

    // Header rows
    const customColumns = order.custom_columns
      ? typeof order.custom_columns === "string"
        ? JSON.parse(order.custom_columns)
        : order.custom_columns
      : [];

    const isSpecialTemplate = order.template_type === 'special';
    
    const headerRow1 = [
      "No",
      "Client Code",
      ...(isSpecialTemplate ? ["Client Barcode", "Client Description"] : []),
      "KM Code",
      "Picture",
      "Description",
      "Size (cm)",
      "",
      "",
      "Packing Size (cm)",
      "",
      "",
      "Color",
      "Qty",
      "CBM",
      "Weight (kgs)",
      "",
      "",
      "",
      "FOB",
      ...(isSpecialTemplate ? ["Price After Discount"] : []),
      "Total",
      "HS Code",
      ...customColumns, // Add custom columns
    ];

    const headerRow2 = [
      "",
      "",
      ...(isSpecialTemplate ? ["", ""] : []),
      "",
      "",
      "",
      "W",
      "D",
      "H",
      "W",
      "D",
      "H",
      "",
      "",
      "",
      "Gross W",
      "Net W",
      "Total GW",
      "Total NW",
      displayCurrency,
      ...(isSpecialTemplate ? [displayCurrency] : []),
      displayCurrency,
      "",
      ...Array(customColumns.length).fill(""), // Add empty cells for custom columns
    ];

    const excelHeaderRow1 = worksheet.addRow(headerRow1);
    const excelHeaderRow2 = worksheet.addRow(headerRow2);
    const headerRow1Index = excelHeaderRow1.number;
    const headerRow2Index = excelHeaderRow2.number;

    // Merges to mirror the on-screen table
    let colOffset = 0;
    worksheet.mergeCells(headerRow1Index, 1, headerRow2Index, 1); // No
    worksheet.mergeCells(headerRow1Index, 2, headerRow2Index, 2); // Client Code
    colOffset = isSpecialTemplate ? 2 : 0;
    if (isSpecialTemplate) {
      worksheet.mergeCells(headerRow1Index, 3, headerRow2Index, 3); // Client Barcode
      worksheet.mergeCells(headerRow1Index, 4, headerRow2Index, 4); // Client Description
    }
    worksheet.mergeCells(headerRow1Index, 3 + colOffset, headerRow2Index, 3 + colOffset); // KM Code
    worksheet.mergeCells(headerRow1Index, 4 + colOffset, headerRow2Index, 4 + colOffset); // Picture
    worksheet.mergeCells(headerRow1Index, 5 + colOffset, headerRow2Index, 5 + colOffset); // Description
    worksheet.mergeCells(headerRow1Index, 12 + colOffset, headerRow2Index, 12 + colOffset); // Color
    worksheet.mergeCells(headerRow1Index, 13 + colOffset, headerRow2Index, 13 + colOffset); // Qty
    worksheet.mergeCells(headerRow1Index, 14 + colOffset, headerRow2Index, 14 + colOffset); // CBM
    // FOB, Price After Discount (if special), and Total are NOT merged - they show currency in row 2
    // Only HS Code is merged vertically
    // HS Code position: 21 + colOffset for normal, 22 + colOffset for special (after Price After Discount)
    const hsCodeCol = isSpecialTemplate ? 22 + colOffset : 21 + colOffset;
    worksheet.mergeCells(headerRow1Index, hsCodeCol, headerRow2Index, hsCodeCol); // HS Code

    worksheet.mergeCells(headerRow1Index, 6 + (isSpecialTemplate ? 2 : 0), headerRow1Index, 8 + (isSpecialTemplate ? 2 : 0)); // Size (cm)
    worksheet.mergeCells(headerRow1Index, 9 + (isSpecialTemplate ? 2 : 0), headerRow1Index, 11 + (isSpecialTemplate ? 2 : 0)); // Packing Size (cm)
    worksheet.mergeCells(headerRow1Index, 15 + (isSpecialTemplate ? 2 : 0), headerRow1Index, 18 + (isSpecialTemplate ? 2 : 0)); // Weight (kgs)

    // Merge custom columns (each custom column spans both header rows)
    // At this point, colOffset is 2 for special template (Client Barcode + Client Description) and 0 for regular template
    // HS Code position: 21 + colOffset for normal, 22 + colOffset for special (after Price After Discount)
    // Custom columns start after HS Code
    const customColStartIndex = hsCodeCol + 1; // Start after HS Code
    customColumns.forEach((_, index) => {
      const colIndex = customColStartIndex + index;
      worksheet.mergeCells(
        headerRow1Index,
        colIndex,
        headerRow2Index,
        colIndex
      );
    });

    // Style header rows - soft yellow background
    const headerFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEF9C3" },
    };

    for (
      let rowIndex = headerRow1Index;
      rowIndex <= headerRow2Index;
      rowIndex++
    ) {
      const row = worksheet.getRow(rowIndex);
      row.height = 24;
      row.eachCell((cell) => {
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.font = { bold: true, color: { argb: "FF800000" } };
        cell.fill = headerFill;
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }

    // Column widths (approximation so picture column is wider)
    const columnWidths = [
      5, // No
      12, // Client Code
      ...(isSpecialTemplate ? [15, 30] : []), // Client Barcode, Client Description
      18, // KM Code (increased width)
      18, // Picture
      30, // Description
      6, // Size W
      6, // Size D
      6, // Size H
      8, // Packing W
      8, // Packing D
      8, // Packing H
      10, // Color
      6, // Qty
      8, // CBM
      10, // Gross W
      10, // Net W
      10, // Total GW
      10, // Total NW
      12, // FOB
      ...(isSpecialTemplate ? [15] : []), // Price After Discount
      14, // Total
      18, // HS Code (increased width)
      ...Array(customColumns.length).fill(15), // Custom columns width
    ];
    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    // Data rows with images
    const pictureColumnIndex = 4 + (isSpecialTemplate ? 2 : 0);

    setExportProgress({ current: 30, total: 100, message: "Processing items..." });

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      
      // Update progress for each item
      const itemProgress = 30 + Math.floor((index / items.length) * 50);
      setExportProgress({
        current: itemProgress,
        total: 100,
        message: `Processing item ${index + 1} of ${items.length}...`,
      });

      // Parse custom_column_values if it's a string
      const customValues = item.custom_column_values
        ? typeof item.custom_column_values === "string"
          ? JSON.parse(item.custom_column_values)
          : item.custom_column_values
        : {};

      const row = worksheet.addRow([
        index + 1, // No - already number
        item.client_code || "-",
        ...(isSpecialTemplate ? [item.client_barcode || "-", item.client_description || "-"] : []),
        item.km_code || "",
        "", // picture handled separately
        item.description || "",
        toNumber(item.size_width), // Size W - number
        toNumber(item.size_depth), // Size D - number
        toNumber(item.size_height), // Size H - number
        toNumber(item.packing_width), // Packing W - number
        toNumber(item.packing_depth), // Packing D - number
        toNumber(item.packing_height), // Packing H - number
        item.color || "",
        toNumber(item.qty), // Qty - number
        toNumber(item.cbm_total), // CBM - number
        // Use per-unit gross/net weight when available; fall back to totals if needed
        toNumber(item.gross_weight ?? item.gross_weight_total), // Gross W - number
        toNumber(item.net_weight ?? item.net_weight_total), // Net W - number
        toNumber(item.total_gw_total), // Total GW - number
        toNumber(item.total_nw_total), // Total NW - number
        toNumber(item.fob || item.fob_price), // FOB - number
        ...(isSpecialTemplate ? [
          (() => {
            const fobPrice = parseFloat(item.fob || item.fob_price || 0);
            const discountType = parseInt(item.discount_5) || 0;
            let priceAfterDiscount = fobPrice;
            if (discountType === 5) {
              priceAfterDiscount = round2Num(fobPrice * 0.95);
            } else if (discountType === 10) {
              priceAfterDiscount = round2Num(fobPrice * 0.9);
            } else {
              priceAfterDiscount = round2Num(fobPrice);
            }
            return priceAfterDiscount;
          })()
        ] : []),
        getItemFobTotal(item), // Total - same rounding as OrderForm
        item.hs_code || "",
        ...customColumns.map((col) => {
          const val = customValues[col];
          // Try to convert custom column values to number if they look like numbers
          return val ? toNumber(val) ?? val : "";
        }),
      ]);

      const rowIndex = row.number;

      row.alignment = { vertical: "middle" };
      row.height = 60; // allow picture to be visible

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      if (item.picture_url) {
        try {
          const imageInfo = await fetchImageForExcel(item.picture_url);
          if (imageInfo?.base64) {
            const imageId = workbook.addImage({
              base64: imageInfo.base64,
              extension: imageInfo.extension || "png", // Use detected extension
            });

            const maxImageWidth = 120;
            const maxImageHeight = 52;
            const { width: targetWidth, height: targetHeight } = fitImageToBox(
              imageInfo.width,
              imageInfo.height,
              maxImageWidth,
              maxImageHeight
            );

            const rowHeightPx = 60;
            const verticalOffset = Math.max(0, (rowHeightPx - targetHeight) / 2) / rowHeightPx;

            worksheet.addImage(imageId, {
              tl: {
                col: pictureColumnIndex - 1 + 0.15,
                row: rowIndex - 1 + 0.1 + verticalOffset * 0.8,
              },
              ext: { width: targetWidth, height: targetHeight },
              editAs: "oneCell",
            });
          } else {
            console.warn(`Failed to load image for item ${item.km_code}: ${item.picture_url}`);
          }
        } catch (error) {
          console.error(`Error adding image for item ${item.km_code}:`, error);
        }
      }
    }

    setExportProgress({ current: 85, total: 100, message: "Adding summary..." });

    // Calculate total qty for Excel
    const totalQtyExcel = items.reduce((sum, item) => {
      const qty = parseFloat(item.qty) || 0;
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);

    // Build summary row values based on actual header structure
    const totalColumns = headerRow1.length;
    const summaryValues = Array(totalColumns).fill("");

    // Find key column indexes dynamically so we stay in-sync with headers
    const qtyColIndex = headerRow1.findIndex((col) => col === "Qty") + 1;
    const cbmColIndex = headerRow1.findIndex((col) => col === "CBM") + 1;
    const grossWColIndex = headerRow1.findIndex((col) => col === "Weight (kgs)") + 1; // First child will be "Gross W"
    const fobColIndex = headerRow1.findIndex((col) => col === "FOB") + 1;
    const totalColIndex = headerRow1.findIndex((col) => col === "Total") + 1;

    // Defensive setter in case structure changes
    const safeSet = (valuesArray, colIndex, value) => {
      if (colIndex > 0 && colIndex <= valuesArray.length) {
        valuesArray[colIndex - 1] = value;
      }
    };

    // "TOTAL" label in the first column (will be merged later)
    summaryValues[0] = "TOTAL";

    // Set numeric summary values in the correct columns
    safeSet(summaryValues, qtyColIndex, toNumber(totalQtyExcel)); // Qty - number
    safeSet(summaryValues, cbmColIndex, toNumber(summary.totalCBM)); // CBM - number

    if (grossWColIndex > 0) {
      safeSet(summaryValues, grossWColIndex, totalGrossUnit); // Gross W per-unit total
      safeSet(summaryValues, grossWColIndex + 1, totalNetUnit); // Net W per-unit total
      safeSet(summaryValues, grossWColIndex + 2, toNumber(summary.totalGW)); // Total GW - number
      safeSet(summaryValues, grossWColIndex + 3, toNumber(summary.totalNW)); // Total NW - number
    }

    // Leave FOB and Price After Discount blank in summary; total = sum of item totals (same rounding as OrderForm)
    const totalUSDExcel = round2Num(
      items.reduce((s, it) => s + getItemFobTotal(it), 0)
    );
    safeSet(summaryValues, totalColIndex, totalUSDExcel);

    const summaryRow = worksheet.addRow(summaryValues);

    summaryRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: "FF800000" } };
      cell.fill = headerFill;
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      // Center the "TOTAL" title in the merged area
      if (colNumber === 1) {
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };
      } else if (!cell.alignment) {
        cell.alignment = { vertical: "middle" };
      }
    });

    // Merge from "TOTAL" label to the column just before "Qty"
    const mergeEndCol = qtyColIndex > 1 ? qtyColIndex - 1 : 1;
    worksheet.mergeCells(summaryRow.number, 1, summaryRow.number, mergeEndCol);

    // Footer: terms & bank (left side below table)
    worksheet.addRow([]);
    const addFooterLine = (label, value) => {
      const vals = createRowValues();
      vals[0] = label;
      vals[1] = value;
      const row = worksheet.addRow(vals);
      row.getCell(1).font = { bold: true };
      worksheet.mergeCells(row.number, 2, row.number, 10);
    };

    addFooterLine("TERMS OF PAYMENT", order.terms_of_payment || "");
    addFooterLine("DELIVERY TERMS", order.delivery_terms || "");
    addFooterLine("Cargo Ready by", order.cargo_ready_by || "");
    worksheet.addRow([]);
    addFooterLine("BANK", bankDetails.name);
    addFooterLine("ADDRESS", bankDetails.address);
    addFooterLine("NAME", bankDetails.accountName);
    addFooterLine("EURO ACCOUNT", bankDetails.euroAccount);
    addFooterLine("SWIFT CODE", bankDetails.swiftCode);

    setExportProgress({ current: 90, total: 100, message: "Generating file..." });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Filename format: idOrder_tanggalsekarang (ddmmyyyy)
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const formattedDate = `${pad(now.getDate())}${pad(
      now.getMonth() + 1
    )}${now.getFullYear()}`;
    const fileName = `${order.id || "order"}_${formattedDate}.xlsx`;

    setExportProgress({ current: 100, total: 100, message: "Saving file..." });

    saveAs(blob, fileName);
    
    // Small delay to show completion before hiding progress
    setTimeout(() => {
      setExporting(false);
      setExportProgress({ current: 0, total: 0, message: "" });
    }, 500);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      alert("Error exporting Excel file. Please try again.");
      setExporting(false);
      setExportProgress({ current: 0, total: 0, message: "" });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Export Progress Modal */}
      {exporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full border-4 border-gray-200 border-t-primary-600 w-12 h-12 mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Exporting Excel...
              </h3>
              <p className="text-sm text-gray-600 mb-4 text-center">
                {exportProgress.message}
              </p>
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${exportProgress.total > 0 ? (exportProgress.current / exportProgress.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                {exportProgress.total > 0
                  ? `${Math.round((exportProgress.current / exportProgress.total) * 100)}%`
                  : "0%"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header - Hide when printing */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 print:hidden">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/app/reports")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Packing List & Invoice
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              NO PI : {order.no_pi}
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className={`btn-secondary ${exporting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <File className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export Excel"}
          </button>
          {/* <button onClick={handlePrint} className="btn-secondary">
            <Print className="w-4 h-4" />
            Print
          </button> */}
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white p-3 sm:p-5 print:p-5">
        {/* Company Header / Letterhead */}
        <div className="border-b-2 border-gray-300 pb-4 sm:pb-6 mb-4 sm:mb-6 print:mb-4 print:pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-6">
            <img
              src={logo}
              alt="CV Kayu Manis"
              className="h-16 sm:h-20 object-contain"
            />
            <div className="text-left">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                CV Kayu Manis
              </h1>
              <p className="text-sm sm:text-base font-semibold text-gray-800">
                Furniture Manufacturer & Exporter
              </p>
              <p className="text-xs sm:text-sm text-gray-700">
                Jl.Monumen TNI AU No.8, Donoloyo, Tamanan, Banguntapan, Bantul
                55191, Yogyakarta
              </p>
              <p className="text-xs sm:text-sm text-gray-700">
                Phone : +62-274-7471285
              </p>
              <p className="text-xs sm:text-sm text-gray-700">
                E-mail : kayumanisliving@gmail.com
              </p>
              <p className="text-xs sm:text-sm text-[#800000]">
                www.kayumanishomefurniture.com
              </p>
            </div>
            </div>
            <img
              src={svlkLogo}
              alt="SVLK Indonesia"
              className="h-16 sm:h-20 object-contain flex-shrink-0"
            />
          </div>
        </div>

        {/* Document Title */}
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold underline py-2 px-3 sm:px-4 inline-block">
            Packing List & Invoice
          </h2>
          <div className="mt-2 sm:mt-3">
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              NO PI : {order.no_pi}
            </span>
          </div>
        </div>

        {/* Order Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide border-b border-gray-200 pb-1">
              Buyer Information
            </h3>
            <div className="text-sm">
              <div className="font-medium text-gray-900">
                {order.buyer_name}
              </div>
              <div className="text-gray-600 mt-1 whitespace-pre-line">
                {order.buyer_address}
              </div>
              {order.no_po && (
                <div className="text-gray-700 mt-2 font-medium">
                  No PO : {order.no_po}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide border-b border-gray-200 pb-1">
              Invoice Information
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex">
                <span className="w-28 text-gray-900 font-semibold">
                  Volume:
                </span>
                <span className="font-semibold text-gray-900">
                  {order.volume ? `${order.volume}` : summary.totalCBM}
                </span>
              </div>
              <div className="flex">
                <span className="w-28 text-gray-900 font-semibold">
                  Port of Loading:
                </span>
                <span className="font-semibold text-gray-900">
                  {order.port_loading || "-"}
                </span>
              </div>
              <div className="flex">
                <span className="w-28 text-gray-900 font-semibold">
                  Destination Port:
                </span>
                <span className="font-semibold text-gray-900">
                  {order.destination_port || "-"}
                </span>
              </div>
              <div className="flex">
                <span className="w-28 text-gray-900 font-semibold">Date:</span>
                <span className="font-semibold text-gray-900">{reportDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto w-full max-w-[80vw] md:max-w-[75vw]">
          <div className="align-middle px-3 sm:px-5 print:px-0">
            <table className="table-responsive border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-yellow-100 text-[#800000]">
                  <th
                    className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                    rowSpan="2"
                  >
                    No
                  </th>
                  <th
                    className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                    rowSpan="2"
                  >
                    Client Code
                  </th>
                  {isSpecialTemplate && (
                    <>
                      <th
                        className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                        rowSpan="2"
                      >
                        Client Barcode
                      </th>
                      <th
                        className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                        rowSpan="2"
                      >
                        Client Description
                      </th>
                    </>
                  )}
                  <th
                    className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                    rowSpan="2"
                  >
                    KM Code
                  </th>
                  <th
                    className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                    rowSpan="2"
                  >
                    Picture
                  </th>
                  <th
                    className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                    rowSpan="2"
                  >
                    Description
                  </th>
                  <th
                    className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                    colSpan="3"
                  >
                    Size (cm)
                  </th>
                  <th
                    className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                    colSpan="3"
                  >
                    Packing Size (cm)
                  </th>
                  <th
                    className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                    rowSpan="2"
                  >
                    Color
                  </th>
                  <th
                    className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                    rowSpan="2"
                  >
                    Qty
                  </th>
                  <th
                    className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                    rowSpan="2"
                  >
                    CBM
                  </th>
                  <th
                    className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                    colSpan="4"
                  >
                    Weight (kgs)
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    FOB
                  </th>
                  {isSpecialTemplate && (
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                      Price After Discount
                    </th>
                  )}
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    Total
                  </th>
                  <th
                    className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                    rowSpan="2"
                  >
                    HS Code
                  </th>
                  {customColumns.map((col, idx) => (
                    <th
                      key={idx}
                      className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs"
                      rowSpan="2"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
                <tr className="bg-yellow-100 text-[#800000]">
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    W
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    D
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    H
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    W
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    D
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    H
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    Gross W
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    Net W
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    Total GW
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    Total NW
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    {displayCurrency}
                  </th>
                  {isSpecialTemplate && (
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                      {displayCurrency}
                    </th>
                  )}
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">
                    {displayCurrency}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-2 text-center font-medium">
                      {index + 1}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.client_code || "-"}
                    </td>
                    {isSpecialTemplate && (
                      <>
                        <td className="border border-gray-300 px-2 py-2 text-center">
                          {item.client_barcode || "-"}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-left">
                          {item.client_description || "-"}
                        </td>
                      </>
                    )}
                    <td className="border border-gray-300 px-2 py-2 text-center font-medium">
                      {item.km_code}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.picture_url ? (
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ src: item.picture_url, alt: item.description, filename: item.km_code })}
                          className="mx-auto block cursor-zoom-in"
                        >
                          <img
                            src={getImageUrl(item.picture_url)}
                            alt={item.description}
                            className="h-12 w-12 object-cover rounded mx-auto border border-gray-200 hover:opacity-90"
                          />
                        </button>
                      ) : (
                        <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center mx-auto">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-left">
                      {item.description}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.size_width}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.size_depth}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.size_height}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.packing_width}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.packing_depth}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.packing_height}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.color}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center font-medium">
                      {item.qty}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center font-medium">
                      {item.cbm_total}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {/* Show per-unit Gross W; fall back to total if needed */}
                      {item.gross_weight ?? item.gross_weight_total ?? "-"}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {/* Show per-unit Net W; fall back to total if needed */}
                      {item.net_weight ?? item.net_weight_total ?? "-"}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.total_gw_total || "-"}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.total_nw_total || "-"}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      <div>{item.fob || item.fob_price || "-"}</div>
                    </td>
                    {isSpecialTemplate && (
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <div>
                          {(() => {
                            const priceAfterDiscount = calculatePriceAfterDiscount(item);
                            return priceAfterDiscount !== null && priceAfterDiscount !== undefined
                              ? priceAfterDiscount.toFixed(2)
                              : "-";
                          })()}
                        </div>
                      </td>
                    )}
                    <td className="border border-gray-300 px-2 py-2 text-center font-medium">
                      <div>
                        {item.fob != null || item.fob_price != null
                          ? getItemFobTotalDisplay(item)
                              .toFixed(2)
                              .replace(/\.?0+$/, "")
                          : item.fob_total_usd != null || item.fob_total != null
                            ? parseFloat(
                                item.fob_total_usd ?? item.fob_total ?? 0
                              )
                                .toFixed(2)
                                .replace(/\.?0+$/, "")
                            : "-"}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.hs_code}
                    </td>
                    {customColumns.map((col, colIdx) => {
                      const customValues = item.custom_column_values
                        ? typeof item.custom_column_values === "string"
                          ? JSON.parse(item.custom_column_values)
                          : item.custom_column_values
                        : {};
                      return (
                        <td
                          key={colIdx}
                          className="border border-gray-300 px-2 py-2 text-center"
                        >
                          {customValues[col] || "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Total Row */}
                <tr className="bg-yellow-100 font-semibold">
                  <td
                    className="border border-gray-300 px-2 py-2 text-center"
                    colSpan={isSpecialTemplate ? "14" : "12"}
                  >
                    TOTAL
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {totalQty}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {summary.totalCBM}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {/* Total Gross W from per-unit weights */}
                    {displayTotalGrossUnit}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {/* Total Net W from per-unit weights */}
                    {displayTotalNetUnit}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {summary.totalGW || "-"}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {summary.totalNW || "-"}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    <div>-</div>
                  </td>
                  {isSpecialTemplate && (
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      <div>-</div>
                    </td>
                  )}
                  <td className="border border-gray-300 px-2 py-2 text-center text-green-600">
                    <div>
                      {Number(computedTotalUSD).toFixed(2).replace(/\.?0+$/, "")}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    -
                  </td>
                  {customColumns.map((_, colIdx) => (
                    <td
                      key={colIdx}
                      className="border border-gray-300 px-2 py-2 text-center"
                    >
                      -
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Section */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-gradient-to-r from-primary-50 to-secondary-50 p-4 rounded-lg border">
          <div className="text-center">
            <div className="text-lg font-bold text-primary-600">
              {summary.totalCBM}
            </div>
            <div className="text-xs text-gray-600 uppercase tracking-wide">
              Total CBM
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(
                computedTotalUSD,
                displayCurrency,
                { stripTrailingZeros: true }
              )}
            </div>
            <div className="text-xs text-gray-600 uppercase tracking-wide">
              Total FOB {displayCurrency}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {summary.totalGrossWeight}
            </div>
            <div className="text-xs text-gray-600 uppercase tracking-wide">
              Gross Weight (kg)
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {summary.totalNetWeight}
            </div>
            <div className="text-xs text-gray-600 uppercase tracking-wide">
              Net Weight (kg)
            </div>
          </div>
        </div>

        <div className="mt-8 text-sm max-w-xl space-y-3">
          <div>
            <span className="font-bold text-gray-900">TERMS OF PAYMENT</span>
            <p className="mt-1 text-gray-700">{order.terms_of_payment || "-"}</p>
          </div>
          <div>
            <span className="font-bold text-gray-900">DELIVERY TERMS</span>
            <p className="mt-1 text-gray-700">{order.delivery_terms || "-"}</p>
          </div>
          <div>
            <span className="font-bold text-gray-900">Cargo Ready by</span>
            <p className="mt-1 text-gray-700">{order.cargo_ready_by || "-"}</p>
          </div>
          <div className="pt-2 space-y-1">
            <div className="flex gap-2">
              <span className="font-bold text-blue-800 w-28">BANK</span>
              <span>:</span>
              <span>{bankDetails.name}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-blue-800 w-28">ADDRESS</span>
              <span>:</span>
              <span>{bankDetails.address}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-blue-800 w-28">NAME</span>
              <span>:</span>
              <span>{bankDetails.accountName}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-blue-800 w-28">EURO ACCOUNT</span>
              <span>:</span>
              <span>{bankDetails.euroAccount}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-blue-800 w-28">SWIFT CODE</span>
              <span>:</span>
              <span>{bankDetails.swiftCode}</span>
            </div>
          </div>
        </div>
      </div>

      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          filename={lightboxImage.filename}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};

export default ReportDetail;
