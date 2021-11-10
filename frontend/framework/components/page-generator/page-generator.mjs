/** 
 * Gridlayout based page generator.
 * (C) 2019 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
import {util} from "/framework/js/util.mjs";
import {router} from "/framework/js/router.mjs";
import {monkshu_component} from "/framework/js/monkshu_component.mjs";

const elementConnected = async element => {
	const pagePath = element.getAttribute("file");
	page_generator.setTemplateHTML(element, await getHTML(new URL(pagePath, window.location.href), 
		element.getAttribute("css"), JSON.parse(util.safeURIDecode(element.getAttribute("pageData")||"{}"))));
}

/**
 * Generates HTML for the give page
 * @param pageFileURLOrPageSchema Page URL as a URL object or page schema definition as a string
 * @param cssHref Optional: Any external CSS to include 
 * @param data Optional: Mustache render data
 * @returns The generated HTML
 */
async function getHTML(pageFileURLOrPageSchema, cssHref, data) {
	const pageFile = await router.expandPageData((pageFileURLOrPageSchema instanceof URL) ? 
		await $$.requireText(pageFileURLOrPageSchema) : pageFileURLOrPageSchema, undefined, data);
	const schemaArray = pageFile.match(/SCHEMA\s*\r?\n=+\r?\n(.+?)\r?\n=+[\r?\n]*/sm);
	const schema = (schemaArray && schemaArray.length > 1) ? schemaArray[1] : "";

	const cssClassesArray = pageFile.match(/CSS\s+CLASSES\s*\r?\n=+\r?\n(.+?)\r?\n=+[\r?\n]*/sm);
	let cssClassesRaw = (cssClassesArray && cssClassesArray.length > 1) ? cssClassesArray[1] : "";
	cssClassesRaw = cssClassesRaw.replace("CONTAINER CLASSES","containerClasses").replace("ITEM CLASSES","itemClasses").replace("PER ITEM CLASS","perItemClass");
	const cssClassesParsed = {}; const cssArrayParsed = cssClassesRaw.split("\n"); 
	if (cssClassesRaw && cssClassesRaw != "") for (const cssLine of cssArrayParsed) {
		const cssLineParsed = cssLine.split("="); cssClassesParsed[cssLineParsed[0].trim()] = cssLineParsed[1].trim(); }
	
	const cssArray = pageFile.match(/CSS\s*\r?\n=+\r?\n(.+?)\r?\n=+[\r?\n]*/sm);
	const css = (cssArray && cssArray.length > 1) ? cssArray[1] : "";

	const layoutPlacementArray = pageFile.match(/LAYOUT\s*\r?\n=+\r?\n(.+?)\r?\n=+[\r?\n]*/sm);
	let layoutPlacement = (layoutPlacementArray && layoutPlacementArray.length > 1) ? layoutPlacementArray[1] : "";
	layoutPlacement = layoutPlacement.replace(/^[\|-\s]+$/mg, "").replace(/(?:[\t\s]*(?:\r?\n|\r)){2}/gm,"\n").trim();

	const layoutLines = layoutPlacement.split(/\r?\n/); 
	let columns = 0; let lineWithMaxColumns = -1;
	for (const [index, line] of layoutLines.entries()) {
		const colsThisLine = (line.match(/\|/g)||[0]).length-1;
		if (colsThisLine > columns) {columns = colsThisLine; lineWithMaxColumns = index;}
	}

	if (lineWithMaxColumns == -1) return;	// something is very weird

	const columnLocations = []; for (const [i,c] of [...layoutLines[lineWithMaxColumns]].entries()) {if (c=='|') columnLocations.push(i);}

	const elementsAndPlacements = [];
	for (const [row, line] of layoutLines.entries()) {
		let fStartExtract = false; let objToPush;
		for (const [column, columnLocation] of columnLocations.entries()) {
			if (line[columnLocation] == '|') {
				fStartExtract = !fStartExtract; if (fStartExtract) objToPush = {colStart: column};
				else {
					objToPush.colEnd = column; 
					objToPush.rowStart = row; objToPush.rowEnd = row+1;
					objToPush.element = line.substring(columnLocations[objToPush.colStart]+1, columnLocations[objToPush.colEnd]-1).trim();
					const objToModify = _findObject(elementsAndPlacements, objToPush.colStart, objToPush.colEnd, row, objToPush.element);
					if (objToModify) objToModify.rowEnd = row+1; else elementsAndPlacements.push(objToPush);
					if (column < columnLocations.length) {fStartExtract = true; objToPush = {colStart: column};}
				}
			}
		}
	}

	const layoutDesignArray = pageFile.match(/LAYOUT\s*\r?\n=+\r?\n.+?\r?\n=+\r?\n(Row\s+Heights.+?Col\s+Widths.+?)\r?\n=+[\r?\n]*/sm);
	const layoutDesign = (layoutDesignArray && layoutDesignArray.length > 1) ? layoutDesignArray[1] : "";
	const rowHeightArray = layoutDesign.match(/^\s*Row\s+Heights\s+\=\s+(.+?)$/sm); 
	const rowHeights = (rowHeightArray && rowHeightArray.length > 1)?rowHeightArray[1].split(","):[]; for(const [i, item] of rowHeights.entries()) rowHeights[i] = item.trim();
	const colWidthsArray = layoutDesign.match(/^\s*Col\s+Widths\s+\=\s+(.+?)$/sm);
	const colWidths = (colWidthsArray && colWidthsArray.length > 1)?colWidthsArray[1].split(","):[]; for(const [i, item] of colWidths.entries()) colWidths[i] = item.trim();

	const layoutObj = {rows: layoutLines.length, columns: columnLocations.length-1, rowHeights, colWidths, elementsAndPlacements};

	return await _generatePageHTML(schema, cssClassesParsed, css, cssHref, layoutObj);
}

