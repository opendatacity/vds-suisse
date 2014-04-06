var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

config.timeEnd    = config.timeStart + config.days*86400;
config.indexStart = Math.round(config.timeStart / config.timeStepSeconds);
config.indexEnd   = Math.round(config.timeEnd   / config.timeStepSeconds);
config.indexCount = config.indexEnd - config.indexStart + 1;

var vds, activities, events = [];

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



// cell-Aktivitäten ausrechnen
var activityJSON = config.cachePath + 'activity.json';
if (usingCache && fs.existsSync(activityJSON)) {
	console.log('Load cellActivity from cache');
	activities = JSON.parse(fs.readFileSync(activityJSON, 'utf8'));
} else {
	console.log('Calculate cellActivity');
	activities = require('cellActivity').import(cells, vds, config);
	//fs.writeFileSync(activityJSON, JSON.stringify(activities, null, '\t'), 'utf8');
}



// Position ausrechnen
var positionJSON = config.cachePath + 'position.json';
if (usingCache && fs.existsSync(positionJSON)) {
	console.log('Load position from cache');
	positions = JSON.parse(fs.readFileSync(positionJSON, 'utf8'));
} else {
	console.log('Calculate position');
	positions = require('position').import(activities, config);
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

data.activities = activities.map(function (activity) {
	return {
		index: activity.index,
		time: activity.time,
		cells: activity.cells.map(function (cell) { return cell.index })
	}
})



data.positions = positions;

data.events = events;


data.config = {
	days:            config.days,
	indexCount:      config.indexCount,
	indexEnd:        config.indexEnd,
	indexStart:      config.indexStart,
	timeEnd:         config.timeEnd,
	timeStart:       config.timeStart,
	timeStepSeconds: config.timeStepSeconds
}

fs.writeFileSync('../web/data/data.js', 'var data = ' + JSON.stringify(data, null, '\t'), 'utf8')








