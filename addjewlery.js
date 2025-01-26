async function addJewelryModel(conn, data, file) {
    try {
      let imageUrl = null;
  
      console.log("Received data:", data); // Log incoming data
      console.log("Received file:", file); // Log file details
  
      // Handle file upload if a file is provided
      if (file) {
        const fileBuffer = file.buffer;
        const fileName = file.originalname;
  
        console.log("Uploading file to Salesforce..."); // Debug file upload
        const contentVersion = await conn.sobject("ContentVersion").create({
          Title: fileName,
          PathOnClient: fileName,
          VersionData: fileBuffer.toString("base64"),
        });
  
        console.log("ContentVersion response:", contentVersion); // Log file upload response
  
        if (contentVersion.success) {
          const contentDocument = await conn.query(
            `SELECT ContentDocumentId FROM ContentVersion WHERE Id = '${contentVersion.id}'`
          );
  
          console.log("ContentDocument response:", contentDocument); // Log ContentDocument response
  
          if (contentDocument.records.length > 0) {
            const contentDocumentId = contentDocument.records[0].ContentDocumentId;
            imageUrl = `/sfc/servlet.shepherd/version/download/${contentDocumentId}`;
            console.log("Image URL:", imageUrl); // Log the generated image URL
          }
        }
      }
  
      // Prepare data for Salesforce
      const jewelryData = {
        Name :data["Model-name"],
        Item__c: data["item-group"],
        Design_Source__c: data["design-source"],
        Project__c: data["project"],
        Category__c: data["category"],
        Model_Name__c: data["Model-name"],
        Die_No__c: data["die-no"],
        Sketch_No__c: data["sketch-no"],
        Branch__c: data["branch"],
        Brand__c: data["brand"],
        Collection__c: data["collection"],
        Purity__c: data["purity"],
        Color__c: data["color"],
        Size__c: data["size"],
        Stone_Type__c: data["stone-type"],
        Style__c: data["style"],
        Shape__c: data["shape"],
        Stone_Setting__c: data["stone-setting"],
        Pieces__c: data["pieces"] ? parseInt(data["pieces"], 10) : null,
        Unit_Type__c: data["unit-type"],
        Rate__c: data["rate"] ? parseFloat(data["rate"]) : null,
        Minimum_Stock_Level__c: data["minimum-stock-level"]
          ? parseInt(data["minimum-stock-level"], 10)
          : null,
        Material__c: data["material"],
        Gender__c: data["gender"],
        Measurments__c: data["measurements"],
        Router__c: data["router"],
        Master_Weight__c: data["master-weight"] ? parseFloat(data["master-weight"]) : null,
        Wax_Piece__c: data["wax-piece-weight"] ? parseFloat(data["wax-piece-weight"]) : null,
        Creator__c: data["creator"],
        Gross_Weight__c: data["gross-weight"] ? parseFloat(data["gross-weight"]) : null,
        Stone_Weight__c: data["stone-weight"] ? parseFloat(data["stone-weight"]) : null,
        Net_Weight__c: data["net-weight"] ? parseFloat(data["net-weight"]) : null,
        Stone_Amount__c: data["stone-amount"] ? parseFloat(data["stone-amount"]) : null,
        Other_Weight__c: data["other-weight"] ? parseFloat(data["other-weight"]) : null,
        Other_Amount__c: data["other-amount"] ? parseFloat(data["other-amount"]) : null,
        Cad_Path__c: data["cad-path"],
        Location__c: data["location"],
        Image_URL__c: imageUrl,
      };
  
      console.log("Data sent to Salesforce:", jewelryData); // Log data before sending to Salesforce
  
      // Save data to Salesforce
      const result = await conn.sobject("Jewlery_Model__c").create(jewelryData);
  
      console.log("Salesforce Response:", result); // Log Salesforce response
  
      if (result.success) {
        return { success: true, recordId: result.id };
      } else {
        console.error("Salesforce Error:", result.errors); // Log Salesforce errors
        throw new Error(`Salesforce Error: ${result.errors}`);
      }
    } catch (error) {
      console.error("Error in addJewelryModel:", error.message); // Log any error
      throw new Error(`Error in addJewelryModel: ${error.message}`);
    }
  }
  
  module.exports = { addJewelryModel };
  