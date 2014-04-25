var timeIndexZoom = 6;
var scrollBarHeight = 48;

var maxDays, timeStepMinutes, timeStepSecondes, maxMinutes, maxTimeIndex, dayLength, dayWidth;

function initModules() {
	maxDays = data.config.days;
	timeStepSecondes = data.config.timeStepSeconds;
	timeStepMinutes = data.config.timeStepSeconds/60;

	maxMinutes = maxDays*1440;
	maxTimeIndex = maxMinutes/timeStepMinutes;
	dayLength = 1440/timeStepMinutes;
	dayWidth = dayLength/timeIndexZoom;
}

var weekDayOffset = 2;
var weekDays = [
	{ label: 'Mo', bgColor:'#F7F7F7', color:'C7C7C7' },
	{ label: 'Di', bgColor:'#F0F0F0', color:'C0C0C0' },
	{ label: 'Mi', bgColor:'#F7F7F7', color:'C7C7C7' },
	{ label: 'Do', bgColor:'#F0F0F0', color:'C0C0C0' },
	{ label: 'Fr', bgColor:'#F7F7F7', color:'C7C7C7' },
	{ label: 'Sa', bgColor:'#E0E0FF', color:'B0B0FF' },
	{ label: 'So', bgColor:'#D7D7FF', color:'A7A7FF' },
];

function ScrollBar() {
	var me = this;
	makeEventListener(me);

	var scrollBarWidth = maxDays*1440/(timeIndexZoom*timeStepMinutes);
	var container = $('#scrollContainer');
	var canvas = $('#scrollCanvas');
	var context;

	var timeIndex = 0;
	
	function init() {
		canvas.attr({width:scrollBarWidth, height:scrollBarHeight});

		canvas.mousedown(mouseDown);
		$(document).mousemove(mouseMove);
		$(document).mouseup(  mouseUp  );

		context = canvas.get(0).getContext('2d');
		context.clearRect(0, 0, scrollBarWidth, scrollBarHeight);

		var v = [];
		var maxV = 0;
		for (var x = 0; x < scrollBarWidth; x++) v[x] = 0;
		data.activities.forEach(function (entry) {
			var x = Math.floor(entry.index/timeIndexZoom);
			v[x] += entry.cells.length;
			if (maxV < v[x]) maxV = v[x];
		})
		
		for (var weekDayIndex = 0; weekDayIndex < 7; weekDayIndex++) {
			var maxWeeks = Math.ceil((maxDays-weekDayIndex)/7);

			context.fillStyle = weekDays[(weekDayIndex+weekDayOffset)%7].bgColor;
			for (var week = 0; week < maxWeeks; week++) {
				var x = (weekDayIndex + 7*week)*dayWidth;
				context.fillRect(x, 0, dayWidth, scrollBarHeight);
			}
			context.fill();

			context.fillStyle = weekDays[(weekDayIndex+weekDayOffset)%7].color;
			var text = weekDays[(weekDayIndex+weekDayOffset)%7].label;
			for (var week = 0; week < maxWeeks; week++) {
				var x = (weekDayIndex + 7*week + 0.5)*dayWidth-6;
				context.fillText(text, x, 10);
			}
			context.fill();
		}

		context.strokeStyle = 'rgba(0,0,0,0.3)';
		context.lineWidth = 1;
		for (var x = 0; x < scrollBarWidth; x++) {
			y = (scrollBarHeight)*(1-1.5*v[x]/maxV);
			if (y < 0) y = 0;
			context.moveTo(x-0.5,scrollBarHeight);
			context.lineTo(x-0.5,y);
		}
		context.stroke();

		me.setTimeIndex = function (index) {
			timeIndex = index;
			redraw();
		}

		me.getTimeIndex = function () {
			return timeIndex;
		}

		function redraw() {
			var x = container.width() / 2;
			x -= timeIndex/timeIndexZoom;
			canvas.css('left', Math.round(x));
		}

		redraw();
	}

	var pressed = false;
	var lastMouseX = 0;

	function mouseDown(event) {
		pressed = true;
		lastMouseX = event.pageX;
		me.trigger('dragStart');
	}

	function mouseMove(event) {
		if (pressed) {
			var mouseX = event.pageX;
			timeIndex -= (mouseX-lastMouseX)*timeIndexZoom;
			lastMouseX = mouseX;
			me.trigger('drag');
		}
	} 

	function mouseUp(event) {
		if (pressed) {
			pressed = false;
			me.trigger('dragEnd');
		}
	}

	init()

	return me;
}

