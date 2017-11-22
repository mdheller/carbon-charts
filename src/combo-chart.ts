import * as d3 from "d3";
import { BaseAxisChart } from "./base-axis-chart";
import { Configuration } from "./configuration";

export class ComboChart extends BaseAxisChart {
	constructor(holder: Element, options?: any, data?: any) {
		super(holder, options, data);

		this.options.type = "combo";
	}

	drawChart(data?: any) {
		if (data) {
			this.data = data;
		}

		this.setSVG();
		this.addLegend();
		if (this.options.legendClickable) {
			this.setClickableLegend();
		}

		const activeSeries = <any>this.getActiveDataSeries();

		const barData = [];
		const lineData = [];
		this.data.forEach((d) => {
			const barDataObj = {};
			const lineDataObj = {};
			barDataObj[this.options.xDomain] = d[this.options.xDomain];
			lineDataObj[this.options.xDomain] = d[this.options.xDomain];
			barDataObj[this.options.yDomain] = d[this.options.yDomain];
			barData.push(barDataObj);
			for (let i = 0; i < this.options.y2Domain.length; i++) {
				lineDataObj[this.options.y2Domain[i]] = d[this.options.y2Domain[i]];
			}
			lineData.push(lineDataObj);
		});
		const activeBar =  activeSeries.includes(this.options.yDomain[0]);
		const activeLineSeries = activeBar ? activeSeries.slice(1, activeSeries.length) : activeSeries;

		const xScaleBar = this.setXScale(barData);
		const xScaleLine = this.setXScale(lineData);
		this.drawXAxis(xScaleBar);
		const yScale = this.setYScale(barData);
		const y2Scale = this.setYScale(lineData);
		this.drawYAxis(yScale);
		this.drawY2Axis(y2Scale);
		this.drawXGrid(xScaleBar);
		this.drawYGrid(yScale);
		this.positionLegend();
		this.repositionSVG();
		if (activeBar) {
			this.drawBars(xScaleBar, yScale);
		}
		this.drawLines(xScaleLine, y2Scale, activeLineSeries);
		this.addDataPointEventListener();
		if (this.options.containerResizable) {
			this.setResizeWhenContainerChange();
		}
	}

	drawBars(xScale, yScale) {
		xScale.padding(0.1);
		const yHeight = this.getActualChartSize().height - this.svg.select(".x.axis").node().getBBox().height;
		const keys = this.options.yDomain;
		const x1 = d3.scaleBand();
		x1.domain(keys).rangeRound([0, xScale.bandwidth()]);
		const color = d3.scaleOrdinal().range(this.options.colors).domain(this.options.yDomain);
		this.svg.append("g")
			.attr("class", "bars")
			.selectAll("g")
			.data(this.data)
			.enter().append("g")
				.attr("transform", d => `translate(${xScale(d[this.options.xDomain])},0)`)
			.selectAll("rect")
			.data(d => keys.map(key => ({
				xAxis: this.options.xDomain,
				series: key,
				key: d[this.options.xDomain],
				value: d[key],
				formatter: this.options.yFormatter,
				color: color(key)
			})))
			.enter().append("rect")
				.attr("x", d => x1(d.series))
				.attr("y", d => yHeight)
				.attr("width", x1.bandwidth())
				.attr("height", 0)
				.attr("fill", d => d.color)
				.transition()
				.duration(1000)
				.ease(d3.easePolyOut, 0.5)
				.attr("y", d => yScale(d.value))
				.attr("height", d => yHeight - yScale(d.value));
	}

	drawLines(xScale, yScale, activeSeries) {
		let keys: any;
		let dataList = this.data;
		if (this.options.dimension) {
			const newKeys = <any>[];
			dataList.forEach(d => {
				if (!newKeys.includes(d[this.options.dimension])) {
					newKeys.push(d[this.options.dimension]);
				}
			});
			keys = newKeys;
		} else if (this.options.y2Domain) {
			keys = this.options.yDomain.concat(this.options.y2Domain);
		} else {
			keys = this.options.yDomain;
		}
		const color = d3.scaleOrdinal().range(this.options.colors).domain(keys);
		keys = activeSeries ? activeSeries : keys;
		const line = d3.line<any>()
			.x(d => xScale(d.key) + this.getActualChartSize().width / dataList.length / 2)
			.y(d => yScale(d.value));
		keys.forEach((value, idx) => {
			const colorKey = value;
			if (this.options.dimension) {
				dataList = this.data.filter(d => d[this.options.dimension] === value);
				value = this.options.yDomain[0];
			}
			const valueData = dataList.map(d => (<any>{
				xAxis: this.options.xDomain,
				key: d[this.options.xDomain],
				series: value,
				value: d[value],
				dimension: this.options.dimension,
				dimVal: d[this.options.dimension],
				formatter: this.options.yFormatter,
				color: color(colorKey)
			}));
			const series = this.svg.append("g");
			series.append("path")
				.data([valueData])
				.attr("fill", Configuration.lines.path.fill)
				.attr("stroke", Configuration.lines.path.stroke)
				.attr("stroke-linejoin", Configuration.lines.path.strokeLinejoin)
				.attr("stroke-linecap", Configuration.lines.path.strokeLinecap)
				.attr("stroke-width", Configuration.lines.path.strokeWidth)
				.attr("d", line)
				.style("stroke", color(colorKey))
				.style("opacity", 0)
				.transition()
				.duration(Configuration.lines.path.duration)
				.style("opacity", 1);

			series.selectAll("dot")
				.data(valueData)
				.enter().append("circle")
				.attr("r", Configuration.lines.dot.r)
				.attr("fill", Configuration.lines.dot.fill)
				.attr("stroke", color(colorKey))
				.attr("stroke-width", Configuration.lines.dot.strokeWidth)
				.attr("cx", d => xScale(d.key) + this.getActualChartSize().width / dataList.length / 2)
				.attr("cy", d => yScale(d.value))
				.style("opacity", 0)
				.transition()
				.duration(Configuration.lines.dot.duration)
				.style("opacity", 1);

		});
	}

	addDataPointEventListener() {
		const self = this;
		this.svg.selectAll("rect")
			.on("mouseover", function(d) {
				d3.select(this)
					.attr("stroke-width", Configuration.bars.mouseover.strokeWidth)
					.attr("stroke", d.color)
					.attr("stroke-opacity", Configuration.bars.mouseover.strokeOpacity);
			})
			.on("mouseout", function() {
				d3.select(this)
					.attr("stroke-width", Configuration.bars.mouseout.strokeWidth)
					.attr("stroke", "none")
					.attr("stroke-opacity", Configuration.bars.mouseout.strokeOpacity);
			})
			.on("click", function(d) {
				self.showTooltip(d);
				self.reduceOpacity(this);
			});
	}
}