// --- DOM ELEMENTS ---
const selectionContainer = document.getElementById('selection-container');
const startQuizForm = document.getElementById('start-quiz-form');
const vocabListSelect = document.getElementById('vocab-list-select');
const subListSelectorWrapper = document.getElementById('sub-list-selector-wrapper');
const subListSelect = document.getElementById('sub-list-select');
const quizBox = document.getElementById('quiz-box');
const completionScreen = document.getElementById('completion-screen');
const progressCounter = document.getElementById('progress-counter');
const questionPrompt = document.getElementById('question-prompt');
const questionTerm = document.getElementById('question-term');
const answerForm = document.getElementById('answer-form');
const answerInput = document.getElementById('answer-input');
const checkButton = document.getElementById('check-button');
const hintButton = document.getElementById('hint-button');
const feedbackMessage = document.getElementById('feedback-message');
const continuePrompt = document.getElementById('continue-prompt');
const restartButton = document.getElementById('restart-button');
const finalScore = document.getElementById('final-score');
const reviewSection = document.getElementById('review-section');
const wrongAnswersList = document.getElementById('wrong-answers-list');
const accentButtonsContainer = document.getElementById('accent-buttons');

// --- QUIZ STATE ---
let quizTerms = [], currentTerm = null, totalTermsInQuiz = 0, isWaitingForContinue = false, wronglyAnswered = [];
let lastWronglyAnswered = [];
const ACCENTS = ['à', 'â', 'é', 'è', 'ê', 'î', 'ô', 'û', 'ç'];

// --- SETUP FUNCTIONS ---
function populateVocabListsDropdown() {
    for (const key in vocabLists) {
        vocabListSelect.add(new Option(vocabLists[key].name, key));
    }
}

function updateSubListDropdown() {
    const selectedListKey = vocabListSelect.value;
    const selectedList = vocabLists[selectedListKey];
    
    // Clear previous options
    subListSelect.innerHTML = '';

    // Check if the selected list has categories
    if (selectedList && selectedList.categories) {
        subListSelectorWrapper.style.display = 'block';

        // Add an option to study all terms from the categories
        subListSelect.add(new Option('All Terms', 'all'));

        // Add an option for each category
        for (const categoryKey in selectedList.categories) {
            const categoryName = categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
            subListSelect.add(new Option(categoryName, categoryKey));
        }
    } else {
        // Hide the sub-list selector if no categories exist
        subListSelectorWrapper.style.display = 'none';
    }
}

function createAccentButtons() {
    ACCENTS.forEach((accent, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'accent-btn';
        button.dataset.char = accent;
        button.innerHTML = `<sup>${index + 1}</sup> ${accent}`;
        accentButtonsContainer.appendChild(button);
    });
}

function insertAccent(char) {
    const start = answerInput.selectionStart;
    const end = answerInput.selectionEnd;
    const text = answerInput.value;
    answerInput.value = text.substring(0, start) + char + text.substring(end);
    answerInput.focus();
    answerInput.setSelectionRange(start + 1, start + 1);
}

// --- EVENT HANDLERS ---
function handleAccentButtonClick(event) {
    const button = event.target.closest('.accent-btn');
    if (button) {
        insertAccent(button.dataset.char);
    }
}

function handleAccentShortcut(event) {
    const numKey = parseInt(event.key, 10);
    if (!isNaN(numKey) && numKey >= 1 && numKey <= ACCENTS.length) {
        event.preventDefault();
        insertAccent(ACCENTS[numKey - 1]);
    }
}

// --- QUIZ LOGIC ---
function handleQuizStart(event) {
    event.preventDefault();
    const selectedListKey = vocabListSelect.value;
    let selectedTerms;

    if (selectedListKey === 'review-wrong') {
        selectedTerms = lastWronglyAnswered;
    } else {
        const list = vocabLists[selectedListKey];
        if (list.categories) {
            const subListKey = subListSelect.value;
            if (subListKey === 'all') {
                // Combine all arrays from the categories into one
                selectedTerms = Object.values(list.categories).flat();
            } else {
                selectedTerms = list.categories[subListKey];
            }
        } else {
            // Fallback for lists without categories
            selectedTerms = list.terms;
        }
    }
    startGame(selectedTerms);
}

function startGame(selectedTerms) {
    if (!selectedTerms || selectedTerms.length === 0) return;
    quizTerms = [...selectedTerms];
    totalTermsInQuiz = selectedTerms.length;
    wronglyAnswered = [];
    selectionContainer.style.display = 'none';
    completionScreen.style.display = 'none';
    quizBox.style.display = 'block';
    nextQuestion();
}

