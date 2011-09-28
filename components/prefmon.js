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
 * Copyright (C)2011 Diego Casorran <dcasorran@gmail.com>
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

const {
	classes : Cc,
	interfaces : Ci,
	utils : Cu,
	results : Cr
}
	 = Components, OS = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService), PS = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService), CS = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
Cu['import']("resource://gre/modules/XPCOMUtils.jsm");
function prefmon_log(m) {
	dump('Preferences Monitor :: ' + m + "\n");
	CS.logStringMessage('Preferences Monitor :: ' + (new Date()).toString() + "\n> " + m);
}
function prefmon() {
	this.log = prefmon_log;
	this.prefs = {};
	this.pan = {};
	OS.addObserver(this, "profile-after-change", false);
}
prefmon.prototype = {
	classDescription : 'Preferences Monitor',
	contractID : '@mozilla.org/diegocr/prefmon;1',
	classID : Components.ID('{517f9e52-c795-4764-bf77-5e2db596cee6}'),
	_xpcom_factory : {
		createInstance : function (outer, iid) {
			if (outer != null)
				throw Cr.NS_ERROR_NO_AGGREGATION;
			if (!prefmon.instance)
				prefmon.instance = new prefmon();
			return prefmon.instance.QueryInterface(iid);
		},
		QueryInterface : XPCOMUtils.generateQI([Ci.nsISupports, Ci.nsIModule, Ci.nsIFactory])
	},
	QueryInterface : XPCOMUtils.generateQI([Ci.nsIObserver, Ci.nsISupports, Ci.nsISupportsWeakReference]),
	wrappedJSObject : null,
	log : null,
	prefs : null,
	pan : null,
	getWeakReference : function () {
		return Cu.getWeakReference(this);
	},
	p : function (n) {
		switch (PS.getPrefType(n)) {
		case Ci.nsIPrefBranch.PREF_STRING:
			return PS.getComplexValue(n, Ci.nsISupportsString).data;
		case Ci.nsIPrefBranch.PREF_INT:
			return PS.getIntPref(n);
		case Ci.nsIPrefBranch.PREF_BOOL:
			return PS.getBoolPref(n);
		default:
			break;
		}
		return null;
	},
	e : function (s) {
		return (!s || s === null || s.length < 1 || /^\s+$/.test(s));
	},
	z : function (stack, level) {
		if (!stack) {
			try {
				c.a.t.c.h.me();
			} catch (ex) {
				if (!("stack" in ex))
					return null;
				stack = ex.stack;
			}
			level = level || 2;
		}
		let Y = level || 1,
		cO,
		lV,
		lO = stack.split("\n"),
		origin;
		while (Y < lO.length) {
			cO = lO[Y].split('@');
			if (cO.length != 2)
				break;
			if (!this.e(cO[0])) { {
					origin = cO;
					break;
				}
			}
			Y++;
		}
		if (!origin && !(origin = lV))
			return null;
		let p = origin[1].lastIndexOf(':');
		return {
			sN : origin[1].substr(0, p),
			sL : origin[1].substr(p + 1),
			sC : origin[0],
			get lN() {
				return parseInt(this.sL);
			},
			get ref() {
				return this.sN + ':' + this.sL;
			},
			get ext() {
				let p = this.sN.indexOf('://') + 1;
				while (this.sN.charAt(p) == '/')
					++p;
				return this.sN.substr(p, this.sN.indexOf('/', p) - p);
			}
		};
	},
	observe : function (s, t, d) {
		switch (t) {
		case 'profile-after-change':
			OS.addObserver(this, "quit-application-granted", false);
			PS.QueryInterface(Ci.nsIPrefBranch2);
			PS.addObserver("", this, false);
			for each(let o in PS.getChildList("", {
					value : 0
				})) {
				this.prefs[o] = this.p(o).toString();
			}
			OS.removeObserver(this, "profile-after-change");
			break;
		case 'quit-application-granted':
			PS.removeObserver("", this);
			OS.removeObserver(this, "quit-application-granted");
			break;
		case 'nsPref:changed': {
				let b = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
				if (!b || !(b = b.getMostRecentWindow("navigator:browser")) || !(b = b.gBrowser))
					break;
				let c = this.z() || {
					sN : '',
					sL : 0,
					sC : '',
					lN : 0,
					ref : '',
					ext : ''
				},
				ext = c.ext;
				if (['global', 'mozapps', 'browser', 'components', 'modules'].indexOf(ext) != -1) {
					this.log('Permitted change by `' + ext + '´ for "' + d + '"');
					break;
				}
				if (c.sN.substr(0, 4) == 'jar:') {
					ext = c.sN.replace(/^.*\//, '').replace(/\.\w+$/, '');
				}
				if (d.indexOf(ext.replace(/^(\w+)[A-Z_]\w+$/, '$1') + '.') != -1) {
					this.log('Permitted self-made change by `' + ext + '´ for "' + d + '"');
					break;
				}
				let oV = (d in this.prefs ? this.prefs[d] : ''),
				nV = this.p(d),
				self = this,
				notify = function (ext) {
					if (oV == nV) {
						self.log('VOID change by `' + ext + '´ for "' + d + '"');
						return;
					}
					self.prefs[d] = nV;
					oV = oV.toString().substr(0, 64);
					nV = nV.toString().substr(0, 64);
					let nn = self.classDescription,
					Msg = '`' + ext + '´ changed the value of "' + d + '"',
					MsgExt = nn + ' :: ' + (new Date()).toString() + "\n\n" + Msg + "\n\noldValue: " + (oV || '`No old Value found´') + "\nnewValue: " + (nV || '`Empty Value´');
					let sE = Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError);
					sE.init(MsgExt, c.sN, c.sL, c.lN, null, Ci.nsIScriptError.errorFlag, 'chrome javascript');
					CS.logMessage(sE);
					if (!(d in self.pan)) {
						self.pan[d] = 0;
					}
					if (++self.pan[d] > 3)
						return;
					let n = b.getNotificationBox(),
					bn = "More Info",
					pn;
					if ((pn = n.getNotificationWithValue(nn))) {
						n.removeNotification(pn);
						bn += '*';
					}
					n.appendNotification(nn + ': ' + Msg, nn, "chrome://global/skin/icons/warning-16.png", n.PRIORITY_WARNING_MEDIUM, [{
								label : bn,
								accessKey : "I",
								callback : function ()b.browsers[0].contentWindow.openDialog("chrome://global/content/console.xul", nn, 'centerscreen,resizable')
						}
					]);
			};
			notify(ext);
		}
		break;
	default:
		break;
	}
}
};
if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([prefmon]);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule([prefmon]);
