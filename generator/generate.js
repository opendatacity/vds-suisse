var fs = require('fs');

var languages = ['de', 'ws'];

var frameHtml = fs.readFileSync('templates/frame.html', 'utf8');
var indexHtml = fs.readFileSync('templates/index.html', 'utf8');

languages.forEach(function (code) {
	var lang = JSON.parse(fs.readFileSync('languages/'+code+'.json', 'utf8'));

	translate(frameHtml, merge(lang.general, lang.frame), '../web/frame_'+code+'.html');

	var indexFileName = (code == 'de') ? 'index.html' : 'index_'+code+'.html';
	translate(indexHtml, merge(lang.general, lang.index), '../web/'+indexFileName);

	var langJSFile = merge(lang.general, lang.script);
	langJSFile = 'var lang = '+JSON.stringify(langJSFile, null, '\t');
	fs.writeFileSync('../web/script/language_'+code+'.js', langJSFile, 'utf8');
})

function translate(html, language, file) {
	html = html.replace(/\{\{.*?\}\}/g, function (key) {
		var keyWord = key.substr(2, key.length-4);
		if (language[keyWord] === undefined) {
			console.error('Unknown key "'+keyWord+'"');
			return key;
		}
		return language[keyWord];
	})
	fs.writeFileSync(file, html, 'utf8');
}

function merge(obj1, obj2) {
	var obj = {};
	Object.keys(obj1).forEach(function (key) { obj[key] = obj1[key] });
	Object.keys(obj2).forEach(function (key) { obj[key] = obj2[key] });
	return obj;
}