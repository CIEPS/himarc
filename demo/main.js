import { mrkToObject, tokenizer, syntaxAnalyzer } from '../src/himarc.js';

const editor = document.getElementById('editor');
editor.addEventListener('keydown', event => {
  if (event.keyCode === 13) {
    document.execCommand('insertHTML', false, '\n');
    event.preventDefault();
  } else {
    updateEditor(event, 'bop');
  }
});
editor.innerHTML = '=044 \\\\$cFIN\n ';

export function openFile (event) {
  const input = event.target;
  const mrkTextarea = document.getElementById('record-mrk');
  const jsonTextArea = document.getElementById('record-json');
  const reader = new window.FileReader();
  reader.onload = function () {
    mrkTextarea.value = reader.result;
    jsonTextArea.value = JSON.stringify(mrkToObject(reader.result), null, 2);
  };
  reader.readAsText(input.files[0]);
}

export function refreshMrk (event) {
  const mrkTextarea = event.target;
  const jsonTextArea = document.getElementById('record-json');
  jsonTextArea.value = JSON.stringify(mrkToObject(mrkTextarea.value), null, 2);
}

// CONTENTEDITABLE
// workflow : User Inputs -> Parsing -> Rendering -> Set caret position

export function updateEditor (event, name) {
  const editor = event.target;
  const caretPosition = getCaretPosition(editor);
  const textContent = editor.innerText;
  const parsedContent = syntaxAnalyzer(tokenizer(textContent));
  editor.innerHTML = generateHTML(parsedContent.data);
  restoreSelection(editor, caretPosition);
}

function getCaretPosition (element) {
  const range = window.getSelection().getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  const caretOffset = preCaretRange.toString().length;
  return caretOffset;
}

function generateHTML (parsedContent) {
  return parsedContent.reduce((accumulator, current) => {
    if (['whitespace', 'eol'].includes(current.type)) {
      accumulator += current.value;
      return accumulator;
    }
    if (Array.isArray(current.value)) {
      const value = current.value.map(item => {
        return `<span class="${item.type}">${item.value}</span>`;
      }).join('');
      accumulator += value;
      return accumulator;
    }
    accumulator += `<span class="${current.type}">${current.value}</span>`;
    return accumulator;
  }, '');
}

function restoreSelection (editor, absoluteAnchorIndex) {
  const sel = window.getSelection();
  const textSegments = getTextSegments(editor);
  let anchorNode = editor;
  let anchorIndex = 0;
  let currentIndex = 0;
  textSegments.forEach(({ text, node }) => {
    const startIndexOfNode = currentIndex;
    const endIndexOfNode = startIndexOfNode + text.length;
    if (startIndexOfNode <= absoluteAnchorIndex && absoluteAnchorIndex <= endIndexOfNode) {
      anchorNode = node;
      anchorIndex = absoluteAnchorIndex - startIndexOfNode;
    }
    currentIndex += text.length;
  });
  sel.setPosition(anchorNode, anchorIndex);
}

function getTextSegments (element) {
  const textSegments = [];
  Array.from(element.childNodes).forEach((node) => {
    switch (node.nodeType) {
      case window.Node.TEXT_NODE:
        textSegments.push({ text: node.nodeValue, node });
        break;

      case window.Node.ELEMENT_NODE:
        textSegments.splice(textSegments.length, 0, ...(getTextSegments(node)));
        break;

      default:
        throw new Error(`Unexpected node type: ${node.nodeType}`);
    }
  });
  return textSegments;
}
