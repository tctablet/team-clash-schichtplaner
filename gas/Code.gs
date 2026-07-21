// Google Apps Script – Team Clash Schichtplaner API
// Deploy: Web-App → Execute as me → Access: Anyone
//
// Sheet-Struktur (Wochenplanung):
//   "Generell"    → Zeile 1: Header (Name,Mo,Di,Mi,Do,Fr,Sa,So), Zeilen 2-11: Verfügbarkeit
//   "KW11-2026"   → Zeilen 1-11: Verfügbarkeit, Zeile 12: leer,
//                    Zeile 13: Plan-Header, Zeilen 14+: Schichtplan (Buchungen),
//                    Leerzeile, Support-Header, Support-Schichten (Tag/Person/Start/Ende)

var SHEET_ID = "1Xi4-IWvbKR5k3SIIW3moW0ShA44Obx_oDAHGfGAOm0g";
var AVAIL_HEADER = ["Name", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
var PLAN_HEADER = ["booking_code", "slot", "day", "moderator", "room", "aussenslot_start", "aussenslot_end"];
var SUPPORT_HEADER = ["day", "person", "start", "end"];

// ===== Entry Points =====

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    switch (action) {
      case "get_parsed_availability":
      case "get_availability":
        return respond(true, getAvailability(data.week));

      case "save_parsed_availability":
        saveAvailability(data.week, data.entries);
        return respond(true, "OK");

      case "save_single_availability":
        saveSingleAvailability(data.week, data.entry);
        return respond(true, "OK");

      case "get_week_plan":
        return respond(true, getWeekPlan(data.week));

      case "save_week_plan":
        saveWeekPlan(data.week, data.plan, data.support || []);
        return respond(true, "OK");

      case "get_schichtplaner_config":
        return respond(true, getConfig());

      case "get_team_codes":
        return respond(true, getTeamCodes());

      case "save_team_codes":
        saveTeamCodes(data.codes);
        return respond(true, "OK");

      default:
        return respond(false, "Unknown action: " + action);
    }
  } catch (err) {
    return respond(false, err.toString());
  }
}

function doGet() {
  return respond(false, "Use POST");
}

// ===== Response Helper =====

function respond(success, data) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: success, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== Sheet Helpers =====

function getSheet(tabName) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(tabName);
}

function getOrCreateSheet(tabName) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    sheet.getRange(1, 1, 1, AVAIL_HEADER.length).setValues([AVAIL_HEADER]);
    if (tabName !== "Generell") {
      sheet.getRange(13, 1, 1, PLAN_HEADER.length).setValues([PLAN_HEADER]);
    }
  }
  return sheet;
}

function getTabName(week) {
  if (!week || week === "GENERAL") return "Generell";
  return week; // "KW11-2026"
}

// ===== Availability =====

function getAvailability(week) {
  var sheet = getSheet(getTabName(week));
  if (!sheet) return [];

  var lastRow = Math.min(sheet.getLastRow(), 11);
  if (lastRow < 2) return [];

  var data = sheet.getRange(1, 1, lastRow, AVAIL_HEADER.length).getValues();
  var header = data[0];
  var entries = [];

  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var entry = {};
    for (var j = 0; j < header.length; j++) {
      entry[header[j]] = String(data[i][j] || "");
    }
    entries.push(entry);
  }

  return entries;
}

function saveAvailability(week, entries) {
  var sheet = getOrCreateSheet(getTabName(week));

  sheet.getRange(1, 1, 1, AVAIL_HEADER.length).setValues([AVAIL_HEADER]);

  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, 10, AVAIL_HEADER.length).clearContent();
  }

  if (entries && entries.length > 0) {
    var rows = entries.map(function (e) {
      return AVAIL_HEADER.map(function (h) { return e[h] || ""; });
    });
    sheet.getRange(2, 1, rows.length, AVAIL_HEADER.length).setValues(rows);
  }
}

function saveSingleAvailability(week, entry) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var existing = getAvailability(week);
    var found = false;

    for (var i = 0; i < existing.length; i++) {
      if (existing[i].Name === entry.Name) {
        existing[i] = entry;
        found = true;
        break;
      }
    }

    if (!found) {
      existing.push(entry);
    }

    saveAvailability(week, existing);
  } finally {
    lock.releaseLock();
  }
}

// ===== Week Plan =====

