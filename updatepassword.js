const jsforce = require('jsforce');
const bcrypt = require('bcrypt');
require('dotenv').config();

const conn = new jsforce.Connection({
  loginUrl: process.env.SALESFORCE_LOGIN_URL,
});

async function updatePasswords() {
  try {
    await conn.login(process.env.SALESFORCE_USERNAME, process.env.SALESFORCE_PASSWORD);

    // Query all users in the CustomUser__c object
    const result = await conn.query(`SELECT Id__c	, Password_c__c FROM CustomUser_c__c`);
    for (const user of result.records) {
      console.log(`Processing user: ${user.Id}`);
      console.log(`Plain-text password: ${user.Password_c__c}`);

      // Skip users with no password set
      if (!user.Password_c__c) {
        console.error(`User ${user.Id} has no password to hash. Skipping...`);
        continue;
      }


      // Hash the plain-text password
      const hashedPassword = await bcrypt.hash(user.Password_c__c, 10);
      console.log(`Hashed password for user ${user.Id}: ${hashedPassword}`);

      // Update the user's password in Salesforce
      await conn.sobject('CustomUser_c__c').update({
        Id__c: user.Id__c,
        Password_c__c: hashedPassword,
      });


      console.log(`Updated password for user: ${user.Id}`);
    }

    console.log('All passwords updated successfully!');
  } catch (error) {
    console.error('Error updating passwords:', error);
  }
}

updatePasswords();
