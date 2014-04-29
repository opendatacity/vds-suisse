var fs = require('fs');
var utils = require('./utils');

exports.Graph = function () {
	var me = this;
	var _edges = [];

	var knownNodes = {};
	utils.readListOfObjects('data/contacts/known_nodes.tsv').forEach(function (node, index) {
		node.index = index;
		knownNodes[node.Name] = node;
	})


	me.calculateEdges = function (events) {
		console.log('   Calc Graph');

		var ignoreContacts = {};
		fs.readFileSync('data/contacts/ignore_nodes.tsv', 'utf8').split('\n').forEach(function (contact) {
			ignoreContacts[contact] = true;
		});

		var nodes = {};
		var edges = {};
		var unknownNodes = [];
		var count = 0;

		var connections = events.map(function (event) {
			var addresses = event.to.concat([event.from]);

			// remove duplicates
			for (var i = 0; i < addresses.length; i++) {
				if (addresses[i]) {
					for (var j = i+1; j < addresses.length; j++) {
						if (addresses[i].contact == addresses[j].contact) {
							addresses[i] = false;
							break;
						}
					}
				}
			}

			// Filter
			addresses = addresses.filter(function (address) {
				if (!address) return false;
				if (ignoreContacts[address.contact]) return false;
				return true;
			})

			// Add nodes
			addresses.forEach(function (address) {

				var contact = address.contact;

				if (!nodes[contact]) {
					nodes[contact] = {
						label:contact,
						count:0,
						intensity:0,
						weight:0,
						edges:0,
						addresses:{},
						org:address.org,
					};
				}

				nodes[contact].count++;
				nodes[contact].intensity += 1/addresses.length;
				nodes[contact].addresses[address.address] = true;
			})

			return addresses;
		});

		connections.forEach(function (addresses) {
			// Add edge
			if (addresses.length > 1) {
				var weight = 1/(addresses.length-1) + 0.01;
				for (var i = 0; i < addresses.length; i++) {
					var contact1 = addresses[i].contact;
					for (var j = i+1; j < addresses.length; j++) {
						var contact2 = addresses[j].contact;

						if (nodes[contact1] && nodes[contact2]) {
							var contactA, contactB;
							if (contact1 < contact2) {
								contactA = contact1; contactB = contact2;
							} else {
								contactA = contact2; contactB = contact1;
							}
							
							var edgeName = contactA+'_'+contactB;


							if (!edges[edgeName]) edges[edgeName] = {source:contactA, target:contactB, weight:0};

							nodes[contact1].edges  += 1;
							nodes[contact2].edges  += 1;

							nodes[contact1].weight += weight;
							nodes[contact2].weight += weight;

							edges[edgeName].weight += weight;
						}
					}
				}
			}
		})

		var orgCount = 0;
		var orgs = {'':0};

		nodeList = Object.keys(nodes).map(function (key) {
			var node = nodes[key];
			
			node.ok = false;
			if (!node) return false;
			if (node.weight < 10) return false; //5
			if (node.edges  < 10) return false;
			if (node.count  < 20) return false; //10

			var size = node.weight + node.intensity;

			node.ok = true;
			node.maxWeight = 0;

			var org = 0;
			var label = node.label;
			if (knownNodes[node.label]) {
				var knownNode = knownNodes[node.label];
				node.index = knownNode.index;
				org = knownNode['angezeigte Gruppe'];
				label = knownNode['angezeigtes Pseudonym']+' ('+org+')';
				if (!orgs[org]) {
					orgCount++;
					orgs[org] = orgCount;
				}
				org = orgs[org];

			} else {
				unknownNodes.push([
					node.label,
					size,
					node.org,
					Object.keys(node.addresses).join(', ')
				].join('\t'));
			}

			return [node.index, label, size.toFixed(2), org].join('\t');

		}).filter(function (node) {
			return node;
		});
		nodeList.unshift('Id\tLabel\tSize\tClass');

		fs.writeFileSync('output/nodes.csv', nodeList.join('\n'), 'utf8');

		fs.writeFileSync('output/unknownNodes.csv', unknownNodes.join('\n'), 'utf8');



		edgeList = Object.keys(edges).map(function (key) {
			var edge = edges[key];

			if (!nodes[edge.source].ok) return false;
			if (!nodes[edge.target].ok) return false;

			if (nodes[edge.source].maxWeight < edge.weight) nodes[edge.source].maxWeight = edge.weight;
			if (nodes[edge.target].maxWeight < edge.weight) nodes[edge.target].maxWeight = edge.weight;

			return edge;
		}).filter(function (edge) {
			return edge;
		})

		_edges = [];

		edgeList = edgeList.map(function (edge) {
			var f = Math.min(nodes[edge.source].maxWeight, nodes[edge.target].maxWeight);

			_edges.push([
				nodes[edge.source].index,
				nodes[edge.target].index
			]);

			return [
				nodes[edge.source].index,
				nodes[edge.target].index,
				edge.weight/f,
				'Undirected'
			].join('\t');
		})

		edgeList.unshift('Source\tTarget\tWeight\tType');

		fs.writeFileSync('output/edges.csv', edgeList.join('\n'), 'utf8');
	}

	me.calculateNetwork = function (contacts) {
		console.log('   Draw Graph');

		var offset = 2;

		var graph = fs.readFileSync('../../Social Networks/socialnetwork5.svg', 'utf8');
		
		graph = graph.replace(/\s+/g, ' ');
		var circles = graph.match(/<circle.*?\/>/g);

		var minX = 1e10, maxX = -1e10;
		var minY = 1e10, maxY = -1e10;

		circles = circles.map(function (circle) {
			circle = {
				x: parseFloat(circle.match(   /cx=\"(.*?)\"/)[1]  ),
				y: parseFloat(circle.match(   /cy=\"(.*?)\"/)[1]  ),
				r: parseFloat(circle.match(    /r=\"(.*?)\"/)[1]  ),
				id:parseInt(  circle.match(/class=\"(.*?)\"/)[1],0)
			}

			if (minX > circle.x) minX = circle.x;
			if (minY > circle.y) minY = circle.y;
			if (maxX < circle.x) maxX = circle.x;
			if (maxY < circle.y) maxY = circle.y;
			
			return circle;
		})

		var midX = (minX + maxX)/2;
		var midY = (minY + maxY)/2;
		var size = 16384;
		var factor = size/2560;

		var orgColors = {
			'Diverse':        false,
			'Familie':        [255,202, 48],
			'Gemeinderat':    [ 84,107,210],
			'Grüne':          [106,203, 60],
			'Kantonsrat':     [ 84,107,210],
			'Medien':         [  0,  0,  0],
			'Mieterverband':  [196, 33,140],
			'Migration/Asyl': false,
			'Nationalrat':    [ 84,107,210],
			'NGO':            [  0,175,236],
			'Politik':        false,
			'Stadtrat':       [ 84,107,210],
			'Ständerat':      [ 84,107,210],
			'Universität':    false
		};
		var labelColors = {
			'Adèle Thorens Goumaz':     false,
			'Brigitte Marti':           false,
			'Journalist/in':            [  0,  0,  0],
			'Min Li Marti (Partnerin)': false,
			'Miriam Behrens':           false,
			'Mutter':                   false,
			'Parlamentarier/in':        [ 84,107,210],
			'Person':                   false,
			'Pfarrer':                  false,
			'Rechtsanwalt':             [235, 33, 46],
			'Ueli Leuenberger':         false,
			'Vater':                    false,
			'Verteiler':                false
		}
		
		circles.forEach(function (circle) {
			var contact = contacts[circle.id + offset];
			contact.x = (circle.x - midX)*factor + size/2;
			contact.y = (circle.y - midY)*factor + size/2;
			contact.r = circle.r;

			if (orgColors[  contact.org  ] === undefined) console.log('Unknown org "'   + contact.org   + '"');
			if (labelColors[contact.label] === undefined) console.log('Unknown label "' + contact.label + '"');
			contact.color = labelColors[contact.label] || orgColors[contact.org] || [170,170,170];
		})

		var edges = _edges.map(function (edge) {
			return [edge[0] + offset, edge[1] + offset];
		})

		var svg = [];
		svg.push('<?xml version="1.0" encoding="UTF-8"?>');
		svg.push('<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" >');
		svg.push('<svg width="'+size+'px" height="'+size+'px" viewBox="0 0 '+size+' '+size+'" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" version="1.1">');

		svg.push('<g id="edges">');
		edges.forEach(function (edge) {
			var contact1 = contacts[edge[0]];
			var contact2 = contacts[edge[1]];
			var color = contact1.color.map(function (v,i) { return Math.round((v+contact2.color[i])/2) }).join(',');
			svg.push('<path fill="none" stroke-width="' + (1*factor) + '" d="M'+contact1.x+','+contact1.y+'L'+contact2.x+','+contact2.y+'" stroke="rgb('+color+')"/>');
		})
		svg.push('</g>');

		svg.push('<g id="nodes">');
		contacts.forEach(function (contact) {
			if (!contact.r) return;
			var r = 1.4*contact.r*factor;
			var color = contact.color.join(',');
			var stroke = contact.color.map(function (v) { return Math.round(v*0.5) }).join(',');
			svg.push('<circle fill="rgb('+color+')" r="'+r+'" cx="'+contact.x+'" cy="'+contact.y+'" stroke="rgb('+stroke+')" stroke-width="'+(r/100)+'"/>')
		})
		svg.push('</g>');

		svg.push('</svg>');

		fs.writeFileSync('../tiles/circles.svg', svg.join('\n'), 'utf8');
	}

	me.updateEvents = function (events) {
		console.log('   Update Events');

		// Durchzählen, also Person 1, Person 2, ...
		var groups = {};

		Object.keys(knownNodes).forEach(function (key) {
			var node = knownNodes[key];
			node.size = parseFloat(node['Priorität']);
			var group = node['angezeigtes Pseudonym'];
			if (groups[group] === undefined) groups[group] = [];
			groups[group].push(node);
		})

		Object.keys(groups).forEach(function (key) {
			var group = groups[key];
			if (group.length <= 1) {
				group.forEach(function (node) { node.nr = '' });
			} else {
				group = group.sort(function (a,b) {
					return b.size - a.size;
				})
				group.forEach(function (node, index) { node.nr = ' '+(index+1) });
			}
		});


		var contacts = [
			{label: 'Sonstiger Kontakt', lookup:''},
			{label: 'Balthasar Glättli', lookup:'Balthasar Glättli'}
		];

		Object.keys(knownNodes).forEach(function (key) {
			var node = knownNodes[key];
			contacts[node.index+2] = {
				label: node['angezeigtes Pseudonym'],
				nr: node.nr,
				org: node['angezeigte Gruppe'],
				size: node.size,
				lookup: key
			}
		})

		contacts.push({label: 'Google Calendar', lookup: 'Google Calendar'});
		contacts.push({label: 'newsaktuell.ch', lookup: 'newsaktuell.ch'});
		contacts.push({label: 'mediendienste@zuerich.ch', lookup: 'mediendienste@zuerich.ch'});
		contacts.push({label: 'Twitter', lookup: 'twitter.com'});
		contacts.push({label: 'Google Alerts', lookup: 'googlealerts'});
		contacts.push({label: 'NZZ-Newsletter', lookup: 'no-reply@nzz.ch'});
		contacts.push({label: 'digiges-Mailingliste', lookup: 'netzpolitik@schleuder.digitale-gesellschaft.ch'});
		contacts.push({label: 'Tamedia-Newsletter', lookup: 'mailing@tamedia.ch'});
		contacts.push({label: 'ronorp.net-Newsletter', lookup: 'noreply@ronorp.net'});
		contacts.push({label: 'hyperalerts-Newsletter', lookup: 'noreply@hyperalerts.no'});
		contacts.push({label: 'Facebook-Newsletter', lookup: 'facebook'});
		contacts.push({label: 'Facebook-Newsletter', lookup: 'Facebook-Werbungsteam'});
		contacts.push({label: 'Google-Newsletter', lookup: 'Google'});
		contacts.push({label: 'news.admin.ch-Newsletter', lookup: 'no-reply@news.admin.ch'});
		contacts.push({label: 'swissconsortium-Newsletter', lookup: 'bibliothek@swissconsortium.ch'});
		contacts.push({label: 'doodle-Newsletter', lookup: 'mailer@doodle.com'});
		contacts.push({label: 'Politnetz-Newsletter', lookup: 'info@politnetz.ch'});
		contacts.push({label: 'Parlaments-Newsletter', lookup: 'New-Service des Schweizer Parlaments'});
		contacts.push({label: 'asyl.ch-Mailingliste', lookup: 'zuerich@asyl.ch'});
		contacts.push({label: 'facts.ch-Newsletter', lookup: 'facts@facts.ch'});
		contacts.push({label: 'asyl.ch-Newsletter', lookup: 'info@asyl.ch'});
		contacts.push({label: 'netzwoche.ch-Newsletter', lookup: 'ticker@netzwoche.ch'});
		contacts.push({label: 'wordpress.com-Newsletter', lookup: 'wordpress.com'});
		contacts.push({label: 'xing.com-Newsletter', lookup: 'xing.com'});
		contacts.push({label: 'Journalist/in', lookup: 'Redaktion Radio 1'});

		var contactLookup = {};
		contacts.forEach(function (contact, index) {
			contact.index = index;
			contact.email_in  = 0;
			contact.email_out = 0;
			contact.email_co  = 0;
			contact.sms_in    = 0;
			contact.sms_out   = 0;
			contact.call_in   = 0;
			contact.call_out  = 0;
			contact.hours     = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
			contactLookup[contact.lookup] = contact;
		})

		var temp = 0;
		events.forEach(function (event) {
			event.from = cleanAddress(event.from);
			event.to = event.to.map(function (address) { return cleanAddress(address) });
			switch (event.type) {
				case 'mail':
					contacts[event.from].email_out++;
					if (event.outBound) {
						event.to.forEach(function (id) { contacts[id].email_in++ });
					} else {
						event.to.forEach(function (id) { contacts[id].email_co++ });
					}
				break;
				case 'sms':
					contacts[event.from].sms_out++;
					event.to.forEach(function (id) { contacts[id].sms_in++ });
				break;
				case 'call':
					contacts[event.from].call_out++;
					event.to.forEach(function (id) { contacts[id].call_in++ });
				break;
			}

			var hour = new Date(event.start*1000);
			hour = hour.getHours();
			contacts[event.from].hours[hour]++;
			event.to.forEach(function (id) { contacts[id].hours[hour]++ });
		})

		return contacts;

		function cleanAddress(address) {
			var contact = address.contact;
			if (contactLookup[contact]) return contactLookup[contact].index;
			return 0;
		}
	}



	return me;
}