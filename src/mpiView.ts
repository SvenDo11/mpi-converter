import { send } from "process";
import {
    Event,
    EventEmitter,
    Position,
    TreeView,
    TreeItem,
    TreeDataProvider,
    ProviderResult,
    window,
} from "vscode";
import { findStringInDocument } from "./util";

export class MPIStatementProvider
    implements TreeDataProvider<MPIStatementItem>
{
    getTreeItem(
        element: MPIStatementItem
    ): MPIStatementItem | Thenable<MPIStatementItem> {
        return element;
    }

    getChildren(
        element?: MPIStatementItem
    ): ProviderResult<MPIStatementItem[]> {
        if (element) {
            return Promise.resolve(this.getStatements());
        } else {
            return Promise.resolve(this.getStatements());
        }
    }

    getStatements(): MPIStatementItem[] {
        let activeEditor = window.activeTextEditor;
        if (activeEditor === undefined) {
            return [];
        }

        // TODO: check for MPI files only
        let sendPos = findStringInDocument(activeEditor, "MPI_Send");
        let recvPos = findStringInDocument(activeEditor, "MPI_Recv");
        let items: MPIStatementItem[] = [];

        for (let pos of sendPos) {
            items.push(
                new MPIStatementItem("MPI_Send Line " + (pos.line + 1), pos)
            );
        }
        for (let pos of recvPos) {
            items.push(
                new MPIStatementItem("MPI_Recv Line " + (pos.line + 1), pos)
            );
        }
        items.sort((a, b) => {
            return a.getPosition().line - b.getPosition().line;
        });
        return items;
    }
    private _onDidChangeTreeData: EventEmitter<
        MPIStatementItem | undefined | null | void
    > = new EventEmitter<MPIStatementItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<
        MPIStatementItem | undefined | null | void
    > = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

class MPIStatementItem extends TreeItem {
    constructor(public readonly label: string, private pos: Position) {
        super(label);
    }

    getPosition(): Position {
        return this.pos;
    }
}
