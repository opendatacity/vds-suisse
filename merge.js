var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

var vds, events = [];

var usingCache = false;

// VDS einlesen
if (usingCache) {
	vds = JSON.parse(fs.readFileSync('../vds-data/vds.json', 'utf8'));
} else {
	vds = require('vds').import('../vds-data/vds/vds.tsv', config);
	fs.writeFileSync('../vds-data/vds.json', JSON.stringify(vds, null, '\t'), 'utf8');
}









