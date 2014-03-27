var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

var events = [];

// VDS einlesen
var data = require('vds').import('../vds-data/vds/vds.tsv', config);
//fs.writeFileSync('../vds-data/vds.json', JSON.stringify(data), 'utf8');
fs.writeFileSync('../vds-data/vds.json', JSON.stringify(data, null, '\t'), 'utf8');









