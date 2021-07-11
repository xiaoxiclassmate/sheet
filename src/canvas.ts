
import XSheet from './index';
import {getCenterGrid,getGridPosition,createCellPos,getBorderStyle} from './utils';
const log = console.log;

interface BgfcMap{
    [prop:string]: {
        bgList: Array<{s:CellStyle,x:number,y:number,w:number,h:number}>,
        fcList: Array<{s:CellStyle,t: unknown,x1:number,y1:number,x2:number,y2:number}>
    }
}

interface BorderMap{
    [prop:string]: Array<{
        s:CellStyle,
        t: 'top' | 'left' | 'bottom' | 'right'
        x1:number,y1:number,x2:number,y2:number
    }>
}

export default class Canvas{

    static log = log;
    //画布元素
    canvas: HTMLCanvasElement;
    //实例
    context: XSheet;
    //画布上下文
    ctx: CanvasRenderingContext2D;
    //旧的滚动信息
    oldScrollTop: number;
    oldScrollLeft: number;

    constructor(context: XSheet){

        this.context = context;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
       
        
        this.initCanvas(context.boxWidth,context.boxHeight);
        
    }

    moveTo(x:number,y:number):void{
        this.ctx.moveTo(x+0.5,y + 0.5)
    }
    lineTo(x:number,y:number):void{
        this.ctx.lineTo(x+0.5,y + 0.5)
    }

    render():void{
        //this.clearCanvas();

        const {ctx} = this;
        const {option,boxHeight,boxWidth,rowBarWidth} = this.context;
        const {fixedOffsetLeft,fixedOffsetTop,scrollTop,scrollLeft,scrollOffsetTop,scrollOffsetLeft} = this.context;
        const {startColIndex,endRowIndex,startRowIndex,endColIndex} = this.context;
        const colHeight = option.col.style.height;
        const fixedLineColor = option.canvas.fixedLineColor;
        const fixedLineWidth = option.canvas.fixedLineWidth;

        const rowConfig = option.row;
        const colConfig = option.col;


        if(this.oldScrollLeft !== screenLeft){
            ctx.clearRect(fixedOffsetLeft + 1, 0, boxWidth, fixedOffsetTop);
            this.calculationPermutation({
                startColIndex, 
                endColIndex,
                startRowIndex: rowConfig.fixedStart,
                endRowIndex: rowConfig.fixedEnd,
                offsetLeft: scrollOffsetLeft + fixedOffsetLeft,
                offsetTop: colHeight,
            },(bgffColorMap,borderMap)=>{
        
                ctx.save();
                ctx.rect(fixedOffsetLeft, 0, boxWidth, fixedOffsetTop + 1);//解决底线消失问题
                ctx.clip();
                ctx.translate(-scrollLeft,0);
    
                this.renderTopTh({
                    startColIndex,
                    endColIndex,
                    offsetLeft: fixedOffsetLeft + scrollOffsetLeft,
                    fixedOffsetLeft
                });
                this.renderTable(bgffColorMap,borderMap)
    
                ctx.restore();
    
            });
        }
    
        if(this.oldScrollTop !== scrollTop){
            ctx.clearRect(0, fixedOffsetTop + 1, fixedOffsetLeft, boxHeight);
            this.calculationPermutation({
                startColIndex: colConfig.fixedStart, 
                endColIndex: colConfig.fixedEnd,
                startRowIndex,
                endRowIndex,
                offsetLeft: rowBarWidth,
                offsetTop: scrollOffsetTop + fixedOffsetTop,
            },(bgffColorMap,borderMap)=>{
        
                ctx.save();
                ctx.rect(0, fixedOffsetTop, fixedOffsetLeft + 1, boxHeight);//解决底线消失问题
                ctx.clip();
                ctx.translate(0,-scrollTop);
                this.renderLeftTh({
                    startRowIndex,
                    endRowIndex,
                    offsetTop: fixedOffsetTop + scrollOffsetTop,
                    fixedOffsetTop
                });
                this.renderTable(bgffColorMap,borderMap)
    
                ctx.restore();
    
            });
        }

        //set none dont renderLine
        const isRenderInnerBorder = option.canvas.innerBorderColor !== 'none';
        isRenderInnerBorder && this.renderGridLine();

        ctx.clearRect(fixedOffsetLeft + 1, fixedOffsetTop + 1, boxWidth, boxHeight);
        this.calculationPermutation({
            startColIndex,endRowIndex,startRowIndex,endColIndex,
            offsetLeft: scrollOffsetLeft + fixedOffsetLeft,
            offsetTop: scrollOffsetTop + fixedOffsetTop,
        },(bgffColorMap,borderMap)=>{
    
            ctx.save();
            ctx.rect(fixedOffsetLeft, fixedOffsetTop, boxWidth, boxHeight);
            ctx.clip();
            ctx.translate(-scrollLeft,-scrollTop);

            this.renderTable(bgffColorMap,borderMap)

            ctx.restore();

        });


        //封底线
        ctx.strokeStyle = fixedLineColor;
        ctx.lineWidth = fixedLineWidth;
        if(colConfig.fixedEnd){
            ctx.beginPath();
            this.moveTo(fixedOffsetLeft, 0);
            this.lineTo(fixedOffsetLeft, boxHeight);
            ctx.stroke();
        }


        //封底线
        if(rowConfig.fixedEnd){
            ctx.beginPath();
            this.moveTo(0, fixedOffsetTop);
            this.lineTo(boxWidth, fixedOffsetTop);
            ctx.stroke();
        }

        this.oldScrollTop = scrollTop;
        this.oldScrollLeft = scrollLeft;

    }

