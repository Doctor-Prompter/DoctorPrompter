//Setting up the database Joy
const request = require('axios');
const axios = require('axios');
// BASE_ID = 'appCnuw6WiqqUBQFN'; //database id
// TABLE_ID = 'tblcXsHBHtfWuIPhc'; //table id within the database
// API_KEY = 'key3DcgyUwEFCuAxZ'; //security code. Not sure if this is a security issue but not sure where else to place or access.

//Get Access to Airtable Database Joy
function getAirtable() {
    return new Promise((resolve, reject) => {
        request({
            method: "get",
            baseurl: "https://api.airtable.com/v0/appCnuw6WiqqUBQFN/Data", //website to access database
            headers: {'Authorization': 'Bearer key3DcgyUwEFCuAxZ'},
            jason: true
        }, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                resolve(body);
            } else
                reject("Questions cannot be accessed"); //Database not available
        });
    });
}

async function testAirtable() {
    const record = await getAirtable()
    console.log('The first question is : $(record.records[0].fields.Question)');
    console.log("The first answer is : $(record.records[0].fields.Answer)");
}

testAirtable()