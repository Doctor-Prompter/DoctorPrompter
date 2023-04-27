/*******************************
enviroment variables -- Angelica
*******************************/
require('dotenv').config();
const apiKey = process.env.API_KEY;
const md2bBase = process.env.MD2B_BASE;
const userPersistenceTable = process.env.USER_PERSISTENCE_TABLE;
//const dataTable = process.env.DATA_TABLE;


const Alexa = require('ask-sdk-core');
const axios = require('axios'); //NPM for database (I am going to use the Airtable API to clear up the code later)- Joy
const AirtablePersistence = require('./airtablePersistence'); // --Angelica

const messages = require('./messages.js'); //This will use messages.js file for the alternative Alexa sayings.


//Database using Airtable's API (3rd way) Joy
const Airtable = require('airtable');
const base = new Airtable({ apiKey: apiKey }).base(md2bBase);

//Acccess Database Joy 2nd way using Axios
const getData = {
    method: "get",
    baseURL: `https://api.airtable.com/v0/${md2bBase}/Data`,
    //url: "/tblcXsHBHtfWuIPhc/fldAG8ICacYxzlYwe",
    headers: { 'Authorization': `Bearer ${apiKey}` }
}

//This is the beginning and is complete. (except for persistence)
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        
        // Load session attributes from Airtable --Angelica
        await AirtablePersistence.loadSessionAttributesFromAirtable(handlerInput);
        //console.log('After setting session attributes: ', JSON.stringify(handlerInput.attributesManager.getSessionAttributes()));

        const speakOutput = `Welcome to Doctor Prompter; a virtual quiz for medical board exams. 
                            What topic would you like to study today? 
                            You can also say list of topics or study everything.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .withShouldEndSession(false)  //This fixes the Alexa shutting down.
            .getResponse();
    }
};

//Connected to database. Now need to take input from response and redirect to "studyonetopic". <- That is done.
const HearAllTopicsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HearAllTopicsIntent';
    },

    async handle(handlerInput) {
        let speakOutput = '';
        await axios(getData).then(response => {
            const rawSubjects = response.data.records.map(a => a.fields.Topic);
            const uniq = [...new Set(rawSubjects)].sort();
            const x = JSON.stringify(uniq, null, 2);
            speakOutput = `Your choices are ${x}... Which would you like to study?`;
        });

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .withShouldEndSession(false)  //This fixes the Alexa shutting down.
            .getResponse();
    }
};

//Function that is used to grab questions from the database.
async function getQuestions(topic) {
    const records = await base('Data').select().all();
    const questions = records.map(record => ({ question: record.get('Question'), answer: record.get('Answer'), topic: record.get('Topic') }));
    if (topic) { //This is for the StudyOneTopic Handler
        return questions.filter(q => q.topic === topic);
    } else { //This is for the StudyEverything handler.
        return questions;
    }
}

//This is done except for persistence
//This handler allows the session attributes to begin and the first question to be asked if the user chooses "Study Everything".
const StudyEverythingIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StudyEverythingIntent';
    },
async handle(handlerInput) {
        const questions = await getQuestions();
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        const speakOutput = `Here's your question: ${randomQuestion.question}`;
        console.log(`Study Everything Stored answer: ${randomQuestion.answer}`);

        const attributesManager = handlerInput.attributesManager;
        attributesManager.setSessionAttributes({
            question:randomQuestion.question, //store question
            answer: randomQuestion.answer,
            isTopicMode: false,  //not in OneTopic mode
            questions: questions, //Store all questions within the topic - may or may not be needed here
            currentQuestionIndex: 0, //initialize current question index to 0
            hasNextQuestion: questions.length > 1, //checks for next question
            nextQuestion: questions.length > 1 ? questions[1] : null, //how many questions
            score: { correct: 0, total: 0 }, // score property 
            correctAnswers: 0, // initialize correctAnswers to 0
            //totalQuestions: questions.length, // set totalQuestions to the number of questions
            totalQuestions: 5 // set to 5 for only 5 questions to be asked
           
        });

        const sessionAttributes = attributesManager.getSessionAttributes();
        console.log(JSON.stringify(sessionAttributes, null, 2));

        /***********************
        persistence -- Angelica
        ************************/
        AirtablePersistence.saveSessionAttributesToAirtable(handlerInput);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
   
