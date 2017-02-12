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
    const definitionService = new DefinitionService();
    return new AnagramFinder(inputForm, outputDisplay, definitionService);
  }

  constructor(inputForm, outputDisplay, definitionService) {
    this.inputForm_ = inputForm;
    this.outputDisplay_ = outputDisplay;
    this.definitionService_ = definitionService;
  }

  async run() {
    while (true) {
      let originalWord = await this.waitForNextWord();

      let potentialWords =
          Array.from(calculateStringPermutations(originalWord));
      this.resetOutputDisplay(originalWord, potentialWords);

      for (const potentialWord of potentialWords) {
        const definition = await this.getDefinition(potentialWord);
        if (definition) {
          this.setDefinition(potentialWord, definition);
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

  async getDefinition(word) {
    return this.definitionService_.getDefinition(word);
  }

  setDefinition(word, definition) {
    this.outputDisplay_.setDefinition(word, definition);
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
    this.originalWordElm_.removeAttribute('disabled');
    this.submitButtonElm_.removeAttribute('disabled');
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
    const definitionListElm = assertTruthy(elm.querySelector('dl'));
    const outputDisplay = new OutputDisplay(outputTitleElm, definitionListElm);
    outputDisplay.clear();
    return outputDisplay;
  }

  constructor(outputTitleElm, definitionListElm) {
    this.outputTitleElm_ = outputTitleElm;
    this.definitionListElm_ = outputTitleElm;
    this.wordDisplay_ = new Map();
  }

  clear() {
    this.outputTitleElm_.innerHTML = '';
    this.definitionListElm_.innerHTML = '';
    this.wordDisplay_.clear();
  }

  setOriginalWord(originalWord) {
    this.outputTitleElm_.innerText = originalWord;
  }

  setPotentialWords(words) {
    words.sort();
    for (const word of words) {
      this.wordDisplay_[word] =
          WordDisplay.createAndAddToDefinitionList(
              word, this.definitionListElm_);
    }
  }

  setIsNotAWord(word) {
    this.wordDisplay_[word].setIsNotAWord();
  }
}

class WordDisplay {
  static createAndAddToDefinitionList(word, definitionListElm) {
    const dtElm = document.createElement('dt');
    const ddElm = document.createElement('dd');
    definitionListElm.appendChild(dtElm);
    definitionListElm.appendChild(ddElm);
    const wordDisplay = new WordDisplay(dtElm, ddElm);
    wordDisplay.setWord(word);
    wordDisplay.setUnknownStatus();
    return wordDisplay;
  }

  constructor(dtElm, ddElm) {
    this.dtElm_ = dtElm;
    this.ddElm_ = ddElm;
  }

  setWord(word) {
    this.dtElm_.innerText = word;
  }

  setUnknownStatus() {
    this.ddElm_.innerText = 'Unknown';
    this.ddElm_.setAttribute('style', 'color: orange;');
  }

  setIsNotAWord() {
    this.ddElm_.innerText = 'NOT A WORD';
    this.ddElm_.setAttribute('style', 'color: red;');
  }
}

class DefinitionService {
  getDefinition(word) {
    return Promise.resolve(null);
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
