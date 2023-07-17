import * as vscode from "vscode";

export function getHelpHTML() {
    return `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MPI Converter Help</title>
    </head>
    <body>
        <h1> MPI Converter Help Page </h1>
        <h2> About this Plugin </h2>
        <p>
            This Plugin is developed as part of a Master Thesis.
            Its purpose is to provide a dialog driven source to source conversion, to help MPI developers to use more modern MPI statements.
        </p>
        <p>
            The plugin can be accessed via the MPI icon in the activity bar.
            There a view opens, that displays the currently visible files.
            If a file contains MPI Statements, that can be converted, the statements will be listed underneath the according file.
            Here the plugin can be run in three ways:
            <ul>
            <li>With the green arrow on the title: The plugin will convert all statements in the currently active document.</li>
            <li>With the green arrow on a file: The plugin will convert all statements in that file.</li>
            <li>With the green arrow on a specific statement: The plugin will convert that statement.</li>
            </ul>
        </p>
        <h2> Blocking vs Non-blocking MPI statements </h2>
        <p>
            Blocking MPI statements are communication functions.
            The sending functions have to block the execution of their process until the message is either delivered to the receiving process,
            or until the message is written into a message buffer.
            The receiving functions will block until the message is delivered.
            This introduces some communication overhead.
        </p><p>
            Non-blocking MPI statements will not block the process. Instead, the program can continue executing the following instructions.
            The send buffer should not be altered, while it is not clear, if the message was sent.
            Therefor the statement "MPI_wait(...)" or "MPI_waitall(...)" should be used, before the buffer is altered, which will then block until the message is sent.
            For the recieving non-blocking statements, the buffer can not be read or altered, until the message is delivered.
        </p><p>
            Every instruction between the send/receive statements and the according wait statement will reduce the idle time caused by the communication overhead.
            If enough instructions are available, the overhead can be significantly reduced.
        </p>
    </body>
</html>`;
}
