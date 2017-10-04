import * as d3 from 'd3'
import {Axis} from './axis.ts'
import {Grid} from './grid.ts'
import {Legend} from './legend.ts'
import {Tooltip} from './tooltip.ts'
import {Bars} from './bars.ts'
import '../style.scss'
import {Charts} from '../index.ts'

export namespace StackedBars {
	export function drawChart(data, parent, options) {
		options.type = 'stackedBar';
		let parentSelection = d3.select(parent);
		let {chartID, container} = Charts.setChartIDContainer(parentSelection)
		if (options.windowResizable) {
			Charts.setResizableWindow();
		}
		options.chartSize = Charts.getActualChartSize(data, container, options);

		let svg = Charts.setSVG(data, container, options);
		let xScale = Charts.setXScale(data, options);
		Axis.drawXAxis(svg, xScale, options, data);
		let yScale = Charts.setYScale(svg, data, options, Charts.getActiveDataSeries(container));
		Axis.drawYAxis(svg, yScale, options, data);
		Grid.drawXGrid(svg, xScale, options, data);
		Grid.drawYGrid(svg, yScale, options, data);
		Legend.addLegend(container, data, options);
		if (options.legendClickable) {
			Charts.setClickableLegend(data, parentSelection, options)
		}
		Charts.redrawFunctions[chartID] = {
			self: this,
			data, parentSelection, options
		}
		Legend.positionLegend(container, data, options);
		Charts.repositionSVG(container);
		draw(svg, xScale, yScale, options, data, Charts.getActiveDataSeries(container));
		Bars.addDataPointEventListener(parent, svg);
		if (options.containerResizable) {
			Charts.setResizeWhenContainerChange(data, parent, options);
		}
	}

	export function draw(svg, xScale, yScale, options, data, activeSeries) {
		const keys = activeSeries ? activeSeries : options.yDomain;
		const x1 = d3.scaleBand();
		xScale.paddingInner(0.2);
		x1.domain(keys).rangeRound([0, xScale.bandwidth()]);
		const color = d3.scaleOrdinal().range(options.colors).domain(options.yDomain);
		data.forEach(d => {
			let y0 = 0;
			let key = d[options.xDomain];
			const xAxis = options.xDomain;
			d.series = keys.map(seriesVal => {
				return {
					xAxis,
					series: seriesVal,
					key,
					y0: y0,
					y1: y0 += +d[seriesVal],
					value: d[seriesVal],
					formatter: options.yFormatter,
					color: color(seriesVal)
				};
			});
			d.total = options.yDomain.map(val => d[val]).reduce((acc, cur) => acc + cur, 0);
		});

		let series = svg.selectAll(".series")
				.data(data)
			.enter().append("g")
			.attr("class", "g")
			.attr("transform", d => "translate(" + (xScale(d[options.xDomain])) + ",0)");

		series.selectAll("rect")
			.data(d => d.series)
			.enter().append("rect")
			.attr("width", xScale.bandwidth())
			.style("fill", d => color(d.series))
			.attr("y", options.chartSize.height)
			.attr("height", 0)
			.transition()
			.delay((d, i) => i * 30)
			.ease(d3.easePolyOut, 0.5)
			.attr("y", d => yScale(d.y1))
			.attr("height", d => yScale(d.y0) - yScale(d.y1))
	}
}