function Player() {
	var me = this;
	makeEventListener(me);

	var timeIndex = 100;

	var interval = false;
	var paused = false;

	me.start = function () {
		if (!interval) {
			interval = setInterval(me.step, 50);
			me.trigger('start');
		}
	}

	me.stop = function () {
		if (interval) {
			clearInterval(interval);
			interval = false;
			me.trigger('stop');
		}
	}

	me.step = function () {
		if (paused) return;
		timeIndex++;
		me.trigger('change');
		if (timeIndex >= maxTimeIndex) me.stop();
	}

	me.getTimeIndex = function () {
		return timeIndex;
	}

	me.getTimeStamp = function () {

		return (timeIndex*timeStepSecondes + data.config.timeStart)*1000;
	}

	me.getTime = function () {
		return (timeIndex*timeStepSecondes + data.config.timeStart);
	}

	me.setTimeIndex = function (index) {
		if (index < 0) index = 0;
		if (index > maxTimeIndex) index = maxTimeIndex;
		timeIndex = index;
		me.trigger('change');
	}

	me.pause = function () {
		paused = true;
	}

	me.unpause = function () {
		paused = false;
	}

	return me;
}

function Map() {
	var me = this;
	makeEventListener(me);

	var activityList = [];
	data.activities.forEach(function (activity) {
		activity.cells = activity.cells.map(function (index) {
			return data.cells[index];
		})
		activityList[activity.index] = activity;
	})

	// create a map in the "map" div, set the view to a given place and zoom
	var map = L.map('map').setView([47, 8.3], 8);

	// add an OpenStreetMap tile layer
	L.tileLayer('http://odcdn.de:7773/suisse/{z}/{x}/{y}.png', {
	}).addTo(map);

	var cellLayer = L.layerGroup();
	cellLayer.addTo(map);

	var icons = [];
	for (var i = 1; i <= 10; i++) {
		icons.push(L.icon({
			iconUrl: 'graphics/dot'+i+'.png',
			iconRetinaUrl: 'graphics/dot'+i+'retina.png',
			iconSize: [48, 48],
			iconAnchor: [20, 28],
			popupAnchor: [20, 28]
		}))
	}

	var dotLayer = L.marker([0,0],{
		icon: icons[1],
		clickable: false,
		keyboard: false
	}).addTo(map);

	me.redraw = function () {
		var intervalSize = 12;

		var timeIndex = player.getTimeIndex();
		var i0 = timeIndex - intervalSize;
		var i1 = timeIndex + intervalSize;

		if (i0 < 0) i0 = 0;
		if (i1 >= data.indexCount) i1 = data.indexCount - 1;

		cellLayer.clearLayers();

		var used = {};
		for (var i = i0; i <= i1; i++) {
			var activity = activityList[i];
			if (activity) {
				var value = 1-Math.abs(activity.index-timeIndex)/(intervalSize+1);

				activity.cells.forEach(function (cell) {
					if (used[cell.index]) {
						if (used[cell.index].value < value) used[cell.index].value = value;
					} else {
						used[cell.index] = { value:value, cell:cell };
					}
				})
			}
		}

		Object.keys(used).forEach(function (id) {
			var color = used[id].value;
			color = 'rgba(255,'+Math.round(255*(1-color))+',0,'+color+')';
			var cell = used[id].cell;
			L.circle(
				[cell.y, cell.x],
				cell.acc,
				{
					weight: 0,
					fillColor: color,
					fillOpacity: 0.5
				}
			).addTo(cellLayer);
		});

		var path = [];
		var avgR = 0;
		for (var i = i0; i <= i1; i++) {
			path.push([data.positions[i].y, data.positions[i].x]);
			avgR += data.positions[i].r;
		}
		avgR /= (i1-i0+1);
		var alpha = 0.3/Math.max(1, avgR/5000);
		var weight = Math.min(10, Math.max(3, avgR/3000));
		L.polyline(path, {color:'rgba(127,0,0,'+alpha+')', weight:weight}).addTo(cellLayer);

		var position = data.positions[timeIndex];
		dotLayer.setLatLng([position.y, position.x])
		var iconId = Math.max(0, Math.min(8, Math.floor((position.r-10000)/3000)))+1;
		dotLayer.setIcon(icons[iconId]);
	}

	var townLayer = L.layerGroup();

	me.addTown = function (town) {
		L.circle(
			[town.y, town.x],
			10000,
			{
				fillcolor: 'rgb('+town.color.join(',')+')',
				fillOpacity: 0.5,
				color: 'rgb('+town.color.join(',')+')',
				weight: 2
			}
		).addTo(townLayer);
	}

	me.showTownLayer = function () {
		townLayer.addTo(map);
	}

	me.hideTownLayer = function () {
		map.removeLayer(townLayer);
	}

	return me;
}