//This handler allows the session attributes to begin and the first question to be asked if the user chooses "Study One Topic".
//This is very similiar to StudyEverything but pulls only the questions within the topic.
const StudyOneTopicIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StudyOneTopicIntent';
    },
    async handle(handlerInput) {
        const topic = Alexa.getSlotValue(handlerInput.requestEnvelope, 'topic');
        const questions = await getQuestions(topic);
        if (questions.length === 0) {
            const speakOutput = `Sorry, I don't have any questions on ${topic}. Please try another topic.`;
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        } else {
            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            sessionAttributes.questions = questions;
            sessionAttributes.currentQuestionIndex = 0;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            const question = questions[0];
            const speakOutput = `Here's your first question: ${question.question}`;
            console.log(`OneTopic Stored answer: ${question.answer}`);

            handlerInput.attributesManager.setSessionAttributes({
                topic: topic, //store topic
                question: question.question, //store question
                answer: question.answer, //store current question's answer
                isTopicMode: true, //In OneTopic mode
                questions: questions, //Store all questions within the topic
                currentQuestionIndex: 0,  //current question #
                hasNextQuestion: questions.length > 1, //checks for next question
                nextQuestion: questions.length > 1 ? questions[1] : null, //how many questions
                score: { correct: 0, total: 0 }, // score property 
                correctAnswers: 0, // initialize correctAnswers to 0
               // totalQuestions: questions.length // set totalQuestions to the number of questions
                totalQuestions: 5 // set to 5 for only 5 questions to be asked
            });

            /***********************
             persistence -- Angelica
            ************************/
            AirtablePersistence.saveSessionAttributesToAirtable(handlerInput);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        }
    }
};

