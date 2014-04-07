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

		context.strokeStyle = '#000';
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
	var map = L.map('map').setView([47.2, 8.3], 9);

	// add an OpenStreetMap tile layer
	L.tileLayer('http://tiles.odcdn.de/europe2/{z}/{x}/{y}.png', {
	}).addTo(map);

	var cellLayer = L.layerGroup();
	cellLayer.addTo(map);

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
				//console.log(value, activity.index, i, timeIndex);
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
					weight: 1,
					color: color,
					fillColor: color,
					fillOpacity: 0.5
				}
			).addTo(cellLayer);
		});

		var path = [];
		for (var i = i0; i <= i1; i++) {
			path.push([data.positions[i].y, data.positions[i].x]);
		}
		L.polyline(path, {color:'rgba(127,0,0,0.2)'}).addTo(cellLayer);

		var position = data.positions[timeIndex];
		L.circle(
			[position.y, position.x],
			position.r,
			{
				fill:false,
				weight:2,
				color: '#000',
				opacity: 0.5*Math.min(1, sqr(4000/position.r))
			}
		).addTo(cellLayer);



	}

	return me;
}

function CommunicationList() {
	var me = this;
	var lastEventStart = -1e10;

	me.redraw = function () {
		var html = [];

		var index = player.getTimeStamp();
		var time0 = (index - 0*60*60*1000)/1000;

		for (var i = 0; i < data.events.length; i++) {
			var event = data.events[i];
			if (event.end > time0) html.push(event)
			if (html.length > 20) break;
		}

		html.sort(function (a,b) {
			return a.start - b.start;
		})

		var start = html[0] ? html[0].start : 0;
		if (lastEventStart == start) return;

		lastEventStart = start;

		if (html.length > 20) html.length = 20;

		html = html.map(function (event) {
			var duration = event.dur || '';
			var inout = event.incoming ? 'in' : 'out';
			var line =
				'<tr>'+
					'<td>'+formatTime(event.start*1000)+'</td>'+
					'<td>'+duration+'</td>'+
					'<td>'+event.type+'</td>'+
					'<td>'+inout+'</td>'+
				'</tr>';

			return line;
		})


		html.unshift('<tr><th>Zeit</th><th>Dauer</th><th>Typ</th><th>In/Out</th></tr>');
		html = html.join('\n');

		$('#rightList').html('<table>'+html+'</table>');
	}

	return me;
}

function makeEventListener(object) {
	var eventCallbacks = {};

	object.on = function (event, f) {
		if (eventCallbacks[event] === undefined) eventCallbacks[event] = [];
		eventCallbacks[event].push(f);
	}

	object.trigger = function (event) {
		if (eventCallbacks[event] !== undefined) {
			eventCallbacks[event].forEach(function (func) { func() });
		}
	}
}

function sqr(x) {
	return x*x;
}
