var timeIndexZoom = 6;
var scrollBarHeight = 48;

var maxDays, timeStepMinutes, timeStepSeconds, maxMinutes, maxTimeIndex, dayLength, dayWidth;

function initModules() {
	maxDays = data.config.days;
	timeStepSeconds = data.config.timeStepSeconds;
	timeStepMinutes = data.config.timeStepSeconds/60;

	maxMinutes = maxDays*1440;
	maxTimeIndex = maxMinutes/timeStepMinutes;
	dayLength = 1440/timeStepMinutes;
	dayWidth = dayLength/timeIndexZoom;
}

var weekDayOffset = 2;
var weekDays = [
	{ label: 'Mo', bgColor:'#FFFFFF', color:'#C7C7C7', lColor:'#C7C7C7' },
	{ label: 'Di', bgColor:'#FFFFFF', color:'#C7C7C7', lColor:'#C7C7C7' },
	{ label: 'Mi', bgColor:'#FFFFFF', color:'#C7C7C7', lColor:'#C7C7C7' },
	{ label: 'Do', bgColor:'#FFFFFF', color:'#C7C7C7', lColor:'#C7C7C7' },
	{ label: 'Fr', bgColor:'#FFFFFF', color:'#C7C7C7', lColor:'#C7C7C7' },
	{ label: 'Sa', bgColor:'#F0F0F0', color:'#B0B0B0', lColor:'#B0B0B0' },
	{ label: 'So', bgColor:'#F0F0F0', color:'#B0B0B0', lColor:'#B0B0B0' }
];

function ScrollBar() {
	var me = this;
	makeEventListener(me);

	var useCanvas = false;
	var scale = 2;

	var scrollBarWidth = maxDays*1440/(timeIndexZoom*timeStepMinutes);
	var container = $('#scrollContainer');
	var canvas = useCanvas ? $('#scrollCanvas') : $('#scrollImage');
	var context;

	var timeIndex = 0;
	
	function initCanvas() {
		canvas.css({display:'block'});
		canvas.attr({width:scrollBarWidth*scale, height:scrollBarHeight*scale});

		container.mousedown(mouseDown);
		$(document).mousemove(mouseMove);
		$(document).mouseup(  mouseUp  );

		context = canvas.get(0).getContext('2d');
		context.clearRect(0, 0, scrollBarWidth*scale, scrollBarHeight*scale);

		var v = [];
		var maxV = 0;
		for (var x = 0; x < scrollBarWidth; x++) v[x] = 0;
		data.activities.forEach(function (entry) {
			var x = Math.floor(entry.index/timeIndexZoom);
			v[x] += entry.cells.length;
			if (maxV < v[x]) maxV = v[x];
		})
		
		for (var weekDayIndex = 0; weekDayIndex < 7; weekDayIndex++) {
			var maxWeeks = Math.ceil((maxDays - weekDayIndex + weekDayOffset)/7);

			context.fillStyle = weekDays[weekDayIndex % 7].bgColor;
			for (var week = 0; week < maxWeeks; week++) {
				var x = (weekDayIndex - weekDayOffset + 7*week)*dayWidth;
				context.fillRect(x*scale, 0, dayWidth*scale, scrollBarHeight*scale);
			}
			context.fill();

			context.fillStyle = weekDays[weekDayIndex % 7].color;
			context.font = (8*scale)+'px Verdana';
			
			var text = weekDays[weekDayIndex % 7].label;

			for (var week = 0; week < maxWeeks; week++) {
				var day = weekDayIndex - weekDayOffset + 7*week;
				var date = new Date(data.config.timeStart*1000 + (day+0.5)*86400000);
				date = date.getDate();
				
				var x = (day + 0.5)*dayWidth;

				var label = text + ' ' + date + '.';

				var w = context.measureText(label).width;
				context.fillText(label, x*scale + 2 - w/2, 10*scale);
			}
			context.fill();
		}
		
		for (var weekDayIndex = 0; weekDayIndex < 7; weekDayIndex++) {
			var maxWeeks = Math.ceil((maxDays - weekDayIndex + weekDayOffset)/7);

			context.beginPath();
			context.strokeStyle = weekDays[weekDayIndex % 7].lColor;
			context.lineWidth = scale;
			for (var week = 0; week < maxWeeks; week++) {
				var x = (weekDayIndex - weekDayOffset + 7*week)*dayWidth + 0.5;
				context.moveTo(x*scale, 0)
				context.lineTo(x*scale, scrollBarHeight*scale);

				x += dayWidth;
				context.moveTo(x*scale, 0)
				context.lineTo(x*scale, scrollBarHeight*scale);
			}
			context.stroke();
		}

		context.strokeStyle = 'rgba(0,0,0,0.8)';
		context.lineWidth = scale;
		for (var x = 0; x < scrollBarWidth; x++) {
			y = (scrollBarHeight)*(1-1.5*v[x]/maxV);
			if (y < 0) y = 0;
			context.moveTo((x-0.5)*scale, scrollBarHeight*scale);
			context.lineTo((x-0.5)*scale, y*scale);
		}
		context.stroke();

		console.log(canvas.get(0).toDataURL().substr(22));

		redraw();
	}

	function initImage() {
		canvas.css({display:'block'});
		canvas.attr({width:scrollBarWidth, height:scrollBarHeight});

		container.mousedown(mouseDown);
		$(document).mousemove(mouseMove);
		$(document).mouseup(  mouseUp  );

		canvas.on('dragstart', function(event) { event.preventDefault(); });
	}

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

	if (useCanvas) {
		initCanvas()
	} else {
		initImage()
	}

	return me;
}

