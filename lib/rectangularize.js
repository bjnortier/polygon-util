var vecks = require('vecks');
var Vec2 = vecks.Vec2;
var Box2 = vecks.Box2;

var isClockwise = require('./isClockwise');
var determineAngleAtPoint = require('./determineAngleAtPoint');

function removeStraightAngles(polygon) {
  var result = [];
  var pl = polygon.length;
  for (var i = 0; i < pl; ++i) {
    var a = polygon[(i - 1 + pl) % pl];
    var b = polygon[i];
    var c = polygon[(i + 1) % pl];

    var straight = ((a.x === b.x) && (b.x === c.x)) ||
      ((a.y === b.y) && (b.y === c.y));
    if (!straight) {
      result.push(b);
    }
  }
  return result;
}

function isAllRightAngles(polygon) {
  for (var i = 0; i < polygon.length; ++i) {
    var a = polygon[i];
    var b = polygon[(i + 1) % polygon.length];
    var c = polygon[(i + 2) % polygon.length];

    var straight = ((a.x === b.x) && (b.x === c.x)) ||
      ((a.y === b.y) && (b.y === c.y));
    var updown = (a.y === b.y) && (b.x === c.x);
    var leftright = (a.x === b.x) && (b.y === c.y);
    if (!(straight || updown || leftright)) {
      return false;
    }
  }
  return true;
}

function hasCoincidentPoints(polygon) {
  for (var i = 0; i < polygon.length; ++i) {
    var a = new Vec2(polygon[i]);
    var b = new Vec2(polygon[(i + 1) % polygon.length]);
    if (a.sub(b).length() < 1e-12) {
      return true;
    }
  }
  return false;
}

function isConvex(polygon, clockwise, index) {
  var theta = determineAngleAtPoint(polygon, index);
  return (((theta ===  90) && clockwise) ||
          ((theta === -90) && !clockwise));
}

/**
 * Takes a polygon with right-angled corners and
 * returns a list of rectangles. Throws an error
 * if any corners are not right angles
 *
 * The algorithm is similar to an ear-clipping algorithm
 * for triangulation polygons (http://en.wikipedia.org/wiki/Polygon_triangulation),
 * except rectangular "ears" are removed from the polygon until
 * the last rectangle remains.
 */
module.exports = function(polygon) {
  var pl = polygon.length;

  if (pl < 4) {
    throw new Error('at least 4 points required for rectangularisation');
  }
  if (hasCoincidentPoints(polygon)) {
    throw new Error('polygon contains coincident points');
  }
  if (!isAllRightAngles(polygon)) {
    throw new Error('polygon has angles that are not right angles');
  }

  polygon = removeStraightAngles(polygon);

  var cw = isClockwise(polygon);

  var rectangles = [];
  var remaining = polygon.slice(0);
  var sanity = pl; // Guard against infinite loop
  do {
    var rl = remaining.length;
    if (rl === 4) {
      rectangles.push(remaining);
      break;
    }

    var vectors = remaining.map(function(p) {
      return new Vec2(p);
    });

    // To find a ear, look at four consequetive points in the polygon
    // If the middle pair are both convex, then a ear has been found.
    for (var i = 0; i < rl; ++i) {
      var ia = (i - 1 + rl) % rl;
      var ib = i;
      var ic = (i + 1) % rl;
      var id = (i + 2) % rl;
      var bAndCConvex = isConvex(remaining, cw, ib) && isConvex(remaining, cw, ic);
      if (!bAndCConvex) {
        continue;
      }

      // Either the edge before or after the pair is the shorter edge,
      // and a point will be inserted on the opposite, longer edge.
      var a = vectors[ia];
      var b = vectors[ib];
      var c = vectors[ic];
      var d = vectors[id];
      var beforeIsShorter = b.sub(a).length() < d.sub(c).length();
      var newVector;

      var rectangleCanditate;
      if (beforeIsShorter) {
        var bc = c.sub(b);
        var ba = a.sub(b);
        newVector = b.add(bc).add(ba);
        rectangleCanditate = [
          a, b, c, newVector,
        ];
      } else {
        var cb = b.sub(c);
        var cd = d.sub(c);
        newVector = c.add(cb).add(cd);
        rectangleCanditate = [
          b, c, d, newVector,
        ];
      }

      // None of the other points may lie in the rectangle candidate
      var box = new Box2()
        .expandByPoint(rectangleCanditate[0])
        .expandByPoint(rectangleCanditate[1])
        .expandByPoint(rectangleCanditate[2])
        .expandByPoint(rectangleCanditate[3]);

      var isInside = false;
      var r2 = [];
      var j;
      for (j = 0; j < rl; ++j) {
        var p = remaining[j];
        if ((j !== ia) && (j !== ib) && (j !== ic) && (j !== id)) {
          var inclusive = false;
          if (box.isPointInside(p, inclusive)) {
            isInside = true;
            break;
          }
        }
      }
      // Not a valid ear
      if (isInside) {
        continue;
      }

      rectangles.push(rectangleCanditate);
      if (beforeIsShorter) {
        // Can't use Array.splice as may wrap around
        for (j = 0; j < rl; ++j) {
          if (!((j === ia) || (j === ib) || (j === ic))) {
            r2.push(remaining[j]);
          }
          if (j === ib) {
            r2.push(newVector);
          }
        }
      } else {
        // Can't use Array.splice as may wrap around
        for (j = 0; j < rl; ++j) {
          if (!((j === ib) || (j === ic) || (j === id))) {
            r2.push(remaining[j]);
          }
          if (j === ib) {
            r2.push(newVector);
          }
        }
      }
      remaining = r2;
      break;
    }

    --sanity;
  } while (remaining.length && sanity > 0);

  return rectangles.map(function(rec) {
    return rec.map(function(point) {
      return {x: point.x, y: point.y};
    });
  });

};
