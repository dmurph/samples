var dataField = document.querySelector('#data');
var nameField = document.querySelector('#name');
var incrementButton = document.querySelector('#incrementButton');
var resetButton = document.querySelector('#resetButton');

var dataNumber = 0;
var db = null;
var dataKey = 'dataKey';

var setDataNumber = function(number) {
  dataNumber = number;
  dataField.innerHTML = dataNumber;
}

var observer = new IDBObserver(function(changes) {
  var originTab = changes.records.get('name')[0].key.lower;
  var dataChange = changes.records.get('data')[0];
  if (dataChange.type == 'clear') {
    ChromeSamples.log('Tab "' + originTab + '" reset the data to 0.');
    setDataNumber(0);
    return;
  }
  var newDataValue = changes.records.get('data')[0].value;
  ChromeSamples.log('Tab "' + originTab + '" set the data value to ' + newDataValue + '.');
  setDataNumber(newDataValue);
});

incrementButton.addEventListener('click', function(event) {
  if (db == null) {
    ChromeSamples.log('Database connection still openning.');
    return;
  }
  var transaction = db.transaction(['data', 'name'], 'readwrite');
  var dataStore = transaction.objectStore('data');
  var nameStore = transaction.objectStore('name');

  // We wait for the first success to signify we've been scheduled.
  var request = nameStore.put(nameField.innerHTML, nameField.innerHTML);
  request.onsuccess = function() {
    var newDataNumber = dataNumber + 1;
    dataStore.put(newDataNumber, dataKey);
    transaction.oncomplete = function() {
      setDataNumber(newDataNumber);
    }
  }
});

resetButton.addEventListener('click', function(event) {
  if (db == null) {
    ChromeSamples.log('Database connection still openning.');
    return;
  }
  var transaction = db.transaction(['data', 'name'], 'readwrite');
  var dataStore = transaction.objectStore('data');
  var nameStore = transaction.objectStore('name');

  nameStore.put(nameField.innerHTML, nameField.innerHTML);
  dataStore.clear();
  transaction.oncomplete = function() {
    setDataNumber(0);
  }
});

var openRequest = indexedDB.open('demoDB');
openRequest.onupgradeneeded = function() {
  openRequest.result.createObjectStore('name');
  openRequest.result.createObjectStore('data');
}
openRequest.onerror = function() {
  ChromeSamples.log('Error opening database: ', openRequest.error);
}
openRequest.onsuccess = function(event) {
  db = event.target.result;
  var transaction = db.transaction(['data', 'name'], 'readonly');
  // Observe starting after this transaction!
  // Note: Including values can be a performance hit if they are large.
  observer.observe(db, transaction, { operationTypes: ['put', 'clear'], values: true });

  var dataStore = transaction.objectStore('data');
  var getRequest = dataStore.get(dataKey);
  getRequest.onsuccess = function() {
    if (getRequest.result == undefined) {
      setDataNumber(0);
      ChromeSamples.log('Database is empty, starting at 0.');
      return;
    }
    setDataNumber(getRequest.result);
    ChromeSamples.log('Database has starting value of ' + getRequest.result + '.');
  }
}