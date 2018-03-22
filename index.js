var allTabs = {}
var currentTabs = {}
var selectedTab = -1;

/** @type {HTMLInputElement} */
var patternInput = null;

var sortedBy = 'id';

var tpl = document.getElementById('tab-item-tmpl').innerHTML.trim();
var tabSegment = document.getElementById('tab-segment');
var inputLabel = document.getElementById('input-label');
var inputGroup = inputLabel.parentElement;

var currentPattern = "";

/**
 * refersh tabs result
 * 
 * @param {Array} tabs result tabs to show
 */
function refreshTabs(tabs) {
    tabs.sort((a, b) => (a[sortedBy] - b[sortedBy]));

    let tabData = tabs.map(
        t => ({
            id : t.id,
            index : t.index,
            title : t.title,
            url : t.url,
            favIconUrl : t.favIconUrl
        })
    );

    let tabsHtml = Mustache.render(tpl, {
        tabs: tabData
    });
    let tabList = document.getElementById("tab-list");
    tabList.innerHTML = tabsHtml;

    currentTabs = tabs;

    if (selectedTab >= 0 && selectedTab < currentTabs.length) {
        let selectedTabObj = currentTabs[selectedTab];
        let selectedTabDOM = document.getElementById("tab-" + selectedTabObj.id);

        if (selectedTabDOM == undefined) {
            return;
        }

        selectedTabDOM.style.backgroundColor = "#efefef";

        let pos = selectedTabDOM.getBoundingClientRect();
        if (pos.bottom > window.innerHeight) {
            window.scrollBy(0, pos.bottom - window.innerHeight);
        } else if (pos.top < 10) {
            window.scroll(0, 0);
        }
    }
}

var lastTabsPattern = new RegExp(/old:[ ]*(\d*)/, 'i');

/**
 * 
 * @param {String} pattern 
 */
function onPatternChanged(pattern) {
    currentPattern = pattern;

    let filteredTabs = {}

    let lastTabsPatternMatches = lastTabsPattern.exec(pattern);
    if (lastTabsPatternMatches != null) {
        let num = parseInt(lastTabsPatternMatches[1]);
        tabs = Array.from(allTabs);
        tabs.sort((a, b) => (a.id - b.id));
        filteredTabs = tabs.slice(0, Math.min(allTabs.length, num || 0));

        patternInput.value = lastTabsPatternMatches[1] || "";
        showInputLabel("oldest");
    } else {
        var re = new RegExp(pattern, 'i');
        filteredTabs = allTabs.filter(tab => (re.test(tab.title) || re.test(tab.url)));
        hideInputLabel();
    }

    refreshTabs(filteredTabs);
}

function onTabQuery(tabs) {
    allTabs = tabs;
    currentTabs = allTabs;

    if (currentPattern != "") {
        onPatternChanged(currentPattern);
    } else {
        refreshTabs(allTabs);
    }
}

function onUpKeyPressed() {
    if (selectedTab < 0) {
        selectedTab = currentTabs.length - 1;
    } else {
        selectedTab = (selectedTab - 1 + currentTabs.length) % currentTabs.length;
    }

    refreshTabs(currentTabs);
}

function onDownKeyPressed() {
    if (selectedTab < 0) {
        selectedTab = 0;
    } else {
        selectedTab = (selectedTab + 1) % currentTabs.length;
    }

    refreshTabs(currentTabs);
}

function onEnterPressed() {
    if (!(selectedTab >= 0 && selectedTab < currentTabs.length)) {
        return;
    }

    let selectedTabId = currentTabs[selectedTab].id;

    chrome.tabs.query({}, function(tabs) {
        chrome.tabs.update(selectedTabId, {"highlighted" : true});

        for (let tab of tabs) {
            if (tab.id != selectedTabId) {
                chrome.tabs.update(tab.id, {"highlighted" : false, "pinned" : false});
            }
        }

        window.close();
    });
}

