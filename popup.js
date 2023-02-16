//TabPlus Popup Script. Ray 2016, All rights reserved

let tabService;
window.onload = () => {
	document.getElementById("options").onclick = () => {chrome.runtime.openOptionsPage()};
	let btnList = document.getElementsByClassName("menuItem");
	chrome.runtime.getBackgroundPage((s) => {
		tabService=s; s.tabPlus.loadOptions();
		for(let i=0,l=btnList.length; i<l; ++i) btnList[i].onclick = function() {saveTabs(this.id)};
		document.body.firstChild.onclick = () => {tabService.openMainPage()};
	});
}

function saveTabs(type) {
	let sel={}, p=tabService.tabPlus.SavePinned;
	if(type == "all" || type == "left" || type == "right") sel={currentWindow:true,pinned:p};
	else if(type == "only") sel={currentWindow:true,active:true};
	else if(type == "other") sel={currentWindow:true,active:false,pinned:p};
	chrome.tabs.query(sel, tabs => {tabService.runTabSaver(tabs,type)});
}