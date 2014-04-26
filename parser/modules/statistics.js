var fs = require('fs');
var utils = require('utils');


exports.Statistics = function (config) {
	var me = this;

	me.calculateSpeed = function (positions) {
		console.log('Calc Speed');

		var degToKm = 40074/360;

		var speed = [];
		var maxV = 0;
		var maxVI = 0;
		var sumR = 0;

		for (var i = 0; i < positions.length-1; i++) {
			var dx = positions[i].x - positions[i+1].x;
			var dy = positions[i].y - positions[i+1].y;

			dx *= degToKm*Math.cos(positions[i].y*Math.PI/180);
			dy *= degToKm;

			var r = Math.sqrt(dx*dx + dy*dy);
			sumR += r;
			var v = r/(config.timeStepSeconds/3600);

			speed[i] = v;

			if (v > 150) {
				console.log(v.toFixed(0), new Date((i*config.timeStepSeconds+config.timeStart)*1000));
			}
			if (maxV < v) {
				maxV = v;
				maxVI = i;
			}
		}
		
		console.log('   ', maxV.toFixed(0), new Date((maxVI*config.timeStepSeconds+config.timeStart)*1000));
		console.log('   ', sumR.toFixed(0));
	}

	me.analyseMails = function (events) {
		var inContacts  = {count:0, contacts:{}, label:'eingehende Contacts'};
		var outContacts = {count:0, contacts:{}, label:'ausgehende Contacts'};
		var allContacts = {count:0, contacts:{}, label:'alle Contacts'};

		var inCalls  = {count:0, contacts:{}, label:'eingehende Calls'};
		var outCalls = {count:0, contacts:{}, label:'ausgehende Calls'};
		var allCalls = {count:0, contacts:{}, label:'alle Calls'};

		var inSMS  = {count:0, contacts:{}, label:'eingehende SMS'};
		var outSMS = {count:0, contacts:{}, label:'ausgehende SMS'};
		var allSMS = {count:0, contacts:{}, label:'alle SMS'};

		var inMails  = {count:0, contacts:{}, label:'eingehende Mails'};
		var outMails = {count:0, contacts:{}, label:'ausgehende Mails'};
		var allMails = {count:0, contacts:{}, label:'alle Mails'};


		var allCategories = [
			allContacts, inContacts, outContacts,
			allCalls,    inCalls,    outCalls,
			allSMS,      inSMS,      outSMS,
			allMails,    inMails,    outMails
		];

		events.forEach(function (event) {

			var categories = [allContacts];
			var eingehend = !event.outBound &&  event.inBound;
			var ausgehend =  event.outBound && !event.inBound;

			if (eingehend) categories.push( inContacts);
			if (ausgehend) categories.push(outContacts);

			if (event.type == 'call') {
				categories.push(allCalls);
				if (eingehend) categories.push( inCalls);
				if (ausgehend) categories.push(outCalls);
			}

			if (event.type == 'sms') {
				categories.push(allSMS);
				if (eingehend) categories.push( inSMS);
				if (ausgehend) categories.push(outSMS);
			}

			if (event.type == 'mail') {
				categories.push(allMails);
				if (eingehend) categories.push( inMails);
				if (ausgehend) categories.push(outMails);
			}

			categories.forEach(function (category) {
				category.count++;
				var contacts = event.to.concat([event.from]);
				contacts.forEach(function (contact) {
					if (!category.contacts[contact.contact]) category.contacts[contact.contact] = 0;
					category.contacts[contact.contact]++;
				})
			})
		})

		allCategories.forEach(function (category) {
			console.log(['   ',
				category.label,
				category.count,
				Object.keys(category.contacts).length
			].join('\t'))
		})

		var contacts = Object.keys(allContacts.contacts).map(function (contact) {
			var row = allCategories.map(function (category) {
				return category.contacts[contact] || 0;
			})
			row.unshift(contact);
			return row.join('\t');
		})

		var row = allCategories.map(function (category) { return category.label; });
		row.unshift('Kontakt');
		contacts.unshift(row.join('\t'));


		fs.writeFileSync('temp.tsv', contacts.join('\n'), 'utf8');
	}

	return me;
}
