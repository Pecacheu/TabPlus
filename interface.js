var gui = new function() {

//------> Content Loader Animation <------

this.runIconLoader = function() {
	var doc = logo.contentDocument.children[0];
	//Copy animations into SVG:
	doc.innerHTML += "<style>"+getCssRule("loadAnim")+"</style>";
	setTimeout(function() {
		//Transition icon to loader:
		var iEl = doc.children;
		for(var i=2; i<7; i++) {
			var els = iEl[i].style;
			if(i >= 3 && i <= 5) {
				els.transition = "transform 1.2s cubic-bezier(0.65, 0.05, 0.36, 1)";
				els.transformOrigin = "center"; els.transform = "scale(0.4,0.05)";
			} else { els.transition = "opacity 1.2s"; els.opacity = 0; }
		}
		setTimeout(function() {
			//Fade into loader and run load animation:
			for(var i=3; i<10; i++) {
				var els = iEl[i].style;
				if(i >= 3 && i <= 5) {
					els.transition += ", opacity 0.4s linear"; els.opacity = 0;
				} else if(i >= 7 && i <= 9) {
					els.transition = "opacity 0.4s"; els.opacity = 1;
					els.animation = "loadAnim 2s infinite "+((i-7)/4)+"s";
				}
			}
			var lInt = setInterval(function(){if(!loadFlag){unloadIcon();clearInterval(lInt)}}, 100);
		}, 850);
	}, 150);
	
}

function unloadIcon() {
	loader.style.transition = "opacity 0.5s linear"; loader.style.opacity = 0;
	content.style.opacity = 0; setTimeout(function() {
		loader.remove(); content.style.animation = "1s contAnim"; content.style.opacity = null;
		setTimeout(function(){document.body.style.overflow = null},800);
	}, 500);
}

function getCssRule(name) {
	var rules = document.styleSheets[0].rules || document.styleSheets[0].cssRules;
	for(var i=0,l=rules.length; i<l; i++) if(rules[i].selectorText
	== name || rules[i].name == name) return rules[i].cssText;
}

//------> Folder List Generation <------

this.addFolder = function(name, date, onclick, nameable) {
	files.parentNode.parentNode.style.display = null;
	var row = document.createElement('tr'); row.setAttribute('role', "button");
	addCell(row, "icon"); var nDiv = document.createElement('div'); nDiv.textContent = name;
	addCell(row, "name").appendChild(nDiv); addCell(row, "date").textContent = parseDate(date);
	files.appendChild(row); row.fName = name; if(!nameable) row.system = true;
	row.onclick = function() {if(!row.edit&&!row.moving)onclick.bind(this)()};
	if(nameable) {
		nDiv.onclick = function() {gui.renameFolder(row)};
		row.onmousedown = function(e) {grabber.grabItem(e,row,[files.children],transfer,interMode)};
		function transfer(fOld, fNew) { if(fOld != fNew) {
			var nDir = tabPlus.readDir(fNew.system?Path.substring(0,Path.lastIndexOf('/')):(Path+"/"+fNew.fName), IsLocal), oDir = tabPlus.readDir(Path, IsLocal),
			fCont = oDir[fOld.fName]; if(nDir) { nDir[tabService.findName(fOld.fName,nDir)] = fCont||{}; delete oDir[fOld.fName]; fOld.remove(); }
			if(gui.onFolderDragged) gui.onFolderDragged.bind(row)();
		}}
		function interMode(fOld, local) { if(local != IsLocal) {
			var nDir = tabPlus.readDir("", local), oDir = tabPlus.readDir(Path, IsLocal), fCont = oDir[fOld.fName];
			nDir[tabService.findName(fOld.fName,nDir)] = fCont||{}; delete oDir[fOld.fName]; fOld.remove();
			if(gui.onFolderDragged) gui.onFolderDragged.bind(row)(local);
		}}
	}
	return row;
}

this.renameFolder = function(row) {
	if(row.edit) return; row.edit = true;
	var name = row.getElementsByClassName("name")[0], nF = name.children[0];
	nF.style.display = "none"; var txt = document.createElement('input');
	txt.type = "text"; txt.value = row.fName; name.appendChild(txt);
	txt.onblur = function(){titleUnedit(txt.value)};
	function updateTxt(){txt.style.width=(textWidth(txt)+20)+"px"};
	updateTxt(); document.addEventListener('keyup', titleUnedit);
	txt.oninput = updateTxt; txt.focus();
	function titleUnedit(t) {
		if(typeof t == 'object') {
			if(t.key == "Enter") { t = name.children[0].value; }
			else if(t.key == "Escape") { t = row.fName; } else return;
		}
		if(!row.edit) return; row.edit = false; document.removeEventListener('keyup', titleUnedit);
		if(!t) t = ""; else t = t.replace(tabService.NameFilter, "").trim(); //Remove non-allowed chars.
		if(!t || (t != row.fName && (DirContent[t]||DirContent['~'+t])))
		{ row.edit = true; txt.focus(); return; } //If no name or name taken, resume editing.
		var ot = row.fName; row.fName = t; nF.textContent = t; nF.style.display = null; txt.remove();
		if(gui.onTablistNameChange) gui.onTablistNameChange.bind({title:t})(ot);
	}
}

this.remFolder = function(index) {
	var f = files.children[index]; if(f) f.remove();
}

this.clearFolders = function() { files.innerHTML = ""; }

//------> Tab List Generation <------

this.TabList = function(title, tablist) {
	//Generate Tab Summry:
	var sum = document.createElement('div'); sum.className = "tabsum";
	var lock = document.createElement('img'), locked = false; lock.src = "theme/lock.svg";
	var name = document.createElement('div'), cnt = document.createElement('div'), date = document.createElement('div');
	sum.appendChild(lock); sum.appendChild(name); sum.appendChild(cnt); sum.appendChild(date);
	
	//Event Listeners:
	lock.onclick = function(){setLocked(!locked)};
	name.onclick = function(){titleEdit()}; cnt.onclick = function(){titleEdit(true)};
	
	//Generate Tab Table:
	var wrap = document.createElement('div'); wrap.className = "tWrap";
	ta = document.createElement('table'); ta.className = "tablist";
	var table = document.createElement('tbody'); ta.appendChild(table);
	wrap.appendChild(ta); ta.this = this; delete ta;
	
	//Public Functions:
	this.update = function(skipTabs) {
		cnt.textContent = (tablist.length-1)+" Tab"+(tablist.length>2?"s":""); date.textContent = parseDate(tablist[0]);
		var oTabs = table.children; if(tablist.length<=1) this.removeSelf();
		else if(!skipTabs) {
			var oTabs = table.children; for(var i=0,l=oTabs.length; i<l; i++) this.removeTab(oTabs[i]);
			for(i=1,l=tablist.length; i<l; i++) addTab(tablist[i][0], tablist[i][1], i);
		} else {
			for(var i=0,l=oTabs.length; i<l; i++) oTabs[i].ind = i+1;
		}
	}
	
	this.removeSelf = function(sysRem) { sum.remove(); wrap.remove(); if(gui.onTablistRemoved) gui.onTablistRemoved.bind(this)(sysRem); }
	
	Object.defineProperty(this, 'locked', {
		get:function() { return locked; },
		set:setLocked
	});
	Object.defineProperty(this, 'title', {
		get:function() { return (locked?"~":"")+title; },
		set:function(t) { titleUnedit(t,true); }
	});
	Object.defineProperty(this, 'rTitle', {
		get:function() { return title; }
	});
	
	this.addNewTab = function(title, addr, ind) {
		addTab(title, addr, ind); tablist.splice(ind,0,[title, addr]); this.update(true);
	}
	
	//Private Functions:
	function addTab(title, addr, ind) {
		var tab = document.createElement('tr'), img = document.createElement('img');
		img.normSrc = "http://www.google.com/s2/favicons?domain="+getDomain(addr);
		addCell(tab, "icon").appendChild(img); var name = document.createElement('a');
		name.textContent = title; name.href = addr; addCell(tab, "name").appendChild(name); tab.ind = ind;
		name.target = "_blank"; img.src = img.normSrc; table.insertBefore(tab, table.children[ind-1]);
		tab.tName = title; tab.addr = addr;
		//Lock & Remove:
		tab.onmouseover = function(){if(!locked)img.src="theme/cancel.svg"};
		name.onclick = function(e){delTab(e,tab,false)};
		img.onclick = function(e){delTab(e,tab,true)};
		tab.onmouseout = function(){img.src=img.normSrc};
		//Drag & Drop:
		tab.onmousedown = function(e){if(!locked||tab.ind==1)
		grabber.grabItem(e,tab,genTablists(tab),transfer,interMode)};
	}
	
	function delTab(e,tab,del) {
		if(e.shiftKey) { //Open if not x icon:
			event.preventDefault();
			if(!del) tabService.runTabOpener(tablist, chrome.windows.WINDOW_ID_CURRENT);
			if(!locked) { //Delete if not locked:
				this.removeSelf(); var cDir = tabPlus.readDir(Path, IsLocal);
				if(cDir) { delete DirContent[this.title]; delete cDir[this.title]; }
			}
		} else removeTab(tab);
	} delTab = delTab.bind(this);
	
	function transfer(tabEl, newEl, newInd, shift) {
		if(newEl.fName) { //Folders:
			var nDir = tabPlus.readDir(newEl.system?Path.substring(0,Path.lastIndexOf('/'))
			:(Path+"/"+newEl.fName), IsLocal), oDir = tabPlus.readDir(Path, IsLocal);
			var nDate = tabService.genDate();
			if(nDir) { if(locked||shift) { //Transfer whole tablist:
				this.removeSelf(); delete DirContent[this.title]; delete oDir[this.title];
				if(!locked) tablist[0] = nDate; nDir[(locked?"~":"")+tabService.findName(this.title,nDir)] = tablist;
				console.log(this.title);
			} else { //Only transfer tab:
				nDir[tabService.autogenName(nDir)] = [nDate, [tabEl.tName, tabEl.addr]]; removeTab(tabEl);
			}}
		} else if(!locked) { //Tablists:
			var newTl = newEl.parentNode.parentNode.this;
			newTl.addNewTab(tabEl.tName, tabEl.addr, newInd+1); removeTab(tabEl);
		}
		if(gui.onTabDragged) gui.onTabDragged.bind(this)();
	} transfer = transfer.bind(this);
	
	function interMode(tabEl, local, shift) {
		var nDate = tabService.genDate();
		if(local == IsLocal) { //If already in mode, just update date.
			tablist[0] = nDate;
		} else if(locked||shift) { //If shift held, create copy of tablist under other mode, and remove this one:
			var nDir = tabPlus.readDir("", local), cDir = tabPlus.readDir(Path, IsLocal);
			this.removeSelf(); delete DirContent[this.title]; if(cDir) delete cDir[this.title];
			if(!locked) tablist[0] = nDate; nDir[(locked?"~":"")+tabService.findName(this.title,nDir)] = tablist;
		} else if(!locked) { //Copy only this tab:
			var nDir = tabPlus.readDir("", local);
			nDir[tabService.autogenName(nDir)] = [nDate, [tabEl.tName, tabEl.addr]]; removeTab(tabEl);
		}
		if(gui.onTabDragged) gui.onTabDragged.bind(this)(local, shift);
	} interMode = interMode.bind(this);
	
	function genTablists(tab) {
		var tlists = []; if(locked) tlists = [[tab]]; else {
			var el = document.getElementsByClassName("tablist");
			for(var i=0,l=el.length; i<l; i++) {
				var eTabs = el[i].children[0].children; tlists[i] = [];
				for(var v=0,f=eTabs.length; v<f; v++) tlists[i].push(eTabs[v]);
			}
		}
		tlists.push(files.children); return tlists;
	}
	
	function removeTab(tab) { if(!locked) {
		tablist.splice(tab.ind,1); tab.remove(); this.update(true);
		if(gui.onTabRemoved) gui.onTabRemoved.bind(this)();
	}} removeTab = removeTab.bind(this);
	
	function titleEdit(o) {
		if(locked || name.edit || (o && name.textContent.length)) return; name.edit = true;
		name.style.display = null; var txt = document.createElement('input');
		txt.type = "text"; txt.value = name.textContent; name.textContent = "";
		name.appendChild(txt); txt.onblur = function(){titleUnedit(txt.value)};
		function updateTxt(){txt.style.width=(textWidth(txt)+20)+"px"};
		updateTxt(); document.addEventListener('keyup', titleUnedit);
		txt.oninput = updateTxt; txt.focus();
	}
	
	function titleUnedit(t, b) {
		if(typeof t == 'object') {
			if(t.key == "Enter") { t = name.children[0].value; }
			else if(t.key == "Escape") { t = title; } else return;
		}
		if(!name.edit && !b) return; name.edit = false; document.removeEventListener('keyup', titleUnedit);
		
		if(b && t[0] == '~') setLocked(true, true); //Set initial locked status.
		if(!t) { if(/^_\d+$/.test(title)) t = title; else t = tabService.autogenName(DirContent); } //If no name supplied, autogen name.
		
		t = t.replace(tabService.NameFilter, "").trim(); //Remove non-allowed chars.
		if(!b && t != title && (DirContent[t]||DirContent['~'+t])) { name.edit = true; name.children[0].focus(); return; } //If name taken, resume editing.
		
		var ot = title; title = t; if(/^_\d+$/.test(t)) t = "";
		name.textContent = t; name.style.display = t?null:"none";
		if(!b && gui.onTablistNameChange) gui.onTablistNameChange.bind(this)(ot);
	} titleUnedit = titleUnedit.bind(this);
	
	function setLocked(l,b) {
		var ol = locked;
		if(l) { locked = true; lock.style.filter = "none"; }
		else { locked = false; lock.style.filter = null; }
		if(!b && gui.onTablistLocked) gui.onTablistLocked.bind(this)(ol);
	} setLocked = setLocked.bind(this);
	
	titleUnedit(title, true); this.update();
	content.appendChild(sum); content.appendChild(wrap);
}

this.onTablistNameChange = false;
this.onTablistLocked = false;
this.onTabDragged = false;
this.onTablistRemoved = false;
this.onTabRemoved = false;
this.onFolderDragged = false;

//------> Item Drag & Drop API <------

/* API Usage Requirements:
- Must have .moving CSS class for stylizing moving elements.
- Must have .insert CSS class for stylizing hovered elements during drag.
- Must provide final processor function transfer(oldElement, newElement, newPosition).
- Can provide interMode(oldElement, btn, shiftKey) function to handle a drop over LOCAL/SYNCED buttons.
(btn is TRUE for 'local' button, FALSE for 'synced' button)
- The 'moving' property will be true on the element while moving, and will remain so until after callback completion.
*/

var Grabber = function() {
	var dThis = this; //Vars:
	var gItem = null, gTmr = null, initX, initY, initT, initL, initSX, initSY, dList,
	gType, gMoved, gStyle, rectCache, trans, inter, iInter = false, newX, newY;
	function setGMv() { gMoved = true; }
	
	//Initiate an item grab:
	this.grabItem = function(event, item, droplists, transfer, interMode) {
		//Reset variables:
		if(gItem !== null) return; gItem = item; gMoved = false; //gType = type;
		gStyle = false; dList = droplists; rectCache = []; trans = transfer;
		inter = interMode; iInter = false; initX = event.clientX; initY = event.clientY;
		initSX = window.scrollX; initSY = window.scrollY;
		
		//Set initial events and override system drag:
		document.addEventListener('mouseup', grabDrop);
		gItem.ondragstart = systemDragStart;
		document.body.style.userSelect = "none";
		
		//Set timeout to main code:
		gTmr = setTimeout(function() {
			document.addEventListener('mousemove', setGMv);
			gTmr = setTimeout(function() {
				gTmr = null; document.removeEventListener('mousemove', setGMv);
				if(!gMoved) gItem = null; else {
					gItem.moving = true; setCursor("move");
					document.addEventListener('mousemove', grabMove);
					document.addEventListener('keyup', keyPress);
				}
			}, 280);
		}, 10);
	}
	
	//Drop the current item:
	this.dropItem = function(item, isShift) { if(item == gItem || item === true) {
		document.removeEventListener('mouseup', grabDrop); if(gItem) gItem.ondragstart = null;
		if(gTmr !== null) { clearTimeout(gTmr); gTmr = null; document.removeEventListener('mousemove', setGMv); }
		else {
			//Clear listeners:
			document.removeEventListener('mousemove', grabMove);
			document.removeEventListener('keyup', keyPress);
			
			//Remove button style:
			if(inter) { lTab.classList.remove("hovTrig"); sTab.classList.remove("hovTrig"); }
			setItemStyle(false); //Reset item to old position.
			
			//Determine drop point:
			var ind = findDropPoint(); if(item === true) {} //Cancel override.
			else if(inter && iInter) inter(gItem, iInter=='l', isShift||false); //Landed on LOCAL/SYNCED controls.
			else if(ind) trans(gItem, ind[0], ind[1], isShift||false); //Determine index and move tab to new location.
		}
		setCursor(null); document.body.style.userSelect = null;
		setTimeout(function(){if(gItem) { gItem.moving = false; gItem = null; }},5);
	}}
	
	function findDropPoint() {
		var item,rect,rH; for(var i=0,l=dList.length; i<l; i++) {
			for(var b=0,s=dList[i].length; b<s; b++) {
				item = dList[i][b]; if(item.classList.contains("insert")) { item.classList.remove("insert"); return [item,b]; }
				if(rectCache.length) {
					rect = rectCache[i][b]; rH = rect.height/2;
					if(b==s-1 && newY < rect.bottom+rH && newY >= rect.top+rH && newX >= rect.left && newX < rect.right) {
						item.classList.remove("insert"); return [item,b+1];
					}
				}
			}
		}
		return false;
	}
	
	//Event Listeners:
	
	function grabDrop(e) { dThis.dropItem(gItem, e.shiftKey); }
	function keyPress(e) { if(e.key == "Enter" || e.key == "Escape") dThis.dropItem(true); }
	function systemDragStart(e) { e.preventDefault(); }
	
	function grabMove(event) {
		var absX = event.clientX, absY = event.clientY; setItemStyle(true);
		
		//Set item position:
		gItem.style.left = (initL-(initX-absX))+"px"; gItem.style.top = (initT-(initY-absY))+"px";
		newX = absX+window.scrollX-initSX; newY = absY+window.scrollY-initSY;
		
		//Change color on hover over mode buttons:
		var set=false; if(inter) {
			lTab.classList.remove("hovTrig"); sTab.classList.remove("hovTrig"); var lRect = lTab.getBoundingClientRect(), sRect = sTab.getBoundingClientRect();
			if(absY < lRect.bottom && absY >= lRect.top && absX >= lRect.left && absX < lRect.right) { lTab.classList.add("hovTrig"); set = true; iInter = 'l'; }
			else if(absY < sRect.bottom && absY >= sRect.top && absX >= sRect.left && absX < sRect.right) { sTab.classList.add("hovTrig"); set = true; iInter = 's'; }
			else iInter = false;
		}
		
		//Show empty slots between items:
		var item,rect,rH; for(var i=0,l=dList.length; i<l; i++) {
			for(var b=0,s=dList[i].length; b<s; b++) {
				item = dList[i][b]; rect = rectCache[i][b]; if(b==s-1) rH = rect.height/2;
				if(item != gItem) { if(!set && newY < rect.bottom && newY >= rect.top && newX >= rect.left
				&& newX < rect.right) { item.classList.add("insert"); set = true; } else if(b==s-1 && newY <
				rect.bottom+rH && newY >= rect.top+rH && newX >= rect.left && newX < rect.right) set = true;
				else item.classList.remove("insert"); }
			}
		}
		
		setCursor(set?"move":"no-drop");
	}
	
	//Private Functions:
	
	function setItemStyle(onOff) {
		if(onOff && !gStyle) { gStyle = true;
			var rect = gItem.getBoundingClientRect(); initT = rect.top; initL = rect.left;
			gItem.classList.add("moving"); gItem.style.width = rect.width+"px"; gItem.style.height = rect.height+"px";
			//Cache item sizes & positions:
			for(var i=0,l=dList.length; i<l; i++) { rectCache[i] = []; for(var b=0,s=dList
			[i].length; b<s; b++) rectCache[i][b] = dList[i][b].getBoundingClientRect(); }
		} else if(!onOff && gStyle) { gStyle = false;
			gItem.classList.remove("moving"); gItem.style.width = null; gItem.style.height = null;
		}
	}
	
	function setCursor(c) {
		document.body.style.cursor = c;
	}
}
var grabber = new Grabber();

//------> Other Functions <------

function textWidth(field) {
	var canvas = window.textWidthCanvas || (window.textWidthCanvas = document.createElement("canvas"));
	var context = canvas.getContext("2d"); context.font = getComputedStyle(field).font;
	return context.measureText(field.value).width;
}

function addCell(table, cls) {
	var c = document.createElement('td');
	c.className = cls; table.appendChild(c);
	return c;
}

function parseDate(dateRaw) {
	if(!dateRaw) return ""; var now = new Date(), y = now.getFullYear(), m = now.getMonth(),
	d = now.getDate(), dIn = dateRaw.split('.'); if(dIn.length != 6) return dateRaw;
	for(var i=0,l=dIn.length; i<l; i++) { dIn[i] = Number(dIn[i]); if(isNaN(dIn[i])) return dateRaw; }
	//Date:
	var date; if(dIn[2] == y && dIn[0] == m && dIn[1] == d) date = "Today";
	else if(dIn[2] == y && dIn[0] == m && dIn[1] == d-1) date = "Yesterday";
	else {
		var weekDay = isInWeek(now, dIn[1], dIn[0], dIn[2]);
		if(weekDay != -1) date = (["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])[weekDay];
		else {
			date = (["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"])
			[dIn[0]]+" "+numSuffix(dIn[1]); if(dIn[2] != y) date += ", "+dIn[2];
		}
	}
	//Time:
	var hours = dIn[3], mins = dIn[4], secs = dIn[5], suffix = hours >= 12 ? "PM":"AM"; hours = ((hours + 11) % 12 + 1),
	time = (hours>9?hours:"0"+hours)+":"+(mins>9?mins:"0"+mins)+":"+(secs>9?secs:"0"+secs); return date+" at "+time+" "+suffix;
}

function isInWeek(now, date, month, year) {
	var nD = new Date(now), y = nD.getFullYear(), m = nD.getMonth(), d = nD.getDate(), cnt = 0;
	while(y > year || m > month || d > date) { nD.setDate(d-1); cnt++; y = nD.getFullYear();
	m = nD.getMonth(); d = nD.getDate(); if(cnt >= 7) return -1; } return nD.getDay();
}

function numSuffix(n) {
	var j = n % 10, k = n % 100;
	if(j == 1 && k != 11) { return n + "st"; }
	if(j == 2 && k != 12) { return n + "nd"; }
	if(j == 3 && k != 13) { return n + "rd"; }
	return n + "th";
}

function getDomain(url) {
	var dom = "", v, step = 0;
	for(var i=0,l=url.length; i<l; i++) {
		v = url[i]; if(step == 0) {
			//First, skip 0 to 5 characters ending in ':' (ex: 'https://')
			if(i > 5) { i=-1; step=1; } else if(v == ':') { i+=2; step=1; }
		} else if(step == 1) {
			//Skip 0 or 4 characters 'www.'
			if(v == 'w' && url[i+1] == 'w' && url[i+2] == 'w' && url[i+3] == '.') i+=4;
			dom+=url[i]; step=2;
		} else if(step == 2) {
			//Stop at subpages, queries, and hashes.
			if(v == '/' || v == '?' || v == '#') break; dom += v;
		}
	}
	return dom;
}

}();