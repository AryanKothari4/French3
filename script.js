// --- DOM ELEMENTS ---
const selectionContainer = document.getElementById('selection-container');
const startQuizForm = document.getElementById('start-quiz-form');
const vocabListSelect = document.getElementById('vocab-list-select');
const subListSelectorWrapper = document.getElementById('sub-list-selector-wrapper');
const categoryCheckboxesContainer = document.getElementById('category-checkboxes');
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
let activeAccents = []; // This will be populated dynamically

// --- SETUP FUNCTIONS ---
function populateVocabListsDropdown() {
    for (const key in vocabLists) {
        vocabListSelect.add(new Option(vocabLists[key].name, key));
    }
}

function updateCategoryCheckboxes() {
    const selectedListKey = vocabListSelect.value;
    const selectedList = vocabLists[selectedListKey];
    
    categoryCheckboxesContainer.innerHTML = '';

    if (selectedList && selectedList.categories) {
        subListSelectorWrapper.style.display = 'block';
        
        // Create "Select All" checkbox
        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'checkbox-item';
        selectAllDiv.innerHTML = `
            <input type="checkbox" id="select-all-checkbox" checked>
            <label for="select-all-checkbox">Select All</label>
        `;
        categoryCheckboxesContainer.appendChild(selectAllDiv);
        
        // Create a separator
        const separator = document.createElement('hr');
        separator.style.border = 'none';
        separator.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
        separator.style.margin = '8px 0';
        categoryCheckboxesContainer.appendChild(separator);
        
        // Create checkbox for each category
        for (const categoryKey in selectedList.categories) {
            const categoryName = categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
            const termCount = selectedList.categories[categoryKey].length;
            
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'checkbox-item';
            checkboxDiv.innerHTML = `
                <input type="checkbox" id="category-${categoryKey}" value="${categoryKey}" class="category-checkbox" checked>
                <label for="category-${categoryKey}">${categoryName} (${termCount})</label>
            `;
            categoryCheckboxesContainer.appendChild(checkboxDiv);
        }
        
        // Add event listener for "Select All"
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        selectAllCheckbox.addEventListener('change', handleSelectAllChange);
        
        // Add event listeners to individual checkboxes
        const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
        categoryCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', handleCategoryCheckboxChange);
        });
        
    } else {
        subListSelectorWrapper.style.display = 'none';
    }
}

function handleSelectAllChange(event) {
    const isChecked = event.target.checked;
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    categoryCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
    });
}

function handleCategoryCheckboxChange() {
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    const allChecked = Array.from(categoryCheckboxes).every(cb => cb.checked);
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = allChecked;
    }
}

function createAccentButtons(terms) {
    // Clear any previous buttons
    accentButtonsContainer.innerHTML = '';
    
    // Scan all French terms to find unique accented characters
    const allFrenchText = terms.map(term => term.french).join('');
    const accentSet = new Set(allFrenchText.match(/[àâéèêëîïôûüùçœ]/g));

    // If no accents are found, do nothing
    if (!accentSet || accentSet.size === 0) {
        activeAccents = [];
        return;
    }

    // Convert Set to a sorted array to ensure consistent order
    activeAccents = Array.from(accentSet).sort();

    // Create a button for each unique accent
    activeAccents.forEach((accent, index) => {
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
    // Use the dynamically generated activeAccents array for shortcuts
    if (!isNaN(numKey) && numKey >= 1 && numKey <= activeAccents.length) {
        event.preventDefault();
        insertAccent(activeAccents[numKey - 1]);
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
            // Get all checked categories
            const checkedCheckboxes = document.querySelectorAll('.category-checkbox:checked');
            
            if (checkedCheckboxes.length === 0) {
                alert('Please select at least one category.');
                return;
            }
            
            selectedTerms = [];
            checkedCheckboxes.forEach(checkbox => {
                const categoryKey = checkbox.value;
                selectedTerms = selectedTerms.concat(list.categories[categoryKey]);
            });
        } else {
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
    
    // Dynamically create accent buttons for this specific quiz set
    createAccentButtons(selectedTerms);
    
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
        // Default to the first list in the vocab file
        vocabListSelect.value = Object.keys(vocabLists)[0];
    }
    updateCategoryCheckboxes();
    // Clear out the accent buttons when returning to the menu
    accentButtonsContainer.innerHTML = '';
    activeAccents = [];
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    populateVocabListsDropdown();
    updateCategoryCheckboxes(); 
    
    startQuizForm.addEventListener('submit', handleQuizStart);
    answerForm.addEventListener('submit', checkAnswer);
    hintButton.addEventListener('click', showHint);
    restartButton.addEventListener('click', resetToSelection);
    accentButtonsContainer.addEventListener('click', handleAccentButtonClick);
    answerInput.addEventListener('keydown', handleAccentShortcut);
    vocabListSelect.addEventListener('change', updateCategoryCheckboxes);
});