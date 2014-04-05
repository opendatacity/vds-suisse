var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

var vds, positions, events = [];

var usingCache = true;

// VDS einlesen
var vdsJSON = config.cachePath + 'vds.json';
if (usingCache && fs.existsSync(vdsJSON)) {
	console.log('Load VDS from cache');
	vds = JSON.parse(fs.readFileSync(vdsJSON, 'utf8'));
} else {
	console.log('Import VDS');
	vds = require('vds').import(config.inputPath + 'vds/vds.tsv', config);
	fs.writeFileSync(vdsJSON, JSON.stringify(vds, null, '\t'), 'utf8');
}

var cells = JSON.parse(fs.readFileSync(config.inputPath + 'cells.json', 'utf8'));
cells.forEach(function (cell, index) { cell.index = index })

// Positionen ausrechnen
var positionJSON = config.cachePath + 'position.json';
if (usingCache && fs.existsSync(positionJSON)) {
	console.log('Load Position from cache');
	positions = JSON.parse(fs.readFileSync(positionJSON, 'utf8'));
} else {
	console.log('Calculate Position');
	positions = require('position').import(cells, vds, config);
	//fs.writeFileSync(positionJSON, JSON.stringify(positions, null, '\t'), 'utf8');
}

var telephoneEvents = vds.map(function (entry) {
	if (entry.type == 'internet') return false;
	return {
		type: entry.type,
		subtype: entry.subtype,
		dur: entry.timeDuration,
		start: entry.timeStart,
		end: entry.timeEnd,
		incoming: entry.data.incoming
	}
}).filter(function (entry) { return entry });
events = events.concat(telephoneEvents);




var data = {};

data.cells = [];
cells.forEach(function (cell) {
	data.cells[cell.index] = {
		x0: cell.x0,
		y0: cell.y0,
		x: cell.x,
		y: cell.y,
		acc: cell.acc,
		index: cell.index
	};
})

data.activities = positions.activities.map(function (activity) {
	return {
		index: activity.index,
		time: activity.time,
		cells: activity.cells.map(function (cell) { return cell.index })
	}
})

data.timeStart = config.timeStart;

data.events = events;

fs.writeFileSync('../vds-vis/data/data.js', 'var data = ' + JSON.stringify(data, null, '\t'), 'utf8')








