# mpiconv README

This is the README of the [Visual Studio Code](code.visualstudion.com) extension _mpiconv_.

## Features

- Can great you.
- Can tell you current time and date.
- Can tell you the path to the current 
- Can replace MPI_Send and MPI_Recv with the nonblocking counterparts

## Requirements

Nodejs,
yo

## Extension Settings

None.

## Known Issues

A lot.

## Release Notes

### 0.0.1

Initial project frame.
Added commands: "Hello World", "What does the clock say?" and "Replace Me" 

### 0.0.2

Added command: "ConvertToUnblocking"

# Notes

## Next steps

1. use `vscode.window.activeEditor` to get the text of the current file. -> DONE
2. find and replace specific text snippets -> DONE
3. save the modified version in a new file -> DONEISH
4. add a dialog to let user know whats happening and to let them decide -> DONE
    - resolve the async call with a promise. -> done
    - alternatively, git the dialog call a callback function with the replace operation. -> Not necessary
5. restrict command to c++ files 
6. cancelation of the replacing process 
7. replace MPI_send with equivalent unblocking
    -> create datatype for storing parameters -> done
    -> extract parameters from original file -> done
    -> replace send statement -> done
    -> add wait statement -> done
8. replace MPI_recv with equivalent unblocking
    -> create datatype for storing parameters -> done
    -> extract parameters from original file -> done
    -> replace send statement -> done
    -> add wait statement -> done
9. expand overlap window

## Future concept

- thing about using code-lense