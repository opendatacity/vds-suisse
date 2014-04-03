var maxDays = 181;
var timeIndexZoom = 6;
var timeIndexMinutes = 5;
var scrollBarHeight = 48;

var maxMinutes = maxDays*1440;
var maxTimeIndex = maxMinutes/timeIndexMinutes;
var dayWidth = 1440/(timeIndexMinutes*timeIndexZoom);

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

	var scrollBarWidth = maxDays*1440/(timeIndexZoom*timeIndexMinutes);
	var container = $('#scrollContainer');
	var canvas = $('#scrollCanvas');

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
		pressed = false;
		me.trigger('dragEnd');
	} 

	var eventCallbacks = {};
	me.on = function (event, f) {
		if (eventCallbacks[event] === undefined) eventCallbacks[event] = [];
		eventCallbacks[event].push(f);
	}
	me.trigger = function (event) {
		if (eventCallbacks[event] !== undefined) {
			eventCallbacks[event].forEach(function (func) { func() });
		}
	}

	init()

	return me;
}

function Player() {
	var me = this;

	var timeIndex = 100;

	var interval = false;
	var paused = false;

	me.start = function () {
		if (!interval) interval = setInterval(me.step, 50);
	}

	me.stop = function () {
		if (interval) {
			clearInterval(interval);
			interval = false;
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

	var eventCallbacks = {};
	me.on = function (event, f) {
		if (eventCallbacks[event] === undefined) eventCallbacks[event] = [];
		eventCallbacks[event].push(f);
	}
	me.trigger = function (event) {
		if (eventCallbacks[event] !== undefined) {
			eventCallbacks[event].forEach(function (func) { func() });
		}
	}

	return me;
}