// It doesn't matter which handler above the users start, the rest of the code "loops" through this handler until the quiz session is finished.
const CheckAnswerIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "CheckAnswerIntent"
        );
    },
    async handle(handlerInput) {
        const userAnswer = Alexa.getSlotValue(handlerInput.requestEnvelope, "answer");
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const storedAnswer = sessionAttributes.answer;
        let speakOutput = '';
        
        // User says I don't know.
        if (userAnswer.toLowerCase() === "i don't know") {
           
            // This strings allows for alternative sayings from Alexa.
            speakOutput += `${messages.iDontKnowAnswer()}. The correct answer is ${sessionAttributes.answer}.`;
           
            // This triggers if there are more questions stored in the session.
            if (sessionAttributes.hasNextQuestion) {
                const nextQuestion = sessionAttributes.nextQuestion;
             
               // This gives alternative sayings for next Question and then gives the next Question.
               speakOutput += ` ${messages.anotherQuestion()}: ${nextQuestion.question}.`;
                              
                if (sessionAttributes.currentQuestionIndex < sessionAttributes.totalQuestions) {
                    
                    sessionAttributes.currentQuestionIndex = sessionAttributes.currentQuestionIndex + 1;  //current question #
                    sessionAttributes.question = sessionAttributes.questions[sessionAttributes.currentQuestionIndex].question;
                    sessionAttributes.answer = sessionAttributes.questions[sessionAttributes.currentQuestionIndex].answer; 
                    
                    // If at the last question
                    if( sessionAttributes.currentQuestionIndex >= sessionAttributes.totalQuestions - 1){
                        sessionAttributes.hasNextQuestion = false; //checks for next question
                        sessionAttributes.nextQuestion = null; //how many questions
                    } 
                    // Else loop to the next question
                    else{
                        sessionAttributes.hasNextQuestion = true; //checks for next question
                        sessionAttributes.nextQuestion = sessionAttributes.currentQuestionIndex +1 < sessionAttributes.totalQuestions ? sessionAttributes.questions[sessionAttributes.currentQuestionIndex + 1] : null; //how many questions
                    } 
                } 
                
                /***********************
                persistence -- Angelica
                ************************/
                AirtablePersistence.saveSessionAttributesToAirtable(handlerInput);
                
            } 
            else
                {
                speakOutput += ` Unfortunately, there are no more questions. You answered ${sessionAttributes.correctAnswers} out of ${sessionAttributes.totalQuestions} questions correctly. Thank you for studying with Doctor Prompter!.`;
                }
                
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        } 
        // If storedAnswer is an array, check if userAnswer matches any of the elements in the array
        if (Array.isArray(storedAnswer)) {
            const isCorrect = storedAnswer.some(answer => answer.toLowerCase() === userAnswer.toLowerCase());
            
            if (isCorrect) {
               
               // Increment the number of correct answers and total questions asked
                sessionAttributes.correctAnswers = sessionAttributes.correctAnswers + 1;

                // This is where Alexa picks a random string for answer notification.
                speakOutput = messages.correctAnswer(); 

                // If there is a next question, ask it
                if (sessionAttributes.hasNextQuestion) {
                    const nextQuestion = sessionAttributes.nextQuestion;
                   
                    // This gives alternative sayings for next Question and then gives the next Question.
                    speakOutput += ` ${messages.anotherQuestion()}: ${nextQuestion.question}.`;
                    
                    attributesManager.setSessionAttributes(sessionAttributes); //I don't think I need this.
                    
                    if (sessionAttributes.currentQuestionIndex < sessionAttributes.totalQuestions) {
                    
                        sessionAttributes.currentQuestionIndex = sessionAttributes.currentQuestionIndex + 1;  //current question #
                        sessionAttributes.question = sessionAttributes.questions[sessionAttributes.currentQuestionIndex].question;
                        sessionAttributes.answer = sessionAttributes.questions[sessionAttributes.currentQuestionIndex].answer; 
                        
                        // If at the last question
                        if( sessionAttributes.currentQuestionIndex >= sessionAttributes.totalQuestions - 1){
                            sessionAttributes.hasNextQuestion = false; //checks for next question
                            sessionAttributes.nextQuestion = null; //how many questions
                        } 
                        // Else loop to the next question
                        else
                            {
                            sessionAttributes.hasNextQuestion = true; //checks for next question
                            sessionAttributes.nextQuestion = sessionAttributes.currentQuestionIndex +1 < sessionAttributes.totalQuestions ? sessionAttributes.questions[sessionAttributes.currentQuestionIndex + 1] : null; //how many questions
                            } 

                        /***********************
                        persistence -- Angelica
                        ************************/
                        AirtablePersistence.saveSessionAttributesToAirtable(handlerInput);
                        }
                    } 
                    else
                        {
                          speakOutput += ` Unfortunately, there are no more questions. You answered ${sessionAttributes.correctAnswers} out of ${sessionAttributes.totalQuestions} questions correctly. Thank you for studying with Doctor Prompter!.`;
                        } 
                    return handlerInput.responseBuilder
                        .speak(speakOutput)
                        .reprompt(speakOutput)
                        .getResponse();
					 
				} 
             
             else {
                // If the answer is incorrect, provide the correct answer and ask the next question (if any)
                const correctAnswer = storedAnswer.join(" or ");
                //speakOutput = `Sorry, thats incorrect. The correct answer is ${correctAnswer}.`;
                
                // This speakout tells the user the answer is incorrect and what the correct answer is with alternative sayings.
                speakOutput = ` ${messages.notCorrectAnswer()}. The correct answer is ${correctAnswer}.`;
                
                 // If there is a next question, ask it
                if (sessionAttributes.hasNextQuestion) {
                    const nextQuestion = sessionAttributes.nextQuestion;
                    //speakOutput += ` Your next question is... ${nextQuestion.question}`;
                   
                    // This gives alternative sayings for next Question and then gives the next Question.
                    speakOutput += ` ${messages.anotherQuestion()}: ${nextQuestion.question}.`;
                    
                    attributesManager.setSessionAttributes(sessionAttributes); //I don't think I need this.
                    
                    if (sessionAttributes.currentQuestionIndex < sessionAttributes.totalQuestions) {
                    
                        sessionAttributes.currentQuestionIndex = sessionAttributes.currentQuestionIndex + 1;  //current question #
                        sessionAttributes.question = sessionAttributes.questions[sessionAttributes.currentQuestionIndex].question;
                        sessionAttributes.answer = sessionAttributes.questions[sessionAttributes.currentQuestionIndex].answer; 
                        
                        // If at the last question
                        if( sessionAttributes.currentQuestionIndex >= sessionAttributes.totalQuestions - 1){
                            sessionAttributes.hasNextQuestion = false; //checks for next question
                            sessionAttributes.nextQuestion = null; //how many questions
                        } 
                        // Else loop to the next question
                        else
                            {
                            sessionAttributes.hasNextQuestion = true; //checks for next question
                            sessionAttributes.nextQuestion = sessionAttributes.currentQuestionIndex +1 < sessionAttributes.totalQuestions ? sessionAttributes.questions[sessionAttributes.currentQuestionIndex + 1] : null; //how many questions
                            } 

                        /***********************
                        persistence -- Angelica
                        ************************/
                        AirtablePersistence.saveSessionAttributesToAirtable(handlerInput);
                        } 
                    }
                    else
                        {
                          speakOutput += ` Unfortunately, there are no more questions. You answered ${sessionAttributes.correctAnswers} out of ${sessionAttributes.totalQuestions} questions correctly. Thank you for studying with Doctor Prompter!.`;
                        } 
                    return handlerInput.responseBuilder
                        .speak(speakOutput)
                        .reprompt(speakOutput)
                        .getResponse();
                	 
				 
            }
        
            // Answer is not correct
        } else {
            const NotCorrect = storedAnswer.toLowerCase() !== userAnswer.toLowerCase();
            if (NotCorrect) {
                
                
                const correctAnswer = storedAnswer;
                //speakOutput = `Sorry, thats incorrect. The correct answer is ${correctAnswer}.`;
                
                // This speakout tells the user the answer is incorrect and what the correct answer is with alternative sayings.
                speakOutput = ` ${messages.notCorrectAnswer()}. The correct answer is ${correctAnswer}.`;
				
				// If there is a next question, ask it
                if (sessionAttributes.hasNextQuestion) {
                    const nextQuestion = sessionAttributes.nextQuestion;
                    //speakOutput += ` Your next question is... ${nextQuestion.question}`;
                    
                    // This speakout tells the user the answer is incorrect and what the correct answer is with alternative sayings.
                speakOutput = ` ${messages.notCorrectAnswer()}. The correct answer is ${correctAnswer}.`;
                    
                    attributesManager.setSessionAttributes(sessionAttributes); //I don't think I need this.
                    
                    if (sessionAttributes.currentQuestionIndex < sessionAttributes.totalQuestions) {
                    
                        sessionAttributes.currentQuestionIndex = sessionAttributes.currentQuestionIndex + 1;  //current question #
                        sessionAttributes.question = sessionAttributes.questions[sessionAttributes.currentQuestionIndex].question;
                        sessionAttributes.answer = sessionAttributes.questions[sessionAttributes.currentQuestionIndex].answer; 
                        
                        // If at the last question
                        if( sessionAttributes.currentQuestionIndex >= sessionAttributes.totalQuestions - 1){
                            sessionAttributes.hasNextQuestion = false; //checks for next question
                            sessionAttributes.nextQuestion = null; //how many questions
                        } 
                        // Else loop to the next question
                        else
                            {
                            sessionAttributes.hasNextQuestion = true; //checks for next question
                            sessionAttributes.nextQuestion = sessionAttributes.currentQuestionIndex +1 < sessionAttributes.totalQuestions ? sessionAttributes.questions[sessionAttributes.currentQuestionIndex + 1] : null; //how many questions
                            } 

                        /***********************
                        persistence -- Angelica
                        ************************/
                        AirtablePersistence.saveSessionAttributesToAirtable(handlerInput);
                    }  
                    
            }  else
                        {
                          speakOutput += ` Unfortunately, there are no more questions. You answered ${sessionAttributes.correctAnswers} out of ${sessionAttributes.totalQuestions} questions correctly. Thank you for studying with Doctor Prompter!.`;
                        } 
                    return handlerInput.responseBuilder
                        .speak(speakOutput)
                        .reprompt(speakOutput)
                        .getResponse();
					 
            }	
				
        }    
        
       
    },
};