    clearCanvas(): void{
        const {ctx} = this;
        const {boxHeight,boxWidth} = this.context;
        ctx.clearRect(0, 0, boxWidth, boxHeight);
    }

    initCanvas(width:number,height:number):void{

        const {ctx} = this;
        const bgColor:string = this.context.option.canvas.background;
        
        //basic attr
        this.canvas.width = width;
        this.canvas.height = height;

        // this.canvas.style.width = width + 'px';
        // this.canvas.style.height = height + 'px';
        
        //set background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
    }

    renderFixedTable():void{
        const {option,rowBarWidth} = this.context;
        const colHeight = option.col.style.height;

        const rowConfig = option.row;
        const colConfig = option.col;

        //fixed
        this.renderLeftTh({
            startRowIndex: rowConfig.fixedStart,
            endRowIndex: rowConfig.fixedEnd,
            offsetTop: colHeight,
            fixedOffsetTop: 0
        });

        this.renderTopTh({
            startColIndex: colConfig.fixedStart,
            endColIndex: colConfig.fixedEnd,
            offsetLeft: rowBarWidth,
            fixedOffsetLeft: 0
        });

        if(colConfig.fixedEnd || rowConfig.fixedEnd){
            this.calculationPermutation({
                startColIndex:colConfig.fixedStart,
                endColIndex:colConfig.fixedEnd,
                endRowIndex: rowConfig.fixedEnd,
                startRowIndex: rowConfig.fixedStart,
                offsetLeft: rowBarWidth,
                offsetTop: colHeight,
            },this.renderTable.bind(this))
        }
    }
    
    calculationPermutation(config:{[prop:string]:any,bgffColorMap?:BgfcMap,borderMap?:BorderMap},callback:(bgffColorMap:BgfcMap,borderMap:BorderMap)=>void):void{
        const {startColIndex,endRowIndex,startRowIndex,endColIndex,offsetLeft,offsetTop,bgffColorMap = {},borderMap = {}} = config;
        const {option} = this.context;
        const rowMap:RowMap[] = option.row.map;
        const colMap:ColMap[] = option.col.map;
        const dataSet:Array<Array<Cell>> = option.dataSet;
        const styles = option.styles;
        const defaultStyle =option.cell.style;

        //按颜色（字体，背景）分组、边框独立分组（颜色、宽度、setLineDash）

        //const bgffColorMap:BgfcMap = {} , borderMap:BorderMap = {};

        let totalh:number = offsetTop, totalw:number;
        for(let r = startRowIndex; r < endRowIndex; r ++){
            const oTotalh = totalh;
            totalw = offsetLeft;
            totalh += rowMap[r].height;

            for(let c = startColIndex; c < endColIndex; c ++){
                const cell = dataSet[r][c];
                const oTotalw = totalw;
                const style = styles[cell.s] || defaultStyle;

                totalw += colMap[c].width;
        
                bgffColorMap[style.bc] = bgffColorMap[style.bc] || {
                    bgList:[],
                    fcList:[]
                };

                bgffColorMap[style.bc].bgList.push({
                    s: style,
                    x: oTotalw, 
                    y: oTotalh, 
                    w: colMap[c].width, 
                    h: rowMap[r].height
                });

                bgffColorMap[style.fc] = bgffColorMap[style.fc] || {
                    bgList:[],
                    fcList:[]
                };

                bgffColorMap[style.fc].fcList.push({
                    s: style,
                    t: cell.w,
                    x1: oTotalw,
                    x2: totalw,
                    y1: oTotalh,
                    y2: totalh,
                });

                const _bl = style.bl.toString();
                borderMap[_bl] = borderMap[_bl] || [];
                borderMap[_bl].push({
                    t: 'left',
                    s:  style,
                    x1: oTotalw,
                    y1: oTotalh,
                    x2: totalw,
                    y2: totalh
                });

                const _bt = style.bt.toString();
                borderMap[_bt] = borderMap[_bt] || [];
                borderMap[_bt].push({
                    t: 'top',
                    s:  style,
                    x1: oTotalw,
                    y1: oTotalh,
                    x2: totalw,
                    y2: totalh
                });

                const _br = style.br.toString();
                borderMap[_br] = borderMap[_br] || [];
                borderMap[_br].push({
                    t: 'right',
                    s:  style,
                    x1: oTotalw,
                    y1: oTotalh,
                    x2: totalw,
                    y2: totalh
                });

                const _bb = style.bb.toString();
                borderMap[_bb] = borderMap[_bb] || [];
                borderMap[_bb].push({
                    t: 'bottom',
                    s:  style,
                    x1: oTotalw,
                    y1: oTotalh,
                    x2: totalw,
                    y2: totalh
                });

            }
        }

        callback(bgffColorMap,borderMap);

    }

