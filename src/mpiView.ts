import { errorMonitor } from "events";
import { send } from "process";
import { runInThisContext } from "vm";
import * as fs from "fs";
import * as path from "path";
import {
    Event,
    EventEmitter,
    Position,
    TreeView,
    TreeItem,
    TreeDataProvider,
    ProviderResult,
    window,
    TreeItemCollapsibleState,
    TextEdit,
    TextEditor,
} from "vscode";
import { findStringInDocument } from "./util";
import { StatementType } from "./statementsTypes";

export class MPIStatementProvider implements TreeDataProvider<MPITreeItem> {
    getTreeItem(element: MPITreeItem): MPITreeItem | Thenable<MPITreeItem> {
        return element;
    }

    getChildren(element?: MPITreeItem): ProviderResult<MPITreeItem[]> {
        if (element) {
            return Promise.resolve(this.getStatements(element));
        } else {
            return Promise.resolve(this.getFiles());
        }
    }

    getFiles(): MPITreeItem[] {
        let items: MPITreeItem[] = [];
        let textEditors = window.visibleTextEditors;
        for (let editor of textEditors) {
            let file = editor.document.fileName;
            let filepath = path.parse(file);
            let label = filepath.name + filepath.ext;
            items.push(new MPITreeItem(label, editor, StatementType.Other));
        }
        return items;
    }

    getStatements(file: MPITreeItem): MPITreeItem[] {
        if (!file.isFile()) {
            return [];
        }

        let activeEditor = file.getEditor();
        if (activeEditor === undefined) {
            return [];
        }

        // TODO: check for MPI files only
        let sendPos = findStringInDocument(activeEditor, "MPI_Send");
        let recvPos = findStringInDocument(activeEditor, "MPI_Recv");
        let items: MPITreeItem[] = [];

        for (let pos of sendPos) {
            items.push(
                new MPITreeItem(
                    "MPI_Send Line " + (pos.line + 1),
                    activeEditor,
                    StatementType.MPI_Send,
                    pos
                )
            );
        }
        for (let pos of recvPos) {
            items.push(
                new MPITreeItem(
                    "MPI_Recv Line " + (pos.line + 1),
                    activeEditor,
                    StatementType.MPI_Recv,
                    pos
                )
            );
        }
        items.sort((a, b) => {
            return a.getPosition().line - b.getPosition().line;
        });
        return items;
    }

    private _onDidChangeTreeData: EventEmitter<
        MPITreeItem | undefined | null | void
    > = new EventEmitter<MPITreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<MPITreeItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

export class MPITreeItem extends TreeItem {
    private pos: Position | undefined;
    private editor: TextEditor;
    private type: StatementType;

    constructor(
        public readonly label: string,
        editor: TextEditor,
        type: StatementType,
        pos?: Position
    ) {
        super(
            label,
            type === StatementType.Other
                ? TreeItemCollapsibleState.Expanded
                : TreeItemCollapsibleState.None
        );
        this.pos = pos;
        this.editor = editor;
        this.type = type;
    }

    getPosition(): Position {
        if (this.pos === undefined) {
            throw new Error("Can not return the position of a file!");
        }
        return this.pos;
    }

    getEditor(): TextEditor {
        return this.editor;
    }

    getType(): StatementType {
        return this.type;
    }

    isFile(): boolean {
        return this.type === StatementType.Other;
    }
}
