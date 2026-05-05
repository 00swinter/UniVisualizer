export class Math2dPlotItem {
    disabled = $state(false);
    color = "#ffffff";

    constructor(){
    }
}


export class Point extends Math2dPlotItem{

    x = $state(0);
    y = $state(0);
    type = 'point';
    label = "";

    constraint = null;
    isDraggable = false;

    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
    }

    getMinusOne() {
        return new Point(-this.x, -this.y);
    }

    static snapValue(val, step) {
        return Math.round(val / step) * step;
    }

    // OPTIONAL: If you want to keep your object-oriented style
    snapToGrid(targetX, targetY, step) {
        return {
            x: Point.snapValue(targetX, step),
            y: Point.snapValue(targetY, step)
        };
    }

    getProjectionLineX(color="red", width=5){
 
        const start = new Point(0,0)
        const end = new Point(this.x,0)

        const line = new Line(start, end);
        line.color = color;
        line.width = width;
        line.style = "solid";

        return line;
    }
    getProjectionLineY(color="green", width=5){
 
        const start = new Point(0,0)
        const end = new Point(0,this.y)

        const line = new Line(start, end);
        line.color = color;
        line.width = width;
        line.style = "solid";

        return line;
    }
    getValueLineX(color="gray", width=3){
 
        const start = new Point(this.x,0)
        const end = new Point(this.x,this.y)

        const line = new Line(start, end);
        line.color = color;
        line.width = width;

        return line;
    }
    getValueLineY(color="gray", width=3){
 
        const start = new Point(0,this.y)
        const end = new Point(this.x,this.y)

        const line = new Line(start, end);
        line.color = color;
        line.width = width;

        return line;
    }

    getAllIndicator(){
        return[
			this.getProjectionLineX(),
			this.getProjectionLineY(),
			this.getValueLineX(),
			this.getValueLineY(),
		]
    }

    length(){
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }

    set_length(length){
        var normalised = this.get_normalised()
        this.x = normalised.x * length;
        this.y = normalised.y * length;
    }

    get_normalised(){
        var length = this.length()
        return new Point(this.x/length, this.y/length);
    }

    clampMinLength(min){
        var length = this.length();
        if(length < min){
            this.set_length(min)
        }
    }

    clampMaxLength(max){
        var length = this.length();
        if(length > max){
            this.set_length(max);
        }
    }

    clampLength(min, max){
        this.clampMinLength(min);
        this.clampMaxLength(max);
    }
}

export class Angle extends Math2dPlotItem {
    type = 'angle';

    fill = false;
    fillColor = "#ffffff17";
    width = 4;
    radius = 1;
    currentAngleValue = 0;
    showAnglelabel = true;
    angleInDegree = true;
    flip = false;

    constructor(center, zeroAngle,) {
        super();
        this.center = center;
        this.zeroAngle = zeroAngle;
    }

    angleCurrentToPoint(point){
        let x = point.x - this.center.x
        let y = point.y - this.center.y

        this.currentAngleValue = Math.atan2(y, x) - this.zeroAngle;
    }
    angleZeroToPoint(point){
        let x = point.x - this.center.x
        let y = point.y - this.center.y

        this.zeroAngle = Math.atan2(y, x);
    }
}

export class Func extends Math2dPlotItem {
    type = 'function';
    width = 3;
    fill = false;
    fillColor = "#ffffff17"
    glowRadius = 4;

    constructor(logicCallback) {
        super();
        this.logic = logicCallback;
    }

    fn(x) {
        return this.logic(x);
    }

    getTangentAt(x0) {
        if (Math.abs(x0) < 0.00001) return null;

        const h = 0.0001;
        const y0 = this.fn(x0);
        const y1 = this.fn(x0 + h);
        const slope = (y1 - y0) / h;

        const visualLength = 20;

        const angle = Math.atan(slope);
        const dx = Math.cos(angle) * (visualLength / 2);
        const dy = Math.sin(angle) * (visualLength / 2);

        return new Line(
            new Point(x0 - dx, y0 - dy),
            new Point(x0 + dx, y0 + dy)
        );
    }

    getDerivative() {
        const derivativeFunc = new Func((x) => {
            return (this.fn(x + h) - this.fn(x - h)) / (2 * h);
        });

        derivativeFunc.color = "cyan";
        derivativeFunc.style = "dashed";
        derivativeFunc.width = 2;
        
        return derivativeFunc;
    }

}

export class ParametricFunc extends Math2dPlotItem{
    type = 'parametric';
    width = 3;

    steps = $state(1000);

    constructor(xCallback, yCallback, tRange = [0, 2 * Math.PI]) {
        super();
        this.xLogic = xCallback;
        this.yLogic = yCallback;
        this.tRange = tRange;
    }

    xFn(t) {
        return this.xLogic(t);
    }

    yFn(t) {
        return this.yLogic(t);
    }
}

export class Circle extends ParametricFunc {
    constructor(centerPoint, radius) {
        super(
            (t) => centerPoint.x + radius * Math.cos(t), // xLogic
            (t) => centerPoint.y + radius * Math.sin(t), // yLogic
            [0, 2 * Math.PI] // tRange
        );

        this.center = centerPoint;
        this.radius = radius;

        this.type = 'parametric';
    }
}


export class Line extends Math2dPlotItem{
    type = 'line';
    width = 2;
    style = 'dotted'; // 'solid', 'dashed', 'dotted', 'vector'

    constructor(startPoint, endPoint) {
        super();
        this.start = startPoint;
        this.end = endPoint;
    }
    length(){
        
        let x = this.end.x-this.start.x;
        let y = this.end.y-this.start.y;
        return Math.sqrt(x*x + y*y); 
    }
}

export class Rect extends Math2dPlotItem{
    type = 'rect';
    borderColor = 'white';
    borderWidth = 2;
    label = "";

    constructor(topLeftPoint, width, height) {
        super();
        this.topLeft = topLeftPoint;
        this.width = width;
        this.height = height;
    }
}