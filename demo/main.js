import { mrkToObject } from '../src/himarc.js';

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
