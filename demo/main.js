import { mrkToObject, tokenizer, syntaxAnalyzer, toHTML } from '../src/himarc.js';

const inputFile = document.querySelector('input[type="file"]');
inputFile.addEventListener('change', openFile);
const textareaRecordMrk = document.getElementById('record-mrk');
textareaRecordMrk.addEventListener('change', refreshMrk);
const editor = document.getElementById('editor');
editor.addEventListener('keydown', event => {
  if (event.keyCode === 13) {
    document.execCommand('insertHTML', false, '\n=');
    event.preventDefault();
  }
});
editor.addEventListener('input', (event) => updateEditor(event.target));
editor.innerHTML = '=044 \\\\$cFIN$cENG';
updateEditor(editor);

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

export function updateEditor (element) {
  const editor = element;
  const caretPosition = getCaretPosition(editor);
  const textContent = editor.innerText;
  const parsedContent = syntaxAnalyzer(tokenizer(textContent));
  editor.innerHTML = toHTML(parsedContent.data);
  setCaretPosition(editor, caretPosition);
}

function getCaretPosition (element) {
  if (window.getSelection().rangeCount === 0) return null;
  const range = window.getSelection().getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  const caretOffset = preCaretRange.toString().length;
  return caretOffset;
}

function setCaretPosition (editor, absoluteAnchorIndex) {
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