function TabBar() {
	var me = this;
	makeEventListener(me);

	var buttons = $('.tabButton');
	var buttonList = [];
	var activeButtonIndex = 0;

	buttons.each(function (index, button) {
		button = $(button);
		buttonList[index] = button;
		if (button.hasClass('active')) activeButtonIndex = index;
		button.click(function () {
			var button;

			button = buttonList[activeButtonIndex];
			button.removeClass('active');
			me.trigger('deactivate', button.attr('id'));

			activeButtonIndex = index;

			button = buttonList[activeButtonIndex];
			button.addClass('active');
			me.trigger('activate', button.attr('id'));
		})
	})

	return me;	
}

function CommunicationList() {
	var me = this;
	var lastEventStart = -1e10;
	var maxEntries = 20;
	var showNewsletters = true;
	
	var lineHeight = 16;
	var dayFullHeight = 7200;
	var dayTinyHeight = 2400;

	for (var i = 0; i < data.events.length; i++) {
		data.events[i].index = i;
	}

	var dayNodes = [];
	function drawDay(dayIndex) {
		var date = new Date(data.config.timeStart*1000);
		date.setDate(date.getDate()+dayIndex);
		var time0 = Math.round(date.getTime()/1000);
		var time1 = time0 + 86400;

		var entries = data.events.filter(function (event) {
			if (event.start <  time0) return false;
			if (event.start >= time1) return false;
			var newsletter = ((''+event.from.org).toLowerCase().substr(0,4) == 'news');
			if (newsletter && !showNewsletters) return false;
			if ((event.type == 'mail') && (!event.outBound || event.inBound)) return false;
			return true;
		})

		entries.sort(function (a,b) {
			return a.start - b.start;
		})

		dayHeight = dayTinyHeight;

		if (entries[0] && (entries[0].y === undefined)) {

			console.log(entries[0]);
			entries.forEach(function (entry) {
				entry.y0 = dayHeight*(entry.start - time0)/86400;
				entry.y1 = dayHeight*(entry.end   - time0)/86400;
				entry.y  = entry.y0;
			})
			for (var i = 0; i < entries.length; i++) {
				var ySoll = ((i == 0) ? 0 : entries[i-1].yDown) + lineHeight;
				entries[i].yDown = (entries[i].y < ySoll) ? ySoll : entries[i].y;
			}
			for (var i = entries.length-1; i >= 0; i--) {
				var ySoll = ((i == entries.length-1) ? dayHeight : entries[i+1].yUp) - lineHeight;
				entries[i].yUp = (entries[i].y > ySoll) ? ySoll : entries[i].y;
			}
			for (var i = 0; i < entries.length; i++) {
				entries[i].y = (entries[i].yUp + entries[i].yDown)/2;
			}
		}

		var node = $('#comList').append('<div class="comDay" id="day'+dayIndex+'"></div>');

		var paper = Raphael(node.get(0), 300, dayHeight);


		entries.forEach(function (entry) {
			var color, label;
			switch (entry.type) {
				case 'facebook': color = '#3c5a96'; label = 'Facebook-Post'; break;
				case 'tweet':    color = '#59adeb'; label = 'Tweet';         break;
				case 'sms':      color = '#22cc22'; label = 'SMS';           break;
				case 'call':     color = '#cc2222'; label = 'Anruf';         break;
				case 'mail':     color = '#cccccc'; label = 'E-Mail';        break;
				default:
					console.error('Unknown type "'+entry.type+'"');
			}

			if (entry.start == entry.end) {
				paper.path('M40,'+entry.y0+'C60,'+entry.y0+',60,'+entry.y+',80,'+entry.y).attr({stroke:color});
			} else {
				paper.path('M40,'+entry.y0+'C60,'+entry.y0+',60,'+entry.y+',80,'+entry.y+'C60,'+entry.y+',60,'+entry.y1+',40,'+entry.y1).attr({stroke:color, fill:color, 'fill-opacity':0.2});
			}
			paper.path(iconSVG[entry.type]).attr({
				stroke:false,
				fill:color,
				transform:'S0.75T78,'+(entry.y - lineHeight/2)
			});
		})

		var quarterHeight = dayHeight/96;
		for (var i = 0; i < 96; i++) {
			var hour = Math.floor(i/4);
			var y = i*quarterHeight;
			switch (i % 4) {
				case 0:
					paper.path('M0,'+y+'L40,'+y).attr({stroke:'#ccc'});
					paper.text(35, y+7, hour+':00').attr({fill:'#ccc', 'text-anchor':'end', 'font-family':'sans-serif', 'font-size':12});
				break;
				default:
					paper.path('M30,'+y+'L40,'+y).attr({stroke:'#ccc'});
			}
		}
		paper.path('M40,0L40,'+dayHeight).attr({stroke:'#ccc'});

		dayNodes[dayIndex] = node;

/*
		lastEventStart = start;

		if (html.length > maxEntries) html.length = maxEntries;

		html = html.map(function (event) {
			var duration = event.dur || '';
			
			var inout = [];
			if (event.inBound ) inout.push('in');
			if (event.outBound) inout.push('out');
			inout = inout.join('/');

			var line =
				'<tr>'+
					'<td>'+formatTime(event.start*1000)+'</td>'+
					'<td>'+duration+'</td>'+
					'<td>'+event.type+'</td>'+
					'<td>'+inout+'</td>'+
					'<td><a href="javascript:showCom('+event.index+')">?</a></td>'+
				'</tr>';

			return line;
		})


		html.unshift('<tr><th>Zeit</th><th>Dauer</th><th>Typ</th><th>In/Out</th><th></th></tr>');
		html = html.join('\n');

		$('#comList').html('<table>'+html+'</table>');
		*/
	}

	me.redraw = function (force) {
		//var index = player.getTimeStamp();
		//var time0 = (index - 0*60*60*1000)/1000;

		if (dayNodes[0] === undefined) {
			//for (var i = 0; i <= 179; i++) drawDay(i);
			drawDay(0);
		}
	}

	me.showNewsletters = function (checked) {
		showNewsletters = checked;
		me.redraw(true);
	}

	return me;
}

