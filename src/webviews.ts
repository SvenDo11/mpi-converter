import * as vscode from "vscode";

export function getForLoopHTML() {
    return `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>For Loops</title>
    </head>
    <body>
        <p>
            Hey there, this looks pretty empty right now,
            but soon you will see a detailed description of how mpi_send/mpi_recieve statements can be converted into their non-blocking counter parts.
        </p>
    </body>
</html>`;
}

export class MPIConvViewProvider implements vscode.WebviewViewProvider {
    private _webview?: vscode.WebviewView;

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        this._webview = webviewView;
        webviewView.webview.html = `<!DOCTYPE html>
        <html lang="en">
        <style>
            body {
                background-color: transparent;
            }

            .color-list {
                list-style: none;
                padding: 0;
            }

            .color-entry {
                width: 100%;
                display: flex;
                margin-bottom: 0.4em;
                border: 1px solid var(--vscode-input-border);
            }

            .color-preview {
                width: 2em;
                height: 2em;
            }

            .color-preview:hover {
                outline: inset white;
            }

            .color-input {
                display: block;
                flex: 1;
                width: 100%;
                color: var(--vscode-input-foreground);
                background-color: var(--vscode-input-background);
                border: none;
                padding: 0 0.6em;
            }

            .add-color-button {
                display: block;
                border: none;
                margin: 0 auto;
            }
            :root {
	--container-paddding: 20px;
	--input-padding-vertical: 6px;
	--input-padding-horizontal: 4px;
	--input-margin-vertical: 4px;
	--input-margin-horizontal: 0;
}

body {
	padding: 0 var(--container-paddding);
	color: var(--vscode-foreground);
	font-size: var(--vscode-font-size);
	font-weight: var(--vscode-font-weight);
	font-family: var(--vscode-font-family);
	background-color: var(--vscode-editor-background);
}

ol,
ul {
	padding-left: var(--container-paddding);
}

body > *,
form > * {
	margin-block-start: var(--input-margin-vertical);
	margin-block-end: var(--input-margin-vertical);
}

*:focus {
	outline-color: var(--vscode-focusBorder) !important;
}

a {
	color: var(--vscode-textLink-foreground);
}

a:hover,
a:active {
	color: var(--vscode-textLink-activeForeground);
}

code {
	font-size: var(--vscode-editor-font-size);
	font-family: var(--vscode-editor-font-family);
}

button {
	border: none;
	padding: var(--input-padding-vertical) var(--input-padding-horizontal);
	width: 100%;
	text-align: center;
	outline: 1px solid transparent;
	outline-offset: 2px !important;
	color: var(--vscode-button-foreground);
	background: var(--vscode-button-background);
}

button:hover {
	cursor: pointer;
	background: var(--vscode-button-hoverBackground);
}

button:focus {
	outline-color: var(--vscode-focusBorder);
}

button.secondary {
	color: var(--vscode-button-secondaryForeground);
	background: var(--vscode-button-secondaryBackground);
}

button.secondary:hover {
	background: var(--vscode-button-secondaryHoverBackground);
}

input:not([type='checkbox']),
textarea {
	display: block;
	width: 100%;
	border: none;
	font-family: var(--vscode-font-family);
	padding: var(--input-padding-vertical) var(--input-padding-horizontal);
	color: var(--vscode-input-foreground);
	outline-color: var(--vscode-input-border);
	background-color: var(--vscode-input-background);
}

input::placeholder,
textarea::placeholder {
	color: var(--vscode-input-placeholderForeground);
}
html {
	box-sizing: border-box;
	font-size: 13px;
}

*,
*:before,
*:after {
	box-sizing: inherit;
}

body,
h1,
h2,
h3,
h4,
h5,
h6,
p,
ol,
ul {
	margin: 0;
	padding: 0;
	font-weight: normal;
}

img {
	max-width: 100%;
	height: auto;
}
        </style>
        <head>
            <meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webviewView.webview.cspSource};">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<title>MPI Converter</title>
			</head>
			<body>
                <p>Run the MPI converter on the currently selected file.</p>

				<button class="add-color-button" onclick="test()">Run MPI Converter</button>

			</body>
            <script>
                function test() {
                    console.log("Test Success");
                }
            </script
			</html>`;
    }
}
