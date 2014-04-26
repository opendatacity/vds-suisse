var fs = require('fs');
var utils = require('./utils');

exports.import = function (cells, vds, config) {
	console.log('Calc CellActivity');

	var activities = [];

	var cellLookup = {};
	cells.forEach(function (cell) {
		var id = cell.lacId*65536+cell.cellId;
		id = utils.decToHex(id, 8);
		cell.id = id;
		cellLookup[id] = cell;
	})

	vds.forEach(function (entry) {
		//if (entry.type == 'internet') return;

		var i0 = Math.round((entry.timeStart - config.timeStart)/config.timeStepSeconds);
		var i1 = Math.round((entry.timeEnd   - config.timeStart)/config.timeStepSeconds);

		if ((i0 < 0) || (i1 > config.indexCount)) {
			console.error('Außerhalb des Zeitintervalls', entry, i0, i1, config.indexCount);
		}
		
		var cellId0 = entry.data.orig_LAC_HEX + entry.data.orig_cell_cd_HEX;
		if (entry.data.orig_LAC_HEX == '#NV') cellId0 = false;
		
		var cellId1 = entry.data.term_LAC_HEX + entry.data.term_cell_cd_HEX;
		if (!entry.data.term_LAC_HEX) cellId1 = false;
		if (!entry.data.term_cell_cd_HEX) cellId1 = false;

		if (cellId0) setCell(i0, cellId0);
		if (cellId1) setCell(i1, cellId1);
	})

	function setCell(index, cellId) {
		if (cellLookup[cellId] === undefined) console.error('not found "'+cellId+'"');
		if (activities[index] === undefined) {
			var time = index*config.timeStepSeconds + config.timeStart;
			activities[index] = {
				index: index,
				time: time,
				debug: (new Date(time*1000)).toString(),
				cells: {}
			}
		}
		activities[index].cells[cellId] = true;
	}

	activities = activities.filter(function (activity) {
		return activity;
	})

	activities.forEach(function (activity) {
		activity.cells = Object.keys(activity.cells).map(function (id) { return cellLookup[id] })
	})

	return activities;
}

