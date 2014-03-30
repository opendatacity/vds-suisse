var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

var vds, events = [];

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









