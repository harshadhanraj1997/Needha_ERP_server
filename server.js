const bcrypt = require("bcrypt");
const express = require("express");
const jsforce = require("jsforce");
const multer = require("multer");
require("dotenv").config();
const { addJewelryModel } = require("./addjewlery");
const chrome = require('@puppeteer/browsers');
const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const chromium = require('@sparticuz/chromium');

const puppeteer = require('puppeteer-core');
// Middleware
app.use(express.json());

// Salesforce Connection
let conn;
let isConnected = false;

// Initialize Salesforce Connection
async function initializeSalesforceConnection() {
  try {
    conn = new jsforce.Connection({
      loginUrl: process.env.SALESFORCE_LOGIN_URL,
    });
    await conn.login(process.env.SALESFORCE_USERNAME, process.env.SALESFORCE_PASSWORD);
    isConnected = true;
    console.log("Connected to Salesforce");
  } catch (error) {
    console.error("Failed to connect to Salesforce:", error.message || error);
    process.exit(1);
  }
}
initializeSalesforceConnection();

// Middleware to check Salesforce connection
function checkSalesforceConnection(req, res, next) {
  if (!isConnected) {
    return res.status(500).json({ success: false, error: "Salesforce connection not established." });
  }
  next();
}

/** ----------------- User Authentication ------------------ **/

// Login Endpoint
app.post("/login", checkSalesforceConnection, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password are required." });
    }

    const query = `
      SELECT Id, Username__c, Password__c, Status__c
      FROM CustomUser__c
      WHERE Username__c = '${username}' LIMIT 1
    `;
    const result = await conn.query(query);

    if (result.records.length === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const user = result.records[0];
    if (user.Status__c !== "Active") {
      return res.status(403).json({ success: false, error: "User is inactive." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.Password__c);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: "Invalid password." });
    }

    res.json({ success: true, message: "Login successful", userId: user.Id });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

/** ----------------- Item Groups Management ------------------ **/

