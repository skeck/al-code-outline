import * as vscode from 'vscode';
import * as path from 'path';
import { BaseWebViewEditor } from "../webviews/baseWebViewEditor";
import { DevToolsExtensionContext } from "../devToolsExtensionContext";
import { AZSymbolInformation } from '../symbollibraries/azSymbolInformation';
import { AZDocumentSymbolsLibrary } from '../symbollibraries/azDocumentSymbolsLibrary';

export class SymbolsTreeView extends BaseWebViewEditor {
    protected _devToolsContext : DevToolsExtensionContext;
    private _symbolsChangedHandler : vscode.Disposable | undefined;
    protected _loaded: boolean;
    protected _rootSymbol: AZSymbolInformation;
    protected _documentName: string;
    protected _documentUri: vscode.Uri | undefined;
    selectedSymbolRange: vscode.Range | undefined;

    constructor(devToolsContext : DevToolsExtensionContext, documentName: string | undefined, documentUri: vscode.Uri | undefined) {        
        if ((!documentName) && (documentUri))
            documentName = path.parse(documentUri.path).base;
        super(devToolsContext.vscodeExtensionContext, documentName);

        this._documentName = documentName;
        this._documentUri = documentUri;
        this._devToolsContext = devToolsContext;
        this._viewColumn = vscode.ViewColumn.Beside;
        this._loaded = false;
        this._rootSymbol = undefined;

        if (this._documentUri)
            this._symbolsChangedHandler = this._devToolsContext.activeDocumentSymbols.onSymbolsChanged(symbolsLib => this.onSymbolsChanged(symbolsLib));
        else
            this._symbolsChangedHandler = undefined;
    }

    protected getHtmlContentPath() : string {
        return path.join('htmlresources', 'symbolstreeview', 'symbolstreeview.html');
    }

    protected getViewType() : string {
        return 'azALDevTools.SymbolsTreeView';
    }

    protected async onDocumentLoaded() {
        this._loaded = true;
        if (this._documentUri)
            await this.LoadSymbols();
        else
            await this.updateView();
    }

    protected async LoadSymbols() {
        let currDocUri = this._devToolsContext.activeDocumentSymbols.getDocUri();
        if ((currDocUri) && (currDocUri.toString() == this._documentUri.toString()) && (this._devToolsContext.activeDocumentSymbols.rootSymbol)) {
            this.setSymbols(this._devToolsContext.activeDocumentSymbols.rootSymbol, this._documentName);            
        } else {
            let library : AZDocumentSymbolsLibrary = new AZDocumentSymbolsLibrary(this._devToolsContext, this._documentUri);
            await library.loadAsync(false); 
            this.setSymbols(library.rootSymbol, this._documentName);
        }
    }

    setSymbols(rootSymbol: AZSymbolInformation | undefined, rootSymbolName: string | undefined) {
        if (rootSymbol)
            this._rootSymbol = rootSymbol.createCopy(true);
        else
            this._rootSymbol = new AZSymbolInformation();
        this._rootSymbol.fullName = rootSymbolName;
        this.updateView();
    }

    onSymbolsChanged(lib: any) {
        if (this._devToolsContext.activeDocumentSymbols.getDocUri().path == this._documentUri.path)
            this.setSymbols(this._devToolsContext.activeDocumentSymbols.rootSymbol, this._documentName);
    }

    protected updateView() {
        if (!this._loaded)
            return;
        this.sendMessage({
            command: 'setData',
            data: this._rootSymbol
        });
    }

    protected processWebViewMessage(message : any) : boolean {
        if (super.processWebViewMessage(message))
            return true;        

        return false;
    }

    protected onPanelClosed() {
        if (this._symbolsChangedHandler)
            this._symbolsChangedHandler.dispose();
    }

}