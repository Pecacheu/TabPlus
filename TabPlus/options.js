//TabPlus Options. Ray 2016, All rights reserved

'use strict';
let opts;
onload=async () => {try {
	TabServiceInit();
	for(let i=0; i<20; ++i) {
		console.log("Tab service init!");
		opts=await TabService('getOpts');
		if(!opts) {await utils.delay(250); continue}
		console.log("Opts",opts);
		//Set opts
		DarkMode.checked=opts.DarkMode;
		SavePinned.checked=opts.SavePinned;
		NewWindows.value=opts.NewWindows;
		utils.numField(NoDelayTabs, 0, 200), NoDelayTabs.set(opts.NoDelayTabs);
		utils.numField(TabDelay, 0, 5000), TabDelay.set(opts.TabDelay);
		//Set listeners
		DarkMode.oninput=SavePinned.oninput=NewWindows.oninput=
			NoDelayTabs.onblur=TabDelay.onblur=setOpt;
		bRst.onclick=resetAll;
		oCont.style.opacity=1;
		return;
	}
	throw "Timed out while waiting for service";
} catch(e) {err(e)}}

async function setOpt() {try {
	if(!(this.id in opts)) return;
	let v; if(this.type=='checkbox') v=this.checked?1:0;
	else if(this.type=='select-one') v=Number(this.value);
	else v=this.num;
	console.log(this.id, v);
	if(!Number.isInteger(v)) throw "Oops, value must be int";
	if(opts[this.id] != v) {
		opts[this.id]=v; await TabService('setOpts',opts);
	}
} catch(e) {err(e)}}

async function resetAll() {try {
	if(this.id=='bRst') { //Open confirm diag
		diag.style.display=diagBg.style.display='block';
		await utils.delay(1);
		diagBg.classList.add('show');
		await utils.delay(200);
		diag.classList.add('show');
		dc1.onclick=dc2.onclick=dcc.onclick=resetAll;
	} else {
		dcc.onclick=null;
		diag.classList.remove('show');
		diagBg.classList.remove('show');
		await utils.delay(200);
		diag.style.display=diagBg.style.display=null;
		if(this.id!='dcc') return;
		await Promise.all([chrome.storage.local.clear(),chrome.storage.sync.clear()]);
		await TabService('openMainPage'); location.reload();
	}
} catch(e) {err(e)}}

function err(e) {
	document.body.style.color='#b00';
	document.body.textContent="Error: "+e;
}