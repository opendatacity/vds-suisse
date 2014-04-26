var fs = require('fs');
var utils = require('./modules/utils');

exports.import = function (activities, config) {
	console.log('Calc Position');

	var fixpoints = activities.map(function (activity) {
		var sx = 0;
		var sy = 0;
		var sr = 0;
		activity.cells.forEach(function (cell) {
			var r = 1/(cell.acc*cell.acc);
			sx += cell.x*r;
			sy += cell.y*r;
			sr += r;
		})

		return {
			index: activity.index,
			x: sx/sr,
			y: sy/sr,
			r: 1/Math.sqrt(sr)
		}

		return {
			index: activity.index,
			x: activity.cells[0].x,
			y: activity.cells[0].y,
			r: activity.cells[0].acc
		}
	})



	var positions = [];
	var newPositions = [];
	var fpIndex  = 0;
	var fpIndex0 = 0;
	var fpIndex1 = 0;
	var n = config.indexCount;
	var speed = 30*config.timeStepSeconds/3.6;

	for (var i = 0; i < n; i++) {
		if (fixpoints[fpIndex1].index <= i) {
			fpIndex++;
			fpIndex1 = Math.min(fixpoints.length-1, fpIndex  );
			fpIndex0 = Math.min(fixpoints.length-1, fpIndex-1);
		}
		
		var a = fixpoints[fpIndex1].index - fixpoints[fpIndex0].index;
		if (a > 0) a = (i - fixpoints[fpIndex0].index)/a;

		positions[i] = {
			x: fixpoints[fpIndex0].x*(1-a) + a*fixpoints[fpIndex1].x,
			y: fixpoints[fpIndex0].y*(1-a) + a*fixpoints[fpIndex1].y,
			r: fixpoints[fpIndex0].r*(1-a) + a*fixpoints[fpIndex1].r
		}

		newPositions[i] = { x:0, y:0, r:0 };
	}

	for (var k = 0; k < 1000; k++) {
		pathBlur(true);
		pathFix();
	}

	pathBlur(false);

	function pathBlur(blurAccuracy) {
		for (var i = 0; i < n; i++) {
			var p0 = positions[Math.max(  0, i-1)];
			var p  = positions[i];
			var p1 = positions[Math.min(n-1, i+1)];
			var pn = newPositions[i];

			if (blurAccuracy) {
				pn.x = (p0.x + p.x + p1.x)/3;
				pn.y = (p0.y + p.y + p1.y)/3;
				pn.r = speed + Math.min(p0.r, p1.r);
			} else {
				pn.x = (p0.x + 2*p.x + p1.x)/4;
				pn.y = (p0.y + 2*p.y + p1.y)/4;
				pn.r = p.r;
			}
		}

		var temp = newPositions;
		newPositions = positions;
		positions = temp;
	}

	function pathFix() {
		for (var i = 0; i < fixpoints.length; i++) {
			var fixpoint = fixpoints[i];
			var point = positions[fixpoint.index];
			point.x = fixpoint.x;
			point.y = fixpoint.y;
			if (point.r > fixpoint.r) point.r = fixpoint.r;
		}
	}


	return positions;
}

