import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, File } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ordersAPI } from "../../utils/apiOrders";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import logo from "../../assets/logo.jpeg";

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const formatCurrency = (amount, currency) => {
    const symbol = getCurrencySymbol(currency || "USD");
    const curr = currency || "USD";
    const parsed = parseFloat(amount);
    const safeValue = isNaN(parsed) ? 0 : parsed;

    if (curr === "Rp" || curr === "IDR") {
      return `${symbol} ${safeValue.toFixed(2)}`;
    } else {
      return `${symbol}${safeValue.toFixed(2)}`;
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading report..." />;
  }

  if (!reportData) {
    return <div>Report not found</div>;
  }

  const { order, items, summary } = reportData;
  const displayCurrency = order?.currency || summary?.currency || "USD";
  const customColumns = order?.custom_columns
    ? typeof order.custom_columns === "string"
      ? JSON.parse(order.custom_columns)
      : order.custom_columns
    : [];

  const handleExportExcel = async () => {
    if (!items || !Array.isArray(items)) return;

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
          text: "Phone : +62-274-7471285,  Fax : +62-274-412217\n",
          font: { size: 11 },
        },
        {
          text: "E-mail : cvkayumanis@hotmail.com\n",
          font: { size: 11 },
        },
        {
          text: "www.kayumanis.asia",
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
    try {
      const logoInfo = await fetchImageInfo(logo);
      if (logoInfo?.base64) {
        const logoId = workbook.addImage({
          base64: logoInfo.base64,
          extension: "jpeg",
        });
        const targetHeight = 70;
        let targetWidth = 70;
        if (logoInfo.width && logoInfo.height) {
          const ratio = logoInfo.width / logoInfo.height;
          targetWidth = targetHeight * ratio;
        }
        worksheet.addImage(logoId, {
          // Keep logo fully in columns 1-3 area
          tl: { col: 0.2, row: letterheadRow.number - 1 + 0.3 },
          ext: { width: targetWidth, height: targetHeight },
          editAs: "oneCell",
        });
        // Make first columns wide enough for logo and spacing
        worksheet.getColumn(1).width = 26;
        worksheet.getColumn(2).width = 6;
        worksheet.getColumn(3).width = 4;
      }
    } catch (e) {
      console.error("Error adding logo to Excel letterhead:", e);
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

    // Buyer address row with Volume (first line of Invoice Information)
    const buyerAddressAndVolumeValues = createRowValues();
    buyerAddressAndVolumeValues[0] = order.buyer_address || "";
    buyerAddressAndVolumeValues[11] = "Volume:";
    buyerAddressAndVolumeValues[12] =
      order.volume && order.volume !== ""
        ? `${order.volume} CBM`
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
    const dateValue = order.invoice_date
      ? new Date(order.invoice_date).toLocaleDateString()
      : order.created_at
      ? new Date(order.created_at).toLocaleDateString()
      : "-";
    dateRowValues[12] = dateValue;
    const dateRow = worksheet.addRow(dateRowValues);
    dateRow.eachCell((cell, colNumber) => {
      if (colNumber === 11 || colNumber === 12) {
        cell.font = { bold: true };
      }
    });

    // Blank row before table headers
    worksheet.addRow([]);

    // Header rows
    const customColumns = order.custom_columns
      ? typeof order.custom_columns === "string"
        ? JSON.parse(order.custom_columns)
        : order.custom_columns
      : [];

    const headerRow1 = [
      "No",
      "Client Code",
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
      "Total",
      "HS Code",
      ...customColumns, // Add custom columns
    ];

    const headerRow2 = [
      "",
      "",
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
      displayCurrency,
      "",
      ...Array(customColumns.length).fill(""), // Add empty cells for custom columns
    ];

    const excelHeaderRow1 = worksheet.addRow(headerRow1);
    const excelHeaderRow2 = worksheet.addRow(headerRow2);
    const headerRow1Index = excelHeaderRow1.number;
    const headerRow2Index = excelHeaderRow2.number;

    // Merges to mirror the on-screen table
    worksheet.mergeCells(headerRow1Index, 1, headerRow2Index, 1); // No
    worksheet.mergeCells(headerRow1Index, 2, headerRow2Index, 2); // Client Code
    worksheet.mergeCells(headerRow1Index, 3, headerRow2Index, 3); // KM Code
    worksheet.mergeCells(headerRow1Index, 4, headerRow2Index, 4); // Picture
    worksheet.mergeCells(headerRow1Index, 5, headerRow2Index, 5); // Description
    worksheet.mergeCells(headerRow1Index, 12, headerRow2Index, 12); // Color
    worksheet.mergeCells(headerRow1Index, 13, headerRow2Index, 13); // Qty
    worksheet.mergeCells(headerRow1Index, 14, headerRow2Index, 14); // CBM
    worksheet.mergeCells(headerRow1Index, 19, headerRow2Index, 19); // FOB
    worksheet.mergeCells(headerRow1Index, 20, headerRow2Index, 20); // Total
    worksheet.mergeCells(headerRow1Index, 21, headerRow2Index, 21); // HS Code

    worksheet.mergeCells(headerRow1Index, 6, headerRow1Index, 8); // Size (cm)
    worksheet.mergeCells(headerRow1Index, 9, headerRow1Index, 11); // Packing Size (cm)
    worksheet.mergeCells(headerRow1Index, 15, headerRow1Index, 18); // Weight (kgs)

    // Merge custom columns (each custom column spans both header rows)
    customColumns.forEach((_, index) => {
      const colIndex = 22 + index; // Start after HS Code (column 21)
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
      14, // Total
      18, // HS Code (increased width)
      ...Array(customColumns.length).fill(15), // Custom columns width
    ];
    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    // Helper: fetch image as base64 + original dimensions
    async function fetchImageInfo(url) {
      if (!url) return null;
      try {
        const response = await fetch(url, {
          mode: 'cors',
          cache: 'no-cache'
        });
        if (!response.ok) {
          console.warn(`Failed to fetch image: ${url}, status: ${response.status}`);
          return null;
        }
        const blob = await response.blob();
        
        // Detect image format from Content-Type or file extension
        const contentType = blob.type || '';
        const urlLower = url.toLowerCase();
        let extension = 'jpeg'; // default
        
        if (contentType.includes('png') || urlLower.includes('.png')) {
          extension = 'png';
        } else if (contentType.includes('jpeg') || contentType.includes('jpg') || urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
          extension = 'jpeg';
        } else if (contentType.includes('avif') || urlLower.includes('.avif')) {
          // AVIF needs to be converted to PNG/JPEG for ExcelJS
          extension = 'png';
        } else if (contentType.includes('webp') || urlLower.includes('.webp')) {
          extension = 'png';
        }

        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === "string") {
              // Get intrinsic width/height so we can keep aspect ratio in Excel
              const image = new Image();
              image.crossOrigin = 'anonymous';
              
              image.onload = () => {
                try {
                  let finalBase64 = result.split(",")[1];
                  let finalExtension = extension;
                  
                  // Convert AVIF/WebP to PNG using canvas if needed
                  const needsConversion = contentType.includes('avif') || contentType.includes('webp') || 
                      urlLower.includes('.avif') || urlLower.includes('.webp');
                  
                  if (needsConversion) {
                    const canvas = document.createElement('canvas');
                    canvas.width = image.width;
                    canvas.height = image.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(image, 0, 0);
                    
                    // Convert to PNG using Promise
                    canvas.toBlob((convertedBlob) => {
                      if (convertedBlob) {
                        const reader2 = new FileReader();
                        reader2.onloadend = () => {
                          const pngResult = reader2.result;
                          if (typeof pngResult === "string") {
                            const convertedBase64 = pngResult.split(",")[1];
                            resolve({
                              base64: convertedBase64,
                              width: image.width,
                              height: image.height,
                              extension: 'png',
                            });
                          } else {
                            resolve(null);
                          }
                        };
                        reader2.onerror = () => {
                          console.error("Error reading converted image");
                          resolve(null);
                        };
                        reader2.readAsDataURL(convertedBlob);
                      } else {
                        console.error("Failed to convert image to PNG");
                        resolve(null);
                      }
                    }, 'image/png');
                  } else {
                    // Use original format
                    resolve({
                      base64: finalBase64,
                      width: image.width,
                      height: image.height,
                      extension: finalExtension,
                    });
                  }
                } catch (e) {
                  console.error("Error processing image:", e);
                  resolve(null);
                }
              };
              
              image.onerror = (err) => {
                console.error("Error loading image:", err);
                resolve(null);
              };
              
              image.src = result;
            } else {
              resolve(null);
            }
          };
          reader.onerror = (err) => {
            console.error("Error reading image blob:", err);
            reject(err);
          };
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("Error fetching image for Excel:", e, url);
        return null;
      }
    }

    // Data rows with images
    const baseUrlForImages = "http://api-inventory.isavralabel.com/kayu-manis-properti";
    const pictureColumnIndex = 4; // "Picture" column

    for (let index = 0; index < items.length; index++) {
      const item = items[index];

      // Parse custom_column_values if it's a string
      const customValues = item.custom_column_values
        ? typeof item.custom_column_values === "string"
          ? JSON.parse(item.custom_column_values)
          : item.custom_column_values
        : {};

      const row = worksheet.addRow([
        index + 1,
        item.client_code || "-",
        item.km_code || "",
        "", // picture handled separately
        item.description || "",
        item.size_width ?? "",
        item.size_depth ?? "",
        item.size_height ?? "",
        item.packing_width ?? "",
        item.packing_depth ?? "",
        item.packing_height ?? "",
        item.color || "",
        item.qty ?? "",
        item.cbm_total ?? "",
        item.gross_weight_total ?? "",
        item.net_weight_total ?? "",
        item.total_gw_total ?? "",
        item.total_nw_total ?? "",
        item.fob || item.fob_price || "",
        item.fob_total_usd || item.fob_total || "",
        item.hs_code || "",
        ...customColumns.map((col) => customValues[col] || ""), // Add custom column values
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
          const fullUrl = `${baseUrlForImages}${item.picture_url}`;
          const imageInfo = await fetchImageInfo(fullUrl);
          if (imageInfo?.base64) {
            const imageId = workbook.addImage({
              base64: imageInfo.base64,
              extension: imageInfo.extension || "png", // Use detected extension
            });

            // Keep aspect ratio: scale image to fit within the cell
            // Column width 25 = approximately 187 pixels (at 96 DPI, 1 unit ≈ 7.5 pixels)
            // Limit image width to ~150 pixels to stay within column bounds with padding
            const maxImageWidth = 150; // pixels, to fit in column width 25
            const maxImageHeight = 50; // px, should fit in row height ~60
            let targetWidth = maxImageWidth;
            let targetHeight = maxImageHeight;
            
            if (imageInfo.width && imageInfo.height && imageInfo.width > 0 && imageInfo.height > 0) {
              const ratio = imageInfo.width / imageInfo.height;
              
              // Calculate dimensions maintaining aspect ratio
              // Try to fit by height first
              targetHeight = maxImageHeight;
              targetWidth = targetHeight * ratio;
              
              // If too wide, scale down by width instead
              if (targetWidth > maxImageWidth) {
                targetWidth = maxImageWidth;
                targetHeight = targetWidth / ratio;
              }
            }

            // Place image centered in the cell, with padding to prevent overflow
            worksheet.addImage(imageId, {
              tl: {
                col: pictureColumnIndex - 1 + 0.2, // More padding from left to prevent overflow
                row: rowIndex - 1 + 0.15,
              },
              ext: { width: targetWidth, height: targetHeight },
              editAs: "oneCell",
            });
          } else {
            console.warn(`Failed to load image for item ${item.km_code}: ${fullUrl}`);
          }
        } catch (error) {
          console.error(`Error adding image for item ${item.km_code}:`, error);
        }
      }
    }

    // Summary row
    const summaryRow = worksheet.addRow([
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      summary.totalCBM ?? "",
      summary.totalGrossWeight ?? "",
      summary.totalNetWeight ?? "",
      summary.totalGW ?? "",
      summary.totalNW ?? "",
      "",
      summary.totalUSD ?? "",
      "",
      ...Array(customColumns.length).fill(""), // Empty cells for custom columns in summary
    ]);

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

    worksheet.mergeCells(summaryRow.number, 1, summaryRow.number, 13);

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

    saveAs(blob, fileName);
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
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
          <button onClick={handleExportExcel} className="btn-secondary">
            <File className="w-4 h-4" />
            Export Excel
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
                Phone : +62-274-7471285, Fax : +62-274-412217
              </p>
              <p className="text-xs sm:text-sm text-gray-700">
                E-mail : cvkayumanis@hotmail.com
              </p>
              <p className="text-xs sm:text-sm text-[#800000]">
                www.kayumanis.asia
              </p>
            </div>
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
                  {order.volume ? `${order.volume} CBM` : summary.totalCBM}
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
                <span className="font-semibold text-gray-900">
                  {order.invoice_date
                    ? new Date(order.invoice_date).toLocaleDateString()
                    : order.created_at
                    ? new Date(order.created_at).toLocaleDateString()
                    : "-"}
                </span>
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
                    <td className="border border-gray-300 px-2 py-2 text-center font-medium">
                      {item.km_code}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.picture_url ? (
                        <img
                          src={`http://api-inventory.isavralabel.com/kayu-manis-properti${item.picture_url}`}
                          alt={item.description}
                          className="h-12 w-12 object-cover rounded mx-auto border border-gray-200"
                        />
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
                      {item.gross_weight_total || "-"}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.net_weight_total || "-"}
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
                    <td className="border border-gray-300 px-2 py-2 text-center font-medium">
                      <div>{item.fob_total_usd || item.fob_total || "-"}</div>
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
                    colSpan="13"
                  >
                    TOTAL
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {summary.totalCBM}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {summary.totalGrossWeight || "-"}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {summary.totalNetWeight || "-"}
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
                  <td className="border border-gray-300 px-2 py-2 text-center text-green-600">
                    <div>{summary.totalUSD}</div>
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
              {formatCurrency(summary.totalUSD, displayCurrency)}
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

        {/* Footer */}
        {/* <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          <p className="font-medium">Terms & Conditions</p>
          <p className="mt-2">
            Payment: T/T 30% deposit, 70% balance against copy of B/L
          </p>
          <p>Delivery: FOB port of loading</p>
          <p className="mt-4 text-xs">
            This document serves as both Packing List and Proforma Invoice
          </p>
        </div> */}
      </div>
    </div>
  );
};

export default ReportDetail;