function nextQuestion() {
    if (quizTerms.length === 0) {
        endGame();
        return;
    }
    isWaitingForContinue = false;
    feedbackMessage.innerHTML = '';
    continuePrompt.style.display = 'none';
    checkButton.textContent = 'Check';
    answerInput.disabled = false;
    hintButton.disabled = false;
    answerInput.value = '';
    progressCounter.textContent = `${totalTermsInQuiz - quizTerms.length + 1} / ${totalTermsInQuiz}`;
    
    const randomIndex = Math.floor(Math.random() * quizTerms.length);
    currentTerm = quizTerms[randomIndex];

    questionPrompt.textContent = 'What is the French for...';
    questionTerm.textContent = currentTerm.english;
    answerInput.focus();
}

function checkAnswer(event) {
    event.preventDefault();
    if (isWaitingForContinue) {
        nextQuestion();
        return;
    }
    const userAnswer = answerInput.value.trim();
    if (!userAnswer) return;

    const correctAnswer = currentTerm.french;
    const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();

    if (isCorrect) {
        feedbackMessage.innerHTML = `<span class="correct">Correct!</span>`;
        quizTerms = quizTerms.filter(term => term.french !== currentTerm.french || term.english !== currentTerm.english);
        answerInput.disabled = true;
        hintButton.disabled = true;
        setTimeout(nextQuestion, 700);
    } else {
        feedbackMessage.innerHTML = `<span class="incorrect">Incorrect. The answer is: <strong>${correctAnswer}</strong></span>`;
        if (!wronglyAnswered.some(term => term.french === currentTerm.french && term.english === currentTerm.english)) {
            wronglyAnswered.push(currentTerm);
        }
        isWaitingForContinue = true;
        answerInput.disabled = true;
        hintButton.disabled = true;
        checkButton.textContent = 'Continue';
        continuePrompt.style.display = 'block';
        checkButton.focus();
    }
}

function showHint() {
    if (!currentTerm || isWaitingForContinue) return;
    const answer = currentTerm.french;
    const firstLetter = answer.charAt(0);
    const hint = firstLetter + answer.substring(1).replace(/[^\s]/g, '_');
    const hintText = `Hint: It starts with '${firstLetter}'. (${hint})`;
    
    feedbackMessage.innerHTML = `<span class="hint-message">${hintText}</span>`;
    hintButton.disabled = true;
    answerInput.focus();
}

function endGame() {
    quizBox.style.display = 'none';
    lastWronglyAnswered = [...wronglyAnswered];
    const score = totalTermsInQuiz - wronglyAnswered.length;
    finalScore.textContent = `You got ${score} / ${totalTermsInQuiz} correct.`;

    const existingReviewOption = document.getElementById('review-option');
    if (existingReviewOption) {
        existingReviewOption.remove();
    }
    
    if (wronglyAnswered.length > 0) {
        wrongAnswersList.innerHTML = '';
        wronglyAnswered.forEach(term => {
            const listItem = document.createElement('li');
            listItem.textContent = `${term.french} — ${term.english}`;
            wrongAnswersList.appendChild(listItem);
        });
        reviewSection.style.display = 'block';

        const reviewOption = new Option(`Review My ${wronglyAnswered.length} Wrong Answers`, 'review-wrong');
        reviewOption.id = 'review-option';
        vocabListSelect.prepend(reviewOption);
    } else {
        reviewSection.style.display = 'none';
        finalScore.textContent += " Perfect score!";
    }
    completionScreen.style.display = 'flex';
}

function resetToSelection() {
    completionScreen.style.display = 'none';
    selectionContainer.style.display = 'block';
    
    if (lastWronglyAnswered.length > 0 && document.getElementById('review-option')) {
        vocabListSelect.value = 'review-wrong';
    } else {
        vocabListSelect.value = 'lesRapportsCh4';
    }
    // Update sub-list dropdown visibility on reset
    updateSubListDropdown();
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    populateVocabListsDropdown();
    createAccentButtons();
    // Set the initial state of the sub-list dropdown
    updateSubListDropdown(); 
    
    startQuizForm.addEventListener('submit', handleQuizStart);
    answerForm.addEventListener('submit', checkAnswer);
    hintButton.addEventListener('click', showHint);
    restartButton.addEventListener('click', resetToSelection);
    accentButtonsContainer.addEventListener('click', handleAccentButtonClick);
    answerInput.addEventListener('keydown', handleAccentShortcut);
    // Add event listener to update sub-list when main list changes
    vocabListSelect.addEventListener('change', updateSubListDropdown);
});
