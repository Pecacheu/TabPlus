import path from 'path';
import fs from 'fs/promises';
import { minify as mHtml } from 'html-minifier-terser';
import CleanCSS from 'clean-css';
import { minify as mJS } from 'terser';
import chalk from 'chalk';

const dir=import.meta.dirname, log=console.log,
din=dir+'/TabPlus', dout=dir+'/TabPlusMin',
//--- Minifier Opts ---
cssOpts={returnPromise:true, level:2},
jsOpts={
	ecma:2017,
	format:{inline_script:false, comments:false},
	compress:{passes:2, arguments:true, keep_fargs:false, keep_infinity:true, unsafe:true}
}, htmlOpts={
	collapseBooleanAttributes:true, removeScriptTypeAttributes:true, removeStyleLinkTypeAttributes:true,
	removeAttributeQuotes:true, removeRedundantAttributes:true, removeEmptyAttributes:true,
	collapseWhitespace:true, removeComments:true, minifyURLs:true,
	minifyCSS:new Object(cssOpts), minifyJS:new Object(jsOpts)
}, mCSS=new CleanCSS(cssOpts);

htmlOpts.minifyCSS.returnPromise=false;
htmlOpts.minifyJS.format.inline_script=true;

//--- Methods ---

async function rm(p) {
	try {await fs.rm(p, {recursive:true})}
	catch(e) {if(e.code!=='ENOENT') throw e}
}
async function minify(pin, pout, fn) {
	try {
		pin=path.join(pin,fn), pout=path.join(pout,fn);
		let ext=path.extname(fn), hOpts=htmlOpts,f;
		switch(ext) {
		case '.html': case '.svg': case '.css': case '.js':
			f=await fs.readFile(pin, {encoding:'utf8'});
			switch(ext) {
			case '.svg':
				hOpts=new Object(hOpts);
				hOpts.removeAttributeQuotes=false;
			case '.html':
				f=await mHtml(f, hOpts);
			break; case '.css':
				f=await mCSS.minify(f);
				if(f.errors.length) throw f.errors.join(',');
				f=f.styles;
			break; case '.js':
				f=(await mJS(f, jsOpts)).code;
				if(f.endsWith(';')) f=f.slice(0,-1);
			}
			await fs.writeFile(pout, f);
			log(chalk.cyan("- "+fn));
		break; default:
			await fs.copyFile(pin, pout);
			log(chalk.dim("- "+fn));
		}
	} catch(e) {
		log(chalk.red("- "+fn));
		throw e;
	}
}

async function recurse(func, pin=din, pout=dout) {
	let pl=[], d=await fs.readdir(pin, {withFileTypes:true});
	if(pout) {
		try {await fs.mkdir(pout)} catch(e) {if(e.code!=='EEXIST') throw e}
	}
	for(let f of d) {
		if(f.isFile()) pl.push(func(pin,pout,f.name));
		else if(f.isDirectory()) pl.push(recurse(func,
			path.join(pin,f.name), pout&&path.join(pout,f.name)));
	}
	await Promise.all(pl);
}

//--- Main Code ---

log(chalk.bgYellow("Clean"));
await rm(dout);
log(chalk.bgYellow("Minify HTML"));
await recurse(minify);
log(chalk.green("Done!"));