function Player() {
	var me = this;
	makeEventListener(me);

	var timeIndex = 100;
	var framesPerSecond = 25;

	var interval = false;
	var paused = false;
	var speed = 2/15;

	me.start = function () {
		if (!interval) {
			interval = setInterval(me.step, framesPerSecond);
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
		timeIndex += speed;
		me.trigger('change');
		if (timeIndex >= maxTimeIndex) me.stop();
	}

	me.setSpeed = function (newSpeed) {
		speed = newSpeed/(data.config.timeStepSeconds*framesPerSecond);
	}

	me.getTimeIndex = function () {
		return timeIndex;
	}

	me.getTimeStamp = function () {
		return (timeIndex*timeStepSeconds + data.config.timeStart)*1000;
	}

	me.getTime = function () {
		return (timeIndex*timeStepSeconds + data.config.timeStart);
	}

	me.getDayTimeIndex = function () {
		var timeStamp = me.getTimeStamp();
		var time = new Date(timeStamp);
		time.setHours(0);
		time.setMinutes(0);
		time.setSeconds(0);
		time = (timeStamp - time.getTime())/1000;
		return time/data.config.timeStepSeconds;
	}

	me.getDayIndex = function () {
		var day = new Date(me.getTimeStamp());
		day.setHours(0);
		day = day.getTime()/1000 - data.config.timeStart;
		return Math.round(day/86400);
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
	var map = L.map('map', {
		minZoom:3,
		maxZoom: 14,
		maxBounds: [
			[45.3, 5], //south west
			[48.2, 11.6]  //north east
		]
	}).setView([47, 7.5], 7);

	// add an OpenStreetMap tile layer
	L.tileLayer('http://{s}.tilt.odcdn.de/suisse/{z}/{x}/{y}.png', {
		attribution: 'Map data &copy; <a href="http://openstreetmap.org" target="_blank">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/" target="_blank">CC-BY-SA</a>'
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

	var dotLayer = L.marker([0,0], {
		icon: icons[1],
		clickable: false,
		keyboard: false
	}).addTo(map);

	me.redraw = function () {
		var intervalSize = 12;

		var timeIndex = player.getTimeIndex();
		var i0 = Math.floor(timeIndex - intervalSize);
		var i1 = Math.ceil(timeIndex + intervalSize);

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

		var i0 = Math.floor(timeIndex);
		var i1 = Math.min(i0+1, data.positions.length-1);
		
		var p0 = data.positions[i0];
		var p1 = data.positions[i1];
		
		var a = timeIndex - i0;
		
		var x = p0.x*(1-a) + a*p1.x;
		var y = p0.y*(1-a) + a*p1.y;
		var r = p0.r*(1-a) + a*p1.r;

		dotLayer.setLatLng([y, x])
		var iconId = Math.max(0, Math.min(8, Math.floor((r-10000)/3000)))+1;
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
	var dayBottomBuffer = 300;

	for (var i = 0; i < data.events.length; i++) {
		data.events[i].index = i;
	}

	var dayNode;
	var activeDayIndex = -1;
	var dayHeight;

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

		var node = $('#comList').html('<div class="comDay" id="day'+dayIndex+'"></div>');

		var paper = Raphael(node.get(0), 300, dayHeight + dayBottomBuffer);


		entries.forEach(function (entry) {
			var color, label;
			switch (entry.type) {
				case 'facebook': color = '#3c5a96'; label = 'Facebook-Post'; break;
				case 'tweet':    color = '#59adeb'; label = 'Tweet';         break;
				case 'sms':      color = '#22aa22'; label = 'SMS %';          break;
				case 'call':     color = '#cc2222'; label = 'Anruf %';        break;
				case 'mail':     color = '#cccccc'; label = 'E-Mail %';       break;
				default:
					console.error('Unknown type "'+entry.type+'"');
			}

			if (entry.start == entry.end) {
				paper.path('M40,'+entry.y0+'C60,'+entry.y0+',60,'+entry.y+',80,'+entry.y).attr({stroke:color});
			} else {
				paper.path('M40,'+entry.y0+'C60,'+entry.y0+',60,'+entry.y+',80,'+entry.y+'C60,'+entry.y+',60,'+entry.y1+',40,'+entry.y1).attr({stroke:color, fill:color, 'fill-opacity':0.2});
			}

			if (entry.inBound) {
				paper.path(iconSVG.arrow).attr({
					stroke:false,
					fill:color,
					transform:'S0.75T80,'+(entry.y - lineHeight/2)
				});
				label = label.replace(/%/, 'von ' + addresses2Text([entry.from]));
			}

			if (entry.outBound) {
				paper.path(iconSVG.arrow).attr({
					stroke:false,
					fill:color,
					transform:'S0.75T105,'+(entry.y - lineHeight/2)
				});
				label = label.replace(/%/, 'an ' + addresses2Text(entry.to));
			}

			paper.path(iconSVG[entry.type]).attr({
				stroke:false,
				fill:color,
				transform:'S0.75T92,'+(entry.y - lineHeight/2)
			});

			if (label.length > 28) label = label.substr(0,25)+'…';
			paper.text(125, entry.y, label).attr({fill:color, 'text-anchor':'start', 'font-family':'sans-serif', 'font-size':12});

			paper.rect(40, entry.y - lineHeight/2, 260, lineHeight).attr({stroke:false, fill:'#000', 'fill-opacity':0}).hover(
				function () {
					var html = [];

					if (isFinite(entry.from)) html.push('<b>Von:</b> '+addresses2Text([entry.from]));
					if (entry.to.length > 0 ) html.push('<b>An:</b> ' +addresses2Text( entry.to   ));
					if (entry.subject       ) html.push('<b>Inhalt:</b> ' +entry.subject);
					if (entry.url           ) html.push('<b>Link:</b> <a href="' +entry.url+'">'+(entry.url.length > 20 ? entry.url.substr(0,19)+'…' : entry.url)+'</a>');

					html = '<p>' + html.join('</p><p>') + '</p>';

					$('#comDetails')
						.css({display:'block', top:entry.y + lineHeight/2 + 100, color:color})
						.html(html);
				},
				function () {
					$('#comDetails').css({display:'none'})
				}
			);
		})

		function addresses2Text(addresses) {
			return addresses.map(function (contactId) {
				var contact = data.contacts[contactId];
				return contact.label + (contact.nr ? ' Nr. '+contact.nr : '');
			}).join(', ');
		}

		var quarterHeight = dayHeight/96;
		for (var i = 0; i < 96; i++) {
			var hour = Math.floor(i/4);
			var y = i*quarterHeight;
			switch (i % 4) {
				case 0:
					paper.path('M10,'+y+'L40,'+y).attr({stroke:'#ccc'});
					paper.text(35, y+7, hour+':00').attr({fill:'#ccc', 'text-anchor':'end', 'font-family':'sans-serif', 'font-size':10});
				break;
				default:
					paper.path('M30,'+y+'L40,'+y).attr({stroke:'#ccc'});
			}
		}
		paper.path('M40,0L40,'+dayHeight).attr({stroke:'#ccc'});

		return node;
	}

	me.redraw = function (force) {
		var date = new Date(player.getTimeStamp());

		var dayIndex = player.getDayIndex();

		if (activeDayIndex != dayIndex) {
			drawDay(dayIndex);
			activeDayIndex = dayIndex;
		}

		var y = player.getDayTimeIndex();
		y = dayHeight*y/(86400/data.config.timeStepSeconds);
		$('#comWrapper').scrollTop(y);
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

	var cells = [];
	var lastCell = false;

	var towns = [
		{ x:8.54, y:47.38, color:[255,230,  0], title:'Zürich'   },
		{ x:7.44, y:46.95, color:[255,  0, 23], title:'Bern'     },
		{ x:7.59, y:47.56, color:[206,  0,186], title:'Basel'    },
		{ x:6.15, y:46.20, color:[  5,  0,170], title:'Genf'     },
		{ x:8.30, y:47.05, color:[  0,133,211], title:'Luzern'   },
		{ x:6.63, y:46.52, color:[  0,166, 81], title:'Lausanne' }
	]

	var initialized = false;
	var visible = true;

	var blockMinutes = 60;
	var blockCount = blockMinutes/timeStepMinutes;
	var blocksPerDay = 1440/blockMinutes;

	var time0 = new Date(data.config.timeStart*1000);
	time0.setDate(time0.getDate() - (time0.getDay()+6) % 7);
	time0.setHours(0);
	time0.setMinutes(0);
	time0.setSeconds(0);
	time0 = time0.getTime();

	me.hide = function () {
		map.hideTownLayer();
		visible = false;
	}

	me.show = function () {
		if (!initialized) {
			towns.forEach(function (town) {
				map.addTown(town);
			})

			var hours = [];

			data.positions.forEach(function (position, timeIndex) {
				var hourIndex = getHourIndex(timeIndex);

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
				var blockInDay = hourIndex % blocksPerDay;
				var day = Math.floor(hourIndex / blocksPerDay);
				var weekDay = day % 7;
				var week = Math.floor((day - weekDay)/7);

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

				calendar[week][blockInDay][weekDay] = [bestTownIndex, bestTownValue, hourIndex];

			})

			calendar.forEach(function (week, weekIndex) {
				var startDate = new Date(time0 + (weekIndex*7+0.5)*86400000);
				var   endDate = new Date(time0 + (weekIndex*7+6.5)*86400000);
				var weekLabel = ''    + startDate.getDate() + '.' + (startDate.getMonth()+1) + '.' +
				                ' - ' +   endDate.getDate() + '.' + (  endDate.getMonth()+1) + '.';

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
							row.push('<td style="background:rgb('+color+')" index="'+block[2]+'"></td>');
						}
					}
					return '<tr>'+row.join('')+'</tr>';
				})

				html.push(block.join('\n'));

				html = '<div class="week"><h2>'+weekLabel+'</h2><table>'+html.join('\n')+'</table></div>';

				$('#rightCalendar').append(html);
			})

			var cellNodes = $('#rightCalendar td');
			cellNodes.each(function (index, cell) {
				cell = $(cell);
				var hourIndex = cell.attr('index');
				if (hourIndex !== undefined) cells[hourIndex] = cell;
			})
			cellNodes.click(function (event) {
				var cell = $(event.currentTarget);
				var hourIndex = cell.attr('index');
				if (hourIndex !== undefined) setHourIndex(hourIndex);
			})

			initialized = true;
		}
		map.showTownLayer();
		visible = true;
		me.redraw();
	}

	me.redraw = function () {
		if (initialized && visible) {
			var hourIndex = getHourIndex(player.getTimeIndex());
			var newCell = cells[hourIndex];
			if (newCell !== lastCell) {
				if (lastCell) lastCell.removeClass('active');
				newCell.addClass('active');
				lastCell = newCell;
			}
		}
	}

	function getHourIndex(timeIndex) {
		var date = new Date((data.config.timeStart + timeIndex*data.config.timeStepSeconds)*1000);
		var dayDate = new Date(date.getTime());
		dayDate.setHours(0);
		var dayIndex = Math.round((dayDate.getTime() - time0)/86400000);
		var time = dayIndex*1440 + date.getHours()*60 + date.getMinutes();
		
		return Math.floor(time/blockMinutes);
	}

	function setHourIndex(hourIndex) {
		var hour = hourIndex % 24;
		var day = Math.floor(hourIndex/24);
		var date = new Date(time0);

		date.setDate(date.getDate()+day);
		date.setHours(hour);
		date.setMinutes(0);
		date.setSeconds(0);

		var timeIndex = (date.getTime()/1000 - data.config.timeStart)/data.config.timeStepSeconds;

		player.setTimeIndex(timeIndex);
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
	mail:'M15.1,0.9C14.5,0.3,13.8,0,13,0H3C1.4,0,0,1.4,0,3v10c0,1.6,1.4,3,3,3h10c1.6,0,3-1.4,3-3V3C16,2.2,15.7,1.5,15.1,0.9C14.5,0.3,15.7,1.5,15.1,0.9z M13.7,11.5c0,0.6-0.5,1-1,1H3.3c-0.6,0-1-0.5-1-1V6.4c0.9,1,2.2,1.6,3.3,2.4C6.3,9.3,7.1,10,8,10h0h0c1,0,1.8-0.8,2.5-1.3c1-0.7,2.4-1.4,3.2-2.3V11.5z M13.4,5.5c-0.7,1.1-2.1,1.7-3.2,2.5C9.6,8.4,8.8,9.2,8,9.2h0h0c-1.2,0-2.9-1.8-3.8-2.4C3.6,6.5,3,6.1,2.6,5.5c-0.5-0.7-0.5-2,0.7-2h9.4C13.8,3.5,13.9,4.8,13.4,5.5C13.2,5.8,13.6,5.2,13.4,5.5z',
	arrow:'M10,6v-2l4,4l-4,4v-2h-8v-4H10z'
}
