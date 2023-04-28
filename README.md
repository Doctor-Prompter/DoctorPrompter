# DoctorPrompter
Alexa Skill for Educational Quiz

## Introduction

This is a Computer Science Capstone Project that was completed by Joy Wilson and Angelica Golphin in Spring 2023 for Augusta University in partnership with Neesha Jahnai and Trey Walker. 

This is an Alexa skill that is an education quiz designed to help students prepare for the medical board exams. This skill uses JavaScript language. The database intergration is done through Airtable. 

## Creating Your Skill

If you are interested in downloading and installing this quiz, you will need to create an account at Amazon Development Console. Once you log in you will want to select "create skill, then you will enter the name of your skill and make sure you have selected English. On the next screen, you will choose "Games and Trivia" for your template, and choose "Start from scratch", and then click on the "Import skill" on the right hand side. You then add the GitHub repository here and it will download the code. 

At this point, the skill will build itself. You will go to the "build" tab and add the invocation name. This is the name that will open the skill. We used Doctor Prompter. Then you will click "save build" and then "build skill". Once you do this, go to the code tab and click "save" and then "deploy". Once you have done this, then the skill should be able to be tested under the "test" tab. Make sure you select development tab on the top of the page. At this point you can test the code. You will start the test by typing the invocation name you choose or using the microphone icon. From here you can interact within the entire code. 

### Database

This project uses the Airtable database since the clients were not programmers and we wanted something very user friendly. Our database can be found at https://airtable.com/invite/l?inviteId=invODZMPPl2hAiUOU&inviteToken=e7d05d1baa5afe834c944523fcb8d8938476ba5b8237779333e1ced742f3f832&utm_medium=email&utm_source=product_team&utm_content=transactional-alerts

This is a read only format. If you want to create your own database, you will need to create an Airtable account at airtable.com. Once you have logged in, you will need 4 columns; topic, question, answers, answer. You can enter this manually or import an excel document. The final column should be a multi-select column so that if there are multiple correct answers, they are stored in an array and this is the way it is read in the code. 

I have included a  tutorial pdf on adding the answers and topics slots in the Alexa build. Due to the way Alexa has their IDE setup, you have to enter what you think the user may say so everything you anticipate the user to say has to be stored in a slot. 

Also, if you are creating your own database, you are going to have to change the code in the skill to the correct database, authorization key, and the correct table ID. You can easily do this under the .env file in the project. You can find your correct keys and table ID on the dropdown menu nexgt to the datbase, table, or column respectively.

### Framework

This skill has a definite flow to it. Once the skill has been started, the user has the option to; hear all topics, select one topic, or study everything (all topics). Each of these types has its own handler. These handlers have their own intents within the build. Once the user answers the first question, then the checkAnswer Handler loops through until all the questions are asked. The skill will end when the amount of questions.length are exhausted. 

This skill could be easily adapted to other topics besides medical by changing the database information and updating the "answer" and "topic" slots in the build. You will also want to adult some of the strings.

### Persistence

Another table within the Airtable database is the persistence information. This shows all the users and their scores. The persistence stores the user's ID, how many correct questions answers, and how many questions asked. The code for the persistence is in the airtablePersistence.js file. There is also a reset game handler that will delete the user's information.
