var moment = require('moment-timezone');
var fs = require('fs');

exports.parseInteger = function (text) {
	if (text == '') return undefined;
	if (text == '#NV') return undefined;
	if (/[0-9]+/.test(text)) return parseInt(text, 10);
	console.error('Was für ein Integer ist "'+text+'"?');
}

exports.parseDateTime = function (date) {
	var m = moment.tz(date, 'DD.MM.YYYY HH:mm:ss', 'Europe/Zurich');
	if (!m.isValid()) console.log(date);
	return m.unix();
}

exports.decToHex = function (v, n) {
	var t = v.toString(16).toUpperCase();
	if (n && (t.length < n)) {
		t = ('0000000000000000'+t).substr(16+t.length-n);
	}
	return t;
}

exports.readListOfObjects = function (file) {
	file = fs.readFileSync(file, 'utf8').split('\n');
	var header = file.shift().split('\t');
	var list = file.map(function (line) {
		var obj = {};
		line.split('\t').forEach(function (value, index) {
			obj[header[index]] = value;
		})
		return obj;
	});
	return list;
}