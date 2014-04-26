var fs = require('fs');
var utils = require('./modules/utils');

exports.import = function (filename, config) {
	console.log('Parse VDS');

	var result = [];

	var lines = fs.readFileSync(filename, 'utf8').split('\n');
	var header = lines.shift().split('\t').map(function (field) { return field.replace(/[^a-z_]+/gi,'') });

	lines.forEach(function (line) {
		if (/^\t*$/.test(line)) return;
		
		line = line.split('\t');
		var event = {
			data: {}
		};
		var data = event.data;
		header.forEach(function (field, index) {
			data[field] = line[index];
		})

		event.timeDuration     = utils.parseInteger(data.chargeable_dur);
		
		event.timeStart        = utils.parseDateTime(data.start_dt + ' ' + data.start_tm);
		event.timeEnd          = event.timeStart + event.timeDuration;

		data.orig_LAC          = utils.parseInteger(data.orig_LAC);
		data.orig_cell_cd      = utils.parseInteger(data.orig_cell_cd);
		data.orig_cell_x       = utils.parseInteger(data.orig_cell_x);
		data.orig_cell_y       = utils.parseInteger(data.orig_cell_y);
		data.orig_cell_azimuth = utils.parseInteger(data.orig_cell_azimuth);
		
		data.term_LAC          = utils.parseInteger(data.term_LAC);
		data.term_cell_cd      = utils.parseInteger(data.term_cell_cd);
		data.term_cell_x       = utils.parseInteger(data.term_cell_x);
		data.term_cell_y       = utils.parseInteger(data.term_cell_y);
		data.term_cell_azimuth = utils.parseInteger(data.term_cell_azimuth);

		switch (data.cdr_type_cd) {
			case 'FORW':
				event.type = 'call';
				event.subtype = 'forward';
			break;

			case 'GPRSS':
			case 'GPRSST':
				event.type = 'internet';
			break;

			case 'MMSO':
			case 'MMST':
				event.type = 'message';
				event.subtype = 'MMS';
			break;

			case 'MOC':
			case 'MTC':
			case 'POC':
			case 'PTC':
				event.type = 'call';
			break;

			case 'SMMO':
			case 'SMMT':
			case 'SMMTN':
				event.type = 'message';
				event.subtype = 'SMS';
			break;

			case 'SUPS':
				event.type = 'unknown';
			break;

			default:
				console.error('Was für ein Service ist "'+data.cdr_type_cd+'"?');
		}

		switch (event.type) {
			case 'call':
			case 'message':
				if (data.dial_nbr == config.myNumber) {
					data.incoming = true;
				} else if (data.orig_nbr == config.myNumber) {
					data.incoming = false;
				} else {
					console.error(data);
				}
			break;
		}

		event.date = event.data.timeStart;

		switch (event.type) {
			case 'call':
			case 'message':
			case 'internet':
				result.push(event);
			break;
		}

		
	})

	return result;
}
