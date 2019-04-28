var tableMap = {
  'Start Time': 0,
  'End Time': 1,
  'What': 2,
  'Where': 3,
  'Lead': 4,
  'Helpers': 5,
  'Notes': 6
}

var tableMapByLetters = {
  'Start Time': 'A',
  'End Time': 'B',
  'What': 'C',
  'Where': 'D',
  'Lead': 'E',
  'Helpers': 'F',
  'Notes': 'G'
}

var SWS_RIDES = 'SWS Rides';
var TEXT_SENT = '[TEXT SENT]';
var FAILED_TO_SEND_TEXT = '[FAILED TO SEND TEXT]';


function formatAMPM(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ampm;
  return strTime;
}

function getRowByColumnAndValue(columnLabel, columnValue, values) {
  for (var i = 0; i < values.length; i++) {
    var currentRow = values[i];
    if (currentRow[tableMap[columnLabel]] === columnValue) {
      return {
        currentRow: currentRow,
        index: i
      };
    }
  }
}

function textOutRides() {
  // get tab
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("This Sunday");
  // This represents ALL the data
  var range = sheet.getDataRange();
  var values = range.getValues();
  Logger.log(range[0]);

  var swsRidesRowResults = getRowByColumnAndValue('What', SWS_RIDES, values);
  var swsRidesRow = swsRidesRowResults.currentRow;
  var swsRidesIndex = parseInt(swsRidesRowResults.index);
  var swsRidesRowNotes = swsRidesRow[tableMap['Notes']];
  var swsHelpers = swsRidesRow[tableMap['Helpers']];
  var dateForThisSunday = values[0][0]; // don't like this hard coded-ness but w.e.
  Logger.log(dateForThisSunday);
  Logger.log(swsRidesRow);
  
  // These start and end times, have no dates - so we want to purely extract out the time and apply the dateForThisSunday to it
  var startTime = swsRidesRow[tableMap['Start Time']];
  var endTime = swsRidesRow[tableMap['End Time']];
  var currentTime = new Date();

  var adjustedStartTime = new Date(
    dateForThisSunday.getFullYear(),
    dateForThisSunday.getMonth(),
    dateForThisSunday.getDate(),
    startTime.getHours(),
    startTime.getMinutes()
  );
  var adjustedEndTime = new Date(
    dateForThisSunday.getFullYear(),
    dateForThisSunday.getMonth(),
    dateForThisSunday.getDate(),
    endTime.getHours(),
    endTime.getMinutes()
  );
  // if current time is > adjustedStartTime and < end time
  // want to alert right at start time, then one more alert 5 mins later
  Logger.log('currentTime > adjustedStartTime');
  Logger.log(currentTime > adjustedStartTime);
  Logger.log('currentTime < adjustedEndTime');
  Logger.log(currentTime < adjustedEndTime);
  var alreadySent = swsRidesRowNotes.indexOf(TEXT_SENT) !== -1;
  var failedToSend = swsRidesRowNotes.indexOf(FAILED_TO_SEND_TEXT) !== -1;
  Logger.log('alreadySent');
  Logger.log(alreadySent);
  Logger.log(swsHelpers);
  const drivers = swsHelpers.split('\n').map(function(driverRowData) {
    if (!driverRowData.split(':').length || !driverRowData.split(':')[0] || !driverRowData.split(':')[1]) {
      return;
    }
    return { name: driverRowData.split(':')[1].trim(), location: driverRowData.split(':')[0].trim() };
  }).filter(function(data){
    if(data) {
      return true;
    }
    return false;
  });
  Logger.log('!!!!');
  Logger.log(drivers);
  Logger.log(formatAMPM(adjustedStartTime));

  if ((currentTime > adjustedStartTime && currentTime < adjustedEndTime) && !alreadySent && !failedToSend) {
    var data = {
      rides: {
        drivers: drivers
      },
      time: formatAMPM(adjustedStartTime)
    };
    Logger.log(data);
    var options = {
      'method' : 'post',
      'payload' : JSON.stringify(data),
      'contentType': 'application/json',
      muteHttpExceptions: true
    };

  Logger.log(JSON.stringify(data));
    var response = UrlFetchApp.fetch('https://us-central1-gpnj-rides-sms.cloudfunctions.net/reply', options);
    Logger.log('this is the log');
    Logger.log(response.getContentText());

    
    Logger.log(adjustedStartTime);
    Logger.log(adjustedEndTime);
    
    var notesCellRange = tableMapByLetters['Notes'] + (swsRidesIndex + 1); //offset by 1 bc index starts at 0, but sheet starts at 1
    Logger.log(notesCellRange);
    var cell = sheet.getRange(notesCellRange);
    var currentCellNotes = cell.getValue();

    if (response.getContentText().indexOf('Error') !== -1) {
      cell.setValue(currentCellNotes + FAILED_TO_SEND_TEXT);
    } else {
      cell.setValue(currentCellNotes + TEXT_SENT);
    }
  }
}
