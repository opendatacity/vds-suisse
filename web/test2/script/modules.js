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

	for (var i = 0; i < data.events.length; i++) {
		data.events[i].index = i;
	}

	me.redraw = function (force) {
		var html = [];

		var index = player.getTimeStamp();
		var time0 = (index - 0*60*60*1000)/1000;

		for (var i = 0; i < data.events.length; i++) {
			var event = data.events[i];
			if (event.end > time0) {
				var newsletter = ((''+event.from.org).toLowerCase().substr(0,4) == 'news');
				if (!newsletter || showNewsletters) {
					html.push(event)
				}
			}
			if (html.length > maxEntries) break;
		}

		html.sort(function (a,b) {
			return a.start - b.start;
		})

		var start = html[0] ? html[0].start : 0;
		if (!force && (lastEventStart == start)) return;

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
