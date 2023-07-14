import {
    Position,
    TreeView,
    TreeItem,
    TreeDataProvider,
    ProviderResult,
    window,
} from "vscode";

class MPIStatementProvider implements TreeDataProvider<MPIStatementItem> {
    getTreeItem(
        element: MPIStatementItem
    ): MPIStatementItem | Thenable<MPIStatementItem> {
        return element;
    }

    getChildren(element?: any): ProviderResult<MPIStatementItem[]> {
        if (element) {
            return Promise.resolve(this.getStatements());
        } else {
            return Promise.resolve([]);
        }
    }

    getStatements(): MPIStatementItem[] {
        return [new MPIStatementItem("", new Position(0, 0))];
    }
}

class MPIStatementItem extends TreeItem {
    constructor(public readonly label: string, private pos: Position) {
        super(label);
    }
}
