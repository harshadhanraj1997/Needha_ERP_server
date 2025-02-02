async function submitOrder(conn, orderData, pdfFile) {
    try {
        let pdfUrl = null;

        if (pdfFile) {
            try {
                // Create ContentVersion for PDF
                const contentVersion = await conn.sobject("ContentVersion").create({
                    Title: pdfFile.originalname || `Order_${orderData.orderInfo.orderNo}.pdf`,
                    PathOnClient: pdfFile.originalname || `Order_${orderData.orderInfo.orderNo}.pdf`,
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
                            Name: `Public Distribution for Order ${orderData.orderInfo.orderNo}`,
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

        // Create order data with the PDF URL
        const orderRecord = {
            Name :orderData.orderInfo.orderNo,
            Party_Code__c: orderData.orderInfo.partyCode,
            Party_Name__c: orderData.orderInfo.partyName,
            Order_Id__c: orderData.orderInfo.orderNo,
            Category__c: orderData.orderInfo.category,
            Advance_Metal__c: orderData.orderInfo.advanceMetal,
            Purity__c: orderData.orderInfo.purity,
            Advance_Metal_Purity__c: orderData.orderInfo.advanceMetalPurity,
            Priority__c: orderData.orderInfo.priority,
            Delivery_Date__c: orderData.orderInfo.deliveryDate,
            Created_By__c: orderData.orderInfo.createdBy,
            Created_Date__c : orderData.orderInfo.orderDate,
            Pdf__c: pdfUrl
        };

        const orderResult = await conn.sobject("Order__c").create(orderRecord);

        if (!orderResult.success) {
            throw new Error(`Failed to create Order: ${orderResult.errors}`);
        }

        // Create order items
        if (orderData.items && orderData.items.length > 0) {
            const orderItems = orderData.items.map(item => ({
                Name :item.category,
                Category__c: item.category,
                Weight_Range__c: item.weightRange,
                Size__c: item.size,
                Quantity__c: item.quantity,
                Remarks__c: item.remark,
                Order_items__c: orderResult.id 
            }));

            const itemResults = await conn.sobject("Order_items__c").create(orderItems);
            
            // Check if any items failed to create
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

module.exports = { submitOrder };