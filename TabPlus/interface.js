//TabPlus Interface. Ray 2016, All rights reserved

'use strict';
const LoadOvf=100, //Load Overflow Margin
GCooldown=50, //Allow-Grab Delay
GUI=new function() {

//--- Animated Content Loader

this.runIconLoader=async n => {
	LoadFlag=n?2:1; cont.style=loader.style=null;
	if(n) loader.replaceChildren(); else {
		let ld=logo.contentDocument.firstChild, lc=ld.children;
		ld.innerHTML+=`<style>${getCssRule('loadAnim')}</style>`; //Copy anim to SVG
		await utils.delay(150);
		for(let i=2,es; i<7; ++i) { //Icon -> loader
			es=lc[i].style; if(i>=3 && i<=5) {
				es.transition="transform 1.2s cubic-bezier(.65,.05,.36,1)",
				es.transformOrigin="center", es.transform="scale(.4,.05)";
			} else es.transition="opacity 1.2s", es.opacity=0;
		}
		await utils.delay(850);
		for(let i=3,es; i<10; ++i) { //Fade into loader, run load anim
			es=lc[i].style; if(i>=3 && i<=5) {
				es.transition+=", opacity .4s linear", es.opacity=0;
			} else if(i >= 7 && i <= 9) {
				es.transition="opacity .4s", es.opacity=1,
				es.animation=`loadAnim 2s infinite ${(i-7)/4}s`;
			}
		}
	}
}
this.endLoad=async () => {
	loader.style.transition="opacity .5s linear", loader.style.opacity=0;
	if(LoadFlag==1) cont.style.opacity=0, cont.style.animation="1s contAnim";
	await utils.delay(500); loader.style.display='none', cont.style.opacity=null;
	DB.style.overflow=null; LoadFlag=0;
}
function getCssRule(n) {
	let r=document.styleSheets[0].cssRules,i=0,l=r.length;
	for(; i<l; ++i) if(r[i].selectorText==n||r[i].name==n) return r[i].cssText;
}

//--- Folder Generation

this.addFolder=(name, date, onclick, nameable) => {
	fTab.hidden=0; let row=utils.mkEl('tr',folders),
	ico=utils.mkEl('td',row,'icon'); row.setAttribute('role','button');
	let tn=utils.mkDiv(row.nf=utils.mkEl('td',row,'name'));
	utils.mkEl('td',row,'date').textContent=parseDate(date);
	tn.textContent=row.fName=name; onclick=onclick.bind(row);
	row.onclick=e => {if(!e.shiftKey&&!row.edit&&!row.moving)onclick()};
	if(nameable) {
		makeGrabable(row,row,genFl,fTrans);
		tn.onclick=() => GUI.renameFolder(row);
		row.onmouseover=row.onmousemove=e => {
			if(e.shiftKey) ico.classList.add('del');
			else ico.classList.remove('del');
		}
		row.onmouseout=() => ico.classList.remove('del');
		ico.onclick=e => {if(e.shiftKey)GUI.onFolderDel(name).catch(hErr)}
	} else row.system=1;
	return row;
}
function genFl() {let f=[folders]; f.static=[lTab,sTab]; return f}
async function fTrans(f,el,idx) {if(el!==-1 && f!=el) {
	let c=el.children[idx], np=el.path||(c.system?pathOut():pathIn(c));
	f.remove(); if(!folders.childElementCount) fTab.hidden=1;
	GUI.onFolderMoved(f.fName,np).catch(hErr);
}}

this.renameFolder=(row, TL) => {try {
	if(row.edit || TL && row.locked) return; row.edit=1;
	let name=row.nf, ot=row.fName, nf=TL?name:name.firstChild;
	if(TL) name.textContent=''; nf.style.display=TL?null:'none';
	let txt=utils.mkEl('input',name);
	txt.type="text", txt.value=ot, txt.onblur=tEdit;
	document.addEventListener('keyup',tEdit); txt.focus();
	(txt.oninput=() => {
		let v=txt.value;
		if(v.length>TabPlus.NameMaxLen) txt.value=v=v.substr(0,TabPlus.NameMaxLen);
		txt.style.width=utils.textWidth(v,getComputedStyle(txt).font)+20;
	})();
	async function tEdit(t) {try {
		if(row.edit==2) return row.edit=1;
		if(t instanceof KeyboardEvent) {
			if(t.key == "Enter") t=txt.value; else if(t.key == "Escape") t=ot; else return;
		} else t=txt.value;
		if(!row.edit) return; if(!t) t=TL?ot:''; else t=t.replace(TabPlus.NameFilter,'').trim();
		if(!t || t!=ot && (DirCont[t]||DirCont['~'+t]))
			return t&&alert("Sorry, that name is taken!"),row.edit=2,txt.focus();
		document.removeEventListener('keyup',tEdit),txt.onblur=null;
		nf.textContent=row.fName=t; txt.remove();
		nf.style.display=(TL&&noName(t))?'none':null;
		await GUI.onNameChange(ot,t,!TL); setTimeout(() => {row.edit=0},200);
	} catch(e) {hErr(e)}}
} catch(e) {hErr(e)}}
this.clearFolders=() => {fTab.hidden=1,folders.replaceChildren()};
this.clearTLists=() => cData.replaceChildren();

//--- TabList Generation

this.TabList=function(title, tList) {
	//Tab Summary
	let sum=utils.mkDiv(cData,'tabsum'), lock=utils.mkEl('img',sum), locked=0,
	name=utils.mkDiv(sum), cnt=utils.mkDiv(sum), date=utils.mkDiv(sum); lock.src="theme/lock.svg";
	lock.onclick=() => setLock(!locked), cnt.onclick=name.onclick=() => GUI.renameFolder(this,1);
	//Tab Table
	this.nf=name; let wrap=utils.mkDiv(cData,'tWrap'),
	tbl=utils.mkEl('tbody',utils.mkEl('table',wrap,'tabs'));
	tbl.parentNode.tl=sum.tl=this;

	utils.define(this, 'locked', ()=>locked);
	utils.define(this, 'name', ()=>(locked?'~':'')+this.fName);
	this.update=skipNew => {
		let i=1,l=tList.length; if(l<2) return this.remove();
		cnt.textContent=(l-1)+" Tab"+(l>2?'s':''), date.textContent=parseDate(tList[0]);
		if(!skipNew) { tbl.replaceChildren(); for(; i<l; ++i) addTab(tList[i]); }
		else if(skipNew===1) doSync();
	}
	this.remove=g => {
		sum.remove(); wrap.remove();
		if(!g && GUI.onTabsRemoved) GUI.onTabsRemoved(this.name).catch(hErr);
	}
	this.newTab=(data,idx) => {tList.splice(idx+1,0,data),addTab(data,idx)}
	this.bCheck=() => {
		let r=wrap.boundingRect; if(r.y<utils.h+LoadOvf && r.y2>0)
			this.update(),removeEventListener('scroll',this.bCheck),this.bCheck=0;
	}

	//Private
	let addTab=(data,idx) => {
		let tab=utils.mkEl('tr',null,'tab'), img=utils.mkEl('img',utils.mkEl('td',tab,'icon')),
			name=utils.mkEl('a',utils.mkEl('td',tab,'name'));
		img.src=img.normSrc=`https://icons.duckduckgo.com/ip3/${getDomain(data[1])}.ico`,
		name.textContent=tab.tName=data[0], name.href=tab.addr=data[1], name.target='_blank';
		if(idx!=null) tbl.insertChildAt(tab,idx); else tbl.appendChild(tab); tab.tl=this;
		//Lock & Remove
		tab.onmouseover=() => {if(!locked)img.src="theme/cancel.svg"},
		name.onclick=e => delTab(e,tab), img.onclick=e => delTab(e,tab,1),
		tab.onmouseout=() => {img.src=img.normSrc}
		//Drag & Drop
		makeGrabable(tab, name.parentNode, ()=>(locked&&tab.index)?false:genTl(tab), tTrans);
	}, delTab=async (e,tab,del) => {
		if(e.shiftKey) { //Open if not X icon
			e.preventDefault();
			if(!del) await TabService('runTabOpener', tList, chrome.windows.WINDOW_ID_CURRENT);
			if(!locked) this.remove();
		} else remTab(tab,tab.index);
	}, setLock=(l,g) => {
		let on=this.name; lock.style.filter=(locked=l)?'none':null;
		if(!g && GUI.onTabsLocked) GUI.onTabsLocked(on,this.name).catch(hErr);
	}, tTrans=async (tab,el,idx,oi,shift) => {if(el!==-1 && tab!=el) try {
		let c=el.children[idx];
		if(el.path || c&&c.fName) { //Folder
			let np=el.path||(c.system?pathOut():pathIn(c)), date=genDate();
			if(tList.length<=2||locked||shift) { //Transfer whole TabList
				if(!locked) tList[0]=date; this.remove(1);
				await GUI.onTabsMoved(this.name,np);
			} else { //Only transfer tab
				remTab(tab,oi,1); await GUI.onTabMoved(np,[date,[tab.tName,tab.addr]]);
			}
		} else if(!locked) { //TabList
			let tl=el.parentNode.tl;
			if(tList.length<=2 || shift && this!=tl) { //All tabs
				for(let i=1,l=tList.length; i<l; ++i) tl.newTab(tList[i],idx+i-1);
				tl.update(2); this.remove();
			} else { //One tab
				remTab(tab,oi,1); tl.newTab([tab.tName,tab.addr],idx); tl.update(1);
			}
		}
	} catch(e) {hErr(e)}}, genTl=tab => {
		let tl=[]; if(!locked) utils.getClassList('tabs').each(el => {
			if(!el.tl.locked) tl.push(el.firstChild);
		});
		tl.push(folders),tl.static=[lTab,sTab]; return tl;
	}, remTab=(tab,ti,g) => {
		if(!locked) tList.splice(ti+1,1),tab.remove(),this.update(g?2:1);
	}

	//Set Title
	if(title.startsWith('~')) title=title.substr(1),setLock(1,1);
	name.textContent=this.fName=title; if(noName(title)) name.style.display='none';
	addEventListener('scroll',this.bCheck);
}

//--- Item Drag & Drop API

function setCur(c) {DB.className=c?'grab'+c:null}
function makeGrabable(el,btn,down,up) {
	let ev,rm=() => {removeEventListener(ev.u,rm),removeEventListener(ev.m,cm),setCur(ev=null)},
	cb=async e => {
		let md=e.type=='mousedown', u=md?'mouseup':'touchend', m=md?'mousemove':'touchmove';
		if(!md && e.touches.length>1) return; addEventListener(u,rm),addEventListener(m,cm);
		ev={u:u,m:m}; await utils.delay(GCooldown); if(ev&&!ev.t) setCur('M'),ev.e=e;
	}, cm=e => {
		if(!ev.e) return ev.t=1; e=ev,rm(); let dl=down();
		if(dl!==false) new Grabber(el,e.e,dl).ondrop=up;
	}
	btn.addEventListener('mousedown',cb), btn.addEventListener('touchstart',cb);
}
function Grabber(el,e,dLists,hitBox=10) {
	const par=el.parentElement, rect=el.boundingRect, rects=[],
	sRects=[], sr=utils.mkDiv(DB,'grabScroll',{top:DB.scrollHeight}),
	iSX=scrollX, iSY=scrollY, sInd=el.index, self=this;
	let mX,mY,oX,oY,tNum,sel; dLists=dLists||[par];
	//Get Initial Cursor/Touch Pos
	if(e) {
		let t=e; if(e.type=='touchstart') t=e.changedTouches[0], tNum=t.identifier;
		oX=t.clientX-rect.x, oY=t.clientY-rect.y;
	}
	//Dropzone & Container
	const drop=utils.mkEl(el.tagName,null,el.className+' grabInsert',{width:rect.w,height:rect.h}),
	cont=utils.mkDiv(null,'grabMoving',{width:rect.w,height:rect.h}),
	cs=cont.style; cont.noGrab=drop.noGrab=1; el.remove(); cont.appendChild(el);
	//Cache Element Pos
	dLists.each(d => {
		let i=0,c=d.children,l=c.length,re,r,rl=[];
		for(; i<l; ++i) if(!(re=c[i]).noGrab) rl.push(r=re.boundingRect),r.e=re,r.d=d;
		rl.d=d.boundingRect.expand(hitBox);
		if(!d.noDrop && (l=rl.length)) rl.d.y2+=hitBox, c=rl[l-1],
			rl.push(r=new UtilRect(rect)), r.x=c.x,r.y=c.y2, r.e=1,r.d=d;
		rects.push(rl);
	});
	if(dLists.static) dLists.static.each(d => {
		let r=d.boundingRect.expand(hitBox); sRects.push(r),r.e=r.d=d;
	});
	//Setup & Listeners
	par.appendChild(cont); addEventListener('keydown',onCancel);
	if(!e || e.type=='mousedown') addEventListener('mousemove',onDrag,{passive:false}),
		addEventListener('mouseup',onDrop);
	if(!e || e.type=='touchstart') addEventListener('touchmove',onDrag,{passive:false}),
		addEventListener('touchend',onDrop);
	function onDrag(e) {
		if(e.cancellable) e.preventDefault(); let t=getTouch(e); if(!t) return;
		mX=t.clientX,mY=t.clientY; if(oX==null) oX=mX-rect.x,oY=mY-rect.y;
		cs.left=mX-oX,cs.top=mY-oY; findDrop(mX,mY);
	}
	function findDrop(x,y) {
		let n=0,rl=sRects.length,d,i,l,r;
		for(; n<rl; ++n) if(sRects[n].contains(x,y)) {
			if(sel==(r=sRects[n])) return; drop.remove();
			delCls(),r.e.classList.add('grabDrop');
			setCur('M'); return sel=r;
		}
		x+=scrollX-iSX, y+=scrollY-iSY;
		for(n=0,rl=rects.length; n<rl; ++n) if(rects[n].d.contains(x,y)) {
			for(d=rects[n],i=0,l=d.length; i<l; ++i) if((r=d[i]).contains(x,y)) {
				if(sel==r) return; if(!r.d.noDrop) {
					if(r.e===1) r.d.appendChild(drop);
					else try {r.d.insertBefore(drop,r.e)} catch(e) {break}
				} else drop.remove();
				delCls(); if(r.e!==1) r.e.classList.add('grabDrop');
				setCur('M'); return sel=r;
			}
			break;
		}
		delCls(),setCur('N'),drop.remove(),sel=null;
	}
	function delCls() {
		if(sel&&sel.e!==1) sel.e.classList.remove('grabDrop');
	}
	function rst() {par.insertChildAt(el,sInd)}
	function onDrop(e) {
		if(e && !getTouch(e)) return; if(!sel) return onCancel(); onCancel(1);
		let d=sel.e===1, n=d?sel.d.childElementCount:sel.e.index;
		if(self.ondrop.call(self,el,sel.d,n,sInd,e.shiftKey)===false) rst();
	}
	function onCancel(noIns) {
		if(typeof noIns=='object' && noIns.type=='keydown' && noIns.key!='Escape') return;
		drop.remove(), cont.remove(), el.remove(), sr.remove(),
		removeEventListener('mousemove',onDrag), removeEventListener('mouseup',onDrop),
		removeEventListener('touchmove',onDrag), removeEventListener('touchend',onDrop),
		removeEventListener('keydown',onCancel), setCur(null), delCls();
		if(noIns!==1) rst(),self.ondrop.call(self,el,-1);
	}
	function getTouch(e) {
		if(e.type == 'touchmove') {
			let t=e.changedTouches; if(tNum==null) return t[0];
			for(let i=0,l=t.length; i<l; ++i) if(t[i].identifier==tNum) return t[i];
		} else return e;
	}
	this.drop=onDrop, this.cancel=onCancel, this.target=el;
	if(e) e.preventDefault(); onDrag(e);
}

//--- Other

function parseDate(date) {
	if(!date) return ''; let now=new Date(), y=now.getFullYear(),
		m=now.getMonth(), d=now.getDate(), dIn=date.split('.');
	if(dIn.length!=6 || dIn.each((n,i) => isNaN(dIn[i]=Number(n))?1:null)) return date;
	//Date
	if(dIn[2]==y && dIn[0]==m && dIn[1]==d) date="Today";
	else if(dIn[2]==y && dIn[0]==m && dIn[1]==d-1) date="Yesterday";
	else {
		let weekDay=isInWeek(now, dIn[1], dIn[0], dIn[2]);
		if(weekDay!=-1) date=(["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"])[weekDay];
		else {
			date=(["January","February","March","April","May","June","July","August","September","October","November","December"])
			[dIn[0]]+' '+utils.suffix(dIn[1]); if(dIn[2]!=y) date += ', '+dIn[2];
		}
	}
	//Time:
	let hours=dIn[3], mins=dIn[4], secs=dIn[5], sfx=hours>=12?'PM':'AM'; hours=((hours+11)%12+1);
	let time=(hours>9?hours:'0'+hours)+':'+(mins>9?mins:'0'+mins)+':'+(secs>9?secs:'0'+secs);
	return date+' at '+time+' '+sfx;
}
function isInWeek(now,date,month,year) {
	let nd=new Date(now), y=nd.getFullYear(), m=nd.getMonth(), d=nd.getDate(), cnt=0;
	while(y>year || m>month || d>date) {
		nd.setDate(d-1), y=nd.getFullYear(), m=nd.getMonth(), d=nd.getDate();
		if(++cnt >= 7) return -1;
	}
	return nd.getDay();
}
function getDomain(uri) {
	uri=new URL(uri).hostname;
	return uri.startsWith('www.')?uri.substr(4):uri;
}

}();