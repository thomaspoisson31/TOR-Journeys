
// Fonctions utilitaires génériques
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function getCanvasCoordinates(event, mapContainer, scale) {
    const rect = mapContainer.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    return { x, y };
}

export function pixelsToMiles(pixels) {
    return pixels * (MAP_DISTANCE_MILES / MAP_WIDTH);
}

export function milesToDays(miles) {
    const days = miles / 20;
    return Math.round(days * 2) / 2;
}

export function calculatePathDistance(startIndex, endIndex) {
    if (startIndex >= endIndex || startIndex < 0 || endIndex >= journeyPath.length) {
        return 0;
    }

    let distance = 0;
    for (let i = startIndex; i < endIndex; i++) {
        const point1 = journeyPath[i];
        const point2 = journeyPath[i + 1];
        distance += Math.sqrt(
            Math.pow(point2.x - point1.x, 2) +
            Math.pow(point2.y - point1.y, 2)
        );
    }
    return distance;
}

export function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
            (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
            inside = !inside;
        }
    }
    return inside;
}
