var fs = require('fs');
var utils = require('./utils');

exports.Graph = function () {
	var me = this;

	var knownNodes = {};
	utils.readListOfObjects('data/contacts/known_nodes.tsv').forEach(function (node, index) {
		node.index = index;
		knownNodes[node.Name] = node;
	})


	me.calculateEdges = function (events) {
		console.log('Calc Graph');

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

		edgeList = edgeList.map(function (edge) {
			var f = Math.min(nodes[edge.source].maxWeight, nodes[edge.target].maxWeight);
			return [
				nodes[edge.source].index,
				nodes[edge.target].index,
				edge.weight/f,
				'Undirected'
			].join('\t');
		})

		edgeList.unshift('Source\tTarget\tWeight\tType');

		fs.writeFileSync('output/edges.csv', edgeList.join('\n'), 'utf8');

		console.log(nodeList.length, edgeList.length);
	}

	me.updateEvents = function (events) {
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
			contactLookup[contact.lookup] = contact;
		})

		var temp = 0;
		events.forEach(function (event) {
			event.from = cleanAddress(event.from);
			event.to = event.to.map(function (address) { return cleanAddress(address) });
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