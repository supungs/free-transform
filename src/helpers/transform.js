/**
 * Rotates a point in the xy-plane counterclockwise through an angle θ about the origin of a two-dimensional Cartesian coordinate system..
 * @param x x coordinate of original point
 * @param y y coordinate of original point
 * @param theta angle to rotate in degrees
 * @returns {Point} Point with rotated coordinate
 */
export function transformTo (x, y, theta) {
    theta = Math.PI / 180 * theta;
    let p = point();
    p.x = x * Math.cos(theta) + y * Math.sin(theta);
    p.y = -x * Math.sin(theta) + y * Math.cos(theta);
    return p;
}
/**
 * Convert a point in rotated coordinate system by angle θ back to original two-dimensional Cartesian coordinate system..
 * https://www1.udel.edu/biology/rosewc/kaap427627/notes/matrices_rotations.pdf
 * 𝑋𝑎 = 𝑥1𝑎 cos𝜃 − 𝑦1𝑎 sin𝜃
 * 𝑌𝑎 = 𝑥1𝑎 sin𝜃 + 𝑦1𝑎 cos𝜃
 * @param x x coordinate of rotated point
 * @param y y coordinate of rotated point
 * @param theta angle of rotated coordinate system in degrees
 * @returns {Point} Point in original coordinate system
 */
export function transformFrom (x, y, theta) {
    theta = Math.PI / 180 * theta;
    let p = point();
    p.x = x * Math.cos(theta) - y * Math.sin(theta);
    p.y = x * Math.sin(theta) + y * Math.cos(theta);
    return p;
}
function point () {
    return {
        x:0, 
        y: 0, 
        add: function (p2) {
            let p = point();
            p.x = this.x + p2.x;
            p.y = this.y + p2.y;
            return p;
        },
        substract: function (p2) {
            let p = point();
            p.x = this.x - p2.x;
            p.y = this.y - p2.y;
            return p;
        }
    };
}

/**
 * Helper function to determine whether there is an intersection between the two polygons described
 * by the lists of vertices. Uses the Separating Axis Theorem
 *
 * @param a an array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
 * @param b an array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
 * @return true if there is any intersection between the 2 polygons, false otherwise
 */
export function doPolygonsIntersect (a, b) {
    var polygons = [a, b];
    var minA, maxA, projected, i, i1, j, minB, maxB;

    for (i = 0; i < polygons.length; i++) {

        // for each polygon, look at each edge of the polygon, and determine if it separates
        // the two shapes
        var polygon = polygons[i];
        for (i1 = 0; i1 < polygon.length; i1++) {

            // grab 2 vertices to create an edge
            var i2 = (i1 + 1) % polygon.length;
            var p1 = polygon[i1];
            var p2 = polygon[i2];

            // find the line perpendicular to this edge
            var normal = { x: p2.y - p1.y, y: p1.x - p2.x };

            minA = maxA = undefined;
            // for each vertex in the first shape, project it onto the line perpendicular to the edge
            // and keep track of the min and max of these values
            for (j = 0; j < a.length; j++) {
                projected = normal.x * a[j].x + normal.y * a[j].y;
                if (minA == undefined || projected < minA) {
                    minA = projected;
                }
                if (maxA == undefined || projected > maxA) {
                    maxA = projected;
                }
            }

            // for each vertex in the second shape, project it onto the line perpendicular to the edge
            // and keep track of the min and max of these values
            minB = maxB = undefined;
            for (j = 0; j < b.length; j++) {
                projected = normal.x * b[j].x + normal.y * b[j].y;
                if (minB == undefined || projected < minB) {
                    minB = projected;
                }
                if (maxB == undefined || projected > maxB) {
                    maxB = projected;
                }
            }

            // if there is no overlap between the projects, the edge we are looking at separates the two
            // polygons, and we know there is no overlap
            if (maxA < minB || maxB < minA) {
                return false;
            }
        }
    }
    return true;
}