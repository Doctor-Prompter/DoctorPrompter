/***********************************************
 This is a Node.js module that provides functions for saving and loading session attributes to and from an Airtable database. 
 The module exports an object named AirtablePersistence, which contains two async functions: saveSessionAttributesToAirtable 
 and loadSessionAttributesFromAirtable.

The saveSessionAttributesToAirtable function takes a handlerInput parameter, which represents the input to the Alexa skill's 
request handler. It first retrieves the user's record from Airtable, using the userId from the handlerInput session object. 
If the user does not already have a record in the Airtable database, the function creates a new record. If the user does have 
a record, the function updates the existing record with the new session attributes.

The loadSessionAttributesFromAirtable function also takes a handlerInput parameter. It retrieves the user's record from 
Airtable using the userId from the handlerInput session object. If the user has a record, the function parses the record's 
fields to get the session attributes and sets them in the handlerInput attributes manager. If the user does not have a record, 
the function logs a message indicating that no session attributes were found for the user.

Both functions catch errors that occur during the database operations and log them to the console.

The module requires the dotenv package for loading environment variables from a .env file, and the airtable package for 
interacting with the Airtable database. It expects the following environment variables to be defined in the .env file: 
API_KEY (the Airtable API key), MD2B_BASE (the ID of the Airtable base), and USER_PERSISTENCE_TABLE (the name of the table 
in the base where user records are stored).

***********************************************/

require('dotenv').config();
const apiSecretKey = process.env.API_KEY;
const md2bBase = process.env.MD2B_BASE;
const userPersistenceTable = process.env.USER_PERSISTENCE_TABLE;

const Airtable = require('airtable');
const base = new Airtable({ apiKey: apiSecretKey }).base(md2bBase);

const AirtablePersistence = {
    async saveSessionAttributesToAirtable(handlerInput) {
        const userId = handlerInput.requestEnvelope.session.user.userId;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const currentDateTime = new Date().toISOString();

        try {
            // Retrieve the user's record from AirTable
            const records = await base(userPersistenceTable)
                .select({
                    filterByFormula: `{UserId} = '${userId}'`,
                    maxRecords: 1,
                })
                .firstPage();

            let userRecord;
            if (records.length === 0) {
                // Create a new record for the user that does not already exist in the airtable database
                const newRecord = await base(userPersistenceTable).create({
                    UserId: userId,
                    QuestionList: JSON.stringify([sessionAttributes.question]), //questions that have been asked
                    LastUpdated: currentDateTime,
                    Question: JSON.stringify(sessionAttributes.question),
                    Answer: JSON.stringify(sessionAttributes.answer),
                    IsTopicMode: sessionAttributes.isTopicMode,
                    Topic: JSON.stringify(sessionAttributes.topic),
                    Questions: JSON.stringify(sessionAttributes.questions), //list of all the questions for the selected topic
                    CurrentQuestionIndex: sessionAttributes.currentQuestionIndex,
                    HasNextQuestion: sessionAttributes.hasNextQuestion,
                    NextQuestion: JSON.stringify(sessionAttributes.nextQuestion),
                    CorrectAnswers: sessionAttributes.correctAnswers,
                    TotalQuestions: sessionAttributes.totalQuestions,
                    Score: `${sessionAttributes.correctAnswers}/${sessionAttributes.totalQuestions}`,
                });
                userRecord = newRecord;
            } else {
                // Use the existing record for the user
                userRecord = records[0];

                // Add the new question to the existing list
                const questionList = JSON.parse(userRecord.fields.QuestionList || "[]");
                questionList.push(sessionAttributes.question);

                // Update the session attribute to the user's record in Airtable
                await base(userPersistenceTable).update(userRecord.getId(), {
                    QuestionList: JSON.stringify(questionList), //questions that have been asked
                    LastUpdated: currentDateTime,
                    Question: JSON.stringify(sessionAttributes.question),
                    Answer: JSON.stringify(sessionAttributes.answer),
                    IsTopicMode: sessionAttributes.isTopicMode,
                    Topic: JSON.stringify(sessionAttributes.topic),
                    Questions: JSON.stringify(sessionAttributes.questions), //list of all the questions for the selected topic
                    CurrentQuestionIndex: sessionAttributes.currentQuestionIndex,
                    HasNextQuestion: sessionAttributes.hasNextQuestion,
                    NextQuestion: JSON.stringify(sessionAttributes.nextQuestion),
                    CorrectAnswers: sessionAttributes.correctAnswers,
                    TotalQuestions: sessionAttributes.totalQuestions,
                    Score: `${sessionAttributes.correctAnswers}/${sessionAttributes.totalQuestions}`,
                });
            }
            console.log('Updated session attributes for user', userId);
        } catch (error) {
            console.log('Error updating session attributes for user', userId, error);
        }
    },


    async loadSessionAttributesFromAirtable(handlerInput) {
        const userId = handlerInput.requestEnvelope.session.user.userId;

        try {
            // Retrieve the user's record from AirTable
            const records = await base(userPersistenceTable)
                .select({
                    filterByFormula: `{UserId} = '${userId}'`,
                    maxRecords: 1,
                })
                .firstPage();

            if (records.length === 1) {
                const userRecord = records[0];
                const sessionAttributes = {};

                // Parse the JSON strings to get the session attributes
                sessionAttributes.questionList = JSON.parse(userRecord.fields.QuestionList); //??
                sessionAttributes.question = JSON.parse(userRecord.fields.Question);
                sessionAttributes.answer = JSON.parse(userRecord.fields.Answer);
                sessionAttributes.isTopicMode = userRecord.fields.IsTopicMode;
                //sessionAttributes.topic = JSON.parse(userRecord.fields.Topic);
                sessionAttributes.questions = JSON.parse(userRecord.fields.Questions);
                sessionAttributes.currentQuestionIndex = userRecord.fields.CurrentQuestionIndex;
                sessionAttributes.hasNextQuestion = userRecord.fields.HasNextQuestion;
                sessionAttributes.nextQuestion = JSON.parse(userRecord.fields.NextQuestion);

                // Set the score object from the user record
                sessionAttributes.correctAnswers = userRecord.fields.CorrectAnswers || 0;
                sessionAttributes.totalQuestions = userRecord.fields.TotalQuestions || 0;
                const currentScore = `${sessionAttributes.correctAnswers}/${sessionAttributes.totalQuestions}`;
                const [correct, total] = currentScore.split('/');
                sessionAttributes.score = {
                    correct: parseInt(correct),
                    total: parseInt(total),
                };

                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

                console.log('Loaded session attributes from Airtable for user', userId);
            } else {
                console.log('No session attributes found in Airtable for user', userId);
            }
        } catch (error) {
            console.log('Error loading session attributes from Airtable for user', userId, error);
        }
    },
};

module.exports = AirtablePersistence;