/*******************************
Reset Game -- Angelica

The handler checks if the user has any game data saved in a persistence table (using the Airtable API). If no 
data is found, it informs the user to start a new game. If data is found, it deletes the record and returns a 
success message to the user.
*******************************/
const ResetGameIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'ResetGameIntent';
    },
    async handle(handlerInput) {
        const userId = handlerInput.requestEnvelope.session.user.userId;

        try {
            const records = await base(userPersistenceTable).select({
                filterByFormula: `{userId} = '${userId}'`,
            }).firstPage();

            if (records.length === 0) {
                // Game data not found for this user
                const speakOutput = 'No game data found for your account. Please say "Open Doctor Prompter".';
                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .getResponse();
            }

            // Delete the game data record
            const record = records[0];
            await base(userPersistenceTable).destroy(record.id);

            console.log(`Game data for user ${userId} has been deleted.`);
            const speakOutput = 'The game has been reset. You can say "Open Doctor Prompter" or "Stop".';
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        } catch (err) {
            console.error(err);
            const speakOutput = 'Sorry, there was a problem resetting the game. Please try again later.';
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        }
    },
};


const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello World!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};


//This function will log all of the errors. Joy
const RequestLog = {
    process(handlerInput) {
        console.log("REQUEST ENVELOPE = " + JSON.stringify(handlerInput.requestEnvelope));
        return;
    }
};



/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HearAllTopicsIntentHandler,
        StudyEverythingIntentHandler,
        StudyOneTopicIntentHandler,
        CheckAnswerIntentHandler,
        ResetGameIntentHandler,
        HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(RequestLog)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();