    renderGridLine():void{
        const {ctx} = this;
        const {startColIndex,endRowIndex,startRowIndex,endColIndex,option,rowBarWidth} = this.context;
        const {fixedOffsetLeft,fixedOffsetTop,scrollLeft,scrollTop,scrollOffsetLeft,scrollOffsetTop} = this.context;
        const rowMap:RowMap[] = option.row.map;
        const rowFixedStart = option.row.fixedStart;
        const rowFixedEnd = option.row.fixedEnd;
        const colMap:ColMap[] = option.col.map;
        const colFixedStart = option.col.fixedStart;
        const colFixedEnd = option.col.fixedEnd;

        const colHeight = option.col.style.height;
        const borderColor:string = option.canvas.innerBorderColor;
        const boxWidth:number = this.context.boxWidth , boxHeight:number = this.context.boxHeight;
        

        const lineWidth = boxWidth + scrollLeft , lineHeight = boxHeight + scrollTop;

        ctx.strokeStyle = borderColor;
        let totalh = colHeight , totalw = rowBarWidth;

        //row
        ctx.beginPath();
        this.moveTo(0, colHeight);
        this.lineTo(lineWidth, colHeight);
        //fixed
        for(let r = rowFixedStart; r < rowFixedEnd; r++){
            totalh += rowMap[r].height;
            this.moveTo(0, totalh);
            this.lineTo(lineWidth, totalh);
        }

        //col
        this.moveTo(rowBarWidth, 0);
        this.lineTo(rowBarWidth, lineHeight);
        //fixed
        for(let c = colFixedStart; c < colFixedEnd; c++){
            totalw += colMap[c].width;
            this.moveTo(totalw, 0);
            this.lineTo(totalw, lineHeight);
        }

        ctx.save();
        ctx.translate(-scrollLeft,-scrollTop);

        //table
        totalh = fixedOffsetTop + scrollOffsetTop , totalw = fixedOffsetLeft + scrollOffsetLeft;
        for(let r = startRowIndex; r < endRowIndex; r++){
            totalh += rowMap[r].height;
            this.moveTo(0, totalh);
            this.lineTo(lineWidth, totalh);
        }
        for(let c = startColIndex; c < endColIndex; c++){
            totalw += colMap[c].width;
            this.moveTo(totalw, 0);
            this.lineTo(totalw, lineHeight);
        }

        ctx.stroke();
        ctx.restore();
    }

    renderTopTh(config:{[prop:string]:any}): void{
        const {ctx} = this;
        const {startColIndex,endColIndex,offsetLeft,fixedOffsetLeft} = config;
        const {option} = this.context;
       
        const fontSize:number = option.col.style.fontSize;
        const fontFamily:string = option.col.style.fontFamily;
        const fontColor:string = option.col.style.fontColor;
        const colMap:ColMap[] = option.col.map;
        const colHeight = option.col.style.height;
        const borderColor:string = option.canvas.innerBorderColor;

        ctx.fillStyle = fontColor;
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let totalw = offsetLeft;
        for(let c = startColIndex; c < endColIndex; c ++){
            const oTotal = totalw;
            totalw += colMap[c].width;
           
            const {x,y} = getCenterGrid({
                x1: oTotal,
                x2: totalw,
                y1: 0,
                y2: colHeight,
            });
            ctx.fillText(createCellPos(c), x, y);
            
        }

        //封底线
        ctx.strokeStyle = borderColor;
        ctx.beginPath();
        this.moveTo(fixedOffsetLeft, colHeight);
        this.lineTo(totalw, colHeight);
        ctx.stroke();

    }