function showCom(eventIndex) {
	var event = data.events[eventIndex];

	var html = [
		'<b>Subject:</b> '+event.subject,
		'<b>From:</b> '   +formatAddress(event.from),
		'<b>To:</b> '     +event.to.map(function (a) { return formatAddress(a) }).join(', ')
	];

	$('#comDetails').html('<p>'+html.join('</p><p>')+'</p>');

	function formatAddress(a) {
		if (a.address == a.contact) {
			return a.address;
		} else {
			return a.contact+' ('+a.address+')';
		}
	}
}

function Calendar() {
	var me = this;

	var towns = [
		{ x:8.54, y:47.38, color:[255,230,  0], title:'Zürich'   },
		{ x:7.44, y:46.95, color:[255,  0, 23], title:'Bern'     },
		{ x:7.59, y:47.56, color:[206,  0,186], title:'Basel'    },
		{ x:6.15, y:46.20, color:[  5,  0,170], title:'Genf'     },
		{ x:8.30, y:47.05, color:[  0,133,211], title:'Luzern'   },
		{ x:6.63, y:46.52, color:[  0,166, 81], title:'Lausanne' }
	]

	var initialized = false;

	me.hide = function () {
		map.hideTownLayer();
	}

	me.show = function () {
		if (!initialized) {
			towns.forEach(function (town) {
				map.addTown(town);
			})

			var hours = [];

			var blockMinutes = 60;
			var blockCount = blockMinutes/timeStepMinutes;
			var blocksPerDay = 1440/blockMinutes;

			data.positions.forEach(function (position, timeIndex) {
				var hourIndex = Math.floor(timeIndex/blockCount);
				if (hours[hourIndex] == undefined) hours[hourIndex] = [0,0,0,0,0,0];

				towns.forEach(function (town, townIndex) {
					var dx = position.x - town.x;
					var dy = position.y - town.y;
					var d = Math.sqrt(sqr(dx*0.68) + sqr(dy));
					var geoConf = d*30;
					var posConf = position.r/10000;
					geoConf = Math.min(1, Math.max(0, 2-geoConf));
					posConf = Math.min(1, Math.max(0, 2-posConf));
					hours[hourIndex][townIndex] += geoConf*(posConf*0.8+0.2);
				})
			});

			var calendar = [];

			hours.forEach(function (townConf, hourIndex) {
				var time = (data.config.timeStart + hourIndex*blockMinutes*60)*1000;
				var blockInDay = hourIndex % blocksPerDay;
				var day = Math.floor(hourIndex / blocksPerDay);
				var weekDay = (day + weekDayOffset) % 7;
				var week = Math.floor((day - weekDay)/7 + 1);

				var bestTownIndex = -1;
				var bestTownValue = 1;
				townConf.forEach(function (value, townIndex) {
					if (value > bestTownValue) {
						bestTownValue = value;
						bestTownIndex = townIndex;
					}
				});
				bestTownValue /= blockCount;

				if (calendar[week]             === undefined) calendar[week]             = [];
				if (calendar[week][blockInDay] === undefined) calendar[week][blockInDay] = [];

				calendar[week][blockInDay][weekDay] = [bestTownIndex, bestTownValue];

			})

			calendar.forEach(function (week, weekIndex) {
				var html = [];

				var row = weekDays.map(function (weekDay) {
					return '<th>'+weekDay.label+'</th>';
				})

				html.push('<tr>'+row.join('')+'</tr>');

				var block = week.map(function (timeRow, blockInDay) {
					var row = [];
					for (var weekDay = 0; weekDay < 7; weekDay++) {
						var block = timeRow[weekDay];
						if (block === undefined) {
							row.push('<td></td>');
						} else {
							var color = [255,255,255];
							if (block[0] >= 0) color = towns[block[0]].color;
							var opacity = block[1];
							color = color.map(function (value) {
								return (value*opacity + 255*(1-opacity)).toFixed(0);
							}).join(',');
							row.push('<td style="background:rgb('+color+')"></td>');
						}
					}
					return '<tr>'+row.join('')+'</tr>';
				})

				html.push(block.join('\n'));

				html = '<div class="week"><table>'+html.join('\n')+'</table></div>';

				$('#rightCalendar').append(html);
			})

			initialized = true;
		}
		map.showTownLayer();
	}

	return me;
}

