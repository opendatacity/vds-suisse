var scrollBar = new ScrollBar();
var player = new Player();
var map = new Map();


$(function () {

	var activityList = [];
	data.activities.forEach(function (activity) {
		activity.cells = activity.cells.map(function (index) {
			return data.cells[index];
		})
		activityList[activity.index] = activity;
	})

	scrollBar.on('drag', function () {
		player.setTimeIndex(scrollBar.getTimeIndex());
	})

	scrollBar.on('dragStart', function () {
		player.pause();
	})

	scrollBar.on('dragEnd', function () {
		player.unpause();
	})

	player.on('change', function () {
		scrollBar.setTimeIndex(player.getTimeIndex());
	})

	player.on('change', function () {
		$('#infoText').html(formatDate(player.getDateTime()));
	})

	player.on('change', function () {
		map.redraw();
	})

	player.on('start', function () {
		$('#playPauseButtons').addClass('paused');
	})

	player.on('stop', function () {
		$('#playPauseButtons').removeClass('paused');
	})

	$('#playButton').click(function () {
		player.start();
	})

	$('#pauseButton').click(function () {
		player.stop();
	})

	player.start();
})

function formatDate(value) {
	var d = new Date(value);
	d = ''+
		d.getDay() + '.' +
		(d.getMonth()+1) + '.' +
		d.getFullYear() + '<br>' +
		d.getHours() + ':' +
		d.getMinutes();
	return d;
}