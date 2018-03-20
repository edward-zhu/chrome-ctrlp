var allTabs = {}
var currentTabs = {}

var selectedTab = -1;

var tpl = document.getElementById('tab-item-tmpl').innerHTML.trim();

function refreshTabs(tabs) {
    let tabData = tabs.map(
        t => ({
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

    if (selectedTab >= 0) {
        let selectedTabObj = currentTabs[selectedTab];
        let selectedTabDOM = document.getElementById("tab-" + selectedTabObj.index);
        selectedTabDOM.style.backgroundColor = "#efefef";

        let pos = selectedTabDOM.getBoundingClientRect();
        if (pos.bottom > window.innerHeight) {
            window.scrollBy(0, pos.bottom - window.innerHeight);
        } else if (pos.top < 0) {
            window.scroll(0, 0);
        }
    }

    currentTabs = tabs;
}

function onPatternChanged(pattern) {
    var re = new RegExp(pattern, 'i');
    filteredTabs = allTabs.filter(tab => (re.test(tab.title) || re.test(tab.url)));
    refreshTabs(filteredTabs);
}

function onTabQuery(tabs) {
    allTabs = tabs;
    currentTabs = allTabs;
    refreshTabs(allTabs);
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

function onCtrlWPressed() {
    if (!(selectedTab >= 0 && selectedTab < currentTabs.length)) {
        return;
    }
    let selectedTabId = currentTabs[selectedTab].id;

    chrome.tabs.remove(selectedTabId);

    requery();
}

function onCtrlShiftWPressed() {
    if (!(selectedTab >= 0 && selectedTab < currentTabs.length)) {
        return;
    }
    let selectedTabId = currentTabs[selectedTab].id;

    let otherTabs = allTabs.filter(t => t.id != selectedTabId);

    let otherTabIds = otherTabs.map(t => t.id);

    chrome.tabs.remove(otherTabIds);

    requery();
}

function onAltShiftWPressed() {
    let tabsIdToClose = currentTabs.map(t => t.id);
    chrome.tabs.remove(tabsIdToClose);

    requery();
}

function requery() {
    setTimeout(_requery, 200);
}

function _requery() {
    chrome.tabs.query({}, function(tabs) {
        onTabQuery(tabs);
    });
}

function main() {
    Mustache.parse(tpl);

    let patternInput = document.getElementById("pattern");

    patternInput.addEventListener('input', function(ev) {
        onPatternChanged(patternInput.value);
    });

    document.addEventListener('keydown', function(ev) {
        if (ev.keyCode == 38) {
            onUpKeyPressed();
        } else if (ev.keyCode == 40) {
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

    requery();
}

main();