function getWeekPlan(week) {
  var sheet = getSheet(getTabName(week));
  if (!sheet) return { plan: [], support: [] };

  var lastRow = sheet.getLastRow();
  if (lastRow < 14) return { plan: [], support: [] };

  // Read actual column count from row 13 to handle legacy sheets with more columns
  var lastCol = sheet.getLastColumn();
  var allData = sheet.getRange(13, 1, lastRow - 12, lastCol).getDisplayValues();

  // Use the actual header from the sheet (row 13) for column mapping
  var sheetHeader = allData[0];

  // Parse plan entries until empty row or SUPPORT header
  var plan = [];
  var support = [];
  var supportStartRow = -1;

  for (var i = 1; i < allData.length; i++) {
    if (allData[i][0] === SUPPORT_HEADER[0] && allData[i][1] === SUPPORT_HEADER[1]) {
      supportStartRow = i;
      break;
    }
    if (!allData[i][0]) continue;
    var entry = {};
    for (var j = 0; j < sheetHeader.length; j++) {
      if (sheetHeader[j]) {
        entry[sheetHeader[j]] = allData[i][j] || "";
      }
    }
    plan.push(entry);
  }

  // Parse dedicated support section
  if (supportStartRow > 0) {
    for (var k = supportStartRow + 1; k < allData.length; k++) {
      if (!allData[k][0]) continue;
      var sEntry = {};
      for (var l = 0; l < SUPPORT_HEADER.length; l++) {
        sEntry[SUPPORT_HEADER[l]] = allData[k][l] || "";
      }
      support.push(sEntry);
    }
  }

  // Legacy fallback: extract support from inline plan fields
  if (support.length === 0) {
    var daySupport = {};
    for (var m = 0; m < plan.length; m++) {
      var p = plan[m];
      var sup = p.support || "";
      var day = p.day || "";
      if (sup && day && sup !== "null") {
        if (!daySupport[day]) {
          daySupport[day] = { day: day, person: sup, start: p.support_start || "", end: p.support_end || "" };
        }
      }
    }
    for (var d in daySupport) {
      support.push(daySupport[d]);
    }
    // Clean legacy fields from plan entries
    for (var n = 0; n < plan.length; n++) {
      delete plan[n].support;
      delete plan[n].support_start;
      delete plan[n].support_end;
    }
  }

  return { plan: plan, support: support };
}

function saveWeekPlan(week, plan, support) {
  var sheet = getOrCreateSheet(getTabName(week));

  // Clear everything from row 13 onwards
  var lastRow = sheet.getLastRow();
  var maxCols = Math.max(PLAN_HEADER.length, SUPPORT_HEADER.length);
  if (lastRow >= 13) {
    sheet.getRange(13, 1, lastRow - 12, maxCols).clearContent();
  }

  var currentRow = 13;

  // Write plan header + data
  sheet.getRange(currentRow, 1, 1, PLAN_HEADER.length).setValues([PLAN_HEADER]);
  currentRow = 14;

  if (plan && plan.length > 0) {
    var planRows = plan.map(function (e) {
      return PLAN_HEADER.map(function (h) { return e[h] || ""; });
    });
    sheet.getRange(currentRow, 1, planRows.length, PLAN_HEADER.length).setValues(planRows);
    currentRow += planRows.length;
  }

  // Empty row separator
  currentRow += 1;

  // Write support header + data
  sheet.getRange(currentRow, 1, 1, SUPPORT_HEADER.length).setValues([SUPPORT_HEADER]);
  currentRow += 1;

  if (support && support.length > 0) {
    var supportRows = support.map(function (e) {
      return SUPPORT_HEADER.map(function (h) { return e[h] || ""; });
    });
    sheet.getRange(currentRow, 1, supportRows.length, SUPPORT_HEADER.length).setValues(supportRows);
  }
}

// ===== Config =====

function getConfig() {
  return {
    team: [
      { name: "Sascha", role: "Head of Ops", max_hours: 40 },
      { name: "Alexa", role: "Teilzeit", max_hours: 20 },
      { name: "Quynh", role: "Teilzeit", max_hours: 20 },
      { name: "Vanessa", role: "Werkstudent", max_hours: 20 },
      { name: "Hannah", role: "Werkstudent", max_hours: 20 },
      { name: "Anvi", role: "Minijob", max_hours: 12 },
      { name: "Favour", role: "Minijob", max_hours: 12 },
      { name: "Jasmin", role: "Minijob", max_hours: 12 },
      { name: "Hamed", role: "Support", max_hours: 10 },
      { name: "Rehan", role: "Support", max_hours: 10 }
    ]
  };
}

// ===== Team Codes =====

var CODES_HEADER = ["Name", "Code"];

function getTeamCodes() {
  var sheet = getSheet("Codes");
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var data = sheet.getRange(1, 1, lastRow, CODES_HEADER.length).getValues();
  var entries = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    entries.push({ name: String(data[i][0]), code: String(data[i][1]) });
  }
  return entries;
}

function saveTeamCodes(codes) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName("Codes");
  if (!sheet) {
    sheet = ss.insertSheet("Codes");
  }

  // Clear and rewrite
  sheet.clear();
  sheet.getRange(1, 1, 1, CODES_HEADER.length).setValues([CODES_HEADER]);

  if (codes && codes.length > 0) {
    var rows = codes.map(function(c) {
      return [c.name || "", c.code || ""];
    });
    sheet.getRange(2, 1, rows.length, CODES_HEADER.length).setValues(rows);
  }
}
