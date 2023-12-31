const morgan = require("morgan");
const fsr = require("file-stream-rotator");
const moment = require("moment-timezone");

const tz = "Asia/Calcutta";

morgan.token("host", function (req, res) {
  return req.hostname;
});

morgan.token("date", (req, res) => {
  return moment().tz(tz).format("YYYY-MM-DD HH:mm:ss");
});

let logsinfo = fsr.getStream({
  filename: "tmp/logs/log.%DATE%.txt",
  frequency: "120m",
  verbose: false,
  date_format: "DDMMYYYY",
});

const morganLogger = morgan(
  "[:date] :host :method :url :status - :response-time ms ",
  { stream: logsinfo }
);

module.exports = morganLogger;
