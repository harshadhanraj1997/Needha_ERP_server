async function addJewelryModel(conn, data, file) {
  try {
    let imageUrl = null;

    // Handle file upload if a file is provided
    if (file) {
      try {
        // Create ContentVersion
        const contentVersion = await conn.sobject("ContentVersion").create({
          Title: file.originalname,
          PathOnClient: file.originalname,
          VersionData: file.buffer.toString('base64'),
          IsMajorVersion: true
        });

        console.log("ContentVersion created:", contentVersion);

        if (contentVersion.success) {
          // Get ContentDocumentId
          const contentDocQuery = await conn.query(
            `SELECT ContentDocumentId FROM ContentVersion WHERE Id = '${contentVersion.id}' LIMIT 1`
          );

          if (contentDocQuery.records.length > 0) {
            const contentDocumentId = contentDocQuery.records[0].ContentDocumentId;

            // Create ContentDistribution
            const contentDistribution = await conn.sobject("ContentDistribution").create({
              ContentVersionId: contentVersion.id,
              Name: `Public Distribution for ${file.originalname}`,
              PreferencesAllowViewInBrowser: true,
              PreferencesLinkLatestVersion: true,
              PreferencesNotifyOnVisit: false,
              PreferencesPasswordRequired: false,
              PreferencesAllowOriginalDownload: true
            });

            if (contentDistribution.success) {
              // Get the distribution URL
              const distributionQuery = await conn.query(
                `SELECT ContentDownloadUrl FROM ContentDistribution WHERE Id = '${contentDistribution.id}' LIMIT 1`
              );

              if (distributionQuery.records.length > 0) {
                imageUrl = distributionQuery.records[0].ContentDownloadUrl;
              }
            }
          }
        }
      } catch (uploadError) {
        console.error("Error creating content:", uploadError);
      }
    }

    // Create jewelry data
    const jewelryData = {
      Name: data["Model-name"],
      // ... (rest of your jewelry data fields)
      Image_URL__c: imageUrl  // Store the full URL
    };

    // Create Jewelry Model record
    const modelResult = await conn.sobject("Jewlery_Model__c").create(jewelryData);
    
    if (!modelResult.success) {
      throw new Error(`Failed to create Jewelry Model: ${modelResult.errors}`);
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