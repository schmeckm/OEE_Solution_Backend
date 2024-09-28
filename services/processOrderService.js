const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const { dateSettings } = require("../config/config");

const PROCESS_ORDER_FILE = path.join(__dirname, "../data/processOrder.json");

// Hilfsfunktion zum Formatieren der Datumsfelder
const formatDates = (processOrder) => {
  const { dateFormat, timezone } = dateSettings;
  return {
    ...processOrder,
    Start: moment(processOrder.Start).tz(timezone).format(dateFormat),
    End: moment(processOrder.End).tz(timezone).format(dateFormat),
    ActualProcessOrderStart: processOrder.ActualProcessOrderStart
      ? moment(processOrder.ActualProcessOrderStart)
          .tz(timezone)
          .format(dateFormat)
      : null,
    ActualProcessOrderEnd: processOrder.ActualProcessOrderEnd
      ? moment(processOrder.ActualProcessOrderEnd)
          .tz(timezone)
          .format(dateFormat)
      : null,
  };
};

// Hilfsfunktion zum Laden der Prozessaufträge
const loadProcessOrders = () => {
  if (fs.existsSync(PROCESS_ORDER_FILE)) {
    const data = fs.readFileSync(PROCESS_ORDER_FILE, "utf8");
    const processOrders = JSON.parse(data);
    return processOrders.map(formatDates);
  } else {
    return [];
  }
};

// Hilfsfunktion zum Speichern der Prozessaufträge
const saveProcessOrders = (processOrders) => {
  const formattedOrders = processOrders.map(formatDates);
  fs.writeFileSync(
    PROCESS_ORDER_FILE,
    JSON.stringify(formattedOrders, null, 4)
  );
};

module.exports = {
  loadProcessOrders,
  saveProcessOrders,
};
