var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

var events = [];

// VDS einlesen
require('vds').import('data/vds.tsv', events, config);









