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
        <h2> Blocking vs Unblocking MPI statements </h2>
        <p>
            Blocking MPI statements are communication functions.
            The sending functions have to block the execution of their process until the message is either delivered to the receiving process,
            or until the message is written into a message buffer.
            The receiving functions will block until the message is delivered.
            This introduces some communication overhead.
        </p><p>
            Unblocking MPI statements will not block the process. Instead, the program can continue executing the following instructions.
            The send buffer should not be altered, while it is not clear, if the message was sent.
            Therefor the statement "MPI_wait(...)" or "MPI_waitall(...)" should be used, before the buffer is altered, which will then block until the message is sent.
            For the recieving unblocking statements, the buffer can not be read or altered, until the message is delivered.
        </p><p>
            Every instruction between the send/receive statements and the according wait statement will reduce the idle time caused by the communication overhead.
            If enough instructions are available, the overhead can be significantly reduced.
        </p>
    </body>
</html>`;
}
