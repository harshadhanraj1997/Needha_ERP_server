async function submitOrder(conn, orderData, pdfFile) {
    try {
        // Handle PDF upload
        let pdfUrl = null;
        if (pdfFile) {
            try {
                // Create ContentVersion
                const contentVersion = await conn.sobject("ContentVersion").create({
                    Title: pdfFile.originalname || `Order_${orderData.orderInfo.partyCode}.pdf`,
                    PathOnClient: pdfFile.originalname || `Order_${orderData.orderInfo.partyCode}.pdf`,
                    VersionData: pdfFile.buffer.toString('base64'),
                    IsMajorVersion: true
                });

                if (contentVersion.success) {
                    // Get ContentDocumentId
                    const contentDocQuery = await conn.query(
                        `SELECT ContentDocumentId FROM ContentVersion WHERE Id = '${contentVersion.id}' LIMIT 1`
                    );

                    if (contentDocQuery.records.length > 0) {
                        // Create ContentDistribution
                        const contentDistribution = await conn.sobject("ContentDistribution").create({
                            ContentVersionId: contentVersion.id,
                            Name: `Public Distribution for Order ${orderData.orderInfo.partyCode}`,
                            PreferencesAllowViewInBrowser: true,
                            PreferencesLinkLatestVersion: true,
                            PreferencesNotifyOnVisit: false,
                            PreferencesPasswordRequired: false,
                            PreferencesAllowOriginalDownload: true
                        });

                        if (contentDistribution.success) {
                            const distributionQuery = await conn.query(
                                `SELECT ContentDownloadUrl FROM ContentDistribution WHERE Id = '${contentDistribution.id}' LIMIT 1`
                            );

                            if (distributionQuery.records.length > 0) {
                                pdfUrl = distributionQuery.records[0].ContentDownloadUrl;
                                console.log("Generated PDF URL:", pdfUrl);
                            }
                        }
                    }
                }
            } catch (uploadError) {
                console.error("Error creating content:", uploadError);
            }
        }

        // Fetch the related Party Ledger record using Party_Code__c
        const partyLedgerQuery = await conn.query(
            `SELECT Id, Orders__c FROM Party_Ledger__c WHERE Party_Code__c = '${orderData.orderInfo.partyCode}' LIMIT 1`
        );

        if (partyLedgerQuery.records.length === 0) {
            throw new Error(`No Party_Ledger__c record found for Party Code: ${orderData.orderInfo.partyCode}`);
        }

        const partyLedgerId = partyLedgerQuery.records[0].Id;
        let existingOrders = partyLedgerQuery.records[0].Orders__c || ""; // Get existing Orders__c field

        // Create Order record with Order_Id__c as Party_Code__c
        const orderRecord = {
            Name: orderData.orderInfo.partyCode, // Set Order Name as Party Code
            Party_Code__c: orderData.orderInfo.partyCode,
            Party_Name__c: orderData.orderInfo.partyName,
            Party_Ledger__c: partyLedgerId, // Link Order to Party Ledger
            Order_Id__c: orderData.orderInfo.partyCode, // Set Order ID as Party Code
            Category__c: orderData.orderInfo.category,
            Advance_Metal__c: orderData.orderInfo.advanceMetal,
            Purity__c: orderData.orderInfo.purity,
            Advance_Metal_Purity__c: orderData.orderInfo.advanceMetalPurity,
            Priority__c: orderData.orderInfo.priority,
            Delivery_Date__c: orderData.orderInfo.deliveryDate,
            Created_By__c: orderData.orderInfo.createdBy,
            Created_Date__c: orderData.orderInfo.orderDate,
            Pdf__c: pdfUrl
        };

        const orderResult = await conn.sobject("Order__c").create(orderRecord);
        if (!orderResult.success) {
            throw new Error(`Failed to create Order: ${orderResult.errors}`);
        }

        // Append new order to the existing Orders__c field
        let updatedOrders = existingOrders ? `${existingOrders},${orderResult.id}` : orderResult.id;

        // Update Party Ledger with new Order ID
        await conn.sobject("Party_Ledger__c").update({
            Id: partyLedgerId,
            Orders__c: updatedOrders // Update related Orders field in Party Ledger
        });

        console.log(`Updated Party_Ledger__c (${partyLedgerId}) with new Order ID: ${orderResult.id}`);

        // Create Order Items
        if (orderData.items && orderData.items.length > 0) {
            const orderItems = orderData.items.map(item => ({
                Name: item.category,
                Category__c: item.category,
                Weight_Range__c: item.weightRange,
                Size__c: item.size,
                Quantity__c: item.quantity,
                Remarks__c: item.remark,
                Order_items__c: orderResult.id
            }));

            const itemResults = await conn.sobject("Order_items__c").create(orderItems);
            
            const failedItems = itemResults.filter(result => !result.success);
            if (failedItems.length > 0) {
                throw new Error(`Failed to create some order items: ${JSON.stringify(failedItems)}`);
            }
        }

        return {
            success: true,
            recordId: orderResult.id,
            pdfUrl: pdfUrl
        };

    } catch (error) {
        console.error("Error in submitOrder:", error.message);
        throw new Error(`Error in submitOrder: ${error.message}`);
    }
}

module.exports = {
    submitOrder
};
