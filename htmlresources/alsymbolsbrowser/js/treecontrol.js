class TreeControl {

    constructor(controlId, idsBtnId, collapsed) {
        //initialize variables
        this._controlId = controlId;
        this._controlSelector = '#' + this._controlId;
        this._collapsed = collapsed;
        this._selNode = undefined;
        this._selSymbol = undefined;
        this._idsBtnId = idsBtnId;
        this._showIds = true;
        this.emptyContent = '';
        this.onNodeSelected = undefined;
        this.onShowIdsChanged = undefined;

        this._multiselect = false;
        this._idFilterText = undefined;
        this._idFilter = undefined;
        this._nameFilterText = undefined;
        this._nameFilter = undefined;
        this._visibleSymbolList = undefined;

        //initialize event listeners
        let element = document.getElementById(controlId);
        let that = this;
        element.addEventListener('click', function(e) { that.onClick(e); }, true);
        element.addEventListener('keydown', function(e) { that.onKeyPress(e); });

        let idsBtn = document.getElementById(this._idsBtnId);
        idsBtn.addEventListener('click', function(e) { that.onIdsBtnClick(e); });
    }

    setShowIds(newShowIds) {        
        this._showIds = newShowIds;
        if (this._showIds)
            $('#' + this._idsBtnId).html("Hide Ids");
        else
            $('#' + this._idsBtnId).html("Show Ids");
        this.setData(this._data);
        if (this.onShowIdsChanged)
            this.onShowIdsChanged(this._showIds);
    }

    setData(data) {
        this._selNode = undefined;
        this._selSymbol = undefined;
        this._data = data;        
        if (this._data) {
            this._data.showIds = this._showIds;
            this.sortData(this._data);
            this.resetFilter(this._data);
            this._data.parent = undefined;
            this.prepareData(this._data);
        }
        this.renderData();
    }

    prepareData(data) {
        data.collapsed = this._collapsed;
        data.selected = false;
        if (data.childSymbols) {
            for (let i=0; i<data.childSymbols.length; i++) {
                data.childSymbols[i].parent = data;
                this.prepareData(data.childSymbols[i]);
            }
        }
    }

    //#region Rendering

    renderData() {
        let element = document.getElementById(this._controlId);
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        this._visibleSymbolList = [];
        if (this._data)
            this.appendDataHtml(element, this._data);
        else
            element.innerText = this.emptyContent;
    }

    appendDataHtml(parent, data) {
        if (data) {
            if (data.visible) {            
                let main = document.createElement('div');
                main.className = "treeitem";
                main.dataset.idx = data.idx;

                let shead = document.createElement('div');
                shead.className = "shead";
                shead.dataset.uid = data.uid;
                shead.dataset.kind = data.kind;
                shead.alsymbolnode = data;
                data.htmlNode = shead;
                data.visualidx = this._visibleSymbolList.length;
                this._visibleSymbolList.push(data);

                let icon = document.createElement('div');
                icon.className = "ico ico-" + data.icon;
                shead.appendChild(icon);

                let cap = document.createElement('div');
                cap.className = "cap";
                if ((this._showIds) && (data.id))
                    cap.innerText  = data.id + ' ' + data.fullName;
                else
                    cap.innerText = data.fullName;
                shead.appendChild(cap);

                main.appendChild(shead);
                
                let treeList = document.createElement('div');
                treeList.className = "treelist";
                if (data.collapsed)
                    treeList.style = 'display:none';

                if (data.childSymbols) {
                    for (let i=0; i<data.childSymbols.length; i++) {
                        this.appendDataHtml(treeList, data.childSymbols[i]);
                    }
                }
                main.appendChild(treeList);
                
                parent.appendChild(main);
            } else {
                this.detachHtmlElement(data);
            }
        }
    }

    detachHtmlElement(data) {
        data.htmlNode = undefined;
        if (data.childSymbols) {
            for (let i=0; i<data.childSymbols.length; i++) {
                this.detachHtmlElement(data.childSymbols[i]);
            }                
        }
    }    

    //#endregion

    isObjectSymbol(symbol) {
        return ((symbol.kind == ALSymbolKind.TableObject) ||
            (symbol.kind == ALSymbolKind.CodeunitObject) ||
            (symbol.kind == ALSymbolKind.PageObject) ||
            (symbol.kind == ALSymbolKind.ReportObject) ||
            (symbol.kind == ALSymbolKind.QueryObject) ||
            (symbol.kind == ALSymbolKind.XmlPortObject) ||
            (symbol.kind == ALSymbolKind.TableExtensionObject) ||
            (symbol.kind == ALSymbolKind.PageExtensionObject) ||
            (symbol.kind == ALSymbolKind.ControlAddInObject) ||
            (symbol.kind == ALSymbolKind.ProfileObject) ||
            (symbol.kind == ALSymbolKind.PageCustomizationObject) ||
            (symbol.kind == ALSymbolKind.EnumType) ||
            (symbol.kind == ALSymbolKind.EnumExtensionType) ||
            (symbol.kind == ALSymbolKind.DotNetPackage));
    }

    //#region Node scrolling

    scrollToNode(node) {
        let mainElement = document.getElementById(this._controlId);
        let mainTop = mainElement.offsetTop;
        let viewTop = mainElement.scrollTop;
        let viewBottom = viewTop + mainElement.clientHeight;
        let nodeTop = node.offsetTop - mainTop;
        let nodeBottom = nodeTop + node.offsetHeight;

        if (nodeTop < viewTop)
            node.scrollIntoView(true);
        else if (nodeBottom > viewBottom)
            node.scrollIntoView(false);
    }

    //#endregion

    //#region Sorting

    sortData(data) {       
        if (data && data.childSymbols) {
            //only table objects can have sortable child elements
            if ((this.isObjectSymbol(data)) && (data.kind != ALSymbolKind.Table))
                return;
            
            //check if node child items are sortable - only objects and table fields can be sorted by name or id
            if ((data.childSymbols.length > 1) && ((this.isObjectSymbol(data.childSymbols[0])) || (data.childSymbols[0].kind == ALSymbolKind.Field))) {
                //sort child symbols            
                if (this._showIds)
                    data.childSymbols.sort(function(a,b) {
                        if (a.id < b.id)
                            return -1;
                        if (a.id > b.id)
                            return 1;
                        if (a.fullName < b.fullName)
                            return -1;
                        if (a.fullName > b.fullName)
                            return 1;
                        return 0;                    
                    });
                else
                    data.childSymbols.sort(function(a,b) {
                        if (a.fullName < b.fullName)
                            return -1;
                        if (a.fullName > b.fullName)
                            return 1;
                        return 0;
                    });                  
            }

            //sort each child symbol child nodes
            for (var i=0; i<data.childSymbols.length; i++)
                this.sortData(data.childSymbols[i]);
        }

    }

    //#endregion

    //#region Filtering

    filterData(idFilter, nameFilter) {
        let hasFiler = false;
        //compile id filter
        if (this._idFilterText != idFilter) {
            this._idFilterText = idFilter;
            this._idFilter = undefined;
            if (this._idFilterText) {
                try {
                    this._idFilter = compileFilter('int', this._idFilterText);
                }
                catch (e) {
                    //vscodeContext.postMessage({
                    //    command    : 'errorInFilter',
                    //    message : filterNameExpr});                    
                    //filterName = undefined;
                    //filterNameExpr = undefined;
                }    
            }
        }
        //compile name filter
        if (this._nameFilterText != nameFilter) {
            this._nameFilterText = nameFilter;
            this._nameFilter = undefined;
            if (this._nameFilterText) {
                try {
                    this._nameFilter = compileFilter('text', this._nameFilterText);
                }
                catch (e) {
                    //vscodeContext.postMessage({
                    //    command    : 'errorInFilter',
                    //    message : filterNameExpr});                    
                    //filterName = undefined;
                    //filterNameExpr = undefined;
                }    
            }
        }
        //apply filters
        this.resetFilter(this._data);
        if (this._idFilter)
            this.applyIdFilter(this._data);
        if (this._nameFilter)
            this.applyNameFilter(this._data);
        this.renderData();
    }

    resetFilter(data) {
        if (data) {
            data.visible = true;
            if (data.childSymbols) {
                for (let i=0; i<data.childSymbols.length;i++)
                    this.resetFilter(data.childSymbols[i]);
            }
        }
    }

    applyIdFilter(data) {
        if (data) {
            if ((this.isObjectSymbol(data)) && (data.id)) {
                if (!this._idFilter({INT: data.id}))
                    data.visible = false;
            }
            if (data.childSymbols) {
                for (let i=0; i<data.childSymbols.length;i++)
                    this.applyIdFilter(data.childSymbols[i]);
            }
        }
    }

    applyNameFilter(data) {
        if (data) {
            if (this.isObjectSymbol(data)) {
                if (!this._nameFilter({TEXT: data.fullName}))
                    data.visible = false;
            }
            if (data.childSymbols) {
                for (let i=0; i<data.childSymbols.length;i++)
                    this.applyNameFilter(data.childSymbols[i]);
            }
        }
    }

    //#endregion

    //#region Expand/Collapse

    toggleNode(node) {
        let element = $(node)[0];
        let symbol = element.alsymbolnode;
        if (symbol) {
            symbol.collapsed = !symbol.collapsed;
            if (symbol.collapsed)
                $(node).next('.treelist').hide();
            else
                $(node).next('.treelist').show();
        } else
            $(node).next('.treelist').toggle();
    }

    //#endregion

    //#region Selection

    getVisualIdx(node) {
        let symbol = this.getNodeSymbol(node);
        if (symbol)
            return symbol.visualidx;
        return -1;
    }

    getNodeSymbol(node) {
        if (node)
            return $(node)[0].alsymbolnode;
        return undefined;
    }

    setSelectionState(symbol, selected) {
        if (symbol.selected != selected) {        
            symbol.selected = selected;
            let hasClass = $(symbol.htmlNode).hasClass('selected');        
            if ((selected) && (!hasClass))
                $(symbol.htmlNode).addClass('selected');
            else if ((!selected) && (hasClass))
                $(symbol.htmlNode).removeClass('selected');
        }
    }

    clearSelection(skipMain) {
        let skipIdx = -1;
        if ((skipMain) && (this._selNode))
            skipIdx = this._selNode.visualidx;
        for (let i=0; i<this._visibleSymbolList.length; i++) {
            if (i != skipIdx)
                this.setSelectionState(this._visibleSymbolList[i], false);    
        }
    }

    selectAll() {
        for (let i=0; i<this._visibleSymbolList.length; i++) {
            this.setSelectionState(this._visibleSymbolList[i], true);
        }
    }

    selectRange(fromIdx, toIdx, addToSelection) {
        let maxIdx = this._visibleSymbolList.length - 1;
        if (fromIdx > toIdx) {
            let tmpIdx = fromIdx;
            fromIdx = toIdx;
            toIdx = tmpIdx;
        }
        fromIdx = Math.max(0, Math.min(fromIdx, maxIdx));
        toIdx = Math.max(0, Math.min(toIdx, maxIdx));

        if (addToSelection) {
            for (let i=fromIdx; i<=toIdx; i++) {
                this.setSelectionState(this._visibleSymbolList[i], true);
            }
        } else {
            for (let i=0; i<=_visibleSymbolList.length; i++) {
                this.setSelectionState(this._visibleSymbolList[i], ((i>=fromIdx) && (i<=toIdx)));
            }
        }
    }

    selectNode(node, ctrlKey, shiftKey) {
        let toggleMode = ((ctrlKey) && (!shiftKey));
        let rangeMode = ((!ctrlKey) && (shiftKey));

        let symbol = this.getNodeSymbol(node);
        
        if ((this._selSymbol) && (symbol) && (this._selSymbol.visualidx == symbol.visualidx))
            return;

        if (rangeMode) {
            let fromIdx = 0;
            if (this._selSymbol)
                fromIdx = this._selSymbol.visualidx;
            this.selectRange(fromIdx, this._selSymbol.visualidx);
        } else {
            //if (!toggleMode)
            //    if (this._selSymbol)
            //        this.setSelectionState(this._selSymbol, false);

            this._selSymbol = symbol;
            this._selNode = node;   

            if (!toggleMode)
                this.clearSelection(true);

            if (this._selSymbol)
                this.setSelectionState(this._selSymbol, true);
        }

        if (node)
            this.scrollToNode(node);

        /*
        if (!($(node).hasClass('selected'))) {
            if (this._selNode != null)
                $(this._selNode).removeClass('selected');
            this._selNode = node;
            if (this._selNode != null)
                $(this._selNode).addClass('selected');
        }
        */

        if (this.onNodeSelected)
            this.onNodeSelected(this._selNode);
    }

    selectSingleNode(node) {
        let element = $(node)[0];
        let symbol = element.alsymbolnode;

        //remove previous selection
        if (this._selSymbol) {
            if (this._selSymbol.visualidx == symbol.visualidx)
                return;
            $(this._selSymbol.htmlNode).removeClass('selected');
        }

        //update current symbol
        this._selSymbol = symbol;
        this._selNode = node;

        //select new symbol
        $(this._selNode).addClass('selected');
    }

    toggleNodeSelection(node) {
    }

    selectNodeRange(node) {
    }

    //#endregion

    //#region Path function

    getNodePath(node) {
        return this.getSymbolPath(this.getNodeSymbol(node));
    }

    getSymbolPath(symbol) {
        let path = [];
        while (symbol) {
            path.push(symbol.idx);
            symbol = symbol.parent;
        }
        return path;
    }

    getSelectedPaths(inclNode) {
        let list = [];
        for (let i=0; i<this._visibleSymbolList.length; i++) {
            if (this._visibleSymbolList[i].selected)
                list.push(this.getSymbolPath(this._visibleSymbolList[i]));
        }
        if (inclNode) {
            let inclSymbol = this.getNodeSymbol(inclNode);
            if ((inclSymbol) && (!inclSymbol.selected))
                list.push(this.getSymbolPath(inclSymbol));
        }
        return list;
    }

    //#endregion

    //#region Node browsing functions

    parentNode(node) {
        if (node) {
            let nodeList = $(node).parent('.treeitem').parents('.treeitem:first').children('.shead');
            if (nodeList.length > 0)
                return nodeList[0];
            return node;
        }
        return this.firstNode();
    }

    prevNode(node) {
        if (node) {
            //prev sibling
            let nodeList = $(node).parent('.treeitem').prev('.treeitem').find('.shead:visible:last');
            if (nodeList.length > 0)
                return nodeList[0];
            else {
                //parent node
                nodeList = $(node).parent('.treeitem').parents('.treeitem:first').children('.shead');
                if (nodeList.length > 0)
                    return nodeList[0];
            }
            return node;
        }
        return this.firstNode();
    }

    nextNode(node) {
        if (node) {
            //first visible child node
            let nodeList = $(node).next('.treelist:visible').children('.treeitem:first').children('.shead');
            if (nodeList.length > 0)
                return nodeList[0];            
            
            //next sibling
            nodeList = $(node).parent('.treeitem').next('.treeitem').children('.shead');
            if (nodeList.length > 0)
                return nodeList[0];

            //next parent
            nodeList = $(node).parent('.treeitem').parents('.treeitem:first');
            let siblingNodeList = nodeList.next('.treeitem');

            while ((nodeList.length > 0) && (siblingNodeList.length == 0)) {
                nodeList = nodeList.parents('.treeitem:first');
                siblingNodeList = nodeList.next('.treeitem');
            }

            if (siblingNodeList.length > 0) {
                nodeList = siblingNodeList.children('.shead');
                if (nodeList.length > 0)
                    return nodeList[0];
            }

            return node;
        }
        return this.firstNode();
    }

    firstNode() {
        let nodeList = $(this._controlSelector).find('.shead:first');
        if (nodeList.length > 0)
            return nodeList[0];
        return undefined;
    }

    lastNode() {
        let nodeList = $(this._controlSelector).find('.shead:visible:last');
        if (nodeList.length > 0)
            return nodeList[0];
        return undefined;
    }

    nextPageNode(node) {
        return this.nextNode(node);
    }

    prevPageNode(node) {
        return this.prevNode(node);
    }

    //#endregion

    //#region Event handlers

    onIdsBtnClick(e) {
        this.setShowIds(!this._showIds);
    }

    onNodeClick(node, ctrlKey, shiftKey) {
        if ((!ctrlKey) && (!shiftKey))
            this.toggleNode(node);
        this.selectNode(node, ctrlKey, shiftKey);
    }

    onClick(e) {
        let node = e.target;
        let nodeList = $(node).closest('.shead');
        if (nodeList.length > 0)
            this.onNodeClick(nodeList[0], e.ctrlKey, e.shiftKey);
    }

    onKeyPress(e) {
        let handled = false;
        let nodeList;

        switch (e.which) {
            case 37:    //left
                //has visible child
                if (this._selNode) {
                    nodeList = $(this._selNode).next('.treelist:visible');
                    if (nodeList.length > 0)
                        nodeList.hide();
                    else 
                        this.selectNode(this.parentNode(this._selNode), e.ctrlKey, e.shiftKey);
                } else
                    this.selectNode(this.firstNode(), e.ctrlKey, e.shiftKey);
                handled = true;
                break;
            case 39:    //right
                if (this._selNode) {
                    nodeList = $(this._selNode).next('.treelist:hidden');
                    if (nodeList.length > 0)
                        nodeList.show();
                }
                handled = true;
                break;
            case 38:    //up
                this.selectNode(this.prevNode(this._selNode), e.ctrlKey, e.shiftKey);
                handled = true;
                break;
            case 40:    //down
                this.selectNode(this.nextNode(this._selNode), e.ctrlKey, e.shiftKey);
                handled = true;
                break;
            case 33:    //page up
                this.selectNode(this.prevPageNode(this._selNode), e.ctrlKey, e.shiftKey);
                handled = true;
                break;
            case 34:    //page down
                this.selectNode(this.nextPageNode(this._selNode), e.ctrlKey, e.shiftKey);
                handled = true;
                break;
            case 36:    //home
                this.selectNode(this.firstNode(), e.ctrlKey, e.shiftKey);
                handled = true;
                break;
            case 35:    //end
                this.selectNode(this.lastNode(), e.ctrlKey, e.shiftKey);
                handled = true;
                break;
        }

        if (handled) {
            e.preventDefault();
            return false;
        }

    }

    //#endregion

}