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

// Positionen ausrechnen
var positionJSON = config.cachePath + 'position.json';
if (usingCache && fs.existsSync(positionJSON)) {
	console.log('Load Position from cache');
	positions = JSON.parse(fs.readFileSync(positionJSON, 'utf8'));
} else {
	console.log('Calculate Position');
	positions = require('position').import(config.inputPath + 'cells.json', vds, config);
	fs.writeFileSync(positionJSON, JSON.stringify(positions, null, '\t'), 'utf8');
}









