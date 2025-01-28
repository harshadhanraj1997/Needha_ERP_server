async function addJewelryModel(conn, data, file) {
  try {
    // Create base jewelry data without image first
    const jewelryData = {
      Name: data["Model-name"],
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
      Location__c: data["location"]
    };

    // Create Jewelry Model record
    const modelResult = await conn.sobject("Jewlery_Model__c").create(jewelryData);
    
    if (!modelResult.success) {
      throw new Error(`Failed to create Jewelry Model: ${modelResult.errors}`);
    }

    let imageUrl = null;
    
    // Handle file upload if a file is provided
    if (file) {
      try {
        // Create attachment
        const attachment = {
          ParentId: modelResult.id,
          Name: file.originalname,
          Body: file.buffer.toString('base64'),
          ContentType: file.mimetype
        };

        const attachmentResult = await conn.sobject("Attachment").create(attachment);
        
        if (attachmentResult.success) {
          // Create base64 data URL
          imageUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          
          // Update the Jewelry Model with the attachment ID for reference
          await conn.sobject("Jewlery_Model__c").update({
            Id: modelResult.id,
            Image_URL__c: attachmentResult.id  // Store attachment ID for reference
          });
        }
      } catch (uploadError) {
        console.error("Error creating attachment:", uploadError);
        // Continue even if attachment fails
      }
    }
    
    return { 
      success: true, 
      recordId: modelResult.id, 
      imageUrl: imageUrl 
    };

  } catch (error) {
    console.error("Error in addJewelryModel:", error.message);
    throw new Error(`Error in addJewelryModel: ${error.message}`);
  }
}

module.exports = { addJewelryModel };