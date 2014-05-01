var fs = require('fs');

var languages = [
	{code:'de'},
	{code:'en', hidden:true},
	{code:'ws', hidden:true}
];

var frameHtml = fs.readFileSync('templates/frame.html', 'utf8');
var indexHtml = fs.readFileSync('templates/index.html', 'utf8');

languages.forEach(function (lang) {
	lang.sourceFileName = 'languages/'+lang.code+'.json';
	lang.indexFileName = '../web/index' + ((lang.code == 'de') ? '' : '_'+lang.code) + '.html';
	lang.indexUrl      = 'index' + ((lang.code == 'de') ? '' : '_'+lang.code) + '.html';
	lang.frameFileName = '../web/frame_' + lang.code + '.html';
	lang.jsObjFileName = '../web/script/language_'+lang.code+'.js';
	lang.dict = JSON.parse(fs.readFileSync(lang.sourceFileName, 'utf8'));
	lang.label = lang.dict.general.lang_name;
})

validate(languages);

var languageList = languages.filter(function (lang) {
	return !lang.hidden;
})

languages.forEach(function (lang) {
	var dict = merge(lang.dict.general, lang.dict.frame);
	translate(frameHtml, dict, lang.frameFileName);
	
	var dict = merge(lang.dict.general, lang.dict.index);
	dict.languagelist = languageList.map(function (otherlang) {
		return (otherlang.code == lang.code) ? '<b>'+otherlang.label+'</b>' : '<a href="'+otherlang.indexUrl+'">'+otherlang.label+'</a>'
	}).join(' ');
	translate(indexHtml, dict, lang.indexFileName);

	var dict = merge(lang.dict.general, lang.dict.script);
	var langJSFile = 'var lang = '+JSON.stringify(dict, null, '\t');
	fs.writeFileSync(lang.jsObjFileName, langJSFile, 'utf8');
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

function validate(list) {
	var mainKeys = getKeys(list[0].dict);

	list.forEach(function (lang) {
		var diff = difference(mainKeys, getKeys(lang.dict))
		if (diff) {
			console.error('Fehler in "'+lang.sourceFileName+'"');
			console.error('   '+diff.join('\n   '));
		}
	})
}

function getKeys(obj, prefix) {
	var keys = [];
	Object.keys(obj).forEach(function (key) {
		keys.push(key);
		if (typeof (obj[key]) === 'object') {
			keys = keys.concat(getKeys(obj[key], key));
		}
	})

	if (prefix) keys = keys.map(function (key) { return prefix+'.'+key });

	return keys;
}

function difference(listA, listB) {
	var values = {};

	listA.forEach(function (value) {
		if (values[value] === undefined) values[value] = {};
		values[value].a = true;
	})

	listB.forEach(function (value) {
		if (values[value] === undefined) values[value] = {};
		values[value].b = true;
	})

	values = Object.keys(values).map(function (key) {
		if (values[key].a === values[key].b) return false;
		if (values[key].a) return '"'+key+'" fehlt';
		if (values[key].b) return '"'+key+'" ist zu viel';
	}).filter(function (a) { return a });

	if (values.length == 0) return false;
	return values;
}

