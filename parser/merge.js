var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

config.timeEnd    = config.timeStart + config.days*86400;
config.indexStart = Math.round(config.timeStart / config.timeStepSeconds);
config.indexEnd   = Math.round(config.timeEnd   / config.timeStepSeconds);
config.indexCount = config.indexEnd - config.indexStart + 1;



var usingCache = true;



console.log('Get VDS');
var vds = cache(
	'vds.json',
	function () { return require('vds').import(config.inputPath + 'vds/vds_erik.tsv', config); }
)



console.log('Read Cells');
var cells = JSON.parse(fs.readFileSync(config.inputPath + 'vds/cells_erik.json', 'utf8'));
cells.forEach(function (cell, index) { cell.index = index })



console.log('Get CellActivity');
var activities = cache(
	'activity.json',
	function () { return require('cellActivity').import(cells, vds, config); }
)



console.log('Get Position');
var positions = cache(
	'position.json',
	function () { return require('position').import(activities, config); }
)


//require('heatmap').generateHeatmap(positions, '../print/heatmap');
//require('heatmap').generateInkmap(positions, '../print/inkmap');

var events = require('contacts').import(vds, config);

events = events.concat(require('tweets').import(config));
events = events.concat(require('facebook').import(config));

console.log('Sort and Filter Events');

events.sort(function (a,b) {
	return a.start - b.start;
})

var startDate = config.timeStart;
var endDate   = config.timeStart + config.days*86400;

events = events.filter(function (event) {
	if (event.end < startDate) return false;
	if (event.start > endDate) return false;
	if (event.inBound == event.outBound) return false;
	return true;
})


var statistics = new require('statistics').Statistics(config);
//statistics.calculateSpeed(positions);
//statistics.analyseMails(events);


var graph = new require('graph').Graph();
//graph.calculateEdges(events);

var contacts = graph.updateEvents(events);




var data = {};

data.cells = [];
cells.forEach(function (cell) {
	data.cells[cell.index] = {
		x0:    cell.x0,
		y0:    cell.y0,
		x:     cell.x,
		y:     cell.y,
		acc:   cell.acc,
		index: cell.index
	};
})

data.activities = activities.map(function (activity) {
	return {
		index: activity.index,
		time:  activity.time,
		cells: activity.cells.map(function (cell) { return cell.index })
	}
})



data.positions = positions;

data.events = events;

data.contacts = contacts;


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









function cache(file, func) {
	file = config.cachePath + file;
	if (usingCache && fs.existsSync(file)) {
		console.log('   - load from cache');
		return JSON.parse(fs.readFileSync(file, 'utf8'));
	} else {
		console.log('   - calculate');
		var data = func();
		console.log('   - save to cache');
		fs.writeFileSync(file, JSON.stringify(data), 'utf8');
		return data;
	}	
}
