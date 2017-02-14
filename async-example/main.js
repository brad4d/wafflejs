class AnagramFinder {
  static createForElement(element) {
    assertTruthy(element);
    const inputForm =
        InputForm.createForElement(
            assertTruthy(element.querySelector('form'), 'form not found'));
    const outputDisplay =
        OutputDisplay.createForElement(
            assertTruthy(
                element.querySelector('.anagram-finder-output'),
                'output element not found'));
    const wordLookupService = new WordLookupService();
    return new AnagramFinder(inputForm, outputDisplay, wordLookupService);
  }

  constructor(inputForm, outputDisplay, wordLookupService) {
    this.inputForm_ = inputForm;
    this.outputDisplay_ = outputDisplay;
    this.wordLookupService_ = wordLookupService;
  }

  async run() {
    while (true) {
      let originalWord = await this.waitForNextWord();

      let potentialWords =
          Array.from(calculateStringPermutations(originalWord));
      this.resetOutputDisplay(originalWord, potentialWords);

      for (const potentialWord of potentialWords) {
        const response = await this.lookup(potentialWord);
        if (response.isAWord) {
          this.setIsAWord(potentialWord);
        } else {
          this.setIsNotAWord(potentialWord);
        }
      }
    }
  }

  async waitForNextWord() {
    const formData = await this.inputForm_.getNextInput();
    return formData.originalWord;
  }

  resetOutputDisplay(originalWord, potentialWords) {
    this.outputDisplay_.clear();
    this.outputDisplay_.setOriginalWord(originalWord);
    this.outputDisplay_.setPotentialWords(potentialWords);
  }

  async lookup(word) {
    return this.wordLookupService_.lookup(word);
  }

  setIsAWord(word) {
    this.outputDisplay_.setIsAWord(word);
  }

  setIsNotAWord(nonWord) {
    this.outputDisplay_.setIsNotAWord(nonWord);
  }
}


class InputForm {
  static createForElement(formElm) {
    assertTruthy(formElm);
    const originalWordElm = formElm.elements['original-word'];
    const submitButtonElm = formElm.elements['submit-button'];
    const inputForm =
        new InputForm(formElm, originalWordElm, submitButtonElm);
    inputForm.reset();
    inputForm.disable();
    return inputForm;
  }

  constructor(formElm, originalWordElm, submitButtonElm) {
    this.formElm_ = formElm;
    this.originalWordElm_ = originalWordElm;
    this.submitButtonElm_ = submitButtonElm;
  }

  reset() {
    this.originalWordElm_.value = '';
  }

  disable() {
    this.originalWordElm_.setAttribute('disabled', true);
    this.submitButtonElm_.setAttribute('disabled', true);
  }

  enable() {
    this.submitButtonElm_.removeAttribute('disabled');
    this.originalWordElm_.removeAttribute('disabled');
    this.originalWordElm_.focus();
  }

  getFormData() {
    return {
      originalWord: this.originalWordElm_.value
    };
  }

  async getNextInput() {
    this.reset();
    await this.enableAndWaitForSubmission();
    // this.disable();
    const inputData = this.getFormData();
    return inputData;
  }

  enableAndWaitForSubmission() {
    const promise = new Promise(
      (resolve) => {
        this.formElm_.addEventListener(
          'submit',
          (submitEvent) => {
            submitEvent.preventDefault(); // Don't reload page.
            resolve();
          },
          {'once': true});
      });
    this.enable();
    return promise;
  }
}

class OutputDisplay {
  static createForElement(elm) {
    const outputTitleElm = assertTruthy(elm.querySelector('.output-title'));
    const wordsElm = assertTruthy(elm.querySelector('.output-words'));
    const outputDisplay = new OutputDisplay(outputTitleElm, wordsElm);
    outputDisplay.clear();
    return outputDisplay;
  }

  constructor(outputTitleElm, wordsElm) {
    this.outputTitleElm_ = outputTitleElm;
    this.wordsElm_ = wordsElm;
    this.wordDisplay_ = new Map();
  }

