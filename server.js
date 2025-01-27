const bcrypt = require("bcrypt");
const express = require("express");
const jsforce = require("jsforce");
const multer = require("multer");
require("dotenv").config();
const { addJewelryModel } = require("./addjewlery");

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });

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

    const result = await conn.sobject("JewelrySize__c").create({ Size__c: sizeGroupName });
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
      FROM JewlerySize__c
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

    // Add the jewelry model
    let jewelryModelResult;
    try {
      jewelryModelResult = await addJewelryModel(conn, jewelryModelData, req.file);
      console.log("Jewelry model creation result:", jewelryModelResult);
    } catch (dbError) {
      console.error("Error creating jewelry model:", dbError.message);
      return res.status(500).json({
        success: false,
        message: "Failed to create Jewelry Model",
        error: dbError.message,
      });
    }

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

    // Validate and process stone details
    if (Array.isArray(stoneDetailsData) && stoneDetailsData.length > 0) {
      console.log("Processing stone details:", stoneDetailsData);

      // Ensure required fields for stone details
      const requiredStoneFields = ["name", "type", "color", "size"];
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
        Name: stone.name, // Adjust field names as per database schema
        Stone_Type__c: stone.type,
        Color__c: stone.color,
        Stone_Size__c: stone.size,
        JewelryModel__c: jewelryModelId, // Associate with the jewelry model
      }));

      console.log("Prepared stone records for insertion:", stoneRecords);

      // Insert stone details
      let stoneDetailsResult;
      try {
        stoneDetailsResult = await conn.sobject("Stone_Details__c").insert(stoneRecords);
        console.log("Stone details insertion result:", stoneDetailsResult);
      } catch (dbError) {
        console.error("Error inserting stone details:", dbError.message);
        return res.status(500).json({
          success: false,
          message: "Failed to insert stone details",
          error: dbError.message,
        });
      }
      
      // Check for errors in inserting stone details
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

    // Return success response
    res.status(200).json({
      success: true,
      message: "Jewelry model and stone details added successfully",
      jewelryModelId,
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


/** ----------------- cutomer Groups Management ------------------ **/

// Create cutomer Group
app.post("/add-cutomer-group", checkSalesforceConnection, async (req, res) => {
  try {
    const { cutomerGroupName, cutomerGroupCode } = req.body;

    if (!cutomerGroupName) {
      return res.status(400).json({ success: false, error: "cutomer group name is required." });
    }

    const result = await conn.sobject("Party_Ledger__c").create({
      Name: cutomerGroupName, // Assign cutomerGroupName to the Name field
      Party_Code__c: cutomerGroupCode, // Assign cutomerGroupName to the custom field
    });;
    if (result.success) {
      res.json({ success: true, message: "cutomer group created.", id: result.id });
    } else {
      res.status(500).json({ success: false, error: "Failed to create cutomer group.", details: result.errors });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch cutomer Groups
app.get("/cutomer-groups", checkSalesforceConnection, async (req, res) => {
  try {
    const query = `
      SELECT Id, cutomerGroupName__c,Party_Code__c
      FROM cutomer_Group__c
      ORDER BY cutomerGroupName__c
    `;
    const result = await conn.query(query);

    if (result.records.length === 0) {
      return res.status(404).json({ success: false, message: "No cutomer groups found." });
    }

    res.json({ success: true, data: result.records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});



/** ----------------- Start the Server ------------------ **/

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