/**
 * remove the tab with given id
 * @param {Number} id 
 */
function removeTab(id) {
    chrome.tabs.remove(id);

    requeryAllTabs();
}

/**
 * remove all other tabs except given id one
 * @param {Number} id 
 */
function removeAllOtherTabs(id) {
    let otherTabs = allTabs.filter(t => t.id != id);
    let otherTabIds = otherTabs.map(t => t.id);
    chrome.tabs.remove(otherTabIds);

    requeryAllTabs();
}

function removeAllTabsInResult() {
    let tabsIdToClose = currentTabs.map(t => t.id);
    chrome.tabs.remove(tabsIdToClose);

    requeryAllTabs();
}

function requeryAllTabs() {
    setTimeout(_requeryAllTabs, 200);
}

function _requeryAllTabs() {
    chrome.tabs.query({}, function(tabs) {
        onTabQuery(tabs);
    });
}

function onAltShiftWPressed() {
    removeAllTabsInResult();
    patternInput.value = "";
}

function onCtrlShiftWPressed() {
    if (!(selectedTab >= 0 && selectedTab < currentTabs.length)) {
        return;
    }
    let selectedTabId = currentTabs[selectedTab].id;
    removeAllOtherTabs(selectedTabId);
}

function onCtrlWPressed() {
    if (!(selectedTab >= 0 && selectedTab < currentTabs.length)) {
        return;
    }
    let selectedTabId = currentTabs[selectedTab].id;
    removeTab(selectedTabId);
}

function onToggleSortMode() {
    if (sortedBy == 'id') {
        sortedBy = 'index';
    } else {
        sortedBy = 'id';
    }
    refreshTabs(currentTabs);
}

function hideInputLabel() {
    if (inputLabel.parentElement == null) {
        return;
    }
    inputGroup.removeChild(inputLabel);
}
/**
 * 
 * @param {String} label 
 */
function showInputLabel(label) {
    if (inputGroup.contains(inputLabel)) {
        return;
    }
    inputLabel.innerHTML = label;
    inputGroup.insertBefore(inputLabel, inputGroup.firstChild);
}

function inputLabelIsOn() {
    if (inputGroup.contains(inputLabel)) {
        return true;
    }
    return false;
}

function onBackspacePressed() {
    if (patternInput.value == '') {
        onPatternChanged('');
    }
}

function main() {
    Mustache.parse(tpl);

    hideInputLabel();

    patternInput = document.getElementById("pattern");

    patternInput.addEventListener('input', function(ev) {
        // TODO: How to avoid this?
        if (patternInput.value == '„') {
            patternInput.value = "";
        }

        let pattern = patternInput.value;
        if (inputLabelIsOn()) {
            pattern = "old:" + pattern;
        }
        onPatternChanged(pattern);
    });

    document.addEventListener('keydown', function(ev) {
        if (ev.keyCode == 38  || (ev.keyCode == 75 && ev.ctrlKey)) {
            onUpKeyPressed();
        } else if (ev.keyCode == 8 || ev.keyCode == 46) {
            console.log(ev);
            onBackspacePressed();
        } else if ((ev.keyCode == 39 || ev.keyCode == 37) && ev.shiftKey) {
            // onToggleSortMode();
        } else if (ev.keyCode == 40 || (ev.keyCode == 74 && ev.ctrlKey)) {
            onDownKeyPressed();
        } else if (ev.keyCode == 13) {
            onEnterPressed();
        } else if (ev.keyCode == 87 && ev.ctrlKey && !ev.shiftKey) {
            onCtrlWPressed();
        } else if (ev.keyCode == 87 && ev.ctrlKey && ev.shiftKey) {
            onCtrlShiftWPressed();
        } else if (ev.keyCode == 87 && ev.altKey && ev.shiftKey) {
            onAltShiftWPressed();
        }
    });

    requeryAllTabs();
}

main();