  clear() {
    this.outputTitleElm_.innerHTML = '';
    this.wordsElm_.innerHTML = '';
    this.wordDisplay_.clear();
  }

  setOriginalWord(originalWord) {
    this.outputTitleElm_.innerText = originalWord;
  }

  setPotentialWords(words) {
    words.sort();
    for (const word of words) {
      this.wordDisplay_[word] =
          WordDisplay.createAndAddToElm(word, this.wordsElm_);
    }
  }

  setIsNotAWord(word) {
    this.wordDisplay_[word].setIsNotAWord();
  }

  setIsAWord(word) {
    this.wordDisplay_[word].setIsAWord();
  }
}

class WordDisplay {
  static createAndAddToElm(word, elm) {
    const wordSpan = document.createElement('span');
    if (elm.hasChildNodes()) {
      elm.appendChild(document.createTextNode(', '));
    }
    elm.appendChild(wordSpan);
    const wordDisplay = new WordDisplay(wordSpan);
    wordDisplay.setWord(word);
    wordDisplay.setUnknownStatus();
    return wordDisplay;
  }

  constructor(wordSpan) {
    this.wordSpan_ = wordSpan;
  }

  setWord(word) {
    this.wordSpan_.innerText = word;
  }

  setUnknownStatus() {
    this.wordSpan_.style.color = 'orange';
  }

  setIsNotAWord() {
    this.wordSpan_.style.color = 'red';
  }

  setIsAWord() {
    this.wordSpan_.style.color = 'green';
  }
}

class WordLookupService {
  lookup(word) {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'json'
    const promise = new Promise((resolve, reject) => {
      xhr.addEventListener('load', () => {
        resolve(xhr.response);
      });
    });
    xhr.open('GET', `/lookup?word=${word}`);
    xhr.send();
    return promise;
  }
}

function *calculateStringPermutations(s) {
  const charMultiSet = new MultiSet(s.split(/.*?/));
  for (const charArray of charMultiSet.permutations(charMultiSet)) {
    yield charArray.join('');
  }
}

class MultiSet {
  constructor(iterable = []) {
    this.valueCount_ = new Map();
    this.totalCount_ = 0;
    for (const value of iterable) {
      this.add(value);
    }
  }

  clone() {
    const newMultiSet = new MultiSet();
    newMultiSet.valueCount_ = new Map(this.valueCount_);
    newMultiSet.totalCount_ = this.totalCount_;
    return newMultiSet;
  }

  add(value) {
    this.valueCount_.set(value, this.getCount(value) + 1);
    this.totalCount_++;
  }

  delete(value) {
    const oldCount = this.getCount(value);
    if (oldCount == 0) {
      return false;
    } else {
      assertTruthy(oldCount > 0);
      if (oldCount == 1) {
        this.valueCount_.delete(value);
      } else {
        this.valueCount_.set(value, oldCount - 1)
      }
      this.totalCount_--;
      return true;
    }
  }

  getCount(value) {
    return this.valueCount_.get(value) || 0;
  }

  getSize() {
    return this.totalCount_;
  }

  *values() {
    for (const [value, count] of this.valueCount_.entries()) {
      for (let i = 0; i < count; ++i) {
        yield value;
      }
    }
  }

  *uniqueValues() {
    yield *this.valueCount_.keys();
  }

  isEmpty() {
    return this.valueCount_.size == 0;
  }

  *permutations() {
    if (this.isEmpty()) {
      yield [];
    } else {
      const uniqueValues = Array.from(this.uniqueValues());
      for (const v of uniqueValues) {
        this.delete(v);
        for (const p of this.permutations()) {
          yield [v].concat(p);
        }
        this.add(v);
      }
    }
  }
}

function assertTruthy(value, messageObject='assertion failed') {
  if (!!value) {
    return value;
  } else {
    throw new Error(String(messageObject));
  }
}

const anagramFinderElm =
    assertTruthy(document.querySelector('.anagram-finder'));
const anagramFinder = AnagramFinder.createForElement(anagramFinderElm);
anagramFinder.run();

/* vim: set shiftwidth=2 tabstop=2 expandtab : */