function makeEventListener(object) {
	var eventCallbacks = {};

	object.on = function (event, f) {
		if (eventCallbacks[event] === undefined) eventCallbacks[event] = [];
		eventCallbacks[event].push(f);
	}

	object.trigger = function (event, param) {
		if (eventCallbacks[event] !== undefined) {
			setTimeout(function () {
				eventCallbacks[event].forEach(function (func) { func(param) });
			}, 0);
		}
	}
}

function sqr(x) {
	return x*x;
}

var iconSVG = {
	facebook: 'M11.8,8.2v6.6H9.1V8.2H7.7V5.9h1.4V4.6c0-1.9,1.1-3,3-3h1.8v2.3h-1.1c-0.7,0-0.9,0.3-0.9,0.9v1.1h2.1l-0.2,2.3H11.8z M15.1,0.9C14.5,0.3,13.8,0,13,0H3C1.4,0,0,1.4,0,3v10c0,0.8,0.3,1.5,0.9,2.1C1.5,15.7,2.2,16,3,16h10c1.6,0,3-1.4,3-3V3C16,2.2,15.7,1.5,15.1,0.9C14.5,0.3,15.7,1.5,15.1,0.9z',
	tweet:'M12.2,6.2c0.6,5.1-5.6,8.1-9.6,5.5c1.2,0.1,2.3-0.2,3.2-0.9c-0.5,0-0.9-0.2-1.3-0.4S4,9.7,3.9,9.3c0.3,0.1,0.6,0.1,0.9,0C3.8,9,3,8.1,3,7.1v0c0.4,0.2,0.7,0.3,1,0.3c-1-0.6-1.2-1.9-0.6-2.9c1.1,1.4,2.8,2.2,4.5,2.3c-0.6-2.1,2.3-3.6,3.7-2c0.5-0.1,0.9-0.3,1.4-0.5c-0.2,0.5-0.5,0.9-1,1.2c0.5-0.1,0.9-0.2,1.3-0.4C13,5.5,12.7,5.8,12.2,6.2C12.2,6.2,12.7,5.8,12.2,6.2z M15.1,0.9C14.5,0.3,13.8,0,13,0H3C1.4,0,0,1.4,0,3v10c0,0.8,0.3,1.5,0.9,2.1C1.5,15.7,2.2,16,3,16h10c1.6,0,3-1.4,3-3V3C16,2.2,15.7,1.5,15.1,0.9C14.5,0.3,15.7,1.5,15.1,0.9z',
	sms:'M15.1,0.9C14.5,0.3,13.8,0,13,0H3C1.4,0,0,1.4,0,3v10c0,1.6,1.4,3,3,3h10c1.6,0,3-1.4,3-3V3C16,2.2,15.7,1.5,15.1,0.9C14.5,0.3,15.7,1.5,15.1,0.9z M13.2,10c-1.5,1.9-4.4,2.4-6.7,2c-0.9,0.7-2,1.1-3.1,1.2h0c-0.1,0-0.2-0.1-0.3-0.2c0-0.1,0-0.1,0-0.2l0,0c0,0,0.1-0.1,0.1-0.2c0.4-0.5,0.8-0.8,1-1.4c-4.3-2.5-1.5-7.1,2.5-7.7C10.1,3,16.5,5.8,13.2,10C12.7,10.6,13.7,9.3,13.2,10z',
	call:'M13.1,12.1c-0.8,1.7-3,1.1-4.3,0.7c-1.1-0.4-2.3-1.2-3.3-2.3C4.4,9.5,3.6,8.4,3.2,7.2c-0.4-1.3-1-3.5,0.7-4.3c1.5-0.6,1.7,0.5,2.3,1.7C7.1,6,4.6,6.1,5.5,7.4c0.7,1.3,1.8,2.4,3.1,3.1c1.3,0.9,1.4-1.6,2.9-0.7l0.6,0.3c0.4,0.2,0.7,0.4,0.9,0.5c0.2,0.1,0.4,0.3,0.4,0.3C13.4,11.3,13.2,11.9,13.1,12.1C13,12.5,13.3,11.8,13.1,12.1z M15.1,0.9C14.5,0.3,13.8,0,13,0H3C1.4,0,0,1.4,0,3v10c0,0.8,0.3,1.5,0.9,2.1C1.5,15.7,2.2,16,3,16h10c1.6,0,3-1.4,3-3V3C16,2.2,15.7,1.5,15.1,0.9C14.5,0.3,15.7,1.5,15.1,0.9z',
	mail:'M15.1,0.9C14.5,0.3,13.8,0,13,0H3C1.4,0,0,1.4,0,3v10c0,1.6,1.4,3,3,3h10c1.6,0,3-1.4,3-3V3C16,2.2,15.7,1.5,15.1,0.9C14.5,0.3,15.7,1.5,15.1,0.9z M13.7,11.5c0,0.6-0.5,1-1,1H3.3c-0.6,0-1-0.5-1-1V6.4c0.9,1,2.2,1.6,3.3,2.4C6.3,9.3,7.1,10,8,10h0h0c1,0,1.8-0.8,2.5-1.3c1-0.7,2.4-1.4,3.2-2.3V11.5z M13.4,5.5c-0.7,1.1-2.1,1.7-3.2,2.5C9.6,8.4,8.8,9.2,8,9.2h0h0c-1.2,0-2.9-1.8-3.8-2.4C3.6,6.5,3,6.1,2.6,5.5c-0.5-0.7-0.5-2,0.7-2h9.4C13.8,3.5,13.9,4.8,13.4,5.5C13.2,5.8,13.6,5.2,13.4,5.5z'
}