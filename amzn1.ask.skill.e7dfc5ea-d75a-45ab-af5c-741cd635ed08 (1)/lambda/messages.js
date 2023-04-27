/* This have been implemented so that Alexa will be less robotic and more human-like and choose different strings to communicate with the user.
*/

const correctAnswer = () => {
    const correct = [
    "That is correct!",
    "Great job!",
    "Awesome!", 
    "You are right!",
    "You will be a doctor before you know it!",
    "You got it!",
    "Congratulations, that's the right answer!",
    "Excellent, that's the correct answer!",
    "Yes, that's the correct answer!"
    ];
    const random = getRandom(0, correct.length -1);
    return correct[random];
};

const notCorrectAnswer = () => {
    const notCorrect = [
    "That is incorrect.",
    "Sorry",
    "Better luck next time.",
    "I am sorry but that is not the right answer.",
    "It looks like you need to study this question some more.",
    "I'm afraid your answer is incorrect.",
    "Hmm, that's not it.",
    "Oops, that's not quite right.",
    "Unfortunately, that's incorrect.",
    "Sorry, that's not the right answer."
    ]; 
    const random = getRandom(0, notCorrect.length -1);
    return notCorrect[random];
};

const iDontKnowAnswer = () => {
    const iDontKnow = [
        "No Problem.",
        "That's ok, we have plenty of questions to go through.",
        "Let's move on.",
        "That's okay, sometimes it's hard to remember everything.",
        "It's ok.",
        "At least you know where you need to study"
        ];
        const random = getRandom(0, iDontKnow.length -1);
        return iDontKnow[random];
};

const anotherQuestion = () => {
    const nextQuest = [
        "Here's your next question...",
        "Your next question is...",
        "Let's see if you know the answer to this one...",
        "Next up is the question...",
        "The following question is...",
        "The quiz continues with this question..."
        ];
        const random = getRandom(0, nextQuest.length -1);
        return nextQuest[random];
}


function getRandom(min, max)
{
    return Math.floor(Math.random() * (max-min+1)+min);
}

module.exports = {
    correctAnswer,
    notCorrectAnswer,
    iDontKnowAnswer,
    anotherQuestion
};