async function _generatePageHTML(schema, cssParsed, cssInternal, cssHref, layoutObj) {
	if (layoutObj.rowHeights.length < layoutObj.rows.length) layoutObj.rowHeights.push(Array(layoutObj.rows.length-layoutObj.rowHeights.length).fill("auto"));
	if (layoutObj.colWidths.length < layoutObj.columns.length) layoutObj.colWidths.push(Array(layoutObj.columns.length-layoutObj.colWidths.length).fill("auto"));

	let css = `${cssHref?`<link rel="stylesheet" type="text/css" href="${cssHref}">`:""}
	<style>
	.grid-container {
		display: grid;
		grid-template-rows: ${layoutObj.rowHeights.join(" ")};
		grid-template-columns: ${layoutObj.colWidths.join(" ")};
	}
	`;
	let html = `<div class="grid-container${cssParsed.containerClasses?" "+cssParsed.containerClasses:''}">
	`;

	for (const [i, element] of layoutObj.elementsAndPlacements.entries()) {
		css += `.item${i} {
			grid-column: ${element.colStart+1} / ${element.colEnd+1};
			grid-row: ${element.rowStart+1} / ${element.rowEnd+1};
			overflow: hidden;
		}
		`

		const htmlElement = JSON.parse(schema)[element.element]; 
		htmlElement.id = element.name || element.element; 
		html += `<div class="item${i}${cssParsed.itemClasses?" "+cssParsed.itemClasses:''}${cssParsed.perItemClass?` ${cssParsed.perItemClass}-${htmlElement.id}`:''}"><${htmlElement.html || "div"}`; 
		for (const attr of Object.keys(htmlElement)) {
			if (attr == "html"  || attr == "__org_monkshu_innerHTML") continue;	// our reserved attrs
			html += ` ${attr}="${await _evalAttrValue(htmlElement[attr])}"`; 
		}
		html += `>${htmlElement.__org_monkshu_innerHTML||''}</${htmlElement.html}></div>
		`
	}

	css += cssInternal;
	css += "</style>"; html += "</div>";

	const finalHTML = css+html;

	return finalHTML;
}

async function _evalAttrValue(str) {
	await $$.require("/framework/3p/xregexp-all.js");

	let val = ((window[str] && (!window[str] instanceof Object)) || str).toString();	// Mustache expects strings only

	const _xregexparrayToObject = array => {const retObj = {}; for (const object of array) retObj[object.name] = object.value; return retObj;}

	const _recursiveExpandFunctions = async val => {
		const testForAttrFunctions = _xregexparrayToObject(XRegExp.matchRecursive(val, "\\(", "\\)", "g", 
			{valueNames: ["cmd","left","match","right"]}));
		if (!testForAttrFunctions.match || (testForAttrFunctions.cmd != "url" && 
			testForAttrFunctions.cmd != "encodeURIComponent")) return val;	// nothing to expand
		val = await _recursiveExpandFunctions(testForAttrFunctions.match);

		if (testForAttrFunctions.cmd == "url") try {val = (await $$.requireText(val)).replace(/\r?\n|\r/g, "");} catch {}	// remove line feeds
		else if (testForAttrFunctions.cmd=="encodeURIComponent") val = encodeURIComponent(val);
		return val;
	}
	
	val = await _recursiveExpandFunctions(val);
	return val;
}

function _findObject(objectArray, colStart, colEnd, rowEnd, label) {
	for (const object of objectArray) if (object.colStart == colStart && object.colEnd == colEnd && 
		object.rowEnd == rowEnd && object.element == label) return object;

	return null;
}

// convert this all into a WebComponent so we can use it
export const page_generator = {trueWebComponentMode: true, elementConnected, getHTML}
monkshu_component.register("page-generator", null, page_generator);