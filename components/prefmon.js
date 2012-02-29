/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 * 
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 * 
 * The Original Code is Preferences Monitor Mozilla Extension.
 * 
 * The Initial Developer of the Original Code is
 * Copyright (C)2012 Diego Casorran <dcasorran@gmail.com>
 * All Rights Reserved.
 * 
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components,
	OS = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService),
	PS = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService),
	CS = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService),
	WM = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

Cu['import']("resource://gre/modules/XPCOMUtils.jsm");

function prefmon() {
	this.pan = {};
	this.prefs = {};
	OS.addObserver(this, "profile-after-change", false);
}

prefmon.prototype = {
	classDescription: 'Preferences Monitor',
	contractID:       '@mozilla.org/diegocr/prefmon;1',
	classID:          Components.ID('{517f9e52-c795-4764-bf77-5e2db596cee6}'),
	
	_xpcom_factory: {
		createInstance: function (outer, iid) {
			if (outer != null)
				throw Cr.NS_ERROR_NO_AGGREGATION;
			if (!prefmon.instance)
				prefmon.instance = new prefmon();
			return prefmon.instance.QueryInterface(iid);
		},
		QueryInterface: XPCOMUtils.generateQI([ Ci.nsISupports,Ci.nsIModule,Ci.nsIFactory ])
	},
	
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,Ci.nsISupports,Ci.nsISupportsWeakReference]),
	
	prefs: null,
	pan: null,
	
	getWeakReference: function () {
		return Cu.getWeakReference(this);
	},
	
	log: function(m) {
		// dump('Preferences Monitor :: '+ m + "\n");
		CS.logStringMessage('Preferences Monitor :: '+(new Date()).toString()+"\n> "+m);
	},
	
	p: function(n) {
		switch(PS.getPrefType(n)) {
			case Ci.nsIPrefBranch.PREF_STRING:
				return PS.getComplexValue(n, Ci.nsISupportsString).data;
			case Ci.nsIPrefBranch.PREF_INT:
				return PS.getIntPref(n);
			case Ci.nsIPrefBranch.PREF_BOOL:
				return PS.getBoolPref(n);
			default:break;
		}
		return null;
	},
	
	c: function(window,nn) {
		return function() {
			let wnd = WM.getMostRecentWindow('global:console');
			
			if( wnd ) {
				wnd.focus();
			} else {
				wnd = window.openDialog("chrome://global/content/console.xul",nn,'centerscreen,resizable');
				wnd.addEventListener("load", function() {
					let w = this;
					w.removeEventListener("load", arguments.callee, false);
					w.setTimeout(function(){
						if(w.gFilter) {
							w.gFilter.value = nn;
							w.filterConsole();
							w.gConsole.scrollToIndex(w.gConsole.itemCount-1);
						} else {
							w.gConsole.mode = "Errors";
						}
						w.document.title = nn;
						w = null;
					},20);
					
				}, false );
			}
			wnd = window = null;
		};
	},
	
	e: function(dL,ext) {
		return ext && (dL.indexOf(ext.toLowerCase() + '.') != -1
			|| dL.indexOf(ext.replace(/^([a-z]+)[A-Z_][a-z]+$/,'$1').toLowerCase() + '.') != -1);
	},
	
	observe: function(s, t, d) {
		switch(t) {
			case 'profile-after-change':
				OS.addObserver(this, "quit-application-granted", false);
				
				PS.QueryInterface(Ci.nsIPrefBranch2);
				PS.addObserver("", this, false);
				
				for each(let o in PS.getChildList("", {value: 0})) {
					this.prefs[o] = this.p(o);//.toString();
				}
				
				OS.removeObserver(this, "profile-after-change");
				break;
			case 'quit-application-granted':
				PS.removeObserver("", this);
				OS.removeObserver(this, "quit-application-granted");
				break;
			
			case 'nsPref:changed': {
				let b = WM;
				if(!b || !(b=b.getMostRecentWindow("navigator:browser")) || !(b=b.gBrowser)) {
					this.log('WARNING: Unable to obtain navigator:browser (NotificationBox Unavailable)');
				}
				
				let c = Components.stack.caller, sN,lN,p,ext,sNo = null, self = this, updV = function(k,v) {
					self.prefs[k] = v;
				}, nV = this.p(d),oV = (d in this.prefs ? this.prefs[d] : null);
				
				if(c == null) {
					this.log('ERROR: Stack unavailable, changed preference: `'+d+'´ FROM `'+oV+'´ TO `'+nV+'´');
					updV(d,nV);
					break;
				}
				
				do {
					sN = c.filename;
					lN = c.lineNumber;
				} while(sN === null && (c = c.caller));
				
				if(sN == null) {
					this.log('ERROR: Unable to obtain caller, changed preference: `'+d+'´ FROM `'+oV+'´ TO `'+nV+'´');
					updV(d,nV);
					break;
				}
				
				if((p = sN.lastIndexOf(' -> ')) != -1) {
					sNo = sN;
					sN = sN.substr(p+4);
				}
				
				p = sN.indexOf('://') + 1;
				while(sN.charAt(p) == '/')++p;
				ext = sN.substr(p,sN.indexOf('/',p)-p);
				
				if(['global','mozapps','browser','components','modules','gre'].indexOf(ext) != -1) {
					this.log('Permitted change by `'+ext+'´ for "'+d+'"');
					updV(d,nV);
					break;
				}
				
				if(/^(jar|file)\:/i.test(sN)) {
					
					ext = sN.replace(/^.*\//,'').replace(/\.\w+$/,'');
				}
				
				if(['bootstrap','prefs'].indexOf(ext) != -1) try {
					ext = sN.match(/extensions\/([^\/]+)\//)[1].replace(/(@.+)?\.xpi!/,'');
				} catch(e){} else {
					try {var ext2 = sN.match(/extensions\/([^\/@]+)@[^\/]+\//)[1];}catch(e){}
					try {var ext3 = sN.match(/extensions\/[^\/@]+@([^\/]+)\//)[1];}catch(e){}
					if(ext3)ext3 = ext3.replace(/\.\w+$/,'');
				}
				
				let dL = d.toLowerCase();
				if(this.e(dL,ext)||this.e(dL,ext2)||this.e(dL,ext3)) {
					this.log('Permitted self-made change by `'+ext+'´ for "'+d+'"');
					updV(d,nV);
					break;
				}
				
				if(oV === nV) {
					this.log('VOID change by `'+ext+'´ for "'+d+'" -> ('+nV+')');
					break;
				}
				updV(d,nV);
				
				let _ = function(v) {
					if(v === 0)
						return "0";
					if(v === false)
						return 'false';
					if(v === null)
						return v;
					return typeof v != 'string' || v.length ? v.toString().substr(0,0x80) : null;
				},nn = this.classDescription,Msg = '`' + ext + '´ changed the value of "' + d + '"',
					MsgExt = nn + ' :: ' + (new Date()).toString() + "\n\n" + Msg + "\n\noldValue: " +  (_(oV)||'`No old Value found´')
						+ "\nnewValue: " + (_(nV)||'`Empty (Value Cleared?)´')
						+ (sNo ? "\n\n"+sNo.replace(sN.replace(/!\/.+$/,'!'),'','g'):""),
				
				sE = Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError);
				sE.init(MsgExt,sN,String(lN),lN,null,Ci.nsIScriptError.errorFlag,'chrome javascript');
				CS.logMessage(sE);
				
				if(!b)break;
				
				if(!(d in this.pan)) {
					this.pan[d] = 0;
				}
				if(++this.pan[d] > 3)
					break;
				
				let n = b.getNotificationBox(), bn = "More Info", pn;
				if((pn = n.getNotificationWithValue(nn))) {
					n.removeNotification(pn);
					bn += '*';
				}
				n.appendNotification(nn+': '+Msg,nn,"chrome://global/skin/icons/warning-16.png",n.PRIORITY_WARNING_MEDIUM, [
					{label:bn,accessKey:"I",callback:this.c(b.browsers[0].contentWindow,nn)}
				]);
				
			}	break;
			
			default:break;
		}
	}
};

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if(XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([prefmon]);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule([prefmon]);