// Create Item Group
app.post("/add-item-group", checkSalesforceConnection, async (req, res) => {
  try {
    const { itemGroupName } = req.body;

    if (!itemGroupName) {
      return res.status(400).json({ success: false, error: "Item group name is required." });
    }

    const result = await conn.sobject("ItemGroup__c").create({ ItemGroupName__c: itemGroupName });
    if (result.success) {
      res.json({ success: true, message: "Item group created.", id: result.id });
    } else {
      res.status(500).json({ success: false, error: "Failed to create item group.", details: result.errors });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch Item Groups
app.get("/item-groups", checkSalesforceConnection, async (req, res) => {
  try {
    const query = `
      SELECT Id, ItemGroupName__c
      FROM ItemGroup__c
      ORDER BY ItemGroupName__c
    `;
    const result = await conn.query(query);

    if (result.records.length === 0) {
      return res.status(404).json({ success: false, message: "No item groups found." });
    }

    res.json({ success: true, data: result.records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** ----------------- Product Groups Management ------------------ **/

// Create Product Group
app.post("/add-product-group", checkSalesforceConnection, async (req, res) => {
  try {
    const { productGroupName } = req.body;

    if (!productGroupName) {
      return res.status(400).json({ success: false, error: "Product group name is required." });
    }

    const result = await conn.sobject("Product_Group__c").create({
      Name: productGroupName, // Assign productGroupName to the Name field
      ProductGroupName__c: productGroupName, // Assign productGroupName to the custom field
    });;
    if (result.success) {
      res.json({ success: true, message: "Product group created.", id: result.id });
    } else {
      res.status(500).json({ success: false, error: "Failed to create product group.", details: result.errors });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch Product Groups
app.get("/product-groups", checkSalesforceConnection, async (req, res) => {
  try {
    const query = `
      SELECT Id, ProductGroupName__c
      FROM Product_Group__c
      ORDER BY ProductGroupName__c
    `;
    const result = await conn.query(query);

    if (result.records.length === 0) {
      return res.status(404).json({ success: false, message: "No product groups found." });
    }

    res.json({ success: true, data: result.records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** ----------------- Size Groups Management ------------------ **/

// Create Size Group
app.post("/add-size-group", checkSalesforceConnection, async (req, res) => {
  try {
    const { sizeGroupName } = req.body;

    if (!sizeGroupName) {
      return res.status(400).json({ success: false, error: "Size group name is required." });
    }

    const result = await conn.sobject("jewlerysize__c").create({ Size__c: sizeGroupName });
    if (result.success) {
      res.json({ success: true, message: "Size group created.", id: result.id });
    } else {
      res.status(500).json({ success: false, error: "Failed to create size group.", details: result.errors });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch Size Groups
app.get("/size-groups", checkSalesforceConnection, async (req, res) => {
  try {
    const query = `
      SELECT Id, Size__c
      FROM jewlerySize__c
      ORDER BY Size__c
    `;
    const result = await conn.query(query);

    if (result.records.length === 0) {
      return res.status(404).json({ success: false, message: "No size groups found." });
    }

    res.json({ success: true, data: result.records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** ----------------- Jewelry Category Management ------------------ **/


app.post("/add-jewelry-category", checkSalesforceConnection, async (req, res) => {
    try {
      const {
        itemGroup = null,
        categoryName = null,
        categoryCode = null,
        productGroup = null,
        rate = null,
        hsn = null,
        maxOrderQty = null,
        size = null,
        color = null,
      } = req.body;
  
      // Validate mandatory fields (adjust based on your requirements)
      if (!categoryName || !categoryCode) {
        return res.status(400).json({
          success: false,
          error: "Category Name and Category Code are required fields.",
        });
      }
  
      // Create new JewelryCategory__c record
      const result = await conn.sobject("Jewelry_Category__c").create({
        ItemGroup__c: itemGroup,
        Name: categoryName,
        Category_Code__c: categoryCode,
        Product_Group__c: productGroup,
        Rate__c: rate,
        HSN__c: hsn,
        Max_Order_Qty__c: maxOrderQty,
        Size__c: size,
        Color__c: color,
      });
  
      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Jewelry category added successfully",
          id: result.id,
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to create jewelry category",
          details: result.errors,
        });
      }
    } catch (error) {
      console.error("Error adding jewelry category:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  });

  app.get("/Category-groups", checkSalesforceConnection, async (req, res) => {
    try {
      const query = `
        SELECT Id, Name
        FROM Jewelry_Category__c
        ORDER BY Name
      `;
      const result = await conn.query(query);
  
      if (result.records.length === 0) {
        return res.status(404).json({ success: false, message: "No Category groups found." });
      }
  
      res.json({ success: true, data: result.records });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

/** ----------------- Jewelry Model Management ------------------ **/

// Add Jewelry Model
app.post("/api/add-jewelry", upload.single("item-image"), async (req, res) => {
  try {
    console.log("Received a request to add a jewelry model");

    // Parse the request body
    let jewelryModelData, stoneDetailsData;
    try {
      jewelryModelData = JSON.parse(req.body.jewelryModel); // Parse jewelry model data
      stoneDetailsData = JSON.parse(req.body.stoneDetails); // Parse stone details data
      console.log("Parsed request body successfully:", { jewelryModelData, stoneDetailsData });
    } catch (parseError) {
      console.error("Error parsing request body:", parseError.message);
      return res.status(400).json({
        success: false,
        message: "Invalid request body. Failed to parse JSON.",
        error: parseError.message,
      });
    }

    // Validate the jewelry model data
    if (!jewelryModelData || Object.keys(jewelryModelData).length === 0) {
      console.error("Jewelry model data is missing or empty.");
      return res.status(400).json({
        success: false,
        message: "Jewelry model data is required.",
      });
    }

    console.log("Adding jewelry model:", jewelryModelData);

    // Add jewelry model to Salesforce with attachment
    const jewelryModelResult = await addJewelryModel(conn, jewelryModelData, req.file);

    if (!jewelryModelResult.success) {
      console.error("Failed to create Jewelry Model:", jewelryModelResult);
      return res.status(500).json({
        success: false,
        message: "Failed to create Jewelry Model",
        details: jewelryModelResult,
      });
    }

    const jewelryModelId = jewelryModelResult.recordId;
    console.log("Jewelry Model created successfully with ID:", jewelryModelId);

    // Process stone details
    if (Array.isArray(stoneDetailsData) && stoneDetailsData.length > 0) {
      console.log("Processing stone details:", stoneDetailsData);

      // Ensure required fields for stone details
      const requiredStoneFields = ["name", "type", "color", "size", "Quantity"];
      const invalidStones = stoneDetailsData.filter((stone) =>
        requiredStoneFields.some((field) => !stone[field])
      );

      if (invalidStones.length > 0) {
        console.error("Some stone details are invalid:", invalidStones);
        return res.status(400).json({
          success: false,
          message: "Some stone details are invalid. Missing required fields.",
          invalidStones,
        });
      }

      const stoneRecords = stoneDetailsData.map((stone) => ({
        Name: stone.name,
        Stone_Type__c: stone.type,
        Color__c: stone.color,
        Stone_Size__c: stone.size,
        Quantity__c: stone.Quantity,
        JewelryModel__c: jewelryModelId,
      }));

      console.log("Prepared stone records for insertion:", stoneRecords);

      // Insert stone details
      const stoneDetailsResult = await conn.sobject("Stone_Details__c").insert(stoneRecords);
      const failedStones = stoneDetailsResult.filter((result) => !result.success);

      if (failedStones.length > 0) {
        console.error("Some stone details failed to insert:", JSON.stringify(failedStones, null, 2));
        return res.status(500).json({
          success: false,
          message: "Failed to add some stone details",
          failedStones,
        });
      }

      console.log("All stone details added successfully.");
    } else {
      console.warn("No stone details provided or invalid data format.");
    }

    // Success response
    res.status(200).json({
      success: true,
      message: "Jewelry model and stone details added successfully",
      jewelryModelId,
      imageUrl: jewelryModelResult.imageUrl, // Get imageUrl from the jewelry model result
    });
  } catch (error) {
    console.error("Error processing request:", error.message);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error: error.message,
    });
  }
});

// Fetch jewelry models with an optional category filter
app.get("/api/jewelry-models", checkSalesforceConnection, async (req, res) => {
  try {
    console.log("Fetching jewelry models...");
    const { Category } = req.query;

    // First get the jewelry models
    let jewelryQuery = `
      SELECT Id, Name, Category__c, Material__c, Style__c, Color__c, Purity__c, 
             Master_Weight__c, Net_Weight__c, Stone_Weight__c, Rate__c, Image_URL__c, Size__c,Gross_Weight__c
      FROM Jewlery_Model__c
    `;

    if (Category) {
      jewelryQuery += ` WHERE Category__c = '${Category}'`;
    }
    jewelryQuery += ` ORDER BY Name`;

    const result = await conn.query(jewelryQuery);

    if (result.records.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No jewelry models found.",
      });
    }

    // Format the response data and pass the image URLs directly
    const responseData = result.records.map((model) => ({
      Id: model.Id,
      Name: model.Name,
      Category: model.Category__c,
      Material: model.Material__c,
      Style: model.Style__c,
      Color: model.Color__c,
      Purity: model.Purity__c,
      MasterWeight: model.Master_Weight__c,
      NetWeight: model.Net_Weight__c,
      StoneWeight: model.Stone_Weight__c,
      Rate: model.Rate__c,
      GrossWeight: model.Gross_Weight__c,
      Size :model.Size__c	,
      
      // Pass through the full distribution URL
      ImageURL: model.Image_URL__c || null
    }));

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching jewelry models:", error.message);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred.",
      error: error.message,
    });
  }
});

// Fetch customer Groups
app.get("/customer-groups", checkSalesforceConnection, async (req, res) => {
  try {
    const query = `
      SELECT Id,Party_Code__c
      FROM Party_Ledger__c
      ORDER BY Party_Code__c
    `;
    const result = await conn.query(query);

    if (result.records.length === 0) {
      return res.status(404).json({ success: false, message: "No customer groups found." });
    }

    res.json({ success: true, data: result.records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


/**----------------------Order Management---------------**/
app.post("/api/orders", async (req, res) => {
  try {
    console.log("Received a request to create an order");

    // Parse the request body
    let orderInfo, orderItems;
    try {
      orderInfo = req.body.orderInfo;
      orderItems = req.body.items;
      console.log("Parsed request data successfully:", { orderInfo, orderItems });
    } catch (parseError) {
      console.error("Error parsing request body:", parseError.message);
      return res.status(400).json({
        success: false,
        message: "Invalid request body. Failed to parse data.",
        error: parseError.message,
      });
    }

    // Validate the order information
    if (!orderInfo || Object.keys(orderInfo).length === 0) {
      console.error("Order information is missing or empty.");
      return res.status(400).json({
        success: false,
        message: "Order information is required.",
      });
    }

    // Validate order items
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      console.error("Order items are missing or empty.");
      return res.status(400).json({
        success: false,
        message: "At least one order item is required.",
      });
    }

    console.log("Creating order:", orderInfo);

    // Prepare order record for Salesforce
    const orderRecord = {
      Party_Code__c: orderInfo.partyCode,
      Party_Name__c: orderInfo.partyName,
      Order_Number__c: orderInfo.orderNo,
      Order_Date__c: orderInfo.orderDate,
      Product_Category__c: orderInfo.category,
      Advance_Metal__c: orderInfo.advanceMetal,
      Advance_Metal_Purity__c: orderInfo.advanceMetalPurity,
      Priority__c: orderInfo.priority,
      Delivery_Date__c: orderInfo.deliveryDate,
      Created_By_Name__c: orderInfo.createdBy,
    };

    // Create order in Salesforce
    const orderResult = await conn.sobject('Order__c').create(orderRecord);

    if (!orderResult.success) {
      console.error("Failed to create Order:", orderResult);
      return res.status(500).json({
        success: false,
        message: "Failed to create Order",
        details: orderResult,
      });
    }

    const orderId = orderResult.id;
    console.log("Order created successfully with ID:", orderId);

    // Process order items
    console.log("Processing order items:", orderItems);

    // Ensure required fields for order items
    const requiredItemFields = ["category", "weightRange", "size", "quantity"];
    const invalidItems = orderItems.filter((item) =>
      requiredItemFields.some((field) => !item[field])
    );

    if (invalidItems.length > 0) {
      console.error("Some order items are invalid:", invalidItems);
      return res.status(400).json({
        success: false,
        message: "Some order items are invalid. Missing required fields.",
        invalidItems,
      });
    }

    // Prepare order items records for Salesforce
    const orderItemRecords = orderItems.map((item) => ({
      Order__c: orderId,
      Category__c: item.category,
      Weight_Range__c: item.weightRange,
      Size__c: item.size,
      Quantity__c: parseInt(item.quantity),
      Remarks__c: item.remark || '',
    }));

    console.log("Prepared order item records for insertion:", orderItemRecords);

    // Insert order items
    const orderItemsResult = await conn.sobject("Order_Line_Item__c")
                                     .create(orderItemRecords);

    // Check if any items failed to insert
    const failedItems = Array.isArray(orderItemsResult) 
      ? orderItemsResult.filter((result) => !result.success)
      : [orderItemsResult].filter((result) => !result.success);

    if (failedItems.length > 0) {
      console.error("Some order items failed to insert:", JSON.stringify(failedItems, null, 2));
      return res.status(500).json({
        success: false,
        message: "Failed to add some order items",
        failedItems,
      });
    }

    console.log("All order items added successfully.");

    // Success response
    res.status(200).json({
      success: true,
      message: "Order and items added successfully",
      orderId,
      orderNumber: orderInfo.orderNo
    });

  } catch (error) {
    console.error("Error processing order request:", error.message);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while processing the order",
      error: error.message,
    });
  }
});



/**----------Order number Fetching------------- */

app.get('/api/getLastOrderNumber', checkSalesforceConnection, async (req, res) => {
  const { partyLedgerValue } = req.query;

  if (!partyLedgerValue) {
      return res.status(400).json({ 
          success: false, 
          message: 'partyLedgerValue is required' 
      });
  }

  try {
      // Query to fetch the latest order for the given PartyLedger
      const query = `
          SELECT Order_Id__c 
          FROM Order__c 
          WHERE Party_Ledger__c IN (
              SELECT Id 
              FROM Party_Ledger__c 
              WHERE Party_Code__c = '${partyLedgerValue}'
          ) 
          ORDER BY CreatedDate DESC 
          LIMIT 1
      `;

      const result = await conn.query(query);

      if (result.records.length === 0) {
          // No previous orders found, start from 0001
          return res.json({ 
              success: true, 
              lastOrderNumber: `${partyLedgerValue}/0000`
          });
      }

      const lastOrderNumber = result.records[0].Order_Id__c;
      res.json({ 
          success: true, 
          lastOrderNumber 
      });

  } catch (error) {
      console.error('Salesforce Query Error:', error);
      res.status(500).json({ 
          success: false, 
          message: 'Error fetching order number',
          error: error.message 
      });
  }
});

/**------------Pdf Gneration for Received order sheet---------- */



app.post('/api/generate-pdf', async (req, res) => {
  let browser = null;
  try {
      const { currentOrderInfo, orderItems } = req.body;

      browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: true,
          ignoreHTTPSErrors: true
      });

      const page = await browser.newPage();
      
      const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="UTF-8">
              <title>Needha Gold Order Received Sheet</title>
              <style>
                  body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                  .header { text-align: center; margin-bottom: 30px; padding: 10px; background-color: #f5f5f5; }
                  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                  th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; }
                  th { background-color: #f2f2f2; }
                  .section-title { font-size: 18px; font-weight: bold; margin: 20px 0; color: #333; }
                  .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
                  .signature-line { margin-top: 30px; border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; }
              </style>
          </head>
          <body>
              <div class="header">
                  <h1>Needha Gold Order Received Sheet</h1>
                  <p>Order Date: ${currentOrderInfo?.orderDate || '-'}</p>
              </div>

              <div class="section-title">Order Information</div>
              <table>
                  <tr><th>Party Code</th><td>${currentOrderInfo?.partyCode || '-'}</td><th>Party Name</th><td>${currentOrderInfo?.partyName || '-'}</td></tr>
                  <tr><th>Order No</th><td>${currentOrderInfo?.orderNo || '-'}</td><th>Category</th><td>${currentOrderInfo?.category || '-'}</td></tr>
                  <tr><th>Advance Metal</th><td>${currentOrderInfo?.advanceMetal || '-'}</td><th>Metal Purity</th><td>${currentOrderInfo?.advanceMetalPurity || '-'}</td></tr>
                  <tr><th>Priority</th><td>${currentOrderInfo?.priority || '-'}</td><th>Delivery Date</th><td>${currentOrderInfo?.deliveryDate || '-'}</td></tr>
                  <tr><th>Created By</th><td colspan="3">${currentOrderInfo?.createdBy || '-'}</td></tr>
              </table>

              <div class="section-title">Order Items</div>
              <table>
                  <thead>
                      <tr><th>Category</th><th>Weight Range</th><th>Size</th><th>Quantity</th><th>Remark</th></tr>
                  </thead>
                  <tbody>
                      ${Array.isArray(orderItems) ? orderItems.map(item => `
                          <tr>
                              <td>${item?.category || '-'}</td>
                              <td>${item?.weightRange || '-'}</td>
                              <td>${item?.size || '-'}</td>
                              <td>${item?.quantity || '0'}</td>
                              <td>${item?.remark || '-'}</td>
                          </tr>
                      `).join('') : '<tr><td colspan="5">No items available</td></tr>'}
                  </tbody>
              </table>

              <div class="signature-section">
                  <div><div class="signature-line">Customer Signature</div></div>
                  <div><div class="signature-line">Authorized Signature</div></div>
              </div>
          </body>
          </html>`;

      const pdfBuffer = await page.pdf({
          format: 'A4',
          margin: {
              top: '20px',
              right: '20px',
              bottom: '20px',
              left: '20px'
          },
          printBackground: true,
          preferCSSPageSize: true
      });

      await browser.close();

      // Set proper headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename=Needha_Gold_Order_${currentOrderInfo.orderNo}.pdf`);
      
      // Send buffer directly
      res.send(pdfBuffer);

  } catch (error) {
      console.error('Error generating PDF:', error);
      if (browser) await browser.close();
      res.status(500).json({ 
          success: false,
          error: error.message 
      });
  }
});
/** ----------------- Start the Server ------------------ **/

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
