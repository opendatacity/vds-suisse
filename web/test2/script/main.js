var scrollBar, player, map, comList;


$(function () {
	initModules();

	tabBar = new TabBar();
	scrollBar = new ScrollBar();
	player = new Player();
	map = new Map();
	calendar = new Calendar();
	comList = new CommunicationList();

	tabBar.on('activate', function (id) {
		var section = $('#middleSection');
		switch (id) {
			case 'tabList':
				section.removeClass('calendarView');
				calendar.hide();
			break;
			case 'tabCalendar':
				section.addClass(   'calendarView');
				calendar.show();
			break;
		}
	})

	scrollBar.on('drag',      function () { player.setTimeIndex(scrollBar.getTimeIndex()); })
	scrollBar.on('dragStart', function () { player.stop(); })
	scrollBar.on('dragEnd',   function () { player.stop(); })

	player.on('change', function () { scrollBar.setTimeIndex(player.getTimeIndex()); })
	player.on('change', function () { $('#infoText').html(formatDate(player.getTimeStamp())); })
	player.on('change', function () { map.redraw(); })
	player.on('change', function () { comList.redraw(); })

	player.on('start', function () { $('#playPauseButtons').addClass(   'paused'); })
	player.on('stop',  function () { $('#playPauseButtons').removeClass('paused'); })

	$('#playButton' ).click(function () { player.start(); })
	$('#pauseButton').click(function () { player.stop();  })
	$('#showNewsletters').click(function () {
		comList.showNewsletters($('#showNewsletters').prop('checked'));
	});

	$('#speedButton1').click(function () { $('.speedButton').removeClass('active'); $('#speedButton1').addClass('active'); player.setSpeed( 200) });
	$('#speedButton2').click(function () { $('.speedButton').removeClass('active'); $('#speedButton2').addClass('active'); player.setSpeed(1000) });
	$('#speedButton3').click(function () { $('.speedButton').removeClass('active'); $('#speedButton3').addClass('active'); player.setSpeed(5000) });

	player.start();
})

function formatDate(value) {
	var d = new Date(value);
	d = ''+
		d.getDate() + '.' +
		(d.getMonth()+1) + '.' +
		d.getFullYear() + '<br>' +
		d.getHours() + ':' +
		(100+d.getMinutes()).toFixed().substr(1);
	return d;
}


function formatTime(value) {
	var d = new Date(value);
	d = ''+
		d.getHours() + ':' +
		(100+d.getMinutes()).toFixed().substr(1) + ':' +
		(100+d.getSeconds()).toFixed().substr(1);
	return d;
}