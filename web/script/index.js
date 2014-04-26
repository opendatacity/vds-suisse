var title_long = 'Vorratsdatenspeicherung in der Schweiz';
var where_to = 'http://apps.opendatacity.de/vds';

$(document).ready(function () {
	
	/* set urls for share buttons */
	$('.share-pop.twitter').attr('href', "https://twitter.com/intent/tweet?url=" + encodeURIComponent(where_to) + '&text=' + encodeURIComponent(title_long));
	$('.share-pop.facebook').attr('href', "http://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(where_to) + '&t=' + encodeURIComponent(title_long));
	$('.share-pop.google').attr('href',"https://plus.google.com/share?url=" + encodeURIComponent(where_to) + '&text=' + encodeURIComponent(title_long));
	$('.share-pop.adn').attr('href',"https://alpha.app.net/intent/post?text=" +encodeURIComponent(title_long +' '+where_to));

	/* social media link */
	$('.share-pop').click(function(evt){
		evt.preventDefault();
		window.open($(this).attr('href'), "share", "width=500,height=300,status=no,scrollbars=no,resizable=no,menubar=no,toolbar=no");
		return false;
	});

	/* embed code */
	$('#button-share').click(function(evt){
		evt.preventDefault();
		$('body').toggleClass('show-share');
	});
	
	/* maximize container height */
	$('#container').css('min-height', ($(window).innerHeight()-$('footer').outerHeight()));
	$(window).resize(function(){
		$('#container').css('min-height', ($(window).innerHeight()-$('footer').outerHeight()));
	});

});