    renderLeftTh(config:{[prop:string]:any}):void{
        const {ctx} = this;
        const {startRowIndex,endRowIndex,offsetTop,fixedOffsetTop} = config;
        const {option,rowBarWidth} = this.context;
        const {fixedOffsetLeft} = this.context;
        const fontSize:number = option.row.style.fontSize;
        const fontFamily:string = option.row.style.fontFamily;
        const fontColor:string = option.row.style.fontColor;
        const borderColor:string = option.canvas.innerBorderColor;
        const rowMap:RowMap[] = option.row.map;
        const rowWidth:number = rowBarWidth;

        ctx.fillStyle = fontColor;
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let totalh = offsetTop;
        for(let r = startRowIndex; r < endRowIndex; r ++){
            const oTotal = totalh;
            totalh += rowMap[r].height;

            const {x,y} = getCenterGrid({
                x1: 0,
                x2: rowWidth,
                y1: oTotal,
                y2: totalh,
            });
            ctx.fillText(String(r + 1), x, y);
            
        }

       
        //封底线
        ctx.strokeStyle = borderColor;
        ctx.beginPath();
        this.moveTo(fixedOffsetLeft, fixedOffsetTop);
        this.lineTo(fixedOffsetLeft, totalh);
        ctx.stroke();

    }

    renderTable(bgffColorMap:BgfcMap,borderMap:BorderMap):void{
        const {ctx} = this;

        for(const color in bgffColorMap){
            const bgList = bgffColorMap[color].bgList;
            const fcList = bgffColorMap[color].fcList;

            ctx.fillStyle = color;

            for(let i = 0 , length = bgList.length; i < length; i ++){
                const item = bgList[i];
                ctx.fillRect(item.x,item.y,item.w,item.h);
            }

            for(let i = 0 , length = fcList.length; i < length; i ++){
                const item = fcList[i] , style = item.s;
                ctx.font = `${style.s}px ${style.f}`;
                ctx.textBaseline = style.v;
                ctx.textAlign = style.a;

                const {x,y} = getGridPosition(ctx,{
                    x1: item.x1,
                    x2: item.x2,
                    y1: item.y1,
                    y2: item.y2,
                },style.a,style.v);
                ctx.fillText(item.t as string, x, y);
            }
        }

        for(const k in borderMap){
            const bconfig = k.split(',');

            if(bconfig[0] === 'none') continue;

            const list = borderMap[k];
            ctx.strokeStyle = bconfig[1];
            ctx.setLineDash(getBorderStyle(bconfig[0]));
            ctx.lineWidth = parseInt(bconfig[2]);
            ctx.beginPath();
            for(let i = 0 , length = list.length; i < length; i ++){
                const {t,x1,x2,y1,y2} = list[i];
                if(t === 'top'){
                    this.moveTo(x1, y1);
                    this.lineTo(x2, y1);
                }else if(t === 'bottom'){
                    this.moveTo(x1, y2);
                    this.lineTo(x2, y2); 
                }else if(t === 'left'){
                    this.moveTo(x1, y1);
                    this.lineTo(x1, y2);
                }else{
                    this.moveTo(x2, y1);
                    this.lineTo(x2, y2);
                }
            }
            ctx.stroke();
        }

    }

    setBackground(x:number,y:number,w:number,h:number,color:string):void{
        const {ctx} = this;
        ctx.fillStyle = color;
        ctx.fillRect(x,y,w,h);
    }
    
    setBorder(x1:number,y1:number,x2:number,y2:number,bl:BorderType,br:BorderType,bt:BorderType,bb:BorderType):void{
        const {ctx} = this;
        //left
        ctx.beginPath()
        ctx.strokeStyle = 'red';
        ctx.setLineDash(getBorderStyle(bl[0]))
        this.moveTo(x1, y1);
        this.lineTo(x1, y2);
        ctx.stroke();
        //right
        ctx.beginPath()
        ctx.strokeStyle = 'yellow';
        ctx.setLineDash(getBorderStyle(br[0]))
        this.moveTo(x2, y1);
        this.lineTo(x2, y2);
        ctx.stroke();
        //top
        ctx.beginPath()
        ctx.strokeStyle = 'blue';
        ctx.setLineDash(getBorderStyle(bt[0]))
        this.moveTo(x1, y1);
        this.lineTo(x2, y1);
        ctx.stroke();
        //top
        ctx.beginPath()
        ctx.strokeStyle = 'green';
        ctx.setLineDash(getBorderStyle(bb[0]))
        this.moveTo(x1, y2);
        this.lineTo(x2, y2); 

        ctx.stroke();

    }
}